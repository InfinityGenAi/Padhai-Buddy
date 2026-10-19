import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { Firestore } from "firebase-admin/firestore";

const BATCH_SIZE = 450;
const REAUTH_MAX_AGE_SECONDS = 10 * 60;

async function deleteCollection(db: Firestore, path: string): Promise<void> {
  // Delete in chunks so a user with a large amount of data never
  // exceeds Firestore write quotas or causes a write storm.
  for (;;) {
    const snapshot = await db.collection(path).limit(BATCH_SIZE).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deleteNestedCollection(db: Firestore, parentPath: string, nestedCol: string): Promise<void> {
  for (;;) {
    const parents = await db.collection(parentPath).limit(BATCH_SIZE).get();
    if (parents.empty) return;
    const batch = db.batch();
    for (const parent of parents.docs) {
      await deleteCollection(db, `${parent.ref.path}/${nestedCol}`);
      batch.delete(parent.ref);
    }
    await batch.commit();
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Firebase Admin not initialized" },
        { status: 500 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // The client must re-authenticate immediately before deleting the account.
    // A token whose auth_time is older than the freshness window was not
    // minted by a recent re-auth, so reject it server-side as well.
    const tokenAgeSeconds = Date.now() / 1000 - (decoded.auth_time || 0);
    if (tokenAgeSeconds > REAUTH_MAX_AGE_SECONDS) {
      return NextResponse.json(
        {
          error: "Re-authentication required. Please sign in again and retry.",
          code: "reauth-required",
        },
        { status: 403 },
      );
    }

    const uid = decoded.uid;
    const profileRef = adminDb.collection("users").doc(uid);
    const profileSnap = await profileRef.get();
    const username = String(profileSnap.data()?.username || "").trim().toLowerCase();

    // Clean up personal Firestore data before deleting the Auth identity. If a
    // cleanup step fails, the account can still sign in/re-authenticate and
    // retry; deleting Auth first could leave orphaned private data with no
    // account able to retry the cleanup.
    try {
      const userCollections = [
        "studyPlans",
        "doubts",
        "sessions",
        "quizAttempts",
        "notes",
        "studySessions",
        "resources",
        "savedItems",
        "notifications",
        "topicMastery",
        "mistakeBank",
        "settings",
      ];
      for (const collectionName of userCollections) {
        await deleteCollection(adminDb, `users/${uid}/${collectionName}`);
      }
      await deleteNestedCollection(adminDb, `users/${uid}/conversations`, "messages");
      await deleteNestedCollection(adminDb, `users/${uid}/flashcardDecks`, "cards");

      // Remove global documents/records owned by this UID.
      await adminDb.collection("userScores").doc(uid).delete().catch(() => undefined);
      await adminDb.collection("featureUsage").doc(uid).delete().catch(() => undefined);

      // Downloads store a userId on a global event collection; delete only
      // records belonging to this user and preserve aggregate analytics totals.
      for (;;) {
        const downloads = await adminDb.collection("downloads")
          .where("userId", "==", uid)
          .limit(BATCH_SIZE)
          .get();
        if (downloads.empty) break;
        const batch = adminDb.batch();
        downloads.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // Visitor markers contain a UID under dailyVisitors/{date}/users/{uid}.
      // Delete all dates' markers, but leave date-level aggregate counters intact.
      for (;;) {
        const markers = await adminDb.collectionGroup("users")
          .where("uid", "==", uid)
          .limit(BATCH_SIZE)
          .get();
        const visitorMarkers = markers.docs.filter((d) => d.ref.path.startsWith("dailyVisitors/"));
        if (visitorMarkers.length === 0) break;
        for (let i = 0; i < visitorMarkers.length; i += BATCH_SIZE) {
          const batch = adminDb.batch();
          visitorMarkers.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }

      // Release the username only if its mapping still belongs to this UID;
      // never delete a username that has since been claimed by another user.
      if (username) {
        const usernameRef = adminDb.collection("usernameMappings").doc(username);
        const mapping = await usernameRef.get();
        if (mapping.exists && mapping.data()?.uid === uid) {
          await usernameRef.delete();
        }
      }

      await profileRef.delete();
    } catch (err) {
      console.error("Firestore cleanup error:", err);
      return NextResponse.json(
        {
          error:
            "We couldn't finish deleting your data. Your sign-in account has not been removed; please retry or contact support.",
          code: "cleanup-failed",
        },
        { status: 500 },
      );
    }

    // Delete the Auth identity last so failed data cleanup remains retryable.
    try {
      await adminAuth.deleteUser(uid);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        console.error("Auth delete error after data cleanup:", err);
        return NextResponse.json(
          {
            error: "Your personal data was removed, but we couldn't remove the sign-in account. Please contact support.",
            code: "auth-delete-failed",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete account error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
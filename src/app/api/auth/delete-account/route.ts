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

    // Delete the Auth account FIRST. If it fails, nothing has been changed and
    // the request is safe to retry. If it succeeds, the account can never be
    // left half-deleted (e.g. account still active but all data gone) even if
    // the Firestore cleanup below is interrupted.
    try {
      await adminAuth.deleteUser(uid);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        console.error("Auth delete error:", err);
        return NextResponse.json(
          {
            error: "Failed to delete user account. No data was changed; please try again.",
            code: "auth-delete-failed",
          },
          { status: 500 },
        );
      }
    }

    try {
      await deleteCollection(adminDb, `users/${uid}/studyPlans`);
      await deleteCollection(adminDb, `users/${uid}/doubts`);
      await deleteCollection(adminDb, `users/${uid}/sessions`);
      await deleteNestedCollection(adminDb, `users/${uid}/conversations`, "messages");
      await deleteCollection(adminDb, `users/${uid}/quizAttempts`);
      await deleteNestedCollection(adminDb, `users/${uid}/flashcardDecks`, "cards");
      await deleteCollection(adminDb, `users/${uid}/notes`);
      await deleteCollection(adminDb, `users/${uid}/studySessions`);
      await deleteCollection(adminDb, `users/${uid}/resources`);
      await adminDb.collection("users").doc(uid).delete();
    } catch (err) {
      console.error("Firestore cleanup error:", err);
      return NextResponse.json(
        {
          error:
            "Your account was deleted but some data could not be cleaned up. Please contact support if needed.",
          code: "cleanup-failed",
        },
        { status: 500 },
      );
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
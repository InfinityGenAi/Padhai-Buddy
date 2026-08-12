import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { Firestore } from "firebase-admin/firestore";

async function deleteCollection(db: Firestore, path: string): Promise<void> {
  const collectionRef = db.collection(path);
  const snapshot = await collectionRef.get();
  const deletes = snapshot.docs.map((d) => d.ref.delete());
  await Promise.all(deletes);
}

async function deleteNestedCollection(db: Firestore, parentPath: string, nestedCol: string): Promise<void> {
  const parentCol = db.collection(parentPath);
  const snapshot = await parentCol.get();

  const nestedDeletes = snapshot.docs.map(async (d) => {
    const nestedRef = d.ref.collection(nestedCol);
    const nestedSnap = await nestedRef.get();
    const msgDeletes = nestedSnap.docs.map((m) => m.ref.delete());
    await Promise.all(msgDeletes);
    return d.ref.delete();
  });

  await Promise.all(nestedDeletes);
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

    const uid = decoded.uid;

    try {
      await deleteCollection(adminDb, `users/${uid}/studyPlans`);
      await deleteCollection(adminDb, `users/${uid}/doubts`);
      await deleteCollection(adminDb, `users/${uid}/sessions`);
      await deleteNestedCollection(adminDb, `users/${uid}/conversations`, "messages");
      await deleteCollection(adminDb, `users/${uid}/conversations`);
      await adminDb.collection("users").doc(uid).delete();
    } catch (err) {
      console.error("Firestore cleanup error:", err);
      return NextResponse.json(
        { error: "Failed to cleanup user data" },
        { status: 500 },
      );
    }

    try {
      await adminAuth.deleteUser(uid);
    } catch (err) {
      console.error("Admin delete user error:", err);
      return NextResponse.json(
        { error: "Failed to delete user account" },
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

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

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
      await adminAuth.deleteUser(uid);
    } catch (err) {
      console.error("Admin delete user error:", err);
      return NextResponse.json(
        { error: "Failed to delete user account" },
        { status: 500 },
      );
    }

    try {
      const userRef = adminDb.collection("users").doc(uid);
      const subcollections = ["conversations", "doubts", "sessions"];

      for (const subcol of subcollections) {
        const colRef = userRef.collection(subcol);
        const snap = await colRef.get();
        const deletes = snap.docs.map((d) => d.ref.delete());
        await Promise.all(deletes);
      }

      await userRef.delete();
    } catch (err) {
      console.error("Firestore cleanup error:", err);
      return NextResponse.json(
        { error: "Failed to cleanup user data" },
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

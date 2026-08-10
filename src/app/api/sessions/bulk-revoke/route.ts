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

    let sessionId: string | null = null;
    try {
      const body = await req.json();
      sessionId = String(body.sessionId || "");
    } catch {
      // no body
    }

    const sessionsRef = adminDb.collection("users").doc(uid).collection("sessions");
    const snapshot = await sessionsRef.get();

    const deletePromises = snapshot.docs
      .filter((d) => d.id !== sessionId)
      .map((d) => d.ref.delete());
    await Promise.all(deletePromises);

    return NextResponse.json({ success: true, revoked: deletePromises.length });
  } catch (error: unknown) {
    console.error("Bulk revoke error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

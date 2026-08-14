import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: initializationError || "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const body = await req.json();
    const { name, class: studentClass, board, photoURL } = body;

    if (!name || !studentClass || !board) {
      return NextResponse.json({ error: "Name, class, and board are required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      name: String(name),
      class: Number(studentClass),
      board: String(board),
    };
    if (photoURL) updates.photoURL = String(photoURL);

    await adminDb.collection("users").doc(decoded.uid).update(updates);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

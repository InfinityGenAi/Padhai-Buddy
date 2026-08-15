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

    const nameStr = String(name).trim();
    if (nameStr.length < 2 || nameStr.length > 50) {
      return NextResponse.json({ error: "Name must be between 2 and 50 characters" }, { status: 400 });
    }

    const classNum = Number(studentClass);
    if (!Number.isInteger(classNum) || classNum < 5 || classNum > 12) {
      return NextResponse.json({ error: "Class must be between 5 and 12" }, { status: 400 });
    }

    const boardStr = String(board);
    const validBoards = ["CBSE", "ICSE", "State Board"];
    if (!validBoards.includes(boardStr)) {
      return NextResponse.json({ error: "Invalid board value" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      name: nameStr,
      class: classNum,
      board: boardStr,
    };

    if (photoURL !== undefined && photoURL !== null && String(photoURL).trim() !== "") {
      const url = String(photoURL).trim();
      if (url.length > 2048) {
        return NextResponse.json({ error: "Photo URL is too long" }, { status: 400 });
      }
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: "Photo URL must be a valid URL" }, { status: 400 });
      }
      updates.photoURL = url;
    }

    await adminDb.collection("users").doc(decoded.uid).update(updates);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

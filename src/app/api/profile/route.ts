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

    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }
    const db = adminDb;
    const auth = adminAuth;

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    let body: { name?: string; class?: unknown; board?: unknown; photoURL?: unknown; username?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { name, class: studentClass, board, photoURL, username } = body;

    // Username changes must go through the server-side /api/username-claim API.
    // The profile endpoint never writes the authoritative username field or the
    // usernameMappings document, which prevents username-uniqueness bypass.
    if (username !== undefined) {
      return NextResponse.json(
        { error: "Username changes must be made via /api/username-claim" },
        { status: 400 },
      );
    }

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
      let parsedPhotoUrl: URL;
      try {
        parsedPhotoUrl = new URL(url);
      } catch {
        return NextResponse.json({ error: "Photo URL must be a valid URL" }, { status: 400 });
      }
      const allowLocalHttp =
        process.env.NODE_ENV !== "production" &&
        parsedPhotoUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1", "::1"].includes(parsedPhotoUrl.hostname);
      if (
        (parsedPhotoUrl.protocol !== "https:" && !allowLocalHttp) ||
        parsedPhotoUrl.username ||
        parsedPhotoUrl.password
      ) {
        return NextResponse.json(
          { error: "Photo URL must use HTTPS and must not include credentials" },
          { status: 400 },
        );
      }
      updates.photoURL = url;
    }

    await db.collection("users").doc(decoded.uid).update(updates);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

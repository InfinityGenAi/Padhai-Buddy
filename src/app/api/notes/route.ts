import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get("noteId");
    const search = searchParams.get("search") || "";

    if (noteId) {
      const snap = await adminDb.collection("users").doc(decoded.uid).collection("notes").doc(noteId).get();
      if (!snap.exists) return NextResponse.json({ error: "Note not found" }, { status: 404 });
      return NextResponse.json({ note: { id: snap.id, ...snap.data() } });
    }

    const snap = await adminDb.collection("users").doc(decoded.uid).collection("notes").orderBy("updatedAt", "desc").get();
    const notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (search.trim()) {
      const q = search.toLowerCase();
      const filtered = notes.filter((n: Record<string, unknown>) =>
        String(n.title || "").toLowerCase().includes(q) ||
        String(n.body || "").toLowerCase().includes(q) ||
        String(n.subject || "").toLowerCase().includes(q)
      );
      return NextResponse.json({ notes: filtered });
    }

    return NextResponse.json({ notes });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

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
    const { action, noteId, title, subject, body: noteBody } = body;

    if (action === "create" || action === "update") {
      if (!title || !subject || !noteBody) return NextResponse.json({ error: "Title, subject, and body are required" }, { status: 400 });

      if (action === "create") {
        const noteRef = adminDb.collection("users").doc(decoded.uid).collection("notes").doc();
        const note = { title, subject, body: noteBody, createdAt: Date.now(), updatedAt: Date.now() };
        await noteRef.set(note);
        return NextResponse.json({ note: { id: noteRef.id, ...note } });
      }

      if (action === "update" && noteId) {
        const updates: Record<string, unknown> = { updatedAt: Date.now() };
        if (title !== undefined) updates.title = title;
        if (subject !== undefined) updates.subject = subject;
        if (noteBody !== undefined) updates.body = noteBody;
        await adminDb.collection("users").doc(decoded.uid).collection("notes").doc(noteId).update(updates);
        return NextResponse.json({ success: true });
      }
    }

    if (action === "delete" && noteId) {
      await adminDb.collection("users").doc(decoded.uid).collection("notes").doc(noteId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

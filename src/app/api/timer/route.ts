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
    const { action, sessionId, mode, durationMinutes, completed } = body;

    if (action === "create" || action === "update") {
      if (!mode || !durationMinutes) return NextResponse.json({ error: "Mode and duration are required" }, { status: 400 });

      if (action === "create") {
        const sessionRef = adminDb.collection("users").doc(decoded.uid).collection("studySessions").doc();
        const session = { mode, durationMinutes, completed: completed || false, createdAt: Date.now() };
        await sessionRef.set(session);
        return NextResponse.json({ session: { id: sessionRef.id, ...session } });
      }

      if (action === "update" && sessionId) {
        const updates: Record<string, unknown> = {};
        if (completed !== undefined) updates.completed = completed;
        await adminDb.collection("users").doc(decoded.uid).collection("studySessions").doc(sessionId).update(updates);
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

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

    const snap = await adminDb.collection("users").doc(decoded.uid).collection("studySessions").orderBy("createdAt", "desc").limit(50).get();
    const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

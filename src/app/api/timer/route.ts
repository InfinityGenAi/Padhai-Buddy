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

    let body: { action?: string; sessionId?: string; mode?: string; durationMinutes?: number; durationSeconds?: number; completed?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { action, sessionId, mode, durationMinutes, durationSeconds, completed } = body;

    const VALID_MODES = ["pomodoro", "stopwatch", "custom"];

    if (action === "create") {
      if (!mode || !VALID_MODES.includes(String(mode))) {
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
      }
      // Accept durationSeconds (preferred) or durationMinutes (legacy)
      let totalSeconds = 0;
      if (typeof durationSeconds === "number" && Number.isInteger(durationSeconds) && durationSeconds > 0) {
        totalSeconds = durationSeconds;
      } else if (typeof durationMinutes === "number" && Number.isInteger(durationMinutes) && durationMinutes > 0) {
        totalSeconds = durationMinutes * 60;
      } else {
        return NextResponse.json({ error: "durationSeconds (preferred) or durationMinutes must be a positive integer" }, { status: 400 });
      }
      if (totalSeconds > 600 * 60) {
        return NextResponse.json({ error: "Duration exceeds maximum allowed (600 minutes)" }, { status: 400 });
      }

      const durationMinutesRounded = Math.max(1, Math.round(totalSeconds / 60));
      const sessionRef = adminDb.collection("users").doc(decoded.uid).collection("studySessions").doc();
      const session = { mode: String(mode), durationSeconds: totalSeconds, durationMinutes: durationMinutesRounded, completed: completed === true, createdAt: Date.now() };
      await sessionRef.set(session);
      return NextResponse.json({ session: { id: sessionRef.id, ...session } });
    }

    if (action === "update" && sessionId) {
      const updates: Record<string, unknown> = {};
      if (completed !== undefined) {
        if (typeof completed !== "boolean") {
          return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
        }
        updates.completed = completed;
      }
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
      }
      await adminDb.collection("users").doc(decoded.uid).collection("studySessions").doc(sessionId).update(updates);
      return NextResponse.json({ success: true });
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

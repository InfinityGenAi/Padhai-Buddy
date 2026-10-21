import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { incrementUserScore } from "@/lib/score-ledger";
import { enforceRateLimit } from "@/lib/api-rate-limit";

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

    const rateLimitResponse = await enforceRateLimit(`timer:${decoded.uid}`, 30);
    if (rateLimitResponse) return rateLimitResponse;

    let body: { action?: string; sessionId?: string; mode?: string; durationMinutes?: number; durationSeconds?: number; completed?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { action, sessionId, mode, durationMinutes, durationSeconds, completed } = body;

    const VALID_MODES = ["pomodoro", "stopwatch", "custom"];

    if (action === "create") {
      if (completed === true) {
        return NextResponse.json({ error: "A timer session must be completed through the update action" }, { status: 400 });
      }
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
      if (totalSeconds < 60) {
        return NextResponse.json({ error: "Study sessions must be at least 60 seconds long" }, { status: 400 });
      }
      if (totalSeconds > 600 * 60) {
        return NextResponse.json({ error: "Duration exceeds maximum allowed (600 minutes)" }, { status: 400 });
      }

      const durationMinutesRounded = Math.max(1, Math.round(totalSeconds / 60));
      const userRef = adminDb.collection("users").doc(decoded.uid);
      const sessionsRef = userRef.collection("studySessions");
      const sessionRef = sessionsRef.doc();
      const activeSessionRef = userRef.collection("timerState").doc("active");
      const createdAt = Date.now();
      const session = {
        mode: String(mode),
        durationSeconds: totalSeconds,
        durationMinutes: durationMinutesRounded,
        completed: false,
        createdAt,
      };

      // One active timer per user prevents creating many simultaneous sessions
      // and bulk-completing them later to inflate leaderboard points.
      const createResult = await adminDb.runTransaction(async (transaction) => {
        const activeSnap = await transaction.get(activeSessionRef);
        if (activeSnap.exists) {
          const activeSessionId = activeSnap.data()?.sessionId;
          if (typeof activeSessionId === "string") {
            const existingSessionRef = sessionsRef.doc(activeSessionId);
            const existingSnap = await transaction.get(existingSessionRef);
            if (existingSnap.exists && existingSnap.data()?.completed !== true) {
              return "already-active" as const;
            }
          }
        }

        transaction.create(sessionRef, session);
        transaction.set(activeSessionRef, { sessionId: sessionRef.id, updatedAt: createdAt });
        return "created" as const;
      });

      if (createResult === "already-active") {
        return NextResponse.json(
          { error: "You already have an unfinished timer session. Resume or reset it before starting another." },
          { status: 409 },
        );
      }
      return NextResponse.json({ session: { id: sessionRef.id, ...session } });
    }

    if (action === "update" && sessionId) {
      if (completed !== true) {
        return NextResponse.json({ error: "completed must be true when finishing a timer session" }, { status: 400 });
      }

      const userRef = adminDb.collection("users").doc(decoded.uid);
      const sessionRef = userRef.collection("studySessions").doc(sessionId);
      const activeSessionRef = userRef.collection("timerState").doc("active");
      const completionResult = await adminDb.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        if (!sessionSnap.exists) return { kind: "not-found" as const };
        const sessionData = sessionSnap.data() || {};
        const activeSnap = await transaction.get(activeSessionRef);
        if (sessionData.completed === true) return { kind: "already-completed" as const };

        const createdAt = typeof sessionData.createdAt === "number" ? sessionData.createdAt : 0;
        const durationSeconds = typeof sessionData.durationSeconds === "number"
          ? sessionData.durationSeconds
          : typeof sessionData.durationMinutes === "number"
            ? sessionData.durationMinutes * 60
            : 0;
        const now = Date.now();
        const remainingSeconds = Math.max(0, Math.ceil((createdAt + durationSeconds * 1000 - now) / 1000));
        if (durationSeconds <= 0 || remainingSeconds > 0) {
          return { kind: "not-ready" as const, remainingSeconds };
        }

        transaction.update(sessionRef, { completed: true, completedAt: now });
        if (activeSnap.data()?.sessionId === sessionId) {
          transaction.delete(activeSessionRef);
        }
        return { kind: "completed" as const };
      });

      if (completionResult.kind === "not-found") {
        return NextResponse.json({ error: "Study session not found" }, { status: 404 });
      }
      if (completionResult.kind === "already-completed") {
        return NextResponse.json({ error: "This timer session has already been completed" }, { status: 409 });
      }
      if (completionResult.kind === "not-ready") {
        return NextResponse.json({
          error: "The timer duration has not elapsed yet",
          remainingSeconds: completionResult.remainingSeconds,
        }, { status: 400 });
      }

      try {
        await incrementUserScore(decoded.uid, "session");
      } catch {
        // Never block session completion on ledger updates; reconciliation repairs drift.
      }
      return NextResponse.json({ success: true });
    }

    if (action === "cancel" && sessionId) {
      const userRef = adminDb.collection("users").doc(decoded.uid);
      const sessionRef = userRef.collection("studySessions").doc(sessionId);
      const activeSessionRef = userRef.collection("timerState").doc("active");
      const cancelResult = await adminDb.runTransaction(async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        if (!sessionSnap.exists) return "not-found" as const;
        const activeSnap = await transaction.get(activeSessionRef);
        if (sessionSnap.data()?.completed === true) return "already-completed" as const;
        transaction.delete(sessionRef);
        if (activeSnap.data()?.sessionId === sessionId) {
          transaction.delete(activeSessionRef);
        }
        return "cancelled" as const;
      });

      if (cancelResult === "not-found") {
        return NextResponse.json({ error: "Study session not found" }, { status: 404 });
      }
      if (cancelResult === "already-completed") {
        return NextResponse.json({ error: "A completed session cannot be cancelled" }, { status: 409 });
      }
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

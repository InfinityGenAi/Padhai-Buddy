import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { incrementUserScore, decrementUserScore } from "@/lib/score-ledger";
import { enforceRateLimit } from "@/lib/api-rate-limit";

// Get today's date in YYYY-MM-DD format using local timezone
function getTodayLocal(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
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

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    const filter = searchParams.get("filter") || "all";

    if (planId) {
      const snap = await adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc(planId).get();
      if (!snap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      return NextResponse.json({ plan: { id: snap.id, ...snap.data() } });
    }

    const snap = await adminDb.collection("users").doc(decoded.uid).collection("studyPlans").orderBy("createdAt", "desc").get();
    let plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const today = getTodayLocal();
    if (filter === "today") {
      plans = plans.filter((p: Record<string, unknown>) => p.plannedDate === today);
    } else if (filter === "upcoming") {
      plans = plans.filter((p: Record<string, unknown>) => String(p.plannedDate || "") >= today && !p.completed);
    } else if (filter === "completed") {
      plans = plans.filter((p: Record<string, unknown>) => p.completed);
    }

    return NextResponse.json({ plans });
  } catch {
    return NextResponse.json({ error: "Failed to fetch study plans" }, { status: 500 });
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

    const rateLimitResponse = await enforceRateLimit(`planner:${decoded.uid}`, 30);
    if (rateLimitResponse) return rateLimitResponse;

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
      return NextResponse.json({ error: "Request body exceeds 64 KB" }, { status: 413 });
    }

    let body: { action?: string; planId?: string; title?: string; subject?: string; durationMinutes?: number; plannedDate?: string; completed?: boolean; priority?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { action, planId, title, subject, durationMinutes, plannedDate, completed, priority } = body;

    const VALID_PRIORITIES = ["low", "medium", "high"];

    if (action === "create") {
      if (completed !== undefined && typeof completed !== "boolean") {
        return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
      }
      if (completed === true) {
        return NextResponse.json({ error: "A study plan must be created incomplete and completed through the update action" }, { status: 400 });
      }
      if (!title || !subject || !plannedDate) return NextResponse.json({ error: "Title, subject, and date are required" }, { status: 400 });
      if (typeof title !== "string" || title.trim().length > 200) return NextResponse.json({ error: "Title must be a string of at most 200 characters" }, { status: 400 });
      if (typeof subject !== "string" || subject.trim().length > 100) return NextResponse.json({ error: "Subject must be a string of at most 100 characters" }, { status: 400 });
      if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
        return NextResponse.json({ error: "durationMinutes must be an integer between 1 and 600" }, { status: 400 });
      }
      if (typeof plannedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) ||
          Number.isNaN(Date.parse(`${plannedDate}T00:00:00.000Z`)) ||
          new Date(`${plannedDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== plannedDate) {
        return NextResponse.json({ error: "plannedDate must be a valid YYYY-MM-DD date" }, { status: 400 });
      }
      if (priority !== undefined && !VALID_PRIORITIES.includes(String(priority))) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      const planRef = adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc();
      const plan = {
        title: title.trim(),
        subject: subject.trim(),
        durationMinutes,
        plannedDate,
        completed: false,
        priority: priority || "medium",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await planRef.set(plan);
      return NextResponse.json({ plan: { id: planRef.id, ...plan } });
    }

    if (action === "update" && planId) {
      if (completed !== undefined && typeof completed !== "boolean") {
        return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
      }

      const planRef = adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc(planId);
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length > 200) return NextResponse.json({ error: "Title must be a string of at most 200 characters" }, { status: 400 });
        updates.title = title.trim();
      }
      if (subject !== undefined) {
        if (typeof subject !== "string" || subject.trim().length > 100) return NextResponse.json({ error: "Subject must be a string of at most 100 characters" }, { status: 400 });
        updates.subject = subject.trim();
      }
      if (durationMinutes !== undefined) {
        if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
          return NextResponse.json({ error: "durationMinutes must be an integer between 1 and 600" }, { status: 400 });
        }
        updates.durationMinutes = durationMinutes;
      }
      if (plannedDate !== undefined) {
        if (typeof plannedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) ||
            Number.isNaN(Date.parse(`${plannedDate}T00:00:00.000Z`)) ||
            new Date(`${plannedDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== plannedDate) {
          return NextResponse.json({ error: "plannedDate must be a valid YYYY-MM-DD date" }, { status: 400 });
        }
        updates.plannedDate = plannedDate;
      }
      if (priority !== undefined) {
        if (!VALID_PRIORITIES.includes(String(priority))) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
        updates.priority = String(priority);
      }

      const completionResult = await adminDb.runTransaction(async (transaction) => {
        const planSnap = await transaction.get(planRef);
        if (!planSnap.exists) return { kind: "not-found" as const };
        const current = planSnap.data() || {};
        const wasCompleted = current.completed === true;

        if (completed === false && wasCompleted) {
          return { kind: "already-completed" as const };
        }

        const transactionUpdates: Record<string, unknown> = { ...updates };
        let completedNow = false;
        if (completed === true && !wasCompleted) {
          const createdAt = typeof current.createdAt === "number" ? current.createdAt : 0;
          const effectiveDuration = typeof updates.durationMinutes === "number"
            ? updates.durationMinutes
            : typeof current.durationMinutes === "number" ? current.durationMinutes : 0;
          const effectivePlannedDate = typeof updates.plannedDate === "string"
            ? updates.plannedDate
            : typeof current.plannedDate === "string" ? current.plannedDate : "";
          const now = Date.now();
          const today = new Date(now).toISOString().slice(0, 10);
          if (effectivePlannedDate > today || effectiveDuration < 1 ||
              now < createdAt + effectiveDuration * 60_000) {
            return { kind: "not-ready" as const };
          }
          transactionUpdates.completed = true;
          transactionUpdates.completedAt = now;
          completedNow = true;
        } else if (completed === false) {
          transactionUpdates.completed = false;
        }

        transaction.update(planRef, transactionUpdates);
        return { kind: "ok" as const, completedNow };
      });

      if (completionResult.kind === "not-found") {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      if (completionResult.kind === "already-completed") {
        return NextResponse.json({ error: "A completed plan cannot be reopened" }, { status: 409 });
      }
      if (completionResult.kind === "not-ready") {
        return NextResponse.json({ error: "This plan can only be completed after its planned date and duration have elapsed" }, { status: 400 });
      }

      if (completionResult.completedNow) {
        try {
          await incrementUserScore(decoded.uid, "plan");
        } catch {
          // Never block plan updates on ledger updates.
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === "delete" && planId) {
      const planRef = adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc(planId);
      const planSnap = await planRef.get();
      if (!planSnap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      const hadScoreCredit = planSnap.data()?.completed === true;
      await planRef.delete();
      if (hadScoreCredit) {
        try {
          await decrementUserScore(decoded.uid, "plan");
        } catch {
          // The admin reconciliation endpoint can repair the ledger if this write fails.
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

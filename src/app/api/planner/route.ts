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
    const planId = searchParams.get("planId");
    const filter = searchParams.get("filter") || "all";

    if (planId) {
      const snap = await adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc(planId).get();
      if (!snap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      return NextResponse.json({ plan: { id: snap.id, ...snap.data() } });
    }

    const snap = await adminDb.collection("users").doc(decoded.uid).collection("studyPlans").orderBy("createdAt", "desc").get();
    let plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const today = new Date().toISOString().split("T")[0];
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

    let body: { action?: string; planId?: string; title?: string; subject?: string; durationMinutes?: number; plannedDate?: string; completed?: boolean; priority?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { action, planId, title, subject, durationMinutes, plannedDate, completed, priority } = body;

    const VALID_PRIORITIES = ["low", "medium", "high"];

    if (action === "create") {
      if (!title || !subject || !plannedDate) return NextResponse.json({ error: "Title, subject, and date are required" }, { status: 400 });
      if (typeof title !== "string" || title.trim().length > 200) return NextResponse.json({ error: "Title must be a string of at most 200 characters" }, { status: 400 });
      if (typeof subject !== "string" || subject.trim().length > 100) return NextResponse.json({ error: "Subject must be a string of at most 100 characters" }, { status: 400 });
      if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
        return NextResponse.json({ error: "durationMinutes must be an integer between 1 and 600" }, { status: 400 });
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
        completed: completed || false,
        priority: priority || "medium",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await planRef.set(plan);
      return NextResponse.json({ plan: { id: planRef.id, ...plan } });
    }

    if (action === "update" && planId) {
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
      if (plannedDate !== undefined) updates.plannedDate = plannedDate;
      if (completed !== undefined) updates.completed = completed;
      if (priority !== undefined) {
        if (!VALID_PRIORITIES.includes(String(priority))) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
        updates.priority = String(priority);
      }
      await adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc(planId).update(updates);
      return NextResponse.json({ success: true });
    }

    if (action === "delete" && planId) {
      await adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc(planId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { action, planId, title, subject, durationMinutes, plannedDate, completed, priority } = body;

    if (action === "create") {
      if (!title || !subject || !plannedDate) return NextResponse.json({ error: "Title, subject, and date are required" }, { status: 400 });
      const planRef = adminDb.collection("users").doc(decoded.uid).collection("studyPlans").doc();
      const plan = {
        title,
        subject,
        durationMinutes: durationMinutes || 30,
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
      if (title !== undefined) updates.title = title;
      if (subject !== undefined) updates.subject = subject;
      if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
      if (plannedDate !== undefined) updates.plannedDate = plannedDate;
      if (completed !== undefined) updates.completed = completed;
      if (priority !== undefined) updates.priority = priority;
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

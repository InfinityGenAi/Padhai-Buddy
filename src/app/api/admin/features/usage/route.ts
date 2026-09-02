import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

const FEATURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown to prevent refresh inflation

type FeatureUsageData = {
  total: Record<string, number>;
  today: Record<string, number>;
  weekly: Record<string, number>;
  monthly: Record<string, number>;
  lastUsage: Record<string, number>;
};

const KNOWN_FEATURES = [
  "aiChat",
  "photoDoubt",
  "quiz",
  "flashcards",
  "notes",
  "planner",
  "timer",
  "progress",
  "resources",
  "history",
  "profile",
  "settings",
  "leaderboard",
  "downloads",
  "appInstall",
  "studyModes",
];

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Firebase Admin not initialized" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const usageRef = adminDb.collection("featureUsage").doc(uid);

    let body: { feature: string; timestamp?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { feature, timestamp: ts } = body;

    if (!feature) {
      return NextResponse.json({ error: "Feature name is required" }, { status: 400 });
    }

    if (!KNOWN_FEATURES.includes(feature)) {
      return NextResponse.json({ error: "Unknown feature" }, { status: 400 });
    }

    // Get current usage data - use try/catch for doc get
    let data: FeatureUsageData = {
      total: {},
      today: {},
      weekly: {},
      monthly: {},
      lastUsage: {},
    };

    try {
      const usageSnap = await usageRef.get();
      if (usageSnap.exists) {
        const existing = usageSnap.data() as FeatureUsageData | null;
        if (existing) {
          data = {
            total: { ...data.total, ...existing.total },
            today: { ...data.today, ...existing.today },
            weekly: { ...data.weekly, ...existing.weekly },
            monthly: { ...data.monthly, ...existing.monthly },
            lastUsage: { ...data.lastUsage, ...existing.lastUsage },
          };
        }
      }
    } catch (e) {
      console.error("Error fetching usage data:", e);
    }

    // Ensure the feature key exists with default 0
    if (!(feature in data.total)) {
      data.total![feature] = 0;
    }
    if (!(feature in data.today)) {
      data.today![feature] = 0;
    }
    if (!(feature in data.weekly)) {
      data.weekly![feature] = 0;
    }
    if (!(feature in data.monthly)) {
      data.monthly![feature] = 0;
    }
    if (!(feature in data.lastUsage)) {
      data.lastUsage![feature] = 0;
    }

    // Calculate time ranges
    const now = ts ? new Date(ts).getTime() : Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekTimestamp = weekStart.getTime();
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - 1);
    const monthTimestamp = monthStart.getTime();

    // Update counts with cooldown check
    const lastUsage = data.lastUsage[feature] || 0;
    const cooldownPassed = now - lastUsage > FEATURE_COOLDOWN_MS || lastUsage === 0;

    if (cooldownPassed) {
      // Increment counts
      data.total![feature] = (data.total![feature] || 0) + 1;
      data.today![feature] = (data.today![feature] || 0) + 1;
      const weeklyCount = data.weekly![feature] || 0;
      data.weekly![feature] = now > weekTimestamp ? (weeklyCount || 0) + 1 : weeklyCount || 0;
      const monthlyCount = data.monthly![feature] || 0;
      data.monthly![feature] = now > monthTimestamp ? (monthlyCount || 0) + 1 : monthlyCount || 0;
    }

    // Update last usage timestamp
    data.lastUsage![feature] = now;

    await usageRef.set(data as Record<string, unknown>);

    return NextResponse.json({
      success: true,
      total: data.total![feature],
      today: data.today![feature],
      weekly: data.weekly![feature],
      monthly: data.monthly![feature],
    });
  } catch (error: unknown) {
    console.error("Feature usage tracking error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
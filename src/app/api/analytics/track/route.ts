import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { FieldValue } from "firebase-admin/firestore";

export interface AnalyticsEvent {
  event: "page_view" | "feature_use" | "download" | "signup" | "session_start";
  feature?: string;
  page?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Server configuration error" },
        { status: 500 }
      );
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

    // Rate limiting per user
    const rateLimitResult = await checkRateLimit(`analytics:${decoded.uid}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    let body: AnalyticsEvent;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { event, feature, page, metadata } = body;

    if (!event) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    const now = Date.now();
    const userDate = new Date();
    const dateStr = userDate.toISOString().split("T")[0]; // UTC date for daily aggregates, consistent with admin readers

    const batch = adminDb.batch();

    // Track daily analytics - use atomic increments to avoid read-then-write race conditions
    // and avoid storing large activeUserIds arrays (Firestore doc limit: 1MB)
    const dailyRef = adminDb.collection("dailyAnalytics").doc(dateStr);
    
    // Prepare update data with atomic increments - only increment the event that occurred
    const dailyUpdate: Record<string, unknown> = {
      date: dateStr,
      updatedAt: now,
    };

    // Use FieldValue.increment for atomic counter updates
    if (event === "page_view") {
      dailyUpdate.pageViews = FieldValue.increment(1);
      // Estimated unique visitor increment - only for authenticated sessions
      if (decoded?.uid) {
        dailyUpdate.uniqueVisitors = FieldValue.increment(1);
      }
    }
    if (event === "feature_use") {
      dailyUpdate.featureUses = FieldValue.increment(1);
    }
    if (event === "signup") {
      dailyUpdate.signups = FieldValue.increment(1);
      // Initialize/update cumulative total signups
      dailyUpdate.totalSignups = FieldValue.increment(1);
    }
    if (event === "download") {
      dailyUpdate.todayDownloads = FieldValue.increment(1);
      dailyUpdate.totalDownloads = FieldValue.increment(1);
    }
    // Note: activeUsers tracking - use a separate dailyActiveUsers collection for exact counts
    // returningUsers are tracked via session persistence on the client side

    batch.set(dailyRef, dailyUpdate, { merge: true });

    // Track feature usage
    if (event === "feature_use" && feature) {
      const featureRef = adminDb.collection("featureUsage").doc(feature);
      batch.set(featureRef, {
        feature,
        count: FieldValue.increment(1),
        lastUsedAt: now,
      }, { merge: true });
    }

    // Track downloads
    if (event === "download") {
      const downloadRef = adminDb.collection("downloads").doc();
      batch.set(downloadRef, {
        platform: metadata?.platform || "unknown",
        version: metadata?.version || "unknown",
        timestamp: now,
        userId: decoded.uid,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
    }, {
      headers: {
        "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (error: unknown) {
    console.error("[ANALYTICS_TRACK] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "An unexpected error occurred", _dev: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}
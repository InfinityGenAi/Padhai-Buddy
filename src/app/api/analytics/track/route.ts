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

/**
 * Analytics tracking endpoint.
 *
 * Semantics (all counters are daily, UTC date-keyed):
 *   page_view     -> pageViews (every view) + uniqueVisitors (deduplicated per
 *                    authenticated user per UTC day via dailyVisitors markers)
 *   feature_use   -> featureUses + featureUsage.<feature>.count
 *   signup        -> signups (daily) + totalSignups (cumulative)
 *   download      -> todayDownloads (daily) + totalDownloads (cumulative)
 *   session_start -> sessions (daily)
 *
 * Public (unauthenticated) page views are tracked privacy-consciously: only the
 * aggregate pageViews counter is incremented; no user identity, UID, or email
 * is recorded and uniqueVisitors is NOT incremented for unauthenticated views.
 */

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Server configuration error" },
        { status: 500 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    let decoded: { uid?: string } | null = null;
    if (token) {
      try {
        decoded = await adminAuth.verifyIdToken(token);
      } catch {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }
    }

    let body: AnalyticsEvent;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { event, feature, metadata } = body;
    if (!event) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    const now = Date.now();
    const dateStr = new Date().toISOString().split("T")[0]; // UTC date key
    const db = adminDb;

    // Unauthenticated clients are rate-limited by IP for privacy-conscious
    // public page-view tracking (page_view only).
    if (!decoded) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
      const rateLimitResult = await checkRateLimit(`analytics-anon:${ip}`);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please wait before trying again.", retryAfter: rateLimitResult.retryAfter },
          { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 60) } },
        );
      }
    }

    // Authenticated clients are rate-limited per user. Page views use a
    // separate, higher limit because telemetry fires on every route change
    // and is not security-sensitive.
    if (decoded) {
      if (event === "page_view") {
        const rateLimitResult = await checkRateLimit(`analytics-pv:${decoded.uid}`, 120);
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { error: "Too many requests. Please wait before trying again.", retryAfter: rateLimitResult.retryAfter },
            { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 60) } },
          );
        }
      } else {
        const rateLimitResult = await checkRateLimit(`analytics:${decoded.uid}`);
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { error: "Too many requests. Please wait before trying again.", retryAfter: rateLimitResult.retryAfter },
            { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 60) } },
          );
        }
      }
    }

    const dailyRef = db.collection("dailyAnalytics").doc(dateStr);

    if (event === "page_view") {
      // Page views (authenticated or public) use atomic increments so that
      // concurrent page views never contend on a shared document transaction.
      const batch = db.batch();
      const dailyUpdate: Record<string, unknown> = {
        date: dateStr,
        updatedAt: now,
        pageViews: FieldValue.increment(1),
      };
      batch.set(dailyRef, dailyUpdate, { merge: true });

      // Deduplicate unique visitors per authenticated user per UTC day using a
      // per-user marker document. If the marker did not already exist, this is
      // the user's first view today, so increment the unique-visitor counter.
      // Crash-consistency trade-off: if the process crashes between creating
      // the marker and incrementing uniqueVisitors, we may under-count unique
      // visitors by at most one per crash. Over-counting is impossible because
      // the marker doc ID is the user ID.
      if (decoded?.uid) {
        const visitorRef = db
          .collection("dailyVisitors")
          .doc(dateStr)
          .collection("users")
          .doc(decoded.uid);
        const visitorSnap = await visitorRef.get();
        if (!visitorSnap.exists) {
          await visitorRef.set({
            uid: decoded.uid,
            date: dateStr,
            firstSeenAt: now,
          });
          // Read current uniqueVisitors and increment atomically
          const dailySnap = await dailyRef.get();
          const dailyData = dailySnap.data();
          const currentUniqueVisitors =
            typeof dailyData?.uniqueVisitors === "number"
              ? dailyData.uniqueVisitors
              : 0;
          dailyUpdate.uniqueVisitors = currentUniqueVisitors + 1;
        }
      }

      await batch.commit();
      return NextResponse.json({ success: true });
    }

    // All non-page_view events require authentication.
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = decoded.uid;

    const batch = db.batch();
    const dailyUpdate: Record<string, unknown> = { date: dateStr, updatedAt: now };

    if (event === "feature_use") {
      dailyUpdate.featureUses = FieldValue.increment(1);
    }
    if (event === "signup") {
      dailyUpdate.signups = FieldValue.increment(1);
      dailyUpdate.totalSignups = FieldValue.increment(1); // cumulative
    }
    if (event === "download") {
      dailyUpdate.todayDownloads = FieldValue.increment(1);
      dailyUpdate.totalDownloads = FieldValue.increment(1); // cumulative
    }
    if (event === "session_start") {
      dailyUpdate.sessions = FieldValue.increment(1);
    }

    batch.set(dailyRef, dailyUpdate, { merge: true });

    // Track feature usage in the featureUsage collection (count structure).
    if (event === "feature_use" && feature) {
      const featureRef = db.collection("featureUsage").doc(String(feature));
      batch.set(featureRef, {
        feature: String(feature),
        count: FieldValue.increment(1),
        lastUsedAt: now,
      }, { merge: true });
    }

    // Track individual download records.
    if (event === "download") {
      const downloadRef = db.collection("downloads").doc();
      batch.set(downloadRef, {
        platform: metadata?.platform || "unknown",
        version: metadata?.version || "unknown",
        timestamp: now,
        userId: uid,
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[ANALYTICS_TRACK] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "An unexpected event", _dev: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 },
    );
  }
}

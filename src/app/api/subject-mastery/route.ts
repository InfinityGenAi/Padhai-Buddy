import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";

export interface SubjectMastery {
  subject: string;
  mastery: number;
  totalQuestions: number;
  correctAnswers: number;
  topicsCount: number;
  weakTopicsCount: number;
  lastPracticed: number;
}

export async function GET(req: NextRequest) {
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

    // Rate limiting
    const rateLimitResult = await checkRateLimit(`subject-mastery:${decoded.uid}`);
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

    // Fetch topic mastery data
    const topicMasterySnap = await adminDb
      .collection("users")
      .doc(decoded.uid)
      .collection("topicMastery")
      .get();

    if (topicMasterySnap.empty) {
      return NextResponse.json({
        subjectMastery: [],
      }, {
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      });
    }

    // Aggregate by subject
    const subjectMap = new Map<string, {
      subject: string;
      totalQuestions: number;
      correctAnswers: number;
      topicsCount: number;
      weakTopicsCount: number;
      lastPracticed: number;
    }>();

    topicMasterySnap.docs.forEach((doc) => {
      const data = doc.data();
      const subject = data.subject;
      const existing = subjectMap.get(subject);

      const isWeak = (data.mastery || 0) < 70 && (data.totalQuestions || 0) >= 3;

      if (existing) {
        subjectMap.set(subject, {
          subject: existing.subject,
          totalQuestions: existing.totalQuestions + (data.totalQuestions || 0),
          correctAnswers: existing.correctAnswers + (data.correctAnswers || 0),
          topicsCount: existing.topicsCount + 1,
          weakTopicsCount: existing.weakTopicsCount + (isWeak ? 1 : 0),
          lastPracticed: Math.max(existing.lastPracticed, data.lastPracticed || 0),
        });
      } else {
        subjectMap.set(subject, {
          subject,
          totalQuestions: data.totalQuestions || 0,
          correctAnswers: data.correctAnswers || 0,
          topicsCount: 1,
          weakTopicsCount: (data.mastery || 0) < 70 && (data.totalQuestions || 0) >= 3 ? 1 : 0,
          lastPracticed: data.lastPracticed || 0,
        });
      }
    });

    // Convert to array with mastery percentage
    const subjectMastery: SubjectMastery[] = Array.from(subjectMap.values()).map((s) => ({
      subject: s.subject,
      mastery: s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0,
      totalQuestions: s.totalQuestions,
      correctAnswers: s.correctAnswers,
      topicsCount: s.topicsCount,
      weakTopicsCount: s.weakTopicsCount,
      lastPracticed: s.lastPracticed,
    }));

    // Sort by mastery (ascending - weakest first)
    subjectMastery.sort((a, b) => a.mastery - b.mastery);

    return NextResponse.json({
      subjectMastery,
    }, {
      headers: {
        "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (error: unknown) {
    console.error("[SUBJECT_MASTERY] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "An unexpected error occurred", _dev: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}
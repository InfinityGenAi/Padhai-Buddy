import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import type { ProgressStats } from "@/types";

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

    const userRef = adminDb.collection("users").doc(decoded.uid);

    const [
      doubtsSnap,
      quizzesSnap,
      flashcardsSnap,
      notesSnap,
      sessionsSnap,
      plansSnap,
    ] = await Promise.all([
      userRef.collection("doubts").get(),
      userRef.collection("quizAttempts").get(),
      userRef.collection("flashcardDecks").get(),
      userRef.collection("notes").get(),
      userRef.collection("studySessions").get(),
      userRef.collection("studyPlans").get(),
    ]);

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const allDoubts = doubtsSnap.docs.map((d) => ({ createdAt: d.data().createdAt || 0 }));
    const weeklyDoubts = allDoubts.filter((d) => d.createdAt >= weekAgo).length;

    const quizzes = quizzesSnap.docs.map((d) => d.data());
    const totalQuizzes = quizzes.length;
    const avgQuizScore = totalQuizzes > 0 ? Math.round(quizzes.reduce((sum: number, q: Record<string, unknown>) => sum + (Number(q.score) || 0), 0) / totalQuizzes) : 0;

    let totalFlashcards = 0;
    let flashcardsReviewed = 0;
    const cardPromises = flashcardsSnap.docs.map(async (deckSnap) => {
      const cardsSnap = await userRef.collection("flashcardDecks").doc(deckSnap.id).collection("cards").get();
      let reviewed = 0;
      cardsSnap.forEach((d) => {
        if (d.data().status !== "new") reviewed++;
      });
      return { total: cardsSnap.size, reviewed };
    });
    const cardResults = await Promise.all(cardPromises);
    for (const result of cardResults) {
      totalFlashcards += result.total;
      flashcardsReviewed += result.reviewed;
    }

    const sessions = sessionsSnap.docs.map((d) => d.data());
    const plans = plansSnap.docs.map((d) => d.data());

    const totalStudyMinutes = sessions.reduce((sum: number, s: Record<string, unknown>) => sum + (Number(s.durationMinutes) || 0), 0);
    const plansCompleted = plans.filter((p: Record<string, unknown>) => p.completed).length;

    const dailyActivity = Array.from({ length: 7 }, (_, i) => {
      const dayStart = weekAgo + i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayDoubts = allDoubts.filter((d) => d.createdAt >= dayStart && d.createdAt < dayEnd).length;
      const daySessions = sessions.filter((s: Record<string, unknown>) => {
        const created = Number(s.createdAt) || 0;
        return created >= dayStart && created < dayEnd;
      }).length;
      return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][(new Date(dayStart).getDay() + 6) % 7], value: dayDoubts + daySessions };
    });

    const stats: ProgressStats = {
      totalDoubts: doubtsSnap.size,
      weeklyDoubts,
      totalQuizzes,
      avgQuizScore,
      totalFlashcards,
      flashcardsReviewed,
      totalNotes: notesSnap.size,
      totalStudySessions: sessionsSnap.size,
      totalStudyMinutes,
      plansCompleted,
      plansTotal: plansSnap.size,
      dailyActivity,
    };

    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ error: "Failed to compute progress" }, { status: 500 });
  }
}

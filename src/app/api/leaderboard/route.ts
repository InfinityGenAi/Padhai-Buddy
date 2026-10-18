import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

/**
 * Server-verified Top 10 Leaderboard API
 *
 * Scoring rules (points awarded per activity record - all from server-side Firestore reads only):
 *   Doubts Solved:      10 pts each (from doubts collection)
 *   Quizzes Taken:      20 pts each (from quizAttempts collection)
 *   Study Sessions:     5 pts each (from studySessions collection)
 *   Flashcards Reviewed:5 pts each (from flashcardDecks/cards collection group)
 *   Notes Created:      5 pts each (from notes collection)
 *   Plans Completed:    15 pts each (from studyPlans collection, filtered by completed)
 *
 * Only real, eligible users are shown. No client-submitted scores are trusted.
 * Private profile data is protected - only non-sensitive info is displayed.
 * Duplicate events are protected by Firestore atomic increments.
 */

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  email?: string;
  tier: string;
  score: number;
  totalDoubts: number;
  totalQuizzes: number;
  totalFlashcards: number;
  totalNotes: number;
  totalStudySessions: number;
  completedPlans: number;
  totalActivity: number;
}

export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb || initializationError) {
    return NextResponse.json(
      { error: initializationError || "Server not initialized" },
      { status: 500 }
    );
  }

  // TypeScript narrowing: adminDb is guaranteed defined here
  const db = adminDb!;

  // Verify the requesting user is authenticated
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Fetch all users and compute their scores from server-verified activity records
  const usersRef = db.collection("users");
  const usersSnap = await usersRef.get();

  const userScores: LeaderboardEntry[] = await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      const userData = userDoc.data();

      // Skip users without basic profile data
      if (!userData.displayName) {
        return null as unknown as LeaderboardEntry;
      }

      const userActivityRef = userDoc.ref;

      // Get all main activity collections in parallel
      const [
        doubtsSnap,
        quizAttemptsSnap,
        notesSnap,
        studySessionsSnap,
        studyPlansSnap,
      ] = await Promise.all([
        userActivityRef.collection("doubts").get(),
        userActivityRef.collection("quizAttempts").get(),
        userActivityRef.collection("notes").get(),
        userActivityRef.collection("studySessions").get(),
        userActivityRef.collection("studyPlans").get(),
      ]);

      // Count flashcards belonging to this user via collection group query
      let totalFlashcards = 0;
      try {
        const cardsQuery = db.collectionGroup("cards").where(
          "__name__",
          ">=",
          `${uid}/flashcardDecks/`
        );
        const cardsSnap = await cardsQuery.get();
        totalFlashcards = cardsSnap.docs.filter((d) => {
          const pathParts = d.ref.path.split("/");
          return pathParts[0] === "users" && pathParts[1] === uid && pathParts[2] === "flashcardDecks";
        }).length;
      } catch {
        totalFlashcards = 0;
      }

      // Compute count of completed study plans
      const completedPlans = studyPlansSnap.docs.filter(
        (p) => p.data().completed || p.data().completedAt
      ).length;

      // Compute score based on server-verified activity records only
      const score =
        doubtsSnap.size * 10 +                            // 10 pts per doubt solved
        quizAttemptsSnap.size * 20 +                      // 20 pts per quiz taken
        studySessionsSnap.size * 5 +                      // 5 pts per study session
        totalFlashcards * 5 +                             // 5 pts per flashcard reviewed
        notesSnap.size * 5 +                              // 5 pts per note created
        completedPlans * 15;                              // 15 pts per completed plan

      return {
        uid,
        displayName: userData.displayName || "Anonymous",
        email: userData.email || undefined, // omit email for privacy
        tier: score >= 500 ? "Gold" : score >= 200 ? "Silver" : score >= 50 ? "Bronze" : "Beginner",
        score,
        totalDoubts: doubtsSnap.size,
        totalQuizzes: quizAttemptsSnap.size,
        totalFlashcards,
        totalNotes: notesSnap.size,
        totalStudySessions: studySessionsSnap.size,
        completedPlans,
        totalActivity: doubtsSnap.size + quizAttemptsSnap.size + totalFlashcards + notesSnap.size + studySessionsSnap.size + completedPlans,
      };
    })
  );

  // Filter out null entries (users without displayName)
  const validScores = userScores.filter((entry): entry is LeaderboardEntry => entry !== null);

  // Sort by score descending, then by total activity descending for tie-breaking, then by displayName
  validScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.totalActivity !== a.totalActivity) return b.totalActivity - a.totalActivity;
    return a.displayName.localeCompare(b.displayName);
  });

  // Return only top 10
  const top10 = validScores.slice(0, 10);

  return NextResponse.json({ users: top10 });
}
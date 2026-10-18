import { adminDb, initializationError } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Server-owned activity/points ledger.
 *
 * This is the single source of truth for leaderboard scoring. Client-writable
 * activity documents are never trusted directly by the leaderboard; points are
 * only credited here, either incrementally by the activity API routes when a
 * verified, eligible activity is created, or via the admin recalculate endpoint
 * which rebuilds the ledger from validated activity records.
 *
 * Point rules (points awarded per verified, eligible activity):
 *   Doubt solved:      10 pts
 *   Quiz taken:        20 pts (only completed attempts)
 *   Study session:     5 pts (only completed sessions)
 *   Flashcard reviewed:5 pts (only cards with status "reviewed")
 *   Note created:      5 pts
 *   Plan completed:    15 pts (only completed plans)
 */

export type ScoreActivity =
  | "doubt"
  | "quiz"
  | "session"
  | "flashcard"
  | "note"
  | "plan";

const POINTS: Record<ScoreActivity, number> = {
  doubt: 10,
  quiz: 20,
  session: 5,
  flashcard: 5,
  note: 5,
  plan: 15,
};

export function activityPoints(activity: ScoreActivity): number {
  return POINTS[activity];
}

/**
 * Increment a user's ledger for a single verified activity. Called by activity
 * API routes immediately after a validated activity is persisted. Uses atomic
 * Firestore increments so concurrent activity creation never double-counts or
 * loses points.
 */
export async function incrementUserScore(
  uid: string,
  activity: ScoreActivity,
): Promise<void> {
  if (!adminDb || initializationError) {
    return;
  }

  const ref = adminDb.collection("userScores").doc(uid);
  const updates: Record<string, unknown> = {
    uid,
    updatedAt: Date.now(),
  };

  const field = {
    doubt: "totalDoubts",
    quiz: "totalQuizzes",
    session: "totalStudySessions",
    flashcard: "totalFlashcards",
    note: "totalNotes",
    plan: "completedPlans",
  }[activity];

  updates[field] = FieldValue.increment(1);
  updates.score = FieldValue.increment(POINTS[activity]);
  updates.totalActivity = FieldValue.increment(1);

  await ref.set(updates, { merge: true });
}

/**
 * Decrement a user's ledger for a single activity (used when an activity is
 * removed, e.g. note deleted). Mirrors incrementUserScore with negative
 * increments so the ledger stays consistent.
 */
export async function decrementUserScore(
  uid: string,
  activity: ScoreActivity,
): Promise<void> {
  if (!adminDb || initializationError) {
    return;
  }

  const ref = adminDb.collection("userScores").doc(uid);
  const updates: Record<string, unknown> = {
    uid,
    updatedAt: Date.now(),
  };

  const field = {
    doubt: "totalDoubts",
    quiz: "totalQuizzes",
    session: "totalStudySessions",
    flashcard: "totalFlashcards",
    note: "totalNotes",
    plan: "completedPlans",
  }[activity];

  updates[field] = FieldValue.increment(-1);
  updates.score = FieldValue.increment(-POINTS[activity]);
  updates.totalActivity = FieldValue.increment(-1);

  await ref.set(updates, { merge: true });
}

interface UserScoreSnapshot {
  uid: string;
  name?: string;
  username?: string;
  score: number;
  totalDoubts: number;
  totalQuizzes: number;
  totalFlashcards: number;
  totalNotes: number;
  totalStudySessions: number;
  completedPlans: number;
  totalActivity: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  name: string;
  username?: string;
  score: number;
  tier: string;
  totalDoubts: number;
  totalQuizzes: number;
  totalFlashcards: number;
  totalNotes: number;
  totalStudySessions: number;
  completedPlans: number;
  totalActivity: number;
}

export function tierForScore(score: number): string {
  if (score >= 500) return "Gold";
  if (score >= 200) return "Silver";
  if (score >= 50) return "Bronze";
  return "Beginner";
}

export function scoreEntryFromUser(
  uid: string,
  data: Record<string, unknown>,
  counts: {
    doubts: number;
    quizzes: number;
    flashcards: number;
    notes: number;
    sessions: number;
    plans: number;
  },
): LeaderboardEntry {
  const score =
    counts.doubts * 10 +
    counts.quizzes * 20 +
    counts.sessions * 5 +
    counts.flashcards * 5 +
    counts.notes * 5 +
    counts.plans * 15;

  const name = (data.name as string) || (data.username as string) || "Anonymous";
  const username = (data.username as string) || undefined;

  return {
    name,
    username,
    score,
    tier: tierForScore(score),
    totalDoubts: counts.doubts,
    totalQuizzes: counts.quizzes,
    totalFlashcards: counts.flashcards,
    totalNotes: counts.notes,
    totalStudySessions: counts.sessions,
    completedPlans: counts.plans,
    totalActivity:
      counts.doubts + counts.quizzes + counts.flashcards + counts.notes + counts.sessions + counts.plans,
  };
}

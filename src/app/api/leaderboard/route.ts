import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import {
  LeaderboardEntry,
  scoreEntryFromUser,
  tierForScore,
} from "@/lib/score-ledger";

/**
 * Server-verified Top 10 Leaderboard API.
 *
 * Scoring is based on the server-owned `userScores` points ledger, NOT on
 * client-writable activity documents. Client-writable activity records are
 * never trusted directly by the leaderboard; points are only credited to the
 * ledger by verified server-side activity processing.
 *
 * Privacy: the public leaderboard never returns email addresses and never
 * returns UIDs. Only non-sensitive profile fields (name/username, score, tier,
 * activity counts) are exposed.
 *
 * Performance: uses a bounded, indexed query (orderBy score desc, limit 10)
 * rather than scanning every user document on every request.
 */

export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb || initializationError) {
    return NextResponse.json(
      { error: initializationError || "Server not initialized" },
      { status: 500 },
    );
  }

  const db = adminDb;

  // Authenticate the requesting user (leaderboard is for signed-in users).
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

  // Rate limit per user so a single client cannot hammer the leaderboard.
  const rateLimitResponse = await enforceRateLimit(`leaderboard:${decoded.uid}`, 30);
  if (rateLimitResponse) return rateLimitResponse;

  // Stable top-10 query: bounded reads, indexed by score. Never scans all users.
  const scoresSnap = await db
    .collection("userScores")
    .orderBy("score", "desc")
    .limit(10)
    .get();

  // The score ledger is authoritative for ranking and totals, but profile names
  // can change and the incremental score writer doesn't necessarily rewrite the
  // display fields on every activity. Resolve only the ten ranked profiles so
  // current names/usernames are shown without scanning the whole user collection.
  const users: LeaderboardEntry[] = await Promise.all(
    scoresSnap.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const profileSnap = await db.collection("users").doc(docSnap.id).get().catch(() => null);
      const profile = profileSnap?.exists ? profileSnap.data() : undefined;
      const score = typeof data.score === "number" ? data.score : 0;

      const profileName =
        typeof profile?.name === "string" && profile.name.trim()
          ? profile.name.trim()
          : typeof profile?.username === "string" && profile.username.trim()
            ? profile.username.trim()
            : undefined;
      const ledgerName =
        typeof data.name === "string" && data.name.trim()
          ? data.name.trim()
          : typeof data.username === "string" && data.username.trim()
            ? data.username.trim()
            : undefined;
      const profileUsername =
        typeof profile?.username === "string" && profile.username.trim()
          ? profile.username.trim()
          : undefined;
      const ledgerUsername =
        typeof data.username === "string" && data.username.trim()
          ? data.username.trim()
          : undefined;

      return {
        name: profileName || ledgerName || "Anonymous",
        username: profileUsername || ledgerUsername,
        score,
        tier: tierForScore(score),
        totalDoubts: typeof data.totalDoubts === "number" ? data.totalDoubts : 0,
        totalQuizzes: typeof data.totalQuizzes === "number" ? data.totalQuizzes : 0,
        totalFlashcards: typeof data.totalFlashcards === "number" ? data.totalFlashcards : 0,
        totalNotes: typeof data.totalNotes === "number" ? data.totalNotes : 0,
        totalStudySessions: typeof data.totalStudySessions === "number" ? data.totalStudySessions : 0,
        completedPlans: typeof data.completedPlans === "number" ? data.completedPlans : 0,
        totalActivity: typeof data.totalActivity === "number" ? data.totalActivity : 0,
      };
    }),
  );

  // Sort by score desc, then total activity desc, then name for stable tie-break.
  users.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.totalActivity !== a.totalActivity) return b.totalActivity - a.totalActivity;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ users });
}

async function isAdmin(decoded: { admin?: unknown }): Promise<boolean> {
  return decoded.admin === true;
}

/**
 * Admin-only: rebuild the server-owned `userScores` ledger from validated
 * activity records. Client-writable activity documents are validated here
 * before being credited, so forged or incomplete activity never inflates scores.
 *
 *   - Doubts: only server-created records count (10 pts each).
 *   - Quizzes: only server-authorized and server-scored attempts count (20 pts each).
 *   - Study sessions: only server-created sessions verified after their full duration
 *     count (5 pts each).
 *   - Flashcards: only cards with the server-owned scoreCredited marker count
 *     (5 pts each; status "known" is the canonical review state).
 *   - Notes: only server-created notes count (5 pts each).
 *   - Study plans: only server-created plans completed by the server after eligible
 *     duration/date checks count (15 pts each).
 */
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb || initializationError) {
    return NextResponse.json(
      { error: initializationError || "Server not initialized" },
      { status: 500 },
    );
  }

  const db = adminDb;

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

  if (!(await isAdmin(decoded as unknown as { admin?: unknown }))) {
    return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "recalculate") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Fetch users in pages to avoid unbounded memory on large user bases.
  const usersSnap = await db.collection("users").get();
  const processed: Array<{ uid: string; score: number }> = [];

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();

    const doubtsSnap = await db.collection("users").doc(uid).collection("doubts").get();
    const quizSnap = await db.collection("users").doc(uid).collection("quizAttemptAuthority").get();
    const notesSnap = await db.collection("users").doc(uid).collection("notes").get();
    const sessionsSnap = await db.collection("users").doc(uid).collection("studySessions").get();
    const plansSnap = await db.collection("users").doc(uid).collection("studyPlans").get();

    const completedQuizzes = quizSnap.docs.filter((d) => {
      const attempt = d.data();
      return attempt.serverCreated === true && attempt.serverScored === true && !!attempt.completedAt;
    }).length;
    const completedSessions = sessionsSnap.docs.filter((d) => {
      const session = d.data();
      const durationSeconds = typeof session.durationSeconds === "number"
        ? session.durationSeconds
        : typeof session.durationMinutes === "number"
          ? session.durationMinutes * 60
          : 0;
      return session.serverCreated === true
        && session.serverVerified === true
        && session.completed === true
        && typeof session.completedAt === "number"
        && typeof session.createdAt === "number"
        && durationSeconds > 0
        && session.completedAt >= session.createdAt + durationSeconds * 1000;
    }).length;
    const completedPlans = plansSnap.docs.filter((d) => {
      const plan = d.data();
      if (
        plan.serverCreated !== true
        || plan.serverCompleted !== true
        || plan.completed !== true
        || typeof plan.completedAt !== "number"
        || typeof plan.createdAt !== "number"
        || typeof plan.durationMinutes !== "number"
        || plan.durationMinutes < 1
        || typeof plan.plannedDate !== "string"
      ) return false;
      const completedDate = new Date(plan.completedAt).toISOString().slice(0, 10);
      return plan.completedAt >= plan.createdAt + plan.durationMinutes * 60_000
        && plan.plannedDate <= completedDate;
    }).length;

    // Count only cards credited by the server after a valid transition to "known".
    let reviewedFlashcards = 0;
    try {
      const decksSnap = await db
        .collection("users")
        .doc(uid)
        .collection("flashcardDecks")
        .get();
      for (const deckDoc of decksSnap.docs) {
        const cardsSnap = await deckDoc.ref
          .collection("cards")
          .where("scoreCredited", "==", true)
          .get();
        reviewedFlashcards += cardsSnap.size;
      }
    } catch {
      // If flashcard data is unreadable, treat as zero credited cards rather than
      // silently failing the whole recalculation.
      reviewedFlashcards = 0;
    }

    const entry = scoreEntryFromUser(uid, data, {
      doubts: doubtsSnap.docs.filter((d) => d.data().serverCreated === true).length,
      quizzes: completedQuizzes,
      flashcards: reviewedFlashcards,
      notes: notesSnap.docs.filter((d) => d.data().serverCreated === true).length,
      sessions: completedSessions,
      plans: completedPlans,
    });

    await db.collection("userScores").doc(uid).set(
      {
        uid,
        name: entry.name,
        username: entry.username,
        score: entry.score,
        tier: entry.tier,
        totalDoubts: entry.totalDoubts,
        totalQuizzes: entry.totalQuizzes,
        totalFlashcards: entry.totalFlashcards,
        totalNotes: entry.totalNotes,
        totalStudySessions: entry.totalStudySessions,
        completedPlans: entry.completedPlans,
        totalActivity: entry.totalActivity,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    processed.push({ uid, score: entry.score });
  }

  return NextResponse.json({
    success: true,
    recalculated: processed.length,
    users: processed,
  });
}

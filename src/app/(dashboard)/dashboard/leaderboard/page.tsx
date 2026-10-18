"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  TrophyIcon,
} from "@heroicons/react/24/outline";

export default function LeaderboardPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [leaderboard, setLeaderboard] = useState<Array<{
    rank: number;
    displayName: string;
    score: number;
    tier: string;
    totalDoubts: number;
    totalQuizzes: number;
    totalFlashcards: number;
    totalNotes: number;
    totalStudySessions: number;
    completedPlans: number;
    badgeClass: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/leaderboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.users) {
          const users = data.users.map((user: { displayName?: string; score: number; totalDoubts?: number; totalQuizzes?: number; totalFlashcards?: number; totalNotes?: number; totalStudySessions?: number; completedPlans?: number }, index: number) => {
            const tier =
              user.score >= 500
                ? "Gold"
                : user.score >= 200
                ? "Silver"
                : user.score >= 50
                ? "Bronze"
                : "Beginner";
            let badgeClass: string;
            if (tier === "Gold") {
              badgeClass = "bg-primary/20 text-primary";
            } else if (tier === "Silver") {
              badgeClass = "bg-secondary/20 text-secondary";
            } else if (tier === "Bronze") {
              badgeClass = "bg-foreground/10 text-foreground/60";
            } else {
              badgeClass = "bg-foreground/5 text-foreground/40";
            }
            return {
              rank: index + 1,
              displayName: user.displayName || `User ${index + 1}`,
              score: user.score || 0,
              tier: tier,
              totalDoubts: user.totalDoubts || 0,
              totalQuizzes: user.totalQuizzes || 0,
              totalFlashcards: user.totalFlashcards || 0,
              totalNotes: user.totalNotes || 0,
              totalStudySessions: user.totalStudySessions || 0,
              completedPlans: user.completedPlans || 0,
              badgeClass: badgeClass,
            };
          });
          setLeaderboard(users);
        }
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  if (loading) {
    return (
      <motion.div
        initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
        animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
        className="min-h-screen flex items-center justify-center p-4"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center text-primary text-2xl font-bold mx-auto mb-3">
            <TrophyIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Loading Leaderboard</h1>
          <p className="text-foreground/60 mt-2">Fetching top users...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      className="space-y-6 w-full"
    >
      <div className="flex items-center gap-2">
        <TrophyIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Top 10 Leaderboard</h1>
      </div>

      <p className="text-foreground/60 mb-4">
        Server-verified scores based on real activity records. Never trust client-submitted scores.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-foreground/5">
              <th className="text-left py-3 px-4 font-medium text-foreground/60">Rank</th>
              <th className="text-left py-3 px-4 font-medium text-foreground/60">User</th>
              <th className="text-right py-3 px-4 font-medium text-foreground/60">Score</th>
              <th className="text-left py-3 px-4 font-medium text-foreground/60">Tier</th>
              <th className="text-left py-3 px-4 font-medium text-foreground/60">Activity</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length > 0 ? (
              leaderboard.map((user) => (
                <tr
                  key={user.rank}
                  className={user.rank <= 3 ? "bg-primary/5" : ""}
                >
                  <td className="py-3 px-4 font-medium text-primary">
                    {user.rank}
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground/70">
                    {user.displayName}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-primary">
                    {user.score.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={user.badgeClass}>
                      {user.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground/50 text-xs">
                    {user.totalDoubts}d·{user.totalQuizzes}q·{user.totalNotes}n·{user.totalStudySessions}s·{user.completedPlans}p
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-foreground/50">
                  No leaderboard data available yet. Be the first to earn points!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary section below the table */}
      {leaderboard.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-xl mt-6">
          <h3 className="text-lg font-semibold mb-4">How Scoring Works</h3>
          <dl className="space-y-1 text-sm text-foreground/70">
            <div className="flex justify-between"><dt>Doubts Solved</dt><dd>10 pts each</dd></div>
            <div className="flex justify-between"><dt>Quizzes Taken</dt><dd>20 pts each</dd></div>
            <div className="flex justify-between"><dt>Study Sessions</dt><dd>5 pts each</dd></div>
            <div className="flex justify-between"><dt>Flashcards Reviewed</dt><dd>5 pts each</dd></div>
            <div className="flex justify-between"><dt>Notes Created</dt><dd>5 pts each</dd></div>
            <div className="flex justify-between"><dt>Plans Completed</dt><dd>15 pts each</dd></div>
          </dl>
          <p className="text-foreground/50 mt-3">Scores are server-verified from real activity records only.</p>
        </div>
      )}

      {/* Bottom note - protect privacy */}
      <p className="text-foreground/50 text-center text-sm mt-4">
        {leaderboard.length > 0
          ? `Top ${leaderboard.length} users shown out of eligible users`
          : "No users have earned scores yet. Complete activities to appear on the leaderboard!"}
      </p>
    </motion.div>
  );
}
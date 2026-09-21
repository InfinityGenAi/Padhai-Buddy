"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  TrophyIcon,
  ChatBubbleLeftEllipsisIcon,
  BookOpenIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function LeaderboardPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [stats, setStats] = useState({
    doubts: 0,
    quizzes: 0,
    avgScore: 0,
    sessions: 0,
    flashcards: 0,
    notes: 0,
    plansCompleted: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/progress", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.stats) {
          setStats({
            doubts: data.stats.totalDoubts || 0,
            quizzes: data.stats.totalQuizzes || 0,
            avgScore: data.stats.avgQuizScore || 0,
            sessions: data.stats.totalStudySessions || 0,
            flashcards: data.stats.totalFlashcards || 0,
            notes: data.stats.totalNotes || 0,
            plansCompleted: data.stats.plansCompleted || 0,
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const totalScore = stats.doubts * 10 + stats.quizzes * 20 + stats.sessions * 5 + stats.flashcards * 5 + stats.notes * 5 + stats.plansCompleted * 15;

  const tier = totalScore >= 500 ? "Gold" : totalScore >= 200 ? "Silver" : totalScore >= 50 ? "Bronze" : "Beginner";

  const activities = [
    { label: "Doubts Solved", value: stats.doubts, icon: ChatBubbleLeftEllipsisIcon, points: 10 },
    { label: "Quizzes Taken", value: stats.quizzes, icon: BookOpenIcon, points: 20 },
    { label: "Study Sessions", value: stats.sessions, icon: ClockIcon, points: 5 },
    { label: "Flashcards Reviewed", value: stats.flashcards, icon: SparklesIcon, points: 5 },
    { label: "Notes Created", value: stats.notes, icon: DocumentTextIcon, points: 5 },
    { label: "Plans Completed", value: stats.plansCompleted, icon: CheckCircleIcon, points: 15 },
  ];

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-6 w-full">
      <div className="flex items-center gap-2">
        <TrophyIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Study Progress</h1>
      </div>

      <div className="subtle-card rounded-xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
          {tier === "Gold" ? (
            <TrophyIcon className="w-10 h-10" />
          ) : tier === "Silver" ? (
            <TrophyIcon className="w-10 h-10" />
          ) : tier === "Bronze" ? (
            <TrophyIcon className="w-10 h-10" />
          ) : (
            <span className="text-3xl">🌱</span>
          )}
        </div>
        <h2 className="text-lg font-bold">{tier} Tier</h2>
        <p className="text-sm text-foreground/60 mt-1">Your personal study score: <span className="font-semibold text-primary">{totalScore}</span></p>
        <p className="text-xs text-foreground/50 mt-2">This is your personal progress tracker, not a global leaderboard.</p>
      </div>

      <div className="subtle-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground/75 mb-4">Your Activity Breakdown</h3>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-8 bg-foreground/5 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <activity.icon className="w-4 h-4 text-foreground/50" />
                  <span className="text-sm text-foreground/70">{activity.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">{activity.value}</span>
                  <span className="text-xs text-foreground/40 ml-1">+{activity.value * activity.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="subtle-card rounded-xl p-5 bg-primary/5 border-primary/20">
        <h3 className="text-sm font-semibold text-foreground/75 mb-2">How Scoring Works</h3>
        <dl className="space-y-1 text-sm text-foreground/70">
          <div className="flex justify-between"><dt>Doubts Solved</dt><dd>10 pts each</dd></div>
          <div className="flex justify-between"><dt>Quizzes Taken</dt><dd>20 pts each</dd></div>
          <div className="flex justify-between"><dt>Study Sessions</dt><dd>5 pts each</dd></div>
          <div className="flex justify-between"><dt>Flashcards Reviewed</dt><dd>5 pts each</dd></div>
          <div className="flex justify-between"><dt>Notes Created</dt><dd>5 pts each</dd></div>
          <div className="flex justify-between"><dt>Plans Completed</dt><dd>15 pts each</dd></div>
        </dl>
        <p className="text-xs text-foreground/50 mt-3">Scores are personal and not compared with other users.</p>
      </div>
    </motion.div>
  );
}

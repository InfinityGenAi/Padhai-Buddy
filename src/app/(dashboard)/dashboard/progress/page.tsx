"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChartBarIcon,
  ChatBubbleLeftEllipsisIcon,
  BookOpenIcon,
  CalendarIcon,
  DocumentTextIcon,
  SparklesIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import type { ProgressStats } from "@/types";

function SimpleBarChart({ data, color }: { data: { day: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-foreground/5 rounded-t-lg relative" style={{ height: "100%" }}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={`absolute bottom-0 w-full rounded-t-lg ${color}`}
            />
          </div>
          <span className="text-[10px] text-foreground/40 font-medium">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/progress", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setStats(data.stats);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load progress");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const statCards = [
    { label: "Doubts Solved", value: stats?.totalDoubts ?? 0, icon: ChatBubbleLeftEllipsisIcon, color: "text-accent-purple", bg: "bg-purple-500/10" },
    { label: "Quizzes Taken", value: stats?.totalQuizzes ?? 0, icon: BookOpenIcon, color: "text-accent-blue", bg: "bg-blue-500/10" },
    { label: "Avg Quiz Score", value: stats?.avgQuizScore ?? 0, icon: SparklesIcon, color: "text-accent-amber", bg: "bg-amber-500/10", suffix: "%" },
    { label: "Flashcards", value: stats?.totalFlashcards ?? 0, icon: DocumentTextIcon, color: "text-accent-emerald", bg: "bg-emerald-500/10" },
    { label: "Notes Created", value: stats?.totalNotes ?? 0, icon: DocumentTextIcon, color: "text-accent-orange", bg: "bg-orange-500/10" },
    { label: "Study Sessions", value: stats?.totalStudySessions ?? 0, icon: ClockIcon, color: "text-accent-pink", bg: "bg-pink-500/10" },
  ];

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-5 w-full">
      <div className="flex items-center gap-2">
        <ChartBarIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Progress</h1>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 bg-foreground/5 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCards.map((stat) => (
              <div key={stat.label} className="subtle-card rounded-xl p-4 flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}><stat.icon className="w-4 h-4" /></div>
                <p className="text-lg font-bold text-foreground">{stat.value}{stat.suffix || ""}</p>
                <p className="text-[11px] text-foreground/45 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="subtle-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground/75 mb-4">This Week Activity</h3>
            {stats && stats.dailyActivity.some((d) => d.value > 0) ? (
              <SimpleBarChart data={stats.dailyActivity} color="bg-gradient-to-t from-purple-500 to-indigo-500" />
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-8 h-8 text-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-foreground/40">No activity this week</p>
              </div>
            )}
          </div>

          <div className="subtle-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground/75 mb-3">Study Summary</h3>
            <div className="space-y-2 text-sm text-foreground/60">
              <p>Total study time: <span className="font-semibold text-foreground">{Math.floor((stats?.totalStudyMinutes || 0) / 60)}h {(stats?.totalStudyMinutes || 0) % 60}m</span></p>
              <p>Plans completed: <span className="font-semibold text-foreground">{stats?.plansCompleted || 0} / {stats?.plansTotal || 0}</span></p>
              <p>Flashcards reviewed: <span className="font-semibold text-foreground">{stats?.flashcardsReviewed || 0}</span></p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChartBarIcon,
  ChatBubbleLeftEllipsisIcon,
  BookOpenIcon,
  CalendarIcon,
  DocumentTextIcon,
  SparklesIcon,
  ClockIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ProgressStats } from "@/types";

interface SubjectMastery {
  subject: string;
  mastery: number;
  totalQuestions: number;
  correctAnswers: number;
  topicsCount: number;
  weakTopicsCount: number;
  lastPracticed: number;
}

interface WeakTopic {
  subject: string;
  topic: string;
  mastery: number;
  totalQuestions: number;
  correctAnswers: number;
  mistakeCount: number;
  lastMistakeAt: number;
  lastPracticed: number;
  weaknessScore: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  isActiveToday: boolean;
  streakMessage: string;
}

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

function MasteryBar({ subject, topic, mastery }: { subject: string; topic: string; mastery: number }) {
  const color = mastery >= 80 ? "bg-emerald-500" : mastery >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 flex-shrink-0">
        <p className="text-xs font-medium text-foreground/70 truncate">{subject}</p>
        <p className="text-xs text-foreground/50 truncate">{topic}</p>
      </div>
      <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${mastery}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-12 text-right">{mastery}%</span>
    </div>
  );
}

export default function ProgressPage() {
  const { user, preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [weakTopicsLoading, setWeakTopicsLoading] = useState(true);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [subjectMastery, setSubjectMastery] = useState<SubjectMastery[]>([]);
  const [subjectMasteryLoading, setSubjectMasteryLoading] = useState(true);

  // Fetch stats
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

  // Fetch weak topics
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/weak-topics", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setWeakTopics(data.weakTopics || []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setWeakTopicsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Fetch streak
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/streak", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setStreak(data.streak || null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setStreakLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Fetch subject mastery
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/subject-mastery", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setSubjectMastery(data.subjectMastery || []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSubjectMasteryLoading(false);
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

  const formatStudyTime = (minutes: number) => {
    if (minutes <= 0) return "0m";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-6 w-full">
      <div className="flex items-center gap-2">
        <ChartBarIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Progress</h1>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">{error}</motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 bg-foreground/5 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCards.map((stat) => (
              <div key={stat.label} className="subtle-card rounded-xl p-4 flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}><stat.icon className="w-4 h-4" /></div>
                <p className="text-lg font-bold text-foreground">{stat.value}{stat.suffix || ""}</p>
                <p className="text-[11px] text-foreground/45 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Streak Card */}
          <div className="subtle-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground/75">Study Streak</h3>
              {streakLoading ? (
                <div className="h-5 w-20 bg-foreground/5 rounded animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-lg font-bold">
                    {streak?.currentStreak ?? 0}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Day Streak</p>
                    <p className="text-xs text-foreground/50">{streak?.streakMessage || "Start your streak today!"}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Streak calendar */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded border border-foreground/10 flex items-center justify-center text-xs">
                  {streak && !streakLoading && i < 14 ? (
                    <span className={`text-[10px] ${i < (streak.currentStreak || 0) ? 'text-amber-500' : 'text-foreground/20'}`}>
                      {i + 1}
                    </span>
                  ) : (
                    <span className="text-[10px] text-foreground/20">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Weak Topics - Actionable */}
          <div className="subtle-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground/75">Weak Topics</h3>
              {weakTopicsLoading ? (
                <div className="h-5 w-24 bg-foreground/5 rounded animate-pulse" />
              ) : (
                <span className="text-xs text-foreground/50 font-medium">{weakTopics.length} topics need attention</span>
              )}
            </div>
            
            {weakTopicsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-foreground/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : weakTopics.length === 0 ? (
              <div className="text-center py-8">
                <AcademicCapIcon className="w-8 h-8 text-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-foreground/40">No weak topics detected. Keep up the good work!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakTopics.slice(0, 5).map((topic) => (
                  <div key={`${topic.subject}-${topic.topic}`} className="p-3 rounded-xl border border-amber-800/50 bg-amber-950/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{topic.subject}: {topic.topic}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">{topic.mastery}% mastery · {topic.totalQuestions} questions · {topic.mistakeCount} mistakes</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-950/50 text-amber-400 rounded-full">
                        {topic.weaknessScore > 70 ? "Critical" : topic.weaknessScore > 40 ? "High" : "Medium"}
                      </span>
                    </div>
                    <MasteryBar subject={topic.subject} topic={topic.topic} mastery={topic.mastery} />
                    <div className="flex gap-2 mt-3 pt-2 border-t border-amber-800/30">
                      <button onClick={() => router.push(`/dashboard/quiz?topic=${encodeURIComponent(topic.topic)}&subject=${encodeURIComponent(topic.subject)}`)} className="flex-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                        Practice Quiz
                      </button>
                      <button onClick={() => router.push(`/dashboard/chat?message=${encodeURIComponent(`Help me understand ${topic.topic} in ${topic.subject}. I'm in Class ${user?.class} ${user?.board}.`)}`)} className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-950/30 hover:bg-indigo-950/50 rounded-lg transition-colors">
                        Ask AI
                      </button>
                      <button onClick={() => router.push(`/dashboard/flashcards`)} className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/50 rounded-lg transition-colors">
                        Flashcards
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject Mastery Overview */}
          <div className="subtle-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground/75 mb-4">Subject Mastery</h3>
            {subjectMasteryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-foreground/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : subjectMastery.length === 0 ? (
              <div className="text-center py-8">
                <BookOpenIcon className="w-8 h-8 text-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-foreground/40">Take quizzes to build your mastery profile.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subjectMastery.map((sm) => (
                  <div key={sm.subject} className="p-3 rounded-xl border border-foreground/10 bg-foreground/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{sm.subject}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">{sm.topicsCount} topics · {sm.totalQuestions} questions · {sm.correctAnswers} correct</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full
                        {sm.mastery >= 80 ? 'bg-emerald-950/30 text-emerald-400' : sm.mastery >= 60 ? 'bg-amber-950/30 text-amber-400' : 'bg-red-950/30 text-red-400'}
                      ">
                        {sm.mastery}% mastery
                      </span>
                    </div>
                    <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        sm.mastery >= 80 ? 'bg-emerald-500' : sm.mastery >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${sm.mastery}%` }} />
                    </div>
                    {sm.weakTopicsCount > 0 && (
                      <p className="text-xs text-red-400 mt-1">{sm.weakTopicsCount} topic{sm.weakTopicsCount > 1 ? 's' : ''} need review</p>
                    )}
                    {sm.lastPracticed > 0 && (
                      <p className="text-[10px] text-foreground/40 mt-1">
                        Last practiced: {new Date(sm.lastPracticed).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* This Week Activity */}
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

          {/* Study Summary */}
          <div className="subtle-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground/75 mb-3">Study Summary</h3>
            <div className="space-y-2 text-sm text-foreground/60">
              <p>Total Study Time: <span className="font-semibold text-foreground">{formatStudyTime(stats?.totalStudyMinutes || 0)}</span></p>
              <p>Plans Completed: <span className="font-semibold text-foreground">{stats?.plansCompleted || 0} / {stats?.plansTotal || 0}</span></p>
              <p>Flashcards reviewed: <span className="font-semibold text-foreground">{stats?.flashcardsReviewed || 0}</span></p>
              <p>Avg Quiz Score: <span className="font-semibold text-foreground">{stats?.avgQuizScore || 0}%</span></p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
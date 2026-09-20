"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  PhotoIcon,
  ClockIcon,
  LightBulbIcon,
  PlusIcon,
  CalendarIcon,
  BookOpenIcon,
  Squares2X2Icon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  SparklesIcon,
  ClockIcon as ClockIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  ArrowPathIcon as ArrowPathIconSolid,
  SparklesIcon as SparklesIconSolid,
} from "@heroicons/react/24/outline";
import { getFirestoreDb } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc } from "firebase/firestore";
import { playTaskComplete } from "@/lib/sounds";
import type { Doubt, StudyPlan } from "@/types";
import { QuickStudy, ThisWeekOverview, RecentActivity } from "@/components/dashboard";

interface NextAction {
  id: string;
  title: string;
  reason: string;
  actionType: string;
  targetRoute: string;
  subject?: string;
  topic?: string;
  priority: number;
  icon: string;
  color: string;
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

async function handleTogglePlan(uid: string | undefined, plan: StudyPlan) {
  const db = getFirestoreDb();
  if (!db || !uid) return;
  await updateDoc(doc(db, "users", uid, "studyPlans", plan.id), {
    completed: !plan.completed,
    updatedAt: Date.now(),
  });
}

async function handleDeletePlan(
  uid: string | undefined,
  planId: string,
  setDeletingPlanId: (id: string | null) => void,
  setPlanError: (msg: string | null) => void,
) {
  const db = getFirestoreDb();
  if (!db || !uid) return;
  setDeletingPlanId(planId);
  try {
    await deleteDoc(doc(db, "users", uid, "studyPlans", planId));
  } catch {
    setPlanError("Failed to delete task. Please try again.");
    setTimeout(() => setPlanError(null), 4000);
  } finally {
    setDeletingPlanId(null);
  }
}

async function handleAddPlan(
  uid: string | undefined,
  newPlanTitle: string,
  newPlanSubject: string,
  newPlanDuration: number,
  today: string,
  setNewPlanTitle: (v: string) => void,
  setNewPlanSubject: (v: string) => void,
  setNewPlanDuration: (v: number) => void,
  setShowAddPlan: (v: boolean) => void,
  setAddingPlan: (v: boolean) => void,
  setPlanError: (msg: string | null) => void,
  soundEnabled?: boolean,
) {
  if (!newPlanTitle.trim() || !uid) return;
  const db = getFirestoreDb();
  if (!db) return;

  setAddingPlan(true);
  setPlanError(null);
  try {
    await addDoc(collection(db, "users", uid, "studyPlans"), {
      title: newPlanTitle.trim(),
      subject: newPlanSubject.trim() || "General",
      durationMinutes: newPlanDuration,
      plannedDate: today,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setNewPlanTitle("");
    setNewPlanSubject("");
    setNewPlanDuration(30);
    setShowAddPlan(false);
    if (soundEnabled) playTaskComplete();
  } catch {
    setPlanError("Failed to add task. Please try again.");
    setTimeout(() => setPlanError(null), 4000);
  } finally {
    setAddingPlan(false);
  }
}

function getIconComponent(iconName: string) {
  switch (iconName) {
    case "exclamation-triangle": return ExclamationTriangleIcon;
    case "academic-cap": return AcademicCapIcon;
    case "calendar-days": return CalendarIcon;
    case "sparkles": return SparklesIcon;
    case "question-mark-circle": return BookOpenIcon;
    case "squares-2x2": return Squares2X2Icon;
    case "photo": return PhotoIcon;
    default: return SparklesIcon;
  }
}

function getColorClasses(color: string) {
  switch (color) {
    case "red": return { colorClass: "text-red-400", bgClass: "bg-red-950/30", borderClass: "border-red-800/50" };
    case "amber": return { colorClass: "text-amber-400", bgClass: "bg-amber-950/30", borderClass: "border-amber-800/50" };
    case "blue": return { colorClass: "text-blue-400", bgClass: "bg-blue-950/30", borderClass: "border-blue-800/50" };
    case "indigo": return { colorClass: "text-indigo-400", bgClass: "bg-indigo-950/30", borderClass: "border-indigo-800/50" };
    case "teal": return { colorClass: "text-teal-400", bgClass: "bg-teal-950/30", borderClass: "border-teal-800/50" };
    case "emerald": return { colorClass: "text-emerald-400", bgClass: "bg-emerald-950/30", borderClass: "border-emerald-800/50" };
    case "purple": return { colorClass: "text-purple-400", bgClass: "bg-purple-950/30", borderClass: "border-purple-800/50" };
    case "primary": return { colorClass: "text-primary", bgClass: "bg-primary/10", borderClass: "border-primary/30" };
    default: return { colorClass: "text-primary", bgClass: "bg-primary/10", borderClass: "border-primary/30" };
  }
}

function formatStudyTime(minutes: number) {
  if (minutes <= 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getTodayInIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const { user, preferences } = useAuth();
  const [totalDoubts, setTotalDoubts] = useState(0);
  const [weeklyStudyMinutes, setWeeklyStudyMinutes] = useState(0);
  const [recentDoubts, setRecentDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [studySessions, setStudySessions] = useState<
    { mode: string; durationMinutes: number; completed: boolean; createdAt: number; subject?: string }[]
  >([]);
  const [quizStats, setQuizStats] = useState<{ total: number; avgScore: number }>({ total: 0, avgScore: 0 });
  const [flashcardStats, setFlashcardStats] = useState<{ total: number; learned: number }>({ total: 0, learned: 0 });
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanSubject, setNewPlanSubject] = useState("");
  const [newPlanDuration, setNewPlanDuration] = useState(30);
  const [addingPlan, setAddingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // === New API-driven state ===
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [nextActionsLoading, setNextActionsLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [weakTopicsLoading, setWeakTopicsLoading] = useState(true);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  // === Fetch Next Actions ===
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/next-action", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setNextActions(data.actions || []);
      } catch {
        // ignore, will use fallback
      } finally {
        if (!cancelled) setNextActionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // === Fetch Weak Topics ===
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

  // === Fetch Streak ===
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

  // === Load basic stats ===
  useEffect(() => {
    const loadStats = async () => {
      const db = getFirestoreDb();
      if (!db || !user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const doubtsRef = collection(db, "users", user.uid, "doubts");
        const allSnap = await getDocs(doubtsRef);
        const allDoubts: Doubt[] = [];
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

        let studyMinutes = 0;
        const studySnap = await getDocs(collection(db, "users", user.uid, "studySessions"));
        studySnap.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.()?.getTime?.() || data.createdAt || 0;
          if (createdAt >= weekAgo) {
            studyMinutes += Number(data.durationMinutes) || 0;
          }
        });

        let total = 0;
        allSnap.forEach((doc) => {
          const data = doc.data();
          total++;
          const createdAt = data.createdAt?.toDate?.()?.getTime?.() || data.createdAt || 0;
          allDoubts.push({
            id: doc.id,
            question: data.question,
            answer: data.answer,
            type: data.type,
            createdAt,
          });
        });

        allDoubts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTotalDoubts(total);
        setWeeklyStudyMinutes(studyMinutes);
        setRecentDoubts(allDoubts.slice(0, 4));
      } catch {
        // ignore stats errors
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user?.uid]);

  // === Study Plans listener ===
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const q = query(
      collection(db, "users", user.uid, "studyPlans"),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const plans: StudyPlan[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        plans.push({
          id: doc.id,
          title: data.title || "Untitled Task",
          subject: data.subject || "General",
          durationMinutes: data.durationMinutes || 30,
          plannedDate: data.plannedDate || "",
          completed: data.completed || false,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
        });
      });
      setStudyPlans(plans);
    });

    return () => unsub();
  }, [user?.uid]);

  // === Study Sessions listener ===
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unsub = onSnapshot(
      collection(db, "users", user.uid, "studySessions"),
      (snapshot) => {
        const data: { mode: string; durationMinutes: number; completed: boolean; createdAt: number; subject?: string }[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          data.push({
            mode: d.mode || "custom",
            durationMinutes: d.durationMinutes || 0,
            completed: d.completed || false,
            createdAt: d.createdAt || Date.now(),
            subject: d.subject,
          });
        });
        setStudySessions(data);
      },
      (error) => {
        console.error("[DASHBOARD] studySessions listener error:", error);
        setStudySessions([]);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // === Quiz Stats listener ===
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unsub = onSnapshot(
      collection(db, "users", user.uid, "quizAttempts"),
      (snapshot) => {
        const attempts = snapshot.docs.map((d) => d.data());
        const total = attempts.length;
        const avgScore = total > 0
          ? Math.round(attempts.reduce((sum: number, a: Record<string, unknown>) => sum + (Number(a.score) || 0), 0) / total)
          : 0;
        setQuizStats({ total, avgScore });
      },
      (error) => {
        console.error("[DASHBOARD] quizStats listener error:", error);
        setQuizStats({ total: 0, avgScore: 0 });
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // === Flashcard Stats listener ===
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unsub = onSnapshot(
      collection(db, "users", user.uid, "flashcardDecks"),
      async (snapshot) => {
        let total = 0;
        let learned = 0;
        for (const deckDoc of snapshot.docs) {
          const cardsSnap = await getDocs(collection(db, "users", user.uid, "flashcardDecks", deckDoc.id, "cards"));
          total += cardsSnap.size;
          cardsSnap.forEach((d) => {
            if (d.data().status !== "new") learned++;
          });
        }
        setFlashcardStats({ total, learned });
      },
      (error) => {
        console.error("[DASHBOARD] flashcardStats listener error:", error);
        setFlashcardStats({ total: 0, learned: 0 });
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const today = getTodayInIST();
  const todayPlans = studyPlans.filter((p) => p.plannedDate === today);
  const completedToday = todayPlans.filter((p) => p.completed).length;
  const todayProgress = todayPlans.length > 0 ? Math.round((completedToday / todayPlans.length) * 100) : 0;

  // Primary action from nextActions API (or fallback)
  const primaryAction = nextActions[0];

  // Secondary actions
  const secondaryActions = nextActions.slice(1, 3);

  const thisWeekOverviewStats = useMemo(() => {
    const weekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
    const thisWeekSessions = studySessions.filter((s) => (s.createdAt || 0) >= weekAgo);
    const thisWeekSubjects = [...new Set(thisWeekSessions.map((s) => s.subject).filter((s): s is string => Boolean(s)))];
    return {
      totalMinutes: weeklyStudyMinutes,
      sessions: thisWeekSessions.length,
      subjects: thisWeekSubjects.length > 0 ? thisWeekSubjects : [],
    };
  }, [studySessions, weeklyStudyMinutes]);

  // Quick study actions
  const quickStudyActions = useMemo(() => {
    const actions = [
      { key: "ai-tutor", href: "/dashboard/chat", label: "Ask AI Tutor", desc: "Get help with any topic" },
      { key: "quiz", href: "/dashboard/quiz", label: "Practice Quiz", desc: "Test your knowledge" },
      { key: "flashcards", href: "/dashboard/flashcards", label: "Flashcards", desc: "Spaced repetition" },
      { key: "photo", href: "/dashboard/photo-doubt", label: "Photo Doubt", desc: "Snap & solve problems" },
    ];
    return actions;
  }, []);

  const renderPrimaryAction = () => {
    if (nextActionsLoading) {
      return (
        <div className="p-4 rounded-xl border border-border/50 bg-foreground/5 animate-pulse space-y-3">
          <div className="h-5 bg-foreground/10 rounded w-1/3" />
          <div className="h-4 bg-foreground/10 rounded w-1/2" />
          <div className="h-10 bg-foreground/10 rounded" />
        </div>
      );
    }

    if (!primaryAction) {
      return (
        <div className="p-4 rounded-xl border border-border/50 bg-foreground/5 text-center">
          <SparklesIcon className="w-8 h-8 text-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-foreground/60">No recommendations yet. Start studying to get personalized suggestions!</p>
        </div>
      );
    }

    const IconComponent = getIconComponent(primaryAction.icon);
    const { colorClass, bgClass, borderClass } = getColorClasses(primaryAction.color);

    return (
      <Link
        href={primaryAction.targetRoute}
        className="block p-4 rounded-xl border hover:border-primary/30 hover:bg-foreground/[0.02] transition-all"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass} ${colorClass}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground">{primaryAction.title}</p>
            <p className="text-sm text-foreground/60 mt-1">{primaryAction.reason}</p>
          </div>
          <div className="flex-shrink-0 self-center">
            <span className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg">
              Start →
            </span>
          </div>
        </div>
      </Link>
    );
  };

  const renderSecondaryActions = () => {
    if (nextActionsLoading || secondaryActions.length === 0) return null;

    return (
      <div className="grid grid-cols-2 gap-3">
        {secondaryActions.map((action) => {
          const IconComponent = getIconComponent(action.icon);
          const { colorClass, bgClass, borderClass } = getColorClasses(action.color);

          return (
            <Link
              key={action.id}
              href={action.targetRoute}
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${borderClass} ${bgClass} hover:border-primary/30 hover:bg-foreground/[0.02] transition-all`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bgClass} ${colorClass}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                <p className="text-xs text-foreground/55 mt-0.5 truncate">{action.reason}</p>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      variants={animationsEnabled ? {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.04,
          },
        },
      } : undefined}
      initial={animationsEnabled ? "hidden" : undefined}
      animate={animationsEnabled ? "visible" : undefined}
      className="space-y-6 w-full"
    >
      {/* 1. GREETING + CLASS/BOARD CONTEXT */}
      <motion.div
        variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Hi, {user?.name?.split(" ")[0] || "there"}!
            </h1>
          </div>
          {user?.class && user?.board && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary whitespace-nowrap">
              Class {user.class} — {user.board}
            </span>
          )}
        </div>
        <p className="text-sm sm:text-base text-foreground/55">
          What should we tackle today?
        </p>
      </motion.div>

      {/* 2. TODAY'S PRIMARY STUDY ACTION (Above the fold) */}
      <motion.div
        variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground/75">TODAY</h2>
          <span className="text-xs text-foreground/50 font-medium">Primary Focus</span>
        </div>
        {renderPrimaryAction()}
      </motion.div>

      {/* 3. SECONDARY ACTIONS */}
      {renderSecondaryActions() && (
        <motion.div
          variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
        >
          <h2 className="text-base font-semibold text-foreground/75 mb-3">MORE ACTIONS</h2>
          {renderSecondaryActions()}
        </motion.div>
      )}

      {/* 4. TODAY'S PLAN / PROGRESS */}
      <motion.div
        variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
        className="subtle-card rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground/75">TODAY'S PLAN</h2>
          <span className="text-xs text-foreground/50 font-medium">{todayProgress}% done</span>
        </div>

        {planError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-xs"
          >
            {planError}
          </motion.div>
        )}

        {todayPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center mb-3">
              <CalendarIcon className="w-5 h-5 text-foreground/30" />
            </div>
            <p className="text-sm text-foreground/50 mb-3">No tasks planned for today.</p>
            <button
              onClick={() => setShowAddPlan(true)}
              className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2 flex-1 max-h-[200px] overflow-y-auto">
              {todayPlans.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    item.completed ? "bg-foreground/[0.02]" : "bg-foreground/5 hover:bg-foreground/8"
                  }`}
                >
                  <button
                    onClick={() => handleTogglePlan(user?.uid, item)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.completed
                        ? "bg-primary border-primary"
                        : "border-foreground/25 hover:border-primary/50"
                    }`}
                  >
                    {item.completed && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${item.completed ? "text-foreground/35 line-through" : "text-foreground/75"}`}>
                      {item.subject} — {item.title}
                    </p>
                  </div>
                  <span className="text-xs text-foreground/40 flex-shrink-0">{item.durationMinutes} min</span>
                  <button
                    onClick={() => handleDeletePlan(user?.uid, item.id, setDeletingPlanId, setPlanError)}
                    disabled={deletingPlanId === item.id}
                    className="p-1 rounded-md text-foreground/30 hover:text-red-500 hover:bg-red-950/20 transition-colors disabled:opacity-50"
                    title="Delete task"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-foreground/50 font-medium">Progress</span>
                <span className="text-xs text-foreground/60 font-medium">{completedToday}/{todayPlans.length}</span>
              </div>
              <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${todayProgress}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowAddPlan(true)}
              className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5 focus-ring"
            >
              <PlusIcon className="w-4 h-4" />
              Add Task
            </button>
          </>
        )}
      </motion.div>

      {/* 5. WEAK TOPICS REQUIRING ATTENTION */}
      <motion.div
        variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground/75">PRIORITY</h2>
          <span className="text-xs text-foreground/50 font-medium">Needs Review</span>
        </div>
        <div className={weakTopicsLoading ? "space-y-2" : weakTopics.length === 0 ? "text-center py-4" : "space-y-2"}>
          {weakTopicsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-foreground/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : weakTopics.length === 0 ? (
            <p className="text-foreground/40 text-sm">
              No weak topics detected. Keep up the good work!
            </p>
          ) : (
            weakTopics.slice(0, 3).map((topic) => (
              <Link
                key={`${topic.subject}-${topic.topic}`}
                href={`/dashboard/quiz?topic=${encodeURIComponent(topic.topic)}&subject=${encodeURIComponent(topic.subject)}`}
                className="p-3 rounded-xl border border-amber-800/50 bg-amber-950/30 flex items-center gap-3 hover:border-amber-400/50 hover:bg-amber-950/40 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-950/50 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <AcademicCapIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{topic.subject}: {topic.topic}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">{topic.mastery}% mastery · {topic.mistakeCount} mistakes</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-950/50 rounded-full">
                  Practice
                </span>
              </Link>
            ))
          )}
        </div>
      </motion.div>

      {/* 6. QUICK STUDY ACTIONS */}
      <motion.div
        variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
      >
        <h2 className="text-base font-semibold text-foreground/75 mb-3">QUICK STUDY</h2>
        <QuickStudy actions={quickStudyActions} />
      </motion.div>

      {/* 7. COMPACT PROGRESS / STREAK SUMMARY */}
      <motion.div
        variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {/* Study Streak */}
        <div className="subtle-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <span className="text-xl font-bold">{streak?.currentStreak ?? 0}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground tracking-tight">Day Streak</p>
            <p className="text-xs text-foreground/50 font-medium">{streak?.streakMessage || "Start your streak today!"}</p>
          </div>
        </div>

        {/* Study Time This Week */}
        <div className="subtle-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <ClockIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground tracking-tight">{formatStudyTime(weeklyStudyMinutes)}</p>
            <p className="text-xs text-foreground/50 font-medium">This Week</p>
          </div>
        </div>

        {/* Quizzes Taken */}
        <div className="subtle-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <BookOpenIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground tracking-tight">{quizStats.total}</p>
            <p className="text-xs text-foreground/50 font-medium">Quizzes Taken</p>
          </div>
        </div>

        {/* Avg Score */}
        <div className="subtle-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground tracking-tight">{quizStats.avgScore > 0 ? `${quizStats.avgScore}%` : "—"}</p>
            <p className="text-xs text-foreground/50 font-medium">Avg Score</p>
          </div>
        </div>
      </motion.div>

      {/* 8. THIS WEEK OVERVIEW */}
      <ThisWeekOverview studyStats={thisWeekOverviewStats} />

      {/* 9. RECENT ACTIVITY */}
      <motion.div
        variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}
      >
        <RecentActivity recentActivities={recentDoubts.map((d) => ({
          id: d.id,
          type: d.type,
          subject: d.type === "text" ? "Text" : "Photo",
          time: Math.floor((new Date().getTime() - d.createdAt) / 60000),
          completed: false,
        }))} />
      </motion.div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddPlan(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="subtle-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-4">Add Study Task</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleAddPlan(user?.uid, newPlanTitle, newPlanSubject, newPlanDuration, today, setNewPlanTitle, setNewPlanSubject, setNewPlanDuration, setShowAddPlan, setAddingPlan, setPlanError, preferences.soundEnabled); }} className="space-y-3">
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={newPlanSubject}
                    onChange={(e) => setNewPlanSubject(e.target.value)}
                    placeholder="e.g. Maths, Physics"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Task Title</label>
                  <input
                    type="text"
                    value={newPlanTitle}
                    onChange={(e) => setNewPlanTitle(e.target.value)}
                    placeholder="e.g. Calculus exercises"
                    required
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Duration (minutes)</label>
                  <select
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>{m} min</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPlan(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={addingPlan || !newPlanTitle.trim()}
                    className="px-4 py-2 btn-primary rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {addingPlan ? "Adding..." : "Add Task"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
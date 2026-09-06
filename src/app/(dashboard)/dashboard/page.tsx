"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  ClockIcon,
  LightBulbIcon,
  PlusIcon,
  CalendarIcon,
  BookOpenIcon,
  Squares2X2Icon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { getFirestoreDb } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc } from "firebase/firestore";
import { playTaskComplete } from "@/lib/sounds";
import type { Doubt, StudyPlan } from "@/types";
import {
  AiStudyBar,
  QuickStudy,
  ContinueLearning,
  ReviewToday,
  WeakTopics,
  ThisWeekOverview,
  RecentActivity,
} from "@/components/dashboard";

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

export default function DashboardPage() {
  const { user, preferences } = useAuth();
  const [totalDoubts, setTotalDoubts] = useState(0);
  const [weeklyStudyMinutes, setWeeklyStudyMinutes] = useState(0);
  const [recentDoubts, setRecentDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanSubject, setNewPlanSubject] = useState("");
  const [newPlanDuration, setNewPlanDuration] = useState(30);
  const [addingPlan, setAddingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // === Topic Mastery state ===
  const [topicMastery, setTopicMastery] = useState<
    { subject: string; topic: string; mastery: number; totalQuestions: number; correctAnswers: number; lastPracticed: number }[]
  >([]);

  // === Mistake Bank state ===
  const [mistakeBank, setMistakeBank] = useState<
    { subject: string; topic: string; question: string; userAnswer: string; correctAnswer: string; explanation: string; createdAt: number }[]
  >([]);

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [localStudyStats] = useState(() => {
    try {
      return {
        quizzes: Number(localStorage.getItem("pb-quizzes-taken")) || 0,
        flashcards: Number(localStorage.getItem("pb-flashcards-learned")) || 0,
        avgScore: localStorage.getItem("pb-avg-score") || null,
      };
    } catch {
      return { quizzes: 0, flashcards: 0, avgScore: null };
    }
  });

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

  // === Topic Mastery listener ===
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unsub = onSnapshot(
      collection(db, "users", user.uid, "topicMastery"),
      (snapshot) => {
        const data: {
          subject: string;
          topic: string;
          mastery: number;
          totalQuestions: number;
          correctAnswers: number;
          lastPracticed: number;
        }[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          data.push({
            subject: d.subject || "General",
            topic: d.topic || "General",
            mastery: d.mastery || 0,
            totalQuestions: d.totalQuestions || 0,
            correctAnswers: d.correctAnswers || 0,
            lastPracticed: d.lastPracticed || 0,
          });
        });
        setTopicMastery(data);
      },
      (error) => {
        console.error("[DASHBOARD] topicMastery listener error:", error);
        setTopicMastery([]);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // === Mistake Bank listener ===
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unsub = onSnapshot(
      collection(db, "users", user.uid, "mistakeBank"),
      (snapshot) => {
        const data: {
          subject: string;
          topic: string;
          question: string;
          userAnswer: string;
          correctAnswer: string;
          explanation: string;
          createdAt: number;
        }[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          data.push({
            subject: d.subject || "General",
            topic: d.topic || "General",
            question: d.question || "",
            userAnswer: d.userAnswer || "",
            correctAnswer: d.correctAnswer || "",
            explanation: d.explanation || "",
            createdAt: d.createdAt || 0,
          });
        });
        setMistakeBank(data);
      },
      (error) => {
        console.error("[DASHBOARD] mistakeBank listener error:", error);
        setMistakeBank([]);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const today = new Date().toISOString().split("T")[0];
  const todayPlans = studyPlans.filter((p) => p.plannedDate === today);
  const completedToday = todayPlans.filter((p) => p.completed).length;
const todayProgress = todayPlans.length > 0 ? Math.round((completedToday / todayPlans.length) * 100) : 0;

  const continueStudySet = topicMastery.length > 0
    ? [...topicMastery].sort((a, b) => (b.lastPracticed || 0) - (a.lastPracticed || 0))[0]
    : undefined;
  const reviewTodayItems = mistakeBank
    .filter((m) => !m.explanation || m.explanation.trim() === "")
    .slice(0, 5);
  const weakTopics = topicMastery
    .filter((t) => t.mastery < 60 && t.totalQuestions >= 3)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5);

  const thisWeekOverviewStats = useMemo(() => {
    const weekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
    const thisWeekStudySessions = studyPlans.filter((p) => (p.createdAt || 0) >= weekAgo);
    const thisWeekSubjects = [...new Set(thisWeekStudySessions.map((p) => p.subject).filter(Boolean))];
    return {
      totalMinutes: weeklyStudyMinutes,
      sessions: thisWeekStudySessions.length,
      subjects: thisWeekSubjects.length > 0 ? thisWeekSubjects : ["General"],
    };
  }, [studyPlans, weeklyStudyMinutes]);

  // === Next-Best-Action calculation ===
  const nextBestAction = useMemo(() => {
    // Priority 1: Unreviewed mistakes
    const unreviewedMistakes = mistakeBank.filter(
      (m) => !m.explanation || m.explanation.trim() === ""
    );
    if (unreviewedMistakes.length > 0) {
      const count = unreviewedMistakes.length;
      const latest = unreviewedMistakes[0];
      return {
        type: "review-mistakes" as const,
        label: `Review ${count} unreviewed mistake${count > 1 ? "s" : ""}`,
        description: `Start with "${latest.topic}" — ${latest.question.slice(0, 50)}${latest.question.length > 50 ? "…" : ""}`,
        href: "/dashboard/photo-doubt",
        icon: PhotoIcon,
        colorClass: "text-red-400",
        bgClass: "bg-red-950/30",
        borderClass: "border-red-800/50",
      };
    }

    // Priority 2: Weak topics (mastery < 60, >= 3 questions)
    if (weakTopics.length > 0) {
      const weakest = weakTopics[0];
      return {
        type: "weak-topic" as const,
        label: `Strengthen "${weakest.topic}"`,
        description: `${weakest.mastery}% mastery in ${weakest.subject} — practice to improve`,
        href: `/dashboard/quiz?topic=${encodeURIComponent(weakest.topic)}&subject=${encodeURIComponent(weakest.subject)}`,
        icon: BookOpenIcon,
        colorClass: "text-amber-400",
        bgClass: "bg-amber-950/30",
        borderClass: "border-amber-800/50",
      };
    }

    // Priority 3: Incomplete today's plan
    const pendingToday = todayPlans.filter((p) => !p.completed);
    if (pendingToday.length > 0) {
      const nextTask = pendingToday[0];
      return {
        type: "pending-plan" as const,
        label: `Complete "${nextTask.title}"`,
        description: `${nextTask.subject} — ${nextTask.durationMinutes} min task pending today`,
        href: "/dashboard/planner",
        icon: CalendarIcon,
        colorClass: "text-blue-400",
        bgClass: "bg-blue-950/30",
        borderClass: "border-blue-800/50",
      };
    }

    // Priority 4: Continue learning from recently practiced topic
    if (continueStudySet) {
      return {
        type: "continue-learning" as const,
        label: `Continue "${continueStudySet.topic}"`,
        description: `${continueStudySet.subject} — ${continueStudySet.mastery}% mastery, keep building`,
        href: "/dashboard/ai-tutor",
        icon: LightBulbIcon,
        colorClass: "text-indigo-400",
        bgClass: "bg-indigo-950/30",
        borderClass: "border-indigo-800/50",
      };
    }

    // Priority 5: Default - start a quiz
    return {
      type: "start-quiz" as const,
      label: "Start a quiz",
      description: "Test your knowledge and build mastery",
      href: "/dashboard/quiz",
      icon: BookOpenIcon,
      colorClass: "text-teal-400",
      bgClass: "bg-teal-950/30",
      borderClass: "border-teal-800/50",
    };
  }, [mistakeBank, weakTopics, todayPlans, continueStudySet]);

  const formatStudyTime = (minutes: number) => {
    if (minutes <= 0) return "0m";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const calculateStreak = (plans: StudyPlan[]): number => {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const hasActivity = plans.some((p) => p.plannedDate === dateStr && p.completed);
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const studyStreak = calculateStreak(studyPlans);

  const stats = [
    {
      label: "Doubts Solved",
      value: loading ? "…" : String(totalDoubts),
      sublabel: "All Time",
      icon: ChatBubbleLeftEllipsisIcon,
      colorClass: "text-accent-blue",
      bgClass: "bg-blue-950/30",
    },
    {
      label: "Study Time",
      value: loading ? "…" : formatStudyTime(weeklyStudyMinutes),
      sublabel: "This Week",
      icon: ClockIcon,
      colorClass: "text-accent-teal",
      bgClass: "bg-teal-950/30",
    },
    {
      label: "Quizzes Taken",
      value: String(localStudyStats.quizzes),
      sublabel: "Total",
      icon: BookOpenIcon,
      colorClass: "text-accent-amber",
      bgClass: "bg-amber-950/30",
    },
    {
      label: "Flashcards Learned",
      value: String(localStudyStats.flashcards),
      sublabel: "Total",
      icon: Squares2X2Icon,
      colorClass: "text-accent-emerald",
      bgClass: "bg-emerald-500/10",
    },
    {
      label: "Score Average",
      value: localStudyStats.avgScore ? `${localStudyStats.avgScore}%` : "—",
      sublabel: "Best attempt",
      icon: ChartBarIcon,
      colorClass: "text-accent-indigo",
      bgClass: "bg-indigo-950/30",
    },
  ];

const renderInsight = () => {
    if (loading) {
      return (
        <div className="space-y-2.5">
          <div className="h-3.5 bg-foreground/5 rounded w-4/5 animate-pulse" />
          <div className="h-3.5 bg-foreground/5 rounded w-3/5 animate-pulse" />
        </div>
      );
    }

    const action = nextBestAction;

    return (
      <div className="space-y-3">
        <div className={`p-3 rounded-xl border ${action.borderClass} ${action.bgClass}`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${action.bgClass} ${action.colorClass}`}>
              <action.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-xs text-foreground/60 mt-0.5">{action.description}</p>
            </div>
          </div>
        </div>
        <Link
          href={action.href}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
        >
          {action.label} →
        </Link>
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
      {/* Welcome Header */}
      <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
        <div className="flex items-center gap-3 mb-1 sm:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Hi, {user?.name?.split(" ")[0] || "there"}! 👋
          </h1>
        </div>
        {user?.class && user?.board && (
          <div className="hidden sm:flex items-center gap-3 mb-1">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              Class {user.class} — {user.board}
            </span>
          </div>
        )}
        <p className="text-sm sm:text-base text-foreground/55 mt-1 sm:hidden">
          Let&apos;s make today an amazing learning day.
        </p>
      </motion.div>

<ContinueLearning currentStudySet={continueStudySet} />

      {/* Stats Cards */}
      <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="subtle-card card-hover rounded-xl p-4 flex flex-col gap-2.5"
            >
              <div className={`w-8 h-8 rounded-lg ${stat.bgClass} ${stat.colorClass} flex items-center justify-center card-icon`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-[11px] sm:text-xs text-foreground/45 font-medium">{stat.label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs text-foreground/40">{stat.sublabel}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 3-Column Section: Today's Plan | AI Study Insight | Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Plan */}
        <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined} className="lg:col-span-1">
          <div className="subtle-card rounded-xl p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground/75">Today&apos;s Plan</h2>
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
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
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
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px]">
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
          </div>
</motion.div>

      <ReviewToday recentActivities={reviewTodayItems.map((r) => r.question)} />

      <WeakTopics weakTopics={weakTopics} />

      <ThisWeekOverview studyStats={thisWeekOverviewStats} />

      {/* AI Study Insight */}
        <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined} className="lg:col-span-1">
          <div className="subtle-card rounded-xl p-5 h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-950/30 flex items-center justify-center text-primary">
                <LightBulbIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground/75">AI Study Insight</h3>
            </div>
            {renderInsight()}
          </div>
        </motion.div>

        <RecentActivity recentActivities={recentDoubts.map((d) => ({
  id: d.id,
  type: d.type,
  subject: d.type === "text" ? "Text" : "Photo",
  time: Math.floor((new Date().getTime() - d.createdAt) / 60000),
  completed: false,
}))} />
      </div>

      {/* 2-Column Section: Study Streak | Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Study Streak */}
        <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
          <div className="subtle-card rounded-xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <span className="text-2xl font-bold">{studyStreak}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground tracking-tight">Day Streak</p>
              <p className="text-xs text-foreground/50 font-medium">Keep it up!</p>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary/20" />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Progress Overview */}
        <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
          <div className="subtle-card rounded-xl p-5 flex items-center justify-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="10"
                  className="stroke-foreground/8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="url(#progressGradient)"
                  strokeDasharray="326.7"
                  strokeDashoffset={326.7 - (326.7 * (Math.max(0, Math.min(100, studyStreak > 0 ? Math.min(100, studyStreak * 14) : 0)) / 100))}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {studyStreak > 0 ? `${Math.min(100, studyStreak * 14)}%` : "0%"}
                  </p>
                  <p className="text-[10px] text-foreground/40 font-medium">Progress</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

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

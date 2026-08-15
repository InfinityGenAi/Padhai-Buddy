"use client";

import { useState, useEffect, useRef } from "react";
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
} from "@heroicons/react/24/outline";
import { getFirestoreDb } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc } from "firebase/firestore";
import { playTaskComplete } from "@/lib/sounds";
import type { Doubt, StudyPlan } from "@/types";

function buildSafeChartPath(dailyCounts: number[]): { pathD: string; areaD: string; points: { x: number; y: number; val: number }[] } {
  const maxVal = Math.max(...dailyCounts, 1);
  const points = dailyCounts.map((val, idx) => ({
    x: (idx / 6) * 100,
    y: val > 0 ? 100 - (val / maxVal) * 75 - 10 : 50,
    val,
  }));

  if (points.length === 0 || dailyCounts.every((v) => v === 0)) {
    return { pathD: "", areaD: "", points: [] };
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 1) {
    d += ` C ${points[0].x + 10} ${points[0].y}, ${points[0].x + 15} ${points[0].y}, ${points[0].x + 20} ${points[0].y}`;
    return {
      pathD: d,
      areaD: `${d} L ${points[0].x + 20} 100 L ${points[0].x} 100 Z`,
      points,
    };
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return {
    pathD: d,
    areaD: `${d} L 100 100 L 0 100 Z`,
    points,
  };
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

export default function DashboardPage() {
  const { user, preferences } = useAuth();
  const [weeklyDoubts, setWeeklyDoubts] = useState(0);
  const [totalDoubts, setTotalDoubts] = useState(0);
  const [recentDoubts, setRecentDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyChartData, setWeeklyChartData] = useState<number[]>(new Array(7).fill(0));
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [pathLength, setPathLength] = useState(800);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanSubject, setNewPlanSubject] = useState("");
  const [newPlanDuration, setNewPlanDuration] = useState(30);
  const [addingPlan, setAddingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

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
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        let weekly = 0;
        let total = 0;
        const allDoubts: Doubt[] = [];
        const dailyCounts = new Array(7).fill(0);

        allSnap.forEach((doc) => {
          const data = doc.data();
          total++;
          const createdAt = data.createdAt?.toDate?.()?.getTime?.() || data.createdAt || 0;
          if (createdAt >= weekAgo) {
            weekly++;
            const dayIndex = 6 - Math.floor((now - createdAt) / (24 * 60 * 60 * 1000));
            if (dayIndex >= 0 && dayIndex < 7) {
              dailyCounts[dayIndex]++;
            }
          }
          allDoubts.push({
            id: doc.id,
            question: data.question,
            answer: data.answer,
            type: data.type,
            createdAt,
          });
        });

        allDoubts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setWeeklyDoubts(weekly);
        setTotalDoubts(total);
        setRecentDoubts(allDoubts.slice(0, 4));
        setWeeklyChartData(dailyCounts);
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

  const today = new Date().toISOString().split("T")[0];
  const todayPlans = studyPlans.filter((p) => p.plannedDate === today);
  const completedToday = todayPlans.filter((p) => p.completed).length;
  const todayProgress = todayPlans.length > 0 ? Math.round((completedToday / todayPlans.length) * 100) : 0;

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, [weeklyChartData]);

  const { pathD, areaD, points: chartPoints } = buildSafeChartPath(weeklyChartData);
  const hasChartData = weeklyChartData.some((v) => v > 0);
  const avgPerDay = weeklyDoubts > 0 ? (weeklyDoubts / 7).toFixed(1) : "0";

  const displayName = user?.name || "there";
  const firstName = displayName.split(" ")[0] || displayName;

  const stats = [
    {
      label: "Doubts Solved",
      value: loading ? "…" : String(totalDoubts),
      sublabel: "All Time",
      change: null,
      icon: ChatBubbleLeftEllipsisIcon,
      colorClass: "text-accent-purple",
      bgClass: "bg-purple-500/10",
    },
    {
      label: "Study Plans Completed",
      value: loading ? "…" : String(studyPlans.filter(p => p.completed).length),
      sublabel: `${studyPlans.length} total`,
      change: null,
      icon: CalendarIcon,
      colorClass: "text-accent-emerald",
      bgClass: "bg-emerald-500/10",
    },
    {
      label: "Avg / Day",
      value: loading ? "…" : (weeklyDoubts > 0 ? avgPerDay : "—"),
      sublabel: "This Week",
      change: null,
      icon: LightBulbIcon,
      colorClass: "text-accent-amber",
      bgClass: "bg-amber-500/10",
    },
  ];

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) return `${Math.floor(diffMs / 1000 / 60)}m ago`;
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const renderInsight = () => {
    if (loading) {
      return (
        <div className="space-y-2.5">
          <div className="h-3.5 bg-foreground/5 rounded w-4/5 animate-pulse" />
          <div className="h-3.5 bg-foreground/5 rounded w-3/5 animate-pulse" />
        </div>
      );
    }

    if (totalDoubts === 0) {
      return (
        <p className="text-foreground/60 text-sm leading-relaxed">
          Your study journey starts here. Ask your first doubt in Chat Doubt or upload a photo to begin learning with AI.
        </p>
      );
    }

    return (
      <p className="text-foreground/60 text-sm leading-relaxed">
        {weeklyDoubts > 0 && (
          <>
            You solved <span className="font-semibold text-primary">{weeklyDoubts}</span> doubts this week
            {totalDoubts > 0 && " and "}
          </>
        )}
        a total of <span className="font-semibold text-primary">{totalDoubts}</span> doubts overall
        . Keep practicing to strengthen your concepts.
      </p>
    );
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || chartPoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const closest = chartPoints.reduce((prev, curr) =>
      Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev
    );
    const dist = Math.abs(closest.x - x);
    if (dist < 12) {
      setHoveredPoint(chartPoints.indexOf(closest));
    } else {
      setHoveredPoint(null);
    }
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
      className="space-y-5 w-full"
    >
      {/* Welcome Header */}
      <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Hi, {firstName}! 👋
        </h1>
        <p className="text-sm sm:text-base text-foreground/55 mt-1">
          Let&apos;s make today an amazing learning day.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="subtle-card card-hover rounded-xl p-4 flex flex-col gap-2.5"
            >
              <div className={`w-8 h-8 rounded-lg ${stat.bgClass} ${stat.colorClass} flex items-center justify-center card-icon`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-[11px] sm:text-xs text-foreground/45 font-medium">{stat.label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs text-foreground/40">{stat.sublabel}</span>
                {stat.change && (
                  <span className="text-[10px] sm:text-xs font-medium text-accent-green">↑ {stat.change}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Today's Plan + Weekly Overview */}
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
                className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs"
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
                        className="p-1 rounded-md text-foreground/30 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
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
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
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

        {/* Weekly Overview */}
        <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined} className="lg:col-span-2">
          <div className="subtle-card rounded-2xl p-5 sm:p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-foreground/75">This Week Overview</h2>
                <p className="text-xs text-foreground/45 mt-0.5">Your learning activity this week</p>
              </div>
              <span className="text-xs text-foreground/50 font-medium px-2.5 py-1 rounded-lg bg-foreground/5 border border-border">This Week</span>
            </div>

            {/* Weekly Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-[11px] text-foreground/45 font-medium uppercase tracking-wider mb-1">Study Time</p>
                <p className="text-sm font-semibold text-foreground">—</p>
              </div>
              <div>
                <p className="text-[11px] text-foreground/45 font-medium uppercase tracking-wider mb-1">Doubts Solved</p>
                <p className="text-sm font-semibold text-foreground">{loading ? "…" : weeklyDoubts}</p>
              </div>
              <div>
                <p className="text-[11px] text-foreground/45 font-medium uppercase tracking-wider mb-1">Avg / Day</p>
                <p className="text-sm font-semibold text-foreground">{loading ? "…" : avgPerDay}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="relative w-full" style={{ height: "220px" }} ref={containerRef}>
              {hoveredPoint !== null && hasChartData && chartPoints[hoveredPoint] && (
                <div
                  className="absolute pointer-events-none z-10 px-2.5 py-1.5 rounded-lg bg-foreground/90 text-white text-xs font-medium shadow-lg"
                  style={{
                    left: `${chartPoints[hoveredPoint].x}%`,
                    top: `${chartPoints[hoveredPoint].y}%`,
                    transform: "translate(-50%, -130%)",
                  }}
                >
                  <div className="font-semibold">{chartPoints[hoveredPoint].val} {chartPoints[hoveredPoint].val === 1 ? "doubt" : "doubts"}</div>
                  <div className="text-[10px] text-white/70">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][hoveredPoint]}</div>
                </div>
              )}
              <svg
                ref={svgRef}
                viewBox="0 0 100 60"
                className="w-full h-full"
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 15}
                    x2="100"
                    y2={i * 15}
                    className="chart-grid-line"
                  />
                ))}
                {/* Area fill */}
                {hasChartData && <path d={areaD} fill="url(#chartGradient)" className="chart-area-fill" />}
                {/* Line */}
                {hasChartData && (
                  <path
                    ref={pathRef}
                    d={pathD}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={animationsEnabled ? "chart-line-draw" : ""}
                    style={animationsEnabled ? { strokeDasharray: pathLength, strokeDashoffset: 0 } : undefined}
                  />
                )}
                {/* Dots */}
                {chartPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hasChartData && p.val > 0 ? "2.5" : "0"}
                    className={animationsEnabled && hasChartData ? "chart-dot-animate" : "chart-dot"}
                    style={animationsEnabled && hasChartData ? { animationDelay: `${0.5 + i * 0.08}s` } : undefined}
                    onMouseEnter={hasChartData ? () => setHoveredPoint(i) : undefined}
                  />
                ))}
              </svg>
              {/* X-axis labels */}
              <div className="flex justify-between mt-2 px-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <span key={day} className="text-[10px] text-foreground/35 font-medium">{day}</span>
                ))}
              </div>
              {!hasChartData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center h-full text-center bg-card/70">
                  <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center mb-3">
                    <ClockIcon className="w-6 h-6 text-foreground/25" />
                  </div>
                  <p className="text-sm text-foreground/50 mb-1">No study activity this week</p>
                  <p className="text-xs text-foreground/35">Start with your first doubt or study session.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Study Insight */}
      <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
        <div className="subtle-card rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-primary">
              <LightBulbIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground/75">Study Insight</h3>
          </div>
          {renderInsight()}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={animationsEnabled ? { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } } : undefined}>
        <h2 className="text-base font-semibold text-foreground/75 mb-3">Recent Activity</h2>
        <div className="subtle-card rounded-xl p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-foreground/5 rounded w-3/4 animate-pulse" />
              ))}
            </div>
          ) : recentDoubts.length === 0 ? (
            <div className="text-center py-8 sm:py-10">
              <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ClockIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary/60" />
              </div>
              <p className="text-foreground/60 text-sm sm:text-base mb-4">
                Your study journey starts here.
              </p>
              <Link href="/dashboard/chat">
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.03 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium shadow-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg transition-all"
                >
                  Ask your first doubt
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentDoubts.map((doubt) => (
                <div
                  key={doubt.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-foreground-subtle bg-foreground-subtle-hover transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      doubt.type === "text"
                        ? "bg-purple-100 dark:bg-purple-950/30"
                        : "bg-blue-100 dark:bg-blue-950/30"
                    }`}
                  >
                    {doubt.type === "text" ? (
                      <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <PhotoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80 truncate">
                      {doubt.type === "photo" ? "Photo Doubt" : doubt.question}
                    </p>
                    <p className="text-xs text-foreground/45 mt-0.5">
                      {doubt.createdAt
                        ? formatDate(doubt.createdAt)
                        : "Just now"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      doubt.type === "text"
                        ? "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                        : "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {doubt.type === "text" ? "Text" : "Photo"}
                  </span>
                </div>
              ))}
              <div className="text-center pt-2">
                <Link
                  href="/dashboard/history"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View all activity
                </Link>
              </div>
            </div>
          )}
        </div>
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
              <form onSubmit={() => handleAddPlan(user?.uid, newPlanTitle, newPlanSubject, newPlanDuration, today, setNewPlanTitle, setNewPlanSubject, setNewPlanDuration, setShowAddPlan, setAddingPlan, setPlanError, preferences.soundEnabled)} className="space-y-3">
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

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  ClockIcon,
  SparklesIcon,
  BookOpenIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { getFirestoreDb } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { Doubt } from "@/types";

function RobotIcon() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="robotBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b5ff" />
          <stop offset="100%" stopColor="#6366f1" />
        </radialGradient>
      </defs>
      {/* Shadow */}
      <ellipse cx="60" cy="108" rx="28" ry="4" fill="currentColor" className="text-foreground/10" />
      {/* Antenna */}
      <line x1="60" y1="14" x2="60" y2="26" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="10" r="4" fill="#a78bfa" />
      {/* Head */}
      <rect x="28" y="26" width="64" height="52" rx="14" fill="url(#robotBodyGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      {/* Eyes */}
      <circle cx="46" cy="46" r="10" fill="url(#eyeGlow)" />
      <circle cx="74" cy="46" r="10" fill="url(#eyeGlow)" />
      <circle cx="46" cy="46" r="4" fill="#ffffff" opacity="0.8" />
      <circle cx="74" cy="46" r="4" fill="#ffffff" opacity="0.8" />
      {/* Smile */}
      <path d="M44 60c4 4 8 6 16 6s12-2 16-6" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Body */}
      <rect x="38" y="82" width="44" height="20" rx="8" fill="url(#robotBodyGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      {/* Arms */}
      <rect x="18" y="84" width="16" height="8" rx="4" fill="#a78bfa" />
      <rect x="86" y="84" width="16" height="8" rx="4" fill="#a78bfa" />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, preferences } = useAuth();
  const [weeklyDoubts, setWeeklyDoubts] = useState(0);
  const [totalDoubts, setTotalDoubts] = useState(0);
  const [recentDoubts, setRecentDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

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

        allSnap.forEach((doc) => {
          const data = doc.data();
          total++;
          const createdAt = data.createdAt?.toDate?.()?.getTime?.() || data.createdAt || 0;
          if (createdAt >= weekAgo) {
            weekly++;
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
      } catch {
        // ignore stats errors
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user?.uid]);

  const displayName = user?.name || "there";
  const firstName = displayName.split(" ")[0] || displayName;

  const stats = [
    {
      label: "Doubts Solved",
      value: loading ? "..." : String(totalDoubts),
      icon: ChatBubbleLeftEllipsisIcon,
      color: "from-purple-500 to-indigo-500",
      placeholder: totalDoubts === 0 && !loading ? "Start today" : undefined,
    },
    {
      label: "Study Streak",
      value: "Start today",
      icon: ClockIcon,
      color: "from-amber-500 to-orange-500",
      placeholder: "Start today",
    },
    {
      label: "Study Time",
      value: "Coming from your activity",
      icon: LightBulbIcon,
      color: "from-emerald-500 to-teal-500",
      placeholder: "Coming from your activity",
    },
    {
      label: "Questions Asked",
      value: loading ? "..." : String(weeklyDoubts),
      icon: QuestionMarkCircleIcon,
      color: "from-blue-500 to-cyan-500",
      placeholder: weeklyDoubts === 0 && !loading ? "Start today" : undefined,
    },
  ];

  const studyTools = [
    {
      name: "Chat Doubt",
      href: "/dashboard/chat",
      icon: ChatBubbleLeftEllipsisIcon,
      desc: "Ask AI anything",
      color: "from-purple-500 to-indigo-500",
      available: true,
    },
    {
      name: "Photo Doubt",
      href: "/dashboard/photo-doubt",
      icon: PhotoIcon,
      desc: "Solve from an image",
      color: "from-blue-500 to-cyan-500",
      available: true,
    },
    {
      name: "Quick Quiz",
      href: "#",
      icon: BookOpenIcon,
      desc: "Test your knowledge",
      color: "from-amber-500 to-orange-500",
      available: false,
    },
    {
      name: "Flashcards",
      href: "#",
      icon: SparklesIcon,
      desc: "Revise important concepts",
      color: "from-pink-500 to-rose-500",
      available: false,
    },
    {
      name: "Study Timer",
      href: "#",
      icon: ClockIcon,
      desc: "Focus with Pomodoro",
      color: "from-emerald-500 to-teal-500",
      available: false,
    },
    {
      name: "Study Planner",
      href: "#",
      icon: CalendarIcon,
      desc: "Plan today's learning",
      color: "from-violet-500 to-purple-600",
      available: false,
    },
    {
      name: "Progress",
      href: "/dashboard/history",
      icon: ChartBarIcon,
      desc: "Track your improvement",
      color: "from-sky-400 to-indigo-500",
      available: true,
    },
    {
      name: "Notes",
      href: "#",
      icon: DocumentTextIcon,
      desc: "Keep important notes",
      color: "from-rose-400 to-pink-500",
      available: false,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

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
        <div className="space-y-3">
          <div className="h-4 bg-foreground/5 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-foreground/5 rounded w-1/2 animate-pulse" />
        </div>
      );
    }

    if (totalDoubts === 0) {
      return (
        <p className="text-foreground/70 leading-relaxed">
          Your study journey starts here. Ask your first doubt or upload a photo to
          begin learning with AI.
        </p>
      );
    }

    if (weeklyDoubts > 0) {
      return (
        <p className="text-foreground/70 leading-relaxed">
          You&apos;ve solved{" "}
          <span className="font-semibold text-primary">{weeklyDoubts}</span> doubts
          this week and a total of{" "}
          <span className="font-semibold text-primary">{totalDoubts}</span> doubts
          overall. Keep practicing to strengthen your concepts.
        </p>
      );
    }

    return (
      <p className="text-foreground/70 leading-relaxed">
        You&apos;ve solved{" "}
        <span className="font-semibold text-primary">{totalDoubts}</span> doubts so
        far. Try solving a new doubt this week to build momentum!
      </p>
    );
  };

  return (
    <motion.div
      variants={animationsEnabled ? containerVariants : undefined}
      initial={animationsEnabled ? "hidden" : undefined}
      animate={animationsEnabled ? "visible" : undefined}
      className="space-y-6"
    >
      {/* Welcome / AI Study Assistant */}
      <motion.div variants={itemVariants}>
        <div className="glass card-subtle rounded-2xl p-5 sm:p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <motion.h1
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent"
                initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
                animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
                transition={animationsEnabled ? { duration: 0.6 } : undefined}
              >
                Hi, {firstName}
              </motion.h1>
              <motion.p
                className="text-sm sm:text-base text-foreground/60 mt-1"
                initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
                animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
                transition={animationsEnabled ? { duration: 0.6, delay: 0.1 } : undefined}
              >
                Ready to learn something new today?
              </motion.p>
              <motion.div
                className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4"
                initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
                animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
                transition={animationsEnabled ? { duration: 0.6, delay: 0.2 } : undefined}
              >
                <Link href="/dashboard/chat">
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.03 } : undefined}
                    whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                    className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium shadow-md flex items-center gap-2"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    Ask AI
                  </motion.button>
                </Link>
                <Link href="/dashboard/chat?new=1">
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.03 } : undefined}
                    whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-foreground/5 transition-all flex items-center gap-2"
                  >
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                    New Doubt
                  </motion.button>
                </Link>
              </motion.div>
            </div>
            <motion.div
              className={`flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 ${animationsEnabled ? "robot-float" : ""}`}
              aria-hidden="true"
            >
              <div className="w-full h-full text-primary/80 dark:text-primary/90 drop-shadow-lg">
                <RobotIcon />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Today's Progress */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-foreground/80 mb-3">
          Today&apos;s Progress
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="glass card-subtle rounded-2xl p-4 sm:p-5"
              whileHover={animationsEnabled ? { y: -3, scale: 1.01 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-md flex-shrink-0`}
                >
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-foreground/60 truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Study Tools */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-foreground/80 mb-3">Study Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {studyTools.map((tool) => {
            const inner = (
              <motion.div
                className={`w-full glass card-subtle rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3 sm:gap-4 text-center ${
                  tool.available ? "cursor-pointer" : "opacity-75"
                }`}
                whileHover={
                  animationsEnabled && tool.available
                    ? { y: -4, scale: 1.01 }
                    : undefined
                }
                whileTap={
                  animationsEnabled && tool.available
                    ? { scale: 0.98 }
                    : undefined
                }
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div
                  className={`p-3 rounded-2xl bg-gradient-to-br ${tool.color} shadow-lg`}
                >
                  <tool.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-foreground text-sm sm:text-base block">
                    {tool.name}
                  </span>
                  <p className="text-xs text-foreground/50 mt-1">{tool.desc}</p>
                  {!tool.available && (
                    <span className="inline-block mt-2 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/40 border border-border">
                      Coming soon
                    </span>
                  )}
                </div>
              </motion.div>
            );

            if (tool.available) {
              return (
                <Link key={tool.name} href={tool.href} className="block">
                  {inner}
                </Link>
              );
            }

            return <div key={tool.name}>{inner}</div>;
          })}
        </div>
      </motion.div>

      {/* AI Study Insight */}
      <motion.div variants={itemVariants}>
        <div className="glass card-subtle rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <motion.div
                animate={animationsEnabled ? { rotate: 360 } : undefined}
                transition={
                  animationsEnabled
                    ? { duration: 8, repeat: Infinity, ease: "linear" }
                    : undefined
                }
                className="text-primary"
              >
                <SparklesIcon className="w-5 h-5" />
              </motion.div>
            </div>
            <h3 className="font-medium text-foreground/80">Your Study Insight</h3>
          </div>
          {renderInsight()}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold text-foreground/80 mb-3">
          Recent Activity
        </h2>
        <div className="glass card-subtle rounded-2xl p-5 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-foreground/5 rounded w-3/4 animate-pulse"
                />
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
                  className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium shadow-md"
                >
                  Ask your first doubt
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDoubts.map((doubt) => (
                <div
                  key={doubt.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-foreground/3 hover:bg-foreground/5 transition-colors"
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
                    <p className="text-xs text-foreground/50 mt-0.5">
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
    </motion.div>
  );
}

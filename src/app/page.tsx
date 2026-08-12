"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  AcademicCapIcon,
  SparklesIcon,
  CheckIcon,
  BookOpenIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function Home() {
  const { firebaseUser, loading, preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-foreground/60">Loading…</span>
      </div>
    );
  }

  if (firebaseUser) {
    return null;
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const features = [
    {
      icon: ChatBubbleLeftEllipsisIcon,
      title: "Ask Anything",
      desc: "Get instant answers to your doubts with step-by-step explanations.",
      color: "from-purple-500 to-indigo-500",
    },
    {
      icon: PhotoIcon,
      title: "Photo Doubts",
      desc: "Upload photos of your study material and get instant solutions.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: BookOpenIcon,
      title: "All Boards Covered",
      desc: "CBSE, ICSE, and State Board curriculum-aligned answers.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: LightBulbIcon,
      title: "Step-by-Step",
      desc: "Explanations designed to make concepts click, not just give answers.",
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground animate={animationsEnabled} />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          initial={animationsEnabled ? { opacity: 0, x: -20 } : false}
          animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-2xl font-bold text-primary">Padhai Buddy</h1>
        </motion.div>

        <motion.div
          className="flex items-center gap-3"
          initial={animationsEnabled ? { opacity: 0, x: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <Link href="/login">
            <motion.button
              className="px-5 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors rounded-xl"
              whileHover={animationsEnabled ? { scale: 1.03 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            >
              Login
            </motion.button>
          </Link>
          <Link href="/signup">
            <motion.button
              className="px-6 py-2.5 btn-primary rounded-xl font-medium text-sm"
              whileHover={animationsEnabled ? { scale: 1.03 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            >
              Get Started
            </motion.button>
          </Link>
        </motion.div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-24">
        <motion.div
          variants={animationsEnabled ? staggerContainer : undefined}
          initial={animationsEnabled ? "hidden" : false}
          animate={animationsEnabled ? "visible" : false}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
              <SparklesIcon className="w-4 h-4" />
              <span>AI-powered, curriculum-aware for Indian students</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-foreground">Your AI study buddy for </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
                every doubt, every subject, every board
              </span>
            </h2>

            <p className="text-lg text-foreground/70 max-w-md leading-relaxed">
              Stuck on a math problem? Need help with a science concept? Padhai Buddy explains everything step by step, tailored to your class and board — CBSE, ICSE, or State Board.
            </p>

            <motion.div
              variants={animationsEnabled ? staggerItem : undefined}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <Link href="/signup">
                <motion.button
                  className="px-8 py-3.5 btn-primary rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                >
                  <AcademicCapIcon className="w-5 h-5" />
                  Get Started
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  className="px-8 py-3.5 border border-border rounded-xl font-semibold text-lg hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2"
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                >
                  Already have an account? Login
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="relative"
          >
            <motion.div
              animate={animationsEnabled ? { y: [0, -14, 0] } : undefined}
              transition={animationsEnabled ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : undefined}
              className="glass card-subtle rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto"
            >
              <div className="p-4 border-b border-border/50 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                </div>
                <span className="text-xs text-foreground/50 ml-auto">AI Tutor</span>
              </div>
              <div className="p-6 space-y-4">
                <motion.div
                  initial={animationsEnabled ? { opacity: 0, x: -10 } : false}
                  animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
                  transition={animationsEnabled ? { delay: 0.7, duration: 0.5 } : undefined}
                  className="bg-background rounded-xl p-3 text-sm"
                >
                  <p className="font-medium mb-1 text-foreground/70">You:</p>
                  <p className="text-foreground">
                    What is the Pythagorean theorem? Class 10 CBSE
                  </p>
                </motion.div>
                <motion.div
                  initial={animationsEnabled ? { opacity: 0, x: 10 } : false}
                  animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
                  transition={animationsEnabled ? { delay: 0.9, duration: 0.5 } : undefined}
                  className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-primary/20 rounded-xl p-4 text-sm"
                >
                  <p className="font-medium text-primary mb-2">Padhai Buddy:</p>
                  <p className="text-foreground/90 leading-relaxed">
                    The Pythagorean theorem states that in a right-angled triangle, the square of the hypotenuse (the longest side) equals the sum of squares of the other two sides.
                  </p>
                  <p className="text-foreground/90 mt-2 leading-relaxed">
                    Formula: a² + b² = c², where c is the hypotenuse.
                  </p>
                  <p className="text-foreground/70 mt-2 text-xs">
                    — Explained for Class 10 CBSE Mathematics
                  </p>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              transition={animationsEnabled ? { delay: 1.1, duration: 0.5 } : undefined}
              className="absolute -bottom-6 -right-6 glass card-subtle border border-border rounded-xl p-4 shadow-lg"
            >
              <div className="flex gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <PhotoIcon className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-foreground/50 mt-1">Text & Photo Doubts</p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={animationsEnabled ? staggerContainer : undefined}
          initial={animationsEnabled ? "hidden" : false}
          animate={animationsEnabled ? "visible" : false}
          className="mt-20 sm:mt-28"
        >
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="text-center mb-10"
          >
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Everything you need to study smarter
            </h3>
            <p className="text-foreground/60 text-sm max-w-md mx-auto">
              One AI study buddy for all your subjects, classes, and boards.
            </p>
          </motion.div>

          <motion.div
            variants={animationsEnabled ? staggerContainer : undefined}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={animationsEnabled ? staggerItem : undefined}
                className="glass card-subtle rounded-2xl p-6 text-center"
                whileHover={animationsEnabled ? { y: -6, scale: 1.02 } : undefined}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="flex justify-center mb-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-md`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-foreground/60 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="mt-12 text-center"
          >
            <div className="flex items-center justify-center gap-6 text-sm text-foreground/50">
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-500" />
                No signup fees
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-500" />
                CBSE, ICSE, State Board
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Instant answers
              </span>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <footer className="relative z-10 text-center py-8 text-sm text-foreground/50 border-t border-border/30">
        <p>© {new Date().getFullYear()} Padhai Buddy. Made with ❤️ for Indian students.</p>
      </footer>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  AcademicCapIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const LazyBackground = dynamic(() => import("@/components/HandGestureBackground"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-indigo-950/30" />,
});

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-indigo-950/30" />
      <LazyBackground />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-primary">Padhai Buddy</h1>
        </motion.div>

        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/login">
            <motion.button
              className="px-5 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Login
            </motion.button>
          </Link>
          <Link href="/signup">
            <motion.button
              className="px-6 py-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
            </motion.button>
          </Link>
        </motion.div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
              <SparklesIcon className="w-4 h-4" />
              AI-powered, curriculum-aware for Indian students
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold leading-tight">
              <span className="text-foreground">Your AI study buddy for </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
                every doubt, every subject, every board
              </span>
            </h2>

            <p className="text-lg text-foreground/70 max-w-md leading-relaxed">
              Stuck on a math problem? Need help with a science concept? Padhai Buddy explains everything step by step, tailored to your class and board — CBSE, ICSE, or State Board.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/signup">
                <motion.button
                  className="px-8 py-3 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AcademicCapIcon className="w-5 h-5" />
                  Get Started
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  className="px-8 py-3 border border-border rounded-xl font-semibold text-lg hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Already have an account? Login
                </motion.button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="relative"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-xs text-foreground/50 ml-auto">AI Tutor</span>
              </div>
              <div className="p-6 space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-background rounded-xl p-3 text-sm"
                >
                  <p className="font-medium mb-1 text-foreground/70">You:</p>
                  <p className="text-foreground">
                    What is the Pythagorean theorem? Class 10 CBSE
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-primary/20 rounded-xl p-4 text-sm"
                >
                  <p className="font-medium text-primary mb-2">Padhai Buddy:</p>
                  <p className="text-foreground/90 leading-relaxed">
                    The Pythagorean theorem states that in a right-angled triangle, the square of the hypotenuse (the longest side) equals the sum of squares of the other two sides.
                  </p>
                  <p className="text-foreground/90 mt-2 leading-relaxed">
                    Formula: a² + b² = c², where {"'"}c{"'"} is the hypotenuse.
                  </p>
                  <p className="text-foreground/70 mt-2 text-xs">
                    — Explained for Class 10 CBSE Mathematics
                  </p>
                </motion.div>
              </div>
            </div>

            <motion.div
              className="absolute -bottom-4 -right-4 bg-card border border-border rounded-xl p-4 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
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
        </div>
      </main>

      <footer className="relative z-10 text-center py-8 text-sm text-foreground/50 border-t border-border/50">
        <p>© {new Date().getFullYear()} Padhai Buddy. Made with ❤️ for Indian students.</p>
      </footer>
    </div>
  );
}

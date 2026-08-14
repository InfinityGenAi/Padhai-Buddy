"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BookOpenIcon,
  SparklesIcon,
  ArrowPathIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import type { QuizAttempt } from "@/types";

type QuizState = "setup" | "active" | "result";

export default function QuizPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [state, setState] = useState<QuizState>("setup");
  const [subject, setSubject] = useState("Maths");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = attempt?.questions[currentIndex];
  const totalAnswered = attempt?.questions.filter((q) => q.selectedIndex !== undefined).length || 0;
  const correctCount = attempt?.questions.filter((q) => q.selectedIndex === q.correctIndex).length || 0;

  const generateQuiz = async () => {
    if (!user?.class || !user.board) {
      setError("Please complete your profile with class and board first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          class: user.class,
          board: user.board,
          difficulty,
          numberOfQuestions: numQuestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");

      setAttempt(data.attempt);
      setState("active");
      setCurrentIndex(0);
      setSelectedIndex(null);
      setShowExplanation(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (index: number) => {
    if (selectedIndex !== null || showExplanation) return;
    setSelectedIndex(index);
    setShowExplanation(true);

    if (attempt) {
      const updated = { ...attempt };
      updated.questions = [...updated.questions];
      updated.questions[currentIndex] = {
        ...updated.questions[currentIndex],
        selectedIndex: index,
      };
      if (index === updated.questions[currentIndex].correctIndex) {
        updated.correctAnswers = (updated.correctAnswers || 0) + 1;
        updated.score = Math.round((updated.correctAnswers / updated.totalQuestions) * 100);
      }
      setAttempt(updated);
    }
  };

  const handleNext = () => {
    if (currentIndex < (attempt?.questions.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedIndex(null);
      setShowExplanation(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedIndex(null);
      setShowExplanation(false);
    }
  };

  const handleSubmit = () => {
    setState("result");
  };

  const handleRetry = () => {
    setState("setup");
    setAttempt(null);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setShowExplanation(false);
  };

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      className="space-y-5 w-full"
    >
      <div className="flex items-center gap-2">
        <BookOpenIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Quick Quiz</h1>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {state === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="subtle-card rounded-xl p-6 space-y-4"
          >
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Maths, Physics"
              />
            </div>
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">Difficulty</label>
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                      difficulty === d
                        ? "bg-primary text-white"
                        : "bg-foreground/5 text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-foreground/60 mb-1 block">Number of Questions</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumQuestions(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      numQuestions === n
                        ? "bg-primary text-white"
                        : "bg-foreground/5 text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateQuiz}
              disabled={loading || !subject.trim()}
              className="w-full py-3 btn-primary rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <SparklesIcon className="w-5 h-5 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Start Quiz
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {state === "active" && attempt && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/50 font-medium">
                Question {currentIndex + 1} of {attempt.questions.length}
              </span>
              <span className="text-xs text-foreground/50 font-medium">
                {correctCount}/{totalAnswered} correct
              </span>
            </div>
            <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / attempt.questions.length) * 100}%` }}
              />
            </div>

            <div className="subtle-card rounded-xl p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">
                {currentQuestion?.question}
              </h3>
              <div className="space-y-2">
                {currentQuestion?.options.map((option, idx) => {
                  let colorClass = "bg-foreground/5 hover:bg-foreground/8";
                  if (selectedIndex !== null) {
                    if (idx === currentQuestion.correctIndex) {
                      colorClass = "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800";
                    } else if (idx === selectedIndex) {
                      colorClass = "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800";
                    }
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={selectedIndex !== null}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${colorClass} disabled:cursor-default`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10"
                >
                  <p className="text-xs text-foreground/60 font-medium mb-1">Explanation</p>
                  <p className="text-sm text-foreground/80">{currentQuestion?.explanation}</p>
                </motion.div>
              )}

              <div className="flex justify-between mt-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-foreground/5 hover:bg-foreground/8 disabled:opacity-50"
                >
                  Previous
                </button>
                {currentIndex === attempt.questions.length - 1 ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    className="px-4 py-2 btn-primary rounded-xl text-sm font-medium"
                  >
                    Submit Quiz
                  </motion.button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={selectedIndex === null}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-foreground/5 hover:bg-foreground/8 disabled:opacity-50"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {state === "result" && attempt && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="subtle-card rounded-xl p-6 space-y-4 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mx-auto">
              {attempt.score}%
            </div>
            <h2 className="text-xl font-bold">Quiz Complete!</h2>
            <p className="text-foreground/60 text-sm">
              You got <span className="font-semibold text-primary">{attempt.correctAnswers}</span> out of{" "}
              <span className="font-semibold">{attempt.totalQuestions}</span> questions correct.
            </p>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRetry}
                className="px-6 py-2.5 btn-primary rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Try Again
              </motion.button>
              <Link href="/dashboard">
                <button className="px-6 py-2.5 rounded-xl text-sm font-medium bg-foreground/5 hover:bg-foreground/8">
                  Dashboard
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

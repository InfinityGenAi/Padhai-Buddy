"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import { UserIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import type { UserBoard, UserClass } from "@/types";
import AnimatedBackground from "@/components/AnimatedBackground";

const CLASSES: UserClass[] = [5, 6, 7, 8, 9, 10, 11, 12];
const BOARDS: UserBoard[] = ["CBSE", "ICSE", "State Board"];

export default function OnboardingPage() {
  const { user, firebaseUser, completeOnboarding, loading: authLoading, preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<UserClass>(9);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard>("CBSE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derivedName = user?.name || firebaseUser?.displayName || "";

  useEffect(() => {
    if (!firebaseUser && !authLoading) {
      router.replace("/login");
    }
    if (user) {
      if (derivedName && !name) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(derivedName);
      }
      if (user.class && user.board && user.class >= 5) {
        router.replace("/dashboard");
      }
    }
  }, [firebaseUser, user, authLoading, router, completeOnboarding, derivedName, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await completeOnboarding(selectedClass, selectedBoard);
      router.replace("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !firebaseUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground animate={animationsEnabled} />
      <motion.div
        initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
        animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
        transition={animationsEnabled ? { duration: 0.6, ease: "easeOut" } : undefined}
        className="relative z-10 w-full max-w-md mx-auto p-6">
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={animationsEnabled ? { duration: 0.6, ease: "easeOut", delay: 0.1 } : undefined}
          className="glass-strong card-subtle rounded-2xl p-8 shadow-xl"
        >
          <div className="text-center mb-6">
            <AcademicCapIcon className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="text-3xl font-bold text-primary mb-1">
              Welcome to Padhai Buddy!
            </h1>
            <p className="text-sm text-foreground/60">
              Let&apos;s set up your profile to give you the best learning experience
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-3 mb-4 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(Number(e.target.value) as UserClass)}
                className="w-full py-2.5 px-4 input-field"
                required
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Board
              </label>
              <select
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value as UserBoard)}
                className="w-full py-2.5 px-4 input-field"
                required
              >
                {BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-2.5 rounded-xl font-medium"
            >
              {isSubmitting ? "Saving..." : "Finish & Go to Dashboard"}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}

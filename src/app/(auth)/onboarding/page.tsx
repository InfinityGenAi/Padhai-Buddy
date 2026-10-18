"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import { UserIcon } from "@heroicons/react/24/outline";
import type { UserBoard, UserClass } from "@/types";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";

const CLASSES: UserClass[] = [5, 6, 7, 8, 9, 10, 11, 12];
const BOARDS: UserBoard[] = ["CBSE", "ICSE", "State Board"];

export default function OnboardingPage() {
  const { user, firebaseUser, completeOnboarding, loading: authLoading, preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedClass, setSelectedClass] = useState<UserClass | undefined>(undefined);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | undefined>(undefined);
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
  }, [firebaseUser, user, authLoading, router, derivedName, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!selectedClass || !selectedBoard) {
      setError("Please select your class and board");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await completeOnboarding(selectedClass, selectedBoard, username.trim());
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
        className="relative z-10 w-full max-w-md mx-auto p-6"
      >
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={animationsEnabled ? { duration: 0.6, ease: "easeOut" } : undefined}
          className="bg-card border border-border rounded-xl p-6"
        >
          <div className="text-center mb-6">
            <BrandLogo size={48} className="mx-auto mb-2" />
            <h1 className="text-3xl font-bold text-primary mb-1">
              Welcome to Padhai Buddy!
            </h1>
            <p className="text-sm text-foreground/60">
              Let us set up your profile to give you the best learning experience
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/30 border border-red-800/50 text-red-400 rounded-xl p-3 mb-4 text-sm"
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
                  className="w-full bg-input-bg border border-input-border rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Class
              </label>
              <select
                value={selectedClass ?? ""}
                onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) as UserClass : undefined)}
                className="w-full bg-input-bg border border-input-border rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none pr-10"
                required
              >
                <option value="">Select class</option>
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
                value={selectedBoard ?? ""}
                onChange={(e) => setSelectedBoard(e.target.value ? e.target.value as UserBoard : undefined)}
                className="w-full bg-input-bg border border-input-border rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none pr-10"
                required
              >
                <option value="">Select board</option>
                {BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Username
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" viewBox="0 0 24 24">
                  <path d="M12 2l3 9-5 5 5 5-1-8-8 1v4zm0 2a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm-2-5c0-1.1.9-2 2-2h3v2H7v2h3c1.1 0 2 .9 2 2v3h2V7c0-1.1-.9-2-2-2H10c-.76 0-1.5.34-2 .95v3H7v-2zm7.5 7.5c-.95-1.5-2.3-2.5-3.5L9 23l1-3zm-4.5 1.5L13 15l2.5 2.5 2.5-2.5L15 13z"/>
                </svg>
                <input
                  type="text"
                  value={username ?? ""}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (optional)"
                  className="pl-32 w-full bg-input-bg border border-input-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none"
                />
              </div>
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
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  EnvelopeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";

const RESEND_COOLDOWN_SECONDS = 60;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { sendPasswordReset, preferences } = useAuth();

  const isResendCooldownActive = resendCooldown > 0;

  useEffect(() => {
    if (!isResendCooldownActive) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isResendCooldownActive]);

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email.trim());
      setIsSent(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        if (message.includes("user-not-found") || message.includes("no user record")) {
          setError("If an account exists for this email, we sent recovery instructions.");
        } else {
          setError(err.message || "Failed to send recovery email. Please try again.");
        }
      } else {
        setError("Failed to send recovery email. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        if (message.includes("user-not-found") || message.includes("no user record")) {
          setError("If an account exists for this email, we sent recovery instructions.");
        } else {
          setError(err.message || "Failed to resend recovery email. Please try again.");
        }
      } else {
        setError("Failed to resend recovery email. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground animate={animationsEnabled} />
      <motion.div
        variants={animationsEnabled ? staggerContainer : undefined}
        initial={animationsEnabled ? "hidden" : false}
        animate={animationsEnabled ? "visible" : false}
        className="relative z-10 w-full max-w-md mx-auto p-6"
      >
        <motion.div
          variants={animationsEnabled ? staggerItem : undefined}
          className="auth-card p-8"
        >
          <div className="text-center mb-6">
            <motion.div
              variants={animationsEnabled ? staggerItem : undefined}
              className="flex justify-center mb-4"
            >
              <BrandLogo size={56} />
            </motion.div>
            <motion.h1
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-3xl font-bold text-primary mb-1"
            >
              {isSent ? "Check Your Email" : "Forgot Password?"}
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60"
            >
              {isSent
                ? "We sent password recovery instructions to your email."
                : "Enter your email and we'll send you a reset link."}
            </motion.p>
          </div>

          {error && (
            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: -5 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-3 mb-4 text-sm"
            >
              {error}
            </motion.div>
          )}

          {isSent ? (
            <motion.div
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-center space-y-4"
            >
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircleIcon className="w-12 h-12 text-green-500" />
                <p className="text-sm text-foreground/70">
                  If an account exists for <span className="font-medium">{email}</span>, we sent recovery instructions.
                </p>
                <p className="text-xs text-foreground/50">
                  Didn&apos;t receive it? Check your spam folder or try again.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="w-full btn-primary py-2.5 rounded-xl font-medium disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Sending..."
                    : resendCooldown > 0
                      ? `Resend Email (${resendCooldown}s)`
                      : "Resend Email"}
                </button>
                <Link
                  href="/login"
                  className="block w-full text-center py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <motion.div variants={animationsEnabled ? staggerItem : undefined}>
                <label className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <div className="auth-input-wrapper">
                  <EnvelopeIcon className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                    required
                    autoFocus
                  />
                </div>
              </motion.div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-2.5 rounded-xl font-medium"
                whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                variants={animationsEnabled ? staggerItem : undefined}
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </motion.button>

              <motion.p
                variants={animationsEnabled ? staggerItem : undefined}
                className="text-center text-sm text-foreground/60"
              >
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Back to Login
                </Link>
              </motion.p>
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";

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

function readResetParams(): { oobCode: string | null; error: string | null } {
  if (typeof window === "undefined") {
    return { oobCode: null, error: null };
  }
  const params = new URLSearchParams(window.location.search);
  const code = params.get("oobCode");
  const mode = params.get("mode");
  if (code && mode === "resetPassword") {
    return { oobCode: code, error: null };
  }
  return {
    oobCode: null,
    error: "Invalid or expired reset link. Please request a new one.",
  };
}

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const { resetPassword, preferences } = useAuth();

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  useEffect(() => {
    const { oobCode: code, error: err } = readResetParams();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOobCode(code);
    if (err) setError(err);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(oobCode, newPassword);
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        const message = err.message.toLowerCase();
        if (message.includes("expired") || message.includes("invalid-action-code")) {
          setError("This reset link has expired or is invalid. Please request a new one.");
        } else if (message.includes("weak-password")) {
          setError("Please choose a stronger password.");
        } else {
          setError(err.message || "Failed to reset password. Please try again.");
        }
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
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
            className="bg-card border border-border rounded-2xl p-6 text-center"
          >
            <motion.div
              variants={animationsEnabled ? staggerItem : undefined}
              className="flex justify-center mb-4"
            >
              <div className="success-check">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <motion.h1
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-2xl font-bold text-primary mb-2"
            >
              Password Updated
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60 mb-6"
            >
              Your password has been changed successfully. You can now log in with your new password.
            </motion.p>
            <motion.div variants={animationsEnabled ? staggerItem : undefined}>
              <Link
                href="/login"
                className="block w-full bg-primary text-white py-3 rounded-full font-medium text-center shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all"
              >
                Back to Login
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

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
          className="bg-card border border-border rounded-xl p-6"
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
              Reset your password
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60"
            >
              Enter your new password below.
            </motion.p>
          </div>

          {error && (
            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: -5 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              className="bg-red-950/30 border border-red-800/50 text-red-400 rounded-xl p-3 mb-4 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <motion.div variants={animationsEnabled ? staggerItem : undefined}>
              <label className="block text-sm font-medium mb-1.5">
                New Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-12"
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div variants={animationsEnabled ? staggerItem : undefined}>
              <label className="block text-sm font-medium mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-12"
                    required
                    minLength={6}
                  />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={isSubmitting || !oobCode}
              className="w-full bg-primary text-white rounded-full py-3 font-medium disabled:opacity-50 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all"
              whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
              variants={animationsEnabled ? staggerItem : undefined}
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
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
        </motion.div>
      </motion.div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmailVerification, reload } from "firebase/auth";
import { motion, useReducedMotion } from "framer-motion";
import { playSignup, playEmailSent } from "@/lib/sounds";
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import type { UserBoard, UserClass } from "@/types";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";

const CLASSES: UserClass[] = [5, 6, 7, 8, 9, 10, 11, 12];
const BOARDS: UserBoard[] = ["CBSE", "ICSE", "State Board"];

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 11.75c0-.98-.09-1.95-.25-2.91H12v5.66h4.92c-.19.82-.46 1.56-.82 2.2l3.57 2.8c2.19-2.01 3.5-4.9 3.5-8.55z" />
    <path d="M12 23c2.97 0 5.47-.98 7.35-2.66l-3.57-2.8c-.98.65-2.23 1.04-3.54 1.18-.96.16-1.92.06-2.83-.27-.83-.3-1.58-.75-2.2-1.3l-3.06 2.38c1.72 2.58 4.64 4.36 7.92 4.36z" />
    <path d="M12 4.75c1.24 0 2.43.22 3.55.63l2.59-2.59C17.08 1.1 14.65 0 12 0 8.72 0 5.8 1.78 3.92 4.66l3.06 2.38C9.42 5.75 10.67 4.75 12 4.75z" />
    <path d="M7.53 11.75c0 .86.16 1.72.45 2.53l-.01.02-3.06-2.38c-.79-.61-1.52-1.38-2.14-2.25S.75 9.26.75 8.3c0-.98.16-1.95.45-2.91 2.88 2.03 6.33 3.16 9.95 3.16v.01z" />
  </svg>
);

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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedClass, setSelectedClass] = useState<UserClass | undefined>(undefined);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { signUp, signInWithGoogle, firebaseUser, user, loading, preferences, reloadProfile } = useAuth();
  const router = useRouter();

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  useEffect(() => {
    if (!firebaseUser) return;
    if (verified) {
      if (user?.class && user?.board) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    } else if (firebaseUser.emailVerified) {
      if (user?.class && user?.board) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [firebaseUser, verified, user, router]);

  useEffect(() => {
    if (!verificationSent || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationSent, resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.trim().length < 6) {
      setError("Please fill in all fields (password must be 6+ chars)");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signUp(name, email, password, selectedClass, selectedBoard);
      playSignup();
      setVerificationSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create account");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      playSignup();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !firebaseUser) return;
    try {
      await sendEmailVerification(firebaseUser);
      playEmailSent();
      setResendCooldown(60);
      setVerificationError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes("too-many-requests")) {
          setError("Too many requests. Please wait before resending.");
        } else {
          setError(err.message);
        }
      }
    }
  };

  const handleVerified = async () => {
    if (!firebaseUser) return;
    setVerificationError(null);
    try {
      await reload(firebaseUser);
      if (firebaseUser.emailVerified) {
        setVerified(true);
        await reloadProfile();
      } else {
        setVerificationError("Verification link is invalid or expired. Please check your email or resend.");
      }
    } catch {
      setVerificationError("Could not verify email. Please try again.");
    }
  };

  if (verificationSent && firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <AnimatedBackground animate={animationsEnabled} />
          <motion.div
            variants={animationsEnabled ? staggerContainer : undefined}
            initial={animationsEnabled ? "hidden" : false}
            animate={animationsEnabled ? "visible" : false}
            className="auth-card p-8 text-center"
          >
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="glass-strong card-subtle rounded-2xl p-8 shadow-xl text-center"
          >
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
              Check Your Email
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60 mb-6"
            >
              We sent a verification link to:<br />
              <span className="font-medium text-foreground">{email}</span>
            </motion.p>

            {verificationError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-3 mb-4 text-sm"
              >
                {verificationError}
              </motion.div>
            )}

            <motion.div variants={animationsEnabled ? staggerItem : undefined} className="space-y-3">
              <button
                onClick={handleVerified}
                className="w-full btn-primary py-2.5 rounded-xl font-medium"
              >
                I&apos;ve Verified — Continue
              </button>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="w-full py-2.5 rounded-xl font-medium text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Email"}
              </button>
              <button
                onClick={() => window.open("https://mail.google.com/", "_blank")}
                className="w-full py-2.5 rounded-xl font-medium text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                Open Gmail
              </button>
              <p className="text-xs text-foreground/40">
                Check your spam or promotions folder if you don&apos;t see it.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-foreground/60">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground animate={animationsEnabled} />
      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        <motion.div
          variants={animationsEnabled ? staggerContainer : undefined}
          initial={animationsEnabled ? "hidden" : false}
          animate={animationsEnabled ? "visible" : false}
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
              Create Account
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60"
            >
              Join Padhai Buddy and start solving doubts today
            </motion.p>
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

          <motion.button
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="w-full glass card-subtle border border-border rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors disabled:opacity-50"
            whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
            variants={animationsEnabled ? staggerItem : undefined}
          >
            <GoogleIcon />
            Sign up with Google
          </motion.button>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-3 text-xs text-foreground/50">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <>
              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5">
                  Full Name
                </label>
                <div className="auth-input-wrapper">
                  <UserIcon className="auth-input-icon" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="auth-input"
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
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
                  />
                </div>
              </motion.div>

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <div className="auth-input-wrapper">
                  <LockClosedIcon className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="auth-input"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5">
                  Confirm Password
                </label>
                <div className="auth-input-wrapper">
                  <LockClosedIcon className="auth-input-icon" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="auth-input"
                    required
                    minLength={6}
                  />
                </div>
              </motion.div>

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5">
                  Class
                </label>
                <select
                  value={selectedClass ?? ""}
                  onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) as UserClass : undefined)}
                  className="auth-select"
                >
                  <option value="">Select class</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </motion.div>

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5">
                  Board
                </label>
                <select
                  value={selectedBoard ?? ""}
                  onChange={(e) => setSelectedBoard(e.target.value ? e.target.value as UserBoard : undefined)}
                  className="auth-select"
                >
                  <option value="">Select board</option>
                  {BOARDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </motion.div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-2.5 rounded-xl font-medium"
                whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                variants={animationsEnabled ? staggerItem : undefined}
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </motion.button>
            </>
          </form>

          <motion.p
            className="text-center text-sm text-foreground/60 mt-6"
            variants={animationsEnabled ? staggerItem : undefined}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Login
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

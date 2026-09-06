"use client";

import { useState, useEffect, useRef } from "react";
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
  AcademicCapIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import type { UserBoard, UserClass } from "@/types";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import GoogleIcon from "@/components/GoogleIcon";
import PublicAuthGuard from "@/components/PublicAuthGuard";

const CLASSES: UserClass[] = [5, 6, 7, 8, 9, 10, 11, 12];

const BOARDS: UserBoard[] = ["CBSE", "ICSE", "State Board"];

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const emailInputRef = useRef<HTMLInputElement>(null);

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const scrollToEmailForm = () => {
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    emailInputRef.current?.focus();
  };

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
      const result = await signUp(name, email, password, selectedClass, selectedBoard);
      playSignup();
      setVerificationSent(true);
      if (!result.emailVerificationSent) {
        setVerificationError(
          "We couldn't send the verification email. Click \"Resend Email\" below to try again.",
        );
      }
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
      const msg = err instanceof Error ? err.message : "";
      const code = (err as { code?: string })?.code;
      if (code === "auth/too-many-requests" || msg.toLowerCase().includes("too-many-requests")) {
        setVerificationError("Too many requests. Please wait a minute before resending.");
      } else if (
        code === "auth/network-request-failed" ||
        msg.toLowerCase().includes("network")
      ) {
        setVerificationError("Network error. Please check your connection and try again.");
      } else {
        console.error("Resend verification email failed:", err);
        setVerificationError("We couldn't resend the verification email. Please try again in a moment.");
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
        setVerificationError(
          "You haven't verified your email yet. Click the link we sent to your inbox, then press this button again.",
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const code = (err as { code?: string })?.code;
      if (code === "auth/network-request-failed" || msg.toLowerCase().includes("network")) {
        setVerificationError("Network error. Please check your connection and try again.");
      } else {
        console.error("Failed to check email verification:", err);
        setVerificationError("Could not verify email. Please try again in a moment.");
      }
    }
  };

  if (verificationSent && firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        <AnimatedBackground animate={animationsEnabled} variant="auth" />
        <motion.div
          variants={animationsEnabled ? staggerContainer : undefined}
          initial={animationsEnabled ? "hidden" : false}
          animate={animationsEnabled ? "visible" : false}
          className="relative z-10 w-full max-w-md mx-auto"
        >
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="bg-card border border-border rounded-2xl p-8 shadow-xl text-center"
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
              We&apos;ve sent a verification link to <span className="font-medium text-foreground">{email}</span>
            </motion.p>

            {verificationError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-950/30 border border-red-800/50 text-red-400 rounded-xl p-3 mb-4 text-sm"
              >
                {verificationError}
              </motion.div>
            )}

              <motion.div variants={animationsEnabled ? staggerItem : undefined} className="space-y-3">
                <button
                  onClick={handleVerified}
                  className="w-full bg-primary text-white rounded-full py-3 font-medium focus-ring shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all"
                >
                  I&apos;ve Verified
                </button>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="w-full py-2.5 rounded-full font-medium text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend Email (${resendCooldown.toString().padStart(2, '0')}s)` : "Resend Email"}
                </button>
                <button
                  onClick={() => window.open("https://mail.google.com/", "_blank")}
                  className="w-full py-2.5 rounded-full font-medium text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
                >
                  Open Email
                </button>
                <p className="text-xs text-foreground/40">
                  Check your spam or promotions folder if you do not see it.
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
    <PublicAuthGuard>
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        <AnimatedBackground animate={animationsEnabled} variant="auth" />
      <motion.div
        variants={animationsEnabled ? staggerContainer : undefined}
        initial={animationsEnabled ? "hidden" : false}
        animate={animationsEnabled ? "visible" : false}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <motion.div
          variants={animationsEnabled ? staggerItem : undefined}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl"
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
              className="text-3xl font-bold text-foreground mb-1"
            >
              Create your account
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60"
            >
              Start your learning journey today
            </motion.p>
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

          <motion.button
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="w-full bg-white border border-border rounded-full py-3 font-medium flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors disabled:opacity-50 focus-ring shadow-sm"
            whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
            variants={animationsEnabled ? staggerItem : undefined}
          >
            <GoogleIcon />
            Continue with Google
          </motion.button>

          <motion.button
            onClick={scrollToEmailForm}
            disabled={isSubmitting}
            className="w-full bg-white border border-border rounded-full py-3 font-medium flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors disabled:opacity-50 focus-ring shadow-sm"
            whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
            variants={animationsEnabled ? staggerItem : undefined}
          >
            <EnvelopeIcon className="w-5 h-5 text-foreground/60" />
            Continue with Email
          </motion.button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-foreground/50">
              <span className="bg-card px-2">OR</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <>
              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5 text-foreground/70">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    required
                    autoComplete="name"
                  />
                </div>
              </motion.div>

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5 text-foreground/70">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    required
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
              >
                <label className="block text-sm font-medium mb-1.5 text-foreground/70">
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-12"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
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
                <label className="block text-sm font-medium mb-1.5 text-foreground/70">
                  Confirm Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-12"
                    required
                    minLength={6}
                    autoComplete="new-password"
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

              <motion.div
                variants={animationsEnabled ? staggerItem : undefined}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/70">
                    Class
                  </label>
                  <div className="relative">
                    <AcademicCapIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                    <select
                      value={selectedClass ?? ""}
                      onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) as UserClass : undefined)}
                      className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none pr-10"
                      required
                    >
                      <option value="">Select Class</option>
                      {CLASSES.map((c) => (
                        <option key={c} value={c}>
                          Class {c}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/70">
                    Board
                  </label>
                  <div className="relative">
                    <DocumentTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                    <select
                      value={selectedBoard ?? ""}
                      onChange={(e) => setSelectedBoard(e.target.value ? e.target.value as UserBoard : undefined)}
                      className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors appearance-none pr-10"
                      required
                    >
                      <option value="">Select Board</option>
                      {BOARDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white rounded-full py-3 font-medium focus-ring shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all"
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
      </motion.div>
    </div>
    </PublicAuthGuard>
  );
}
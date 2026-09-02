"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { sendEmailVerification } from "firebase/auth";
import { motion, useReducedMotion } from "framer-motion";
import { playLogin } from "@/lib/sounds";
import {
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import GoogleIcon from "@/components/GoogleIcon";

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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { signIn, signInWithGoogle, firebaseUser, user, loading, needsOnboarding, preferences } = useAuth();
  const router = useRouter();

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;
  const emailInputRef = useRef<HTMLInputElement>(null);

  const scrollToEmailForm = () => {
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    emailInputRef.current?.focus();
  };

  useEffect(() => {
    if (!firebaseUser) return;
    if (loading) {
      router.replace("/dashboard");
      return;
    }
    if (needsOnboarding) {
      router.replace("/onboarding");
    } else if (user?.class && user?.board) {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [firebaseUser, user, loading, needsOnboarding, router]);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || resendCooldown <= 0) return;
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
  }, [firebaseUser, resendCooldown]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-foreground/60">Loading…</span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      playLogin();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
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
      playLogin();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !firebaseUser) return;
    try {
      await sendEmailVerification(firebaseUser);
      setResendCooldown(60);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const showVerificationBanner = !!firebaseUser && !firebaseUser.emailVerified;

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
          className="bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          {/* Logo */}
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="flex justify-center mb-6"
          >
            <BrandLogo size={56} />
          </motion.div>

          <div className="text-center mb-6">
            <motion.h1
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-3xl font-bold text-foreground mb-1"
            >
              Welcome back!
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60"
            >
              Good to see you again
            </motion.p>
          </div>

          {showVerificationBanner && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-950/30 border border-amber-800/50 text-amber-300 rounded-xl p-3 mb-4 text-sm"
            >
              Your email is not verified. Some features may be limited.{" "}
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0}
                className="font-medium underline disabled:opacity-50"
              >
                Resend verification email
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: -5 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              className="bg-red-950/30 border border-red-800/50 text-red-400 rounded-xl p-3 mb-4 text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="w-full glass card-subtle border border-border rounded-xl py-3 font-medium flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors disabled:opacity-50 focus-ring"
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
            className="w-full glass card-subtle border border-border rounded-xl py-3 font-medium flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors disabled:opacity-50 focus-ring"
            whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
            variants={animationsEnabled ? staggerItem : undefined}
          >
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
            <motion.div variants={animationsEnabled ? staggerItem : undefined}>
              <label className="block text-sm font-medium mb-1.5 text-foreground/70">
                Email
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-input-bg border border-input-border rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                  autoComplete="email"
                />
              </div>
            </motion.div>

            <motion.div variants={animationsEnabled ? staggerItem : undefined} className="flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground/70">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </motion.div>
            <motion.div variants={animationsEnabled ? staggerItem : undefined}>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-input-bg border border-input-border rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-12"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
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

            <motion.div variants={animationsEnabled ? staggerItem : undefined} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <label htmlFor="remember" className="text-sm text-foreground/60 cursor-pointer">
                  Remember me
                </label>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 rounded-xl font-medium focus-ring"
              whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
              variants={animationsEnabled ? staggerItem : undefined}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </motion.button>

            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-center text-sm text-foreground/60 mt-6"
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-primary font-medium hover:underline"
              >
                Sign Up
              </Link>
            </motion.p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
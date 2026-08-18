"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) return;
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
              className="text-3xl font-bold text-primary mb-1"
            >
              Welcome Back
            </motion.h1>
            <motion.p
              variants={animationsEnabled ? staggerItem : undefined}
              className="text-sm text-foreground/60"
            >
              Login to continue your learning journey
            </motion.p>
          </div>

          {showVerificationBanner && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-3 mb-4 text-sm"
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
            Continue with Google
          </motion.button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                />
              </div>
            </motion.div>

            <motion.div variants={animationsEnabled ? staggerItem : undefined} className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="auth-link text-xs"
              >
                Forgot Password?
              </Link>
            </motion.div>
            <motion.div variants={animationsEnabled ? staggerItem : undefined}>
              <div className="auth-input-wrapper">
                <LockClosedIcon className="auth-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-2.5 rounded-xl font-medium"
              whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
              variants={animationsEnabled ? staggerItem : undefined}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </motion.button>
          </form>

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
        </motion.div>
      </motion.div>
    </div>
  );
}

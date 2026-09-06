"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
import PublicAuthGuard from "@/components/PublicAuthGuard";
import { AuthCard, Divider } from "@/components/ui/AuthCard";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { signIn, signInWithGoogle, firebaseUser, loading, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;
  const emailInputRef = useRef<HTMLInputElement>(null);

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
    <PublicAuthGuard>
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        <AnimatedBackground animate={animationsEnabled} variant="auth" />
        <AuthCard animate={animationsEnabled}>
        <div className="flex justify-center mb-6">
          <BrandLogo size={56} alt="Padhai Buddy logo" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-foreground/60">
            Good to see you again
          </p>
        </div>

        {showVerificationBanner && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 text-primary rounded-full p-3 mb-4 text-sm"
          >
            Your email is not verified. Some features may be limited.
            {" "}
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
            className="bg-red-950/30 border border-red-800/50 rounded-full p-3 mb-4 text-sm"
            role="alert"
          >
            {error}
          </motion.div>
        )}

        <motion.button
          type="button"
          onClick={handleGoogle}
          disabled={isSubmitting}
          className="w-full bg-white border border-border rounded-full py-3 font-medium flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors disabled:opacity-50 focus-ring shadow-sm mb-4"
          whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
          whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
          aria-label="Continue with Google"
        >
          <GoogleIcon />
          Continue with Google
        </motion.button>

        <Divider label="OR" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium mb-1.5 text-foreground/70">
              Email
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
              <input
                id="login-email"
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
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-medium text-foreground/70">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="relative">
            <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-white border border-border rounded-full px-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors pr-12"
              required
              minLength={6}
              autoComplete="current-password"
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

          <motion.button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white rounded-full py-3 font-medium focus-ring shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all disabled:opacity-50"
            whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </motion.button>

          <p className="text-center text-sm text-foreground/60 mt-4">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary font-medium hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
    </PublicAuthGuard>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { playLogin } from "@/lib/sounds";
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const LazyBackground = dynamic(() => import("@/components/HandGestureBackground"), {
  ssr: false,
});

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 11.75c0-.98-.09-1.95-.25-2.91H12v5.66h4.92c-.19.82-.46 1.56-.82 2.2l3.57 2.8c2.19-2.01 3.5-4.9 3.5-8.55z" />
    <path d="M12 23c2.97 0 5.47-.98 7.35-2.66l-3.57-2.8c-.98.65-2.23 1.04-3.54 1.18-.96.16-1.92.06-2.83-.27-.83-.3-1.58-.75-2.2-1.3l-3.06 2.38c1.72 2.58 4.64 4.36 7.92 4.36z" />
    <path d="M12 4.75c1.24 0 2.43.22 3.55.63l2.59-2.59C17.08 1.1 14.65 0 12 0 8.72 0 5.8 1.78 3.92 4.66l3.06 2.38C9.42 5.75 10.67 4.75 12 4.75z" />
    <path d="M7.53 11.75c0 .86.16 1.72.45 2.53l-.01.02-3.06-2.38c-.79-.61-1.52-1.38-2.14-2.25S.75 9.26.75 8.3c0-.98.16-1.95.45-2.91 2.88 2.03 6.33 3.16 9.95 3.16v.01z" />
  </svg>
);

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, signInWithGoogle, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace("/onboarding");
    }
  }, [firebaseUser, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.trim().length < 6) {
      setError("Please fill in all fields (password must be 6+ chars)");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signUp(name, email, password);
      playLogin();
      router.replace("/onboarding");
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
      playLogin();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <LazyBackground />
      </div>
      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-lg"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-1">
              Create Account
            </h1>
            <p className="text-sm text-foreground/60">
              Join Padhai Buddy and start solving doubts today
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <>
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
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="• • • • • •"
                    className="w-full pl-10 pr-12 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40 hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white py-2.5 rounded-xl font-medium hover:shadow-lg transition-shadow disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>
            </>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-3 text-xs text-foreground/50">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

            <button
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="w-full border border-border rounded-xl py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-foreground/5 transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            Sign up with Google
          </button>

          <p className="text-center text-sm text-foreground/60 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

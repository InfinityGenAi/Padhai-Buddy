"use client";

import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import AnimatedBackground from "@/components/AnimatedBackground";
import RequireAuth from "@/components/AuthWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import SettingsModal from "@/components/SettingsModal";
import { SettingsModalProvider, useSettingsModal } from "@/contexts/SettingsModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { registerSession, heartbeatSession } from "@/lib/sessions";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  MagnifyingGlassIcon,
  BellIcon,
} from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat";
  const { isOpen, close } = useSettingsModal();
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  useEffect(() => {
    if (!user?.uid) return;

    registerSession();

    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      heartbeatSession();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.uid]);

  return (
    <>
      <AnimatedBackground animate={preferences.animationsEnabled} />
      <div className="flex h-screen overflow-hidden relative z-10">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="hidden sm:flex items-center justify-between px-6 py-3 border-b border-border/40">
            <DashboardGreeting animationsEnabled={animationsEnabled} />
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/35" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="search-input w-48 lg:w-56"
                  aria-label="Search"
                />
              </div>
              {/* Notifications */}
              <motion.button
                whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.95 } : undefined}
                className="relative p-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all focus-ring"
                aria-label="Notifications"
              >
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-pink rounded-full" />
              </motion.button>
              {/* Profile avatar */}
              {user && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 cursor-pointer">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            <div
              className={
                isChatPage
                  ? "pt-2 h-full flex flex-col"
                  : "px-4 sm:px-6 pt-4 pb-6 h-full flex flex-col"
              }
            >
              {children}
            </div>
          </main>
        </div>
        <BottomNav />
      </div>
      <SettingsModal isOpen={isOpen} onClose={close} />
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ErrorBoundary>
        <SettingsModalProvider>
          <DashboardInner>{children}</DashboardInner>
        </SettingsModalProvider>
      </ErrorBoundary>
    </RequireAuth>
  );
}

function DashboardGreeting({ animationsEnabled }: { animationsEnabled: boolean }) {
  const { user } = useAuth();
  const displayName = user?.name || "there";
  const displayNameParts = displayName.split(" ");
  const firstName = displayNameParts[0] || displayName;

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: -6 } : undefined}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      transition={animationsEnabled ? { duration: 0.4, ease: "easeOut" } : undefined}
      className="flex items-center gap-3"
    >
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">
        Hi, {firstName}!
      </h1>
      {user && (
        <span className="pill-badge hidden sm:inline-flex">
          Class {user.class} — {user.board}
        </span>
      )}
    </motion.div>
  );
}

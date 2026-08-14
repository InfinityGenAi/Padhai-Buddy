"use client";

import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import AnimatedBackground from "@/components/AnimatedBackground";
import RequireAuth from "@/components/AuthWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import SettingsModal from "@/components/SettingsModal";
import ProfileModal from "@/components/ProfileModal";
import { SettingsModalProvider, useSettingsModal } from "@/contexts/SettingsModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { registerSession, heartbeatSession } from "@/lib/sessions";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  BellIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { playLogout, playSettings } from "@/lib/sounds";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat";
  const { isOpen, open, close } = useSettingsModal();
  const { user, preferences, logout } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notifications] = useState<{ id: string; text: string; time: string }[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleProfileSettings = useCallback(() => {
    setProfileOpen(false);
    playSettings();
    open();
  }, [open]);

  const handleProfileView = useCallback(() => {
    setProfileOpen(false);
    setProfileModalOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    playLogout();
    await logout();
  }, [logout]);

  return (
    <>
      <AnimatedBackground animate={preferences.animationsEnabled} />
      <div className="flex h-screen overflow-hidden relative z-10">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="hidden sm:flex items-center justify-between px-6 py-3 border-b border-border/40">
            <DashboardGreeting animationsEnabled={animationsEnabled} />
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.95 } : undefined}
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="relative p-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all focus-ring"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <BellIcon className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-pink rounded-full" />
                  )}
                </motion.button>
                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-3 border-b border-border/50">
                        <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                      </div>
                      <div className="p-4 text-center">
                        {notifications.length === 0 ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-2">
                              <BellIcon className="w-5 h-5 text-foreground/30" />
                            </div>
                            <p className="text-sm text-foreground/70 font-medium">No new notifications</p>
                            <p className="text-xs text-foreground/45 mt-1">You&apos;re all caught up.</p>
                          </>
                        ) : (
                          <div className="space-y-2">
                            {notifications.map((n) => (
                              <div key={n.id} className="text-left p-2 rounded-lg bg-foreground/5">
                                <p className="text-sm text-foreground/80">{n.text}</p>
                                <p className="text-[10px] text-foreground/40 mt-0.5">{n.time}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Profile avatar */}
              {user && (
                <div className="relative" ref={profileRef}>
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                    whileTap={animationsEnabled ? { scale: 0.95 } : undefined}
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 cursor-pointer focus-ring"
                    aria-label="Profile menu"
                    aria-expanded={profileOpen}
                  >
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </motion.button>
                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                        <button
                          onClick={handleProfileView}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
                        >
                          <UserIcon className="w-4 h-4" />
                          Profile
                        </button>
                        <button
                          onClick={handleProfileSettings}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                          Settings
                        </button>
                        <div className="border-t border-border/50" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
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

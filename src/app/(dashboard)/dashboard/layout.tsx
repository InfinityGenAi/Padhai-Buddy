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

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat";
  const { isOpen, close } = useSettingsModal();
  const { user, preferences } = useAuth();

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
          <header className="hidden sm:flex items-center justify-between px-6 py-2.5 border-b border-border/60">
            <DashboardGreeting />
          </header>
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            <div
              className={
                isChatPage
                  ? "pt-2 h-full flex flex-col"
                  : "px-4 sm:px-6 pt-2 pb-4 h-full flex flex-col"
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

function DashboardGreeting() {
  const { user } = useAuth();
  const displayName = user?.name || "there";
  const displayNameParts = displayName.split(" ");
  const firstName = displayNameParts[0] || displayName;

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">
          Hi, {firstName}
        </h1>
        {user && (
          <span className="pill-badge">
            Class {user.class} — {user.board}
          </span>
        )}
      </div>
    </>
  );
}

"use client";

import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import HandGestureBackground from "@/components/HandGestureBackground";
import RequireAuth from "@/components/AuthWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat";

  return (
    <RequireAuth>
      <ErrorBoundary>
        <HandGestureBackground subtle={true} key="dashboard-bg" />
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
      <h1 className="text-2xl font-bold">
        Hi, {firstName}
      </h1>
      {user && (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
            Class {user.class} — {user.board}
          </span>
        </div>
      )}
    </>
  );
}


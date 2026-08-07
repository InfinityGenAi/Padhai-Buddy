"use client";

import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import HandGestureBackground from "@/components/HandGestureBackground";
import RequireAuth from "@/components/AuthWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "development") {
    console.log("[DashboardLayout] render");
  }
  return (
    <RequireAuth>
      <ErrorBoundary>
        <HandGestureBackground subtle={true} key="dashboard-bg" />
        <div className="flex h-full overflow-hidden relative z-10">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="hidden sm:flex items-center justify-between px-6 py-4 bg-card border-b border-border">
              <DashboardGreeting />
            </header>
            <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
              <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-6">
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface PublicAuthGuardProps {
  children: React.ReactNode;
  /**
   * If true (default), an unauthenticated user landing directly on this URL
   * via the address bar will be redirected to the public landing page.
   * Internal navigation from the landing page (sessionStorage flag) or a
   * `?from=landing` query string still renders the page so the user flow
   * keeps working.
   *
   * Set to false for /forgot-password and /reset-password, which must
   * remain reachable to authenticated users (password reset while logged
   * in, Firebase email callbacks) and to direct unauthenticated links
   * (the password reset link comes from a Firebase email).
   *
   * Authenticated users are always allowed through so the page can decide
   * whether to show additional guidance.
   */
  blockDirectUrlEntry?: boolean;
}

export default function PublicAuthGuard({
  children,
  blockDirectUrlEntry = true,
}: PublicAuthGuardProps) {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();
  const [allowRender, setAllowRender] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (firebaseUser) {
      setAllowRender(true);
      router.replace("/dashboard");
      return;
    }

    if (!blockDirectUrlEntry) {
      setAllowRender(true);
      return;
    }

    const internalFlag = (() => {
      try {
        return sessionStorage.getItem("pb-internal-nav") === "1";
      } catch {
        return false;
      }
    })();

    const docReferrer =
      typeof document !== "undefined" ? document.referrer : "";
    const fromInternal =
      internalFlag ||
      (typeof window !== "undefined" &&
        window.location.search.includes("from=landing")) ||
      (docReferrer &&
        new URL(docReferrer, window.location.origin).pathname === "/");

    if (fromInternal) {
      setAllowRender(true);
      try {
        sessionStorage.removeItem("pb-internal-nav");
      } catch {
        // ignore
      }
      return;
    }

    router.replace("/");
  }, [firebaseUser, loading, router, blockDirectUrlEntry]);

  if (loading || (!allowRender && !firebaseUser)) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-foreground/60">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}

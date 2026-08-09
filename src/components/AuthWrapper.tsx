"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RequireAuth({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { firebaseUser, loading, authError, needsOnboarding } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.replace("/login");
      } else if (needsOnboarding) {
        router.replace("/onboarding");
      }
    }
  }, [firebaseUser, loading, needsOnboarding, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-foreground/60">Loading your dashboard…</span>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-lg font-semibold text-foreground">
            Something went wrong loading your profile
          </h1>
          <p className="mt-2 text-sm text-foreground/60 break-all">
            {authError}
          </p>
          <p className="mt-3 text-xs text-foreground/50">
            This usually means your Firestore profile could not be read (e.g.
            Firestore security rules are not deployed or deny access). Open
            the browser console for the full error, then try again.
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || needsOnboarding) {
    return null;
  }

  return <>{children}</>;
}

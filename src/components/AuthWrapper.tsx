"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RequireAuth({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { firebaseUser, loading, authError, needsOnboarding, reloadProfile } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[RequireAuth] auth resolved, no user session; redirecting to /login",
          );
        }
        router.replace("/login");
      } else if (needsOnboarding) {
        router.replace("/onboarding");
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChecked(true);
      }
    }
  }, [firebaseUser, loading, needsOnboarding, authError, router]);

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
        <button
          onClick={reloadProfile}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white hover:shadow-lg transition-shadow"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebaseIdToken } from "@/lib/auth-utils";
import { useAuth } from "@/contexts/AuthContext";

export type AnalyticsEventType = 
  | "page_view"
  | "feature_use"
  | "download"
  | "signup"
  | "session_start";

export interface AnalyticsEvent {
  event: AnalyticsEventType;
  feature?: string;
  page?: string;
  metadata?: Record<string, unknown>;
}

export function useAnalytics() {
  const { firebaseUser, loading: authLoading, user } = useAuth();
  const [userReady, setUserReady] = useState(false);
  const pendingEventsRef = useRef<AnalyticsEvent[]>([]);

  // Track when user is ready (auth loaded, user exists, and profile loaded)
  useEffect(() => {
    if (!authLoading && firebaseUser && user) {
      setUserReady(true);
    }
  }, [authLoading, firebaseUser, user]);

  const sendEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      const token = await getFirebaseIdToken();
      if (!token) return false; // Signal to re-queue

      const res = await fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (errorText.includes("Invalid or expired token")) {
          return false; // Signal to re-queue and reset userReady
        }
        console.warn("[Analytics] Failed to track event:", errorText);
      }
      return true;
    } catch (err) {
      console.warn("[Analytics] Failed to track event:", err);
      return false;
    }
  }, []);

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    if (!userReady) {
      pendingEventsRef.current.push(event);
      return;
    }

    const success = await sendEvent(event);
    if (!success) {
      // Re-queue and reset readiness to retry
      pendingEventsRef.current.push(event);
      setUserReady(false);
    }
  }, [userReady, sendEvent]);

  // Flush pending events when user becomes ready
  useEffect(() => {
    if (userReady && pendingEventsRef.current.length > 0) {
      const events = [...pendingEventsRef.current];
      pendingEventsRef.current = [];
      events.forEach((event) => trackEvent(event));
    }
  }, [userReady, trackEvent]);

  const trackPageView = useCallback((page: string) => {
    trackEvent({ event: "page_view", page });
  }, [trackEvent]);

  const trackFeatureUse = useCallback((feature: string, metadata?: Record<string, unknown>) => {
    trackEvent({ event: "feature_use", feature, metadata });
  }, [trackEvent]);

  const trackDownload = useCallback((metadata: { platform?: string; version?: string } = {}) => {
    trackEvent({ event: "download", metadata });
  }, [trackEvent]);

  const trackSignup = useCallback(() => {
    trackEvent({ event: "signup" });
  }, [trackEvent]);

  const trackSessionStart = useCallback(() => {
    trackEvent({ event: "session_start" });
  }, [trackEvent]);

  return {
    trackPageView,
    trackFeatureUse,
    trackDownload,
    trackSignup,
    trackSessionStart,
  };
}
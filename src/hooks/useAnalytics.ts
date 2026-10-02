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
  const { firebaseUser, loading: authLoading } = useAuth();
  const [userReady, setUserReady] = useState(false);
  const pendingEventsRef = useRef<AnalyticsEvent[]>([]);
  const trackEventRef = useRef<((event: AnalyticsEvent) => Promise<void>) | null>(null);

  // Track when user is ready (auth loaded and user exists)
  useEffect(() => {
    if (!authLoading && firebaseUser) {
      setUserReady(true);
      // Flush pending events
      pendingEventsRef.current.forEach((event) => {
        trackEventRef.current?.(event);
      });
      pendingEventsRef.current = [];
    }
  }, [authLoading, firebaseUser]);

  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    if (!userReady) {
      // Queue event for later
      pendingEventsRef.current.push(event);
      return;
    }

    try {
      const token = await getFirebaseIdToken();
      if (!token) return;

      const res = await fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        console.warn("[Analytics] Failed to track event:", await res.text());
      }
    } catch (err) {
      console.warn("[Analytics] Failed to track event:", err);
    }
  }, [userReady]);

  // Update ref after trackEvent is defined
  useEffect(() => {
    trackEventRef.current = trackEvent;
  }, [trackEvent]);

  const trackPageView = useCallback((page: string) => {
    trackEventRef.current?.({ event: "page_view", page });
  }, []);

  const trackFeatureUse = useCallback((feature: string, metadata?: Record<string, unknown>) => {
    trackEventRef.current?.({ event: "feature_use", feature, metadata });
  }, []);

  const trackDownload = useCallback((metadata: { platform?: string; version?: string } = {}) => {
    trackEventRef.current?.({ event: "download", metadata });
  }, []);

  const trackSignup = useCallback(() => {
    trackEventRef.current?.({ event: "signup" });
  }, []);

  const trackSessionStart = useCallback(() => {
    trackEventRef.current?.({ event: "session_start" });
  }, []);

  return {
    trackPageView,
    trackFeatureUse,
    trackDownload,
    trackSignup,
    trackSessionStart,
  };
}
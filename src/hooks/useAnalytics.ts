"use client";

import { useCallback } from "react";
import { getFirebaseIdToken } from "@/lib/auth-utils";

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

async function trackEvent(event: AnalyticsEvent) {
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
}

export function useAnalytics() {
  const trackPageView = useCallback((page: string) => {
    trackEvent({ event: "page_view", page });
  }, []);

  const trackFeatureUse = useCallback((feature: string, metadata?: Record<string, unknown>) => {
    trackEvent({ event: "feature_use", feature, metadata });
  }, []);

  const trackDownload = useCallback((metadata: { platform?: string; version?: string } = {}) => {
    trackEvent({ event: "download", metadata });
  }, []);

  const trackSignup = useCallback(() => {
    trackEvent({ event: "signup" });
  }, []);

  const trackSessionStart = useCallback(() => {
    trackEvent({ event: "session_start" });
  }, []);

  return {
    trackPageView,
    trackFeatureUse,
    trackDownload,
    trackSignup,
    trackSessionStart,
  };
}
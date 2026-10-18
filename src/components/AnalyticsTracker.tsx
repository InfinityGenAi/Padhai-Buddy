"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "@/hooks/useAnalytics";

/**
 * Tracks page views for every route change, including public (unauthenticated)
 * pages. Public page views are sent privacy-consciously: the track endpoint
 * rate-limits unauthenticated page_view by IP and records no user identity,
 * UID, or email. uniqueVisitors is only incremented for authenticated users.
 *
 * This is mounted once in the root layout (inside AuthProvider) so that both
 * public pages and dashboard pages are covered through a single, consistent
 * tracking path rather than relying on the authenticated dashboard hook alone.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname, trackPageView]);

  return null;
}

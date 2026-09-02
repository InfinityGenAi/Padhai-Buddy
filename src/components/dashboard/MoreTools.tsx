"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface MoreToolsProps {
  onViewAnalytics: () => void;
  onSettings: () => void;
}

export function MoreTools({ onViewAnalytics, onSettings }: MoreToolsProps) {
  return (
    <motion.div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">More Tools</h2>
        <p className="text-xs text-foreground/60">Additional study resources</p>
      </div>
      <div className="p-3 space-y-2">
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-primary transition-all border border-card-border"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="2" ry="2" />
            <circle cx="21" cy="21" r="2" />
            <path d="M12 2v2m0 12v-2m-9.17-9.17h2m9.93 9.93h2m-1.18 1.18l2.14-2.14m-4.78 4.78l2.14-2.14M21 12c0 4.96-4.04 9-9 9a9.96 9.96 0 0 1-3.5-6.45M10 9.95c4.96 0 9 4.04 9 9s-4.04 9-9 9a9.96 9.96 0 0 1-3.5 6.45M14.53 4.53a2.12 2.12 0 1 1 3.02 3.02" />
          </svg>
          Analytics
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-primary transition-all border border-card-border"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2.25 2.25 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 5 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H10a1.65 1.65 0 0 0 1-1.51 1.65 1.65 0 0 0-1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82.33l.06.06a2 2 0 0 1 2.83 0 2.25 2.25 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1 1.51v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2.25 2.25 0 0 1-2.83 0z" />
          </svg>
          Settings
        </Link>
      </div>
    </motion.div>
  );
}
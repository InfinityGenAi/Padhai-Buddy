"use client";

import { motion } from "framer-motion";

interface ThisWeekOverviewProps {
  studyStats: {
    totalMinutes: number;
    sessions: number;
    subjects: string[];
  };
}

export function ThisWeekOverview({ studyStats }: ThisWeekOverviewProps) {
  return (
    <motion.div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">This Week Overview</h2>
        <p className="text-xs text-foreground/60">Study progress for the past 7 days</p>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-primary/10 text-primary p-3">
            <p className="text-2xl font-bold">{studyStats.totalMinutes}</p>
            <p className="text-xs">Minutes</p>
          </div>
          <div className="rounded-lg bg-primary/10 text-primary p-3">
            <p className="text-2xl font-bold">{studyStats.sessions}</p>
            <p className="text-xs">Sessions</p>
          </div>
          <div className="rounded-lg bg-primary/10 text-primary p-3">
            <p className="text-2xl font-bold">{studyStats.subjects.length}</p>
            <p className="text-xs">Subjects</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

interface RecentActivityProps {
  recentActivities: { id: string; type: string; subject: string; time: number; completed: boolean }[];
}

export function RecentActivity({ recentActivities }: RecentActivityProps) {
  return (
    <motion.div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">Recent Activity</h2>
        <p className="text-xs text-foreground/60">Last 7 days</p>
      </div>
      <div className="p-3">
        {recentActivities.length === 0 ? (
          <p className="text-foreground/40 text-sm text-center">
            No recent activity.
          </p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-foreground/5 hover:bg-primary/5 transition-colors text-xs"
              >
                <span className="w-3 h-3 rounded-full bg-{activity.completed ? 'primary' : 'gray-300'}"></span>
                <span className="flex-1 min-w-0">{activity.subject} - {activity.time > 60 ? Math.floor(activity.time / 60) + 'h' : activity.time}min</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
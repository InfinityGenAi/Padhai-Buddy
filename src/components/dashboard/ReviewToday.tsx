"use client";

import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

interface ReviewTodayProps {
  recentActivities: string[];
}

export function ReviewToday({ recentActivities }: ReviewTodayProps) {
  return (
    <motion.div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">Review Today</h2>
        <p className="text-xs text-foreground/60">Quick reflection on what you learned</p>
      </div>
      <div className="p-3">
        {recentActivities.length === 0 ? (
          <p className="text-foreground/40 text-sm text-center">
            No activities yet. Start a study session to get started.
          </p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="px-3 py-2 rounded-lg bg-foreground/5 hover:bg-primary/5 transition-colors text-xs"
              >
                {activity}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
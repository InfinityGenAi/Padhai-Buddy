"use client";

import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

interface WeakTopicsProps {
  weakTopics: { subject: string; topic: string; mastery: number }[];
}

export function WeakTopics({ weakTopics }: WeakTopicsProps) {
  return (
    <motion.div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">Weak Topics</h2>
        <p className="text-xs text-foreground/60">Areas needing improvement</p>
      </div>
      <div className="p-3">
        {weakTopics.length === 0 ? (
          <p className="text-foreground/40 text-sm text-center">
            All topics strong! Keep up the great work.
          </p>
        ) : (
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {weakTopics.map((topic) => (
              <div
                key={topic.topic}
                className="flex items-center gap-3 p-3 rounded-lg bg-foreground/5"
              >
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83a5.96 5.96 0 0 1 0 8.45L19.07 20.07a5.96 5.96 0 0 1-8.45 0L4.93 4.93a2.02 2.02 0 0 1 0-2.86z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{topic.subject}: {topic.topic}</p>
                  <p className="text-foreground/40 text-xs">Mastery: {topic.mastery}%</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-red-950/30 text-red-400 text-xs font-medium flex items-center justify-center">-15%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
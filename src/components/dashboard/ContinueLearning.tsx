"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { motion } from "framer-motion";

interface ContinueLearningProps {
  currentStudySet?: {
    subject: string;
    topic: string;
    mastery: number;
  };
}

export function ContinueLearning({ currentStudySet }: ContinueLearningProps) {
  const { user } = useAuth();

  return (
    <div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">
          {currentStudySet?.topic || "Continue Learning"}
        </h2>
        {currentStudySet && (
          <p className="text-foreground/60 text-sm mt-1">
            {currentStudySet.subject} — {currentStudySet.topic}
          </p>
        )}
      </div>
      {currentStudySet && (
        <div className="p-3">
          <p className="text-xs font-medium bg-primary/10 text-primary rounded px-2 py-1">
            Mastery: {currentStudySet.mastery}%
          </p>
        </div>
      )}
      <div className="p-4 border-t border-card-border">
        <Link
          href="/dashboard/chat"
          className="w-full px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all"
        >
          Continue →
        </Link>
      </div>
    </div>
  );
}
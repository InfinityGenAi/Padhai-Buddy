/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { PlusIcon, CalendarIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { motion } from "framer-motion";
import type { StudyPlan } from "@/types";

interface TodayPlanProps {
  plans: StudyPlan[];
  setPlanError?: string | null;
  setShowAddPlan?: (show: boolean) => void;
}

export function TodayPlan({ plans, setPlanError, setShowAddPlan }: TodayPlanProps) {
  const { user } = useAuth();

  return (
    <motion.div
      className="rounded-xl overflow-hidden bg-card-bg border border-card-border shadow-sm"
    >
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">Today's Plan</h2>
        <span className="text-xs text-foreground/50 font-medium">0% done</span>
      </div>
      {setPlanError && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs">
          {setPlanError}
        </div>
      )}
      {plans.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center mb-3">
            <CalendarIcon className="w-5 h-5 text-foreground/30" />
          </div>
          <p className="text-sm text-foreground/50 mb-3">No tasks planned for today.</p>
          <button
            onClick={() => setShowAddPlan?.(true)}
            className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px]">
          {plans.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                item.completed ? "bg-foreground/[0.02]" : "bg-foreground/5 hover:bg-foreground/8"
              }`}
            >
              <button
                onClick={() => {}}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.completed ? "bg-primary border-primary" : "border-foreground/25 hover:border-primary/50"}`}>
                {item.completed && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${item.completed ? "text-foreground/35 line-through" : "text-foreground/75"}`}>
                  {item.subject} — {item.title}
                </p>
              </div>
              <span className="text-xs text-foreground/40 flex-shrink-0">{item.durationMinutes} min</span>
              <button
                onClick={() => {}}
                className="text-xs text-foreground/40 hover:text-primary/80">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
/* eslint-enable react/no-unescaped-entities */
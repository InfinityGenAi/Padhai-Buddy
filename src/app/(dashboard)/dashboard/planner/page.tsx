"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  CalendarIcon,
  PlusIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { StudyPlan, PlanPriority } from "@/types";

type PlanFilter = "all" | "today" | "upcoming" | "completed";

export default function PlannerPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newPriority, setNewPriority] = useState<PlanPriority>("medium");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch(`/api/planner?filter=${filter}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlans(data.plans || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user?.uid]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !user?.uid) return;
    setAdding(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create", title: newTitle, subject: newSubject, durationMinutes: newDuration, plannedDate: newDate, priority: newPriority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlans([data.plan, ...plans]);
      setShowAdd(false);
      setNewTitle("");
      setNewSubject("");
      setNewDuration(30);
      setNewPriority("medium");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add plan");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (plan: StudyPlan) => {
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "update", planId: plan.id, completed: !plan.completed }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPlans(plans.map((p) => (p.id === plan.id ? { ...p, completed: !p.completed } : p)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update plan");
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Delete this plan?")) return;
    setDeletingId(planId);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", planId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPlans(plans.filter((p) => p.id !== planId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete plan");
    } finally {
      setDeletingId(null);
    }
  };

  const priorityColors: Record<PlanPriority, string> = { low: "bg-blue-100 dark:bg-blue-950/30 text-blue-700", medium: "bg-amber-100 dark:bg-amber-950/30 text-amber-700", high: "bg-red-100 dark:bg-red-950/30 text-red-700" };

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Study Planner</h1>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)} className="px-3 py-1.5 btn-primary rounded-lg text-sm font-medium flex items-center gap-1">
          <PlusIcon className="w-4 h-4" /> Add Task
        </motion.button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</motion.div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["all", "today", "upcoming", "completed"] as PlanFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${filter === f ? "bg-primary text-white" : "bg-foreground/5 text-foreground/60 hover:text-foreground"}`}>
            {f === "all" ? "All Plans" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-foreground/5 rounded-xl animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/60 text-sm">No study plans yet. Add your first task!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <motion.div key={plan.id} className={`subtle-card rounded-xl p-4 flex items-center gap-3 ${plan.completed ? "opacity-60" : ""}`} whileHover={{ y: -1 }}>
              <button onClick={() => handleToggle(plan)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${plan.completed ? "bg-primary border-primary" : "border-foreground/25 hover:border-primary/50"}`}>
                {plan.completed && <CheckCircleIcon className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${plan.completed ? "text-foreground/35 line-through" : "text-foreground/75"}`}>{plan.title}</p>
                <p className="text-xs text-foreground/50">{plan.subject} — {plan.durationMinutes} min — {plan.plannedDate}</p>
              </div>
              {plan.priority && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${priorityColors[plan.priority]}`}>{plan.priority}</span>}
              <button onClick={() => handleDelete(plan.id)} disabled={deletingId === plan.id} className="p-1 rounded-md text-foreground/30 hover:text-red-500 disabled:opacity-50"><TrashIcon className="w-3.5 h-3.5" /></button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-strong rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Add Study Task</h3>
              <div className="space-y-3">
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <select value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm">
                    {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                </div>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as PlanPriority)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-foreground/5">Cancel</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAdd} disabled={adding || !newTitle.trim()} className="px-4 py-2 btn-primary rounded-xl text-sm disabled:opacity-50">Add Task</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

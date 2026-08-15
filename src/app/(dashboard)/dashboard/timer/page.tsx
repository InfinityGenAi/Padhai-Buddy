"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  ClockIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { playTimerStart, playTimerPause, playTimerComplete } from "@/lib/sounds";

type TimerMode = "pomodoro" | "stopwatch" | "custom";

const POMODORO_FOCUS = 25 * 60;

export default function TimerPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(POMODORO_FOCUS);
  const [elapsed, setElapsed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(preferences.soundEnabled);
  const [saving, setSaving] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<{ id: string; mode: string; durationMinutes: number; createdAt: number }[]>([]);
  const saveAttemptedRef = useRef(false);

  const intervalRef = useRef<number | null>(null);

  const getDuration = useCallback(() => {
    if (mode === "pomodoro") return POMODORO_FOCUS;
    if (mode === "custom") return customMinutes * 60;
    return 0;
  }, [mode, customMinutes]);

  const saveSession = useCallback(async (duration: number) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create", mode, durationMinutes: duration, completed: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setCompletedSessions((prev) => [data.session, ...prev]);
    } catch (err: unknown) {
      console.error("Failed to save session:", err);
    } finally {
      setSaving(false);
    }
  }, [user?.uid, mode]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    saveAttemptedRef.current = false;
    if (mode === "stopwatch") {
      setElapsed(0);
      setTimeLeft(0);
    } else {
      setTimeLeft(getDuration());
      setElapsed(0);
    }
  }, [mode, getDuration]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      saveAttemptedRef.current = false;
      if (mode === "stopwatch") {
        if (!cancelled) { setTimeLeft(0); setElapsed(0); }
      } else {
        if (!cancelled) { setTimeLeft(getDuration()); setElapsed(0); }
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!cancelled) setIsRunning(false);
    })();
    return () => { cancelled = true; };
  }, [mode, customMinutes, getDuration]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = window.setInterval(() => {
      if (mode === "stopwatch") {
        setElapsed((prev) => prev + 1);
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsRunning(false);
            if (soundEnabled) playTimerComplete();
            if (!saveAttemptedRef.current) {
              saveAttemptedRef.current = true;
              const duration = Math.floor(getDuration() / 60);
              if (duration > 0) {
                saveSession(duration);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, soundEnabled, getDuration, saveSession]);

  const handleComplete = async () => {
    const duration = mode === "stopwatch" ? Math.floor(elapsed / 60) : Math.floor(getDuration() / 60);
    if (duration > 0) {
      await saveSession(duration);
    }
    reset();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = mode === "stopwatch" ? elapsed : timeLeft;

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-5 w-full">
      <div className="flex items-center gap-2">
        <ClockIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Study Timer</h1>
      </div>

      <div className="flex gap-2">
        {(["pomodoro", "stopwatch", "custom"] as TimerMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${mode === m ? "bg-primary text-white" : "bg-foreground/5 text-foreground/60 hover:text-foreground"}`}>
            {m === "pomodoro" ? "Pomodoro" : m === "stopwatch" ? "Stopwatch" : "Custom"}
          </button>
        ))}
      </div>

      {mode === "custom" && (
        <div className="subtle-card rounded-xl p-4 flex items-center gap-4">
          <label className="text-sm text-foreground/60">Duration (minutes):</label>
          <input type="number" value={customMinutes} onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value) || 1))} min={1} max={180} className="w-20 bg-background border border-border rounded-xl px-3 py-2 text-sm text-center" />
        </div>
      )}

      <div className="subtle-card rounded-2xl p-8 text-center">
        <div className="text-6xl font-mono font-bold text-foreground tracking-tight">{formatTime(currentTime)}</div>
        <p className="text-xs text-foreground/50 mt-2">
          {mode === "pomodoro" ? "Focus time — stay concentrated!" : mode === "stopwatch" ? "Track your study time" : "Custom timer"}
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { if (isRunning && soundEnabled) playTimerPause(); else if (!isRunning && currentTime > 0 && soundEnabled) playTimerStart(); setIsRunning(!isRunning); }} className="px-6 py-3 btn-primary rounded-xl font-medium flex items-center gap-2">
          {isRunning ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          {isRunning ? "Pause" : "Start"}
        </motion.button>
        <button onClick={reset} className="px-6 py-3 rounded-xl font-medium bg-foreground/5 hover:bg-foreground/8 flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5" /> Reset
        </button>
        {!isRunning && currentTime > 0 && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={async () => { if (soundEnabled) playTimerComplete(); await handleComplete(); }} disabled={saving} className="px-6 py-3 rounded-xl font-medium bg-green-50 dark:bg-green-950/30 text-green-600 hover:bg-green-100 flex items-center gap-2 disabled:opacity-50">
            <CheckCircleIcon className="w-5 h-5" /> Complete
          </motion.button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/60">
          {soundEnabled ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}
        </button>
      </div>

      {completedSessions.length > 0 && (
        <div className="subtle-card rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {completedSessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs text-foreground/60">
                <span className="capitalize">{s.mode} — {s.durationMinutes} min</span>
                <span>{new Date(s.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

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
type TimerSession = {
  id: string;
  mode: string;
  durationMinutes: number;
  durationSeconds?: number;
  createdAt: number;
  completed?: boolean;
  completedAt?: number;
};

const MIN_REWARDED_SESSION_SECONDS = 60;
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
  const [timerError, setTimerError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<TimerSession | null>(null);
  const [completedSessions, setCompletedSessions] = useState<TimerSession[]>([]);
  const activeSessionRef = useRef<TimerSession | null>(null);
  const creatingSessionRef = useRef(false);
  const saveAttemptedRef = useRef(false);

  const intervalRef = useRef<number | null>(null);

  const getDuration = useCallback(() => {
    if (mode === "pomodoro") return POMODORO_FOCUS;
    if (mode === "custom") return customMinutes * 60;
    return 0;
  }, [mode, customMinutes]);

  const formatDuration = (seconds?: number, minutes?: number) => {
    const totalSeconds = seconds ?? (minutes ? minutes * 60 : 0);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  // Create the server-timestamped session when the timer starts, not after it ends.
  // Stopwatch sessions use a 60-second server-enforced minimum before they can earn points.
  const startSession = useCallback(async (durationSeconds: number): Promise<boolean> => {
    if (!user?.uid) return false;
    if (activeSessionRef.current) return true;
    if (creatingSessionRef.current) return false;

    creatingSessionRef.current = true;
    setSaving(true);
    setTimerError(null);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create", mode, durationSeconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start study session");
      activeSessionRef.current = data.session as TimerSession;
      setActiveSession(data.session as TimerSession);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start study session";
      setTimerError(message);
      console.error("Failed to start session:", err);
      return false;
    } finally {
      creatingSessionRef.current = false;
      setSaving(false);
    }
  }, [user?.uid, mode]);

  const finishSession = useCallback(async (actualDurationSeconds?: number): Promise<boolean> => {
    const session = activeSessionRef.current;
    if (!user?.uid || !session) {
      setTimerError("Start the timer before completing a session.");
      return false;
    }

    setSaving(true);
    setTimerError(null);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "update", sessionId: session.id, completed: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The session could not be completed yet");

      const durationSeconds = actualDurationSeconds ?? session.durationSeconds ?? session.durationMinutes * 60;
      const completed = {
        ...session,
        durationSeconds,
        durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)),
        completed: true,
        completedAt: Date.now(),
      };
      setCompletedSessions((prev) => [completed, ...prev]);
      activeSessionRef.current = null;
      setActiveSession(null);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete study session";
      setTimerError(message);
      console.error("Failed to complete session:", err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.uid]);

  const cancelSession = useCallback(async (sessionId: string) => {
    if (!user?.uid) return;
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "cancel", sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn("Could not cancel unfinished timer session:", data.error || res.statusText);
      }
    } catch (err) {
      console.warn("Could not cancel unfinished timer session:", err);
    }
  }, [user?.uid]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    saveAttemptedRef.current = false;
    setTimerError(null);
    const sessionToCancel = activeSessionRef.current;
    if (sessionToCancel) {
      activeSessionRef.current = null;
      setActiveSession(null);
      void cancelSession(sessionToCancel.id);
    }
    if (mode === "stopwatch") {
      setElapsed(0);
      setTimeLeft(0);
    } else {
      setTimeLeft(getDuration());
      setElapsed(0);
    }
  }, [mode, getDuration, cancelSession]);

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
              const durationSeconds = getDuration();
              if (durationSeconds > 0) {
                void finishSession(durationSeconds).then((completed) => {
                  if (!completed) saveAttemptedRef.current = false;
                });
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
  }, [isRunning, mode, soundEnabled, getDuration, finishSession]);

  const handleToggleRunning = async () => {
    if (saving) return;
    if (isRunning) {
      if (soundEnabled) playTimerPause();
      setIsRunning(false);
      return;
    }

    if (mode !== "stopwatch" && timeLeft <= 0) {
      setTimerError("Press Reset to start a new countdown.");
      return;
    }

    if (!activeSessionRef.current) {
      const durationSeconds = mode === "stopwatch"
        ? MIN_REWARDED_SESSION_SECONDS
        : getDuration();
      const started = await startSession(durationSeconds);
      if (!started) return;
    }

    setTimerError(null);
    if (soundEnabled) playTimerStart();
    setIsRunning(true);
  };

  const handleComplete = async () => {
    if (saveAttemptedRef.current || saving) return;
    const durationSeconds = mode === "stopwatch" ? elapsed : getDuration();
    if (durationSeconds < MIN_REWARDED_SESSION_SECONDS) {
      setTimerError("Study for at least 1 minute before completing a rewarded session.");
      return;
    }

    saveAttemptedRef.current = true;
    const completed = await finishSession(durationSeconds);
    if (completed) {
      reset();
    } else {
      saveAttemptedRef.current = false;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = mode === "stopwatch" ? elapsed : timeLeft;

  const timerTotal = mode === "stopwatch" ? 3600 : Math.max(getDuration(), 1);
  const timerProgress =
    mode === "stopwatch"
      ? Math.min(elapsed / timerTotal, 1)
      : timeLeft > 0
        ? (timerTotal - timeLeft) / timerTotal
        : 1;

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-6 w-full">
      <div className="flex items-center gap-2">
        <ClockIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Timer</h1>
      </div>

      <div className="flex gap-2">
        {(["pomodoro", "stopwatch", "custom"] as TimerMode[]).map((m) => (
          <button key={m} disabled={!!activeSession || saving} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${mode === m ? "bg-primary text-white" : "bg-foreground/5 text-foreground/60 hover:text-foreground"} disabled:opacity-50`}>
            {m === "pomodoro" ? "Pomodoro" : m === "stopwatch" ? "Stopwatch" : "Custom"}
          </button>
        ))}
      </div>

      {mode === "custom" && (
        <div className="subtle-card rounded-xl p-4 flex items-center gap-4">
          <label className="text-sm text-foreground/60">Duration (minutes):</label>
          <input type="number" disabled={!!activeSession || saving} value={customMinutes} onChange={(e) => setCustomMinutes(Math.min(180, Math.max(1, Number(e.target.value) || 1)))} min={1} max={180} className="w-20 bg-background border border-border rounded-xl px-3 py-2 text-sm text-center disabled:opacity-50" />
        </div>
      )}

      <div className="subtle-card rounded-2xl p-8 text-center">
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg className="-rotate-90 w-56 h-56" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="52"
              fill="none" strokeWidth="10"
              className="stroke-foreground/8"
            />
            <motion.circle
              cx="60" cy="60" r="52"
              fill="none" strokeWidth="10" strokeLinecap="round"
              stroke="url(#timerGradient)"
              strokeDasharray="326.7"
              initial={{ strokeDashoffset: 326.7 }}
              animate={{ strokeDashoffset: 326.7 * (1 - timerProgress) }}
              transition={animationsEnabled ? { type: "spring", stiffness: 60, damping: 20 } : undefined}
            />
            <defs>
              <linearGradient id="timerGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-mono font-bold text-foreground tracking-tight">{formatTime(currentTime)}</div>
          </div>
        </div>
        <p className="text-xs text-foreground/50 -mt-2">
          {mode === "pomodoro" ? "Focus time — stay concentrated!" : mode === "stopwatch" ? "Track your study time" : "Custom timer"}
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { void handleToggleRunning(); }} disabled={saving} className="px-6 py-3 btn-primary rounded-xl font-medium flex items-center gap-2 disabled:opacity-50">
          {isRunning ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          {isRunning ? "Pause" : "Start"}
        </motion.button>
        <button onClick={reset} disabled={saving} className="px-6 py-3 rounded-xl font-medium bg-foreground/5 hover:bg-foreground/8 flex items-center gap-2 disabled:opacity-50">
          <ArrowPathIcon className="w-5 h-5" /> Reset
        </button>
        {!isRunning && !!activeSession && (mode === "stopwatch" ? elapsed >= MIN_REWARDED_SESSION_SECONDS : timeLeft === 0) && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={async () => { if (soundEnabled) playTimerComplete(); await handleComplete(); }} disabled={saving} className="px-6 py-3 rounded-xl font-medium bg-green-950/30 text-green-400 hover:bg-green-950/20 flex items-center gap-2 disabled:opacity-50">
            <CheckCircleIcon className="w-5 h-5" /> Complete
          </motion.button>
        )}
      </div>

      {timerError && (
        <p role="alert" className="text-sm text-red-400 text-center">{timerError}</p>
      )}

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
                <span className="capitalize">{s.mode} — {formatDuration(s.durationSeconds, s.durationMinutes)}</span>
                <span>{new Date(s.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

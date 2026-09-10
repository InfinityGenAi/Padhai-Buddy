"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getFirestoreDb } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, writeBatch } from "firebase/firestore";
import { BellIcon, BellAlertIcon, CheckIcon, CheckCircleIcon, XMarkIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { playTaskComplete } from "@/lib/sounds";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const db = getFirestoreDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("time", "desc"),
    );

    const unsub = onSnapshot(q,
      (snapshot) => {
        const items: Notification[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Notification;
          items.push({
            id: docSnap.id,
            text: data.text,
            time: data.time,
            read: data.read ?? false,
            type: data.type,
          });
        });
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.error("[Notifications] Listener error:", err);
        setError("Failed to load notifications. Please try again.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const handleMarkRead = async (notificationId: string, read: boolean) => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "notifications", notificationId), {
        read,
      });
      if (preferences.soundEnabled) playTaskComplete();
    } catch {
      setError("Failed to update notification. Please try again.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const unreadNotifications = notifications.filter((n) => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadNotifications.forEach((n) => {
        batch.update(doc(db, "users", user.uid, "notifications", n.id), { read: true });
      });
      await batch.commit();
      if (preferences.soundEnabled) playTaskComplete();
    } catch {
      setError("Failed to mark all as read. Please try again.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    try {
      await updateDoc(doc(db, "users", user.uid, "notifications", notificationId), {
        // We don't actually delete, just hide by marking as deleted
        // Or we could use a separate 'deleted' field
      });
      // For now, we'll just remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch {
      setError("Failed to delete notification. Please try again.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const formatTime = (time: string | number): string => {
    if (!time) return "";
    const date = typeof time === "number" ? new Date(time) : new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      className="space-y-6 w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellAlertIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <motion.button
            whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-1.5"
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Mark all read
          </motion.button>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
              transition={animationsEnabled ? { delay: i * 0.1 } : undefined}
              className="h-16 bg-foreground/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4">
            <BellIcon className="w-8 h-8 text-foreground/30" />
          </div>
          <p className="text-lg text-foreground/70 font-medium mb-1">No notifications yet</p>
          <p className="text-sm text-foreground/50">You'll see updates and alerts here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={animationsEnabled ? { opacity: 0, y: 10, x: -20 } : undefined}
                animate={animationsEnabled ? { opacity: 1, y: 0, x: 0 } : undefined}
                exit={animationsEnabled ? { opacity: 0, x: 20, height: 0 } : undefined}
                transition={animationsEnabled ? { duration: 0.2 } : undefined}
                className={`flex items-start gap-3 p-4 rounded-xl bg-card border ${
                  notification.read ? "border-border/50" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  notification.read ? "bg-foreground/5 text-foreground/40" : "bg-primary/10 text-primary"
                }`}>
                  {notification.read ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <BellIcon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notification.read ? "text-foreground/70" : "text-foreground font-medium"}`}>
                    {notification.text}
                  </p>
                  <p className="text-[11px] text-foreground/40 mt-1">{formatTime(notification.time)}</p>
                  {notification.type && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium bg-foreground/5 text-foreground/60 rounded-full">
                      {notification.type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkRead(notification.id, true)}
                      className="p-2 rounded-lg text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label="Mark as read"
                      title="Mark as read"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleMarkRead(notification.id, !notification.read)}
                    className="p-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
                    aria-label={notification.read ? "Mark as unread" : "Mark as read"}
                    title={notification.read ? "Mark as unread" : "Mark as read"}
                  >
                    {notification.read ? (
                      <XCircleIcon className="w-4 h-4" />
                    ) : (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 rounded-lg text-foreground/50 hover:text-red-500 hover:bg-red-950/20 transition-colors"
                    aria-label="Delete notification"
                    title="Delete"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { getFirestoreDb } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const [weeklyDoubts, setWeeklyDoubts] = useState(0);
  const [totalDoubts, setTotalDoubts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const db = getFirestoreDb();
      if (!db || !user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const doubtsRef = collection(db, "users", user.uid, "doubts");
        const allSnap = await getDocs(doubtsRef);
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        let weekly = 0;
        let total = 0;
        allSnap.forEach((doc) => {
          const data = doc.data();
          total++;
          const createdAt = data.createdAt?.toDate?.()?.getTime?.() || data.createdAt;
          if (createdAt && createdAt >= weekAgo) {
            weekly++;
          }
        });
        setWeeklyDoubts(weekly);
        setTotalDoubts(total);
      } catch {
        // ignore stats errors
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user?.uid]);

  const displayName = user?.name || "there";
  const firstName = displayName.split(" ")[0] || displayName;

  const stats = [
    {
      label: "Doubts solved this week",
      value: loading ? "..." : String(weeklyDoubts),
      icon: ChatBubbleLeftEllipsisIcon,
    },
    {
      label: "Total doubts solved",
      value: loading ? "..." : String(totalDoubts),
      icon: ClockIcon,
    },
  ];

  const quickActions = [
    {
      name: "Chat Doubt",
      href: "/dashboard/chat",
      icon: ChatBubbleLeftEllipsisIcon,
      color: "from-purple-500 to-indigo-500",
    },
    {
      name: "Photo Doubt",
      href: "/dashboard/photo-doubt",
      icon: PhotoIcon,
      color: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="sm:hidden mb-4">
        <motion.h1
          className="text-2xl font-bold"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Hi, {firstName}
        </motion.h1>
        {user && (
          <span className="inline-block mt-1 px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
            Class {user.class} — {user.board}
          </span>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-foreground/60">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link key={action.name} href={action.href}>
              <motion.div
                className="w-full bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${action.color}`}
                >
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="font-medium">{action.name}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-foreground/60 text-sm">
            No doubts solved yet. Start by asking a question or uploading a
            photo of your study material.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

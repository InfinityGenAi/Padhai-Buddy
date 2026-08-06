"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockIcon,
  ChevronDownIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import type { Doubt } from "@/types";

export default function HistoryPage() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const q = query(
      collection(db, "users", user.uid, "doubts"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: Doubt[] = [];
      snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          question: data.question,
          answer: data.answer,
          type: data.type,
          createdAt: data.createdAt?.toDate?.()?.getTime() || data.createdAt,
        });
      });
      setDoubts(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return `${Math.floor(diffHours * 60)}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    }
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="mb-4 flex items-center gap-2">
          <ClockIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Doubt History</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-foreground/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-foreground/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center gap-2"
      >
        <ClockIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Doubt History</h1>
      </motion.div>

      {doubts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <ClockIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/60">
            You haven{"'"}t solved any doubts yet. Start a chat or upload a photo
            to begin!
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          {doubts.map((doubt) => (
            <motion.div
              key={doubt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === doubt.id ? null : doubt.id)
                }
                className="w-full p-4 text-left hover:bg-foreground/3 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          doubt.type === "text"
                            ? "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300"
                            : "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {doubt.type === "text" ? (
                          <ChatBubbleLeftEllipsisIcon className="w-3 h-3 mr-1" />
                        ) : (
                          <PhotoIcon className="w-3 h-3 mr-1" />
                        )}
                        {doubt.type === "text" ? "Text" : "Photo"}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {formatDate(doubt.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 truncate">
                      {doubt.question.startsWith("http")
                        ? "📸 Photo doubt"
                        : doubt.question}
                    </p>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-foreground/40 transition-transform ${
                      expandedId === doubt.id ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {expandedId === doubt.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-border p-4"
                >
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                    {doubt.answer}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

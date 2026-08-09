"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockIcon,
  ChevronDownIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  TrashIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import type { Doubt } from "@/types";

export default function HistoryPage() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuDoubtId, setMenuDoubtId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  useEffect(() => {
    const handleClickOutside = () => setMenuDoubtId(null);
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return `${Math.floor((diffMs / 1000 / 60))}m ago`;
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

  const deleteDoubt = async (doubtId: string) => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;
    await deleteDoc(doc(db, "users", user.uid, "doubts", doubtId));
  };

  const optimisticallyDeleteDoubt = async (doubtId: string) => {
    setDeleteConfirmId(null);
    try {
      await deleteDoubt(doubtId);
      setDoubts((prev) => prev.filter((d) => d.id !== doubtId));
      if (expandedId === doubtId) {
        setExpandedId(null);
      }
    } catch (err) {
      console.error("Failed to delete doubt:", err);
      alert("Failed to delete history entry. Please try again.");
    }
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
              <div className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setExpandedId(expandedId === doubt.id ? null : doubt.id)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(expandedId === doubt.id ? null : doubt.id);
                    }
                  }}
                  className="w-full p-4 text-left hover:bg-foreground/3 transition-colors cursor-pointer"
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
                         {doubt.type === "photo" ? "Photo Doubt" : doubt.question}
                       </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuDoubtId(menuDoubtId === doubt.id ? null : doubt.id);
                        }}
                        className="p-1 rounded-md hover:bg-foreground/5 text-foreground/60 transition-all"
                      >
                        <EllipsisVerticalIcon className="w-4 h-4" />
                      </motion.button>
                      <ChevronDownIcon
                        className={`w-4 h-4 text-foreground/40 transition-transform ${
                          expandedId === doubt.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {menuDoubtId === doubt.id && (
                  <div className="absolute right-2 top-12 bg-card border border-border rounded-xl shadow-lg py-1 z-10 min-w-[120px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(doubt.id);
                        setMenuDoubtId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}

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
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Entry</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Are you sure you want to delete this history entry? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => optimisticallyDeleteDoubt(deleteConfirmId!)}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

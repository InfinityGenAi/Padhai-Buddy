"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { getFirestoreDb } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { UserBoard, UserClass } from "@/types";
import { playProfileUpdate } from "@/lib/sounds";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, reloadProfile } = useAuth();
  const [name, setName] = useState(() => user?.name || "");
  const [selectedClass, setSelectedClass] = useState<UserClass>(() => user?.class || 10);
  const [selectedBoard, setSelectedBoard] = useState<UserBoard>(() => user?.board || "CBSE");
  const [photoURL, setPhotoURL] = useState(() => user?.photoURL || "");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !user?.uid) return;
    setSaving(true);
    setNotification(null);

    const db = getFirestoreDb();
    if (!db) {
      setNotification({ type: "error", text: "Database not available" });
      setSaving(false);
      return;
    }

    try {
      const updates: Record<string, unknown> = {
        name: name.trim(),
        class: selectedClass,
        board: selectedBoard,
      };
      if (photoURL.trim()) {
        updates.photoURL = photoURL.trim();
      }

      await updateDoc(doc(db, "users", user.uid), updates);
      playProfileUpdate();
      setNotification({ type: "success", text: "Profile updated successfully" });
      reloadProfile();
      setTimeout(() => {
        setNotification(null);
        onClose();
      }, 1500);
    } catch {
      setNotification({ type: "error", text: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-primary" />
                Profile
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
                aria-label="Close profile"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl text-sm font-medium ${
                    notification.type === "success"
                      ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                  }`}
                >
                  {notification.text}
                </motion.div>
              )}

              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0 overflow-hidden">
                  {photoURL ? (
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${photoURL})` }}
                    />
                  ) : (
                    name?.charAt(0)?.toUpperCase() || "U"
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-foreground/60 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-xs text-foreground/60 mb-1 block">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-foreground/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground/50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs text-foreground/60 mb-1 block">Profile Photo URL</label>
                <div className="relative">
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-foreground/60 mb-1 block">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(Number(e.target.value) as UserClass)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {[5, 6, 7, 8, 9, 10, 11, 12].map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-foreground/60 mb-1 block">Board</label>
                <select
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value as UserBoard)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="State Board">State Board</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 btn-primary rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

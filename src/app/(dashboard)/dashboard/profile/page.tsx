"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  UserIcon,
} from "@heroicons/react/24/outline";
import type { UserBoard, UserClass } from "@/types";

export default function ProfilePage() {
  const { user, preferences, reloadProfile } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

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

    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const updates: Record<string, unknown> = {
        name: name.trim(),
        class: selectedClass,
        board: selectedBoard,
      };
      if (photoURL.trim()) updates.photoURL = photoURL.trim();

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: "success", text: "Profile updated successfully" });
      reloadProfile();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: unknown) {
      setNotification({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-5 w-full">
      <div className="flex items-center gap-2">
        <UserIcon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Profile</h1>
      </div>

      {notification && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl text-sm font-medium ${notification.type === "success" ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"}`}>
          {notification.text}
        </motion.div>
      )}

      <div className="subtle-card rounded-xl p-6 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0 overflow-hidden">
            {photoURL ? (
              <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${photoURL})` }} />
            ) : (
              name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-foreground/60 mb-1 block">Display Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" maxLength={50} />
        </div>

        <div>
          <label className="text-xs text-foreground/60 mb-1 block">Email</label>
          <input type="email" value={user?.email || ""} disabled className="w-full bg-foreground/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground/50 cursor-not-allowed" />
        </div>

        <div>
          <label className="text-xs text-foreground/60 mb-1 block">Profile Photo URL</label>
          <input type="url" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://example.com/photo.jpg" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div>
          <label className="text-xs text-foreground/60 mb-1 block">Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(Number(e.target.value) as UserClass)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            {[5, 6, 7, 8, 9, 10, 11, 12].map((c) => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-foreground/60 mb-1 block">Board</label>
          <select value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value as UserBoard)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="CBSE">CBSE</option>
            <option value="ICSE">ICSE</option>
            <option value="State Board">State Board</option>
          </select>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors">Cancel</button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 btn-primary rounded-xl text-sm font-medium disabled:opacity-50">Save Profile</motion.button>
        </div>
      </div>
    </motion.div>
  );
}


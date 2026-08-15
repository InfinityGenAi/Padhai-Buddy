"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  SpeakerWaveIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { playSaveSuccess, playDeleteSuccess } from "@/lib/sounds";
import type { Resource, ResourceType } from "@/types";

const RESOURCE_TYPES: ResourceType[] = ["video", "article", "pdf", "link", "notes"];

export default function ResourcesPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", type: "link" as ResourceType, description: "", url: "" });

  const fetchResources = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const url = search.trim() ? `/api/resources?search=${encodeURIComponent(search)}` : "/api/resources";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResources(data.resources || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchResources(), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, user?.uid]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const action = editing ? "update" : "create";
      const body: Record<string, unknown> = { action, title: form.title, subject: form.subject, type: form.type, description: form.description, url: form.url };
      if (editing) body.resourceId = editing.id;

      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (preferences.soundEnabled) playSaveSuccess();
      await fetchResources();
      setShowAdd(false);
      setEditing(null);
      setForm({ title: "", subject: "", type: "link", description: "", url: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save resource");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", resourceId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      if (preferences.soundEnabled) playDeleteSuccess();
      setResources(resources.filter((r) => r.id !== resourceId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete resource");
    }
  };

  const openEdit = (resource: Resource) => {
    setEditing(resource);
    setForm({ title: resource.title, subject: resource.subject, type: resource.type, description: resource.description, url: resource.url || "" });
    setShowAdd(true);
  };

  const typeIcons: Record<ResourceType, string> = { video: "🎬", article: "📄", pdf: "📕", link: "🔗", notes: "📝" };

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SpeakerWaveIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Resources</h1>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setEditing(null); setForm({ title: "", subject: "", type: "link", description: "", url: "" }); setShowAdd(true); }} className="px-3 py-1.5 btn-primary rounded-lg text-sm font-medium flex items-center gap-1">
          <PlusIcon className="w-4 h-4" /> Add
        </motion.button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</motion.div>
      )}

      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-foreground/5 rounded-xl animate-pulse" />)}</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12">
          <SpeakerWaveIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/60 text-sm">No resources yet. Add your first resource!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {resources.map((resource) => (
            <motion.div key={resource.id} className="subtle-card rounded-xl p-4" whileHover={{ y: -1 }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeIcons[resource.type]}</span>
                    <h3 className="font-semibold text-sm truncate">{resource.title}</h3>
                  </div>
                  <p className="text-xs text-foreground/50 mt-0.5">{resource.subject} — {resource.type}</p>
                  <p className="text-xs text-foreground/40 mt-1 line-clamp-2">{resource.description}</p>
                  {resource.url && (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      <GlobeAltIcon className="w-3 h-3" /> Open Link
                    </a>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => openEdit(resource)} className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground"><PencilSquareIcon className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(resource.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setEditing(null); } }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-strong rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">{editing ? "Edit Resource" : "Add Resource"}</h3>
              <div className="space-y-3">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ResourceType })} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm">
                  {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none" />
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL (optional)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => { setShowAdd(false); setEditing(null); }} className="px-4 py-2 rounded-xl text-sm hover:bg-foreground/5">Cancel</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving} className="px-4 py-2 btn-primary rounded-xl text-sm disabled:opacity-50">Save</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

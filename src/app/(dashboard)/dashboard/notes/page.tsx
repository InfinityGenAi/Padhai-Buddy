"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { playSaveSuccess, playDeleteSuccess } from "@/lib/sounds";

type NoteView = "list" | "editor";

export default function NotesPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [view, setView] = useState<NoteView>("list");
  const [notes, setNotes] = useState<{ id: string; title: string; subject: string; body: string; updatedAt: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<{ id?: string; title: string; subject: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"updatedAt" | "title">("updatedAt");

  const fetchNotes = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const url = search.trim() ? `/api/notes?search=${encodeURIComponent(search)}` : "/api/notes";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(data.notes || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, user?.uid]);

  const handleSave = async () => {
    if (!editingNote?.title.trim() || !editingNote?.subject.trim()) return;
    setSaving(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const action = editingNote.id ? "update" : "create";
      const body: Record<string, unknown> = { action, title: editingNote.title, subject: editingNote.subject, body: editingNote.body };
      if (editingNote.id) body.noteId = editingNote.id;

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (preferences.soundEnabled) playSaveSuccess();
      await fetchNotes();
      setView("list");
      setEditingNote(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", noteId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      if (preferences.soundEnabled) playDeleteSuccess();
      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortBy === "updatedAt") return b.updatedAt - a.updatedAt;
    return a.title.localeCompare(b.title);
  });

  if (view === "editor") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">{editingNote?.id ? "Edit Note" : "New Note"}</h1>
          </div>
          <button onClick={() => { setView("list"); setEditingNote(null); }} className="text-sm text-foreground/60 hover:text-foreground">Cancel</button>
        </div>

        <div className="subtle-card rounded-xl p-6 space-y-4">
          <input
            value={editingNote?.title || ""}
            onChange={(e) => setEditingNote(editingNote ? { ...editingNote, title: e.target.value } : null)}
            placeholder="Note title"
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={editingNote?.subject || ""}
            onChange={(e) => setEditingNote(editingNote ? { ...editingNote, subject: e.target.value } : null)}
            placeholder="Subject"
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <textarea
            value={editingNote?.body || ""}
            onChange={(e) => setEditingNote(editingNote ? { ...editingNote, body: e.target.value } : null)}
            placeholder="Write your note here..."
            rows={12}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setView("list"); setEditingNote(null); }} className="px-4 py-2 rounded-xl text-sm hover:bg-foreground/5">Cancel</button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving} className="px-4 py-2 btn-primary rounded-xl text-sm disabled:opacity-50">Save Note</motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Notes</h1>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setEditingNote({ title: "", subject: "", body: "" }); setView("editor"); }} className="px-3 py-1.5 btn-primary rounded-lg text-sm font-medium flex items-center gap-1">
          <PlusIcon className="w-4 h-4" /> New Note
        </motion.button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</motion.div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "updatedAt" | "title")} className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
          <option value="updatedAt">Recent</option>
          <option value="title">Title</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-foreground/5 rounded-xl animate-pulse" />)}</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/60 text-sm">No notes yet. Create your first note!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedNotes.map((note) => (
            <motion.div key={note.id} className="subtle-card rounded-xl p-4 flex items-start justify-between" whileHover={{ y: -1 }}>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditingNote(note); setView("editor"); }}>
                <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                <p className="text-xs text-foreground/50 mt-0.5">{note.subject}</p>
                <p className="text-xs text-foreground/40 mt-1 line-clamp-2">{note.body}</p>
              </div>
              <div className="flex gap-1 ml-2">
                <button onClick={() => { setEditingNote(note); setView("editor"); }} className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground"><PencilSquareIcon className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

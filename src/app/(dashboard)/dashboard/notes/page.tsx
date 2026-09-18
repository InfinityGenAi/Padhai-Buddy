"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  TagIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  SparklesIcon,
  AcademicCapIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { playSaveSuccess, playDeleteSuccess } from "@/lib/sounds";

type NoteView = "list" | "editor";

interface Note {
  id: string;
  title: string;
  subject: string;
  body: string;
  tags: string[];
  updatedAt: number;
  createdAt: number;
}

export default function NotesPage() {
  const { user, preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [view, setView] = useState<NoteView>("list");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<{ id?: string; title: string; subject: string; body: string; tags: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<"updatedAt" | "title">("updatedAt");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null);
  const [generatingFlashcards, setGeneratingFlashcards] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummaryFor, setShowSummaryFor] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
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
  }, [search, user?.uid]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async () => {
    if (!editingNote?.title.trim() || !editingNote?.subject.trim()) return;
    setSaving(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const action = editingNote.id ? "update" : "create";
      const body: Record<string, unknown> = { action, title: editingNote.title, subject: editingNote.subject, body: editingNote.body, tags: editingNote.tags };
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
    setDeleteConfirmId(null);
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

  const handleGenerateQuiz = async (note: Note) => {
    if (!user || generatingQuiz === note.id) return;
    setGeneratingQuiz(note.id);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: note.subject,
          class: user.class,
          board: user.board,
          difficulty: "medium",
          numberOfQuestions: 5,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate quiz");
      }
      const data = await res.json();
      router.push(`/dashboard/quiz?attempt=${data.attempt?.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
      setTimeout(() => setError(null), 4000);
    } finally {
      setGeneratingQuiz(null);
    }
  };

  const handleGenerateFlashcards = async (note: Note) => {
    if (!user || generatingFlashcards === note.id) return;
    setGeneratingFlashcards(note.id);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "create-from-note",
          title: note.title,
          subject: note.subject,
          noteBody: note.body,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate flashcards");
      }
      setError("Flashcards created!");
      setTimeout(() => setError(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate flashcards");
      setTimeout(() => setError(null), 4000);
    } finally {
      setGeneratingFlashcards(null);
    }
  };

  const handleSummarize = async (note: Note) => {
    if (!user || summarizing === note.id) return;
    setSummarizing(note.id);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: `Summarize this note in 3-5 bullet points. Be concise and focus on key concepts.\n\nTitle: ${note.title}\nSubject: ${note.subject}\nNote:\n${note.body}`,
          class: user.class,
          board: user.board,
          stream: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize");
      setSummary(data.answer);
      setShowSummaryFor(note.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to summarize");
      setTimeout(() => setError(null), 4000);
    } finally {
      setSummarizing(null);
    }
  };

  const handleAskAI = (note: Note) => {
    // Navigate to chat with the note content as context
    const message = `Help me understand this note:\n\nTitle: ${note.title}\nSubject: ${note.subject}\nNote:\n${note.body}`;
    const url = `/dashboard/chat?message=${encodeURIComponent(message)}`;
    window.location.href = url;
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    if (!editingNote) return;
    if (checked) {
      setEditingNote({ ...editingNote, tags: [...editingNote.tags, tag.toLowerCase()] });
    } else {
      setEditingNote({ ...editingNote, tags: editingNote.tags.filter(t => t !== tag) });
    }
  };

  const availableTags = ["math", "physics", "chemistry", "biology", "history", "geography", "english", "hindi", "computer", "economics", "other"];

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortBy === "updatedAt") return b.updatedAt - a.updatedAt;
    return a.title.localeCompare(b.title);
  });

  if (view === "editor") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">{editingNote?.id ? "Edit Note" : "New Note"}</h1>
          </div>
          <button onClick={() => { setView("list"); setEditingNote(null); setSummary(null); setShowSummaryFor(null); }} className="text-sm text-foreground/60 hover:text-foreground">Cancel</button>
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
          
          {/* Tags */}
          <div>
            <label className="text-xs text-foreground/60 mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <label key={tag} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingNote?.tags.includes(tag)}
                    onChange={(e) => handleTagChange(tag, e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                  />
                  <span className="text-sm text-foreground/70 capitalize">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          <textarea
            value={editingNote?.body || ""}
            onChange={(e) => setEditingNote(editingNote ? { ...editingNote, body: e.target.value } : null)}
            placeholder="Write your note here..."
            rows={12}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setView("list"); setEditingNote(null); setSummary(null); setShowSummaryFor(null); }} className="px-4 py-2 rounded-xl text-sm hover:bg-foreground/5">Cancel</button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving} className="px-4 py-2 btn-primary rounded-xl text-sm disabled:opacity-50">Save Note</motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Notes</h1>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setEditingNote({ title: "", subject: "", body: "", tags: [] }); setView("editor"); }} className="px-3 py-1.5 btn-primary rounded-lg text-sm font-medium flex items-center gap-1">
          <PlusIcon className="w-4 h-4" /> New Note
        </motion.button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm">{error}</motion.div>
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
            <motion.div key={note.id} className="subtle-card rounded-xl p-4 flex flex-col" whileHover={{ y: -1 }}>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditingNote(note); setView("editor"); }}>
                <div className="flex items-start gap-2 mb-2">
                  <h3 className="font-semibold text-sm truncate flex-1">{note.title}</h3>
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full whitespace-nowrap">{note.subject}</span>
                </div>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-foreground/5 text-foreground/60 rounded-full">{tag}</span>
                    ))}
                    {note.tags.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-foreground/5 text-foreground/40 rounded-full">+{note.tags.length - 4}</span>
                    )}
                  </div>
                )}
                <p className="text-xs text-foreground/40 line-clamp-2">{note.body}</p>
              </div>
              <div className="flex gap-1 ml-2 mt-2 flex-wrap">
                <button onClick={() => { setEditingNote(note); setView("editor"); }} className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground" title="Edit"><PencilSquareIcon className="w-4 h-4" /></button>
                <button onClick={() => handleGenerateQuiz(note)} disabled={generatingQuiz === note.id} className="p-1.5 rounded-lg text-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors" title="Generate Quiz"><QuestionMarkCircleIcon className="w-4 h-4" /></button>
                <button onClick={() => handleGenerateFlashcards(note)} disabled={generatingFlashcards === note.id} className="p-1.5 rounded-lg text-foreground/40 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors" title="Create Flashcards"><Squares2X2Icon className="w-4 h-4" /></button>
                <button onClick={() => handleAskAI(note)} className="p-1.5 rounded-lg text-foreground/40 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors" title="Ask AI Tutor"><AcademicCapIcon className="w-4 h-4" /></button>
                <button onClick={() => handleSummarize(note)} disabled={summarizing === note.id} className="p-1.5 rounded-lg text-foreground/40 hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="AI Summary"><SparklesIcon className="w-4 h-4" /></button>
                <button onClick={() => setDeleteConfirmId(note.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
              </div>
              
              {showSummaryFor === note.id && summary && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary">AI Summary</span>
                    <button onClick={() => { setShowSummaryFor(null); setSummary(null); }} className="p-1 text-foreground/40 hover:text-foreground"><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{summary}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-card border border-foreground/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-2">Delete Note</h3>
            <p className="text-sm text-foreground/60 mb-4">Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  SparklesIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type FlashcardView = "decks" | "study";

export default function FlashcardsPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [view, setView] = useState<FlashcardView>("decks");
  const [decks, setDecks] = useState<{ id: string; title: string; subject: string; description?: string }[]>([]);
  const [cards, setCards] = useState<{ id: string; front: string; back: string; status: string }[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentCard = cards[currentCardIndex];

  const fetchDecks = async () => {
    if (!user?.uid) return;
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDecks(data.decks || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load decks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleCreateDeck = async () => {
    if (!deckTitle.trim() || !deckSubject.trim()) return;
    setSaving(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "createDeck", title: deckTitle, subject: deckSubject, description: deckDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDecks([data.deck, ...decks]);
      setShowCreateDeck(false);
      setDeckTitle("");
      setDeckSubject("");
      setDeckDescription("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create deck");
    } finally {
      setSaving(false);
    }
  };

  const startStudy = async (deckId: string) => {
    setActiveDeckId(deckId);
    setLoading(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch(`/api/flashcards?deckId=${deckId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCards(data.cards || []);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setView("study");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "deleteDeck", deckId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDecks(decks.filter((d) => d.id !== deckId));
      if (activeDeckId === deckId) {
        setActiveDeckId(null);
        setView("decks");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete deck");
    }
  };

  const markCard = (status: string) => {
    if (!activeDeckId || !currentCard) return;
    const updated = { ...currentCard, status };
    setCards(cards.map((c) => (c.id === currentCard.id ? updated : c)));
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  if (view === "study" && activeDeckId && currentCard) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 w-full"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Studying</h1>
          </div>
          <button
            onClick={() => { setView("decks"); setActiveDeckId(null); }}
            className="text-sm text-foreground/60 hover:text-foreground"
          >
            Exit Study
          </button>
        </div>

        <div className="text-xs text-foreground/50 font-medium">
          Card {currentCardIndex + 1} of {cards.length}
        </div>

        <motion.div
          onClick={() => setIsFlipped(!isFlipped)}
          className="subtle-card rounded-2xl p-8 min-h-[200px] flex items-center justify-center cursor-pointer"
          whileHover={{ scale: 1.01 }}
        >
          <p className="text-center text-lg font-medium">{isFlipped ? currentCard.back : currentCard.front}</p>
        </motion.div>

        <div className="flex gap-2 justify-center">
          <button onClick={() => markCard("difficult")} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100">
            Difficult
          </button>
          <button onClick={() => markCard("known")} className="px-4 py-2 rounded-xl text-sm font-medium bg-green-50 dark:bg-green-950/30 text-green-600 hover:bg-green-100">
            Known
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      className="space-y-5 w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Flashcards</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateDeck(true)}
          className="px-3 py-1.5 btn-primary rounded-lg text-sm font-medium flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          New Deck
        </motion.button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 bg-foreground/5 rounded-xl animate-pulse" />)}</div>
      ) : decks.length === 0 ? (
        <div className="text-center py-12">
          <SparklesIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/60 text-sm">No flashcard decks yet. Create your first deck to start studying!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {decks.map((deck) => (
            <motion.div
              key={deck.id}
              className="subtle-card rounded-xl p-4 flex items-center justify-between"
              whileHover={{ y: -2 }}
            >
              <div>
                <h3 className="font-semibold text-sm">{deck.title}</h3>
                <p className="text-xs text-foreground/50">{deck.subject}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startStudy(deck.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20">
                  Study
                </button>
                <button onClick={() => handleDeleteDeck(deck.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreateDeck && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateDeck(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-strong rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Create Deck</h3>
              <div className="space-y-3">
                <input value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} placeholder="Deck title" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                <input value={deckSubject} onChange={(e) => setDeckSubject(e.target.value)} placeholder="Subject" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
                <input value={deckDescription} onChange={(e) => setDeckDescription(e.target.value)} placeholder="Description (optional)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setShowCreateDeck(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-foreground/5">Cancel</button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCreateDeck} disabled={saving} className="px-4 py-2 btn-primary rounded-xl text-sm disabled:opacity-50">Create</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

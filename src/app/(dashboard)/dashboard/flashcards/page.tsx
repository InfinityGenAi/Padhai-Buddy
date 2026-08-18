"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { playFlashcardFlip, playTaskComplete } from "@/lib/sounds";

type FlashcardView = "decks" | "deckDetail" | "study";
type CardStatus = "new" | "learning" | "known" | "difficult";

export default function FlashcardsPage() {
  const { user, preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [view, setView] = useState<FlashcardView>("decks");
  const [decks, setDecks] = useState<{ id: string; title: string; subject: string; description?: string }[]>([]);
  const [cards, setCards] = useState<{ id: string; front: string; back: string; status: CardStatus }[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeDeckTitle, setActiveDeckTitle] = useState("");

  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("");
  const [deckDescription, setDeckDescription] = useState("");

  const [showAddCard, setShowAddCard] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editStatus, setEditStatus] = useState<CardStatus>("new");

  const currentCard = cards[currentCardIndex];

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
        const res = await fetch("/api/flashcards", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setDecks(data.decks || []);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load decks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const fetchCards = async (deckId: string) => {
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch(`/api/flashcards?deckId=${deckId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCards(data.cards || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    }
  };

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
      setSuccess("Deck created");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create deck");
    } finally {
      setSaving(false);
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
      setSuccess("Deck deleted");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete deck");
    }
  };

  const handleAddCard = async () => {
    if (!activeDeckId || !cardFront.trim() || !cardBack.trim()) return;
    setSaving(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "addCard", deckId: activeDeckId, front: cardFront, back: cardBack, status: "new" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCards([...cards, data.card]);
      setShowAddCard(false);
      setCardFront("");
      setCardBack("");
      setSuccess("Card added");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add card");
    } finally {
      setSaving(false);
    }
  };

  const startEditCard = (card: { id: string; front: string; back: string; status: CardStatus }) => {
    setEditingCardId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditStatus(card.status);
  };

  const handleUpdateCard = async () => {
    if (!activeDeckId || !editingCardId) return;
    setSaving(true);
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "updateCard", deckId: activeDeckId, cardId: editingCardId, front: editFront, back: editBack, status: editStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCards(cards.map((c) => (c.id === editingCardId ? { ...c, front: editFront, back: editBack, status: editStatus } : c)));
      setEditingCardId(null);
      setEditFront("");
      setEditBack("");
      setEditStatus("new");
      setSuccess("Card updated");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update card");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Delete this card?")) return;
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "deleteCard", deckId: activeDeckId!, cardId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCards(cards.filter((c) => c.id !== cardId));
      if (currentCardIndex >= cards.length - 1 && cards.length > 1) {
        setCurrentCardIndex(cards.length - 2);
      }
      setSuccess("Card deleted");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete card");
    }
  };

  const markCard = async (status: CardStatus) => {
    if (!activeDeckId || !currentCard) return;
    const optimistic = { ...currentCard, status };
    setCards(cards.map((c) => (c.id === currentCard.id ? optimistic : c)));
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      setIsFlipped(false);
    }
    try {
      const token = await (await import("@/lib/auth-utils")).getFirebaseIdToken();
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "updateCard", deckId: activeDeckId, cardId: currentCard.id, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("Status saved");
      setTimeout(() => setSuccess(null), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
      setCards(cards.map((c) => (c.id === currentCard.id ? currentCard : c)));
    }
  };

  const openDeck = (deck: { id: string; title: string }) => {
    setActiveDeckId(deck.id);
    setActiveDeckTitle(deck.title);
    setView("deckDetail");
    setLoading(true);
    fetchCards(deck.id).finally(() => setLoading(false));
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
      const studyCards = data.cards || [];
      setCards(studyCards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setView("study");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
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

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
            {success}
          </motion.div>
        )}

        <div className="[perspective:1200px]">
          <motion.div
            onClick={() => { if (preferences.soundEnabled) playFlashcardFlip(); setIsFlipped(!isFlipped); }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: animationsEnabled ? 0.45 : 0, ease: "easeInOut" }}
            className="subtle-card rounded-2xl p-8 min-h-[200px] relative cursor-pointer [transform-style:preserve-3d]"
            whileHover={animationsEnabled ? { scale: 1.01 } : undefined}
          >
            <div className="absolute inset-0 flex items-center justify-center p-8 [backface-visibility:hidden]">
              <p className="text-center text-lg font-medium">{currentCard.front}</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center p-8 [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <p className="text-center text-lg font-medium">{currentCard.back}</p>
            </div>
          </motion.div>
        </div>

        <div className="flex gap-2 justify-center">
          <button onClick={() => { if (preferences.soundEnabled) playTaskComplete(); markCard("difficult"); }} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100">
            Difficult
          </button>
          <button onClick={() => { if (preferences.soundEnabled) playTaskComplete(); markCard("known"); }} className="px-4 py-2 rounded-xl text-sm font-medium bg-green-50 dark:bg-green-950/30 text-green-600 hover:bg-green-100">
            Known
          </button>
        </div>
      </motion.div>
    );
  }

  if (view === "deckDetail" && activeDeckId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 w-full"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { setView("decks"); setActiveDeckId(null); }} className="text-sm text-foreground/60 hover:text-foreground mr-2">
              <ArrowPathIcon className="w-4 h-4 rotate-180" />
            </button>
            <SparklesIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">{activeDeckTitle}</h1>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddCard(true)}
              className="px-3 py-1.5 btn-primary rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Add Card
            </motion.button>
            <button onClick={() => handleDeleteDeck(activeDeckId)} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
            {success}
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-foreground/5 rounded-xl animate-pulse" />)}</div>
        ) : cards.length === 0 ? (
          <div className="text-center py-12">
            <SparklesIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
            <p className="text-foreground/60 text-sm">No cards yet. Add your first card to start studying!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <motion.div
                key={card.id}
                className="subtle-card rounded-xl p-4"
                whileHover={{ y: -1 }}
              >
                {editingCardId === card.id ? (
                  <div className="space-y-3">
                    <input
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      placeholder="Front"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      placeholder="Back"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                    />
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as CardStatus)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="new">New</option>
                      <option value="learning">Learning</option>
                      <option value="known">Known</option>
                      <option value="difficult">Difficult</option>
                    </select>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingCardId(null)} className="px-4 py-2 rounded-xl text-sm hover:bg-foreground/5">Cancel</button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleUpdateCard} disabled={saving} className="px-4 py-2 btn-primary rounded-xl text-sm disabled:opacity-50">Save</motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{card.front}</p>
                      <p className="text-xs text-foreground/50 truncate">{card.back}</p>
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/60 capitalize">{card.status}</span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => startStudy(activeDeckId)} className="p-1.5 rounded-lg text-foreground/40 hover:text-primary" title="Study">
                        <SparklesIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => startEditCard(card)} className="p-1.5 rounded-lg text-foreground/40 hover:text-blue-500" title="Edit">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCard(card.id)} className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showAddCard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowAddCard(false); }}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-strong rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold mb-4">Add Card</h3>
                <div className="space-y-3">
                  <textarea value={cardFront} onChange={(e) => setCardFront(e.target.value)} placeholder="Front (question)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" rows={3} />
                  <textarea value={cardBack} onChange={(e) => setCardBack(e.target.value)} placeholder="Back (answer)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" rows={3} />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setShowAddCard(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-foreground/5">Cancel</button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddCard} disabled={saving} className="px-4 py-2 btn-primary rounded-xl text-sm disabled:opacity-50">Add</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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

      {success && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          {success}
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
                <button onClick={() => openDeck(deck)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground/5 text-foreground/60 hover:text-foreground">
                  Manage
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

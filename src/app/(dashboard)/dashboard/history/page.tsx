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
  getDocs,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClockIcon,
  ChevronDownIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { playDeleteSuccess } from "@/lib/sounds";
import type { Doubt, Conversation, ChatMessage } from "@/types";

function getTimestampMs(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toDate().getTime();
  if (typeof ts === "number") return ts;
  return Date.now();
}

function formatShortTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = diffMs / (1000 * 60);
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${Math.floor(diffMins)}m ago`;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getConversationTitle(title: string): string {
  if (!title) return "New Chat";
  if (title.length <= 30) return title;
  return title.slice(0, 27).trimEnd() + "...";
}

export default function HistoryPage() {
  const { user, preferences } = useAuth();
  const [tab, setTab] = useState<"doubts" | "chats">("doubts");
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuDoubtId, setMenuDoubtId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<ChatMessage[]>([]);
  const [convMessagesLoading, setConvMessagesLoading] = useState(false);
  const [chatDeleteConfirmId, setChatDeleteConfirmId] = useState<string | null>(null);
  const [chatDeletingId, setChatDeletingId] = useState<string | null>(null);
  const [deleteAllChatsOpen, setDeleteAllChatsOpen] = useState(false);
  const [deletingAllChats, setDeletingAllChats] = useState(false);
  const [search, setSearch] = useState("");

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
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          question: data.question,
          answer: data.answer,
          type: data.type,
          createdAt: data.createdAt?.toDate?.()?.getTime?.() || data.createdAt,
        });
      });
      setDoubts(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestoreDb();
    if (!db) return;

    const q = query(
      collection(db, "users", user.uid, "conversations"),
      orderBy("updatedAt", "desc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          title: data.title || "New Chat",
          createdAt: getTimestampMs(data.createdAt),
          updatedAt: getTimestampMs(data.updatedAt),
          lastMessage: data.lastMessage || "",
        });
      });
      setConversations(items);
      setConversationsLoaded(true);
    });

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuDoubtId && target instanceof Element && target.closest('[data-menu-doubt]')) {
        return;
      }
      setMenuDoubtId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuDoubtId]);

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
    if (!db || !user?.uid) throw new Error("Missing database or user");
    const ref = doc(db, "users", user.uid, "doubts", doubtId);
    await deleteDoc(ref);
  };

  const optimisticallyDeleteDoubt = async (doubtId: string) => {
    setDeletingId(doubtId);
    setDeleteConfirmId(null);
    try {
      await deleteDoubt(doubtId);
      setDoubts((prev) => prev.filter((d) => d.id !== doubtId));
      if (expandedId === doubtId) {
        setExpandedId(null);
      }
      if (preferences.soundEnabled) playDeleteSuccess();
    } catch {
      setHistoryError("Failed to delete history entry. Please try again.");
      setTimeout(() => setHistoryError(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllHistory = async () => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;

    setDeletingAll(true);
    try {
      const q = query(
        collection(db, "users", user.uid, "doubts"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setDoubts([]);
      setDeleteAllOpen(false);
      setHistoryError(null);
      if (preferences.soundEnabled) playDeleteSuccess();
    } catch {
      setHistoryError("Failed to clear history. Please try again.");
      setTimeout(() => setHistoryError(null), 4000);
    } finally {
      setDeletingAll(false);
    }
  };

  const toggleConversation = async (id: string) => {
    if (expandedConvId === id) {
      setExpandedConvId(null);
      setConvMessages([]);
      return;
    }
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;
    setExpandedConvId(id);
    setConvMessagesLoading(true);
    setConvMessages([]);
    try {
      const q = query(
        collection(db, "users", user.uid, "conversations", id, "messages"),
        orderBy("createdAt", "asc"),
      );
      const snapshot = await getDocs(q);
      const msgs: ChatMessage[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        msgs.push({
          id: d.id,
          role: data.role,
          content: data.content,
          createdAt: getTimestampMs(data.createdAt),
        });
      });
      setConvMessages(msgs);
    } catch {
      setHistoryError("Failed to load chat messages. Please try again.");
      setTimeout(() => setHistoryError(null), 4000);
    } finally {
      setConvMessagesLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;
    const convRef = doc(db, "users", user.uid, "conversations", conversationId);
    const messagesSnap = await getDocs(
      query(collection(convRef, "messages"), orderBy("createdAt", "asc")),
    );
    const refs = messagesSnap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      refs.slice(i, i + 450).forEach((r) => batch.delete(r));
      await batch.commit();
    }
    await deleteDoc(convRef);
  };

  const optimisticallyDeleteConversation = async (conversationId: string) => {
    setChatDeletingId(conversationId);
    setChatDeleteConfirmId(null);
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (expandedConvId === conversationId) {
        setExpandedConvId(null);
        setConvMessages([]);
      }
      if (preferences.soundEnabled) playDeleteSuccess();
    } catch {
      setHistoryError("Failed to delete chat. Please try again.");
      setTimeout(() => setHistoryError(null), 4000);
    } finally {
      setChatDeletingId(null);
    }
  };

  const deleteAllChats = async () => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;

    setDeletingAllChats(true);
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "users", user.uid, "conversations"),
          orderBy("updatedAt", "desc"),
        ),
      );
      for (const convDoc of snapshot.docs) {
        const messagesSnap = await getDocs(
          query(collection(convDoc.ref, "messages"), orderBy("createdAt", "asc")),
        );
        const refs = messagesSnap.docs.map((d) => d.ref);
        for (let i = 0; i < refs.length; i += 450) {
          const batch = writeBatch(db);
          refs.slice(i, i + 450).forEach((r) => batch.delete(r));
          await batch.commit();
        }
      }
      const convRefs = snapshot.docs.map((d) => d.ref);
      for (let i = 0; i < convRefs.length; i += 450) {
        const batch = writeBatch(db);
        convRefs.slice(i, i + 450).forEach((r) => batch.delete(r));
        await batch.commit();
      }
      setConversations([]);
      setExpandedConvId(null);
      setConvMessages([]);
      setDeleteAllChatsOpen(false);
      setHistoryError(null);
      if (preferences.soundEnabled) playDeleteSuccess();
    } catch {
      setHistoryError("Failed to clear chat history. Please try again.");
      setTimeout(() => setHistoryError(null), 4000);
    } finally {
      setDeletingAllChats(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="mb-4 flex items-center gap-2">
          <ClockIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">History</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass card-subtle rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-foreground/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-foreground/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tabButtonClass = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
    }`;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredDoubts = normalizedSearch
    ? doubts.filter((d) =>
        `${d.type === "photo" ? "Photo Doubt" : d.question} ${d.answer}`.toLowerCase().includes(normalizedSearch)
      )
    : doubts;
  const filteredConversations = normalizedSearch
    ? conversations.filter((c) =>
        `${c.title} ${c.lastMessage || ""}`.toLowerCase().includes(normalizedSearch)
      )
    : conversations;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <ClockIcon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">History</h1>
        </div>
        {tab === "doubts" && doubts.length > 0 && (
          <button
            onClick={() => setDeleteAllOpen(true)}
            className="text-xs font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-950/20 transition-colors"
          >
            Delete All
          </button>
        )}
        {tab === "chats" && conversations.length > 0 && (
          <button
            onClick={() => setDeleteAllChatsOpen(true)}
            className="text-xs font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-950/20 transition-colors"
          >
            Delete All
          </button>
        )}
      </motion.div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("doubts")}
          className={tabButtonClass(tab === "doubts")}
        >
          Doubts ({doubts.length})
        </button>
        <button
          onClick={() => setTab("chats")}
          className={tabButtonClass(tab === "chats")}
        >
          Chats ({conversations.length})
        </button>
      </div>

      <div className="relative mb-4">
        <MagnifyingGlassIcon className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "doubts" ? "Search your doubts..." : "Search your chats..."}
          className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Search history"
        />
      </div>

      {historyError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm"
        >
          {historyError}
        </motion.div>
      )}

      {tab === "doubts" && (
        <>
          {doubts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <ClockIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
              <p className="text-foreground/60">
                You haven&apos;t solved any doubts yet. Start a chat or upload a photo
                to begin!
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {filteredDoubts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <MagnifyingGlassIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
                  <p className="text-foreground/60">
                    No doubts match your search.
                  </p>
                </motion.div>
              ) : (
              filteredDoubts.map((doubt) => (
                <motion.div
                  key={doubt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass card-subtle rounded-xl overflow-hidden"
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
? "bg-purple-950/30 text-purple-300"
        : "bg-blue-950/30 text-blue-300"
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
                      <div className="absolute right-2 top-12 bg-card border border-border rounded-xl shadow-lg py-1 z-10 min-w-[120px]" data-menu-doubt>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(doubt.id);
                            setMenuDoubtId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-950/20 transition-colors flex items-center gap-2"
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
              )))}
            </AnimatePresence>
          )}
        </>
      )}

      {tab === "chats" && (
        <>
          {!conversationsLoaded && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass card-subtle rounded-xl p-4 animate-pulse"
                >
                  <div className="h-4 bg-foreground/10 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-foreground/10 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {conversationsLoaded && conversations.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
               <p className="text-foreground/60">
                 No chats yet. Start a chat to begin!
               </p>
            </motion.div>
          )}

          <AnimatePresence>
            {filteredConversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <MagnifyingGlassIcon className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
                <p className="text-foreground/60">
                  No chats match your search.
                </p>
              </motion.div>
            ) : (
            filteredConversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass card-subtle rounded-xl overflow-hidden"
              >
                <div className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleConversation(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleConversation(conv.id);
                      }
                    }}
                    className="w-full p-4 text-left hover:bg-foreground/3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-950/30 text-purple-300">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-3 h-3 mr-1" />
                            Chat
                          </span>
                          <span className="text-xs text-foreground/50">
                            {formatShortTime(conv.updatedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground/90 truncate">
                          {getConversationTitle(conv.title)}
                        </p>
                        <p className="text-xs text-foreground/50 truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setChatDeleteConfirmId(
                              chatDeleteConfirmId === conv.id ? null : conv.id,
                            );
                          }}
                          className="p-1 rounded-md hover:bg-foreground/5 text-foreground/60 transition-all"
                          aria-label="Delete chat"
                          title="Delete chat"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </motion.button>
                        <ChevronDownIcon
                          className={`w-4 h-4 text-foreground/40 transition-transform ${
                            expandedConvId === conv.id ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {expandedConvId === conv.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border p-4 space-y-3"
                    >
                      {convMessagesLoading && (
                        <div className="flex items-center justify-center gap-2 py-4 text-foreground/50 text-sm">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Loading messages...
                        </div>
                      )}
                      {!convMessagesLoading &&
                        convMessages.length === 0 && (
                          <p className="text-sm text-foreground/50 text-center py-2">
                            No messages in this chat.
                          </p>
                        )}
                      {convMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap max-w-[80%] ${
                              msg.role === "user"
                                ? "bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-tr-sm"
                                : "bg-foreground/5 text-foreground rounded-tl-sm"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
</div>
                </motion.div>
              )))}
          </AnimatePresence>
        </>
      )}

      {/* Delete Single Doubt Confirmation Modal */}
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
                  whileHover={{ scale: deletingId === deleteConfirmId ? 1 : 1.05 }}
                  whileTap={{ scale: deletingId === deleteConfirmId ? 1 : 0.95 }}
                  onClick={() => {
                    if (deleteConfirmId && deletingId !== deleteConfirmId) {
                      optimisticallyDeleteDoubt(deleteConfirmId);
                    }
                  }}
                  disabled={deletingId === deleteConfirmId}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === deleteConfirmId ? "Deleting..." : "Delete"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Chat Confirmation Modal */}
      <AnimatePresence>
        {chatDeleteConfirmId && (
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
              <h3 className="text-lg font-semibold mb-2">Delete Chat</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Are you sure you want to delete this chat? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setChatDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: chatDeletingId === chatDeleteConfirmId ? 1 : 1.05 }}
                  whileTap={{ scale: chatDeletingId === chatDeleteConfirmId ? 1 : 0.95 }}
                  onClick={() => {
                    if (chatDeleteConfirmId && chatDeletingId !== chatDeleteConfirmId) {
                      optimisticallyDeleteConversation(chatDeleteConfirmId);
                    }
                  }}
                  disabled={chatDeletingId === chatDeleteConfirmId}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chatDeletingId === chatDeleteConfirmId ? "Deleting..." : "Delete"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete All Doubts Confirmation Modal */}
      <AnimatePresence>
        {deleteAllOpen && (
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
              <h3 className="text-lg font-semibold mb-2">Delete All History</h3>
              <p className="text-sm text-foreground/70 mb-4">
                This will permanently delete all your doubt history. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteAllOpen(false)}
                  disabled={deletingAll}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: deletingAll ? 1 : 1.05 }}
                  whileTap={{ scale: deletingAll ? 1 : 0.95 }}
                  onClick={deleteAllHistory}
                  disabled={deletingAll}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAll ? "Deleting..." : "Delete All"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete All Chats Confirmation Modal */}
      <AnimatePresence>
        {deleteAllChatsOpen && (
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
              <h3 className="text-lg font-semibold mb-2">Delete All Chats</h3>
              <p className="text-sm text-foreground/70 mb-4">
                This will permanently delete all your chat history. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteAllChatsOpen(false)}
                  disabled={deletingAllChats}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: deletingAllChats ? 1 : 1.05 }}
                  whileTap={{ scale: deletingAllChats ? 1 : 0.95 }}
                  onClick={deleteAllChats}
                  disabled={deletingAllChats}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAllChats ? "Deleting..." : "Delete All"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseIdToken } from "@/lib/auth-utils";
import { getFirestoreDb } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  onSnapshot,
  updateDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  Cog6ToothIcon,
  TrashIcon,
  XMarkIcon,
  Bars3Icon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import type { ChatMessage, Conversation, UserPreferences } from "@/types";

function getTimestampMs(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toDate().getTime();
  if (typeof ts === "number") return ts;
  return Date.now();
}

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return win.AudioContext || win.webkitAudioContext || null;
}

function playSendSound(volume: number) {
  try {
    const Ctor = getAudioContextConstructor();
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // ignore audio errors
  }
}

function playReceiveSound(volume: number) {
  try {
    const Ctor = getAudioContextConstructor();
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.setValueAtTime(700, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore audio errors
  }
}

function getConversationTitle(title: string): string {
  if (!title) return "New Chat";
  if (title.length <= 30) return title;
  return title.slice(0, 27).trimEnd() + "...";
}

function generateConversationTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 30) return cleaned;
  return cleaned.slice(0, 27).trimEnd() + "...";
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

export default function ChatPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === "undefined") {
      return {
        soundEnabled: true,
        animationsEnabled: true,
        fontSize: "medium",
      };
    }
    try {
      const raw = localStorage.getItem("padhai-buddy-preferences");
      if (raw) {
        return { ...{ soundEnabled: true, animationsEnabled: true, fontSize: "medium" }, ...JSON.parse(raw) };
      }
    } catch {
      // ignore
    }
    return {
      soundEnabled: true,
      animationsEnabled: true,
      fontSize: "medium",
    };
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [editBoardOpen, setEditBoardOpen] = useState(false);
  const [tempClass, setTempClass] = useState<string>(String(user?.class || "10"));
  const [tempBoard, setTempBoard] = useState<string>(user?.board || "CBSE");
  const [menuConvId, setMenuConvId] = useState<string | null>(null);
  const [renameConvId, setRenameConvId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("padhai-buddy-preferences", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const handleClickOutside = () => setMenuConvId(null);
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (!user?.uid || !activeConversationId) {
      return;
    }
    const db = getFirestoreDb();
    if (!db) return;

    const q = query(
      collection(db, "users", user.uid, "conversations", activeConversationId, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          role: data.role,
          content: data.content,
          createdAt: getTimestampMs(data.createdAt),
        });
      });
      setMessages(msgs);
      setMessagesLoaded(true);
    });

    return () => unsub();
  }, [user?.uid, activeConversationId]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setMessagesLoaded(true);
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setMessages([]);
    setMessagesLoaded(false);
    setMenuConvId(null);
    setSidebarOpen(false);
  }, []);

  const renameConversation = async (conversationId: string, newTitle: string) => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;
    await updateDoc(doc(db, "users", user.uid, "conversations", conversationId), {
      title: newTitle.trim() || "Untitled Chat",
    });
    setRenameConvId(null);
  };

  const deleteConversation = async (conversationId: string) => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;

    const convRef = doc(db, "users", user.uid, "conversations", conversationId);
    const messagesRef = collection(convRef, "messages");

    try {
      const messagesSnap = await getDocs(query(messagesRef, orderBy("createdAt", "asc")));
      const deletePromises = messagesSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      await deleteDoc(convRef);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }

    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    setDeleteConfirmId(null);
  };

  const optimisticallyDeleteConversation = (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    setDeleteConfirmId(null);
    deleteConversation(conversationId);
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping || !user) return;

    let conversationId = activeConversationId;

    if (!conversationId) {
      const db = getFirestoreDb();
      if (!db) return;

      const newConvRef = await addDoc(
        collection(db, "users", user.uid, "conversations"),
        {
          title: generateConversationTitle(input.trim()),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: input.trim().slice(0, 60),
        },
      );
      conversationId = newConvRef.id;
      setActiveConversationId(conversationId);
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    if (preferences.soundEnabled) {
      playSendSound(0.5);
    }

    try {
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          class: user.class,
          board: user.board,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: data.answer,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (preferences.soundEnabled) {
        playReceiveSound(0.5);
      }

      const db = getFirestoreDb();
      if (db) {
        await addDoc(
          collection(db, "users", user.uid, "conversations", conversationId!, "messages"),
          { ...userMessage, createdAt: serverTimestamp() },
        );
        await addDoc(
          collection(db, "users", user.uid, "conversations", conversationId!, "messages"),
          { ...aiMessage, createdAt: serverTimestamp() },
        );
        await updateDoc(doc(db, "users", user.uid, "conversations", conversationId!), {
          updatedAt: serverTimestamp(),
          lastMessage: aiMessage.content.slice(0, 60),
        });
      }
    } catch {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content:
          "Sorry, I couldn't connect to the AI service. Please check your connection and try again.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearAllHistory = async () => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;

    const deletePromises = conversations.map((c) =>
      deleteDoc(doc(db, "users", user.uid, "conversations", c.id)),
    );
    await Promise.all(deletePromises);
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setSettingsOpen(false);
  };

  const updateUserBoardClass = async () => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;
    const cls = Number(tempClass) as 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    const board = tempBoard as "CBSE" | "ICSE" | "State Board";
    await updateDoc(doc(db, "users", user.uid), { class: cls, board });
    setEditBoardOpen(false);
    setSettingsOpen(false);
  };

  const fontSizeClass =
    preferences.fontSize === "small"
      ? "text-xs"
      : preferences.fontSize === "large"
        ? "text-base"
        : "text-sm";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl py-2.5 font-medium text-sm hover:shadow-lg transition-shadow"
        >
          <PlusIcon className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!conversationsLoaded && (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-foreground/5 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}
        <AnimatePresence initial={false}>
          {conversations.map((conv) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => selectConversation(conv.id)}
              className={`group relative flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b border-transparent ${
                activeConversationId === conv.id
                  ? "bg-primary/10 border-border/50"
                  : "hover:bg-foreground/5 border-transparent"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  activeConversationId === conv.id
                    ? "text-primary"
                    : "text-foreground/80"
                }`}>
                  {getConversationTitle(conv.title)}
                </p>
                <p className="text-xs text-foreground/40 mt-0.5">
                  {formatShortTime(conv.updatedAt)}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuConvId(menuConvId === conv.id ? null : conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-foreground/5 text-foreground/60 transition-all"
              >
                <EllipsisVerticalIcon className="w-4 h-4" />
              </motion.button>
              {menuConvId === conv.id && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameConvId(conv.id);
                      setTempTitle(getConversationTitle(conv.title).replace(/\.{3}$/, ""));
                      setMenuConvId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-foreground/5 transition-colors flex items-center gap-2"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(conv.id);
                      setMenuConvId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {conversationsLoaded && conversations.length === 0 && (
          <div className="text-center py-8 text-foreground/40 text-xs px-2">
            No conversations yet
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full relative">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 lg:hidden shadow-xl"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h2 className="font-semibold text-sm">Conversations</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-foreground/5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex w-72 flex-col border-r border-border bg-card/50 h-full"
      >
        {sidebarContent}
      </motion.aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-foreground/5"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <SparklesIcon className="w-6 h-6 text-primary flex-shrink-0" />
          <h1 className="text-xl font-semibold truncate">Chat Doubt</h1>
          <div className="ml-auto flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={startNewChat}
              className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors"
              title="New Chat"
            >
              <PlusIcon className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        <div
          className={`flex-1 overflow-y-auto space-y-3 pb-4 ${
            preferences.animationsEnabled ? "" : ""
          }`}
        >
          {!messagesLoaded && messages.length === 0 && (
            <div className="text-center py-8 text-foreground/50">
              {activeConversationId ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p>Loading messages...</p>
                </div>
              ) : (
                <>
                  <p className="mb-1">Start a conversation to ask study questions</p>
                  <p className="text-xs">
                    Padhai Buddy will help you understand step by step
                  </p>
                </>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.createdAt || idx}
                initial={preferences.animationsEnabled ? { opacity: 0, y: 10 } : false}
                animate={preferences.animationsEnabled ? { opacity: 1, y: 0 } : false}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl whitespace-pre-wrap ${fontSizeClass} ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 bg-foreground/40 rounded-full"
                      animate={{
                        y: [0, -4, 0],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border pt-3 sm:pt-4">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question here..."
              className={`flex-1 resize-none bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 ${fontSizeClass}`}
              rows={1}
              maxLength={1000}
              disabled={isTyping}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="px-4 py-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow flex items-center gap-2 self-end"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </motion.button>
          </div>
        </div>
      </div>

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
              <h3 className="text-lg font-semibold mb-2">Delete Chat</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Are you sure you want to delete this chat? This action cannot be undone.
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
                  onClick={() => optimisticallyDeleteConversation(deleteConfirmId!)}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Conversation Modal */}
      <AnimatePresence>
        {renameConvId && (
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
              <h3 className="text-lg font-semibold mb-4">Rename Chat</h3>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameConversation(renameConvId, tempTitle);
                  }
                }}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                autoFocus
                maxLength={60}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRenameConvId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => renameConversation(renameConvId!, tempTitle)}
                  className="px-4 py-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Cog6ToothIcon className="w-5 h-5 text-primary" />
                  Settings
                </h3>
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    setEditBoardOpen(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-foreground/5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Sound toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {preferences.soundEnabled ? (
                      <SpeakerWaveIcon className="w-5 h-5 text-foreground/60" />
                    ) : (
                      <SpeakerXMarkIcon className="w-5 h-5 text-foreground/60" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Sound Effects</p>
                      <p className="text-xs text-foreground/50">
                        {preferences.soundEnabled ? "On" : "Off"}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setPreferences((p) => ({ ...p, soundEnabled: !p.soundEnabled }))
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      preferences.soundEnabled ? "bg-primary" : "bg-foreground/20"
                    }`}
                  >
                    <motion.div
                      animate={{ x: preferences.soundEnabled ? 20 : 2 }}
                      transition={{ type: "spring", damping: 15, stiffness: 200 }}
                      className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                    />
                  </motion.button>
                </div>

                {/* Animations toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SparklesIcon className="w-5 h-5 text-foreground/60" />
                    <div>
                      <p className="text-sm font-medium">Animations</p>
                      <p className="text-xs text-foreground/50">
                        {preferences.animationsEnabled ? "On" : "Off"}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() =>
                      setPreferences((p) => ({
                        ...p,
                        animationsEnabled: !p.animationsEnabled,
                      }))
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      preferences.animationsEnabled ? "bg-primary" : "bg-foreground/20"
                    }`}
                  >
                    <motion.div
                      animate={{ x: preferences.animationsEnabled ? 20 : 2 }}
                      transition={{ type: "spring", damping: 15, stiffness: 200 }}
                      className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                    />
                  </motion.button>
                </div>

                {/* Font size */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Font Size</p>
                    <p className="text-xs text-foreground/50 capitalize">
                      {preferences.fontSize}
                    </p>
                  </div>
                  <div className="flex gap-1 bg-foreground/5 rounded-lg p-1">
                    {(["small", "medium", "large"] as const).map((size) => (
                      <motion.button
                        key={size}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPreferences((p) => ({ ...p, fontSize: size }))
                        }
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          preferences.fontSize === size
                            ? "bg-primary text-white"
                            : "text-foreground/60 hover:text-foreground"
                        }`}
                      >
                        {size === "small" ? "S" : size === "medium" ? "M" : "L"}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Class & Board */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium mb-2">Your Profile</p>
                  <div className="flex items-center justify-between bg-foreground/5 rounded-xl p-3">
                    <div>
                      <p className="text-sm text-foreground/80">
                        Class {user?.class} — {user?.board}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {user?.name}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setTempClass(String(user?.class || "10"));
                        setTempBoard(user?.board || "CBSE");
                        setEditBoardOpen(true);
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      Edit
                    </motion.button>
                  </div>
                </div>

                {/* Clear history */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium mb-2">Danger Zone</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete all chat history? This cannot be undone.",
                        )
                      ) {
                        clearAllHistory();
                      }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Clear All Chat History
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Board/Class Modal */}
      <AnimatePresence>
        {editBoardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-4">Edit Class & Board</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Class</label>
                  <select
                    value={tempClass}
                    onChange={(e) => setTempClass(e.target.value)}
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
                    value={tempBoard}
                    onChange={(e) => setTempBoard(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => setEditBoardOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={updateUserBoardClass}
                  className="px-4 py-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-1"
                >
                  <CheckIcon className="w-4 h-4" />
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

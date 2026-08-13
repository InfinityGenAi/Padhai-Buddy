"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { getFirebaseIdToken } from "@/lib/auth-utils";
import { getFirestoreDb } from "@/lib/firebase";
import {
  collection,
  doc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  onSnapshot,
  updateDoc,
  getDocs,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  PlusIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
  Bars3Icon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { playSend, playReceive, playCopy, playError } from "@/lib/sounds";
import type { ChatMessage, Conversation } from "@/types";

function getTimestampMs(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toDate().getTime();
  if (typeof ts === "number") return ts;
  return Date.now();
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

function getConversationDateLabel(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return "Earlier";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

async function copyToClipboard(text: string, msgId: string, onCopied: (id: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    playCopy();
    onCopied(msgId);
    setTimeout(() => onCopied(""), 1500);
  } catch {
    // ignore clipboard errors
  }
}

function ChatEmptyState() {
  const reduced = useReducedMotion();
  const anim = !reduced;
  return (
    <motion.div
      initial={anim ? { opacity: 0, y: 10 } : false}
      animate={anim ? { opacity: 1, y: 0 } : false}
      className="flex flex-col items-center justify-center h-full text-center px-4"
    >
      <motion.div
        className="relative mb-6"
        animate={anim ? { y: [0, -10, 0] } : undefined}
        transition={anim ? { duration: 5, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <SparklesIcon className="w-10 h-10 text-white" />
        </div>
        <motion.div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 opacity-20 blur-xl"
          animate={anim ? { scale: [1, 1.15, 1] } : undefined}
          transition={anim ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined}
        />
      </motion.div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Start a New Conversation</h3>
      <p className="text-sm text-foreground/60 max-w-sm">
        Ask Padhai Buddy any study question — we&apos;ll explain it step by step, tailored to your class and board.
      </p>
    </motion.div>
  );
}

export default function ChatPage() {
  const { user, preferences } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [renameConvId, setRenameConvId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingMessages = useRef<Map<string, ChatMessage>>(new Map());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isInitialLoadRef = useRef(false);
  const userScrolledUpRef = useRef(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const generateId = useCallback(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  const checkIfNearBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return true;
    const threshold = 80;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const nearBottom = checkIfNearBottom();
      userScrolledUpRef.current = !nearBottom;
      shouldAutoScrollRef.current = nearBottom;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkIfNearBottom]);

  useEffect(() => {
    if (!preferences.autoScroll) return;
    if (shouldAutoScrollRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages, isTyping, preferences.autoScroll, scrollToBottom]);

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
      const syncedTempIds = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const msg: ChatMessage = {
          id: doc.id,
          role: data.role,
          content: data.content,
          createdAt: getTimestampMs(data.createdAt),
        };
        msgs.push(msg);

        if (data.tempId && pendingMessages.current.has(data.tempId)) {
          syncedTempIds.add(data.tempId);
        }
      });

      syncedTempIds.forEach((tempId) => pendingMessages.current.delete(tempId));

      const remainingPending = Array.from(pendingMessages.current.values());
      const merged = [...msgs, ...remainingPending].sort(
        (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
      );

      setMessages(merged);
      setMessagesLoaded(true);

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        shouldAutoScrollRef.current = true;
        scrollToBottom("auto");
      }
    });

    return () => unsub();
  }, [user?.uid, activeConversationId, scrollToBottom]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setMessagesLoaded(true);
    pendingMessages.current.clear();
    setSidebarOpen(false);
    shouldAutoScrollRef.current = true;
    userScrolledUpRef.current = false;
    isInitialLoadRef.current = false;
    textareaRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (searchParams.get("new") === "1") {
      flushSync(() => {
        startNewChat();
      });
      router.replace("/dashboard/chat", { scroll: false });
    }
  }, [searchParams, router, startNewChat]);

  useEffect(() => {
    if (!activeConversationId && messages.length === 0) {
      textareaRef.current?.focus();
    }
  }, [activeConversationId, messages.length]);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setMessages([]);
    setMessagesLoaded(false);
    pendingMessages.current.clear();
    setSidebarOpen(false);
    isInitialLoadRef.current = true;
    shouldAutoScrollRef.current = true;
    userScrolledUpRef.current = false;
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

    const messagesSnap = await getDocs(query(messagesRef, orderBy("createdAt", "asc")));
    const deletePromises = messagesSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await deleteDoc(convRef);
  };

  const optimisticallyDeleteConversation = async (conversationId: string) => {
    setDeleteConfirmId(null);
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
        pendingMessages.current.clear();
      }
    } catch {
      setChatError("Failed to delete conversation. Please try again.");
      setTimeout(() => setChatError(null), 4000);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping || !user) return;

    if (!user.class || !user.board) {
      setMessages((prev) => [...prev, {
        id: generateId(),
        role: "assistant",
        content: "Please complete your profile by selecting your class and board in settings.",
        createdAt: Date.now(),
      }]);
      shouldAutoScrollRef.current = true;
      return;
    }

    shouldAutoScrollRef.current = true;
    userScrolledUpRef.current = false;

    let conversationId = activeConversationId;
    const db = getFirestoreDb();
    if (!db) return;

    if (!conversationId) {
      const conversationsCol = collection(db, "users", user.uid, "conversations");
      const newConvRef = doc(conversationsCol);
      conversationId = newConvRef.id;
    }

    const userMessage: ChatMessage = {
      id: `temp-${generateId()}`,
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };
    pendingMessages.current.set(userMessage.id, userMessage);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    if (preferences.soundEnabled) {
      playSend();
    }

    let aiMessage: ChatMessage | null = null;

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
          responseStyle: preferences.responseStyle,
          stepByStep: preferences.stepByStep,
          language: preferences.language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      aiMessage = {
        id: `temp-${generateId()}`,
        role: "assistant",
        content: data.answer,
        createdAt: Date.now(),
      };
      pendingMessages.current.set(aiMessage.id, aiMessage);
      if (aiMessage) {
        const msg = aiMessage;
        setMessages((prev) => [...prev, msg]);
      }

      if (preferences.soundEnabled) {
        playReceive();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (preferences.soundEnabled) {
        playError();
      }
      pendingMessages.current.clear();
      if (process.env.NODE_ENV === "development") {
        console.error("[CHAT CLIENT] AI request failed:", error);
      }
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          process.env.NODE_ENV === "development"
            ? `Error: ${error.message}`
            : "Sorry, I couldn't connect to the AI service. Please check your connection and try again.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsTyping(false);
      return;
    }

    if (!aiMessage || !conversationId) {
      setIsTyping(false);
      return;
    }

    try {
      const messagesCol = collection(db, "users", user.uid, "conversations", conversationId, "messages");
      const userMsgRef = doc(messagesCol);
      const aiMsgRef = doc(messagesCol);
      const convRef = doc(db, "users", user.uid, "conversations", conversationId);

      const batch = writeBatch(db);

      if (!activeConversationId) {
        batch.set(convRef, {
          title: generateConversationTitle(userMessage.content),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: aiMessage.content.slice(0, 60),
        });
      }

      batch.set(userMsgRef, { ...userMessage, createdAt: serverTimestamp(), tempId: userMessage.id });
      batch.set(aiMsgRef, { ...aiMessage, createdAt: serverTimestamp(), tempId: aiMessage.id });
      batch.update(convRef, {
        updatedAt: serverTimestamp(),
        lastMessage: aiMessage.content.slice(0, 60),
      });

      await batch.commit();
      setActiveConversationId(conversationId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (preferences.soundEnabled) {
        playError();
      }
      pendingMessages.current.delete(aiMessage.id);
      if (process.env.NODE_ENV === "development") {
        console.error("[CHAT CLIENT] Firestore save failed:", error);
      }
      const warningMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "Answer generated, but conversation could not be saved. Please try again.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, warningMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && preferences.enterToSend) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/50">
        <motion.button
          id="new-chat-btn"
          whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
          whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-xl py-2.5 font-medium text-sm hover:shadow-lg transition-shadow"
        >
          <PlusIcon className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!conversationsLoaded && (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-foreground/5 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {conversationsLoaded && conversations.length === 0 && (
          <div className="text-center py-8 px-4 text-foreground/40 text-xs">
            No conversations yet. Start a new chat to begin!
          </div>
        )}
        <AnimatePresence initial={false}>
          {conversations.map((conv, idx) => {
            const isActive = activeConversationId === conv.id;
            const showDateLabel =
              idx === 0 ||
              getConversationDateLabel(conv.updatedAt) !==
                getConversationDateLabel(conversations[idx - 1].updatedAt);
            const dateLabel = getConversationDateLabel(conv.updatedAt);

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {showDateLabel && (
                  <div className="px-3 pt-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                      {dateLabel}
                    </span>
                  </div>
                )}
                <div
                  onClick={() => selectConversation(conv.id)}
                  className={`group relative flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all rounded-xl mx-2 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-foreground/5 text-foreground/80"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? "text-primary" : "text-foreground/80"
                      }`}
                    >
                      {getConversationTitle(conv.title)}
                    </p>
                    <p className="text-[11px] text-foreground/40 mt-0.5 truncate">
                      {formatShortTime(conv.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameConvId(conv.id);
                        setTempTitle(getConversationTitle(conv.title).replace(/\.{3}$/, ""));
                      }}
                      className="p-1 rounded-md hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-colors"
                      aria-label="Rename chat"
                      title="Rename"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(conv.id);
                      }}
                      className="p-1 rounded-md hover:bg-foreground/5 text-foreground/60 hover:text-red-500 transition-colors"
                      aria-label="Delete chat"
                      title="Delete"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 w-1 h-5 rounded-r-full bg-primary"
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );

  const chatContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const chatItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={animationsEnabled ? chatContainerVariants : undefined}
      initial={animationsEnabled ? "hidden" : undefined}
      animate={animationsEnabled ? "visible" : undefined}
      className="h-full flex"
    >
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 border-r border-border z-50 lg:hidden shadow-xl bg-card"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <h2 className="font-semibold text-sm">Conversations</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-foreground/5"
                  aria-label="Close conversations"
                  title="Close"
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
        variants={chatItemVariants}
        className="hidden lg:flex w-80 flex-col h-full border-r border-border bg-card"
      >
        {sidebarContent}
      </motion.aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full min-w-0 px-4 sm:px-6">
        {chatError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
          >
            {chatError}
          </motion.div>
        )}
        <motion.div
          variants={chatItemVariants}
          className="flex items-center gap-3 mb-3"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-foreground/5"
            aria-label="Open conversations"
            title="Open conversations"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <SparklesIcon className="w-6 h-6 text-primary flex-shrink-0" />
          <h1 className="text-xl font-semibold truncate">Chat Doubt</h1>
          <div className="ml-auto flex items-center gap-1">
            <motion.button
              whileHover={animationsEnabled ? { scale: 1.1 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.9 } : undefined}
              onClick={startNewChat}
              className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors"
              aria-label="New chat"
              title="New Chat"
            >
              <PlusIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* Messages area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 pb-6">
          {!messagesLoaded && messages.length === 0 && (
            <div className="text-center py-8 text-foreground/50">
              {activeConversationId ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p>Loading messages...</p>
                </div>
              ) : (
                <ChatEmptyState />
              )}
            </div>
          )}

          {messagesLoaded && messages.length === 0 && !activeConversationId && (
            <ChatEmptyState />
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
                  initial={animationsEnabled ? { opacity: 0, y: 8 } : false}
                  animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: animationsEnabled ? Math.min(idx * 0.03, 0.3) : 0 }}
                  className={`flex gap-2.5 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-md">
                        <SparklesIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className={`group relative ${isUser ? "max-w-[75%] sm:max-w-[65%]" : "max-w-[75%] sm:max-w-[65%]"}`}>
                    <div
                      className={`px-4 py-3 whitespace-pre-wrap text-sm ${
                        isUser
                          ? "bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-2xl rounded-tr-sm"
                          : "glass card-subtle text-foreground rounded-2xl rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {!isUser && (
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id, setCopiedMsgId)}
                        className={`mt-1 ml-0.5 p-1.5 rounded-md flex items-center gap-1 text-xs transition-all ${
                          copiedMsgId === msg.id
                            ? "opacity-100 text-primary"
                            : "opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-foreground hover:bg-foreground/5"
                        }`}
                        aria-label="Copy response"
                        title={copiedMsgId === msg.id ? "Copied" : "Copy response"}
                      >
                        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                        <span className="font-medium">
                          {copiedMsgId === msg.id ? "Copied" : "Copy"}
                        </span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={animationsEnabled ? { opacity: 0 } : false}
              animate={animationsEnabled ? { opacity: 1 } : false}
              className="flex gap-2.5 justify-start"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-md">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="glass card-subtle px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 bg-foreground/40 rounded-full"
                      animate={animationsEnabled ? {
                        y: [0, -4, 0],
                        opacity: [0.4, 1, 0.4],
                      } : {}}
                      transition={animationsEnabled ? {
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut",
                      } : {}}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <motion.div
          variants={chatItemVariants}
          className="border-t border-border/50 pt-3 pb-2"
        >
          <div className="flex items-end gap-2 glass-strong rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question here..."
              className="flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm min-h-[40px] max-h-[160px] py-2"
              rows={1}
              maxLength={1000}
              disabled={isTyping}
            />
            <motion.button
              whileHover={animationsEnabled ? { scale: 1.08 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.92 } : undefined}
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow flex-shrink-0 self-end mb-0.5"
              aria-label="Send message"
              title="Send"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
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
                  whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.95 } : undefined}
                  onClick={() => {
                    optimisticallyDeleteConversation(deleteConfirmId!);
                  }}
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
                  whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.95 } : undefined}
                  onClick={() => renameConversation(renameConvId!, tempTitle)}
                  className="px-4 py-2 bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Save
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

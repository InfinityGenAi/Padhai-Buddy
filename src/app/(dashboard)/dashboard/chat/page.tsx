"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import React from "react";
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
  addDoc,
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
  PhotoIcon,
  LightBulbIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  SparklesIcon as SparklesSolidIcon,
  DocumentTextIcon,
  TrophyIcon,
  BookmarkIcon,
  ArrowPathIcon,
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

async function saveItem(
  uid: string,
  content: string,
  type: "explanation" | "question",
  sourceMessageId: string,
  conversationId: string
) {
  const db = getFirestoreDb();
  if (!db) return;
  const savedRef = collection(db, "users", uid, "savedItems");
  await addDoc(savedRef, {
    content,
    type,
    sourceMessageId,
    conversationId,
    createdAt: Date.now(),
  });
}



function ChatEmptyState({ studyModes }: { studyModes: readonly { id: string; label: string }[] }) {
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
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg">
          <SparklesIcon className="w-10 h-10 text-white" />
        </div>
        <motion.div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 opacity-20 blur-xl"
          animate={anim ? { scale: [1, 1.15, 1] } : undefined}
          transition={anim ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined}
        />
      </motion.div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Start a New Conversation</h3>
      <p className="text-sm text-foreground/60 max-w-sm mb-6">
        Ask Padhai Buddy any study question — we&apos;ll explain it step by step, tailored to your class and board.
      </p>
      <div className="w-full max-w-sm space-y-2 text-left">
        <p className="text-xs font-medium text-foreground/60">Try asking:</p>
        <ul className="space-y-1.5 text-sm text-foreground/70" role="list">
          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />&ldquo;Explain photosynthesis for Class 10&rdquo;</li>
          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />&ldquo;Help me solve this quadratic equation&rdquo;</li>
          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />&ldquo;Quiz me on periodic table trends&rdquo;</li>
        </ul>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs font-medium text-foreground/60 mb-2">Choose a Study Mode:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {studyModes.slice(0, 4).map((mode) => (
              <span key={mode.id} className="px-2 py-1 text-[10px] bg-card-subtle rounded-full text-foreground/70">
                {mode.label}
              </span>
            ))}
            <span className="px-2 py-1 text-[10px] bg-card-subtle rounded-full text-foreground/50">+3 more</span>
          </div>
        </div>
      </div>
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
  const [studyMode, setStudyMode] = useState<string | null>(null);
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set());
  const [generatingSimilar, setGeneratingSimilar] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingMessages = useRef<Map<string, ChatMessage>>(new Map());
  const pendingConversationId = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isInitialLoadRef = useRef(false);
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const pinnedScrollTopRef = useRef<number | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    if (behavior === "smooth" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const studyModes = [
    { id: "explain", label: "Explain", description: "Clear, simple explanation", icon: LightBulbIcon },
    { id: "teach", label: "Teach Me", description: "Step-by-step teaching with questions", icon: AcademicCapIcon },
    { id: "quiz", label: "Quiz Me", description: "Interactive quiz on the topic", icon: QuestionMarkCircleIcon },
    { id: "hint", label: "Give Hint", description: "Gentle clue to guide thinking", icon: MagnifyingGlassIcon },
    { id: "simplify", label: "Simplify", description: "Simple analogies & everyday examples", icon: SparklesSolidIcon },
    { id: "deep", label: "Deep Explanation", description: "Thorough with derivations & context", icon: DocumentTextIcon },
    { id: "exam", label: "Exam Mode", description: "Exam-oriented key points & patterns", icon: TrophyIcon },
  ] as const;

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const container = chatContainerRef.current;
      if (!container) return;
      const scrollTop = container.scrollTop;
      const prevScrollTop = lastScrollTopRef.current;
      lastScrollTopRef.current = scrollTop;
      if (scrollTop < prevScrollTop) {
        shouldAutoScrollRef.current = false;
        userScrolledUpRef.current = true;
        pinnedScrollTopRef.current = scrollTop;
      } else if (scrollTop > prevScrollTop) {
        const atBottom =
          container.scrollHeight - scrollTop - container.clientHeight <= 2;
        shouldAutoScrollRef.current = atBottom;
        userScrolledUpRef.current = !atBottom;
        if (atBottom) {
          pinnedScrollTopRef.current = null;
        } else {
          pinnedScrollTopRef.current = scrollTop;
        }
      } else {
        // Same scrollTop as before (scroll events can coalesce): only keep
        // auto-scroll if we are actually at the very bottom.
        const atBottom =
          container.scrollHeight - scrollTop - container.clientHeight <= 2;
        if (!atBottom) {
          shouldAutoScrollRef.current = false;
          userScrolledUpRef.current = true;
          pinnedScrollTopRef.current = scrollTop;
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    if (!preferences.autoScroll) return;
    if (shouldAutoScrollRef.current) {
      scrollToBottom("auto");
    } else if (pinnedScrollTopRef.current !== null) {
      const container = chatContainerRef.current;
      if (container && container.scrollTop !== pinnedScrollTopRef.current) {
        container.scrollTop = pinnedScrollTopRef.current;
      }
      const input = textareaRef.current;
      if (input && document.activeElement === input) {
        input.blur();
      }
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
          tempId: data.tempId,
        };
        msgs.push(msg);

        if (data.tempId && pendingMessages.current.has(data.tempId)) {
          syncedTempIds.add(data.tempId);
        }
      });

      syncedTempIds.forEach((tempId) => pendingMessages.current.delete(tempId));

      const prev = messagesRef.current;
      const pendingById = new Map(pendingMessages.current);
      const merged: ChatMessage[] = [];

      for (const prevMsg of prev) {
        const tempId = prevMsg.tempId;
        const isTemp = !!tempId && tempId === prevMsg.id;
        if (isTemp && !syncedTempIds.has(tempId) && !pendingById.has(prevMsg.id)) {
          continue;
        }
        if (isTemp && syncedTempIds.has(tempId)) {
          const twin = msgs.find((m) => m.tempId === tempId);
          if (twin) merged.push(twin);
        } else {
          merged.push(prevMsg);
        }
      }

      const mergedIds = new Set(merged.map((m) => m.id));
      const newDocs = msgs.filter((m) => !mergedIds.has(m.id));
      newDocs.sort((a, b) => {
        const ta = a.createdAt || 0;
        const tb = b.createdAt || 0;
        if (ta !== tb) return ta - tb;
        const ra = a.role === "user" ? 0 : 1;
        const rb = b.role === "user" ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
      merged.push(...newDocs);

      for (const pendingMsg of pendingById.values()) {
        if (!mergedIds.has(pendingMsg.id)) merged.push(pendingMsg);
      }

      messagesRef.current = merged;
      setMessages(merged);
      setMessagesLoaded(true);

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        shouldAutoScrollRef.current = true;
        scrollToBottom("auto");
      }    });

    return () => unsub();
  }, [user?.uid, activeConversationId, scrollToBottom]);

  // Escape key handler for closing modals
  // Keyboard shortcuts: N = New Chat, Esc = Close modals
  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    messagesRef.current = [];
    setMessagesLoaded(true);
    pendingMessages.current.clear();
    pendingConversationId.current = null;
    setSidebarOpen(false);
    shouldAutoScrollRef.current = true;
    userScrolledUpRef.current = false;
    lastScrollTopRef.current = 0;
    pinnedScrollTopRef.current = null;
    isInitialLoadRef.current = false;
    setStudyMode(null);
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (renameConvId) setRenameConvId(null);
        if (deleteConfirmId) setDeleteConfirmId(null);
        if (sidebarOpen) setSidebarOpen(false);
        return;
      }
      if (e.key === "n" || e.key === "N") {
        // Ignore if user is typing in an input/textarea
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
          return;
        }
        e.preventDefault();
        startNewChat();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [renameConvId, deleteConfirmId, sidebarOpen, startNewChat]);

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
    messagesRef.current = [];
    setMessagesLoaded(false);
    pendingMessages.current.clear();
    pendingConversationId.current = null;
    setSidebarOpen(false);
    isInitialLoadRef.current = true;
    shouldAutoScrollRef.current = true;
    userScrolledUpRef.current = false;
    lastScrollTopRef.current = 0;
    pinnedScrollTopRef.current = null;
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
    const refs = messagesSnap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      refs.slice(i, i + 450).forEach((r) => batch.delete(r));
      await batch.commit();
    }
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
        messagesRef.current = [];
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
      const profileMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "Please complete your profile by selecting your class and board in settings.",
        createdAt: Date.now(),
      };
      messagesRef.current = [...messagesRef.current, profileMsg];
      setMessages((prev) => [...prev, profileMsg]);
      shouldAutoScrollRef.current = true;
      return;
    }

    shouldAutoScrollRef.current = true;
    userScrolledUpRef.current = false;
    lastScrollTopRef.current = 0;
    pinnedScrollTopRef.current = null;

    let conversationId = activeConversationId;
    const db = getFirestoreDb();
    if (!db) return;

    if (!conversationId) {
      if (pendingConversationId.current) {
        conversationId = pendingConversationId.current;
      } else {
        const conversationsCol = collection(db, "users", user.uid, "conversations");
        const newConvRef = doc(conversationsCol);
        conversationId = newConvRef.id;
        pendingConversationId.current = conversationId;
      }
    }

    const userMessage: ChatMessage = {
      id: `temp-${generateId()}`,
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };
    userMessage.tempId = userMessage.id;
    pendingMessages.current.set(userMessage.id, userMessage);
    messagesRef.current = [...messagesRef.current, userMessage];
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
            studyMode: studyMode,
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
      aiMessage.tempId = aiMessage.id;
      pendingMessages.current.set(aiMessage.id, aiMessage);
      if (aiMessage) {
        const msg = aiMessage;
        messagesRef.current = [...messagesRef.current, msg];
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
      messagesRef.current = [...messagesRef.current, errorMsg];
      setMessages((prev) => [...prev, errorMsg]);
      setIsTyping(false);
      return;
    }

    if (!aiMessage || !conversationId) {
      setIsTyping(false);
      return;
    }

    try {
      const convRef = doc(db, "users", user.uid, "conversations", conversationId);
      const messagesCol = collection(db, "users", user.uid, "conversations", conversationId, "messages");

      // Persist the user message (and the conversation doc for a new chat)
      // FIRST, so it survives even if the AI save fails afterwards, and so
      // the two commits receive strictly increasing server timestamps.
      const userBatch = writeBatch(db);
      if (!activeConversationId) {
        userBatch.set(convRef, {
          title: generateConversationTitle(userMessage.content),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: userMessage.content.slice(0, 60),
        });
      }
      userBatch.set(doc(messagesCol), {
        ...userMessage,
        createdAt: serverTimestamp(),
        tempId: userMessage.id,
      });
      await userBatch.commit();
      setActiveConversationId(conversationId);
      pendingConversationId.current = null;

      // Then persist the AI answer and refresh the conversation metadata.
      const aiBatch = writeBatch(db);
      aiBatch.set(doc(messagesCol), {
        ...aiMessage,
        createdAt: serverTimestamp(),
        tempId: aiMessage.id,
      });
      aiBatch.update(convRef, {
        updatedAt: serverTimestamp(),
        lastMessage: aiMessage.content.slice(0, 60),
      });
      await aiBatch.commit();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (preferences.soundEnabled) {
        playError();
      }
      pendingMessages.current.delete(userMessage.id);
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
      messagesRef.current = [...messagesRef.current, warningMsg];
      setMessages((prev) => [...prev, warningMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && preferences.enterToSend) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Focus visible styles for better keyboard navigation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      *:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
      button:focus-visible,
      textarea:focus-visible,
      input:focus-visible,
      [role="button"]:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleSave = async (msgId: string, content: string) => {
    if (!user?.uid || !activeConversationId) return;
    if (savedMsgIds.has(msgId)) {
      // Would need to find the savedItemId to unsave - for now just toggle local state
      // In a full implementation, we'd query the savedItems collection
      setSavedMsgIds((prev) => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
      return;
    }
    try {
      await saveItem(user.uid, content, "explanation", msgId, activeConversationId);
      setSavedMsgIds((prev) => {
        const next = new Set(prev);
        next.add(msgId);
        return next;
      });
    } catch {
      setChatError("Failed to save. Please try again.");
      setTimeout(() => setChatError(null), 4000);
    }
  };

  const handleSimilarQuestion = async (msgId: string, content: string) => {
    if (!user || !activeConversationId || !user.class || !user.board || isTyping) return;
    setGeneratingSimilar((prev) => {
      const next = new Set(prev);
      next.add(msgId);
      return next;
    });
    try {
      const token = await getFirebaseIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: `Generate a similar practice question based on this explanation. Make it a clear, standalone question that tests the same concept. Do not provide the answer, just the question.\n\nExplanation: ${content}`,
          class: user.class,
          board: user.board,
          responseStyle: preferences.responseStyle,
          stepByStep: preferences.stepByStep,
          language: preferences.language,
          studyMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate question");
      const question = data.answer;
      // Send the generated question as a user message to continue the conversation
      setInput(question);
      sendMessage();
    } catch {
      setChatError("Failed to generate similar question. Please try again.");
      setTimeout(() => setChatError(null), 4000);
    } finally {
      setGeneratingSimilar((prev) => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
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
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-indigo-600 text-white rounded-xl py-2.5 font-medium text-sm hover:shadow-lg transition-shadow"
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
            className="mb-3 p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-400 text-sm"
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate text-foreground">
              Padhai Buddy AI Tutor
            </h1>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <p className="text-[11px] text-foreground/45">Online</p>
            </div>
          </div>
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

        {/* Study Mode Selector */}
        <motion.div
          variants={animationsEnabled ? { hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } } : undefined}
          className="mb-3"
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:px-6">
            {studyModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setStudyMode(studyMode === mode.id ? null : mode.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  studyMode === mode.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card-subtle text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
                aria-pressed={studyMode === mode.id}
                title={mode.description}
              >
                <mode.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
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
                <ChatEmptyState studyModes={studyModes} />
              )}
            </div>
          )}

          {messagesLoaded && messages.length === 0 && !activeConversationId && (
            <ChatEmptyState studyModes={studyModes} />
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.tempId || msg.id}
                  initial={animationsEnabled ? { opacity: 0 } : false}
                  animate={animationsEnabled ? { opacity: 1 } : false}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
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
                      className={`px-4 py-3 whitespace-pre-wrap text-sm prose prose-sm max-w-none ${
                        isUser
                          ? "bg-gradient-to-br from-primary to-indigo-600 text-white rounded-2xl rounded-tr-sm"
                          : "glass card-subtle text-foreground rounded-2xl rounded-tl-sm"
                      }`}
                    >
                      <div className="prose prose-sm max-w-none">
                        {msg.content.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-2 last:mb-0">
                            {paragraph.split('\n').map((line, lineIdx) => (
                              <React.Fragment key={lineIdx}>
                                {line.trim().startsWith('```') ? (
                                  <pre key={lineIdx} className="bg-foreground/5 rounded-lg p-3 overflow-x-auto my-2">
                                    <code className="text-xs font-mono text-foreground/90">{line.replace(/```/g, '')}</code>
                                  </pre>
                                ) : line.trim().startsWith('**') && line.trim().endsWith('**') ? (
                                  <strong key={lineIdx} className="block mb-1">{line.replace(/\*\*/g, '')}</strong>
                                ) : (
                                  <span key={lineIdx}>{line}</span>
                                )}
                                {lineIdx < paragraph.split('\n').length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </p>
                        ))}
                      </div>
                    </div>
                    {!isUser && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id, setCopiedMsgId)}
                          className={`p-2 rounded-lg flex items-center gap-1.5 text-xs transition-all min-h-[44px] min-w-[44px] ${
                            copiedMsgId === msg.id
                              ? "bg-primary/10 text-primary"
                              : "text-primary bg-primary/10 hover:text-white hover:bg-primary/80 transition-colors"
                          }`}
                          aria-label="Copy response"
                          title={copiedMsgId === msg.id ? "Copied" : "Copy response"}
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                          <span className="font-medium hidden sm:inline">
                            {copiedMsgId === msg.id ? "Copied" : "Copy"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleSave(msg.id, msg.content)}
                          disabled={!activeConversationId}
                          className={`p-2 rounded-lg flex items-center gap-1.5 text-xs transition-all min-h-[44px] min-w-[44px] ${
                            savedMsgIds.has(msg.id)
                              ? "bg-primary/10 text-primary"
                              : "text-primary bg-primary/10 hover:text-white hover:bg-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          }`}
                          aria-label={savedMsgIds.has(msg.id) ? "Unsave" : "Save"}
                          title={savedMsgIds.has(msg.id) ? "Saved" : "Save"}
                        >
                          <BookmarkIcon className="w-4 h-4" />
                          <span className="font-medium hidden sm:inline">
                            {savedMsgIds.has(msg.id) ? "Saved" : "Save"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleSimilarQuestion(msg.id, msg.content)}
                          disabled={!activeConversationId || isTyping || generatingSimilar.has(msg.id)}
                          className={`p-2 rounded-lg flex items-center gap-1.5 text-xs transition-all min-h-[44px] min-w-[44px] ${
                            generatingSimilar.has(msg.id)
                              ? "bg-primary/10 text-primary cursor-wait"
                              : "text-primary bg-primary/10 hover:text-white hover:bg-primary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          }`}
                          aria-label="Similar Question"
                          title={generatingSimilar.has(msg.id) ? "Generating..." : "Similar Question"}
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                          <span className="font-medium hidden sm:inline">
                            {generatingSimilar.has(msg.id) ? "Generating..." : "Similar"}
                          </span>
                        </button>
                      </div>
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="glass card-subtle px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground/60">Padhai Buddy is thinking</span>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 bg-primary/60 rounded-full"
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
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2 glass-strong rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question here..."
                className="flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm min-h-[40px] max-h-[160px] py-2 pr-8"
                rows={1}
                maxLength={1000}
                disabled={isTyping}
              />
              <Link
                href="/dashboard/photo-doubt"
                className="p-2.5 rounded-xl text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0 self-end mb-0.5"
                aria-label="Photo doubt"
                title="Solve a photo doubt"
              >
                <PhotoIcon className="w-5 h-5" />
              </Link>
              <motion.button
                whileHover={animationsEnabled ? { scale: 1.08 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.92 } : undefined}
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow flex-shrink-0 self-end mb-0.5"
                aria-label="Send message"
                title="Send"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </motion.button>
            </div>
            <div className="flex items-center justify-between px-2 text-[10px] text-foreground/40">
              <span>{input.length}/1000</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[9px] bg-foreground/5 rounded text-foreground/60 border border-border/50">Enter</kbd>
                <span className="text-foreground/40">to send</span>
                <kbd className="px-1.5 py-0.5 text-[9px] bg-foreground/5 rounded text-foreground/60 border border-border/50 ml-1">Shift</kbd>
                <kbd className="px-1.5 py-0.5 text-[9px] bg-foreground/5 rounded text-foreground/60 border border-border/50 ml-0.5">+</kbd>
                <kbd className="px-1.5 py-0.5 text-[9px] bg-foreground/5 rounded text-foreground/60 border border-border/50 ml-0.5">Enter</kbd>
                <span className="text-foreground/40">for new line</span>
              </span>
            </div>
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





























































































































































































































































































































































































































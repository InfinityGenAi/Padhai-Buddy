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
  PencilSquareIcon,
  DocumentDuplicateIcon,
  SunIcon,
  BellIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { playSend, playReceive, playCopy, playError } from "@/lib/sounds";
import {
  revokeSession,
  revokeAllOtherSessions,
  changePassword,
  deleteAccount,
  fetchSessions,
} from "@/lib/sessions";
import type { ChatMessage, Conversation, UserPreferences, UserSession } from "@/types";

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

export default function ChatPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === "undefined") {
      return {
        soundEnabled: true,
        animationsEnabled: true,
        theme: "light",
        notificationsEnabled: true,
        enterToSend: true,
        autoScroll: true,
        responseStyle: "balanced",
        stepByStep: true,
        language: "english",
      };
    }
    try {
      const raw = localStorage.getItem("padhai-buddy-preferences");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.theme === "system") parsed.theme = "light";
        return {
          ...{
            soundEnabled: true,
            animationsEnabled: true,
            theme: "light",
            notificationsEnabled: true,
            enterToSend: true,
            autoScroll: true,
            responseStyle: "balanced",
            stepByStep: true,
            language: "english",
          },
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    return {
      soundEnabled: true,
      animationsEnabled: true,
      theme: "light",
      notificationsEnabled: true,
      enterToSend: true,
      autoScroll: true,
      responseStyle: "balanced",
      stepByStep: true,
      language: "english",
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
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false);
  const [tempClass, setTempClass] = useState<string>(String(user?.class || "10"));
  const [tempBoard, setTempBoard] = useState<string>(user?.board || "CBSE");
  const [renameConvId, setRenameConvId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempPhotoUrl, setTempPhotoUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingMessages = useRef<Map<string, ChatMessage>>(new Map());

  const generateId = useCallback(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  useEffect(() => {
    localStorage.setItem("padhai-buddy-preferences", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [preferences.theme]);

    useEffect(() => {
     if (!preferences.autoScroll) return;
     if (messagesEndRef.current) {
       messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
     }
   }, [messages, isTyping, preferences.autoScroll]);

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
    });

    return () => unsub();
  }, [user?.uid, activeConversationId]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    async function initSession() {
      const { registerSession, fetchSessions } = await import(
        "@/lib/sessions"
      );
      if (cancelled) return;
      await registerSession();
      if (cancelled) return;
      const sessionList = await fetchSessions();
      if (!cancelled) {
        setSessions(sessionList);
      }
    }

    initSession();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setMessagesLoaded(true);
    pendingMessages.current.clear();
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setMessages([]);
    setMessagesLoaded(false);
    pendingMessages.current.clear();
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
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      alert("Failed to delete conversation. Please try again.");
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
      return;
    }

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

      const aiMessage: ChatMessage = {
        id: `temp-${generateId()}`,
        role: "assistant",
        content: data.answer,
        createdAt: Date.now(),
      };
      pendingMessages.current.set(aiMessage.id, aiMessage);
      setMessages((prev) => [...prev, aiMessage]);

      if (preferences.soundEnabled) {
        playReceive();
      }

      const db = getFirestoreDb();
      if (db) {
        await addDoc(
          collection(db, "users", user.uid, "conversations", conversationId!, "messages"),
          { ...userMessage, createdAt: serverTimestamp(), tempId: userMessage.id },
        );
        await addDoc(
          collection(db, "users", user.uid, "conversations", conversationId!, "messages"),
          { ...aiMessage, createdAt: serverTimestamp(), tempId: aiMessage.id },
        );
        await updateDoc(doc(db, "users", user.uid, "conversations", conversationId!), {
          updatedAt: serverTimestamp(),
          lastMessage: aiMessage.content.slice(0, 60),
        });
      }
    } catch {
      if (preferences.soundEnabled) {
        playError();
      }
      pendingMessages.current.clear();
      const errorMsg: ChatMessage = {
        id: generateId(),
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
    if (e.key === "Enter" && !e.shiftKey && preferences.enterToSend) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearAllHistory = async () => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;

    const deletePromises = conversations.map(async (c) => {
      const convRef = doc(db, "users", user.uid, "conversations", c.id);
      const messagesRef = collection(convRef, "messages");

      const messagesSnap = await getDocs(query(messagesRef, orderBy("createdAt", "asc")));
      const messageDeletePromises = messagesSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(messageDeletePromises);
      await deleteDoc(convRef);
    });

    try {
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Failed to clear all history:", err);
      alert("Failed to clear all history. Please try again.");
    }
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setSettingsOpen(false);
    setClearHistoryConfirmOpen(false);
  };

  const updateUserProfile = async () => {
    const db = getFirestoreDb();
    if (!db || !user?.uid) return;
    const updates: Record<string, unknown> = {
      name: tempName.trim() || user.name,
      class: Number(tempClass) as 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      board: tempBoard as "CBSE" | "ICSE" | "State Board",
    };
    if (tempPhotoUrl.trim()) {
      updates.photoURL = tempPhotoUrl.trim();
    }
    await updateDoc(doc(db, "users", user.uid), updates);
    setEditProfileOpen(false);
    setSettingsOpen(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to revoke session:", err);
      alert(err instanceof Error ? err.message : "Failed to revoke session");
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await revokeAllOtherSessions();
      setSessions((prev) => prev.filter((s) => s.current));
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
      alert(err instanceof Error ? err.message : "Failed to revoke sessions");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Change password error:", err);
      alert(err instanceof Error ? err.message : "Failed to change password");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountPassword) return;
    try {
      await deleteAccount(deleteAccountPassword);
      setDeleteAccountOpen(false);
      setDeleteAccountPassword("");
    } catch (err) {
      console.error("Delete account error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete account");
    }
  };

  const refreshSessions = async () => {
    setSessionsLoading(true);
    try {
      const sessionList = await fetchSessions();
      setSessions(sessionList);
    } finally {
      setSessionsLoading(false);
    }
  };

  const openEditProfile = () => {
    setTempName(user?.name || "");
    setTempClass(String(user?.class || "10"));
    setTempBoard(user?.board || "CBSE");
    setTempPhotoUrl(user?.photoURL || "");
    setEditProfileOpen(true);
  };

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
                className="h-10 bg-foreground/5 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}
        {conversationsLoaded && conversations.length === 0 && (
          <div className="text-center py-8 text-foreground/40 text-xs px-2">
            No conversations yet
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
                  className={`group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10"
                      : "hover:bg-foreground/5"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive
                          ? "text-primary"
                          : "text-foreground/80"
                      }`}
                    >
                      {getConversationTitle(conv.title)}
                    </p>
                    <p className="text-[11px] text-foreground/40 mt-0.5">
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
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="h-full flex">
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
               className="fixed inset-y-0 left-0 w-80 border-r border-border z-50 lg:hidden shadow-xl"
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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex w-80 flex-col h-full border-r border-border"
      >
        {sidebarContent}
      </motion.aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full min-w-0 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={startNewChat}
              className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors"
              aria-label="New chat"
              title="New Chat"
            >
              <PlusIcon className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Open settings"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* Messages area — flex-1, scrolls independently, fills remaining height */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-6">
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
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id}
                  initial={preferences.animationsEnabled ? { opacity: 0, y: 8 } : false}
                  animate={preferences.animationsEnabled ? { opacity: 1, y: 0 } : false}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2.5 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <SparklesIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className={`group ${isUser ? "max-w-[75%] sm:max-w-[65%]" : "max-w-[75%] sm:max-w-[65%]"}`}>
                    <div
                      className={`px-4 py-3 whitespace-pre-wrap text-sm ${
                        isUser
                          ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-2xl rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {!isUser && (
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id, setCopiedMsgId)}
                        className={`mt-1 ml-0.5 p-1 rounded-md bg-card border border-border text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all opacity-0 group-hover:opacity-100 ${
                          copiedMsgId === msg.id ? "opacity-100 text-primary" : ""
                        }`}
                        aria-label="Copy response"
                        title={copiedMsgId === msg.id ? "Copied" : "Copy response"}
                      >
                        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] ml-0.5 font-medium">
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2.5 justify-start"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm">
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

        {/* Input bar — fixed height, outside the scrollable messages area */}
        <div className="border-t border-border pt-3 sm:pt-4 pb-2">
          <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-shadow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question here..."
               className={`flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm min-h-[40px] max-h-[160px] py-2`}
              rows={1}
              maxLength={1000}
              disabled={isTyping}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow flex-shrink-0 self-end"
              aria-label="Send message"
              title="Send"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
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
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSettingsOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Cog6ToothIcon className="w-5 h-5 text-primary" />
                  Settings
                </h3>
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
                  aria-label="Close settings"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
                {/* GENERAL */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                    General
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <SunIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Appearance</p>
                          <p className="text-xs text-foreground/50 truncate">
                            Choose how Padhai Buddy looks
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 bg-foreground/5 rounded-lg p-1 flex-shrink-0">
                        {(["light", "dark"] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() =>
                              setPreferences((p) => ({ ...p, theme: opt }))
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                              preferences.theme === opt
                                ? "bg-primary text-white"
                                : "text-foreground/60 hover:text-foreground"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {preferences.soundEnabled ? (
                          <SpeakerWaveIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        ) : (
                          <SpeakerXMarkIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Sound Effects</p>
                          <p className="text-xs text-foreground/50 truncate">
                            Play sounds for chat actions
                          </p>
                        </div>
                      </div>
                      <motion.button
                        role="switch"
                        aria-checked={preferences.soundEnabled}
                        aria-label="Sound Effects"
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPreferences((p) => ({
                            ...p,
                            soundEnabled: !p.soundEnabled,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          preferences.soundEnabled
                            ? "bg-primary"
                            : "bg-foreground/20"
                        }`}
                      >
                        <motion.div
                          animate={{ x: preferences.soundEnabled ? 20 : 2 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 200,
                          }}
                          className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                        />
                      </motion.button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <SparklesIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Animations</p>
                          <p className="text-xs text-foreground/50 truncate">
                            Enable interface animations
                          </p>
                        </div>
                      </div>
                      <motion.button
                        role="switch"
                        aria-checked={preferences.animationsEnabled}
                        aria-label="Animations"
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPreferences((p) => ({
                            ...p,
                            animationsEnabled: !p.animationsEnabled,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          preferences.animationsEnabled
                            ? "bg-primary"
                            : "bg-foreground/20"
                        }`}
                      >
                        <motion.div
                          animate={{ x: preferences.animationsEnabled ? 20 : 2 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 200,
                          }}
                          className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                        />
                      </motion.button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <BellIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Notifications</p>
                          <p className="text-xs text-foreground/50 truncate">
                            Show in-app notifications
                          </p>
                        </div>
                      </div>
                      <motion.button
                        role="switch"
                        aria-checked={preferences.notificationsEnabled}
                        aria-label="Notifications"
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPreferences((p) => ({
                            ...p,
                            notificationsEnabled: !p.notificationsEnabled,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          preferences.notificationsEnabled
                            ? "bg-primary"
                            : "bg-foreground/20"
                        }`}
                      >
                        <motion.div
                          animate={{ x: preferences.notificationsEnabled ? 20 : 2 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 200,
                          }}
                          className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* CHAT */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                    Chat
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <ArrowRightIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Enter to Send</p>
                          <p className="text-xs text-foreground/50 truncate">
                            Press Enter to send, Shift+Enter for new line
                          </p>
                        </div>
                      </div>
                      <motion.button
                        role="switch"
                        aria-checked={preferences.enterToSend}
                        aria-label="Enter to Send"
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPreferences((p) => ({
                            ...p,
                            enterToSend: !p.enterToSend,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          preferences.enterToSend
                            ? "bg-primary"
                            : "bg-foreground/20"
                        }`}
                      >
                        <motion.div
                          animate={{ x: preferences.enterToSend ? 20 : 2 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 200,
                          }}
                          className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                        />
                      </motion.button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <ArrowDownIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Auto Scroll</p>
                          <p className="text-xs text-foreground/50 truncate">
                            Automatically scroll to new messages
                          </p>
                        </div>
                      </div>
                      <motion.button
                        role="switch"
                        aria-checked={preferences.autoScroll}
                        aria-label="Auto Scroll"
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPreferences((p) => ({
                            ...p,
                            autoScroll: !p.autoScroll,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          preferences.autoScroll
                            ? "bg-primary"
                            : "bg-foreground/20"
                        }`}
                      >
                        <motion.div
                          animate={{ x: preferences.autoScroll ? 20 : 2 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 200,
                          }}
                          className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                        />
                      </motion.button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Response Style</p>
                          <p className="text-xs text-foreground/50 truncate">
                            How detailed should replies be
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 bg-foreground/5 rounded-lg p-1 flex-shrink-0">
                        {(["balanced", "concise", "detailed"] as const).map(
                          (opt) => (
                            <button
                              key={opt}
                              onClick={() =>
                                setPreferences((p) => ({
                                  ...p,
                                  responseStyle: opt,
                                }))
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                                preferences.responseStyle === opt
                                  ? "bg-primary text-white"
                                  : "text-foreground/60 hover:text-foreground"
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <ListBulletIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            Step-by-Step Explanations
                          </p>
                          <p className="text-xs text-foreground/50 truncate">
                            Prefer step-by-step educational answers
                          </p>
                        </div>
                      </div>
                      <motion.button
                        role="switch"
                        aria-checked={preferences.stepByStep}
                        aria-label="Step-by-Step Explanations"
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setPreferences((p) => ({
                            ...p,
                            stepByStep: !p.stepByStep,
                          }))
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                          preferences.stepByStep
                            ? "bg-primary"
                            : "bg-foreground/20"
                        }`}
                      >
                        <motion.div
                          animate={{ x: preferences.stepByStep ? 20 : 2 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 200,
                          }}
                          className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* LANGUAGE */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                    Language
                  </h4>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <GlobeAltIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Language</p>
                        <p className="text-xs text-foreground/50 truncate">
                          Preferred response language
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 bg-foreground/5 rounded-lg p-1 flex-shrink-0">
                      {(["english", "hindi", "hinglish"] as const).map(
                        (opt) => (
                          <button
                            key={opt}
                            onClick={() =>
                              setPreferences((p) => ({
                                ...p,
                                language: opt,
                              }))
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                              preferences.language === opt
                                ? "bg-primary text-white"
                                : "text-foreground/60 hover:text-foreground"
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* PROFILE */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                    Your Profile
                  </h4>
                  <div className="bg-foreground/5 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0 overflow-hidden">
                        {user?.photoURL ? (
                          <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${user.photoURL})` }}
                          />
                        ) : (
                          user?.name?.charAt(0)?.toUpperCase() || "U"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-foreground/50 truncate">{user?.email}</p>
                        <p className="text-xs text-foreground/50">
                          Class {user?.class} — {user?.board}
                        </p>
                      </div>
                      <button
                        onClick={openEditProfile}
                        className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* SECURITY */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                    Security
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <ShieldCheckIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Where you&apos;re logged in</p>
                          <p className="text-xs text-foreground/50 truncate">
                            Manage your active sessions and devices
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={refreshSessions}
                        className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="space-y-2">
                      {sessionsLoading && sessions.length === 0 ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-12 bg-foreground/5 rounded-lg animate-pulse"
                            />
                          ))}
                        </div>
                      ) : sessions.length === 0 ? (
                        <p className="text-xs text-foreground/50 py-2">
                          No active sessions found
                        </p>
                      ) : (
                        sessions.map((session) => (
                          <div
                            key={session.id}
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                              session.current
                                ? "border-primary/30 bg-primary/5"
                                : "border-border bg-foreground/5"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex-shrink-0">
                                {session.device === "Mobile" || session.device === "Tablet" ? (
                                  <DevicePhoneMobileIcon className="w-5 h-5 text-foreground/60" />
                                ) : (
                                  <ComputerDesktopIcon className="w-5 h-5 text-foreground/60" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {session.device}
                                    {session.current && (
                                      <span className="text-[10px] text-primary font-medium ml-1">
                                        Current
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <p className="text-xs text-foreground/50 truncate">
                                  {[session.os, session.browser].filter(Boolean).join(" · ") || "Unknown browser"}
                                </p>
                                <p className="text-[11px] text-foreground/40">
                                  Last active:{" "}
                                  {new Date(session.lastActive).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                            {!session.current && (
                              <button
                                onClick={() => handleRevokeSession(session.id)}
                                className="text-xs text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex-shrink-0"
                              >
                                Log out
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {sessions.some((s) => !s.current) && (
                      <button
                        onClick={handleRevokeAllOtherSessions}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Log out of all other devices
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-border" />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <LockClosedIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Change Password</p>
                      <p className="text-xs text-foreground/50 truncate">
                        Update your account password
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChangePasswordOpen(true)}
                    className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
                  >
                    Change
                  </button>
                </div>

                <div className="border-t border-border" />

                {/* DANGER ZONE */}
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-red-500 mb-3">
                    Danger Zone
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setClearHistoryConfirmOpen(true)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Clear All Chat History
                    </button>
                    <button
                      onClick={() => {
                        setDeleteAccountPassword("");
                        setDeleteAccountOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear History Confirmation Modal */}
      <AnimatePresence>
        {clearHistoryConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setClearHistoryConfirmOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-2">
                Clear All Chat History
              </h3>
              <p className="text-sm text-foreground/70 mb-4">
                This will permanently delete all your conversations and
                messages. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setClearHistoryConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearAllHistory}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Clear All History
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditProfileOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                    {tempName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-foreground/60 mb-1 block">Display Name</label>
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      maxLength={50}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-foreground/5 border border-border rounded-xl px-3 py-2 text-sm text-foreground/50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Profile Photo URL</label>
                  <input
                    type="url"
                    value={tempPhotoUrl}
                    onChange={(e) => setTempPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
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
                  onClick={() => setEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={updateUserProfile}
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

      {/* Change Password Modal */}
      <AnimatePresence>
        {changePasswordOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setChangePasswordOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleChangePassword();
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => {
                    setChangePasswordOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleChangePassword}
                  className="px-4 py-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Update Password
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {deleteAccountOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteAccountOpen(false);
                setDeleteAccountPassword("");
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-2 text-red-600">Delete Account</h3>
              <p className="text-sm text-foreground/70 mb-4">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    value={deleteAccountPassword}
                    onChange={(e) => setDeleteAccountPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="Your password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleDeleteAccount();
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => {
                    setDeleteAccountOpen(false);
                    setDeleteAccountPassword("");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Delete My Account
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cog6ToothIcon,
  XMarkIcon,
  SunIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
  GlobeAltIcon,
  TrashIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BookOpenIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  revokeSession,
  revokeAllOtherSessions,
  changePassword,
  deleteAccount,
  fetchSessions,
  getOrCreateSessionId,
} from "@/lib/sessions";
import { getFirestoreDb } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import type { UserPreferences, UserSession, Conversation } from "@/types";
import { playProfileUpdate, playPasswordChange, playSessionLogout, playSuccess } from "@/lib/sounds";

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, preferences, updatePreferences, reloadProfile } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempPhotoUrl, setTempPhotoUrl] = useState("");
  const [tempClass, setTempClass] = useState("10");
  const [tempBoard, setTempBoard] = useState("CBSE");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [currentSessionId] = useState(() => getOrCreateSessionId());

  useEffect(() => {
    if (!isOpen || !user?.uid) return;

    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const list = await fetchSessions();
        setSessions(list);
      } catch {
        // ignore
      } finally {
        setSessionsLoading(false);
      }
    };

    const loadConversations = async () => {
      try {
        const db = getFirestoreDb();
        if (!db || !user?.uid) return;
        const q = query(
          collection(db, "users", user.uid, "conversations"),
          orderBy("updatedAt", "desc"),
        );
        const snap = await getDocs(q);
        const items: Conversation[] = [];
        snap.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            title: data.title || "New Chat",
            createdAt: data.createdAt?.toDate?.()?.getTime?.() || data.createdAt || Date.now(),
            updatedAt: data.updatedAt?.toDate?.()?.getTime?.() || data.updatedAt || Date.now(),
            lastMessage: data.lastMessage || "",
          });
        });
        setConversations(items);
      } catch {
        // ignore
      }
    };

    loadSessions();
    loadConversations();
  }, [isOpen, user?.uid]);

  const handleUpdate = useCallback(
    (updates: Partial<UserPreferences>) => {
      updatePreferences(updates);
    },
    [updatePreferences],
  );

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
    try {
      await updateDoc(doc(db, "users", user.uid), updates);
      setEditProfileOpen(false);
      reloadProfile();
      playProfileUpdate();
      setNotification({ type: "success", text: "Profile updated successfully" });
      setTimeout(() => setNotification(null), 3000);
    } catch {
      setNotification({ type: "error", text: "Failed to update profile" });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      playSessionLogout();
      setNotification({ type: "success", text: "Session revoked" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke session";
      setNotification({ type: "error", text: msg });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await revokeAllOtherSessions();
       setSessions((prev) => prev.filter((s) => s.id === currentSessionId));
      playSessionLogout();
      setNotification({ type: "success", text: "All other sessions logged out" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke sessions";
      setNotification({ type: "error", text: msg });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setNotification({ type: "error", text: "Please fill in all password fields" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setNotification({ type: "error", text: "New passwords do not match" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (newPassword.length < 6) {
      setNotification({ type: "error", text: "New password must be at least 6 characters" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      reloadProfile();
      playPasswordChange();
      setNotification({ type: "success", text: "Password changed successfully" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setNotification({ type: "error", text: msg });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountPassword) {
      setNotification({ type: "error", text: "Please enter your password" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    try {
      await deleteAccount(deleteAccountPassword);
      setDeleteAccountOpen(false);
      setDeleteAccountPassword("");
      reloadProfile();
      playSuccess();
      setNotification({ type: "success", text: "Account deleted" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      setNotification({ type: "error", text: msg });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const refreshSessions = async () => {
    setSessionsLoading(true);
    try {
      const list = await fetchSessions();
      setSessions(list);
    } finally {
      setSessionsLoading(false);
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
      setConversations([]);
      setNotification({ type: "success", text: "All chat history cleared" });
      setTimeout(() => setNotification(null), 3000);
    } catch {
      setNotification({ type: "error", text: "Failed to clear all history. Please try again." });
      setTimeout(() => setNotification(null), 3000);
    }
    setClearHistoryConfirmOpen(false);
    playSuccess();
  };

  const openEditProfile = () => {
    setTempName(user?.name || "");
    setTempClass(String(user?.class || "10"));
    setTempBoard(user?.board || "CBSE");
    setTempPhotoUrl(user?.photoURL || "");
    setEditProfileOpen(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5 text-primary" />
                Settings
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
                aria-label="Close settings"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
              {notification && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-xl text-sm font-medium ${
                    notification.type === "success"
                      ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                  }`}
                >
                  {notification.text}
                </motion.div>
              )}
              {/* APPEARANCE */}
              <div className="subtle-card rounded-xl p-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  Appearance
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <SunIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Theme</p>
                        <p className="text-xs text-foreground/50 truncate">
                          Choose how Padhai Buddy looks
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 bg-foreground/5 rounded-lg p-1 flex-shrink-0">
                      {(["light", "dark", "system"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleUpdate({ theme: opt })}
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
                      onClick={() => handleUpdate({ animationsEnabled: !preferences.animationsEnabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
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

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {preferences.soundEnabled ? (
                        <SpeakerWaveIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      ) : (
                        <SpeakerXMarkIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Sounds</p>
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
                      onClick={() => handleUpdate({ soundEnabled: !preferences.soundEnabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
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
                </div>
              </div>

              {/* STUDY PREFERENCES */}
              <div className="subtle-card rounded-xl p-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  Study Preferences
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <ListBulletIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Step-by-Step Explanations</p>
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
                      onClick={() => handleUpdate({ stepByStep: !preferences.stepByStep })}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        preferences.stepByStep ? "bg-primary" : "bg-foreground/20"
                      }`}
                    >
                      <motion.div
                        animate={{ x: preferences.stepByStep ? 20 : 2 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
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
                      {(["balanced", "concise", "detailed"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleUpdate({ responseStyle: opt })}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                            preferences.responseStyle === opt
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
                      <GlobeAltIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Preferred Language</p>
                        <p className="text-xs text-foreground/50 truncate">
                          Response language
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 bg-foreground/5 rounded-lg p-1 flex-shrink-0">
                      {(["english", "hindi", "hinglish"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleUpdate({ language: opt })}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                            preferences.language === opt
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
                      <BookOpenIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Class</p>
                        <p className="text-xs text-foreground/50 truncate">
                          Your current class
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-foreground/60 bg-foreground/5 px-2.5 py-1 rounded-lg">
                      Class {user?.class || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <DocumentTextIcon className="w-5 h-5 text-foreground/60 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Board</p>
                        <p className="text-xs text-foreground/50 truncate">
                          Your education board
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-foreground/60 bg-foreground/5 px-2.5 py-1 rounded-lg">
                      {user?.board || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACCOUNT */}
              <div className="subtle-card rounded-xl p-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  Account
                </h4>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0 overflow-hidden">
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={openEditProfile}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setChangePasswordOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={refreshSessions}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-foreground/70 hover:bg-foreground/5 transition-colors"
                  >
                    Sessions
                  </button>
                </div>

                {/* Sessions list */}
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
                          session.id === currentSessionId
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
                                {session.id === currentSessionId && (
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
                        {session.id !== currentSessionId && (
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
                  {sessions.some((s) => s.id !== currentSessionId) && (
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

              {/* DANGER ZONE */}
              <div className="subtle-card rounded-xl p-4 border-red-200 dark:border-red-900/30">
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

          {/* Edit Profile Modal */}
          <AnimatePresence>
            {editProfileOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
                  className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
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
                      className="px-4 py-2 btn-primary rounded-xl text-sm font-medium flex items-center gap-1"
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
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
                  className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
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
                      className="px-4 py-2 btn-primary rounded-xl text-sm font-medium"
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
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
                  className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
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

          {/* Clear History Confirmation Modal */}
          <AnimatePresence>
            {clearHistoryConfirmOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
                  className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

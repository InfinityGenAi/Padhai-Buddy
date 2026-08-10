"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, waitForFirebaseInit } from "@/lib/firebase";
import { deleteCurrentSession } from "@/lib/sessions";
import type { UserProfile, UserBoard, UserClass, UserPreferences } from "@/types";

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEnabled: true,
  animationsEnabled: true,
  theme: "system",
  notificationsEnabled: true,
  enterToSend: true,
  autoScroll: true,
  responseStyle: "balanced",
  stepByStep: true,
  language: "english",
};

function loadLocalPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem("padhai-buddy-preferences");
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFERENCES;
}

function saveLocalPreferences(prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("padhai-buddy-preferences", JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  needsOnboarding: boolean;
  reloadProfile: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (cls: UserClass, board: UserBoard) => Promise<void>;
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadLocalPreferences(),
  );

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      preferences.theme === "dark" ||
      (preferences.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [preferences.theme]);

  useEffect(() => {
    if (preferences.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      if (media.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [preferences.theme]);

  const loadUserProfile = (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setAuthError(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }
    const db = getFirestoreDb();
    if (!db) {
      setAuthError("Firestore is not initialized");
      setUser(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }
    getDoc(doc(db, "users", fbUser.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUser(data);
          setNeedsOnboarding(false);
          const remotePrefs = data.preferences;
          const localPrefs = loadLocalPreferences();
          const merged = { ...DEFAULT_PREFERENCES, ...localPrefs, ...(remotePrefs || { }) };
          setPreferences(merged);
          saveLocalPreferences(merged);
        } else {
          setUser(null);
          setNeedsOnboarding(true);
        }
        setAuthError(null);
      })
      .catch((err) => {
        setAuthError(err instanceof Error ? err.message : String(err));
        setNeedsOnboarding(false);
      })
      .finally(() => setLoading(false));
  };

  const reloadProfile = () => {
    if (firebaseUser) {
      setLoading(true);
      setAuthError(null);
      loadUserProfile(firebaseUser);
    }
  };

  useEffect(() => {
    let unsub: (() => void) | undefined;

    waitForFirebaseInit()
      .then(() => {
        const auth = getFirebaseAuth();
        if (!auth) {
          console.error("[AuthContext] Firebase auth is not initialized");
          setLoading(false);
          return;
        }

        unsub = onAuthStateChanged(auth, (fbUser) => {
          setFirebaseUser(fbUser);
          loadUserProfile(fbUser);
        });
      })
      .catch(() => {
        setLoading(false);
      });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  async function signIn(email: string, password: string) {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(name: string, email: string, password: string) {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
  }

  async function signInWithGoogle() {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function completeOnboarding(cls: UserClass, board: UserBoard) {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) throw new Error("Not authenticated");
    const db = getFirestoreDb();
    if (!db) throw new Error("Firestore not initialized");

    const updated: UserProfile = {
      uid: auth.currentUser.uid,
      name: user?.name || firebaseUser?.displayName || "",
      email: auth.currentUser.email || "",
      class: cls,
      board,
      createdAt: user?.createdAt || Date.now(),
    };

    await setDoc(doc(db, "users", auth.currentUser.uid), updated, { merge: true });
    setUser(updated);
    setNeedsOnboarding(false);
  }

  async function updatePreferences(prefs: Partial<UserPreferences>) {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) return;
    const db = getFirestoreDb();
    if (!db) return;

    const merged = { ...preferences, ...prefs };
    setPreferences(merged);
    saveLocalPreferences(merged);

    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        preferences: merged,
      });
    } catch {
      // ignore sync errors
    }
  }

  async function logout() {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) return;

    if (auth.currentUser) {
      try {
        await deleteCurrentSession();
      } catch (err) {
        console.error("[AuthContext] Session deletion error:", err);
      }
    }

    try {
      await signOut(auth);
    } catch (err) {
      console.error("[AuthContext] Firebase signOut error:", err);
    }

    setUser(null);
    setFirebaseUser(null);
    setNeedsOnboarding(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        authError,
        needsOnboarding,
        reloadProfile,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        completeOnboarding,
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

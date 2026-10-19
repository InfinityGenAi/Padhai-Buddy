"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  getIdToken,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, waitForFirebaseInit } from "@/lib/firebase";
import { deleteCurrentSession } from "@/lib/sessions";
import type { UserProfile, UserBoard, UserClass, UserPreferences } from "@/types";
import { profileNeedsOnboarding } from "@/lib/onboarding";

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEnabled: false,
  soundVolume: "medium",
  soundCategories: {
    ui: true,
    success: true,
    error: true,
    notifications: true,
    study: true,
  },
  animationsEnabled: true,
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
  isAdmin: boolean;
  reloadProfile: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
    cls?: UserClass,
    board?: UserBoard,
    username?: string,
  ) => Promise<{ emailVerificationSent: boolean }>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (cls: UserClass, board: UserBoard, username?: string) => Promise<void>;
  changeUsername: (username: string) => Promise<void>;
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (oobCode: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadLocalPreferences(),
  );
  const signingUpRef = useRef(false);

  const loadUserProfile = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setAuthError(null);
      setNeedsOnboarding(false);
      setLoading(false);
      setIsAdmin(false);
      return;
    }
    // Hold the auth gate until this user's profile and role claims have been
    // loaded. Otherwise protected pages can render with a stale/missing profile
    // and immediately bounce between dashboard and onboarding.
    setLoading(true);
    setAuthError(null);

    const db = getFirestoreDb();
    if (!db) {
      setAuthError("Firestore is not initialized");
      setUser(null);
      setNeedsOnboarding(false);
      setLoading(false);
      setIsAdmin(false);
      return;
    }

    try {
      const tokenResult = await fbUser.getIdTokenResult();
      const claims = tokenResult.claims as Record<string, unknown>;
      setIsAdmin(claims.admin === true);
    } catch {
      setIsAdmin(false);
    }

getDoc(doc(db, "users", fbUser.uid))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUser(data);
            // Class and board are required; username is optional in onboarding.
            setNeedsOnboarding(profileNeedsOnboarding(data));
            const remotePrefs = data.preferences;
            const localPrefs = loadLocalPreferences();
            const merged: UserPreferences = {
              ...DEFAULT_PREFERENCES,
              ...localPrefs,
              ...(remotePrefs || {}),
              soundCategories: {
                ...DEFAULT_PREFERENCES.soundCategories,
                ...(localPrefs.soundCategories || {}),
                ...((remotePrefs as UserPreferences | undefined)?.soundCategories || {}),
              },
            };
            setPreferences(merged);
            saveLocalPreferences(merged);
            setAuthError(null);
          } else {
            setUser(null);
            if (!signingUpRef.current) {
              setNeedsOnboarding(true);
            }
            setAuthError(null);
          }
        })
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorMessage.includes("permission") || errorMessage.includes("PERMISSION_DENIED")) {
            setAuthError("Permission denied loading your profile. Please sign out and sign back in.");
          } else {
            setAuthError("We couldn't load your profile right now. Please refresh the page and try again.");
          }
          setNeedsOnboarding(false);
        })
        .finally(() => {
          if (!signingUpRef.current) {
            setLoading(false);
          }
        });
  }, []);

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
  }, [loadUserProfile]);

  const reloadProfile = useCallback(() => {
    if (firebaseUser) {
      setLoading(true);
      setAuthError(null);
      loadUserProfile(firebaseUser);
    }
  }, [firebaseUser, loadUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      cls?: UserClass,
      board?: UserBoard,
      username?: string,
    ): Promise<{ emailVerificationSent: boolean }> => {
      await waitForFirebaseInit();
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase not initialized");
      signingUpRef.current = true;
      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const usernameToStore = username?.trim() || undefined;

        let emailVerificationSent = false;
        try {
          await sendEmailVerification(cred.user);
          emailVerificationSent = true;
        } catch (verifyErr) {
          console.error("[AuthContext] Failed to send verification email:", verifyErr);
        }

        if (cls && board) {
          const db = getFirestoreDb();
          if (db) {
            const updated: UserProfile = {
              uid: cred.user.uid,
              name,
              email: cred.user.email || email,
              class: cls,
              board,
              createdAt: Date.now(),
              preferences: { ...DEFAULT_PREFERENCES },
            };
            // Do not write the username field directly here - claim it atomically
            // through the server-side /api/username-claim API below.
            await setDoc(doc(db, "users", cred.user.uid), updated, { merge: true });
            setUser(updated);
            setNeedsOnboarding(false);

            // Route username claim through the server-side claim API (never write
            // usernameMappings or the authoritative username field from the client).
            if (usernameToStore) {
              try {
                const token = await getIdToken(cred.user, true);
                const claimRes = await fetch("/api/username-claim", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ username: usernameToStore }),
                });
                if (!claimRes.ok) {
                  const data = await claimRes.json().catch(() => ({}));
                  throw new Error(data.error || "Failed to claim username");
                }
                // Reload the profile so the locally held user reflects the claimed username.
                const snap = await getDoc(doc(db, "users", cred.user.uid));
                if (snap.exists()) {
                  setUser(snap.data() as UserProfile);
                }
              } catch (claimErr) {
                // Username claim failure must not block account creation.
                console.error("[signUp] Username claim failed:", claimErr);
              }
            }
          }
        } else {
          setNeedsOnboarding(true);
        }
        return { emailVerificationSent };
      } catch (err) {
        if (auth.currentUser) {
          try {
            await auth.currentUser.delete();
          } catch (cleanupErr) {
            console.error("[AuthContext] Failed to cleanup Firebase user after signup failure:", cleanupErr);
          }
        }
        setUser(null);
        setNeedsOnboarding(false);
        throw err;
      } finally {
        signingUpRef.current = false;
        if (!cls || !board) {
          setNeedsOnboarding(true);
        }
        setLoading(false);
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }, []);

  const completeOnboarding = useCallback(async (cls: UserClass, board: UserBoard, username?: string) => {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) throw new Error("Not authenticated");
    const db = getFirestoreDb();
    if (!db) throw new Error("Firestore not initialized");

    const usernameToStore = username?.trim() || undefined;
    let resolvedUsername = user?.username;

    const updated: UserProfile = {
      uid: auth.currentUser.uid,
      name: user?.name || firebaseUser?.displayName || "",
      email: auth.currentUser.email || "",
      class: cls,
      board,
      createdAt: user?.createdAt || Date.now(),
      preferences: { ...DEFAULT_PREFERENCES },
    };

    // Do not write the username field or the usernameMappings document from the
    // client. Claim the username atomically through the server-side claim API.
    await setDoc(doc(db, "users", auth.currentUser.uid), updated, { merge: true });

    if (usernameToStore) {
      try {
        const token = await getIdToken(auth.currentUser, true);
        const claimRes = await fetch("/api/username-claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ username: usernameToStore }),
        });
        const claimData = await claimRes.json().catch(() => ({}));
        if (!claimRes.ok) {
          throw new Error(claimData.error || "Failed to claim username");
        }
        resolvedUsername =
          typeof claimData.username === "string" ? claimData.username : usernameToStore;
      } catch (claimErr) {
        // Username claim failure must not block onboarding completion.
        console.error("[completeOnboarding] Username claim failed:", claimErr);
      }
    }

    // Keep the in-memory profile in sync with a successful username claim (or
    // preserve an existing username when the form was left blank).
    setUser({
      ...updated,
      ...(resolvedUsername ? { username: resolvedUsername } : {}),
    });
    setNeedsOnboarding(false);
  }, [user, firebaseUser]);

  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
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
    } catch (err) {
      // Don't silently ignore - report the sync failure
      const errorMessage = err instanceof Error ? err.message : "Failed to sync preferences to cloud";
      console.error("[AuthContext] Preferences sync failed:", err);
      // The UI will need to display this error - we'll use a custom event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("prefs-sync-error", { detail: errorMessage }));
      }
    }
  }, [preferences]);

  const changeUsername = useCallback(async (username: string) => {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) throw new Error("Not authenticated");

    const normalizedUsername = username.toLowerCase().trim();

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      throw new Error("Invalid username format");
    }

    // Route the username change through the server-side claim API. The client never
    // writes usernameMappings or the authoritative username field directly.
    const token = await getIdToken(auth.currentUser, true);
    if (!token) throw new Error("Unable to get auth token");

    const claimRes = await fetch("/api/username-claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: normalizedUsername }),
    });
    const data = await claimRes.json().catch(() => ({}));
    if (!claimRes.ok) {
      throw new Error(data.error || "Failed to change username");
    }

    // Reload profile to reflect changes
    reloadProfile();
  }, [reloadProfile]);

  const logout = useCallback(async () => {
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
    setIsAdmin(false);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    await sendPasswordResetEmail(auth, email, {
      url: `${origin}/reset-password`,
      handleCodeInApp: true,
    });
  }, []);

  const resetPassword = useCallback(async (oobCode: string, newPassword: string) => {
    await waitForFirebaseInit();
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized");
    await confirmPasswordReset(auth, oobCode, newPassword);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        authError,
        needsOnboarding,
        isAdmin,
        reloadProfile,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        completeOnboarding,
        changeUsername,
        preferences,
        updatePreferences,
        sendPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
import { getFirebaseAuth } from "@/lib/firebase";
import type { UserSession } from "@/types";

export interface DeviceInfo {
  device: string;
  browser?: string;
  os?: string;
  userAgent: string;
}

export function detectDevice(): DeviceInfo {
  if (typeof navigator === "undefined") {
    return {
      device: "Unknown Device",
      userAgent: "",
    };
  }

  const ua = navigator.userAgent;
  let device = "Desktop";
  let browser: string | undefined;
  let os: string | undefined;

  if (/Mobi|Android|iPhone|iPad/i.test(ua)) {
    device = /iPad/i.test(ua) ? "Tablet" : "Mobile";
  }

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/")) browser = "Safari";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { device, browser, os, userAgent: ua };
}

const REGISTER_COOLDOWN_MS = 5 * 60 * 1000;
const HEARTBEAT_COOLDOWN_MS = 5 * 60 * 1000;
const registerCooldowns = new Map<string, number>();
const heartbeatCooldowns = new Map<string, number>();

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const key = "padhai-buddy-session-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function registerSession(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return;

  const sessionId = getOrCreateSessionId();
  const now = Date.now();
  const lastRegister = registerCooldowns.get(sessionId) || 0;
  if (now - lastRegister < REGISTER_COOLDOWN_MS) {
    return;
  }

  const device = detectDevice();

  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        device: device.device,
        browser: device.browser,
        os: device.os,
        userAgent: device.userAgent,
      }),
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      if (data.degraded) {
        registerCooldowns.set(sessionId, now + 10 * 60 * 1000);
        if (process.env.NODE_ENV === "development") {
          console.debug("[Session] Registration degraded:", data.code);
        }
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to register session");
    }

    registerCooldowns.delete(sessionId);
  } catch {
    registerCooldowns.set(sessionId, now + REGISTER_COOLDOWN_MS);
  }
}

export async function heartbeatSession(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return;

  const sessionId = getOrCreateSessionId();
  const now = Date.now();
  const lastHeartbeat = heartbeatCooldowns.get(sessionId) || 0;
  if (now - lastHeartbeat < HEARTBEAT_COOLDOWN_MS) {
    return;
  }

  const device = detectDevice();

  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        device: device.device,
        userAgent: device.userAgent,
      }),
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      if (data.degraded) {
        heartbeatCooldowns.set(sessionId, now + 10 * 60 * 1000);
        if (process.env.NODE_ENV === "development") {
          console.debug("[Session] Heartbeat degraded:", data.code);
        }
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send heartbeat");
    }

    heartbeatCooldowns.delete(sessionId);
  } catch {
    heartbeatCooldowns.set(sessionId, now + HEARTBEAT_COOLDOWN_MS);
  }
}

export async function fetchSessions(): Promise<UserSession[]> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return [];

  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/sessions", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      if (data.degraded) {
        throw new Error("SESSION_TRACKING_UNAVAILABLE");
      }
    }

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
  } catch (err) {
    if (err instanceof Error && err.message === "SESSION_TRACKING_UNAVAILABLE") {
      throw err;
    }
    return [];
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId: getOrCreateSessionId() }),
  });

  if (res.status === 503) {
    const data = await res.json().catch(() => ({}));
    if (data.degraded) {
      throw new Error("Session tracking is temporarily unavailable. Please try again later.");
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to revoke session");
  }
}

export async function revokeAllOtherSessions(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const res = await fetch("/api/sessions/bulk-revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId: getOrCreateSessionId() }),
  });

  if (res.status === 503) {
    const data = await res.json().catch(() => ({}));
    if (data.degraded) {
      throw new Error("Session tracking is temporarily unavailable. Please try again later.");
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to revoke sessions");
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user || !user.email) {
    throw new Error("You must be signed in to change your password");
  }

  const credential = (await import("firebase/auth")).EmailAuthProvider.credential(
    user.email,
    currentPassword,
  );
  const { reauthenticateWithCredential, updatePassword } = await import("firebase/auth");

  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function deleteAccount(password: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user || !user.email) {
    throw new Error("You must be signed in to delete your account");
  }

  const credential = (await import("firebase/auth")).EmailAuthProvider.credential(
    user.email,
    password,
  );
  const { reauthenticateWithCredential, deleteUser } = await import("firebase/auth");
  const { getFirebaseIdToken } = await import("@/lib/auth-utils");

  await reauthenticateWithCredential(user, credential);
  const token = await getFirebaseIdToken();

  if (!token) {
    throw new Error("Failed to get authentication token");
  }

  const res = await fetch("/api/auth/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete account");
  }

  try {
    await deleteUser(user);
  } catch {
    // Account may already be deleted server-side
  }
}

export async function deleteCurrentSession(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return;

  try {
    const token = await user.getIdToken();
    await fetch("/api/sessions/current", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId: getOrCreateSessionId() }),
    });
  } catch {
    // ignore cleanup errors
  }
}

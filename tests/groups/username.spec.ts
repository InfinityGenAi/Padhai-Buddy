import { test, expect } from "@playwright/test";
import http from "http";
import { getApps, initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function isPortInUseSync(port: number): boolean {
  try {
    const net = require("net");
    const client = net.createConnection(port, "127.0.0.1");
    client.end();
    return true;
  } catch {
    return false;
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "test-project";
const PASSWORD = "UsernameTest123!";

let adminDb: Firestore;
let adminAuth: Auth;
let useEmulator = false;

function initAdmin() {
  const apps = getApps();
  if (apps.length > 0) {
    apps.forEach((a) => void deleteApp(a).catch(() => undefined));
  }

  useEmulator = isPortInUseSync(9099) && isPortInUseSync(8080);

  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    initializeApp({ projectId: PROJECT_ID });
  } else {
    throw new Error("Username claim tests require Firebase emulators");
  }
  adminAuth = getAuth();
  adminDb = getFirestore();
}
initAdmin();

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@padhai-buddy.test`;
}

// Generates a username that is unique within this process and extremely unlikely
// to collide across the desktop/mobile Playwright projects or across repeated runs.
// Hardcoded usernames persist in usernameMappings in the emulator, which caused
// previously-claimed names to be rejected (409) on subsequent runs/projects.
function uniqueUsername(base: string): string {
  return `${base}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createThrowawayUser(prefix: string): Promise<{ email: string; uid: string; token: string }> {
  const email = uniqueEmail(prefix);
  const authPort = 9099;
  const signupBody = JSON.stringify({
    email,
    password: PASSWORD,
    displayName: "Username User",
    returnSecureToken: true,
  });

  const signupResult = await new Promise<any>((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: authPort,
        path: "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(signupBody) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(signupBody);
    req.end();
  });

  if (signupResult.localId) {
    return { email, uid: signupResult.localId, token: signupResult.idToken };
  }

  if (signupResult.error && signupResult.error.message === "EMAIL_EXISTS") {
    const signinBody = JSON.stringify({ email, password: PASSWORD, returnSecureToken: true });
    const signinResult = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: authPort,
          path: "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(signinBody) },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          });
        },
      );
      req.on("error", reject);
      req.write(signinBody);
      req.end();
    });

    if (signinResult.localId && signinResult.idToken) {
      return { email, uid: signinResult.localId, token: signinResult.idToken };
    }
    throw new Error(`Failed to sign in existing throwaway user: ${JSON.stringify(signinResult)}`);
  }

  throw new Error(`Failed to create throwaway user: ${JSON.stringify(signupResult)}`);
}

async function deleteThrowawayUser(uid: string): Promise<void> {
  try {
    await adminAuth.deleteUser(uid);
  } catch {
    // already gone
  }
  try {
    await adminDb.collection("users").doc(uid).delete();
  } catch {
    // already gone
  }
}

async function createProfile(uid: string, overrides: Record<string, unknown> = {}): Promise<void> {
  await adminDb.collection("users").doc(uid).set({
    uid,
    name: "Profile User",
    email: `${uid}@example.test`,
    class: 10,
    board: "CBSE",
    createdAt: Date.now(),
    preferences: {},
    ...overrides,
  });
}

async function claimUsername(token: string, username: string) {
  return fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/username-claim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
}

async function getMapping(username: string) {
  const snap = await adminDb.collection("usernameMappings").doc(username.toLowerCase().trim()).get();
  return { exists: snap.exists, data: snap.exists ? (snap.data() as { uid: string }) : null };
}

async function getProfileUsername(uid: string) {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists ? ((snap.data() as { username?: string }).username) : null;
}

test.describe("Username claim: signup and onboarding flow", () => {
  test("signup-style claim creates the mapping and updates the profile atomically", async () => {
    const user = await createThrowawayUser("uc-signup");
    const username = uniqueUsername("new_student");
    try {
      await createProfile(user.uid);

      const res = await claimUsername(user.token, username);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.username).toBe(username);

      // Mapping created
      const mapping = await getMapping(username);
      expect(mapping.exists).toBe(true);
      expect(mapping.data!.uid).toBe(user.uid);

      // Profile updated with the authoritative username
      expect(await getProfileUsername(user.uid)).toBe(username);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("onboarding-style claim (Google/legacy user with existing profile)", async () => {
    const user = await createThrowawayUser("uc-onboard");
    const username = uniqueUsername("google_student");
    try {
      await createProfile(user.uid, { name: "Google User" });

      const res = await claimUsername(user.token, username);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const mapping = await getMapping(username);
      expect(mapping.exists).toBe(true);
      expect(mapping.data!.uid).toBe(user.uid);
      expect(await getProfileUsername(user.uid)).toBe(username);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("rejects reserved usernames", async () => {
    const user = await createThrowawayUser("uc-reserved");
    try {
      await createProfile(user.uid);

      const res = await claimUsername(user.token, "admin");
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("Username is reserved");

      // No mapping created for a reserved name
      const mapping = await getMapping("admin");
      expect(mapping.exists).toBe(false);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("rejects invalid username format", async () => {
    const user = await createThrowawayUser("uc-format");
    try {
      await createProfile(user.uid);

      const res = await claimUsername(user.token, "AB!invalid");
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid username format");

      const mapping = await getMapping("ab!invalid");
      expect(mapping.exists).toBe(false);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });
});

test.describe("Username claim: duplicates and races", () => {
  test("duplicate claim: second user cannot take an already-claimed username", async () => {
    const userA = await createThrowawayUser("uc-dup-a");
    const userB = await createThrowawayUser("uc-dup-b");
    const shared = uniqueUsername("shared_name");
    try {
      await createProfile(userA.uid);
      await createProfile(userB.uid);

      const resA = await claimUsername(userA.token, shared);
      expect(resA.status).toBe(200);

      const resB = await claimUsername(userB.token, shared);
      expect(resB.status).toBe(409);
      const dataB = await resB.json();
      expect(dataB.error).toBe("Username already taken");

      // Mapping still belongs to user A
      const mapping = await getMapping(shared);
      expect(mapping.data!.uid).toBe(userA.uid);
    } finally {
      await deleteThrowawayUser(userA.uid);
      await deleteThrowawayUser(userB.uid);
    }
  });

  test("race: concurrent claims for the same username result in exactly one owner", async () => {
    const userA = await createThrowawayUser("uc-race-a");
    const userB = await createThrowawayUser("uc-race-b");
    const race = uniqueUsername("race_name");
    try {
      await createProfile(userA.uid);
      await createProfile(userB.uid);

      // Fire both claims concurrently
      const [resA, resB] = await Promise.all([
        claimUsername(userA.token, race),
        claimUsername(userB.token, race),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses.filter((s) => s === 200).length).toBe(1);
      expect(statuses.filter((s) => s === 409).length).toBe(1);

      const mapping = await getMapping(race);
      expect(mapping.exists).toBe(true);
      const ownerUid = mapping.data!.uid;
      expect([userA.uid, userB.uid]).toContain(ownerUid);
      expect(await getProfileUsername(ownerUid)).toBe(race);
    } finally {
      await deleteThrowawayUser(userA.uid);
      await deleteThrowawayUser(userB.uid);
    }
  });
});

test.describe("Username claim: changes and idempotency", () => {
  test("username change releases the old mapping and claims the new one", async () => {
    const user = await createThrowawayUser("uc-change");
    const oldName = uniqueUsername("old_name");
    const newName = uniqueUsername("new_name");
    try {
      await createProfile(user.uid);

      const first = await claimUsername(user.token, oldName);
      expect(first.status).toBe(200);

      const second = await claimUsername(user.token, newName);
      expect(second.status).toBe(200);

      // Old mapping released
      expect((await getMapping(oldName)).exists).toBe(false);
      // New mapping owned by this user
      expect((await getMapping(newName)).data!.uid).toBe(user.uid);
      // Profile updated to the new username
      expect(await getProfileUsername(user.uid)).toBe(newName);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("idempotent re-claim of the same username is a success", async () => {
    const user = await createThrowawayUser("uc-idem");
    const name = uniqueUsername("idem_name");
    try {
      await createProfile(user.uid);

      const first = await claimUsername(user.token, name);
      expect(first.status).toBe(200);

      const second = await claimUsername(user.token, name);
      expect(second.status).toBe(200);
      const data = await second.json();
      expect(data.success).toBe(true);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("missing mapping is repaired when the profile already owns the username", async () => {
    const user = await createThrowawayUser("uc-repair");
    const name = uniqueUsername("orphan_name");
    try {
      // Simulate a profile created by an older client path: username set but
      // no usernameMappings document (the idempotency gap).
      await createProfile(user.uid, { username: name });
      expect((await getMapping(name)).exists).toBe(false);

      // Re-claiming the same username should repair/create the mapping atomically
      const res = await claimUsername(user.token, name);
      expect(res.status).toBe(200);

      const mapping = await getMapping(name);
      expect(mapping.exists).toBe(true);
      expect(mapping.data!.uid).toBe(user.uid);
      expect(await getProfileUsername(user.uid)).toBe(name);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("rejects claiming a username that maps to a different user", async () => {
    const userA = await createThrowawayUser("uc-other-a");
    const userB = await createThrowawayUser("uc-other-b");
    const taken = uniqueUsername("taken_name");
    try {
      await createProfile(userA.uid, { username: taken });
      await adminDb.collection("usernameMappings").doc(taken).set({
        uid: userA.uid,
        claimedAt: Date.now(),
        updatedAt: Date.now(),
      });

      await createProfile(userB.uid);
      const res = await claimUsername(userB.token, taken);
      expect(res.status).toBe(409);
    } finally {
      await deleteThrowawayUser(userA.uid);
      await deleteThrowawayUser(userB.uid);
    }
  });

  test("returns 401 without a token", async () => {
    const res = await fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/username-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "some_name" }),
    });
    expect(res.status).toBe(401);
  });
});

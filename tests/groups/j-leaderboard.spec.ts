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
const PASSWORD = "LeaderboardTest123!";

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
    throw new Error("Leaderboard API tests require Firebase emulators");
  }
  adminAuth = getAuth();
  adminDb = getFirestore();
}
initAdmin();

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@padhai-buddy.test`;
}

async function createThrowawayUser(prefix: string): Promise<{ email: string; uid: string; token: string }> {
  const email = uniqueEmail(prefix);
  const authPort = 9099;
  const signupBody = JSON.stringify({
    email,
    password: PASSWORD,
    displayName: "LB User",
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
  try {
    await adminDb.collection("userScores").doc(uid).delete();
  } catch {
    // already gone
  }
}

/**
 * Writes a server-owned userScores (points ledger) document for a user. This is
 * what the leaderboard reads from - client-writable activity docs are never
 * trusted directly.
 */
async function writeUserScore(
  uid: string,
  profile: { name?: string; username?: string; email?: string },
  counts: { doubts?: number; quizzes?: number; flashcards?: number; notes?: number; sessions?: number; plans?: number },
): Promise<void> {
  const score =
    (counts.doubts || 0) * 10 +
    (counts.quizzes || 0) * 20 +
    (counts.flashcards || 0) * 5 +
    (counts.notes || 0) * 5 +
    (counts.sessions || 0) * 5 +
    (counts.plans || 0) * 15;

  const tier = score >= 500 ? "Gold" : score >= 200 ? "Silver" : score >= 50 ? "Bronze" : "Beginner";

  await adminDb.collection("userScores").doc(uid).set({
    uid,
    name: profile.name || "Anonymous",
    username: profile.username,
    score,
    tier,
    totalDoubts: counts.doubts || 0,
    totalQuizzes: counts.quizzes || 0,
    totalFlashcards: counts.flashcards || 0,
    totalNotes: counts.notes || 0,
    totalStudySessions: counts.sessions || 0,
    completedPlans: counts.plans || 0,
    totalActivity:
      (counts.doubts || 0) + (counts.quizzes || 0) + (counts.flashcards || 0) + (counts.notes || 0) + (counts.sessions || 0) + (counts.plans || 0),
    updatedAt: Date.now(),
  });
}

async function callLeaderboard(token?: string) {
  return fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/leaderboard`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

test.describe("Leaderboard API: authorization", () => {
  test("returns 401 without a token", async () => {
    const res = await callLeaderboard();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  test("returns 401 with an invalid token", async () => {
    const res = await callLeaderboard("invalid-token-12345");
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid or expired token");
  });
});

test.describe("Leaderboard API: ranking order and top-10 limit", () => {
  const users: Array<{ email: string; uid: string; token: string }> = [];

  test.beforeAll(async () => {
    // Create 12 users with varying server-owned ledger scores
    const userData = [
      { prefix: "lb-gold-1", name: "Gold One", username: "gold_one", doubts: 50, quizzes: 10, notes: 5, sessions: 10, plans: 5, flashcards: 20 },
      { prefix: "lb-gold-2", name: "Gold Two", username: "gold_two", doubts: 40, quizzes: 8, notes: 4, sessions: 8, plans: 4, flashcards: 15 },
      { prefix: "lb-silver-1", name: "Silver One", username: "silver_one", doubts: 20, quizzes: 5, notes: 3, sessions: 5, plans: 2, flashcards: 10 },
      { prefix: "lb-silver-2", name: "Silver Two", username: "silver_two", doubts: 18, quizzes: 4, notes: 2, sessions: 4, plans: 2, flashcards: 8 },
      { prefix: "lb-bronze-1", name: "Bronze One", username: "bronze_one", doubts: 8, quizzes: 2, notes: 2, sessions: 3, plans: 1, flashcards: 5 },
      { prefix: "lb-bronze-2", name: "Bronze Two", username: "bronze_two", doubts: 7, quizzes: 2, notes: 1, sessions: 2, plans: 1, flashcards: 4 },
      { prefix: "lb-beginner-1", name: "Beginner One", username: "beginner_one", doubts: 2, quizzes: 1, notes: 1, sessions: 1, plans: 0, flashcards: 2 },
      { prefix: "lb-beginner-2", name: "Beginner Two", username: "beginner_two", doubts: 1, quizzes: 0, notes: 0, sessions: 1, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-1", name: "Empty One", username: "empty_one", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-2", name: "Empty Two", username: "empty_two", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-3", name: "Empty Three", username: "empty_three", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-4", name: "Empty Four", username: "empty_four", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
    ];

    for (const { prefix, ...rest } of userData) {
      const user = await createThrowawayUser(prefix);
      await adminDb.collection("users").doc(user.uid).set({
        uid: user.uid,
        name: rest.name,
        email: user.email,
        username: rest.username,
        class: 10,
        board: "CBSE",
        createdAt: Date.now(),
        preferences: {},
      });
      await writeUserScore(user.uid, { name: rest.name, username: rest.username, email: user.email }, rest);
      users.push(user);
    }
  });

  test.afterAll(async () => {
    for (const user of users) {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("returns users sorted by score descending (highest first)", async () => {
    const user = users[0];
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.users.length).toBeLessThanOrEqual(10);

    const scores = data.users.map((u: { score: number }) => u.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  test("limits results to top 10 even when more users qualify", async () => {
    const user = users[0];
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.users.length).toBeLessThanOrEqual(10);
  });

  test("uses the profile name (not a missing displayName) for each entry", async () => {
    const user = users[0];
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Every entry must have a name derived from the profile schema (name/username)
    for (const u of data.users) {
      expect(u.name).toBeTruthy();
      expect(typeof u.name).toBe("string");
    }
    // The gold user should be present with their name
    const goldEntry = data.users.find((u: { username?: string }) => u.username === "gold_one");
    expect(goldEntry).toBeDefined();
    expect(goldEntry!.name).toBe("Gold One");
  });

  test("does not include users with zero activity unless they are in the top 10 by score", async () => {
    const user = users[0];
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Only top 10 by score are returned; with 12 users, 2 zero-activity users are excluded
    const emptyUsernames = data.users.filter((u: { username?: string }) => u.username?.startsWith("empty_"));
    expect(emptyUsernames.length).toBeLessThanOrEqual(2);
  });
});

test.describe("Leaderboard API: privacy protection", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("lb-privacy");
    await adminDb.collection("users").doc(user.uid).set({
      uid: user.uid,
      name: "Privacy User",
      email: user.email, // sensitive - must NOT be returned
      username: "privacy_user",
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });
    await writeUserScore(user.uid, { name: "Privacy User", username: "privacy_user", email: user.email }, { doubts: 5, quizzes: 2 });
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  test("does not expose email addresses in leaderboard response", async () => {
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    for (const u of data.users) {
      expect(u.email).toBeUndefined();
    }
  });

  test("does not return UIDs in the public leaderboard", async () => {
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    for (const u of data.users) {
      expect(u.uid).toBeUndefined();
    }
  });

  test("includes only non-sensitive profile fields", async () => {
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    const privacyEntry = data.users.find((u: { username?: string }) => u.username === "privacy_user");
    expect(privacyEntry).toBeDefined();
    expect(privacyEntry!.name).toBe("Privacy User");
    expect(privacyEntry!.score).toBeDefined();
    expect(privacyEntry!.tier).toBeDefined();
    // Private fields must not be present
    expect(privacyEntry!.email).toBeUndefined();
    expect(privacyEntry!.uid).toBeUndefined();
  });
});

test.describe("Leaderboard API: forged client activity is not trusted", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("lb-forged");
    await adminDb.collection("users").doc(user.uid).set({
      uid: user.uid,
      name: "Forged User",
      email: user.email,
      username: "forged_user",
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });
    // Legitimate ledger score: 0 activity
    await writeUserScore(user.uid, { name: "Forged User", username: "forged_user", email: user.email }, {});
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  test("does not count forged Firestore activity documents (reads ledger only)", async () => {
    // Forge a large number of activity docs directly in Firestore (client-writable).
    // These must NOT affect the leaderboard because it reads the server-owned ledger.
    const batch = adminDb.batch();
    const userRef = adminDb.collection("users").doc(user.uid);
    for (let i = 0; i < 100; i++) {
      batch.set(userRef.collection("quizAttempts").doc(`forged-${i}`), {
        subject: "Maths", class: 10, board: "CBSE", difficulty: "medium",
        totalQuestions: 3, correctAnswers: 0, score: 0, questions: [], createdAt: Date.now(),
      });
      batch.set(userRef.collection("notes").doc(`forged-note-${i}`), {
        title: `Forged Note ${i}`, subject: "Maths", body: "x", createdAt: Date.now(), updatedAt: Date.now(),
      });
    }
    await batch.commit();

    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    const entry = data.users.find((u: { username?: string }) => u.username === "forged_user");
    expect(entry).toBeDefined();
    // Score remains 0 because the server-owned ledger was not updated
    expect(entry!.score).toBe(0);
    expect(entry!.totalQuizzes).toBe(0);
    expect(entry!.totalNotes).toBe(0);
  });
});

test.describe("Leaderboard API: empty data state", () => {
  test("returns empty users array when no ledger entries exist", async () => {
    const user = await createThrowawayUser("lb-empty-fresh");
    try {
      // Ensure a clean ledger state so this test is isolated from prior tests
      // that may have seeded userScores documents.
      const snap = await adminDb.collection("userScores").get();
      if (!snap.empty) {
        const batch = adminDb.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      const res = await callLeaderboard(user.token);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBe(0);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });
});

test.describe("Leaderboard API: tie-break behavior", () => {
  let userA: { email: string; uid: string; token: string };
  let userB: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    userA = await createThrowawayUser("lb-tie-a");
    userB = await createThrowawayUser("lb-tie-b");

    await adminDb.collection("users").doc(userA.uid).set({
      uid: userA.uid, name: "Alpha User", username: "alpha_user", email: userA.email,
      class: 10, board: "CBSE", createdAt: Date.now(), preferences: {},
    });
    await adminDb.collection("users").doc(userB.uid).set({
      uid: userB.uid, name: "Beta User", username: "beta_user", email: userB.email,
      class: 10, board: "CBSE", createdAt: Date.now(), preferences: {},
    });

    // Same score, same total activity → tie-break by name (Alpha before Beta)
    await writeUserScore(userA.uid, { name: "Alpha User", username: "alpha_user", email: userA.email }, { doubts: 10, quizzes: 5 });
    await writeUserScore(userB.uid, { name: "Beta User", username: "beta_user", email: userB.email }, { doubts: 10, quizzes: 5 });
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(userA.uid);
    await deleteThrowawayUser(userB.uid);
  });

  test("breaks ties by total activity count, then alphabetically by name", async () => {
    const res = await callLeaderboard(userA.token);
    expect(res.status).toBe(200);
    const data = await res.json();

    const aEntry = data.users.find((u: { username?: string }) => u.username === "alpha_user");
    const bEntry = data.users.find((u: { username?: string }) => u.username === "beta_user");

    if (aEntry && bEntry) {
      expect(aEntry.score).toBe(bEntry.score);
      expect(aEntry.totalActivity).toBe(bEntry.totalActivity);
      const aIndex = data.users.findIndex((u: { username?: string }) => u.username === "alpha_user");
      const bIndex = data.users.findIndex((u: { username?: string }) => u.username === "beta_user");
      expect(aIndex).toBeLessThan(bIndex);
    }
  });
});

test.describe("Leaderboard API: large-user performance", () => {
  test("returns at most 10 entries even with many users (bounded top-10 query)", async () => {
    const created: Array<{ uid: string; token: string }> = [];
    try {
      // Create 25 users with varying scores
      for (let i = 0; i < 25; i++) {
        const user = await createThrowawayUser(`lb-perf-${i}`);
        await adminDb.collection("users").doc(user.uid).set({
          uid: user.uid, name: `Perf User ${i}`, username: `perf_user_${i}`, email: user.email,
          class: 10, board: "CBSE", createdAt: Date.now(), preferences: {},
        });
        await writeUserScore(user.uid, { name: `Perf User ${i}`, username: `perf_user_${i}`, email: user.email }, { doubts: i });
        created.push(user);
      }

      // Query as the user with the highest score
      const topUser = created[created.length - 1];
      const res = await callLeaderboard(topUser.token);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users.length).toBeLessThanOrEqual(10);

      const scores = data.users.map((u: { score: number }) => u.score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    } finally {
      for (const user of created) {
        await deleteThrowawayUser(user.uid);
      }
    }
  });
});

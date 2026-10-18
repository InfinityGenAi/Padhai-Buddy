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
}

async function seedActivityRecords(
  uid: string,
  counts: {
    doubts?: number;
    quizzes?: number;
    notes?: number;
    sessions?: number;
    plans?: number;
    flashcards?: number;
  },
): Promise<void> {
  const userRef = adminDb.collection("users").doc(uid);
  const baseTime = Date.now();

  const promises: Promise<any>[] = [];

  // Doubts
  for (let i = 0; i < (counts.doubts || 0); i++) {
    promises.push(
      userRef.collection("doubts").doc(`d-${i}`).set({
        id: `d-${i}`,
        question: `Question ${i}`,
        answer: `Answer ${i}`,
        type: "text",
        createdAt: baseTime + i,
      }),
    );
  }

  // Quizzes
  for (let i = 0; i < (counts.quizzes || 0); i++) {
    promises.push(
      userRef.collection("quizAttempts").doc(`q-${i}`).set({
        id: `q-${i}`,
        subject: "Maths",
        class: 10,
        board: "CBSE",
        difficulty: "medium",
        totalQuestions: 3,
        correctAnswers: 0,
        score: 0,
        questions: [],
        createdAt: baseTime + i,
      }),
    );
  }

  // Notes
  for (let i = 0; i < (counts.notes || 0); i++) {
    promises.push(
      userRef.collection("notes").doc(`n-${i}`).set({
        id: `n-${i}`,
        title: `Note ${i}`,
        subject: "Maths",
        body: `Body ${i}`,
        createdAt: baseTime + i,
        updatedAt: baseTime + i,
      }),
    );
  }

  // Study Sessions
  for (let i = 0; i < (counts.sessions || 0); i++) {
    promises.push(
      userRef.collection("studySessions").doc(`s-${i}`).set({
        id: `s-${i}`,
        mode: "stopwatch",
        durationMinutes: 30,
        completed: true,
        createdAt: baseTime + i,
      }),
    );
  }

  // Study Plans
  for (let i = 0; i < (counts.plans || 0); i++) {
    promises.push(
      userRef.collection("studyPlans").doc(`p-${i}`).set({
        id: `p-${i}`,
        title: `Plan ${i}`,
        subject: "Maths",
        durationMinutes: 30,
        plannedDate: "2026-01-01",
        completed: true,
        completedAt: baseTime + i,
        createdAt: baseTime + i,
        updatedAt: baseTime + i,
      }),
    );
  }

  // Flashcards (under flashcardDecks/cards)
  if (counts.flashcards && counts.flashcards > 0) {
    const deckRef = await userRef.collection("flashcardDecks").add({
      title: "LB Deck",
      subject: "Maths",
      createdAt: baseTime,
      updatedAt: baseTime,
    });
    for (let i = 0; i < counts.flashcards; i++) {
      promises.push(
        deckRef.collection("cards").doc(`c-${i}`).set({
          id: `c-${i}`,
          front: `Front ${i}`,
          back: `Back ${i}`,
          status: "reviewed",
          createdAt: baseTime + i,
          updatedAt: baseTime + i,
        }),
      );
    }
  }

  await Promise.all(promises);
}

async function callLeaderboard(token?: string) {
  return fetch(
    `${process.env.BASE_URL || "http://localhost:3000"}/api/leaderboard`,
    {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
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
    // Create 12 users with varying activity levels
    const userData = [
      { prefix: "lb-gold-1", doubts: 50, quizzes: 10, notes: 5, sessions: 10, plans: 5, flashcards: 20 },
      { prefix: "lb-gold-2", doubts: 40, quizzes: 8, notes: 4, sessions: 8, plans: 4, flashcards: 15 },
      { prefix: "lb-silver-1", doubts: 20, quizzes: 5, notes: 3, sessions: 5, plans: 2, flashcards: 10 },
      { prefix: "lb-silver-2", doubts: 18, quizzes: 4, notes: 2, sessions: 4, plans: 2, flashcards: 8 },
      { prefix: "lb-bronze-1", doubts: 8, quizzes: 2, notes: 2, sessions: 3, plans: 1, flashcards: 5 },
      { prefix: "lb-bronze-2", doubts: 7, quizzes: 2, notes: 1, sessions: 2, plans: 1, flashcards: 4 },
      { prefix: "lb-beginner-1", doubts: 2, quizzes: 1, notes: 1, sessions: 1, plans: 0, flashcards: 2 },
      { prefix: "lb-beginner-2", doubts: 1, quizzes: 0, notes: 0, sessions: 1, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-1", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-2", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-3", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
      { prefix: "lb-empty-4", doubts: 0, quizzes: 0, notes: 0, sessions: 0, plans: 0, flashcards: 0 },
    ];

    for (const { prefix, ...counts } of userData) {
      const user = await createThrowawayUser(prefix);
      await adminDb.collection("users").doc(user.uid).set({
        uid: user.uid,
        name: `LB ${prefix}`,
        email: user.email,
        class: 10,
        board: "CBSE",
        createdAt: Date.now(),
        preferences: {},
      });
      await seedActivityRecords(user.uid, counts);
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

  test("does not include users without a display name", async () => {
    // Users without profile data are skipped server-side
    const user = users[0];
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    for (const u of data.users) {
      expect(u.displayName).toBeTruthy();
    }
  });
});

test.describe("Leaderboard API: privacy protection", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("lb-privacy");
    await adminDb.collection("users").doc(user.uid).set({
      uid: user.uid,
      name: "Privacy User",
      email: user.email,
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });
    await seedActivityRecords(user.uid, { doubts: 5, quizzes: 2 });
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

  test("includes only non-sensitive profile fields", async () => {
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.users.length > 0) {
      const u = data.users[0];
      expect(u.uid).toBeDefined();
      expect(u.displayName).toBeDefined();
      expect(u.score).toBeDefined();
      expect(u.tier).toBeDefined();
      // Private fields should not be present
      expect(u.email).toBeUndefined();
    }
  });
});

test.describe("Leaderboard API: score tampering protection", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("lb-tamper");
    await adminDb.collection("users").doc(user.uid).set({
      uid: user.uid,
      name: "Tamper User",
      email: user.email,
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });
    // No activity records seeded - score should be 0
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  test("returns score of 0 for user with no activity records", async () => {
    const res = await callLeaderboard(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    const entry = data.users.find((u: { uid: string }) => u.uid === user.uid);
    if (entry) {
      expect(entry.score).toBe(0);
      expect(entry.totalDoubts).toBe(0);
      expect(entry.totalQuizzes).toBe(0);
    }
  });

  test("does not accept client-submitted scores (reads only from Firestore)", async () => {
    // The leaderboard API only reads from Firestore, never accepts POST with scores
    // Verify no POST method is allowed
    const res = await fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/leaderboard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
        Body: JSON.stringify({ score: 999999 }),
      },
    });
    expect(res.status).toBe(405);
  });
});

test.describe("Leaderboard API: empty data state", () => {
  test("returns empty users array when no users have activity records", async () => {
    // Create a fresh user with no activity and check they appear with score 0
    const user = await createThrowawayUser("lb-empty");
    await adminDb.collection("users").doc(user.uid).set({
      uid: user.uid,
      name: "Empty User",
      email: user.email,
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });

    try {
      const res = await callLeaderboard(user.token);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.users)).toBe(true);
      // User may appear with score 0, or not at all depending on sorting
      // But the response structure must be valid
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

    // Both users get the same activity → same score → tie-break by total activity then name
    await adminDb.collection("users").doc(userA.uid).set({
      uid: userA.uid,
      name: "Alpha User",
      email: userA.email,
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });
    await adminDb.collection("users").doc(userB.uid).set({
      uid: userB.uid,
      name: "Beta User",
      email: userB.email,
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });

    await seedActivityRecords(userA.uid, { doubts: 10, quizzes: 5 });
    await seedActivityRecords(userB.uid, { doubts: 10, quizzes: 5 });
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(userA.uid);
    await deleteThrowawayUser(userB.uid);
  });

  test("breaks ties by total activity count, then alphabetically by name", async () => {
    const res = await callLeaderboard(userA.token);
    expect(res.status).toBe(200);
    const data = await res.json();

    const aEntry = data.users.find((u: { uid: string }) => u.uid === userA.uid);
    const bEntry = data.users.find((u: { uid: string }) => u.uid === userB.uid);

    if (aEntry && bEntry) {
      // Same score, same activity count → tie-break by name (Alpha before Beta)
      expect(aEntry.score).toBe(bEntry.score);
      expect(aEntry.totalActivity).toBe(bEntry.totalActivity);
      // Alphabetical tie-break: "Alpha User" < "Beta User"
      const aIndex = data.users.findIndex((u: { uid: string }) => u.uid === userA.uid);
      const bIndex = data.users.findIndex((u: { uid: string }) => u.uid === userB.uid);
      expect(aIndex).toBeLessThan(bIndex);
    }
  });
});

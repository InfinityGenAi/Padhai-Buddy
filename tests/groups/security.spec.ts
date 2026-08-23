import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function loadEnv() {
  const envPath = resolve(__dirname, "../../.env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      process.env[key] = val;
    }
  }
}

loadEnv();

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const PASSWORD = "AuditTest123!";

let adminDb: Firestore;
let adminAuth: Auth;

function initAdmin() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey) throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is not set");
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
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
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Failed to create throwaway user: ${JSON.stringify(data.error || data)}`);
  return { email, uid: data.localId, token: data.idToken };
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

async function createProfileDoc(uid: string, email: string): Promise<void> {
  // Seed via the admin SDK (rules are exercised by the PATCH tests below).
  await adminDb.collection("users").doc(uid).set({
    uid,
    name: "Audit User",
    email,
    class: 10,
    board: "CBSE",
    createdAt: Date.now(),
    preferences: {},
  });
}

test.describe("Security: quiz score integrity", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("quiz-audit");
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  const SEED_QUESTIONS = [
    { id: "q-0", question: "What is 2 + 2?", options: ["3", "4", "5", "6"], correctIndex: 1, explanation: "2 + 2 equals 4." },
    { id: "q-1", question: "Capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correctIndex: 2, explanation: "Paris is the capital." },
    { id: "q-2", question: "Largest planet?", options: ["Mars", "Earth", "Jupiter", "Venus"], correctIndex: 2, explanation: "Jupiter is the largest." },
  ];

  async function seedAttempt(): Promise<string> {
    const attemptId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await adminDb.collection("users").doc(user.uid).collection("quizAttempts").doc(attemptId).set({
      id: attemptId,
      subject: "Maths",
      class: 10,
      board: "CBSE",
      difficulty: "medium",
      totalQuestions: 3,
      correctAnswers: 0,
      score: 0,
      questions: SEED_QUESTIONS,
      createdAt: Date.now(),
    });
    return attemptId;
  }

  function clientQuestions(
    selections: (number | undefined)[],
    overrides?: Record<number, { correctIndex?: number; question?: string }>,
  ) {
    return SEED_QUESTIONS.map((q, i) => ({
      id: q.id,
      question: overrides?.[i]?.question ?? q.question,
      options: q.options,
      correctIndex: overrides?.[i]?.correctIndex ?? q.correctIndex,
      explanation: q.explanation,
      ...(selections[i] !== undefined ? { selectedIndex: selections[i] } : {}),
    }));
  }

  async function submit(attemptId: string, questions: unknown[]) {
    return fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ action: "submit", attemptId, questions }),
    });
  }

  test("scores a perfect submission from server data", async () => {
    const attemptId = await seedAttempt();
    const res = await submit(attemptId, clientQuestions([1, 2, 2]));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attempt.correctAnswers).toBe(3);
    expect(data.attempt.score).toBe(100);
    expect(data.attempt.completedAt).toBeTruthy();
  });

  test("rejects fewer questions than stored", async () => {
    const attemptId = await seedAttempt();
    const res = await submit(attemptId, clientQuestions([1, 2]).slice(0, 2));
    expect(res.status).toBe(400);
  });

  test("rejects extra questions beyond stored", async () => {
    const attemptId = await seedAttempt();
    const extra = [...clientQuestions([1, 2, 2]), clientQuestions([1])[0]];
    const res = await submit(attemptId, extra);
    expect(res.status).toBe(400);
  });

  test("rejects tampered question content", async () => {
    const attemptId = await seedAttempt();
    const res = await submit(attemptId, clientQuestions([1, 2, 2], { 0: { question: "What is 2 + 3?" } }));
    expect(res.status).toBe(400);
  });

  test("rejects tampered options", async () => {
    const attemptId = await seedAttempt();
    const tampered = clientQuestions([1, 2, 2]).map((q, i) =>
      i === 1 ? { ...q, options: ["London", "Berlin", "Rome", "Madrid"] } : q,
    );
    const res = await submit(attemptId, tampered);
    expect(res.status).toBe(400);
  });

  test("ignores client-supplied correctIndex and scores from server answers", async () => {
    const attemptId = await seedAttempt();
    // Client claims q-0's correct answer is index 0 and selects index 0.
    // Server truth: q-0 correct answer is index 1, so this must be WRONG.
    const res = await submit(attemptId, clientQuestions([0, 2, 2], { 0: { correctIndex: 0 } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attempt.correctAnswers).toBe(2);
    expect(data.attempt.score).toBe(67);
  });

  test("rejects invalid selectedIndex values", async () => {
    const attemptId = await seedAttempt();
    const bad1 = clientQuestions([1, 4, 2]);
    expect((await submit(attemptId, bad1)).status).toBe(400);
    const attemptId2 = await seedAttempt();
    const bad2 = clientQuestions([1, 2, 2]).map((q, i) => (i === 0 ? { ...q, selectedIndex: -1 } : q));
    expect((await submit(attemptId2, bad2)).status).toBe(400);
    const attemptId3 = await seedAttempt();
    const bad3 = clientQuestions([1, 2, 2]).map((q, i) => (i === 0 ? { ...q, selectedIndex: "1" } : q));
    expect((await submit(attemptId3, bad3)).status).toBe(400);
  });

  test("accepts unanswered questions as incorrect (score reflects reality)", async () => {
    const attemptId = await seedAttempt();
    const res = await submit(attemptId, clientQuestions([undefined, undefined, undefined]));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attempt.correctAnswers).toBe(0);
    expect(data.attempt.score).toBe(0);
  });

  test("blocks resubmission of a completed attempt", async () => {
    const attemptId = await seedAttempt();
    const first = await submit(attemptId, clientQuestions([1, 2, 2]));
    expect(first.status).toBe(200);
    const second = await submit(attemptId, clientQuestions([0, 0, 0]));
    expect(second.status).toBe(409);
  });

  test("returns 404 for unknown attempts and 401 without a token", async () => {
    const res = await submit("does-not-exist", clientQuestions([1, 2, 2]));
    expect(res.status).toBe(404);
    const noToken = await fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", attemptId: "x", questions: [] }),
    });
    expect(noToken.status).toBe(401);
  });
});

test.describe("Security: delete account", () => {
  async function seedUserData(uid: string): Promise<number> {
    const userRef = adminDb.collection("users").doc(uid);
    await userRef.set({
      uid,
      name: "Delete Audit",
      email: uniqueEmail("delete-audit"),
      class: 10,
      board: "CBSE",
      createdAt: Date.now(),
      preferences: {},
    });

    let docs = 1;

    const quizCol = userRef.collection("quizAttempts");
    for (let i = 0; i < 600; i += 100) {
      await Promise.all(
        Array.from({ length: Math.min(100, 600 - i) }, (_, j) =>
          quizCol.doc().set({
            id: `q${i + j}`,
            subject: "Maths",
            class: 10,
            board: "CBSE",
            difficulty: "medium",
            totalQuestions: 1,
            correctAnswers: 0,
            score: 0,
            questions: [],
            createdAt: Date.now(),
          }),
        ),
      );
    }
    docs += 600;

    const decksCol = userRef.collection("flashcardDecks");
    const deckRefs = await Promise.all(
      Array.from({ length: 20 }, (_, d) => decksCol.add({ title: `Deck ${d}`, subject: "Maths", createdAt: Date.now(), updatedAt: Date.now() })),
    );
    docs += 20;
    for (const deckRef of deckRefs) {
      const cardsCol = deckRef.collection("cards");
      await Promise.all(
        Array.from({ length: 30 }, (_, j) =>
          cardsCol.doc().set({
            front: `Front ${j}`,
            back: `Back ${j}`,
            status: "new",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        ),
      );
      docs += 30;
    }

    const convCol = userRef.collection("conversations");
    const convRefs = await Promise.all(
      Array.from({ length: 10 }, (_, c) =>
        convCol.add({ title: `Conv ${c}`, createdAt: new Date(), updatedAt: new Date() }),
      ),
    );
    docs += 10;
    for (const convRef of convRefs) {
      const msgCol = convRef.collection("messages");
      await Promise.all(
        Array.from({ length: 20 }, (_, m) =>
          msgCol.add({ role: "user", content: `msg ${m}`, createdAt: new Date() }),
        ),
      );
      docs += 20;
    }

    await Promise.all([
      userRef.collection("doubts").add({ question: "q", answer: "a", type: "text", createdAt: Date.now() }),
      userRef.collection("notes").add({ title: "n", subject: "s", body: "b", createdAt: Date.now(), updatedAt: Date.now() }),
      userRef.collection("studyPlans").add({ title: "p", subject: "s", durationMinutes: 30, plannedDate: "2026-01-01", completed: false, createdAt: Date.now(), updatedAt: Date.now() }),
      userRef.collection("studySessions").add({ mode: "stopwatch", durationMinutes: 30, completed: true, createdAt: Date.now() }),
      userRef.collection("resources").add({ title: "r", subject: "s", type: "link", description: "d", createdAt: Date.now(), updatedAt: Date.now() }),
      userRef.collection("sessions").add({ device: "test", userAgent: "test", lastActive: Date.now(), current: true, createdAt: Date.now() }),
    ]);
    docs += 6;

    return docs;
  }

  async function callDeleteAccount(token: string) {
    return fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/auth/delete-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  test("deletes a user with a large amount of data safely (quota-safe batches)", async () => {
    const user = await createThrowawayUser("del-audit");
    const seeded = await seedUserData(user.uid);
    expect(seeded).toBeGreaterThan(1000);

    const res = await callDeleteAccount(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    let authGone = false;
    try {
      await adminAuth.getUser(user.uid);
    } catch (e) {
      authGone = (e as { code?: string }).code === "auth/user-not-found";
    }
    expect(authGone).toBe(true);

    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    expect(userDoc.exists).toBe(false);

    const quizSnap = await adminDb.collection("users").doc(user.uid).collection("quizAttempts").get();
    expect(quizSnap.empty).toBe(true);
    const decksSnap = await adminDb.collection("users").doc(user.uid).collection("flashcardDecks").get();
    expect(decksSnap.empty).toBe(true);
    const convSnap = await adminDb.collection("users").doc(user.uid).collection("conversations").get();
    expect(convSnap.empty).toBe(true);
  });

  test("handles an already-deleted auth user idempotently", async () => {
    const user = await createThrowawayUser("del-idem");
    await adminAuth.deleteUser(user.uid);

    const res = await callDeleteAccount(user.token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("returns 401 without a token", async () => {
    const res = await fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/auth/delete-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });
});

test.describe("Security: Firestore rules (uid immutability)", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("rules-audit");
    await createProfileDoc(user.uid, user.email);
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  const DOC_URL = () =>
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${user.uid}`;

  async function patch(fieldPaths: string[], fields: Record<string, unknown>) {
    const params = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join("&");
    return fetch(`${DOC_URL()}?${params}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ fields }),
    });
  }

  test("rejects changing the uid field", async () => {
    const res = await patch(["uid"], { uid: { stringValue: "hacked-uid" } });
    expect(res.status).toBe(403);
  });

  test("rejects changing createdAt", async () => {
    const res = await patch(["createdAt"], { createdAt: { integerValue: "1" } });
    expect(res.status).toBe(403);
  });

  test("rejects adding privileged fields (role/isAdmin)", async () => {
    const res = await patch(["role", "isAdmin"], {
      role: { stringValue: "admin" },
      isAdmin: { booleanValue: true },
    });
    expect(res.status).toBe(403);
  });

  test("allows legitimate profile updates", async () => {
    const res = await patch(["name"], { name: { stringValue: "Updated Name" } });
    expect(res.status).toBe(200);
  });
});

test.describe("Security: signup verification email failure", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows a recoverable error when the verification email cannot be sent", async ({ page }) => {
    let sendOobCodeCalls = 0;
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      const url = route.request().url();
      if (url.includes("accounts:sendOobCode")) {
        sendOobCodeCalls++;
        if (sendOobCodeCalls === 1) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              error: { code: 503, message: "SERVICE_UNAVAILABLE : Service is temporarily unavailable.", status: "UNAVAILABLE" },
            }),
          });
        } else {
          await route.fulfill({
            status: 429,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                code: 429,
                message: "TOO_MANY_ATTEMPTS_TRY_LATER : Too many attempts. Try again later.",
                errors: [{ message: "TOO_MANY_ATTEMPTS_TRY_LATER" }],
                status: "TOO_MANY_ATTEMPTS_TRY_LATER",
              },
            }),
          });
        }
        return;
      }
      await route.continue();
    });

    const email = uniqueEmail("signup-audit");

    await page.goto("http://localhost:3000/signup", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("Enter your name").fill("Audit Signup");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("At least 6 characters").fill(PASSWORD);
    await page.getByPlaceholder("Repeat your password").fill(PASSWORD);
    await page.locator("select").nth(0).selectOption("10");
    await page.locator("select").nth(1).selectOption("CBSE");

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/couldn't send the verification email/i)).toBeVisible();

    await page.getByRole("button", { name: "Resend Email" }).click();
    await expect(page.getByText(/too many requests\. please wait a minute before resending/i)).toBeVisible();

    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      await deleteThrowawayUser(userRecord.uid);
    } catch {
      // user already gone
    }
  });

  test("confirms email was sent on success", async ({ page }) => {
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      const url = route.request().url();
      if (url.includes("accounts:sendOobCode")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ email: "ok", requestType: "VERIFY_EMAIL" }),
        });
        return;
      }
      await route.continue();
    });

    const email = uniqueEmail("signup-ok");

    await page.goto("http://localhost:3000/signup", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("Enter your name").fill("Audit Signup");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("At least 6 characters").fill(PASSWORD);
    await page.getByPlaceholder("Repeat your password").fill(PASSWORD);
    await page.locator("select").nth(0).selectOption("10");
    await page.locator("select").nth(1).selectOption("CBSE");

    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/we sent a verification link/i)).toBeVisible();
    await expect(page.getByText(/couldn't send the verification email/i)).toHaveCount(0);

    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      await deleteThrowawayUser(userRecord.uid);
    } catch {
      // user already gone
    }
  });
});
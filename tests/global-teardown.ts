import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
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

const TEST_UID = "test-uid";

async function cleanupTestData() {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    console.warn("[global-teardown] FIREBASE_ADMIN_PRIVATE_KEY not set. Skipping cleanup.");
    return;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();

  try {
    const collectionsToClean = [
      "sessions",
      "studyPlans",
      "doubts",
      "flashcards",
      "notes",
      "quizResults",
      "quizAttempts",
      "timerSessions",
      "progress",
      "resources",
      "chatHistory",
    ];

    for (const collection of collectionsToClean) {
      try {
        const colRef = db.collection("users").doc(TEST_UID).collection(collection);
        const snapshot = await colRef.get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        if (!snapshot.empty) {
          await batch.commit();
          console.log(`[global-teardown] Cleaned ${snapshot.size} documents from users/${TEST_UID}/${collection}`);
        }
      } catch (err) {
        console.warn(`[global-teardown] Skipping ${collection}:`, err instanceof Error ? err.message : err);
      }
    }

    try {
      const userDoc = db.collection("users").doc(TEST_UID);
      const userSnap = await userDoc.get();
      if (userSnap.exists) {
        await userDoc.update({
          preferences: {
            soundEnabled: false,
            animationsEnabled: true,
            theme: "system",
            notificationsEnabled: true,
            enterToSend: true,
            autoScroll: true,
            responseStyle: "balanced",
            stepByStep: true,
            language: "english",
          },
        });
        console.log("[global-teardown] Reset test user preferences");
      }
    } catch (err) {
      console.warn("[global-teardown] Skipping user preferences reset:", err instanceof Error ? err.message : err);
    }
  } catch (error) {
    console.error("[global-teardown] Cleanup error:", error);
  }
}

export default async function globalTeardown() {
  await cleanupTestData();

  const storageStatePath = resolve(__dirname, "../storageState.json");
  if (existsSync(storageStatePath)) {
    try {
      unlinkSync(storageStatePath);
    } catch {
      // ignore
    }
  }
}

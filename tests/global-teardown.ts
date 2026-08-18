import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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

const TEST_EMAIL = "test@padhai-buddy.test";

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

  let uid: string;
  try {
    const userRecord = await getAuth().getUserByEmail(TEST_EMAIL);
    uid = userRecord.uid;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "auth/user-not-found") {
      console.log("[global-teardown] Test user not found, nothing to clean.");
      return;
    }
    throw e;
  }

  try {
    const collectionsToClean = [
      "studyPlans",
      "doubts",
      "notes",
      "quizAttempts",
      "studySessions",
      "resources",
      "conversations",
      "flashcardDecks",
    ];

    for (const collection of collectionsToClean) {
      try {
        const colRef = db.collection("users").doc(uid).collection(collection);
        const snapshot = await colRef.get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        if (!snapshot.empty) {
          await batch.commit();
          console.log(`[global-teardown] Cleaned ${snapshot.size} documents from users/${uid}/${collection}`);
        }
      } catch (err) {
        console.warn(`[global-teardown] Skipping ${collection}:`, err instanceof Error ? err.message : err);
      }
    }

    try {
      const deckColRef = db.collection("users").doc(uid).collection("flashcardDecks");
      const deckSnap = await deckColRef.get();
      for (const deckDoc of deckSnap.docs) {
        const cardsSnap = await deckDoc.ref.collection("cards").get();
        const batch = db.batch();
        cardsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        if (!cardsSnap.empty) await batch.commit();
      }
    } catch (err) {
      console.warn("[global-teardown] Skipping flashcard cards cleanup:", err instanceof Error ? err.message : err);
    }

    try {
      const convColRef = db.collection("users").doc(uid).collection("conversations");
      const convSnap = await convColRef.get();
      for (const convDoc of convSnap.docs) {
        const messagesSnap = await convDoc.ref.collection("messages").get();
        const batch = db.batch();
        messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
        if (!messagesSnap.empty) await batch.commit();
      }
    } catch (err) {
      console.warn("[global-teardown] Skipping conversation messages cleanup:", err instanceof Error ? err.message : err);
    }

    try {
      const userDoc = db.collection("users").doc(uid);
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

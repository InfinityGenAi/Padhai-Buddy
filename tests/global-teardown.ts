import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "test-project";

async function getTestUid(): Promise<string | null> {
  const metaPath = resolve(__dirname, "../test-user-meta.json");
  if (existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      return meta.uid || null;
    } catch {
      // ignore
    }
  }
  return null;
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({ projectId: PROJECT_ID });
}

async function cleanupTestData(uid: string) {
  console.log("[global-teardown] Found test user:", uid);

  const adminApp = initializeFirebaseAdmin();
  const adminDb = getFirestore(adminApp);

  const collectionsToClean = [
    "studyPlans",
    "doubts",
    "notes",
    "quizAttempts",
    "studySessions",
    "resources",
    "flashcardDecks",
    "conversations",
  ];

  for (const collection of collectionsToClean) {
    try {
      const collectionRef = adminDb.collection("users").doc(uid).collection(collection);
      const snapshot = await collectionRef.get();

      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (snapshot.docs.length > 0) {
        await batch.commit();
      }
      console.log(`[global-teardown] Cleaned ${collection} (${snapshot.docs.length} docs)`);
    } catch (err) {
      console.warn(`[global-teardown] Skipping ${collection}:`, err instanceof Error ? err.message : err);
    }
  }

  // Reset test user preferences
  try {
    const userRef = adminDb.collection("users").doc(uid);
    await userRef.update({
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
  } catch (err) {
    console.warn("[global-teardown] Skipping user preferences reset:", err instanceof Error ? err.message : err);
  }

  console.log("[global-teardown] Cleanup complete");
}

export default async function globalTeardown() {
  const uid = await getTestUid();
  if (uid) {
    await cleanupTestData(uid);
  }

  const storageStatePath = resolve(__dirname, "../storageState.json");
  if (existsSync(storageStatePath)) {
    try {
      unlinkSync(storageStatePath);
    } catch {
      // ignore
    }
  }

  const metaPath = resolve(__dirname, "../test-user-meta.json");
  if (existsSync(metaPath)) {
    try {
      unlinkSync(metaPath);
    } catch {
      // ignore
    }
  }
}
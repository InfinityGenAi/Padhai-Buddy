import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "test-project";

const adminApp = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId: PROJECT_ID });
const adminDb = getFirestore(adminApp);

async function getTestUserUid(): Promise<string | null> {
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

async function cleanupTestData() {
  const uid = await getTestUserUid();
  if (!uid) {
    console.log("[global-teardown] Test user not found, nothing to clean");
    return;
  }
  console.log("[global-teardown] Found test user:", uid);

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
      const snapshot = await adminDb.collection("users").doc(uid).collection(collection).get();
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`[global-teardown] Cleaned ${collection}`);
    } catch (err) {
      console.warn(`[global-teardown] Skipping ${collection}:`, err instanceof Error ? err.message : err);
    }
  }

  try {
    const userDocRef = adminDb.collection("users").doc(uid);
    await userDocRef.update({
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
  await cleanupTestData();

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
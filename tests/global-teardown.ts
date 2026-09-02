import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import http from "http";

const TEST_EMAIL = "test@padhai-buddy.test";
const PROJECT_ID = "infinity-gen-ai";

function isPortInUse(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port: number, timeoutMs = 60000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${port}`, () => {
        clearInterval(interval);
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for port ${port}`));
        }
      });
      req.setTimeout(1000);
    }, 500);
  });
}

function httpRequest(options: http.RequestOptions, body?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

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

  const authPort = 9099;
  await waitForPort(authPort, 120000);

  const result = await httpRequest({
    hostname: "localhost",
    port: authPort,
    path: `/identitytoolkit.googleapis.com/v1/accounts:lookup?key=test`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }, JSON.stringify({ email: [TEST_EMAIL] }));

  if ((result as any).users && (result as any).users.length > 0) {
    return (result as any).users[0].localId;
  }
  return null;
}

async function deleteFirestoreCollection(uid: string, collection: string) {
  const firestorePort = 8080;
  await waitForPort(firestorePort, 120000);

  const url = `http://localhost:${firestorePort}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/${collection}`;

  const result = await httpRequest({
    hostname: "localhost",
    port: firestorePort,
    path: encodeURI(`/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/${collection}`),
    method: "DELETE",
  });

  return result;
}

async function cleanupTestData() {
  const authInUse = await isPortInUse(9099);
  const firestoreInUse = await isPortInUse(8080);

  if (!authInUse || !firestoreInUse) {
    console.log("[global-teardown] Emulators not running, skipping cleanup");
    return;
  }

  console.log("[global-teardown] Starting cleanup...");

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
      await deleteFirestoreCollection(uid, collection);
      console.log(`[global-teardown] Cleaned ${collection}`);
    } catch (err) {
      console.warn(`[global-teardown] Skipping ${collection}:`, err instanceof Error ? err.message : err);
    }
  }

  try {
    await deleteFirestoreCollection(uid, "flashcardDecks");
    await deleteFirestoreCollection(uid, "conversations");
    console.log("[global-teardown] Cleaned subcollections");
  } catch (err) {
    console.warn("[global-teardown] Error cleaning subcollections:", err instanceof Error ? err.message : err);
  }

  try {
    const result = await httpRequest({
      hostname: "localhost",
      port: 8080,
      path: encodeURI(`/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`),
      method: "PATCH",
    }, JSON.stringify({
      fields: {
        preferences: {
          mapValue: {
            fields: {
              soundEnabled: { booleanValue: false },
              animationsEnabled: { booleanValue: true },
              theme: { stringValue: "system" },
              notificationsEnabled: { booleanValue: true },
              enterToSend: { booleanValue: true },
              autoScroll: { booleanValue: true },
              responseStyle: { stringValue: "balanced" },
              stepByStep: { booleanValue: true },
              language: { stringValue: "english" },
            },
          },
        },
      },
    }));
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

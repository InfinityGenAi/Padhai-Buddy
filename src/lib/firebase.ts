import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, setPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let initPromise: Promise<void> | undefined;

function shouldUseEmulators(): boolean {
  return process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
}

async function initializeFirebase(): Promise<void> {
  if (typeof window === "undefined") return;

  const existing = getApps();
  app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
  if (!app) throw new Error("Firebase app initialization failed");
  auth = getAuth(app);
  db = getFirestore(app);
  if (!auth) throw new Error("Firebase Auth initialization failed");

  if (shouldUseEmulators()) {
    const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
    const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "localhost:8080";
    const [firestoreHostname, firestorePortStr] = firestoreHost.split(":");
    const firestorePort = firestorePortStr ? Number(firestorePortStr) : 8080;
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    connectFirestoreEmulator(db, firestoreHostname, firestorePort);
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (err) {
    console.warn("[Firebase] Local persistence could not be enabled:", err);
  }
}

function ensureInitialized(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = initializeFirebase().catch((err) => {
    console.error("[Firebase] Initialization error:", err);
    initPromise = undefined;
    throw err;
  });

  return initPromise;
}

export async function waitForFirebaseInit(): Promise<void> {
  return ensureInitialized();
}

export function getFirebaseApp(): FirebaseApp | undefined {
  return app;
}
export function getFirebaseAuth(): Auth | undefined {
  return auth;
}
export function getFirestoreDb(): Firestore | undefined {
  return db;
}

export { firebaseConfig };
export default firebaseConfig;

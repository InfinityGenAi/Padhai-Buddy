import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

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
let persistenceApplied = false;

async function initializeFirebase(): Promise<void> {
  if (typeof window === "undefined") return;

  const existing = getApps();
  app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
  if (!app) throw new Error("Firebase app initialization failed");
  auth = getAuth(app);
  db = getFirestore(app);
  if (!auth) throw new Error("Firebase Auth initialization failed");

  if (!persistenceApplied) {
    persistenceApplied = true;
    setPersistence(auth, browserLocalPersistence).catch((persistErr) => {
      console.warn("[Firebase] Local persistence could not be enabled:", persistErr);
    });
  }
}

function ensureInitialized(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = initializeFirebase().catch((err) => {
    console.error("[Firebase] Initialization error:", err);
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

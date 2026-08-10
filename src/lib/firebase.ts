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

function ensureInitialized(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!app) {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      auth = getAuth(app);
      db = getFirestore(app);
    }
    if (auth) {
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
    }
  })();

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

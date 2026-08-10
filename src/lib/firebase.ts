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
let persistenceSet = false;

function ensureInitialized() {
  if (typeof window === "undefined") return;
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);

    if (!persistenceSet) {
      persistenceSet = true;
      setPersistence(auth, browserLocalPersistence).catch(() => {});
    }
  }
  return { app, auth, db };
}

export function getFirebaseApp(): FirebaseApp | undefined {
  return ensureInitialized()?.app;
}
export function getFirebaseAuth(): Auth | undefined {
  return ensureInitialized()?.auth;
}
export function getFirestoreDb(): Firestore | undefined {
  return ensureInitialized()?.db;
}

export { firebaseConfig };
export default firebaseConfig;

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const requiredEnvVars = [
  "FIREBASE_ADMIN_PROJECT_ID",
] as const;

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

let initializationError: string | null = null;
const useEmulator = process.env.FIRESTORE_EMULATOR_HOST === "localhost:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST === "localhost:9099";

function initializeAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) return undefined;

  if (useEmulator) {
    return initializeApp({ projectId });
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!clientEmail || !privateKey) return undefined;

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

const app = initializeAdmin();

if (!app && !useEmulator) {
  initializationError =
    `Missing required Firebase Admin environment variables: ${missingEnvVars.join(", ")}. ` +
    `Add them to .env.local. See .env.local.example for the required format. ` +
    `For FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY, ` +
    `download your service account JSON from the Firebase Console > Project Settings > Service Accounts.`;
  console.error("[Firebase Admin] Initialization error:", initializationError);
}

export const adminAuth = app ? getAuth(app) : undefined;
export const adminDb = app ? getFirestore(app) : undefined;

export const adminServices = { adminAuth, adminDb };
export { initializationError };

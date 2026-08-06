import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const requiredEnvVars = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

let initializationError: string | null = null;

if (missingEnvVars.length > 0) {
  initializationError =
    `Missing required Firebase Admin environment variables: ${missingEnvVars.join(", ")}. ` +
    `Add them to .env.local. See .env.local.example for the required format. ` +
    `For FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY, ` +
    `download your service account JSON from the Firebase Console > Project Settings > Service Accounts.`;
} else {
  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        }),
      });
    }
  } catch (error) {
    initializationError = `Firebase Admin initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

if (initializationError) {
  console.error("[Firebase Admin]", initializationError);
}

const app = getApps()[0];

export const adminAuth = app ? getAuth(app) : undefined;
export const adminDb = app ? getFirestore(app) : undefined;
export const adminStorage = app ? getStorage(app) : undefined;

export const adminServices = { adminAuth, adminDb, adminStorage };
export { initializationError };

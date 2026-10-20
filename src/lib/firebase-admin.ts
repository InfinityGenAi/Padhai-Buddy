import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const useEmulator =
  process.env.FIRESTORE_EMULATOR_HOST === "localhost:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST === "localhost:9099";

// Emulator mode only needs the project ID. Production Admin SDK initialization
// also requires the service-account email and private key.
const requiredEnvVars = useEmulator
  ? ["FIREBASE_ADMIN_PROJECT_ID"] as const
  : [
      "FIREBASE_ADMIN_PROJECT_ID",
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_ADMIN_PRIVATE_KEY",
    ] as const;

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

let initializationError: string | null = null;


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

let app: ReturnType<typeof initializeAdmin>;

try {
  app = initializeAdmin();
} catch (error) {
  // A malformed private key or invalid service-account value must not throw
  // while this module is imported: that would turn every API route importing
  // Firebase Admin into an opaque platform-level HTTP 500.
  const detail = error instanceof Error ? error.message : String(error);
  initializationError = `Firebase Admin initialization failed: ${detail}`;
  console.error("[Firebase Admin] Initialization error:", initializationError);
}

if (!app && !initializationError && !useEmulator) {
  initializationError =
    `Missing required Firebase Admin environment variables: ${missingEnvVars.join(", ")}. ` +
    `Configure these in the deployment environment. See .env.local.example for the required format. ` +
    `FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY must come from the Firebase Console service-account JSON.`;
  console.error("[Firebase Admin] Initialization error:", initializationError);
}

export const adminAuth = app ? getAuth(app) : undefined;
export const adminDb = app ? getFirestore(app) : undefined;

export const adminServices = { adminAuth, adminDb };
export { initializationError };

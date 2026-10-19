import { NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

export async function GET() {
  const checks = {
    firebaseClient: false,
    firebaseAdmin: false,
    groqApi: false,
  };

  const requiredClientEnvVars = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];
  checks.firebaseClient = requiredClientEnvVars.every((key) => process.env[key]);

  // Reflect whether the server-side SDK actually initialized, not just
  // whether strings exist in the deployment environment.
  checks.firebaseAdmin = Boolean(adminAuth && adminDb && !initializationError);

  checks.groqApi = !!process.env.GROQ_API_KEY;

  const allHealthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}

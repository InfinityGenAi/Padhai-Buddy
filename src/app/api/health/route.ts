import { NextResponse } from "next/server";

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

  const requiredAdminEnvVars = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ];
  checks.firebaseAdmin = requiredAdminEnvVars.every((key) => process.env[key]);

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

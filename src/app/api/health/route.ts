import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const isProduction = process.env.NODE_ENV === "production";
  const checks = {
    firebaseClient: false,
    firebaseAdmin: false,
    groqApi: false,
    aiConfigEncryption: false,
    distributedRateLimiting: false,
  };

  const requiredClientEnvVars = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];
  checks.firebaseClient = requiredClientEnvVars.every((key) => Boolean(process.env[key]));

  // This endpoint must stay available even when Firebase Admin credentials are
  // malformed. Do not import/initialize the Admin SDK here: an initialization
  // exception would otherwise make the diagnostic endpoint itself return 500.
  const requiredAdminEnvVars = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ];
  checks.firebaseAdmin = requiredAdminEnvVars.every((key) => Boolean(process.env[key]));

  checks.groqApi = Boolean(process.env.GROQ_API_KEY);
  checks.aiConfigEncryption =
    !isProduction || /^[a-f0-9]{64}$/i.test(process.env.AI_CONFIG_ENCRYPTION_KEY || "");
  checks.distributedRateLimiting =
    !isProduction ||
    Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  const allHealthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      checks,
      note: allHealthy
        ? "Required environment variables are present; this endpoint does not test external service connectivity."
        : "One or more required environment variables are missing or malformed. Check the checks object and deployment settings.",
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

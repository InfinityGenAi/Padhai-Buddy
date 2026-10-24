import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// This is an allowlist, not a secret. Only this verified Google account can
// receive the admin custom claim through this endpoint.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "infinitygenai@gmail.com")
  .trim()
  .toLowerCase();

export async function POST(req: NextRequest) {
  if (!adminAuth || initializationError) {
    return NextResponse.json(
      { error: "Admin authorization is temporarily unavailable. Check server configuration." },
      { status: 500 },
    );
  }

  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json({ error: "Sign in with Google to continue." }, { status: 401 });
  }

  try {
    // Verify the Firebase ID token cryptographically on the server. Never
    // trust an email address sent in the request body.
    const decoded = await adminAuth.verifyIdToken(match[1]);
    const email = decoded.email?.trim().toLowerCase();

    if (!email || email !== ADMIN_EMAIL || decoded.email_verified !== true) {
      return NextResponse.json(
        { error: `Access denied. Sign in with the verified Google account ${ADMIN_EMAIL}.` },
        { status: 403 },
      );
    }

    const userRecord = await adminAuth.getUser(decoded.uid);
    await adminAuth.setCustomUserClaims(decoded.uid, {
      ...(userRecord.customClaims || {}),
      admin: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin authorize] Failed to verify/grant admin access:", error);
    return NextResponse.json(
      { error: "Could not verify admin access. Please try signing in again." },
      { status: 401 },
    );
  }
}

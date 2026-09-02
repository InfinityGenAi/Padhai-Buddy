import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(req: NextRequest) {
  try {
    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Admin secret not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    // Create a Firebase custom token with admin claim
    let customToken: string;
    let errorMessage = "Failed to create auth token";
    try {
      customToken = await adminAuth!.createCustomToken(
        "admin-user",
        { admin: true }
      );
    } catch (tokenErr) {
      errorMessage = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      return NextResponse.json(
        { error: "Failed to create auth token: " + errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      customToken,
      message: "Admin authentication successful",
    });
  } catch (error: unknown) {
    console.error("Admin login error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
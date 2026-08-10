import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Firebase Admin not initialized" },
        { status: 500 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const sessionsRef = adminDb.collection("users").doc(uid).collection("sessions");
    const snapshot = await sessionsRef.get();

    const sessions = snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          device: data.device || "Unknown Device",
          browser: data.browser,
          os: data.os,
          userAgent: data.userAgent || "",
          lastActive: data.lastActive?.toMillis?.() || data.lastActive || Date.now(),
          current: data.current || false,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        };
      })
      .sort((a, b) => b.lastActive - a.lastActive);

    return NextResponse.json({ sessions });
  } catch (error: unknown) {
    console.error("Sessions list error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json(
        { error: initializationError || "Firebase Admin not initialized" },
        { status: 500 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const body = await req.json();

    const sessionId = String(body.sessionId || "");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const sessionRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("sessions")
      .doc(sessionId);
    const sessionSnap = await sessionRef.get();

    const createdAt = sessionSnap.exists
      ? sessionSnap.data()?.createdAt || Date.now()
      : Date.now();

    const sessionData = {
      device: String(body.device || "Unknown Device"),
      browser: body.browser ? String(body.browser) : null,
      os: body.os ? String(body.os) : null,
      userAgent: String(body.userAgent || ""),
      lastActive: Date.now(),
      current: true,
      createdAt,
    };

    await sessionRef.set(sessionData, { merge: true });

    const sessionsRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("sessions");
    const allSnap = await sessionsRef.get();
    const otherUpdates = allSnap.docs
      .filter((d) => d.id !== sessionId && d.data().current === true)
      .map((d) => d.ref.update({ current: false }));
    await Promise.all(otherUpdates);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Session register error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

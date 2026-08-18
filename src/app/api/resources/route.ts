import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: initializationError || "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get("resourceId");
    const search = searchParams.get("search") || "";

    if (resourceId) {
      const snap = await adminDb.collection("users").doc(decoded.uid).collection("resources").doc(resourceId).get();
      if (!snap.exists) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
      return NextResponse.json({ resource: { id: snap.id, ...snap.data() } });
    }

    const snap = await adminDb.collection("users").doc(decoded.uid).collection("resources").orderBy("updatedAt", "desc").get();
    const resources = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (search.trim()) {
      const q = search.toLowerCase();
      const filtered = resources.filter((r: Record<string, unknown>) =>
        String(r.title || "").toLowerCase().includes(q) ||
        String(r.description || "").toLowerCase().includes(q) ||
        String(r.subject || "").toLowerCase().includes(q)
      );
      return NextResponse.json({ resources: filtered });
    }

    return NextResponse.json({ resources });
  } catch {
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: initializationError || "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    let body: { action?: string; resourceId?: string; title?: string; subject?: string; type?: string; description?: string; url?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { action, resourceId, title, subject, type, description, url } = body;

    const VALID_TYPES = ["video", "article", "pdf", "link", "notes"];

    if (action === "create" || action === "update") {
      if (!title || !subject || !type || !description) {
        return NextResponse.json({ error: "Title, subject, type, and description are required" }, { status: 400 });
      }
      if (!VALID_TYPES.includes(String(type))) return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
      if (typeof title !== "string" || title.trim().length > 200) return NextResponse.json({ error: "Title must be a string of at most 200 characters" }, { status: 400 });
      if (typeof subject !== "string" || subject.trim().length > 100) return NextResponse.json({ error: "Subject must be a string of at most 100 characters" }, { status: 400 });
      if (typeof description !== "string" || description.trim().length > 2000) return NextResponse.json({ error: "Description must be a string of at most 2000 characters" }, { status: 400 });

      if (action === "create") {
        const resourceRef = adminDb.collection("users").doc(decoded.uid).collection("resources").doc();
        const resource = { title: title.trim(), subject: subject.trim(), type: String(type), description: description.trim(), url: String(url || "").slice(0, 1000), createdAt: Date.now(), updatedAt: Date.now() };
        await resourceRef.set(resource);
        return NextResponse.json({ resource: { id: resourceRef.id, ...resource } });
      }

      if (action === "update" && resourceId) {
        const updates: Record<string, unknown> = { updatedAt: Date.now() };
        if (title !== undefined) updates.title = title.trim();
        if (subject !== undefined) updates.subject = subject.trim();
        if (type !== undefined) updates.type = String(type);
        if (description !== undefined) updates.description = description.trim();
        if (url !== undefined) updates.url = String(url).slice(0, 1000);
        await adminDb.collection("users").doc(decoded.uid).collection("resources").doc(resourceId).update(updates);
        return NextResponse.json({ success: true });
      }
    }

    if (action === "delete" && resourceId) {
      await adminDb.collection("users").doc(decoded.uid).collection("resources").doc(resourceId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

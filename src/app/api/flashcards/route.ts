import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import type { Firestore } from "firebase-admin/firestore";

async function deleteCollection(db: Firestore, path: string): Promise<void> {
  const collectionRef = db.collection(path);
  const snapshot = await collectionRef.get();
  const deletes = snapshot.docs.map((d) => d.ref.delete());
  await Promise.all(deletes);
}

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
    const deckId = searchParams.get("deckId");

    if (deckId) {
      const deckSnap = await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).get();
      if (!deckSnap.exists) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      const cardsSnap = await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).collection("cards").orderBy("createdAt", "asc").get();
      const cards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ deck: { id: deckSnap.id, ...deckSnap.data() }, cards });
    }

    const decksSnap = await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").orderBy("updatedAt", "desc").get();
    const decks = decksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ decks });
  } catch {
    return NextResponse.json({ error: "Failed to fetch flashcards" }, { status: 500 });
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

    let body: { action?: string; deckId?: string; title?: string; subject?: string; description?: string; front?: string; back?: string; cardId?: string; status?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { action, deckId, title, subject, description, front, back, cardId, status } = body;

    const VALID_CARD_STATUSES = ["new", "learning", "known", "difficult"];

    if (action === "createDeck") {
      if (!title || !subject) return NextResponse.json({ error: "Title and subject are required" }, { status: 400 });
      if (typeof title !== "string" || title.trim().length > 100) return NextResponse.json({ error: "Title must be a string of at most 100 characters" }, { status: 400 });
      if (typeof subject !== "string" || subject.trim().length > 100) return NextResponse.json({ error: "Subject must be a string of at most 100 characters" }, { status: 400 });
      const deckRef = adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc();
      const deck = { title: title.trim(), subject: subject.trim(), description: String(description || "").slice(0, 500), createdAt: Date.now(), updatedAt: Date.now() };
      await deckRef.set(deck);
      return NextResponse.json({ deck: { id: deckRef.id, ...deck } });
    }

    if (action === "addCard" && deckId) {
      if (!front || !back) return NextResponse.json({ error: "Front and back are required" }, { status: 400 });
      if (typeof front !== "string" || front.trim().length > 500) return NextResponse.json({ error: "Front must be a string of at most 500 characters" }, { status: 400 });
      if (typeof back !== "string" || back.trim().length > 1000) return NextResponse.json({ error: "Back must be a string of at most 1000 characters" }, { status: 400 });
      if (status !== undefined && !VALID_CARD_STATUSES.includes(String(status))) return NextResponse.json({ error: "Invalid card status" }, { status: 400 });
      const cardRef = adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).collection("cards").doc();
      const card = { deckId, front: front.trim(), back: back.trim(), status: String(status || "new"), createdAt: Date.now(), updatedAt: Date.now() };
      await cardRef.set(card);
      await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).update({ updatedAt: Date.now() });
      return NextResponse.json({ card: { id: cardRef.id, ...card } });
    }

    if (action === "updateCard" && deckId && cardId) {
      const updates: Record<string, unknown> = { updatedAt: Date.now() };
      if (front !== undefined) {
        if (typeof front !== "string" || front.trim().length > 500) return NextResponse.json({ error: "Front must be a string of at most 500 characters" }, { status: 400 });
        updates.front = front.trim();
      }
      if (back !== undefined) {
        if (typeof back !== "string" || back.trim().length > 1000) return NextResponse.json({ error: "Back must be a string of at most 1000 characters" }, { status: 400 });
        updates.back = back.trim();
      }
      if (status !== undefined) {
        if (!VALID_CARD_STATUSES.includes(String(status))) return NextResponse.json({ error: "Invalid card status" }, { status: 400 });
        updates.status = String(status);
      }
      await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).collection("cards").doc(cardId).update(updates);
      await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).update({ updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }

    if (action === "deleteDeck" && deckId) {
      await deleteCollection(adminDb, `users/${decoded.uid}/flashcardDecks/${deckId}/cards`);
      await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).delete();
      return NextResponse.json({ success: true });
    }

    if (action === "deleteCard" && deckId && cardId) {
      await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).collection("cards").doc(cardId).delete();
      await adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId).update({ updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

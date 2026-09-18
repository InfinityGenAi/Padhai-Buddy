import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL } from "@/lib/groq";
import type { Firestore } from "firebase-admin/firestore";

interface FlashcardItem {
  front: string;
  back: string;
}

const BATCH_SIZE = 450;

async function deleteCollection(db: Firestore, path: string): Promise<void> {
  // Delete in chunks so decks with many cards never exceed Firestore
  // write quotas or cause a write storm.
  for (;;) {
    const snapshot = await db.collection(path).limit(BATCH_SIZE).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
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

    let body: { 
      action?: string; 
      deckId?: string; 
      title?: string; 
      subject?: string; 
      description?: string; 
      front?: string; 
      back?: string; 
      cardId?: string; 
      status?: string;
      noteBody?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { action, deckId, title, subject, description, front, back, cardId, status, noteBody } = body;

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

      // Verify parent deck exists and belongs to user
      const deckRef = adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId);
      const deckSnap = await deckRef.get();
      if (!deckSnap.exists) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }

      const cardRef = deckRef.collection("cards").doc();
      const card = { deckId, front: front.trim(), back: back.trim(), status: String(status || "new"), createdAt: Date.now(), updatedAt: Date.now() };
      await cardRef.set(card);
      await deckRef.update({ updatedAt: Date.now() });
      return NextResponse.json({ card: { id: cardRef.id, ...card } });
    }

    if (action === "updateCard" && deckId && cardId) {
      // Verify parent deck exists and belongs to user
      const deckRef = adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId);
      const deckSnap = await deckRef.get();
      if (!deckSnap.exists) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }

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
      await deckRef.collection("cards").doc(cardId).update(updates);
      await deckRef.update({ updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }

    if (action === "deleteDeck" && deckId) {
      // Verify parent deck exists and belongs to user
      const deckRef = adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId);
      const deckSnap = await deckRef.get();
      if (!deckSnap.exists) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }

      await deleteCollection(adminDb, `users/${decoded.uid}/flashcardDecks/${deckId}/cards`);
      await deckRef.delete();
      return NextResponse.json({ success: true });
    }

    if (action === "deleteCard" && deckId && cardId) {
      // Verify parent deck exists and belongs to user
      const deckRef = adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc(deckId);
      const deckSnap = await deckRef.get();
      if (!deckSnap.exists) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }

      await deckRef.collection("cards").doc(cardId).delete();
      await deckRef.update({ updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }

    // New action: create flashcards from a note using AI
    if (action === "create-from-note") {
      if (!title || !subject || !noteBody) return NextResponse.json({ error: "Title, subject, and noteBody are required" }, { status: 400 });
      if (typeof title !== "string" || title.trim().length > 100) return NextResponse.json({ error: "Title must be a string of at most 100 characters" }, { status: 400 });
      if (typeof subject !== "string" || subject.trim().length > 100) return NextResponse.json({ error: "Subject must be a string of at most 100 characters" }, { status: 400 });
      if (typeof noteBody !== "string" || noteBody.trim().length < 50) return NextResponse.json({ error: "Note body must be at least 50 characters" }, { status: 400 });

      // Create the deck
      const deckRef = adminDb.collection("users").doc(decoded.uid).collection("flashcardDecks").doc();
      const deck = { title: title.trim(), subject: subject.trim(), description: "Generated from note", createdAt: Date.now(), updatedAt: Date.now() };
      await deckRef.set(deck);

      // Use AI to generate flashcards from the note
      const systemPrompt = `You are a flashcard generator for students. Create flashcards from the provided note content. Generate 5-10 high-quality flashcards that capture the key concepts, definitions, formulas, and important facts from the note. Each flashcard should have a clear question/concept on the front and a concise answer on the back. Return ONLY a valid JSON array of objects with "front" and "back" properties.`;

      const userPrompt = `Create flashcards from this note:\n\nSubject: ${subject}\nTitle: ${title}\n\nNote:\n${noteBody}\n\nReturn ONLY a JSON array like: [{"front": "Question", "back": "Answer"}, ...]`;

      let flashcards: { front: string; back: string }[] = [];
      try {
        const completion = await getGroqClient().chat.completions.create({
          model: GROQ_TEXT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        });

        const raw = completion.choices[0]?.message?.content || "[]";
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          flashcards = parsed
            .filter((c: FlashcardItem) => c.front && c.back && typeof c.front === "string" && typeof c.back === "string")
            .slice(0, 15); // Limit to 15 cards
        }
      } catch {
        // If AI fails, create basic flashcards from the note structure
        flashcards = [];
      }

      // If AI didn't generate enough cards, create some from the note structure
      if (flashcards.length < 3) {
        // Extract key sentences/concepts as fallback
        const sentences = noteBody.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 10);
        flashcards = sentences.map((s, i) => ({
          front: `Key concept ${i + 1}`,
          back: s.trim(),
        }));
      }

      // Add flashcards to the deck
      const batch = adminDb.batch();
      for (const card of flashcards) {
        const cardRef = deckRef.collection("cards").doc();
        batch.set(cardRef, {
          deckId: deckRef.id,
          front: card.front.trim(),
          back: card.back.trim(),
          status: "new",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      await batch.commit();
      await deckRef.update({ updatedAt: Date.now() });

      return NextResponse.json({ deck: { id: deckRef.id, ...deck }, flashcardCount: flashcards.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
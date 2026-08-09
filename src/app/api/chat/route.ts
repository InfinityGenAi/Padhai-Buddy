import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL, buildSystemPrompt } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || initializationError) {
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

    let body: {
      message?: unknown;
      class?: unknown;
      board?: unknown;
      responseStyle?: unknown;
      stepByStep?: unknown;
      language?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { message, class: studentClass, board, responseStyle, stepByStep, language } = body;

    if (!message || !studentClass || !board) {
      return NextResponse.json(
        { error: "Missing message, class, or board" },
        { status: 400 },
      );
    }

    const messageStr = String(message);
    if (messageStr.length > 5000) {
      return NextResponse.json(
        { error: "Message exceeds maximum length" },
        { status: 400 },
      );
    }

    const validClasses = ["5", "6", "7", "8", "9", "10", "11", "12"];
    const validBoards = ["CBSE", "ICSE", "State Board"];
    if (!validClasses.includes(String(studentClass))) {
      return NextResponse.json(
        { error: "Invalid class value" },
        { status: 400 },
      );
    }
    if (!validBoards.includes(String(board))) {
      return NextResponse.json(
        { error: "Invalid board value" },
        { status: 400 },
      );
    }

    const systemPrompt = buildSystemPrompt(String(studentClass), String(board), {
      responseStyle: responseStyle !== undefined ? String(responseStyle) : undefined,
      stepByStep: stepByStep !== undefined ? Boolean(stepByStep) : undefined,
      language: language !== undefined ? String(language) : undefined,
    });

    const completion = await getGroqClient().chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messageStr },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't generate an answer at this time. Please try again.";

    return NextResponse.json({
      answer,
      userId: decoded.uid,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

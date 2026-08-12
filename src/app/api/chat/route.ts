import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL, buildSystemPrompt } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    console.log("[CHAT] request received");

    if (!adminAuth || initializationError) {
      console.error("[CHAT] Firebase Admin not initialized:", initializationError);
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      console.warn("[CHAT] missing authorization token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
      console.log("[CHAT] auth verified uid:", decoded.uid);
    } catch (authError) {
      console.error("[CHAT] token verification failed:", authError);
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

    console.log("[CHAT] sending request to Groq model:", GROQ_TEXT_MODEL);
    let completion;
    try {
      completion = await getGroqClient().chat.completions.create({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messageStr },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      });
    } catch (groqError) {
      console.error("[CHAT] Groq request failed:", groqError);
      const status = groqError instanceof Error && groqError.message.includes("401")
        ? 502
        : 502;
      return NextResponse.json(
        {
          error: "AI service temporarily unavailable. Please try again in a moment.",
          _dev: process.env.NODE_ENV === "development" ? (groqError instanceof Error ? groqError.message : String(groqError)) : undefined,
        },
        { status },
      );
    }

    console.log("[CHAT] Groq response received");

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't generate an answer at this time. Please try again.";

    console.log("[CHAT] response content extracted length:", answer.length);
    console.log("[CHAT] sending response to client");

    return NextResponse.json({
      answer,
      userId: decoded.uid,
    });
  } catch (error: unknown) {
    console.error("[CHAT] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        _dev: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}

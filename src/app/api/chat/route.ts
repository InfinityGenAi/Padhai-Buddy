import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL, buildSystemPrompt, StudyMode } from "@/lib/groq";
import { checkRateLimit } from "@/lib/rate-limiter";

const MAX_MESSAGE_LENGTH = 5000;

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || initializationError) {
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
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

    const rateLimitResult = checkRateLimit(`chat:${decoded.uid}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        },
      );
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    let body: {
      message?: unknown;
      class?: unknown;
      board?: unknown;
      responseStyle?: unknown;
      stepByStep?: unknown;
      language?: unknown;
      studyMode?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { message, class: studentClass, board, responseStyle, stepByStep, language, studyMode } = body;

    if (!message || !studentClass || !board) {
      return NextResponse.json(
        { error: "Missing message, class, or board" },
        { status: 400 },
      );
    }

    const messageStr = String(message);
    if (messageStr.length > MAX_MESSAGE_LENGTH) {
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
      studyMode: studyMode !== undefined ? (studyMode as StudyMode) : undefined,
    });

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
    } catch {
      return NextResponse.json(
        {
          error: "AI service temporarily unavailable. Please try again in a moment.",
        },
        { status: 502 },
      );
    }

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't generate an answer at this time. Please try again.";

    return NextResponse.json({
      answer,
      userId: decoded.uid,
    });
  } catch (error: unknown) {
    console.error("[CHAT] unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}

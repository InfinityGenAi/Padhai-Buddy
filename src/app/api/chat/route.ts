import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL, buildSystemPrompt, StudyMode } from "@/lib/groq";
import { checkRateLimit } from "@/lib/rate-limiter";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_HISTORY_MESSAGES = 10;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function createStreamingResponse(stream: AsyncIterable<unknown>): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const choice = (chunk as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0];
          const content = choice?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("[CHAT] Streaming error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`));
        controller.close();
      }
    },
  });
}

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

    const rateLimitResult = await checkRateLimit(`chat:${decoded.uid}`);
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
      history?: unknown;
      stream?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { message, class: studentClass, board, responseStyle, stepByStep, language, studyMode, history, stream } = body;

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

    const validStudyModes = ["explain", "teach", "quiz", "hint", "simplify", "deep", "exam"];
    const validatedStudyMode = studyMode !== undefined && studyMode !== null
      ? validStudyModes.includes(String(studyMode))
        ? (String(studyMode) as StudyMode)
        : null
      : null;

    const systemPrompt = buildSystemPrompt(String(studentClass), String(board), {
      responseStyle: responseStyle !== undefined ? String(responseStyle) : undefined,
      stepByStep: stepByStep !== undefined ? Boolean(stepByStep) : undefined,
      language: language !== undefined ? String(language) : undefined,
      studyMode: validatedStudyMode,
    });

    const historyMessages: ChatMessage[] = [];
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
      for (const msg of recentHistory) {
        if (msg && typeof msg === "object" && msg.role && msg.content) {
          const role = msg.role === "user" || msg.role === "assistant" ? msg.role : "user";
          const content = String(msg.content).slice(0, MAX_MESSAGE_LENGTH);
          if (content.trim()) {
            historyMessages.push({ role, content });
          }
        }
      }
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...historyMessages,
      { role: "user" as const, content: messageStr },
    ];

    const shouldStream = stream === true;

    try {
      if (shouldStream) {
        const groqStream = await getGroqClient().chat.completions.create({
          model: GROQ_TEXT_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 2048,
          stream: true,
        });

        return new NextResponse(createStreamingResponse(groqStream), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        });
      }

      const completion = await getGroqClient().chat.completions.create({
        model: GROQ_TEXT_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
      });

      const answer =
        completion.choices[0]?.message?.content ||
        "I couldn't generate an answer at this time. Please try again.";

      return NextResponse.json({
        answer,
        userId: decoded.uid,
      }, {
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      });
    } catch {
      return NextResponse.json(
        {
          error: "AI service temporarily unavailable. Please try again in a moment.",
        },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    console.error("[CHAT] unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}

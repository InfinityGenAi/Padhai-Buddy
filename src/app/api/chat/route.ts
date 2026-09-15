import { NextRequest, NextResponse } from "next/server";
import { adminAuth, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { sendMessage, validateProviderConfig, AI_PROVIDERS, UserAIConfig, AIProviderId, AIProviderResponse, AIProviderStreamChunk } from "@/lib/ai-providers";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_HISTORY_MESSAGES = 10;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function createStreamingResponse(stream: AsyncIterable<{ content: string; done: boolean }>): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`));
          }
          if (chunk.done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            break;
          }
        }
        controller.close();
      } catch (error) {
        console.error("[CHAT] Streaming error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`));
        controller.close();
      }
    },
  });
}

function isAsyncIterable<T>(obj: T | AsyncIterable<T>): obj is AsyncIterable<T> {
  return obj !== null && typeof obj === "object" && Symbol.asyncIterator in obj;
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
      provider?: unknown;
      model?: unknown;
      apiKey?: unknown;
      baseUrl?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      message,
      class: studentClass,
      board,
      responseStyle,
      stepByStep,
      language,
      studyMode,
      history,
      stream,
      provider: providerId,
      model,
      apiKey,
      baseUrl,
    } = body;

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

    const validStudyModes = ["explain", "teach", "quiz", "hint", "simplify", "deep", "exam"] as const;
    type StudyMode = typeof validStudyModes[number];
    const validatedStudyMode = studyMode !== undefined && studyMode !== null
      ? validStudyModes.includes(String(studyMode) as StudyMode)
        ? String(studyMode) as StudyMode
        : null
      : null;

    // Build system prompt (same as before)
    const styleMap: Record<string, string> = {
      balanced: "Give balanced explanations suitable for a Class student.",
      concise: "Keep answers concise and to the point.",
      detailed: "Give detailed, thorough explanations with examples and context.",
    };

    const stepMap: Record<number, string> = {
      0: "You can skip step-by-step breakdowns and give more direct answers when appropriate.",
      1: "Break down your explanations into clear, numbered steps to help the student follow along.",
    };

    const langMap: Record<string, string> = {
      english: "Respond in English.",
      hindi: "Respond in Hindi.",
      hinglish: "Respond in Hinglish (a casual mix of Hindi and English).",
    };

    const modeMap: Record<string, string> = {
      explain: `Explain the concept clearly and simply. Structure your response with:
- A direct, one-sentence answer
- A clear explanation in simple terms
- A concrete example if helpful
- One key takeaway point
Keep it focused and easy to understand.`,
      teach: `Teach the concept step-by-step like a teacher in a classroom.
- Start with what the student likely already knows (prior knowledge hook)
- Build understanding progressively in small steps
- Use simple, relatable examples at each step
- Check understanding with a brief question before moving on
- End with a summary and a practice question for them to try
Be encouraging and patient.`,
      quiz: `Quiz the student on this topic interactively.
- Ask ONE clear, focused question at a time
- Do NOT provide the answer immediately — wait for their response
- After they answer, evaluate it and give constructive feedback
- Then ask the next question or explain if needed
- Keep questions appropriate for Class ${studentClass} ${board}
If this is the first message in a quiz session, start with a welcoming question.`,
      hint: `Give a gentle hint or clue to help the student figure it out themselves.
- Do NOT give the full answer
- Provide a nudge in the right direction (e.g., "Think about what formula relates X and Y" or "Recall the rule for...")
- Keep it brief — one or two sentences
- Encourage them to try solving it`,
      simplify: `Simplify the concept as much as possible.
- Use everyday analogies and relatable examples
- Avoid jargon and technical terms unless necessary (explain them simply if used)
- Break it down to its absolute core idea
- Make it feel approachable, not academic
- One clear takeaway`,
      deep: `Provide a deep, thorough explanation with structure:
- Direct answer
- Step-by-step derivation or reasoning
- Mathematical/scientific formulation where applicable
- Connections to related topics
- Advanced context or extensions
- Summary of key insights
Use proper notation for formulas and equations.`,
      exam: `Explain this in an exam-oriented way for Class ${studentClass} ${board}.
Structure with:
- Key formulas, definitions, or theorems (highlight what to memorize)
- Common question patterns and how to approach them
- Step-by-step solution method for typical problems
- Common mistakes to avoid
- Short revision points (bullet form for quick review)
- What examiners specifically look for in answers
Keep it focused and practical.`,
    };

    const systemPrompt = `You are a friendly, patient tutor for a Class ${studentClass} ${board} student in India. ${langMap[language as string] || langMap.english} ${styleMap[responseStyle as string] || styleMap.balanced} ${stepMap[stepByStep ? 1 : 0]} ${validatedStudyMode ? modeMap[validatedStudyMode] : ""}

RESPONSE STRUCTURE GUIDELINES (apply naturally, don't force every section):
- Start with a direct, clear answer
- Follow with explanation/reasoning
- Include steps when solving problems
- Provide a concrete example when helpful
- Add a "Key Point" or "Exam Tip" for important concepts
- Use proper formatting: bold for key terms, code blocks for formulas/equations, bullet points for lists
- Keep language appropriate for Class ${studentClass} ${board} syllabus
- Be encouraging and supportive`;

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

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: messageStr },
    ];

    const shouldStream = stream === true;

    // Determine AI config: user-provided or server default (Groq)
    let aiConfig: UserAIConfig;
    if (providerId && apiKey) {
      // User provided their own config
      const providerIdValidated = providerId as AIProviderId;
      if (!AI_PROVIDERS[providerIdValidated]) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
      }
      const providerConfig = AI_PROVIDERS[providerIdValidated];
      if (providerConfig.requiresApiKey && !apiKey) {
        return NextResponse.json({ error: "API key required for this provider" }, { status: 400 });
      }
      if (providerConfig.supportsCustomBaseUrl && baseUrl) {
        aiConfig = {
          provider: providerIdValidated,
          apiKey: String(apiKey),
          model: String(model || providerConfig.defaultModel),
          baseUrl: String(baseUrl),
          updatedAt: Date.now(),
        };
      } else {
        aiConfig = {
          provider: providerIdValidated,
          apiKey: String(apiKey),
          model: String(model || providerConfig.defaultModel),
          updatedAt: Date.now(),
        };
      }
    } else {
      // Use server default (Groq)
      aiConfig = {
        provider: "groq" as AIProviderId,
        apiKey: process.env.GROQ_API_KEY || "",
        model: "openai/gpt-oss-120b",
        updatedAt: Date.now(),
      };
      if (!aiConfig.apiKey) {
        return NextResponse.json(
          { error: "AI service not configured on server" },
          { status: 500 },
        );
      }
    }

    // Validate provider config
    const validation = await validateProviderConfig(aiConfig.provider, aiConfig);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid AI provider configuration" },
        { status: 400 },
      );
    }

    try {
      if (shouldStream) {
        const streamResult = await sendMessage(aiConfig.provider, messages, aiConfig, true) as AsyncIterable<AIProviderStreamChunk>;
        if (!isAsyncIterable(streamResult)) {
          return NextResponse.json(
            { error: "Provider does not support streaming" },
            { status: 400 },
          );
        }

        return new NextResponse(createStreamingResponse(streamResult), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        });
      }

      const completion = await sendMessage(aiConfig.provider, messages, aiConfig, false);
      const answer = (completion as AIProviderResponse).content;

      return NextResponse.json({
        answer,
        userId: decoded.uid,
      }, {
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.remaining + 1),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      });
    } catch (error: unknown) {
      console.error("[CHAT] Provider error:", error);
      const message = error instanceof Error ? error.message : "AI service temporarily unavailable. Please try again in a moment.";
      return NextResponse.json(
        {
          error: message,
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
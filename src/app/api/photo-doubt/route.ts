import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_VISION_MODEL, buildSystemPrompt } from "@/lib/groq";
import { checkRateLimit } from "@/lib/rate-limiter";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VALID_CLASSES = ["5", "6", "7", "8", "9", "10", "11", "12"];
const VALID_BOARDS = ["CBSE", "ICSE", "State Board"];

// File signature (magic bytes) validation
const FILE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header, need to check "WEBP" at offset 8
};

function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signature = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES];
  if (!signature) return false;

  if (mimeType === "image/webp") {
    // WebP: RIFF header + "WEBP" at offset 8
    if (buffer.length < 12) return false;
    const riffMatch = signature.every((byte, i) => buffer[i] === byte);
    const webpMatch = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // "WEBP"
    return riffMatch && webpMatch;
  }

  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  const log = (stage: string, extra?: Record<string, unknown>) => {
    console.log(`[PHOTO-DOUBT:${requestId}] ${stage} | ${Date.now() - startTime}ms`, extra ?? "");
  };

  try {
    log("START", { method: req.method, url: req.url });

    // Check server configuration early
    if (!adminAuth || initializationError) {
      log("CONFIG_ERROR", { error: "Firebase Admin not initialized", details: initializationError });
      return NextResponse.json(
        { error: "Server configuration error: Firebase Admin not initialized" },
        { status: 500 },
      );
    }
    log("FIREBASE_ADMIN_OK");

    // Check for required environment variables
    if (!process.env.GROQ_API_KEY) {
      log("CONFIG_ERROR", { error: "GROQ_API_KEY not configured" });
      return NextResponse.json(
        { error: "Server configuration error: AI service not configured" },
        { status: 500 },
      );
    }
    log("GROQ_API_KEY_OK", { keyPrefix: process.env.GROQ_API_KEY?.slice(0, 8) });

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      log("AUTH_ERROR", { error: "Missing token" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
      log("AUTH_OK", { uid: decoded.uid });
    } catch (authErr) {
      log("AUTH_ERROR", { error: authErr instanceof Error ? authErr.message : "Invalid token" });
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(`photo:${decoded.uid}`);
    if (!rateLimitResult.allowed) {
      log("RATE_LIMITED", { retryAfter: rateLimitResult.retryAfter });
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
    log("RATE_LIMIT_OK", { remaining: rateLimitResult.remaining });

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      log("VALIDATION_ERROR", { error: "Not multipart/form-data", contentType });
      return NextResponse.json(
        { error: "Expected multipart/form-data request" },
        { status: 400 },
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formErr) {
      log("VALIDATION_ERROR", { error: "Malformed multipart", details: formErr instanceof Error ? formErr.message : String(formErr) });
      return NextResponse.json({ error: "Malformed multipart request" }, { status: 400 });
    }

    const fileField = formData.get("file");
    const classField = formData.get("class");
    const boardField = formData.get("board");

    if (!fileField || !(fileField instanceof File)) {
      log("VALIDATION_ERROR", { error: "Missing file" });
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 },
      );
    }

    const studentClass = String(classField ?? "");
    const board = String(boardField ?? "");

    log("FILE_RECEIVED", {
      name: fileField.name,
      type: fileField.type,
      size: fileField.size,
      studentClass,
      board,
    });

    if (!ALLOWED_MIME_TYPES.has(fileField.type)) {
      log("VALIDATION_ERROR", { error: "Invalid MIME type", type: fileField.type });
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 },
      );
    }

    if (fileField.size > MAX_FILE_SIZE) {
      log("VALIDATION_ERROR", { error: "File too large", size: fileField.size, max: MAX_FILE_SIZE });
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB." },
        { status: 400 },
      );
    }

    if (fileField.size === 0) {
      log("VALIDATION_ERROR", { error: "Empty file" });
      return NextResponse.json(
        { error: "Empty file. Please select a valid image." },
        { status: 400 },
      );
    }

    if (!VALID_CLASSES.includes(studentClass)) {
      log("VALIDATION_ERROR", { error: "Invalid class", class: studentClass });
      return NextResponse.json(
        { error: "Invalid class value" },
        { status: 400 },
      );
    }

    if (!VALID_BOARDS.includes(board)) {
      log("VALIDATION_ERROR", { error: "Invalid board", board });
      return NextResponse.json(
        { error: "Invalid board value" },
        { status: 400 },
      );
    }

    // Read file buffer for signature validation
    const arrayBuffer = await fileField.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    log("BUFFER_READ", { bufferLength: buffer.length });

    // Validate actual file signature (magic bytes)
    const declaredMime = fileField.type;
    if (!validateFileSignature(buffer, declaredMime)) {
      log("VALIDATION_ERROR", { error: "Invalid file signature", declaredMime });
      return NextResponse.json(
        { error: "File content does not match declared type. Please upload a valid JPEG, PNG, or WebP image." },
        { status: 400 },
      );
    }
    log("SIGNATURE_OK");

    // Convert to base64 data URI
    let dataUri: string;
    try {
      const base64 = buffer.toString("base64");
      const mime = ALLOWED_MIME_TYPES.has(fileField.type) ? fileField.type : "application/octet-stream";
      dataUri = `data:${mime};base64,${base64}`;
      log("DATA_URI_CREATED", { dataUriLength: dataUri.length, base64Length: base64.length });
    } catch (convErr) {
      log("CONVERSION_ERROR", { error: convErr instanceof Error ? convErr.message : String(convErr) });
      return NextResponse.json(
        { error: "Failed to process image" },
        { status: 400 },
      );
    }

    const systemPrompt = buildSystemPrompt(studentClass, board);
    log("PROMPT_BUILT", { systemPromptLength: systemPrompt.length });

    // Prepare Groq request
    const userContent = `${systemPrompt} Please read the question or problem in the image and solve it step by step.`;
    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: userContent },
          {
            type: "image_url" as const,
            image_url: { url: dataUri },
          },
        ],
      },
    ];

    log("GROQ_REQUEST_PREPARED", {
      model: GROQ_VISION_MODEL,
      messageCount: messages.length,
      contentParts: messages[0].content.length,
      estimatedTokens: Math.ceil((userContent.length + dataUri.length) / 4),
    });

    // Call Groq Vision API with explicit timeout
    let completion;
    const groqStartTime = Date.now();
    try {
      const groqClient = getGroqClient();
      log("GROQ_CLIENT_OK");

      // Use AbortController for timeout control (Render free tier: 30s, Groq default: 60s)
      const controller = new AbortController();
      const timeoutMs = 25000; // 25 seconds - leave margin before Render's 30s limit
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        completion = await groqClient.chat.completions.create({
          model: GROQ_VISION_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: 2048,
        }, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      log("GROQ_RESPONSE_OK", { durationMs: Date.now() - groqStartTime });
    } catch (error: unknown) {
      const groqDuration = Date.now() - groqStartTime;
      log("GROQ_API_ERROR", {
        durationMs: groqDuration,
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "UnknownError",
        cause: error instanceof Error ? error.cause : undefined,
      });

      // Provide more specific error messages based on error type
      let errorMessage = "Failed to analyze image. Please try again.";
      let statusCode = 502;

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes("api key") || errorMsg.includes("unauthorized") || errorMsg.includes("401")) {
          errorMessage = "AI service authentication failed. Please contact support.";
          statusCode = 500;
        } else if (errorMsg.includes("model") && (errorMsg.includes("not found") || errorMsg.includes("decommissioned") || errorMsg.includes("deprecated"))) {
          errorMessage = "AI model unavailable. Please contact support.";
          statusCode = 500;
        } else if (errorMsg.includes("rate limit") || errorMsg.includes("429")) {
          errorMessage = "AI service rate limit exceeded. Please try again later.";
          statusCode = 429;
        } else if (errorMsg.includes("payload") || errorMsg.includes("too large") || errorMsg.includes("413")) {
          errorMessage = "Image too large for AI processing. Please try a smaller image.";
          statusCode = 400;
        } else if (errorMsg.includes("timeout") || errorMsg.includes("timed out") || error.name === "AbortError" || error.name === "APIConnectionTimeoutError") {
          errorMessage = "AI processing timed out. Please try a smaller image or try again later.";
          statusCode = 504;
        } else if (errorMsg.includes("connection") || errorMsg.includes("network") || errorMsg.includes("econnreset") || errorMsg.includes("socket")) {
          errorMessage = "AI service connection failed. Please try again.";
          statusCode = 502;
        }
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode },
      );
    }

    if (!completion?.choices?.[0]?.message?.content) {
      log("GROQ_EMPTY_RESPONSE", { completion: JSON.stringify(completion).slice(0, 500) });
      return NextResponse.json(
        { error: "AI returned empty response. Please try again." },
        { status: 502 },
      );
    }

    const answer = completion.choices[0].message.content;
    log("ANSWER_RECEIVED", { answerLength: answer.length });

    // Save to Firestore (non-blocking for response)
    let saveError: string | null = null;
    try {
      if (!adminDb) throw new Error("Firestore admin is not initialized");
      await adminDb
        .collection("users")
        .doc(decoded.uid)
        .collection("doubts")
        .add({
          question: "Photo Doubt",
          answer,
          type: "photo",
          createdAt: Date.now(),
        });
      log("FIRESTORE_SAVE_OK");
    } catch (dbError) {
      log("FIRESTORE_SAVE_ERROR", { error: dbError instanceof Error ? dbError.message : String(dbError) });
      saveError = dbError instanceof Error ? dbError.message : "Failed to save photo doubt";
    }

    log("COMPLETE", { totalDurationMs: Date.now() - startTime, saved: !saveError });

    if (saveError) {
      return NextResponse.json({
        answer,
        userId: decoded.uid,
        saved: false,
      });
    }

    return NextResponse.json({
      answer,
      userId: decoded.uid,
      saved: true,
    });
  } catch (error: unknown) {
    log("UNEXPECTED_ERROR", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
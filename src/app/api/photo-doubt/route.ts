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
  try {
    // Check server configuration early
    if (!adminAuth || initializationError) {
      console.error("[PHOTO-DOUBT] Firebase Admin not initialized:", initializationError);
      return NextResponse.json(
        { error: "Server configuration error: Firebase Admin not initialized" },
        { status: 500 },
      );
    }

    // Check for required environment variables
    if (!process.env.GROQ_API_KEY) {
      console.error("[PHOTO-DOUBT] GROQ_API_KEY not configured");
      return NextResponse.json(
        { error: "Server configuration error: AI service not configured" },
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

    const rateLimitResult = await checkRateLimit(`photo:${decoded.uid}`);
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

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data request" },
        { status: 400 },
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Malformed multipart request" }, { status: 400 });
    }

    const fileField = formData.get("file");
    const classField = formData.get("class");
    const boardField = formData.get("board");

    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 },
      );
    }

    const studentClass = String(classField ?? "");
    const board = String(boardField ?? "");

    if (!ALLOWED_MIME_TYPES.has(fileField.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 },
      );
    }

    if (fileField.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB." },
        { status: 400 },
      );
    }

    if (fileField.size === 0) {
      return NextResponse.json(
        { error: "Empty file. Please select a valid image." },
        { status: 400 },
      );
    }

    if (!VALID_CLASSES.includes(studentClass)) {
      return NextResponse.json(
        { error: "Invalid class value" },
        { status: 400 },
      );
    }

    if (!VALID_BOARDS.includes(board)) {
      return NextResponse.json(
        { error: "Invalid board value" },
        { status: 400 },
      );
    }

    // Read file buffer for signature validation
    const arrayBuffer = await fileField.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate actual file signature (magic bytes)
    const declaredMime = fileField.type;
    if (!validateFileSignature(buffer, declaredMime)) {
      return NextResponse.json(
        { error: "File content does not match declared type. Please upload a valid JPEG, PNG, or WebP image." },
        { status: 400 },
      );
    }

    // Check for reasonable image dimensions (basic check)
    // JPEG: SOF marker at offset varies, PNG: IHDR at offset 8, WebP: VP8 at offset 12
    // Skip detailed dimension check to avoid breaking normal phone-camera uploads

    let dataUri: string;
    try {
      const base64 = buffer.toString("base64");
      const mime = ALLOWED_MIME_TYPES.has(fileField.type) ? fileField.type : "application/octet-stream";
      dataUri = `data:${mime};base64,${base64}`;
    } catch {
      return NextResponse.json(
        { error: "Failed to process image" },
        { status: 400 },
      );
    }

    const systemPrompt = buildSystemPrompt(studentClass, board);

    let completion;
    try {
      completion = await getGroqClient().chat.completions.create({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${systemPrompt} Please read the question or problem in the image and solve it step by step.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUri,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      });
    } catch (error: unknown) {
      console.error("[PHOTO-DOUBT] Groq API error:", error);
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to analyze image. Please try again.";
      let statusCode = 502;
      
      if (error instanceof Error) {
        // Check for common Groq API error patterns
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
        } else if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
          errorMessage = "AI processing timed out. Please try again.";
          statusCode = 504;
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode },
      );
    }

    const answer =
      completion.choices[0]?.message?.content ||
      "I couldn't analyze the image at this time. Please try again.";

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
    } catch (dbError) {
      console.error("[PHOTO-DOUBT] Failed to save photo doubt:", dbError);
      saveError = dbError instanceof Error ? dbError.message : "Failed to save photo doubt";
    }

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
    console.error("[PHOTO-DOUBT] unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

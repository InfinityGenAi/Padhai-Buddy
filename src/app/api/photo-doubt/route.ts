import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_VISION_MODEL, buildSystemPrompt } from "@/lib/groq";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VALID_CLASSES = ["5", "6", "7", "8", "9", "10", "11", "12"];
const VALID_BOARDS = ["CBSE", "ICSE", "State Board"];

async function toDataUri(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const mime = ALLOWED_MIME_TYPES.has(file.type) ? file.type : "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}

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

    let dataUri: string;
    try {
      dataUri = await toDataUri(fileField);
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
    } catch (error) {
      console.error("Groq API error:", error);
      return NextResponse.json(
        { error: "Failed to analyze image. Please try again." },
        { status: 502 },
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
      console.error("Failed to save photo doubt:", dbError);
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
    console.error("Photo doubt API error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

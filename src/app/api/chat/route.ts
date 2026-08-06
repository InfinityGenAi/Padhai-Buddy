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

    const decoded = await adminAuth.verifyIdToken(token);

    const { message, class: studentClass, board } = await req.json();

    if (!message || !studentClass || !board) {
      return NextResponse.json(
        { error: "Missing message, class, or board" },
        { status: 400 },
      );
    }

    const systemPrompt = buildSystemPrompt(String(studentClass), board);

    const completion = await getGroqClient().chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
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

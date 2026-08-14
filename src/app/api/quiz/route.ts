import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL } from "@/lib/groq";
import type { QuizAttempt, QuizQuestion } from "@/types";

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || initializationError) {
      return NextResponse.json({ error: initializationError || "Server configuration error" }, { status: 500 });
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
      subject?: unknown;
      class?: unknown;
      board?: unknown;
      difficulty?: unknown;
      numberOfQuestions?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { subject, class: studentClass, board, difficulty, numberOfQuestions } = body;

    if (!subject || !studentClass || !board || !difficulty || !numberOfQuestions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const numQuestions = Math.min(Math.max(Number(numberOfQuestions) || 5, 1), 20);
    const validClasses = ["5", "6", "7", "8", "9", "10", "11", "12"];
    const validBoards = ["CBSE", "ICSE", "State Board"];
    const validDifficulties = ["easy", "medium", "hard"];

    if (!validClasses.includes(String(studentClass))) {
      return NextResponse.json({ error: "Invalid class value" }, { status: 400 });
    }
    if (!validBoards.includes(String(board))) {
      return NextResponse.json({ error: "Invalid board value" }, { status: 400 });
    }
    if (!validDifficulties.includes(String(difficulty))) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }

    const systemPrompt = `You are a quiz generator for a Class ${studentClass} ${board} student in India. Generate a ${difficulty} difficulty quiz on the subject: ${subject}. Create exactly ${numQuestions} multiple-choice questions. Each question must have exactly 4 options and one correct answer.`;

    const userPrompt = `Generate ${numQuestions} multiple-choice questions about ${subject} for Class ${studentClass} ${board} students at ${difficulty} difficulty level. Format your response as a JSON array of objects with the following structure: { "question": "string", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "string" }. Return ONLY valid JSON, no markdown, no extra text.`;

    try {
      const completion = await getGroqClient().chat.completions.create({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      });

      const raw = completion.choices[0]?.message?.content || "[]";
      let questions: QuizQuestion[];
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("Invalid format");
        questions = parsed.map((q: Record<string, unknown>, idx: number) => ({
          id: `q-${idx}`,
          question: String(q.question || `Question ${idx + 1}`),
          options: Array.isArray(q.options) ? q.options.map(String) : ["A", "B", "C", "D"],
          correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
          explanation: String(q.explanation || "No explanation available."),
          selectedIndex: undefined as number | undefined,
        }));
      } catch {
        questions = [
          { id: "q-0", question: `What is a key concept in ${subject}?`, options: ["Option A", "Option B", "Option C", "Option D"], correctIndex: 0, explanation: "This is a fallback question. Please try again.", selectedIndex: undefined },
        ];
      }

      const attempt: QuizAttempt = {
        id: crypto.randomUUID(),
        subject: String(subject),
        class: Number(studentClass) as 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
        board: String(board) as "CBSE" | "ICSE" | "State Board",
        difficulty: String(difficulty) as "easy" | "medium" | "hard",
        totalQuestions: questions.length,
        correctAnswers: 0,
        score: 0,
        questions,
        createdAt: Date.now(),
      };

      if (adminDb) {
        await adminDb.collection("users").doc(decoded.uid).collection("quizAttempts").doc(attempt.id).set(attempt);
      }

      return NextResponse.json({ attempt });
    } catch {
      return NextResponse.json(
        { error: "AI service temporarily unavailable. Please try again in a moment." },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    console.error("[QUIZ] unexpected error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: "An unexpected error occurred", _dev: process.env.NODE_ENV === "development" ? message : undefined }, { status: 500 });
  }
}

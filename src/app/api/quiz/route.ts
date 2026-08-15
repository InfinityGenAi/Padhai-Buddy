import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL } from "@/lib/groq";
import type { QuizAttempt, QuizQuestion } from "@/types";

function validateQuestions(questions: unknown[]): QuizQuestion[] | null {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 20) {
    return null;
  }
  const parsed: QuizQuestion[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>;
    if (typeof q.question !== "string" || !q.question.trim()) return null;
    if (!Array.isArray(q.options) || q.options.length !== 4) return null;
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) return null;
    if (typeof q.explanation !== "string" || !q.explanation.trim()) return null;
    parsed.push({
      id: `q-${i}`,
      question: q.question.trim(),
      options: q.options.map(String),
      correctIndex: q.correctIndex,
      explanation: q.explanation.trim(),
      selectedIndex: undefined,
    });
  }
  return parsed;
}

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
      action?: string;
      attemptId?: string;
      subject?: unknown;
      class?: unknown;
      board?: unknown;
      difficulty?: unknown;
      numberOfQuestions?: unknown;
      questions?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (body.action === "submit") {
      const { attemptId, questions } = body;
      if (!attemptId || !Array.isArray(questions)) {
        return NextResponse.json({ error: "attemptId and questions are required" }, { status: 400 });
      }

      if (!adminDb) {
        return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
      }

      const attemptRef = adminDb.collection("users").doc(decoded.uid).collection("quizAttempts").doc(attemptId);
      const snap = await attemptRef.get();
      if (!snap.exists) {
        return NextResponse.json({ error: "Quiz attempt not found" }, { status: 404 });
      }

      const validQs = validateQuestions(questions);
      if (!validQs) {
        return NextResponse.json({ error: "Quiz generation failed. Please try again." }, { status: 400 });
      }

      const totalQuestions = validQs.length;
      let correctAnswers = 0;
      for (let i = 0; i < totalQuestions; i++) {
        const serverQ = (snap.data() as Record<string, unknown>).questions as QuizQuestion[];
        const clientQ = validQs[i];
        if (i < serverQ.length && clientQ.selectedIndex !== undefined && clientQ.selectedIndex === serverQ[i].correctIndex) {
          correctAnswers++;
        }
      }

      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      await attemptRef.update({
        questions: validQs,
        correctAnswers,
        score,
        completedAt: Date.now(),
      });

      return NextResponse.json({
        attempt: {
          id: attemptId,
          ...(snap.data() as Record<string, unknown>),
          questions: validQs,
          correctAnswers,
          score,
          completedAt: Date.now(),
        },
      });
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
        const validQs = validateQuestions(parsed);
        if (!validQs || validQs.length < numQuestions) {
          return NextResponse.json({ error: "Quiz generation failed. Please try again." }, { status: 400 });
        }
        questions = validQs;
      } catch {
        return NextResponse.json({ error: "Quiz generation failed. Please try again." }, { status: 400 });
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

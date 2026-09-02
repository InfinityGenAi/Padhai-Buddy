import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { getGroqClient, GROQ_TEXT_MODEL } from "@/lib/groq";
import type { QuizAttempt, QuizQuestion } from "@/types";
import { inferTopic } from "@/lib/curriculum";

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
      let selectedIndex: number | undefined;
      if (
        typeof q.selectedIndex === "number" &&
        Number.isInteger(q.selectedIndex) &&
        q.selectedIndex >= 0 &&
        q.selectedIndex <= 3
      ) {
        selectedIndex = q.selectedIndex;
      }
      parsed.push({
        id: `q-${i}`,
        question: q.question.trim(),
        options: q.options.map(String),
        correctIndex: q.correctIndex,
        explanation: q.explanation.trim(),
        ...(selectedIndex !== undefined ? { selectedIndex } : {}),
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
      const { attemptId, questions, subject } = body;
      const sub = String(subject);
      if (!attemptId || typeof attemptId !== "string" || !Array.isArray(questions)) {
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

      const attemptData = snap.data() as QuizAttempt;
      if (attemptData.completedAt) {
        return NextResponse.json({ error: "This quiz has already been submitted" }, { status: 409 });
      }

      const serverQuestions = Array.isArray(attemptData.questions) ? attemptData.questions : [];
      if (serverQuestions.length < 1 || serverQuestions.length > 20) {
        return NextResponse.json({ error: "Quiz attempt is invalid" }, { status: 400 });
      }

      // The submitted question set must exactly match what the server generated:
      // same count, same IDs, same content, same order.
      if (questions.length !== serverQuestions.length) {
        return NextResponse.json(
          { error: "Submitted answers do not match the quiz. Please try again." },
          { status: 400 },
        );
      }

      const selections: (number | undefined)[] = [];
      for (let i = 0; i < serverQuestions.length; i++) {
        const serverQ = serverQuestions[i];
        const clientQ = questions[i] as Record<string, unknown> | null | undefined;
        if (!clientQ || typeof clientQ !== "object") {
          return NextResponse.json(
            { error: "Submitted answers do not match the quiz. Please try again." },
            { status: 400 },
          );
        }
        const clientOptions = clientQ.options;
        const contentMatches =
          String(clientQ.id ?? "") === serverQ.id &&
          String(clientQ.question ?? "") === serverQ.question &&
          Array.isArray(clientOptions) &&
          clientOptions.length === serverQ.options.length &&
          serverQ.options.every((opt: string, idx: number) => clientOptions[idx] === opt) &&
          String(clientQ.explanation ?? "") === serverQ.explanation;
        if (!contentMatches) {
          return NextResponse.json(
            { error: "Submitted answers do not match the quiz. Please try again." },
            { status: 400 },
          );
        }

        let selectedIndex: number | undefined;
        if (clientQ.selectedIndex !== undefined) {
          if (
            typeof clientQ.selectedIndex !== "number" ||
            !Number.isInteger(clientQ.selectedIndex) ||
            clientQ.selectedIndex < 0 ||
            clientQ.selectedIndex > 3
          ) {
            return NextResponse.json(
              { error: "Submitted answers are invalid. Please try again." },
              { status: 400 },
            );
          }
          selectedIndex = clientQ.selectedIndex;
        }
        selections.push(selectedIndex);
      }

      // Scoring uses ONLY the server-stored correct answers; the client's
      // correctIndex is never trusted.
      let correctAnswers = 0;
      const scoredQuestions = serverQuestions.map((q, i) => {
        const sel = selections[i];
        if (sel !== undefined && sel === q.correctIndex) {
          correctAnswers++;
        }
        return sel === undefined ? q : { ...q, selectedIndex: sel };
      });

      const totalQuestions = serverQuestions.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      const completedAt = Date.now();

      // === Additive mastery + mistake bank tracking (never breaks quiz) ===
      // wrapped in its own try/catch so quiz submission always succeeds
      try {
        // Map each question to tracking data
        const trackingPromises = serverQuestions.map(async (serverQ, i) => {
          const sel = selections[i];
          const isCorrect = sel !== undefined && sel === serverQ.correctIndex;
          const clientQ = questions[i] as Record<string, unknown> | null | undefined;
          const clientSelected = clientQ?.selectedIndex as number | undefined;
          const userAnswer = clientSelected !== undefined ? String(clientSelected) : "";
          const correctAnswer = String(serverQ.correctIndex);
          const explanation = String(serverQ.explanation || "");
          // Infer topic from subject + question text using conservative keyword matching
          const topic = inferTopic(sub, serverQ.question);
          return {
            isCorrect,
            topic,
            userAnswer,
            correctAnswer,
            explanation,
            serverQ,
          };
        });

        const results = await Promise.all(trackingPromises);

        // Upsert topicMastery for each question
        for (const r of results) {
          // Deterministic doc ID: normalized subject + topic
          const docId =
            `${r.topic.replace(/\s+/g, "_").toLowerCase()}_${sub
              .replace(/\s+/g, "_")
              .toLowerCase()}`;
          const masteryRef = adminDb
            .collection("users")
            .doc(decoded.uid)
            .collection("topicMastery")
            .doc(docId);

          // Read existing then merge increment
          const existingSnap = await masteryRef.get();
          const existingData = existingSnap?.data();
          const newTotal = (existingData?.totalQuestions || 0) + 1;
          const newCorrect = (existingData?.correctAnswers || 0) + (r.isCorrect ? 1 : 0);
          const newMastery = Math.round((newCorrect / newTotal) * 100);

          await masteryRef.set(
            {
              subject,
              topic: r.topic,
              mastery: newMastery,
              totalQuestions: newTotal,
              correctAnswers: newCorrect,
              lastPracticed: Date.now(),
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        }

        // Create mistake bank entries for incorrect answers only
        // Use deterministic ID to prevent duplicates if same submission is processed twice
        for (let mi = 0; mi < results.length; mi++) {
          const r = results[mi];
          if (r.isCorrect === false) {
            const mistakeDocId = `${attemptId}_${mi}_${r.topic.replace(/\s+/g, "_").toLowerCase()}_${r.serverQ.id}`;
            await adminDb.collection("users")
              .doc(decoded.uid)
              .collection("mistakeBank")
              .doc(mistakeDocId)
              .set({
                source: "quiz" as const,
                sourceId: attemptId,
                subject,
                topic: r.topic,
                question: r.serverQ.question,
                userAnswer: r.userAnswer,
                correctAnswer: r.correctAnswer,
                explanation: r.explanation,
                createdAt: Date.now(),
                reviewCount: 0,
              }, { merge: true });
          }
        }
      } catch (trackingError) {
        // Log but never break quiz submission
        console.error(
          "[QUIZ_TRACKING] Failed to update mastery/mistake bank:",
          trackingError
        );
      }
      // === End additive tracking ===

      await attemptRef.update({
        questions: scoredQuestions,
        correctAnswers,
        score,
        completedAt,
      });

      return NextResponse.json({
        attempt: {
          ...attemptData,
          id: attemptId,
          questions: scoredQuestions,
          correctAnswers,
          score,
          completedAt,
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

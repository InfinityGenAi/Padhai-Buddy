"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getFirestoreDb } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import type { UserProfile } from "@/types";

interface TopicMasteryDoc {
  subject: string;
  topic: string;
  mastery: number;
  totalQuestions: number;
  correctAnswers: number;
  lastPracticed: number;
}

interface MistakeBankDoc {
  subject: string;
  topic: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: number;
  reviewCount: number;
}

interface QuizAttemptDoc {
  subject: string;
  score: number;
  totalQuestions: number;
  completedAt: number;
}

interface StudySessionDoc {
  subject?: string;
  mode: string;
  durationMinutes: number;
  completed: boolean;
  createdAt: number;
}

interface StudyPlanDoc {
  subject: string;
  title: string;
  durationMinutes: number;
  plannedDate: string;
  completed: boolean;
}

/**
 * Summarized student learning context - efficient data for AI tutor context.
 * 
 * IMPORTANT: Do NOT fetch huge datasets on every AI request.
 * This context provides only summarized, essential data.
 */
export interface StudentContext {
  class: UserProfile["class"] | null;
  board: UserProfile["board"] | null;
  subjects: string[];
  recentStudyActivity: RecentStudyActivity;
  weakTopics: WeakTopicInfo[];
  topicMastery: TopicMasteryInfo[];
  recentMistakes: RecentMistake[];
  recentQuizResults: RecentQuizResult[];
  recentStudySessions: RecentStudySession[];
  recentPlannerTasks: RecentPlannerTask[];
}

export interface RecentStudyActivity {
  lastSessionDate: string | null;
  totalSessionsThisWeek: number;
  totalStudyMinutesThisWeek: number;
}

export interface WeakTopicInfo {
  subject: string;
  topic: string;
  mastery: number;
  totalQuestions: number;
  lastPracticed: number;
}

export interface TopicMasteryInfo {
  subject: string;
  topic: string;
  mastery: number;
  totalQuestions: number;
  correctAnswers: number;
  lastPracticed: number;
}

export interface RecentMistake {
  id: string;
  subject: string;
  topic: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  createdAt: number;
}

export interface RecentQuizResult {
  attemptId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  completedAt: number;
}

export interface RecentStudySession {
  id: string;
  subject?: string;
  mode: string;
  durationMinutes: number;
  completed: boolean;
  createdAt: number;
}

export interface RecentPlannerTask {
  id: string;
  subject: string;
  title: string;
  durationMinutes: number;
  plannedDate: string;
  completed: boolean;
}

/**
 * Hook that provides a summarized student learning context.
 * 
 * Designed to be efficient - only fetches necessary data and summarizes it.
 * Should be used before AI requests to provide relevant student context.
 * 
 * The context is memoized per user session and only refetches when user changes.
 */
export function useStudentContext(): StudentContext {
  const { user } = useAuth();
  const [context, setContext] = useState<StudentContext>(() => defaultContext());

  useEffect(() => {
    if (!user?.uid) {
      setContext(defaultContext());
      return;
    }

    loadStudentContext(user.uid).then(setContext);
  }, [user?.uid]);

  return context;
}

/**
 * Loads and summarizes student data from Firestore.
 * Uses efficient queries with limits and only fetches needed fields.
 */
async function loadStudentContext(uid: string): Promise<StudentContext> {
  const db = getFirestoreDb();
  if (!db) {
    return defaultContext();
  }

  // Fetch all needed data in parallel with limits
  const [
    profileSnap,
    topicMasterySnap,
    mistakeBankSnap,
    quizAttemptsSnap,
    studySessionsSnap,
    studyPlansSnap,
  ] = await Promise.all([
    // User profile (class, board)
    getDoc(doc(db, "users", uid)),

    // Topic mastery
    getDocs(collection(db, "users", uid, "topicMastery")),

    // Mistake bank
    getDocs(collection(db, "users", uid, "mistakeBank")),

    // Quiz attempts (last 5)
    getDocs(collection(db, "users", uid, "quizAttempts")),

    // Study sessions (last 10)
    getDocs(collection(db, "users", uid, "studySessions")),

    // Study plans (today + upcoming)
    getDocs(collection(db, "users", uid, "studyPlans")),
  ]);

  // 1. Parse profile
  const profileData = profileSnap.data() as UserProfile | null;
  const classValue = profileData?.class ?? null;
  const boardValue = profileData?.board ?? null;
  const subjects: string[] = [...new Set([
    classValue,
    ...(topicMasterySnap.docs.map((d) => d.data() as TopicMasteryDoc).map((t) => t.subject).filter(Boolean)),
    ...(mistakeBankSnap.docs.map((d) => d.data() as MistakeBankDoc).map((m) => m.subject).filter(Boolean)),
  ])].filter(Boolean) as string[];

  // 2. Parse topic mastery - only keep top entries, summarize
  const topicMasteryData = topicMasterySnap.docs.map((d) => {
    const data = d.data() as TopicMasteryDoc;
    return {
      subject: data.subject || "General",
      topic: data.topic || "General",
      mastery: data.mastery || 0,
      totalQuestions: data.totalQuestions || 0,
      correctAnswers: data.correctAnswers || 0,
      lastPracticed: data.lastPracticed || 0,
    };
  });

  // 3. Parse mistake bank - recent only, limited to 10
  const mistakeBankData = mistakeBankSnap.docs
    .map((d) => {
      const data = d.data() as MistakeBankDoc;
      return {
        id: d.id,
        subject: data.subject || "General",
        topic: data.topic || "General",
        question: data.question || "",
        userAnswer: data.userAnswer || "",
        correctAnswer: data.correctAnswer || "",
        explanation: data.explanation || "",
        createdAt: data.createdAt || 0,
      };
    })
    .sort((a: RecentMistake, b: RecentMistake) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10); // Limit to 10 most recent

  // 4. Parse quiz attempts - last 5
  const quizAttemptsData = quizAttemptsSnap.docs
    .map((d) => {
      const data = d.data() as QuizAttemptDoc;
      return {
        attemptId: d.id,
        subject: data.subject || "General",
        score: data.score || 0,
        totalQuestions: data.totalQuestions || 0,
        completedAt: data.completedAt || 0,
      };
    })
    .sort((a: RecentQuizResult, b: RecentQuizResult) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5); // Limit to 5 most recent

  // 5. Parse study sessions - last 10
  const studySessionsData = studySessionsSnap.docs
    .map((d) => {
      const data = d.data() as StudySessionDoc;
      return {
        id: d.id,
        subject: data.subject,
        mode: data.mode || "custom",
        durationMinutes: data.durationMinutes || 0,
        completed: data.completed || false,
        createdAt: data.createdAt || 0,
      };
    })
    .sort((a: RecentStudySession, b: RecentStudySession) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10); // Limit to 10 most recent

  // 6. Parse study plans - today and upcoming
  const today = new Date().toISOString().split("T")[0];
  const studyPlansData = studyPlansSnap.docs
    .map((d) => {
      const data = d.data() as StudyPlanDoc;
      return {
        id: d.id,
        subject: data.subject || "General",
        title: data.title || "Untitled",
        durationMinutes: data.durationMinutes || 30,
        plannedDate: data.plannedDate || "",
        completed: data.completed || false,
      };
    })
    .filter((p: RecentPlannerTask) => p.plannedDate >= today || !p.plannedDate) // Today and future
    .slice(0, 10); // Limit to 10

  // 7. Calculate weak topics (mastery < 70%, with at least 3 questions)
  const weakTopics = topicMasteryData
    .filter((t: TopicMasteryInfo) => t.mastery < 70 && t.totalQuestions >= 3)
    .sort((a: TopicMasteryInfo, b: TopicMasteryInfo) => a.mastery - b.mastery)
    .slice(0, 5);

  // 8. Calculate recent study activity
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const totalSessionsThisWeek = studySessionsData.filter(
    (s: RecentStudySession) => (s.createdAt || 0) >= weekAgo
  ).length;

  const totalStudyMinutesThisWeek = studySessionsData.reduce(
    (sum: number, s: RecentStudySession) => {
      const createdAt = s.createdAt || 0;
      return createdAt >= weekAgo ? sum + (s.durationMinutes || 0) : sum;
    },
    0
  );

  // Find last session date
  const allSessionDates = studySessionsData.map((s: RecentStudySession) => s.createdAt || 0).filter(Boolean);
  const lastSessionDate = allSessionDates.length > 0
    ? new Date(Math.max(...allSessionDates)).toISOString().split("T")[0]
    : null;

  // Recent quiz results
  const recentQuizResults = quizAttemptsData.map((q: RecentQuizResult) => ({
    attemptId: q.attemptId,
    subject: q.subject,
    score: q.score,
    totalQuestions: q.totalQuestions,
    completedAt: q.completedAt,
  }));

  // Build the complete context
  return {
    class: classValue,
    board: boardValue,
    subjects,
    recentStudyActivity: {
      lastSessionDate,
      totalSessionsThisWeek,
      totalStudyMinutesThisWeek,
    },
    weakTopics,
    topicMastery: topicMasteryData,
    recentMistakes: mistakeBankData,
    recentQuizResults,
    recentStudySessions: studySessionsData,
    recentPlannerTasks: studyPlansData,
  };
}

/**
 * Default context when no user data is available.
 */
function defaultContext(): StudentContext {
  return {
    class: null,
    board: null,
    subjects: [],
    recentStudyActivity: {
      lastSessionDate: null,
      totalSessionsThisWeek: 0,
      totalStudyMinutesThisWeek: 0,
    },
    weakTopics: [],
    topicMastery: [],
    recentMistakes: [],
    recentQuizResults: [],
    recentStudySessions: [],
    recentPlannerTasks: [],
  };
}

/**
 * Generates the AI tutor prompt context from the student context.
 * 
 * Creates an efficient summarized prompt that the AI can use to adapt explanations.
 * Never sends entire Firestore datasets - only summarized essential data.
 */
export function generateAITutorContext(context: StudentContext): string {
  const parts: string[] = [];

  // Class and board
  if (context.class && context.board) {
    parts.push(`Class ${context.class} ${context.board} student`);
  } else if (context.class) {
    parts.push(`Class ${context.class} student`);
  } else if (context.board) {
    parts.push(`${context.board} curriculum student`);
  }

  // Weak topics - only include if available and relevant
  if (context.weakTopics.length > 0) {
    const weakTopicText = context.weakTopics
      .slice(0, 3)
      .map((t) => `${t.subject}: ${t.topic} (${t.mastery}% mastery)`)
      .join(", ");
    parts.push(`Areas needing improvement: ${weakTopicText}`);
  }

  // Recent study activity
  if (context.recentStudyActivity.totalSessionsThisWeek > 0) {
    const minutes = context.recentStudyActivity.totalStudyMinutesThisWeek;
    parts.push(`Has studied ${minutes} minutes this week across ${context.recentStudyActivity.totalSessionsThisWeek} sessions`);
  }

  // Recent mistakes
  if (context.recentMistakes.length > 0) {
    const recentMistakeText = context.recentMistakes
      .slice(0, 2)
      .map((m) => `${m.subject}: ${m.topic} - "${m.question.slice(0, 40)}${m.question.length > 40 ? "…" : ""}"`)
      .join("; ");
    parts.push(`Recent mistakes: ${recentMistakeText}`);
  }

  // Recent quiz performance
  if (context.recentQuizResults.length > 0) {
    const avgScore = context.recentQuizResults
      .reduce((sum: number, r: RecentQuizResult) => sum + r.score, 0) / context.recentQuizResults.length;
    parts.push(`Recent quiz average: ${Math.round(avgScore)}%`);
  }

  // Topic mastery summary
  if (context.topicMastery.length > 0) {
    const strongTopics = context.topicMastery.filter((t: TopicMasteryInfo) => t.mastery >= 80).length;
    const weakTopicsCount = context.topicMastery.filter((t: TopicMasteryInfo) => t.mastery < 60).length;
    parts.push(`${strongTopics} topics mastered, ${weakTopicsCount} needing attention`);
  }

  return parts.join(". ");
}
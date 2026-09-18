"use server";

import { adminDb } from "@/lib/firebase-admin";
import { calculateWeakTopics, WeakTopic } from "@/lib/weakTopics";
import { calculateStudyStreak } from "@/lib/streak";
import { inferTopic } from "@/lib/curriculum";

/**
 * Next Study Action Engine
 * 
 * Generates up to 3 meaningful study actions based on:
 * - Today's planner tasks
 * - Weak topics
 * - Recent mistakes
 * - Recent quiz results
 * - Recent study sessions
 * - Topic mastery
 * - Student class & board
 * - Available study context
 * 
 * Each recommendation has:
 * - title
 * - reason
 * - action type
 * - target route
 * - optional topic/subject
 * - priority signal
 */

export type ActionType = 
  | "review-weak-topic"
  | "take-quiz"
  | "revise-flashcards"
  | "ask-ai-tutor"
  | "continue-planner-task"
  | "review-mistake"
  | "complete-note"
  | "start-new-quiz"
  | "photo-doubt";

export interface StudyAction {
  id: string;
  title: string;
  reason: string;
  actionType: ActionType;
  targetRoute: string;
  subject?: string;
  topic?: string;
  priority: number; // 1-100, higher = more important
  icon: string;
  color: string;
}

export interface NextActionContext {
  class: number | null;
  board: string | null;
  weakTopics: WeakTopic[];
  recentMistakes: RecentMistake[];
  recentQuizResults: RecentQuizResult[];
  recentStudySessions: RecentStudySession[];
  recentPlannerTasks: RecentPlannerTask[];
  topicMastery: TopicMasteryInfo[];
  studyStreak: number;
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
  reviewCount: number;
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

export interface TopicMasteryInfo {
  subject: string;
  topic: string;
  mastery: number;
  totalQuestions: number;
  correctAnswers: number;
  lastPracticed: number;
}

/**
 * Generates up to 3 next study actions for the user.
 * 
 * Priority logic:
 * 1. Unreviewed mistakes (highest priority)
 * 2. Weak topics needing attention
 * 3. Incomplete today's planner tasks
 * 4. Continue recent study topic
 * 5. Low quiz score topics
 * 6. Default: start a new quiz
 * 
 * For new users with no data: show welcome actions
 */
export async function generateNextActions(
  uid: string,
  context: NextActionContext
): Promise<StudyAction[]> {
  const actions: StudyAction[] = [];
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];

  // === PRIORITY 1: Unreviewed mistakes (reviewCount === 0) ===
  const unreviewedMistakes = context.recentMistakes.filter(
    (m) => (m.reviewCount ?? 0) === 0
  );
  
  if (unreviewedMistakes.length > 0) {
    const latest = unreviewedMistakes[0];
    actions.push({
      id: `review-mistake-${latest.id}`,
      title: `Review mistake in ${latest.topic}`,
      reason: `You got "${latest.question.slice(0, 40)}${latest.question.length > 40 ? "…" : ""}" wrong. Review the explanation.`,
      actionType: "review-mistake",
      targetRoute: "/dashboard/photo-doubt", // Could link to a review page
      subject: latest.subject,
      topic: latest.topic,
      priority: 95,
      icon: "exclamation-triangle",
      color: "red",
    });
  }

  // === PRIORITY 2: Weak topics (mastery < 70%) ===
  const weakTopics = context.weakTopics.filter(
    (t) => t.mastery < 70 && t.totalQuestions >= 3
  );
  
  if (weakTopics.length > 0 && actions.length < 3) {
    const weakest = weakTopics[0];
    actions.push({
      id: `weak-topic-${weakest.subject}-${weakest.topic}`,
      title: `Strengthen ${weakest.topic}`,
      reason: `${weakest.mastery}% mastery in ${weakest.subject}. Practice to improve.`,
      actionType: "review-weak-topic",
      targetRoute: `/dashboard/quiz?topic=${encodeURIComponent(weakest.topic)}&subject=${encodeURIComponent(weakest.subject)}`,
      subject: weakest.subject,
      topic: weakest.topic,
      priority: 90,
      icon: "academic-cap",
      color: "amber",
    });
  }

  // === PRIORITY 3: Incomplete today's planner tasks ===
  const pendingToday = context.recentPlannerTasks.filter(
    (p) => !p.completed && p.plannedDate === today
  );
  
  if (pendingToday.length > 0 && actions.length < 3) {
    const nextTask = pendingToday[0];
    actions.push({
      id: `planner-${nextTask.id}`,
      title: `Complete "${nextTask.title}"`,
      reason: `${nextTask.subject} — ${nextTask.durationMinutes} min task pending today.`,
      actionType: "continue-planner-task",
      targetRoute: "/dashboard/planner",
      subject: nextTask.subject,
      priority: 85,
      icon: "calendar-days",
      color: "blue",
    });
  }

  // === PRIORITY 4: Continue recent study topic ===
  const recentCompletedSessions = context.recentStudySessions
    .filter((s) => s.completed && s.subject)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  if (recentCompletedSessions.length > 0 && actions.length < 3) {
    const recent = recentCompletedSessions[0];
    // Find mastery for this topic
    const mastery = context.topicMastery.find(
      (t) => t.subject === recent.subject && t.lastPracticed === recent.createdAt
    );
    
    actions.push({
      id: `continue-${recent.subject}-${recent.id}`,
      title: `Continue ${recent.subject}`,
      reason: `${recent.subject} — ${mastery ? `${mastery.mastery}% mastery` : "recently studied"}, keep building.`,
      actionType: "ask-ai-tutor",
      targetRoute: "/dashboard/chat",
      subject: recent.subject,
      priority: 75,
      icon: "sparkles",
      color: "indigo",
    });
  }

  // === PRIORITY 5: Low quiz score topics ===
  const lowScoreQuizzes = context.recentQuizResults
    .filter((q) => q.score < 60 && q.totalQuestions >= 3)
    .sort((a, b) => a.score - b.score);
  
  if (lowScoreQuizzes.length > 0 && actions.length < 3) {
    const lowQuiz = lowScoreQuizzes[0];
    actions.push({
      id: `quiz-${lowQuiz.attemptId}`,
      title: `Retry ${lowQuiz.subject} quiz`,
      reason: `Scored ${lowQuiz.score}% on last ${lowQuiz.subject} quiz. Practice to improve.`,
      actionType: "take-quiz",
      targetRoute: `/dashboard/quiz?subject=${encodeURIComponent(lowQuiz.subject)}`,
      subject: lowQuiz.subject,
      priority: 70,
      icon: "question-mark-circle",
      color: "teal",
    });
  }

  // === PRIORITY 6: Topics with flashcards needing review ===
  // This would require checking flashcard review status
  // For now, we'll add a general "Revise with flashcards" if user has flashcards
  if (context.topicMastery.length > 0 && actions.length < 3) {
    // Find a topic with some mastery but not mastered
    const learningTopic = context.topicMastery
      .filter((t) => t.mastery > 30 && t.mastery < 80 && t.totalQuestions >= 3)
      .sort((a, b) => a.mastery - b.mastery)[0];
    
    if (learningTopic) {
      actions.push({
        id: `flashcards-${learningTopic.subject}-${learningTopic.topic}`,
        title: `Revise ${learningTopic.topic} flashcards`,
        reason: `${learningTopic.mastery}% mastery — spaced repetition will help retain.`,
        actionType: "revise-flashcards",
        targetRoute: "/dashboard/flashcards",
        subject: learningTopic.subject,
        topic: learningTopic.topic,
        priority: 65,
        icon: "squares-2x2",
        color: "emerald",
      });
    }
  }

  // === PRIORITY 7: Default action for new users or when nothing else applies ===
  if (actions.length === 0) {
    return getNewUserActions(context.class, context.board);
  }

  // Sort by priority and return top 3
  actions.sort((a, b) => b.priority - a.priority);
  return actions.slice(0, 3);
}

/**
 * Gets actions for new users with no study data.
 */
function getNewUserActions(class_: number | null, board: string | null): StudyAction[] {
  const actions: StudyAction[] = [];

  // Welcome action
  actions.push({
    id: "welcome-ai-tutor",
    title: "Meet your AI Tutor",
    reason: "Ask any study question and get step-by-step help tailored to your class.",
    actionType: "ask-ai-tutor",
    targetRoute: "/dashboard/chat",
    priority: 100,
    icon: "sparkles",
    color: "primary",
  });

  // Quiz starter
  if (class_ && board) {
    actions.push({
      id: "welcome-quiz",
      title: `Try a Class ${class_} ${board} Quiz`,
      reason: "Test your knowledge with board-aligned questions.",
      actionType: "start-new-quiz",
      targetRoute: "/dashboard/quiz",
      priority: 90,
      icon: "question-mark-circle",
      color: "blue",
    });
  } else {
    actions.push({
      id: "welcome-quiz",
      title: "Try a Practice Quiz",
      reason: "Test your knowledge with questions from any subject.",
      actionType: "start-new-quiz",
      targetRoute: "/dashboard/quiz",
      priority: 90,
      icon: "question-mark-circle",
      color: "blue",
    });
  }

  // Planner setup
  actions.push({
    id: "welcome-planner",
    title: "Set up your Study Plan",
    reason: "Plan your day and build a focused schedule.",
    actionType: "continue-planner-task",
    targetRoute: "/dashboard/planner",
    priority: 80,
    icon: "calendar-days",
    color: "green",
  });

  // Photo doubt
  actions.push({
    id: "welcome-photo",
    title: "Solve a Photo Doubt",
    reason: "Snap a problem and get instant AI explanations.",
    actionType: "photo-doubt",
    targetRoute: "/dashboard/photo-doubt",
    priority: 70,
    icon: "photo",
    color: "purple",
  });

  return actions.slice(0, 3);
}

/**
 * Loads the full context needed for next action generation.
 * Fetches all required data from Firestore efficiently.
 */
export async function loadNextActionContext(uid: string): Promise<NextActionContext> {
  if (!adminDb) {
    return getEmptyContext();
  }

  const [
    profileSnap,
    weakTopics,
    topicMasterySnap,
    mistakeBankSnap,
    quizAttemptsSnap,
    studySessionsSnap,
    studyPlansSnap,
  ] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    calculateWeakTopics(uid),
    adminDb.collection("users").doc(uid).collection("topicMastery").get(),
    adminDb.collection("users").doc(uid).collection("mistakeBank").get(),
    adminDb.collection("users").doc(uid).collection("quizAttempts").get(),
    adminDb.collection("users").doc(uid).collection("studySessions").get(),
    adminDb.collection("users").doc(uid).collection("studyPlans").get(),
  ]);

  interface ProfileData {
  class?: number;
  board?: string;
}

  const profileData = profileSnap.data() as ProfileData | undefined;

  // Parse topic mastery
  const topicMastery = topicMasterySnap.docs.map((d) => {
    const data = d.data();
    return {
      subject: data.subject || "General",
      topic: data.topic || "General",
      mastery: data.mastery || 0,
      totalQuestions: data.totalQuestions || 0,
      correctAnswers: data.correctAnswers || 0,
      lastPracticed: data.lastPracticed || 0,
    };
  });

  // Parse mistake bank
  const recentMistakes = mistakeBankSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        subject: data.subject || "General",
        topic: data.topic || "General",
        question: data.question || "",
        userAnswer: data.userAnswer || "",
        correctAnswer: data.correctAnswer || "",
        explanation: data.explanation || "",
        createdAt: data.createdAt || 0,
        reviewCount: data.reviewCount || 0,
      };
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10);

  // Parse quiz attempts
  const recentQuizResults = quizAttemptsSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        attemptId: d.id,
        subject: data.subject || "General",
        score: data.score || 0,
        totalQuestions: data.totalQuestions || 0,
        completedAt: data.completedAt || 0,
      };
    })
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);

  // Parse study sessions
  const recentStudySessions = studySessionsSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        subject: data.subject,
        mode: data.mode || "custom",
        durationMinutes: data.durationMinutes || 0,
        completed: data.completed || false,
        createdAt: data.createdAt || 0,
      };
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10);

  // Parse study plans
  const recentPlannerTasks = studyPlansSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        subject: data.subject || "General",
        title: data.title || "Untitled",
        durationMinutes: data.durationMinutes || 30,
        plannedDate: data.plannedDate || "",
        completed: data.completed || false,
      };
    })
    .slice(0, 10);

  // Calculate study streak
  const streakResult = await calculateStudyStreak(uid);

  return {
    class: profileData?.class ?? null,
    board: profileData?.board ?? null,
    weakTopics,
    recentMistakes,
    recentQuizResults,
    recentStudySessions,
    recentPlannerTasks,
    topicMastery,
    studyStreak: streakResult.currentStreak,
  };
}

function getEmptyContext(): NextActionContext {
  return {
    class: null,
    board: null,
    weakTopics: [],
    recentMistakes: [],
    recentQuizResults: [],
    recentStudySessions: [],
    recentPlannerTasks: [],
    topicMastery: [],
    studyStreak: 0,
  };
}

/**
 * API-friendly function to get next actions.
 */
export async function getNextActions(uid: string): Promise<StudyAction[]> {
  const context = await loadNextActionContext(uid);
  return generateNextActions(uid, context);
}
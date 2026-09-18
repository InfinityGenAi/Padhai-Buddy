"use server";

import { adminDb } from "@/lib/firebase-admin";
import { inferTopic } from "@/lib/curriculum";
import crypto from "crypto";

/**
 * Weak Topic Calculation Service
 * 
 * Determines weak topics from multiple data sources:
 * 1. Topic Mastery (primary - based on quiz performance)
 * 2. Mistake Bank (repeated mistakes per topic)
 * 3. Photo Doubts (when subject/topic is known)
 * 
 * Rules:
 * - Weak topics are derived from actual data, not permanent labels
 * - Repeated mistakes increase weakness signal
 * - Correct practice reduces weakness over time
 * - Minimum question threshold prevents false weak topics
 */

export interface WeakTopic {
  subject: string;
  topic: string;
  mastery: number;
  totalQuestions: number;
  correctAnswers: number;
  mistakeCount: number;
  lastMistakeAt: number;
  lastPracticed: number;
  weaknessScore: number; // 0-100, higher = weaker
}

export interface WeakTopicCalculationOptions {
  minQuestionsForMastery?: number; // default: 3
  masteryThreshold?: number; // default: 70 (below this = weak)
  mistakeWeight?: number; // default: 10 points per mistake
  timeDecayDays?: number; // default: 30 days
}

/**
 * Calculates weak topics for a user from all available data sources.
 * 
 * @param uid - User ID
 * @param options - Calculation options
 * @returns Array of weak topics sorted by weakness score (highest first)
 */
export async function calculateWeakTopics(
  uid: string,
  options: WeakTopicCalculationOptions = {}
): Promise<WeakTopic[]> {
  const {
    minQuestionsForMastery = 3,
    masteryThreshold = 70,
    mistakeWeight = 10,
    timeDecayDays = 30,
  } = options;

  if (!adminDb) {
    return [];
  }

  // Fetch all relevant data in parallel
  const [
    topicMasterySnap,
    mistakeBankSnap,
  ] = await Promise.all([
    adminDb.collection("users").doc(uid).collection("topicMastery").get(),
    adminDb.collection("users").doc(uid).collection("mistakeBank").get(),
  ]);

  // Build topic mastery map
  const masteryMap = new Map<string, {
    subject: string;
    topic: string;
    mastery: number;
    totalQuestions: number;
    correctAnswers: number;
    lastPracticed: number;
  }>();

  topicMasterySnap.docs.forEach((doc) => {
    const data = doc.data();
    const key = `${data.subject}|${data.topic}`;
    masteryMap.set(key, {
      subject: data.subject,
      topic: data.topic,
      mastery: data.mastery || 0,
      totalQuestions: data.totalQuestions || 0,
      correctAnswers: data.correctAnswers || 0,
      lastPracticed: data.lastPracticed || 0,
    });
  });

  // Build mistake count map
  const mistakeMap = new Map<string, {
    count: number;
    lastMistakeAt: number;
  }>();

  const now = Date.now();
  const decayMs = timeDecayDays * 24 * 60 * 60 * 1000;

  mistakeBankSnap.docs.forEach((doc) => {
    const data = doc.data();
    const key = `${data.subject}|${data.topic}`;
    const existing = mistakeMap.get(key);
    
    // Apply time decay - older mistakes count less
    const ageMs = now - (data.createdAt || 0);
    const decayFactor = ageMs > decayMs ? Math.max(0.1, 1 - (ageMs / decayMs)) : 1;
    const weightedCount = decayFactor;

    if (existing) {
      mistakeMap.set(key, {
        count: existing.count + weightedCount,
        lastMistakeAt: Math.max(existing.lastMistakeAt, data.createdAt || 0),
      });
    } else {
      mistakeMap.set(key, {
        count: weightedCount,
        lastMistakeAt: data.createdAt || 0,
      });
    }
  });

  // Combine data to calculate weak topics
  const weakTopics: WeakTopic[] = [];

  for (const [key, mastery] of masteryMap.entries()) {
    // Only consider topics with enough questions
    if (mastery.totalQuestions < minQuestionsForMastery) {
      continue;
    }

    const mistakes = mistakeMap.get(key);
    const mistakeCount = mistakes?.count || 0;
    const lastMistakeAt = mistakes?.lastMistakeAt || 0;

    // Calculate weakness score:
    // - Base: (100 - mastery) = how far below 100% mastery
    // - Mistake penalty: each mistake adds to weakness
    // - Time decay: old mistakes matter less
    const baseWeakness = 100 - mastery.mastery;
    const mistakePenalty = mistakeCount * mistakeWeight;
    const weaknessScore = Math.min(100, baseWeakness + mistakePenalty);

    // Only include if below mastery threshold OR has recent mistakes
    if (mastery.mastery < masteryThreshold || mistakeCount > 0) {
      weakTopics.push({
        subject: mastery.subject,
        topic: mastery.topic,
        mastery: mastery.mastery,
        totalQuestions: mastery.totalQuestions,
        correctAnswers: mastery.correctAnswers,
        mistakeCount: Math.round(mistakeCount),
        lastMistakeAt,
        lastPracticed: mastery.lastPracticed,
        weaknessScore,
      });
    }
  }

  // Also check for topics that only exist in mistake bank (no mastery record yet)
  // This can happen if all questions were wrong and no correct answers yet
  for (const [key, mistakes] of mistakeMap.entries()) {
    if (!masteryMap.has(key) && mistakes.count > 0) {
      const [subject, topic] = key.split("|");
      weakTopics.push({
        subject,
        topic,
        mastery: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        mistakeCount: Math.round(mistakes.count),
        lastMistakeAt: mistakes.lastMistakeAt,
        lastPracticed: 0,
        weaknessScore: Math.min(100, mistakes.count * mistakeWeight),
      });
    }
  }

  // Sort by weakness score (highest first)
  weakTopics.sort((a, b) => b.weaknessScore - a.weaknessScore);

  return weakTopics;
}

/**
 * Records a mistake in the mistake bank with proper topic inference.
 * 
 * This is called from quiz submission and can be called from other sources.
 * 
 * @param uid - User ID
 * @param source - Source of the mistake ("quiz" | "photo-doubt" | "practice")
 * @param sourceId - ID of the source document
 * @param subject - Subject name
 * @param question - The question text
 * @param userAnswer - User's answer
 * @param correctAnswer - Correct answer
 * @param explanation - Explanation
 * @returns The mistake document ID
 */
export async function recordMistake(
  uid: string,
  source: "quiz" | "photo-doubt" | "practice",
  sourceId: string,
  subject: string,
  question: string,
  userAnswer: string,
  correctAnswer: string,
  explanation: string
): Promise<string> {
  if (!adminDb) {
    throw new Error("Server not initialized");
  }

  // Infer topic from subject + question
  const topic = inferTopic(subject, question);

  // Create deterministic ID to prevent duplicates
  const questionHash = crypto.createHash("md5").update(question).digest("hex").slice(0, 8);
  const mistakeDocId = `${source}_${sourceId}_${topic.replace(/\s+/g, "_").toLowerCase()}_${questionHash}`;

  const mistakeRef = adminDb
    .collection("users")
    .doc(uid)
    .collection("mistakeBank")
    .doc(mistakeDocId);

  const existing = await mistakeRef.get();
  
  if (existing.exists) {
    // Increment review count for repeated mistakes
    await mistakeRef.update({
      reviewCount: (existing.data()?.reviewCount || 0) + 1,
      lastMistakeAt: Date.now(),
    });
  } else {
    await mistakeRef.set({
      source,
      sourceId,
      subject,
      topic,
      question,
      userAnswer,
      correctAnswer,
      explanation,
      createdAt: Date.now(),
      lastMistakeAt: Date.now(),
      reviewCount: 0,
    });
  }

  // Also update topic mastery for this topic
  await updateTopicMastery(uid, subject, topic, false);

  return mistakeDocId;
}

/**
 * Updates topic mastery for a specific topic.
 * 
 * @param uid - User ID
 * @param subject - Subject name
 * @param topic - Topic name
 * @param isCorrect - Whether the answer was correct
 */
export async function updateTopicMastery(
  uid: string,
  subject: string,
  topic: string,
  isCorrect: boolean
): Promise<void> {
  if (!adminDb) {
    return;
  }

  const docId = `${topic.replace(/\s+/g, "_").toLowerCase()}_${subject.replace(/\s+/g, "_").toLowerCase()}`;
  const masteryRef = adminDb
    .collection("users")
    .doc(uid)
    .collection("topicMastery")
    .doc(docId);

  await adminDb.runTransaction(async (transaction) => {
    const existingSnap = await transaction.get(masteryRef);
    const existingData = existingSnap.data();
    
    const newTotal = (existingData?.totalQuestions || 0) + 1;
    const newCorrect = (existingData?.correctAnswers || 0) + (isCorrect ? 1 : 0);
    const newMastery = Math.round((newCorrect / newTotal) * 100);

    transaction.set(masteryRef, {
      subject,
      topic,
      mastery: newMastery,
      totalQuestions: newTotal,
      correctAnswers: newCorrect,
      lastPracticed: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true });
  });
}

/**
 * Records a correct answer (for practice/revision that reduces weakness).
 * 
 * @param uid - User ID
 * @param subject - Subject name
 * @param topic - Topic name
 */
export async function recordCorrectPractice(
  uid: string,
  subject: string,
  topic: string
): Promise<void> {
  await updateTopicMastery(uid, subject, topic, true);
}

/**
 * Gets weak topics formatted for dashboard display.
 * Returns top N weak topics with actionable info.
 */
export async function getDashboardWeakTopics(
  uid: string,
  limit: number = 5
): Promise<WeakTopic[]> {
  const weakTopics = await calculateWeakTopics(uid);
  return weakTopics.slice(0, limit);
}
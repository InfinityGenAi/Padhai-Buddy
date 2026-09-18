"use server";

import { adminDb } from "@/lib/firebase-admin";

/**
 * Study Streak Calculation
 * 
 * Calculates streak from actual recorded study activity (not just daily increments).
 * A "valid study day" requires at least one completed study session.
 * 
 * Handles:
 * - First day (streak = 1 if studied today)
 * - Consecutive days
 * - Missed day (streak resets to 0)
 * - Timezone (IST)
 * - Duplicate sessions (deduplicated by date)
 * - Empty activity (streak = 0)
 */

export interface StudyStreakResult {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  studyDates: string[];
  isActiveToday: boolean;
}

/**
 * Gets the current date in IST as YYYY-MM-DD string.
 */
function getISTDate(date: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  return istTime.toISOString().split("T")[0];
}

/**
 * Gets all unique study dates from study sessions.
 * Returns array of YYYY-MM-DD strings in IST, sorted ascending.
 */
async function getStudyDates(uid: string): Promise<string[]> {
  if (!adminDb) {
    return [];
  }

  const sessionsSnap = await adminDb
    .collection("users")
    .doc(uid)
    .collection("studySessions")
    .get();

  const datesSet = new Set<string>();

  sessionsSnap.docs.forEach((doc) => {
    const data = doc.data();
    // Only count completed sessions
    if (data.completed) {
      const createdAt = data.createdAt?.toDate?.()?.getTime?.() || data.createdAt || 0;
      if (createdAt > 0) {
        const date = new Date(createdAt);
        const istDate = getISTDate(date);
        datesSet.add(istDate);
      }
    }
  });

  return Array.from(datesSet).sort();
}

/**
 * Calculates study streak for a user.
 * 
 * @param uid - User ID
 * @returns StudyStreakResult with current streak, longest streak, and metadata
 */
export async function calculateStudyStreak(uid: string): Promise<StudyStreakResult> {
  const studyDates = await getStudyDates(uid);
  
  if (studyDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
      isActiveToday: false,
    };
  }

  const today = getISTDate();
  const yesterday = getISTDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  
  // Check if studied today
  const isActiveToday = studyDates.includes(today);
  
  // Calculate current streak
  let currentStreak = 0;
  const checkDate = isActiveToday ? today : yesterday;
  
  // If last study date is more than 1 day ago (and not today), streak is 0
  const lastStudyDate = studyDates[studyDates.length - 1];
  if (lastStudyDate !== today && lastStudyDate !== yesterday) {
    currentStreak = 0;
  } else {
    // Count consecutive days backwards from checkDate
    for (let i = 0; i < 365; i++) {
      const dateToCheck = getISTDate(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
      if (studyDates.includes(dateToCheck)) {
        currentStreak++;
      } else if (i > 0) {
        // Allow today to be missed if we're checking from yesterday
        // But if we're checking from today and today is not studied, streak is 0
        if (isActiveToday || i === 1) {
          break;
        }
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: string | null = null;

  for (const date of studyDates) {
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const prev = new Date(prevDate + "T00:00:00");
      const curr = new Date(date + "T00:00:00");
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    prevDate = date;
  }

  return {
    currentStreak,
    longestStreak,
    lastStudyDate,
    studyDates,
    isActiveToday,
  };
}

/**
 * Checks if user has studied today (IST).
 */
export async function hasStudiedToday(uid: string): Promise<boolean> {
  const result = await calculateStudyStreak(uid);
  return result.isActiveToday;
}

/**
 * Gets study streak formatted for dashboard display.
 */
export async function getDashboardStreak(uid: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  isActiveToday: boolean;
  streakMessage: string;
}> {
  const streak = await calculateStudyStreak(uid);
  
  let streakMessage = "";
  if (streak.currentStreak === 0) {
    streakMessage = "Start your streak today!";
  } else if (streak.currentStreak === 1) {
    streakMessage = "1 day streak - keep it going!";
  } else if (streak.currentStreak < 7) {
    streakMessage = `${streak.currentStreak} day streak - great consistency!`;
  } else if (streak.currentStreak < 30) {
    streakMessage = `${streak.currentStreak} day streak - amazing dedication!`;
  } else {
    streakMessage = `${streak.currentStreak} day streak - incredible commitment!`;
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastStudyDate: streak.lastStudyDate,
    isActiveToday: streak.isActiveToday,
    streakMessage,
  };
}
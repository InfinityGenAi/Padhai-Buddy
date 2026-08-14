export interface TestPlanData {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  plannedDate: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TestDoubtData {
  id: string;
  question: string;
  answer: string;
  type: "text" | "photo";
  createdAt: number;
}

export interface TestFlashcardData {
  id: string;
  deckId: string;
  front: string;
  back: string;
  known: boolean;
  createdAt: number;
}

export interface TestNoteData {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: number;
  updatedAt: number;
}

export const TEST_EMAIL = "test@padhai-buddy.test";
export const TEST_PASSWORD = "TestPassword123!";

export function createTestPlan(overrides: Partial<TestPlanData> = {}): TestPlanData {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: `test-plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Study Task",
    subject: "Mathematics",
    durationMinutes: 30,
    plannedDate: today,
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createTestDoubt(overrides: Partial<TestDoubtData> = {}): TestDoubtData {
  return {
    id: `test-doubt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: "What is 2+2?",
    answer: "4",
    type: "text",
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createTestFlashcard(overrides: Partial<TestFlashcardData> = {}): TestFlashcardData {
  return {
    id: `test-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    deckId: "test-deck",
    front: "What is the capital of India?",
    back: "New Delhi",
    known: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createTestNote(overrides: Partial<TestNoteData> = {}): TestNoteData {
  return {
    id: `test-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Note",
    content: "This is a test note content.",
    subject: "General",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export const DETERMINISTIC_TEST_TIMESTAMP = 1700000000000;

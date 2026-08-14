export type UserBoard = "CBSE" | "ICSE" | "State Board";
export type UserClass = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DoubtType = "text" | "photo";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type TimerMode = "pomodoro" | "stopwatch" | "custom";
export type PlanPriority = "low" | "medium" | "high";
export type ResourceType = "video" | "article" | "pdf" | "link" | "notes";

export interface StudyPlan {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  plannedDate: string;
  completed: boolean;
  priority?: PlanPriority;
  startTime?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  class: UserClass;
  board: UserBoard;
  createdAt: number;
  photoURL?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  enterToSend: boolean;
  autoScroll: boolean;
  responseStyle: "balanced" | "concise" | "detailed";
  stepByStep: boolean;
  language: "english" | "hindi" | "hinglish";
}

export interface Doubt {
  id: string;
  question: string;
  answer: string;
  type: DoubtType;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

export interface UserSession {
  id: string;
  device: string;
  browser?: string;
  os?: string;
  userAgent: string;
  lastActive: number;
  current: boolean;
  createdAt: number;
}

export interface ReauthPayload {
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export interface QuizAttempt {
  id: string;
  subject: string;
  class: UserClass;
  board: UserBoard;
  difficulty: QuizDifficulty;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  questions: QuizQuestion[];
  createdAt: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  selectedIndex?: number;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  status: "new" | "learning" | "known" | "difficult";
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface StudySession {
  id: string;
  mode: TimerMode;
  durationMinutes: number;
  completed: boolean;
  createdAt: number;
}

export interface Resource {
  id: string;
  title: string;
  subject: string;
  type: ResourceType;
  description: string;
  url?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  score: number;
  weeklyActivity: number;
  avatarUrl?: string;
}

export interface ProgressStats {
  totalDoubts: number;
  weeklyDoubts: number;
  totalQuizzes: number;
  avgQuizScore: number;
  totalFlashcards: number;
  flashcardsReviewed: number;
  totalNotes: number;
  totalStudySessions: number;
  totalStudyMinutes: number;
  plansCompleted: number;
  plansTotal: number;
  dailyActivity: { day: string; value: number }[];
}

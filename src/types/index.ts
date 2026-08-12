export type UserBoard = "CBSE" | "ICSE" | "State Board";
export type UserClass = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DoubtType = "text" | "photo";

export interface StudyPlan {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  plannedDate: string;
  completed: boolean;
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

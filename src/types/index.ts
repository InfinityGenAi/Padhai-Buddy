export type UserBoard = "CBSE" | "ICSE" | "State Board";
export type UserClass = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DoubtType = "text" | "photo";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  class: UserClass;
  board: UserBoard;
  createdAt: number;
}

export interface Doubt {
  id: string;
  question: string;
  answer: string;
  type: DoubtType;
  createdAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

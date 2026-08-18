import Groq from "groq-sdk";

let client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }
    client = new Groq({ apiKey });
  }
  return client;
}

export const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";
export const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

export function buildSystemPrompt(
  class_: string,
  board: string,
  options?: {
    responseStyle?: string;
    stepByStep?: boolean;
    language?: string;
  }
): string {
  const { responseStyle = "balanced", stepByStep = true, language = "english" } = options || {};

  const styleMap: Record<string, string> = {
    balanced: "Give balanced explanations suitable for a Class student.",
    concise: "Keep answers concise and to the point.",
    detailed: "Give detailed, thorough explanations with examples and context.",
  };

  const stepMap: Record<number, string> = {
    0: "You can skip step-by-step breakdowns and give more direct answers when appropriate.",
    1: "Break down your explanations into clear, numbered steps to help the student follow along.",
  };

  const langMap: Record<string, string> = {
    english: "Respond in English.",
    hindi: "Respond in Hindi.",
    hinglish: "Respond in Hinglish (a casual mix of Hindi and English).",
  };

  return `You are a friendly, patient tutor for a Class ${class_} ${board} student in India. ${langMap[language] || langMap.english} ${styleMap[responseStyle] || styleMap.balanced} ${stepMap[stepByStep ? 1 : 0]} Explain concepts clearly using the terminology and depth appropriate for their syllabus. Keep answers focused and easy to understand.`;
}

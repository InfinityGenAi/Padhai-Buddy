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

export const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
export const GROQ_VISION_MODEL = "llama-3.2-90b-vision-preview";

export function buildSystemPrompt(class_: string, board: string): string {
  return `You are a friendly, patient tutor for a Class ${class_} ${board} student in India. Explain concepts clearly, step by step, using the terminology and depth appropriate for their syllabus. Keep answers focused and easy to understand.`;
}

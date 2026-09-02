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
export const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export type StudyMode = "explain" | "teach" | "quiz" | "hint" | "simplify" | "deep" | "exam" | null;

export function buildSystemPrompt(
  class_: string,
  board: string,
  options?: {
    responseStyle?: string;
    stepByStep?: boolean;
    language?: string;
    studyMode?: StudyMode;
  }
): string {
  const { responseStyle = "balanced", stepByStep = true, language = "english", studyMode = null } = options || {};

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

  const modeMap: Record<Exclude<StudyMode, null>, string> = {
    explain: `Explain the concept clearly and simply. Structure your response with:
- A direct, one-sentence answer
- A clear explanation in simple terms
- A concrete example if helpful
- One key takeaway point
Keep it focused and easy to understand.`,
    teach: `Teach the concept step-by-step like a teacher in a classroom.
- Start with what the student likely already knows (prior knowledge hook)
- Build understanding progressively in small steps
- Use simple, relatable examples at each step
- Check understanding with a brief question before moving on
- End with a summary and a practice question for them to try
Be encouraging and patient.`,
    quiz: `Quiz the student on this topic interactively.
- Ask ONE clear, focused question at a time
- Do NOT provide the answer immediately — wait for their response
- After they answer, evaluate it and give constructive feedback
- Then ask the next question or explain if needed
- Keep questions appropriate for Class ${class_} ${board}
If this is the first message in a quiz session, start with a welcoming question.`,
    hint: `Give a gentle hint or clue to help the student figure it out themselves.
- Do NOT give the full answer
- Provide a nudge in the right direction (e.g., "Think about what formula relates X and Y" or "Recall the rule for...")
- Keep it brief — one or two sentences
- Encourage them to try solving it`,
    simplify: `Simplify the concept as much as possible.
- Use everyday analogies and relatable examples
- Avoid jargon and technical terms unless necessary (explain them simply if used)
- Break it down to its absolute core idea
- Make it feel approachable, not academic
- One clear takeaway`,
    deep: `Provide a deep, thorough explanation with structure:
- Direct answer
- Step-by-step derivation or reasoning
- Mathematical/scientific formulation where applicable
- Connections to related topics
- Advanced context or extensions
- Summary of key insights
Use proper notation for formulas and equations.`,
    exam: `Explain this in an exam-oriented way for Class ${class_} ${board}.
Structure with:
- Key formulas, definitions, or theorems (highlight what to memorize)
- Common question patterns and how to approach them
- Step-by-step solution method for typical problems
- Common mistakes to avoid
- Short revision points (bullet form for quick review)
- What examiners specifically look for in answers
Keep it focused and practical.`,
  };

  const modeInstruction = studyMode ? modeMap[studyMode] : "";

  const structureGuide = `
RESPONSE STRUCTURE GUIDELINES (apply naturally, don't force every section):
- Start with a direct, clear answer
- Follow with explanation/reasoning
- Include steps when solving problems
- Provide a concrete example when helpful
- Add a "Key Point" or "Exam Tip" for important concepts
- Use proper formatting: bold for key terms, code blocks for formulas/equations, bullet points for lists
- Keep language appropriate for Class ${class_} ${board} syllabus
- Be encouraging and supportive`;

  return `You are a friendly, patient tutor for a Class ${class_} ${board} student in India. ${langMap[language] || langMap.english} ${styleMap[responseStyle] || styleMap.balanced} ${stepMap[stepByStep ? 1 : 0]} ${modeInstruction}${structureGuide}`;
}

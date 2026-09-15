export type AIProviderId = "groq" | "openai" | "gemini" | "anthropic" | "openai-compatible";

export type AIModelId = string;

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  description: string;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  defaultModel: AIModelId;
  availableModels: AIModelId[];
  supportsCustomBaseUrl: boolean;
}

export const AI_PROVIDERS: Record<AIProviderId, AIProviderConfig> = {
  groq: {
    id: "groq",
    name: "Groq",
    description: "Fast inference with open models",
    requiresApiKey: true,
    supportsStreaming: true,
    defaultModel: "openai/gpt-oss-120b",
    availableModels: [
      "openai/gpt-oss-120b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
    supportsCustomBaseUrl: false,
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT models from OpenAI",
    requiresApiKey: true,
    supportsStreaming: true,
    defaultModel: "gpt-4o-mini",
    availableModels: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
    ],
    supportsCustomBaseUrl: false,
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    description: "Google's multimodal AI models",
    requiresApiKey: true,
    supportsStreaming: true,
    defaultModel: "gemini-1.5-flash",
    availableModels: [
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.0-pro",
    ],
    supportsCustomBaseUrl: false,
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models from Anthropic",
    requiresApiKey: true,
    supportsStreaming: true,
    defaultModel: "claude-3-5-sonnet-20241022",
    availableModels: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    supportsCustomBaseUrl: false,
  },
  "openai-compatible": {
    id: "openai-compatible",
    name: "OpenAI Compatible",
    description: "Any OpenAI-compatible API (Ollama, LM Studio, etc.)",
    requiresApiKey: true,
    supportsStreaming: true,
    defaultModel: "llama3.2",
    availableModels: [],
    supportsCustomBaseUrl: true,
  },
};

export interface UserAIConfig {
  provider: AIProviderId;
  apiKey: string;
  model: AIModelId;
  baseUrl?: string;
  updatedAt: number;
}

export interface AIProviderResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderStreamChunk {
  content: string;
  done: boolean;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  id: AIProviderId;
  sendMessage(messages: AIMessage[], config: UserAIConfig, stream: boolean): Promise<AIProviderResponse | AsyncIterable<AIProviderStreamChunk>>;
  validateConfig(config: UserAIConfig): Promise<{ valid: boolean; error?: string }>;
  getModels(apiKey: string, baseUrl?: string): Promise<AIModelId[]>;
}
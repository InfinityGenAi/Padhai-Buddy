import { AI_PROVIDERS, AIProviderId, AIProvider, UserAIConfig, AIMessage, AIProviderResponse, AIProviderStreamChunk } from "./types";
import { GroqProvider } from "./groq";
import { OpenAIProvider } from "./openai";
import { OpenAICompatibleProvider } from "./openai-compatible";

const providers: Map<AIProviderId, AIProvider> = new Map<AIProviderId, AIProvider>([
  ["groq", new GroqProvider()],
  ["openai", new OpenAIProvider()],
  ["openai-compatible", new OpenAICompatibleProvider()],
]);

export type { AIProviderId, UserAIConfig, AIProviderResponse, AIProviderConfig, AIProviderStreamChunk } from "./types";
export { AI_PROVIDERS } from "./types";
export function getProvider(id: AIProviderId): AIProvider | undefined {
  return providers.get(id);
}

export function getAllProviders() {
  return AI_PROVIDERS;
}

export function getProviderConfig(id: AIProviderId) {
  return AI_PROVIDERS[id];
}

export async function sendMessage(
  providerId: AIProviderId,
  messages: AIMessage[],
  config: UserAIConfig,
  stream: boolean
): Promise<AIProviderResponse | AsyncIterable<AIProviderStreamChunk>> {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Provider ${providerId} not found`);
  }
  return provider.sendMessage(messages, config, stream);
}

export async function validateProviderConfig(
  providerId: AIProviderId,
  config: UserAIConfig
): Promise<{ valid: boolean; error?: string }> {
  const provider = getProvider(providerId);
  if (!provider) {
    return { valid: false, error: `Provider ${providerId} not found` };
  }
  return provider.validateConfig(config);
}

export async function fetchModels(
  providerId: AIProviderId,
  apiKey: string,
  baseUrl?: string
): Promise<string[]> {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Provider ${providerId} not found`);
  }
  return provider.getModels(apiKey, baseUrl);
}
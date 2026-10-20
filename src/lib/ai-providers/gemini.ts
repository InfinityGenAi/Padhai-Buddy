import OpenAI from "openai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import {
  AIProvider,
  AIProviderId,
  UserAIConfig,
  AIMessage,
  AIProviderResponse,
  AIProviderStreamChunk,
} from "./types";
import { safeProviderFetch } from "./safe-url";

const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

export class GeminiProvider implements AIProvider {
  id: AIProviderId = "gemini";

  private createClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: GEMINI_OPENAI_BASE_URL,
      fetch: safeProviderFetch,
      timeout: 60_000,
      maxRetries: 1,
    });
  }

  async sendMessage(
    messages: AIMessage[],
    config: UserAIConfig,
    stream: boolean,
  ): Promise<AIProviderResponse | AsyncIterable<AIProviderStreamChunk>> {
    if (!config.apiKey.trim()) throw new Error("Gemini API key is required");
    if (!config.model.trim()) throw new Error("Gemini model is required");

    const client = this.createClient(config.apiKey);
    const completion = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
      stream,
    });

    if (stream) {
      return this.createStreamIterator(completion as AsyncIterable<ChatCompletionChunk>);
    }

    const result = completion as Awaited<ReturnType<typeof client.chat.completions.create>>;
    if (!("choices" in result)) {
      throw new Error("Gemini returned an unexpected non-streaming response");
    }

    return {
      content: result.choices[0]?.message?.content || "No response generated",
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async *createStreamIterator(
    stream: AsyncIterable<ChatCompletionChunk>,
  ): AsyncIterable<AIProviderStreamChunk> {
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      const content = choice?.delta?.content;
      if (typeof content === "string" && content.length > 0) {
        yield { content, done: false };
      }
      if (choice?.finish_reason) {
        yield { content: "", done: true };
        return;
      }
    }
    yield { content: "", done: true };
  }

  async validateConfig(config: UserAIConfig): Promise<{ valid: boolean; error?: string }> {
    if (!config.apiKey.trim()) return { valid: false, error: "Gemini API key is required" };
    if (!config.model.trim()) return { valid: false, error: "Gemini model is required" };

    try {
      const models = await this.createClient(config.apiKey).models.list();
      return models.data.length > 0
        ? { valid: true }
        : { valid: false, error: "The Gemini API returned no available models" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to validate Gemini API key";
      return { valid: false, error: message };
    }
  }

  async getModels(apiKey: string): Promise<string[]> {
    if (!apiKey.trim()) return [];
    const models = await this.createClient(apiKey).models.list();
    return models.data.map((model) => model.id).filter(Boolean);
  }
}

import OpenAI from "openai";
import { AIProvider, AIProviderId, UserAIConfig, AIMessage, AIProviderResponse, AIProviderStreamChunk } from "./types";

export class OpenAICompatibleProvider implements AIProvider {
  id: AIProviderId = "openai-compatible";

  async sendMessage(
    messages: AIMessage[],
    config: UserAIConfig,
    stream: boolean
  ): Promise<AIProviderResponse | AsyncIterable<AIProviderStreamChunk>> {
    if (!config.baseUrl) {
      throw new Error("Base URL is required for OpenAI-compatible providers");
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    if (stream) {
      const openaiStream = await client.chat.completions.create({
        model: config.model,
        messages: messages as any,
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      });

      return this.createStreamIterator(openaiStream);
    }

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: messages as any,
      temperature: 0.3,
      max_tokens: 2048,
    });

    return {
      content: completion.choices[0]?.message?.content || "No response generated",
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async *createStreamIterator(stream: any): AsyncIterable<AIProviderStreamChunk> {
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      const content = choice?.delta?.content;
      if (content) {
        yield { content, done: false };
      }
      if (choice?.finish_reason) {
        yield { content: "", done: true };
        break;
      }
    }
  }

  async validateConfig(config: UserAIConfig): Promise<{ valid: boolean; error?: string }> {
    if (!config.baseUrl) {
      return { valid: false, error: "Base URL is required" };
    }
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      await client.models.list();
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message || "Invalid configuration" };
    }
  }

  async getModels(apiKey: string, baseUrl?: string): Promise<string[]> {
    if (!baseUrl) return [];
    try {
      const client = new OpenAI({ apiKey, baseURL: baseUrl });
      const models = await client.models.list();
      return models.data.map((m) => m.id);
    } catch {
      return [];
    }
  }
}
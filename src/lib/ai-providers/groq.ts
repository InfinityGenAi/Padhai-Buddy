import Groq from "groq-sdk";
import type { ChatCompletionChunk } from "groq-sdk/resources/chat/completions";
import { AIProvider, AIProviderId, UserAIConfig, AIMessage, AIProviderResponse, AIProviderStreamChunk } from "./types";

export class GroqProvider implements AIProvider {
  id: AIProviderId = "groq";

  async sendMessage(
    messages: AIMessage[],
    config: UserAIConfig,
    stream: boolean
  ): Promise<AIProviderResponse | AsyncIterable<AIProviderStreamChunk>> {
    const client = new Groq({ apiKey: config.apiKey });

    if (stream) {
      const groqStream = await client.chat.completions.create({
        model: config.model,
        messages: messages as AIMessage[],
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      });

      return this.createStreamIterator(groqStream as AsyncIterable<ChatCompletionChunk>);
    }

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: messages as AIMessage[],
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

  private async *createStreamIterator(stream: AsyncIterable<ChatCompletionChunk>): AsyncIterable<AIProviderStreamChunk> {
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
    if (!config.apiKey.trim()) return { valid: false, error: "Groq API key is required" };
    if (!config.model.trim()) return { valid: false, error: "Groq model is required" };

    try {
      const response = await new Groq({ apiKey: config.apiKey }).models.list();
      const models = response.data
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (models.length === 0) {
        return { valid: false, error: "Groq returned no available models for this API key" };
      }
      if (!models.includes(config.model)) {
        return { valid: false, error: "Selected Groq model is not available for this API key. Refresh the model list and choose another model." };
      }
      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid API key";
      return { valid: false, error: message };
    }
  }

  async getModels(apiKey: string): Promise<string[]> {
    if (!apiKey.trim()) return [];
    const response = await new Groq({ apiKey }).models.list();
    return [...new Set(
      response.data
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .filter((id) => !/(whisper|tts|speech|transcrib|audio|embedding|moderation|guard|safeguard)/i.test(id)),
    )];
  }
}
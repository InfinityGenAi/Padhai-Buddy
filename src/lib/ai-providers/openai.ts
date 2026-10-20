import OpenAI from "openai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { AIProvider, AIProviderId, UserAIConfig, AIMessage, AIProviderResponse, AIProviderStreamChunk } from "./types";

export class OpenAIProvider implements AIProvider {
  id: AIProviderId = "openai";

  async sendMessage(
    messages: AIMessage[],
    config: UserAIConfig,
    stream: boolean
  ): Promise<AIProviderResponse | AsyncIterable<AIProviderStreamChunk>> {
    const client = new OpenAI({ apiKey: config.apiKey });

    if (stream) {
      const openaiStream = await client.chat.completions.create({
        model: config.model,
        messages: messages as AIMessage[],
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      });

      return this.createStreamIterator(openaiStream as AsyncIterable<ChatCompletionChunk>);
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
    if (!config.apiKey.trim()) return { valid: false, error: "OpenAI API key is required" };
    if (!config.model.trim()) return { valid: false, error: "OpenAI model is required" };

    try {
      const response = await new OpenAI({ apiKey: config.apiKey }).models.list();
      const models = response.data
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (models.length === 0) {
        return { valid: false, error: "OpenAI returned no available models for this API key" };
      }
      if (!models.includes(config.model)) {
        return { valid: false, error: "Selected OpenAI model is not available for this API key. Refresh the model list and choose another model." };
      }
      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid API key";
      return { valid: false, error: message };
    }
  }

  async getModels(apiKey: string): Promise<string[]> {
    if (!apiKey.trim()) return [];
    const response = await new OpenAI({ apiKey }).models.list();
    return [...new Set(
      response.data
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        // The API's model catalog also includes embeddings, audio, moderation,
        // and completion-only models that cannot be used by chat.completions.
        .filter((id) => /^(gpt-|chatgpt-|o[0-9]|codex-)/i.test(id))
        .filter((id) => !/(embedding|moderation|whisper|dall-e|tts|transcrib|audio|realtime|instruct|search-preview)/i.test(id)),
    )];
  }
}
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
    try {
      const client = new OpenAI({ apiKey: config.apiKey });
      await client.models.list();
      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid API key";
      return { valid: false, error: message };
    }
  }

  async getModels(): Promise<string[]> {
    return [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
    ];
  }
}
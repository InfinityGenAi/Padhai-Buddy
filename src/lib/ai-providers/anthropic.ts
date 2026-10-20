import {
  AIProvider,
  AIProviderId,
  UserAIConfig,
  AIMessage,
  AIProviderResponse,
  AIProviderStreamChunk,
} from "./types";
import { safeProviderFetch } from "./safe-url";

const ANTHROPIC_API = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

type AnthropicModel = { id?: string; display_name?: string };
type AnthropicModelList = { data?: AnthropicModel[]; has_more?: boolean; last_id?: string };
type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string; type?: string };
};
type AnthropicStreamEvent = {
  type?: string;
  delta?: { type?: string; text?: string };
  error?: { message?: string; type?: string };
};

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }
  return fallback;
}

export class AnthropicProvider implements AIProvider {
  id: AIProviderId = "anthropic";

  private headers(apiKey: string): HeadersInit {
    return {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    };
  }

  async sendMessage(
    messages: AIMessage[],
    config: UserAIConfig,
    stream: boolean,
  ): Promise<AIProviderResponse | AsyncIterable<AIProviderStreamChunk>> {
    if (!config.apiKey.trim()) throw new Error("Anthropic API key is required");
    if (!config.model.trim()) throw new Error("Anthropic model is required");

    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const conversation = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({ role: message.role, content: message.content }));

    if (conversation.length === 0) {
      throw new Error("At least one user message is required");
    }

    const response = await safeProviderFetch(`${ANTHROPIC_API}/messages`, {
      method: "POST",
      headers: this.headers(config.apiKey),
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2048,
        ...(system ? { system } : {}),
        messages: conversation,
        stream,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(errorMessage(payload, `Anthropic request failed (HTTP ${response.status})`));
    }

    if (stream) {
      return this.createStreamIterator(response);
    }

    const result = (await response.json()) as AnthropicMessageResponse;
    return {
      content: (result.content || [])
        .filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join(""),
      usage: result.usage
        ? {
            promptTokens: result.usage.input_tokens || 0,
            completionTokens: result.usage.output_tokens || 0,
            totalTokens: (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0),
          }
        : undefined,
    };
  }

  private async *createStreamIterator(
    response: Response,
  ): AsyncIterable<AIProviderStreamChunk> {
    if (!response.body) throw new Error("Anthropic streaming response had no body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");

        let separator = buffer.indexOf("\n\n");
        while (separator >= 0) {
          const block = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          let eventName = "";
          const dataLines: string[] = [];

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }

          if (dataLines.length > 0) {
            let payload: AnthropicStreamEvent;
            try {
              payload = JSON.parse(dataLines.join("\n")) as AnthropicStreamEvent;
            } catch {
              payload = {};
            }

            if (eventName === "error" || payload.type === "error") {
              throw new Error(payload.error?.message || "Anthropic streaming request failed");
            }
            if (
              payload.type === "content_block_delta" &&
              payload.delta?.type === "text_delta" &&
              typeof payload.delta.text === "string" &&
              payload.delta.text.length > 0
            ) {
              yield { content: payload.delta.text, done: false };
            }
            if (payload.type === "message_stop") {
              yield { content: "", done: true };
              return;
            }
          }

          separator = buffer.indexOf("\n\n");
        }

        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: "", done: true };
  }

  async validateConfig(config: UserAIConfig): Promise<{ valid: boolean; error?: string }> {
    if (!config.apiKey.trim()) return { valid: false, error: "Anthropic API key is required" };
    if (!config.model.trim()) return { valid: false, error: "Anthropic model is required" };

    try {
      const models = await this.getModels(config.apiKey);
      if (!models.length) {
        return { valid: false, error: "Anthropic returned no available models for this API key" };
      }
      if (!models.includes(config.model)) {
        return { valid: false, error: "Selected Anthropic model is not available for this API key. Refresh the model list and choose another model." };
      }
      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to validate Anthropic API key";
      return { valid: false, error: message };
    }
  }

  async getModels(apiKey: string): Promise<string[]> {
    if (!apiKey.trim()) return [];
    const response = await safeProviderFetch(`${ANTHROPIC_API}/models?limit=100`, {
      method: "GET",
      headers: this.headers(apiKey),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(errorMessage(payload, `Anthropic models request failed (HTTP ${response.status})`));
    }

    const payload = (await response.json()) as AnthropicModelList;
    const models = (payload.data || [])
      .map((model) => model.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    return [...new Set(models)];
  }
}

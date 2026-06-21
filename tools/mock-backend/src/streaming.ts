import type { FaultConfig } from "./config.js";

const LOREM_WORDS = [
  "the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog",
  "artificial", "intelligence", "language", "model", "response", "generated",
  "by", "mock", "backend", "for", "testing", "purposes", "only",
  "streaming", "tokens", "chunk", "delta", "completion", "assistant",
];

export function* generateTokens(
  count: number = 20,
  fault?: FaultConfig,
): Generator<string> {
  for (let i = 0; i < count; i++) {
    const word = LOREM_WORDS[i % LOREM_WORDS.length]!;
    yield i === 0 ? word : ` ${word}`;

    if (fault?.partialStreamTokens !== undefined && i + 1 >= fault.partialStreamTokens) {
      return; // stop without [DONE]
    }
  }
}

export function buildChunk(
  id: string,
  model: string,
  content: string,
  toolCall?: { id: string; name: string; args: string },
): string {
  const delta: Record<string, unknown> = {};
  if (content) {
    delta["content"] = content;
  }
  if (toolCall) {
    delta["tool_calls"] = [
      {
        index: 0,
        id: toolCall.id,
        type: "function",
        function: { name: toolCall.name, arguments: toolCall.args },
      },
    ];
  }

  const chunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: null }],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export function buildDoneChunk(id: string, model: string, finishReason = "stop"): string {
  const chunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
  return `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
}

export function buildNonStreamingResponse(
  id: string,
  model: string,
  content: string,
): object {
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };
}

export function buildEmbeddingResponse(model: string, input: string | string[]): object {
  const inputs = Array.isArray(input) ? input : [input];
  return {
    object: "list",
    data: inputs.map((_, i) => ({
      object: "embedding",
      index: i,
      embedding: Array.from({ length: 8 }, () => Math.random() - 0.5),
    })),
    model,
    usage: { prompt_tokens: inputs.length * 5, total_tokens: inputs.length * 5 },
  };
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldTrigger(pct?: number): boolean {
  if (pct === undefined || pct <= 0) return false;
  return Math.random() * 100 < pct;
}

import type { ChatRequest, ChatMessage } from "./types.js";

/** Prepend text to the system prompt (or create one if absent). */
export function prependSystemPrompt(request: ChatRequest, text: string): ChatRequest {
  const messages = [...request.messages];
  const idx = messages.findIndex((m) => m.role === "system");
  if (idx >= 0) {
    const existing = messages[idx]!;
    messages[idx] = {
      ...existing,
      content: typeof existing.content === "string" ? `${text}\n\n${existing.content}` : text,
    };
  } else {
    messages.unshift({ role: "system", content: text });
  }
  return { ...request, messages };
}

/** Append text to the system prompt (or create one if absent). */
export function appendSystemPrompt(request: ChatRequest, text: string): ChatRequest {
  const messages = [...request.messages];
  const idx = messages.findIndex((m) => m.role === "system");
  if (idx >= 0) {
    const existing = messages[idx]!;
    messages[idx] = {
      ...existing,
      content: typeof existing.content === "string" ? `${existing.content}\n\n${text}` : text,
    };
  } else {
    messages.push({ role: "system", content: text });
  }
  return { ...request, messages };
}

/** Replace occurrences of a string across all text message content. */
export function replaceInMessages(request: ChatRequest, search: string, replace: string): ChatRequest {
  const messages = request.messages.map((m): ChatMessage => {
    if (typeof m.content === "string") {
      return { ...m, content: m.content.replaceAll(search, replace) };
    }
    return m;
  });
  return { ...request, messages };
}

/** Override a request parameter (e.g. temperature, max_tokens). */
export function setParam<K extends keyof ChatRequest>(
  request: ChatRequest,
  key: K,
  value: ChatRequest[K],
): ChatRequest {
  return { ...request, [key]: value };
}

/**
 * Merge all system messages into a single leading system message.
 * Useful for vLLM which only supports a single system prompt.
 */
export function mergeSystemPrompts(request: ChatRequest, separator = "\n\n"): ChatRequest {
  const systemMessages = request.messages.filter((m) => m.role === "system");
  if (systemMessages.length <= 1) return request;

  const combined = systemMessages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .filter(Boolean)
    .join(separator);

  const nonSystem = request.messages.filter((m) => m.role !== "system");
  return {
    ...request,
    messages: [{ role: "system", content: combined }, ...nonSystem],
  };
}

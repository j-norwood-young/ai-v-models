import type { ChatRequest, ChatMessage } from "./types.js";

/** Prepend text to the system prompt of a chat request (or create one if missing). */
export function prependSystemPrompt(request: ChatRequest, text: string): ChatRequest {
  const messages = [...request.messages];
  const systemIdx = messages.findIndex((m) => m.role === "system");
  if (systemIdx >= 0) {
    const existing = messages[systemIdx]!;
    messages[systemIdx] = {
      ...existing,
      content: typeof existing.content === "string" ? `${text}\n\n${existing.content}` : text,
    };
  } else {
    messages.unshift({ role: "system", content: text });
  }
  return { ...request, messages };
}

/** Append text to the system prompt of a chat request. */
export function appendSystemPrompt(request: ChatRequest, text: string): ChatRequest {
  const messages = [...request.messages];
  const systemIdx = messages.findIndex((m) => m.role === "system");
  if (systemIdx >= 0) {
    const existing = messages[systemIdx]!;
    messages[systemIdx] = {
      ...existing,
      content: typeof existing.content === "string" ? `${existing.content}\n\n${text}` : text,
    };
  } else {
    messages.push({ role: "system", content: text });
  }
  return { ...request, messages };
}

/** Replace all occurrences of a string in all text content parts of all messages. */
export function replaceInMessages(request: ChatRequest, search: string, replace: string): ChatRequest {
  const messages = request.messages.map((m): ChatMessage => {
    if (typeof m.content === "string") {
      return { ...m, content: m.content.replaceAll(search, replace) };
    }
    return m;
  });
  return { ...request, messages };
}

/** Set or override a specific request parameter (e.g. temperature, max_tokens). */
export function setParam<K extends keyof ChatRequest>(
  request: ChatRequest,
  key: K,
  value: ChatRequest[K],
): ChatRequest {
  return { ...request, [key]: value };
}

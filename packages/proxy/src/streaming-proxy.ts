import { fetch, RequestInit } from "undici";
import type { FastifyReply } from "fastify";
import {
  httpRequestsTotal,
  httpRequestDurationMs,
  tokensTotal,
  ttftMs as ttftHistogram,
  tpsGauge,
  toolCallsTotal,
} from "./metrics.js";
import { getLogger } from "./logger.js";

export interface ProxyRequestOptions {
  upstreamUrl: string;
  upstreamApiKey: string | null;
  requestBody: Record<string, unknown>;
  vmodelId: string;
  backendId: string;
  backendName: string;
  modelId: string;
  keyPrefix?: string;
}

export interface ProxyResult {
  statusCode: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  ttftMs: number | null;
  durationMs: number;
  tps: number | null;
  toolCallCount: number;
  error: string | undefined;
  responseBody: string | undefined;
}

export async function streamingProxy(
  reply: FastifyReply,
  opts: ProxyRequestOptions,
): Promise<ProxyResult> {
  const log = getLogger();
  const start = Date.now();
  let ttft: number | null = null;
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let toolCallCount = 0;
  let statusCode = 200;
  let error: string | undefined = undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ai-v-models/1.0",
  };
  if (opts.upstreamApiKey) {
    headers["Authorization"] = `Bearer ${opts.upstreamApiKey}`;
  }

  try {
    const response = await fetch(opts.upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(opts.requestBody),
    } as RequestInit);

    statusCode = response.status;

    if (!response.ok) {
      const body = await response.text();
      error = body;
      httpRequestsTotal.inc({
        method: "POST",
        endpoint: "/v1/chat/completions",
        status: String(statusCode),
        vmodel: opts.vmodelId,
        backend: opts.backendName,
      });
      return {
        statusCode,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        ttftMs: null,
        durationMs: Date.now() - start,
        tps: null,
        toolCallCount: 0,
        error: body,
        responseBody: undefined,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isStreaming =
      contentType.includes("text/event-stream") ||
      (opts.requestBody["stream"] !== false);

    if (isStreaming && response.body) {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const decoder = new TextDecoder();
      let buffer = "";

      for await (const chunk of response.body) {
        if (ttft === null) {
          ttft = Date.now() - start;
          ttftHistogram.observe({ vmodel: opts.vmodelId, backend: opts.backendName }, ttft);
        }

        const text = decoder.decode(chunk instanceof Uint8Array ? chunk : Buffer.from(chunk as ArrayBuffer), { stream: true });
        buffer += text;
        reply.raw.write(text);

        // Parse SSE for token counting
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;
            const choices = parsed["choices"] as Array<Record<string, unknown>> | undefined;
            if (choices?.[0]) {
              const delta = choices[0]["delta"] as Record<string, unknown> | undefined;
              if (delta?.["content"]) completionTokens++;
              const toolCalls = delta?.["tool_calls"] as unknown[] | undefined;
              if (toolCalls?.length) toolCallCount += toolCalls.length;
            }
            const usage = parsed["usage"] as Record<string, number> | undefined;
            if (usage) {
              promptTokens = usage["prompt_tokens"] ?? promptTokens;
              completionTokens = usage["completion_tokens"] ?? completionTokens;
              totalTokens = usage["total_tokens"] ?? totalTokens;
            }
          } catch {
            // Ignore parse errors for individual chunks
          }
        }
      }

      reply.raw.end();
    } else {
      // Non-streaming
      const body = await response.text();
      const durationMs = Date.now() - start;
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        const usage = parsed["usage"] as Record<string, number> | undefined;
        if (usage) {
          promptTokens = usage["prompt_tokens"] ?? 0;
          completionTokens = usage["completion_tokens"] ?? 0;
          totalTokens = usage["total_tokens"] ?? 0;
        }
      } catch {
        // not JSON
      }

      reply
        .status(200)
        .header("Content-Type", "application/json")
        .send(body);

      return {
        statusCode: 200,
        promptTokens,
        completionTokens,
        totalTokens,
        ttftMs: durationMs,
        durationMs,
        tps: null,
        toolCallCount,
        error: undefined,
        responseBody: body,
      };
    }
  } catch (err) {
    statusCode = 502;
    error = err instanceof Error ? err.message : String(err);
    log.error({ err, backend: opts.backendName }, "Upstream request failed");

    if (!reply.sent) {
      reply.status(502).send({ error: { message: "Upstream error", type: "proxy_error" } });
    }
  }

  const durationMs = Date.now() - start;
  if (totalTokens === 0) totalTokens = promptTokens + completionTokens;

  const tps = durationMs > 0 && completionTokens > 0 ? (completionTokens / (durationMs / 1000)) : null;
  if (tps !== null) tpsGauge.set({ vmodel: opts.vmodelId, backend: opts.backendName }, tps);
  if (totalTokens > 0) {
    tokensTotal.inc({ type: "prompt", vmodel: opts.vmodelId, backend: opts.backendName, key_prefix: opts.keyPrefix ?? "unknown" }, promptTokens);
    tokensTotal.inc({ type: "completion", vmodel: opts.vmodelId, backend: opts.backendName, key_prefix: opts.keyPrefix ?? "unknown" }, completionTokens);
  }
  if (toolCallCount > 0) {
    toolCallsTotal.inc({ vmodel: opts.vmodelId, backend: opts.backendName }, toolCallCount);
  }
  httpRequestsTotal.inc({
    method: "POST",
    endpoint: "/v1/chat/completions",
    status: String(statusCode),
    vmodel: opts.vmodelId,
    backend: opts.backendName,
  });
  httpRequestDurationMs.observe(
    { method: "POST", endpoint: "/v1/chat/completions", vmodel: opts.vmodelId, backend: opts.backendName },
    durationMs,
  );

  return { statusCode, promptTokens, completionTokens, totalTokens, ttftMs: ttft, durationMs, tps, toolCallCount, error, responseBody: undefined };
}

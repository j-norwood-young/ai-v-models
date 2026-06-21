import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import {
  backends as backendsTable,
  vmodels as vmodelsTable,
  vmodelBackends as vmodelBackendsTable,
} from "@ai-v-models/core";
import { buildBackendApiUrl, decrypt } from "@ai-v-models/core";
import type { AppContext } from "../../context.js";
import { streamingProxy } from "../../streaming-proxy.js";
import { UsageRecorder } from "../../usage-recorder.js";
import type { BackendCandidate } from "../../balancer.js";
import type { Backend } from "@ai-v-models/core";

export async function chatRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  const recorder = new UsageRecorder(ctx.db, ctx.sse);

  app.post("/v1/chat/completions", async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const requestedModel = body["model"] as string | undefined;

    if (!requestedModel) {
      return reply.status(400).send({ error: { message: "model is required", type: "invalid_request_error" } });
    }

    // Authenticate key
    const authHeader = req.headers.authorization;
    const rawKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!rawKey) {
      return reply.status(401).send({ error: { message: "Missing Authorization header", type: "auth_error" } });
    }

    const authResult = await ctx.keyAuth.authenticate(rawKey);
    if (!authResult.success) {
      return reply.status(authResult.status).send({
        error: { message: authResult.error, type: "auth_error", code: authResult.code },
      });
    }

    const key = authResult.key;
    const hasTools = Array.isArray(body["tools"]) && (body["tools"] as unknown[]).length > 0;
    const hasVision = Array.isArray(body["messages"]) &&
      (body["messages"] as Array<Record<string, unknown>>).some(
        (m) => Array.isArray(m["content"]) &&
          (m["content"] as Array<Record<string, unknown>>).some((c) => c["type"] === "image_url"),
      );

    const budgetCheck = await ctx.keyAuth.checkTokenBudget(key);
    if (!budgetCheck.allowed) {
      return reply.status(429).send({
        error: { message: budgetCheck.error, type: "rate_limit_error" },
      });
    }

    // Resolve model — is it a v-model or direct backend model?
    const vmodel = await ctx.db.db
      .select()
      .from(vmodelsTable)
      .where(and(eq(vmodelsTable.modelId, requestedModel), eq(vmodelsTable.enabled, true)))
      .get();

    let candidates: BackendCandidate[] = [];

    if (vmodel) {
      // Get v-model backends
      const vmBackends = await ctx.db.db
        .select()
        .from(vmodelBackendsTable)
        .where(
          and(
            eq(vmodelBackendsTable.vmodelId, vmodel.id),
            eq(vmodelBackendsTable.enabled, true),
          ),
        )
        .all();

      for (const vmb of vmBackends) {
        const backend = await ctx.db.db
          .select()
          .from(backendsTable)
          .where(eq(backendsTable.id, vmb.backendId))
          .get();
        if (backend) {
          candidates.push({
            backendId: backend.id,
            backend: backend as unknown as Backend,
            backendModelId: vmb.backendModelId,
            weight: vmb.weight,
          });
        }
      }
    } else {
      // Direct namespaced model lookup: "model:hostname:provider"
      const parts = requestedModel.split(":");
      if (parts.length >= 3) {
        const modelId = parts.slice(0, -2).join(":");
        const hostName = parts[parts.length - 2];
        const provider = parts[parts.length - 1];

        const backend = await ctx.db.db
          .select()
          .from(backendsTable)
          .where(
            and(
              eq(backendsTable.hostName, hostName ?? ""),
              eq(backendsTable.provider, provider ?? ""),
              eq(backendsTable.enabled, true),
            ),
          )
          .get();

        if (backend) {
          candidates.push({
            backendId: backend.id,
            backend: backend as unknown as Backend,
            backendModelId: modelId,
            weight: backend.weight,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return reply.status(404).send({
        error: { message: `Model '${requestedModel}' not found`, type: "invalid_request_error" },
      });
    }

    const capabilities = { tools: hasTools, vision: hasVision };
    const modelAccess = vmodel
      ? await ctx.keyAuth.checkVModelAccess(key, requestedModel, capabilities)
      : await ctx.keyAuth.checkBackendAccess(key, candidates[0]!.backendId, capabilities);
    if (!modelAccess.allowed) {
      return reply.status(403).send({ error: { message: modelAccess.error, type: "permission_error" } });
    }

    // Select backend via balancer
    const sessionKey = key.id; // Use key ID for session pinning
    const strategy = (vmodel?.balancingStrategy ?? "session-pin") as "session-pin" | "round-robin" | "weighted" | "least-connections" | "least-latency";
    const selected = ctx.balancer.select(candidates, strategy, sessionKey);

    if (!selected) {
      return reply.status(503).send({ error: { message: "No backends available", type: "server_error" } });
    }

    const cb = ctx.balancer.getCircuitBreaker(selected.backendId, selected.backend.name);
    if (cb.isOpen) {
      // Try next available candidate
      const fallback = candidates.find((c) => c.backendId !== selected.backendId);
      if (!fallback) {
        return reply.status(503).send({ error: { message: "All backends unavailable", type: "server_error" } });
      }
    }

    // Determine upstream API key
    let upstreamApiKey: string | null = null;
    if (selected.backend.keyMode === "abstraction" && selected.backend.encryptedApiKey) {
      upstreamApiKey = decrypt(selected.backend.encryptedApiKey, ctx.masterKey);
    } else if (selected.backend.keyMode === "passthrough") {
      upstreamApiKey = rawKey;
    }

    // Mutate request body: replace model ID with backend-specific model ID
    const upstreamBody = { ...body, model: selected.backendModelId };

    ctx.balancer.incrementConcurrency(selected.backendId);

    const proxyResult = await streamingProxy(reply, {
      upstreamUrl: buildBackendApiUrl(selected.backend.baseUrl, "/v1/chat/completions"),
      upstreamApiKey,
      requestBody: upstreamBody,
      vmodelId: vmodel?.id ?? "direct",
      backendId: selected.backendId,
      backendName: selected.backend.name,
      modelId: selected.backendModelId,
      keyPrefix: key.prefix,
    });

    ctx.balancer.decrementConcurrency(selected.backendId);

    if (proxyResult.statusCode >= 500) {
      cb.recordFailure();
    } else {
      cb.recordSuccess();
    }

    // Record usage (async, don't await)
    recorder.record({
      ...proxyResult,
      keyId: key.id,
      keyPrefix: key.prefix,
      vmodelId: vmodel?.id ?? null,
      vmodelModelId: requestedModel,
      backendId: selected.backendId,
      backendModelId: selected.backendModelId,
      endpoint: "/v1/chat/completions",
      shouldLogRequest: key.logRequests,
      requestSize: JSON.stringify(body).length,
      responseSize: proxyResult.responseBody?.length ?? 0,
    }).catch(() => {});

    // Consume token budget (async)
    if (proxyResult.totalTokens > 0) {
      ctx.keyAuth.consumeTokenBudget(key.id, proxyResult.totalTokens).catch(() => {});
    }

    return reply;
  });
}

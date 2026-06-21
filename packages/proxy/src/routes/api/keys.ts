import type { FastifyInstance } from "fastify";
import { eq, and, desc, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { apiKeys, requestLogs, tokenBudgetCounters } from "@ai-v-models/core";
import { generateApiKey } from "@ai-v-models/core";
import type { AppContext } from "../../context.js";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function keysRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  // List all keys
  app.get("/api/v1/keys", async () => {
    const rows = await ctx.db.db.select().from(apiKeys).all();
    return rows.map((k) => ({ ...k, keyHash: undefined }));
  });

  // Get single key
  app.get<{ Params: { id: string } }>("/api/v1/keys/:id", async (req, reply) => {
    const key = await ctx.db.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, req.params.id))
      .get();
    if (!key) return reply.status(404).send({ error: "Key not found" });
    return { ...key, keyHash: undefined };
  });

  // Create key
  app.post<{ Body: Record<string, unknown> }>("/api/v1/keys", async (req, reply) => {
    const body = req.body;
    const now = Date.now();
    const id = `key-${nanoid(8)}`;

    const { key, prefix } = generateApiKey();
    const keyHash = hashKey(key);

    const allowedModels = body["allowedModels"];

    await ctx.db.db
      .insert(apiKeys)
      .values({
        id,
        prefix,
        keyHash,
        name: body["name"] as string,
        enabled: (body["enabled"] as boolean) ?? true,
        suspended: false,
        suspendedReason: null,
        expiresAt: body["expiresAt"] as number | null ?? null,
        allowedModels: allowedModels ? JSON.stringify(allowedModels) : null,
        allowToolCalling: (body["allowToolCalling"] as boolean) ?? true,
        allowVision: (body["allowVision"] as boolean) ?? false,
        allowEmbeddings: (body["allowEmbeddings"] as boolean) ?? false,
        rateLimitRpm: body["rateLimitRpm"] as number | null ?? null,
        tokenBudgetHour: body["tokenBudgetHour"] as number | null ?? null,
        tokenBudgetDay: body["tokenBudgetDay"] as number | null ?? null,
        tokenBudgetWeek: body["tokenBudgetWeek"] as number | null ?? null,
        tokenBudgetMonth: body["tokenBudgetMonth"] as number | null ?? null,
        logRequests: (body["logRequests"] as boolean) ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return reply.status(201).send({
      id,
      key, // Only returned once!
      prefix,
      name: body["name"],
    });
  });

  // Update key
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/api/v1/keys/:id",
    async (req, reply) => {
      const existing = await ctx.db.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, req.params.id))
        .get();
      if (!existing) return reply.status(404).send({ error: "Key not found" });

      const body = req.body;
      const updates: Partial<typeof apiKeys.$inferInsert> = { updatedAt: Date.now() };

      for (const field of [
        "name", "enabled", "expiresAt", "allowToolCalling", "allowVision",
        "allowEmbeddings", "rateLimitRpm", "tokenBudgetHour", "tokenBudgetDay",
        "tokenBudgetWeek", "tokenBudgetMonth", "logRequests",
      ] as const) {
        if (body[field] !== undefined) {
          (updates as Record<string, unknown>)[field] = body[field];
        }
      }
      if (body["allowedModels"] !== undefined) {
        updates.allowedModels = body["allowedModels"] ? JSON.stringify(body["allowedModels"]) : null;
      }

      await ctx.db.db.update(apiKeys).set(updates).where(eq(apiKeys.id, req.params.id)).run();
      return { success: true };
    },
  );

  // Suspend key
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    "/api/v1/keys/:id/suspend",
    async (req, reply) => {
      const key = await ctx.db.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, req.params.id))
        .get();
      if (!key) return reply.status(404).send({ error: "Key not found" });

      await ctx.db.db
        .update(apiKeys)
        .set({
          suspended: true,
          suspendedReason: req.body.reason ?? "Manually suspended",
          updatedAt: Date.now(),
        })
        .where(eq(apiKeys.id, req.params.id))
        .run();

      return { success: true };
    },
  );

  // Resume key
  app.post<{ Params: { id: string } }>("/api/v1/keys/:id/resume", async (req, reply) => {
    const key = await ctx.db.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, req.params.id))
      .get();
    if (!key) return reply.status(404).send({ error: "Key not found" });

    await ctx.db.db
      .update(apiKeys)
      .set({ suspended: false, suspendedReason: null, updatedAt: Date.now() })
      .where(eq(apiKeys.id, req.params.id))
      .run();

    return { success: true };
  });

  // Delete key
  app.delete<{ Params: { id: string } }>("/api/v1/keys/:id", async (req, reply) => {
    await ctx.db.db.delete(apiKeys).where(eq(apiKeys.id, req.params.id)).run();
    return reply.status(204).send();
  });

  // Get key usage logs
  app.get<{ Params: { id: string }; Querystring: { limit?: string; since?: string } }>(
    "/api/v1/keys/:id/logs",
    async (req, reply) => {
      const limit = Math.min(parseInt(req.query.limit ?? "100", 10), 500);
      const since = req.query.since ? parseInt(req.query.since, 10) : undefined;

      const whereClause = since
        ? and(eq(requestLogs.keyId, req.params.id), gte(requestLogs.timestamp, since))
        : eq(requestLogs.keyId, req.params.id);

      const logs = await ctx.db.db
        .select()
        .from(requestLogs)
        .where(whereClause)
        .orderBy(desc(requestLogs.timestamp))
        .limit(limit)
        .all();

      return logs;
    },
  );

  // Get key budget usage
  app.get<{ Params: { id: string } }>("/api/v1/keys/:id/budget", async (req, reply) => {
    const key = await ctx.db.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, req.params.id))
      .get();
    if (!key) return reply.status(404).send({ error: "Key not found" });

    const counters = await ctx.db.db
      .select()
      .from(tokenBudgetCounters)
      .where(eq(tokenBudgetCounters.keyId, req.params.id))
      .all();

    const getBucket = (period: string): string => {
      const now = new Date();
      switch (period) {
        case "hour": {
          const d = new Date(now);
          d.setMinutes(0, 0, 0);
          return d.toISOString();
        }
        case "day": {
          const d = new Date(now);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        }
        default: return now.toISOString();
      }
    };

    const usage = {
      hour: { used: 0, budget: key.tokenBudgetHour },
      day: { used: 0, budget: key.tokenBudgetDay },
      week: { used: 0, budget: key.tokenBudgetWeek },
      month: { used: 0, budget: key.tokenBudgetMonth },
    };

    for (const counter of counters) {
      const period = counter.period as keyof typeof usage;
      if (period in usage && counter.bucket === getBucket(period)) {
        usage[period]!.used = counter.tokensUsed;
      }
    }

    return usage;
  });
}

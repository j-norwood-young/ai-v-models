import type { FastifyInstance } from "fastify";
import { eq, desc, gte, and } from "drizzle-orm";
import { usageRollups, usageEvents } from "@ai-v-models/core";
import { registry } from "../../metrics.js";
import type { AppContext } from "../../context.js";

export async function metricsApiRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  // Prometheus metrics endpoint
  app.get("/metrics", async (_req, reply) => {
    const metrics = await registry.metrics();
    return reply.header("Content-Type", registry.contentType).send(metrics);
  });

  // Global stats summary
  app.get("/api/v1/metrics/summary", async () => {
    const since = Date.now() - 86400 * 1000; // last 24h
    const events = await ctx.db.db
      .select()
      .from(usageEvents)
      .where(gte(usageEvents.timestamp, since))
      .all();

    const totalRequests = events.length;
    const totalTokens = events.reduce((s, e) => s + e.totalTokens, 0);
    const errorRate = totalRequests > 0 ? events.filter((e) => e.statusCode >= 400).length / totalRequests : 0;
    const avgTtft = events.filter((e) => e.ttftMs !== null).reduce((s, e) => s + (e.ttftMs ?? 0), 0) /
      Math.max(1, events.filter((e) => e.ttftMs !== null).length);
    const avgTps = events.filter((e) => e.tps !== null).reduce((s, e) => s + (e.tps ?? 0), 0) /
      Math.max(1, events.filter((e) => e.tps !== null).length);

    return { totalRequests, totalTokens, errorRate, avgTtftMs: avgTtft, avgTps };
  });

  // Time series rollups
  app.get<{
    Querystring: {
      period?: string;
      keyId?: string;
      vmodelId?: string;
      backendId?: string;
      since?: string;
      limit?: string;
    };
  }>("/api/v1/metrics/rollups", async (req) => {
    const { period = "hour", keyId, vmodelId, backendId, since, limit = "48" } = req.query;

    const conditions = [eq(usageRollups.period, period)];
    if (keyId) conditions.push(eq(usageRollups.keyId, keyId));
    if (vmodelId) conditions.push(eq(usageRollups.vmodelId, vmodelId));
    if (backendId) conditions.push(eq(usageRollups.backendId, backendId));

    const rows = await ctx.db.db
      .select()
      .from(usageRollups)
      .where(and(...conditions))
      .orderBy(desc(usageRollups.bucket))
      .limit(parseInt(limit, 10))
      .all();

    return rows.reverse();
  });

  // Recent events
  app.get<{ Querystring: { limit?: string; since?: string; keyId?: string; vmodelId?: string } }>(
    "/api/v1/metrics/events",
    async (req) => {
      const { limit = "100", since, keyId, vmodelId } = req.query;

      const conditions = [];
      if (since) conditions.push(gte(usageEvents.timestamp, parseInt(since, 10)));
      if (keyId) conditions.push(eq(usageEvents.keyId, keyId));
      if (vmodelId) conditions.push(eq(usageEvents.vmodelId, vmodelId));

      const rows = await ctx.db.db
        .select()
        .from(usageEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(usageEvents.timestamp))
        .limit(parseInt(limit, 10))
        .all();

      return rows;
    },
  );
}

import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { backends as backendsTable } from "@ai-v-models/core";
import { encrypt } from "@ai-v-models/core";
import type { AppContext } from "../../context.js";
import { checkBackendHealth } from "../../health.js";

export async function backendsRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  // List all backends
  app.get("/api/v1/backends", async () => {
    const rows = await ctx.db.db.select().from(backendsTable).all();
    return rows.map((b) => ({ ...b, encryptedApiKey: undefined }));
  });

  // Get single backend
  app.get<{ Params: { id: string } }>("/api/v1/backends/:id", async (req, reply) => {
    const backend = await ctx.db.db
      .select()
      .from(backendsTable)
      .where(eq(backendsTable.id, req.params.id))
      .get();
    if (!backend) return reply.status(404).send({ error: "Backend not found" });
    return { ...backend, encryptedApiKey: undefined };
  });

  // Create backend
  app.post<{ Body: Record<string, unknown> }>("/api/v1/backends", async (req, reply) => {
    const body = req.body;
    const now = Date.now();
    const id = `backend-${nanoid(8)}`;

    let encryptedApiKey: string | null = null;
    if (body["apiKey"] && body["keyMode"] === "abstraction") {
      encryptedApiKey = encrypt(body["apiKey"] as string, ctx.masterKey);
    }

    await ctx.db.db
      .insert(backendsTable)
      .values({
        id,
        name: body["name"] as string,
        displayName: (body["displayName"] as string) ?? (body["name"] as string),
        hostName: body["hostName"] as string,
        provider: body["provider"] as string,
        baseUrl: body["baseUrl"] as string,
        keyMode: (body["keyMode"] as string) ?? "passthrough",
        encryptedApiKey,
        enabled: (body["enabled"] as boolean) ?? true,
        weight: (body["weight"] as number) ?? 1,
        maxConcurrency: (body["maxConcurrency"] as number) ?? 10,
        healthCheckEnabled: (body["healthCheckEnabled"] as boolean) ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const created = await ctx.db.db
      .select()
      .from(backendsTable)
      .where(eq(backendsTable.id, id))
      .get();

    ctx.sse.broadcast("backend-health", { backendId: id, action: "created" });
    return reply.status(201).send({ ...created, encryptedApiKey: undefined });
  });

  // Update backend
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/api/v1/backends/:id",
    async (req, reply) => {
      const backend = await ctx.db.db
        .select()
        .from(backendsTable)
        .where(eq(backendsTable.id, req.params.id))
        .get();
      if (!backend) return reply.status(404).send({ error: "Backend not found" });

      const updates: Partial<typeof backendsTable.$inferInsert> = { updatedAt: Date.now() };
      const body = req.body;

      if (body["displayName"] !== undefined) updates.displayName = body["displayName"] as string;
      if (body["baseUrl"] !== undefined) updates.baseUrl = body["baseUrl"] as string;
      if (body["enabled"] !== undefined) updates.enabled = body["enabled"] as boolean;
      if (body["weight"] !== undefined) updates.weight = body["weight"] as number;
      if (body["apiKey"] !== undefined) {
        updates.encryptedApiKey = encrypt(body["apiKey"] as string, ctx.masterKey);
      }

      await ctx.db.db.update(backendsTable).set(updates).where(eq(backendsTable.id, req.params.id)).run();

      const updated = await ctx.db.db
        .select()
        .from(backendsTable)
        .where(eq(backendsTable.id, req.params.id))
        .get();

      ctx.sse.broadcast("backend-health", { backendId: req.params.id, action: "updated" });

      return { ...updated, encryptedApiKey: undefined };
    },
  );

  // Delete backend
  app.delete<{ Params: { id: string } }>("/api/v1/backends/:id", async (req, reply) => {
    const backend = await ctx.db.db
      .select()
      .from(backendsTable)
      .where(eq(backendsTable.id, req.params.id))
      .get();
    if (!backend) return reply.status(404).send({ error: "Backend not found" });

    await ctx.db.db
      .delete(backendsTable)
      .where(eq(backendsTable.id, req.params.id))
      .run();

    ctx.sse.broadcast("backend-health", { backendId: req.params.id, action: "deleted" });

    return reply.status(204).send();
  });

  // Test backend connectivity
  app.post<{ Params: { id: string } }>("/api/v1/backends/:id/test", async (req, reply) => {
    const backend = await ctx.db.db
      .select()
      .from(backendsTable)
      .where(eq(backendsTable.id, req.params.id))
      .get();
    if (!backend) return reply.status(404).send({ error: "Backend not found" });

    const result = await checkBackendHealth(
      {
        id: backend.id,
        baseUrl: backend.baseUrl,
        name: backend.name,
        keyMode: backend.keyMode,
        encryptedApiKey: backend.encryptedApiKey,
      },
      ctx.masterKey,
      10000,
    );

    const now = Date.now();
    await ctx.db.db
      .update(backendsTable)
      .set({
        lastHealthCheck: now,
        lastHealthStatus: result.status,
        lastLatencyMs: result.latencyMs,
        updatedAt: now,
      })
      .where(eq(backendsTable.id, backend.id))
      .run();

    ctx.sse.broadcast("backend-health", {
      backendId: backend.id,
      status: result.status,
      latencyMs: result.latencyMs,
    });

    return {
      success: result.status !== "unhealthy",
      statusCode: result.status === "unhealthy" ? 0 : 200,
      latencyMs: result.latencyMs,
      health: result.status,
      error: result.error,
    };
  });
}

import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { fetch } from "undici";
import { backends as backendsTable } from "@ai-v-models/core";
import { decrypt, encrypt } from "@ai-v-models/core";
import type { AppContext } from "../../context.js";

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

    const start = Date.now();
    try {
      const headers: Record<string, string> = {};
      if (backend.keyMode === "abstraction" && backend.encryptedApiKey) {
        headers["Authorization"] = `Bearer ${decrypt(backend.encryptedApiKey, ctx.masterKey)}`;
      }

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${backend.baseUrl}/v1/models`, {
        headers,
        signal: controller.signal,
      });

      const latencyMs = Date.now() - start;
      const models = res.ok ? ((await res.json()) as Record<string, unknown>)["data"] : null;

      return {
        success: res.ok,
        statusCode: res.status,
        latencyMs,
        models: Array.isArray(models) ? (models as Array<Record<string, unknown>>).map((m) => m["id"]) : [],
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  vmodels as vmodelsTable,
  vmodelBackends as vmodelBackendsTable,
  vmodelHooks as vmodelHooksTable,
} from "@ai-v-models/core";
import type { AppContext } from "../../context.js";

export async function vmodelsRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  // List all v-models
  app.get("/api/v1/vmodels", async () => {
    const rows = await ctx.db.db.select().from(vmodelsTable).all();
    const result = await Promise.all(
      rows.map(async (vm) => {
        const backends = await ctx.db.db
          .select()
          .from(vmodelBackendsTable)
          .where(eq(vmodelBackendsTable.vmodelId, vm.id))
          .all();
        return { ...vm, backends };
      }),
    );
    return result;
  });

  // Get single v-model
  app.get<{ Params: { id: string } }>("/api/v1/vmodels/:id", async (req, reply) => {
    const vm = await ctx.db.db
      .select()
      .from(vmodelsTable)
      .where(eq(vmodelsTable.id, req.params.id))
      .get();
    if (!vm) return reply.status(404).send({ error: "VModel not found" });

    const backends = await ctx.db.db
      .select()
      .from(vmodelBackendsTable)
      .where(eq(vmodelBackendsTable.vmodelId, vm.id))
      .all();
    return { ...vm, backends };
  });

  // Create v-model
  app.post<{ Body: Record<string, unknown> }>("/api/v1/vmodels", async (req, reply) => {
    const body = req.body;
    const now = Date.now();
    const id = `vmodel-${nanoid(8)}`;

    await ctx.db.db
      .insert(vmodelsTable)
      .values({
        id,
        modelId: body["modelId"] as string,
        displayName: (body["displayName"] as string) ?? (body["modelId"] as string),
        description: body["description"] as string | null ?? null,
        balancingStrategy: (body["balancingStrategy"] as string) ?? "session-pin",
        streaming: (body["streaming"] as boolean) ?? true,
        allowToolCalling: (body["allowToolCalling"] as boolean) ?? true,
        allowVision: (body["allowVision"] as boolean) ?? false,
        allowEmbeddings: (body["allowEmbeddings"] as boolean) ?? false,
        enabled: (body["enabled"] as boolean) ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Insert backend mappings
    const backendMappings = body["backends"] as Array<Record<string, unknown>> | undefined;
    if (backendMappings) {
      for (const bm of backendMappings) {
        await ctx.db.db
          .insert(vmodelBackendsTable)
          .values({
            id: `vmb-${nanoid(8)}`,
            vmodelId: id,
            backendId: bm["backendId"] as string,
            backendModelId: bm["backendModelId"] as string,
            weight: (bm["weight"] as number) ?? 1,
            enabled: (bm["enabled"] as boolean) ?? true,
            createdAt: now,
          })
          .run();
      }
    }

    const created = await ctx.db.db
      .select()
      .from(vmodelsTable)
      .where(eq(vmodelsTable.id, id))
      .get();
    const backends = await ctx.db.db
      .select()
      .from(vmodelBackendsTable)
      .where(eq(vmodelBackendsTable.vmodelId, id))
      .all();

    return reply.status(201).send({ ...created, backends });
  });

  // Update v-model
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/api/v1/vmodels/:id",
    async (req, reply) => {
      const vm = await ctx.db.db
        .select()
        .from(vmodelsTable)
        .where(eq(vmodelsTable.id, req.params.id))
        .get();
      if (!vm) return reply.status(404).send({ error: "VModel not found" });

      const updates: Partial<typeof vmodelsTable.$inferInsert> = { updatedAt: Date.now() };
      const body = req.body;

      for (const field of [
        "displayName", "description", "balancingStrategy", "streaming",
        "allowToolCalling", "allowVision", "allowEmbeddings", "enabled",
      ] as const) {
        if (body[field] !== undefined) {
          (updates as Record<string, unknown>)[
            field === "displayName" ? "displayName" :
            field === "balancingStrategy" ? "balancingStrategy" :
            field
          ] = body[field];
        }
      }

      await ctx.db.db
        .update(vmodelsTable)
        .set(updates)
        .where(eq(vmodelsTable.id, req.params.id))
        .run();

      return reply.status(200).send({ success: true });
    },
  );

  // Delete v-model
  app.delete<{ Params: { id: string } }>("/api/v1/vmodels/:id", async (req, reply) => {
    await ctx.db.db
      .delete(vmodelsTable)
      .where(eq(vmodelsTable.id, req.params.id))
      .run();
    return reply.status(204).send();
  });

  // Add backend to v-model
  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/api/v1/vmodels/:id/backends",
    async (req, reply) => {
      const body = req.body;
      const now = Date.now();
      await ctx.db.db
        .insert(vmodelBackendsTable)
        .values({
          id: `vmb-${nanoid(8)}`,
          vmodelId: req.params.id,
          backendId: body["backendId"] as string,
          backendModelId: body["backendModelId"] as string,
          weight: (body["weight"] as number) ?? 1,
          enabled: (body["enabled"] as boolean) ?? true,
          createdAt: now,
        })
        .run();
      return reply.status(201).send({ success: true });
    },
  );

  // Remove backend from v-model
  app.delete<{ Params: { id: string; backendMappingId: string } }>(
    "/api/v1/vmodels/:id/backends/:backendMappingId",
    async (req, reply) => {
      await ctx.db.db
        .delete(vmodelBackendsTable)
        .where(eq(vmodelBackendsTable.id, req.params.backendMappingId))
        .run();
      return reply.status(204).send();
    },
  );
}

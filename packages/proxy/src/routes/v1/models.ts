import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { fetch } from "undici";
import { backends as backendsTable, vmodels as vmodelsTable } from "@ai-v-models/core";
import { decrypt } from "@ai-v-models/core";
import type { AppContext } from "../../context.js";

export async function modelsRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.get("/v1/models", async (req, reply) => {
    const models: Array<{
      id: string;
      object: "model";
      created: number;
      owned_by: string;
      context_length: number | undefined;
    }> = [];

    // Gather backend models
    const allBackends = await ctx.db.db
      .select()
      .from(backendsTable)
      .where(and(eq(backendsTable.enabled, true)))
      .all();

    await Promise.allSettled(
      allBackends.map(async (backend) => {
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (backend.keyMode === "abstraction" && backend.encryptedApiKey) {
            const apiKey = decrypt(backend.encryptedApiKey, ctx.masterKey);
            headers["Authorization"] = `Bearer ${apiKey}`;
          }

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${backend.baseUrl}/v1/models`, {
            headers,
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (!res.ok) return;

          const data = (await res.json()) as { data?: Array<Record<string, unknown>> };
          for (const model of data.data ?? []) {
            const rawId = model["id"] as string;
            // Build namespaced model ID: "modelId:hostName:provider"
            const namespacedId = `${rawId}:${backend.hostName}:${backend.provider}`;
            models.push({
              id: namespacedId,
              object: "model",
              created: (model["created"] as number) ?? Math.floor(Date.now() / 1000),
              owned_by: `${backend.hostName}:${backend.provider}`,
              context_length: model["context_length"] as number | undefined,
            });
          }
        } catch {
          // Backend unavailable — skip it
        }
      }),
    );

    // Add virtual models
    const allVModels = await ctx.db.db
      .select()
      .from(vmodelsTable)
      .where(eq(vmodelsTable.enabled, true))
      .all();

    for (const vm of allVModels) {
      models.push({
        id: vm.modelId,
        object: "model",
        created: Math.floor(vm.createdAt / 1000),
        owned_by: "ai-v-models",
        context_length: undefined,
      });
    }

    return reply.send({
      object: "list",
      data: models,
    });
  });
}

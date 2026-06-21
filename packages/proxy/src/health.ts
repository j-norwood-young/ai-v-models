import { fetch } from "undici";
import type { DbClient } from "@ai-v-models/core";
import { eq } from "drizzle-orm";
import { backends as backendsTable } from "@ai-v-models/core";
import { backendHealthGauge } from "./metrics.js";
import { getLogger } from "./logger.js";

export interface HealthCheckResult {
  backendId: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  error?: string;
}

export async function checkBackendHealth(
  backend: { id: string; baseUrl: string; name: string },
  timeoutMs = 5000,
): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${backend.baseUrl}/v1/models`, {
      signal: controller.signal,
      headers: { "User-Agent": "ai-v-models/healthcheck" },
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - start;
    const status = res.ok ? (latencyMs < 2000 ? "healthy" : "degraded") : "unhealthy";

    return { backendId: backend.id, status, latencyMs };
  } catch (err) {
    return {
      backendId: backend.id,
      status: "unhealthy",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export class HealthMonitor {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DbClient,
    private readonly intervalSecs: number = 30,
    private readonly timeoutMs: number = 5000,
  ) {}

  start(): void {
    this.runChecks();
    this.timer = setInterval(() => this.runChecks(), this.intervalSecs * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runChecks(): Promise<void> {
    const log = getLogger();
    try {
      const allBackends = await this.db.db
        .select()
        .from(backendsTable)
        .where(eq(backendsTable.enabled, true))
        .all();

      const results = await Promise.allSettled(
        allBackends.map((b) =>
          checkBackendHealth({ id: b.id, baseUrl: b.baseUrl, name: b.name }, this.timeoutMs),
        ),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { backendId, status, latencyMs } = result.value;
          const backend = allBackends.find((b) => b.id === backendId);
          if (!backend) continue;

          await this.db.db
            .update(backendsTable)
            .set({
              lastHealthCheck: Date.now(),
              lastHealthStatus: status,
              lastLatencyMs: latencyMs,
              updatedAt: Date.now(),
            })
            .where(eq(backendsTable.id, backendId))
            .run();

          const healthScore = status === "healthy" ? 1 : status === "degraded" ? 0.5 : 0;
          backendHealthGauge.set({ backend: backend.name, provider: backend.provider }, healthScore);

          if (status !== "healthy") {
            log.warn({ backendId, status, latencyMs }, "Backend health check issue");
          }
        }
      }
    } catch (err) {
      log.error({ err }, "Error running health checks");
    }
  }
}

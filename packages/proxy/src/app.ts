import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import type { AppContext } from "./context.js";
import { modelsRoutes } from "./routes/v1/models.js";
import { chatRoutes } from "./routes/v1/chat.js";
import { embeddingsRoutes } from "./routes/v1/embeddings.js";
import { backendsRoutes } from "./routes/api/backends.js";
import { vmodelsRoutes } from "./routes/api/vmodels.js";
import { keysRoutes } from "./routes/api/keys.js";
import { hooksRoutes } from "./routes/api/hooks.js";
import { metricsApiRoutes } from "./routes/api/metrics-api.js";
import { authRoutes } from "./routes/api/auth.js";
import { eventsRoutes } from "./routes/api/events.js";
import { getLogger } from "./logger.js";

export async function createApp(ctx: AppContext) {
  const log = getLogger();

  const app = Fastify({
    logger: false, // We use pino directly
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB
  });

  // CORS
  await app.register(cors, {
    origin: ctx.config.server.corsOrigins,
    credentials: true,
  });

  // Cookies
  await app.register(cookie, {
    secret: ctx.config.security.sessionSecret ?? "avm-change-me-in-production",
  });

  // Rate limiting for login endpoint
  await app.register(rateLimit, {
    global: false,
    max: ctx.config.security.loginRateLimitMaxAttempts,
    timeWindow: ctx.config.security.loginRateLimitWindowSecs * 1000,
    keyGenerator: (req) => req.ip,
  });

  // Request logging hook
  app.addHook("onRequest", async (req) => {
    log.debug({ method: req.method, url: req.url, ip: req.ip }, "Incoming request");
  });

  app.addHook("onResponse", async (req, reply) => {
    log.debug(
      { method: req.method, url: req.url, status: reply.statusCode, elapsed: reply.elapsedTime },
      "Request completed",
    );
  });

  // Health check
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.0.1",
  }));

  // Readiness (checks DB)
  app.get("/ready", async (_req, reply) => {
    try {
      ctx.db.sqlite.prepare("SELECT 1").get();
      return { status: "ready" };
    } catch {
      return reply.status(503).send({ status: "not ready" });
    }
  });

  // Register routes
  await modelsRoutes(app, ctx);
  await chatRoutes(app, ctx);
  await embeddingsRoutes(app, ctx);
  await backendsRoutes(app, ctx);
  await vmodelsRoutes(app, ctx);
  await keysRoutes(app, ctx);
  await hooksRoutes(app, ctx);
  await metricsApiRoutes(app, ctx);
  await authRoutes(app, ctx);
  await eventsRoutes(app, ctx);

  // 404 handler
  app.setNotFoundHandler(async (req, reply) => {
    return reply.status(404).send({
      error: { message: `Route ${req.method} ${req.url} not found`, type: "not_found" },
    });
  });

  // Error handler
  app.setErrorHandler(async (error, req, reply) => {
    log.error({ err: error, url: req.url }, "Unhandled error");
    return reply.status(500).send({
      error: { message: "Internal server error", type: "server_error" },
    });
  });

  return app;
}

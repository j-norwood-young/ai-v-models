import { join } from "node:path";
import {
  loadConfig,
  defaultDataDir,
  ensureDataDir,
  createDbClient,
  getMasterKey,
} from "@ai-v-models/core";
import { createLogger } from "./logger.js";
import { createApp } from "./app.js";
import { KeyAuthenticator } from "./key-auth.js";
import { BackendBalancer } from "./balancer.js";
import { HealthMonitor } from "./health.js";
import { SseEmitter } from "./sse.js";
import { ensureAdminUser } from "./setup.js";
import type { AppContext } from "./context.js";

const config = loadConfig();
const dataDir = config.dataDir ?? defaultDataDir();

ensureDataDir(dataDir);

const log = createLogger(config.log, dataDir);
log.info({ dataDir }, "Starting ai-v-models proxy");

// Database
const dbPath = join(dataDir, "data.db");
const db = createDbClient(dbPath);

// Run embedded migrations
const { runMigrations } = await import("@ai-v-models/core");
try {
  runMigrations(dbPath);
  log.info("Database migrations applied");
} catch (err) {
  log.warn({ err }, "Migration failed (may already be applied)");
}

// Master encryption key
const masterKey = getMasterKey(dataDir);

// Ensure admin user exists
await ensureAdminUser(db);

// Build context
const ctx: AppContext = {
  db,
  config,
  masterKey,
  keyAuth: new KeyAuthenticator(db),
  balancer: new BackendBalancer(),
  sse: new SseEmitter(),
};

// Start health monitor
const healthMonitor = new HealthMonitor(
  db,
  masterKey,
  config.health.checkIntervalSecs,
  config.health.timeoutMs,
);
healthMonitor.start();

// Build and start server
const app = await createApp(ctx);

const { host, port } = config.server;
await app.listen({ host, port });

log.info({ host, port }, `ai-v-models listening on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);

// Graceful shutdown
const shutdown = async (signal: string) => {
  log.info({ signal }, "Shutting down gracefully...");
  healthMonitor.stop();
  await app.close();
  db.sqlite.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

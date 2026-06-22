import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import { config as loadDotenv } from "dotenv";
import { AppConfigSchema, type AppConfig } from "./schema.js";
import { DEV_PORT, PROD_PORT } from "./constants.js";

/** Returns the default data directory: ~/.aivm */
export function defaultDataDir(): string {
  return join(homedir(), ".aivm");
}

/** Ensure the data directory exists with correct structure. */
export function ensureDataDir(dataDir: string): void {
  for (const sub of ["", "logs", "hooks"]) {
    const dir = join(dataDir, sub);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }
}

function envToPartialConfig(): Record<string, unknown> {
  const partial: Record<string, unknown> = {};

  const map: Record<string, string[]> = {
    AIVM_HOST: ["server", "host"],
    AIVM_PORT: ["server", "port"],
    AIVM_TLS_CERT: ["server", "tlsCert"],
    AIVM_TLS_KEY: ["server", "tlsKey"],
    AIVM_CORS_ORIGINS: ["server", "corsOrigins"],
    AIVM_LOG_LEVEL: ["log", "level"],
    AIVM_LOG_FORMAT: ["log", "format"],
    AIVM_LOG_FILE: ["log", "file"],
    AIVM_METRICS_ENABLED: ["metrics", "enabled"],
    AIVM_OTEL_ENDPOINT: ["metrics", "otelEndpoint"],
    AIVM_OTEL_SERVICE_NAME: ["metrics", "otelServiceName"],
    AIVM_HEALTH_CHECK_INTERVAL: ["health", "checkIntervalSecs"],
    AIVM_SESSION_SECRET: ["security", "sessionSecret"],
    AIVM_WEBAUTHN_RP_ID: ["security", "webauthnRpId"],
    AIVM_WEBAUTHN_ORIGINS: ["security", "webauthnOrigins"],
    AIVM_DATA_DIR: ["dataDir"],
  };

  for (const [envKey, path] of Object.entries(map)) {
    const val = process.env[envKey];
    if (val === undefined) continue;
    let node = partial;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i]!;
      if (node[segment] === undefined) node[segment] = {};
      node = node[segment] as Record<string, unknown>;
    }
    node[path[path.length - 1]!] = val;
  }

  return partial;
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, val] of Object.entries(override)) {
    if (val && typeof val === "object" && !Array.isArray(val) && typeof result[key] === "object") {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      );
    } else {
      result[key] = val;
    }
  }
  return result;
}

export interface LoadConfigOptions {
  configFile?: string;
  dotenvFile?: string;
}

/**
 * Load and merge configuration from all sources.
 * Precedence: defaults < config.yaml < env/.env < runtime overrides
 */
export function loadConfig(opts: LoadConfigOptions = {}): AppConfig {
  // 1. Load .env file if present
  const dotenvPath = opts.dotenvFile ?? ".env";
  if (existsSync(dotenvPath)) {
    loadDotenv({ path: dotenvPath });
  }

  // 2. Determine data dir (needed to find default config.yaml)
  const dataDir = process.env["AIVM_DATA_DIR"] ?? defaultDataDir();

  // 3. Load config.yaml
  const configFile = opts.configFile ?? join(dataDir, "config.yaml");
  let fileConfig: Record<string, unknown> = {};
  if (existsSync(configFile)) {
    const raw = readFileSync(configFile, "utf8");
    fileConfig = (yaml.load(raw) as Record<string, unknown>) ?? {};
  }

  // 4. Map env vars to config structure
  const envConfig = envToPartialConfig();

  // Dev mode uses a separate default port so `pnpm dev` and `pnpm start` can run together.
  // Ignore AIVM_PORT when it matches the production default — shared .env files often set
  // AIVM_PORT=4000 for Docker while local dev should still bind to DEV_PORT.
  if (process.env["AIVM_DEV"] === "1") {
    const envPort = process.env["AIVM_PORT"];
    const port =
      envPort === undefined || envPort === String(PROD_PORT) ? DEV_PORT : Number(envPort);
    envConfig["server"] = deepMerge(
      (envConfig["server"] as Record<string, unknown>) ?? {},
      { port },
    );
  }

  // 5. Merge: defaults < file < env
  const merged = deepMerge(deepMerge({}, fileConfig), envConfig);
  merged["dataDir"] = dataDir;

  // 6. Validate with zod (applies defaults)
  const result = AppConfigSchema.safeParse(merged);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return result.data;
}

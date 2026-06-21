import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { getLogger } from "./logger.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function resolveOpenApiSpecPath(): string | null {
  const candidates = [
    join(moduleDir, "openapi.yaml"),
    join(process.cwd(), "packages/proxy/dist/openapi.yaml"),
    join(process.cwd(), "packages/proxy/src/openapi.yaml"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

export async function registerOpenApiDocs(app: FastifyInstance): Promise<boolean> {
  const log = getLogger();
  const specPath = resolveOpenApiSpecPath();

  if (!specPath) {
    log.warn("OpenAPI spec not found — /api/docs will be unavailable");
    return false;
  }

  try {
    const [{ default: swagger }, { default: swaggerUi }] = await Promise.all([
      import("@fastify/swagger"),
      import("@fastify/swagger-ui"),
    ]);

    await app.register(swagger, {
      mode: "static",
      specification: {
        path: specPath,
        baseDir: dirname(specPath),
      },
    });

    await app.register(swaggerUi, {
      routePrefix: "/api/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
      },
    });

    log.info("OpenAPI documentation enabled at /api/docs");
    return true;
  } catch (err) {
    log.warn({ err }, "OpenAPI documentation disabled — failed to register Swagger UI");
    return false;
  }
}

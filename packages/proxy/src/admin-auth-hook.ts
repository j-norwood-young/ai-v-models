import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AppContext } from "./context.js";
import { getAuthUser } from "./auth-session.js";

const PUBLIC_ROUTES = new Set([
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/verify-totp",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/webauthn/login/options",
  "POST /api/v1/auth/webauthn/login/verify",
  "GET /api/v1/auth/webauthn/available",
]);

const PASSWORD_CHANGE_ROUTES = new Set([
  "GET /api/v1/auth/me",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/change-password",
]);

function routeKey(req: FastifyRequest): string {
  return `${req.method} ${req.url.split("?")[0]}`;
}

export function registerAdminAuthHook(app: FastifyInstance, ctx: AppContext): void {
  app.addHook("preHandler", async (req, reply) => {
    const url = req.url.split("?")[0] ?? req.url;
    if (!url.startsWith("/api/v1/")) return;

    const key = routeKey(req);
    if (PUBLIC_ROUTES.has(key)) return;

    const user = await getAuthUser(ctx, req);
    if (!user) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    if (user.mustChangePassword && !PASSWORD_CHANGE_ROUTES.has(key)) {
      return reply.status(403).send({
        error: "Password change required",
        mustChangePassword: true,
      });
    }
  });
}

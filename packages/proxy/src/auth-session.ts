import { eq } from "drizzle-orm";
import type { FastifyRequest, FastifyReply } from "fastify";
import { sessions, users } from "@ai-v-models/core";
import type { AppContext } from "./context.js";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

export async function getSessionUser(
  ctx: AppContext,
  req: FastifyRequest,
): Promise<SessionUser | null> {
  const sessionToken = req.cookies["avm_session"];
  if (!sessionToken) return null;

  const session = await ctx.db.db
    .select()
    .from(sessions)
    .where(eq(sessions.token, sessionToken))
    .get();

  if (!session || session.expiresAt < Date.now()) return null;

  const user = await ctx.db.db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  if (!user || !user.enabled) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
}

export async function requireAuth(
  ctx: AppContext,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<SessionUser | null> {
  const user = await getSessionUser(ctx, req);
  if (!user) {
    reply.status(401).send({ error: "Not authenticated" });
    return null;
  }
  return user;
}

export async function requireAdmin(
  ctx: AppContext,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<SessionUser | null> {
  const user = await requireAuth(ctx, req, reply);
  if (!user) return null;
  if (user.role !== "admin") {
    reply.status(403).send({ error: "Admin access required" });
    return null;
  }
  return user;
}

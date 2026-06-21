import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { users, sessions, auditLog } from "@ai-v-models/core";
import type { AppContext } from "../../context.js";
import { getLogger } from "../../logger.js";

export async function authRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  // Login
  app.post<{ Body: { username: string; password: string } }>("/api/v1/auth/login", async (req, reply) => {
    const log = getLogger();
    const { username, password } = req.body;

    const user = await ctx.db.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user || !user.enabled) {
      log.warn({ username, ip: req.ip }, "Login failed: unknown or disabled user");
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await verify(user.passwordHash, password);
    if (!valid) {
      log.warn({ username, ip: req.ip }, "Login failed: invalid password");
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    // Create session
    const sessionToken = randomBytes(32).toString("hex");
    const sessionId = `sess-${nanoid(12)}`;
    const now = Date.now();
    const expiresAt = now + ctx.config.security.sessionMaxAgeSecs * 1000;

    await ctx.db.db
      .insert(sessions)
      .values({
        id: sessionId,
        userId: user.id,
        token: sessionToken,
        expiresAt,
        createdAt: now,
        userAgent: req.headers["user-agent"] ?? null,
        ipAddress: req.ip,
      })
      .run();

    await ctx.db.db
      .update(users)
      .set({ lastLoginAt: now })
      .where(eq(users.id, user.id))
      .run();

    // Audit log
    await ctx.db.db
      .insert(auditLog)
      .values({
        id: nanoid(),
        userId: user.id,
        username: user.username,
        action: "login",
        resourceType: null,
        resourceId: null,
        detail: null,
        ipAddress: req.ip,
        timestamp: now,
      })
      .run();

    reply.setCookie("avm_session", sessionToken, {
      httpOnly: true,
      secure: req.protocol === "https",
      sameSite: "lax",
      maxAge: ctx.config.security.sessionMaxAgeSecs,
      path: "/",
    });

    log.info({ username: user.username, ip: req.ip }, "User logged in");

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      expiresAt,
    };
  });

  // Logout
  app.post("/api/v1/auth/logout", async (req, reply) => {
    const sessionToken = req.cookies["avm_session"];
    if (sessionToken) {
      await ctx.db.db
        .delete(sessions)
        .where(eq(sessions.token, sessionToken))
        .run();
    }
    reply.clearCookie("avm_session");
    return { success: true };
  });

  // Get current user
  app.get("/api/v1/auth/me", async (req, reply) => {
    const sessionToken = req.cookies["avm_session"];
    if (!sessionToken) return reply.status(401).send({ error: "Not authenticated" });

    const session = await ctx.db.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .get();

    if (!session || session.expiresAt < Date.now()) {
      return reply.status(401).send({ error: "Session expired" });
    }

    const user = await ctx.db.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    if (!user) return reply.status(401).send({ error: "User not found" });

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
  });

  // List users (admin only)
  app.get("/api/v1/users", async () => {
    const rows = await ctx.db.db.select().from(users).all();
    return rows.map((u) => ({ ...u, passwordHash: undefined }));
  });

  // Create user (admin only)
  app.post<{ Body: { username: string; password: string; displayName?: string; role?: string } }>(
    "/api/v1/users",
    async (req, reply) => {
      const { username, password, displayName, role = "viewer" } = req.body;
      const passwordHash = await hash(password);
      const now = Date.now();
      const id = `user-${nanoid(8)}`;

      await ctx.db.db
        .insert(users)
        .values({
          id,
          username,
          displayName: displayName ?? username,
          passwordHash,
          role,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return reply.status(201).send({ id, username, displayName: displayName ?? username, role });
    },
  );

  // Change password
  app.post<{ Params: { id: string }; Body: { password: string } }>(
    "/api/v1/users/:id/password",
    async (req, reply) => {
      const passwordHash = await hash(req.body.password);
      await ctx.db.db
        .update(users)
        .set({ passwordHash, updatedAt: Date.now() })
        .where(eq(users.id, req.params.id))
        .run();
      return { success: true };
    },
  );
}

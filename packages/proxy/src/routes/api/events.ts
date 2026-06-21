import type { FastifyInstance } from "fastify";
import type { AppContext } from "../../context.js";

export async function eventsRoutes(app: FastifyInstance, ctx: AppContext): Promise<void> {
  app.get("/api/v1/events", async (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });

    // Send initial ping
    reply.raw.write(": ping\n\n");

    // Keep-alive ping every 30s
    const pingInterval = setInterval(() => {
      try {
        reply.raw.write(": ping\n\n");
      } catch {
        clearInterval(pingInterval);
      }
    }, 30_000);

    ctx.sse.addClient(reply);

    req.raw.on("close", () => {
      clearInterval(pingInterval);
    });

    // Don't resolve — keep connection open
    return new Promise<void>((resolve) => {
      reply.raw.on("close", resolve);
    });
  });
}

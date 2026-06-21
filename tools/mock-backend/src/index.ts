import { loadConfig } from "./config.js";
import { createMockServer } from "./server.js";

const config = loadConfig();
const app = createMockServer(config);

try {
  const addr = await app.listen({ port: config.port, host: config.host });
  console.log(
    JSON.stringify({
      level: "info",
      msg: "Mock backend started",
      addr,
      provider: config.provider,
      hostName: config.hostName,
      models: config.models.map((m) => m.id),
      fault: config.fault,
    }),
  );
} catch (err) {
  console.error("Failed to start mock backend:", err);
  process.exit(1);
}

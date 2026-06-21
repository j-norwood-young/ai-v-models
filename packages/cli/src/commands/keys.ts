import type { Command } from "commander";
import chalk from "chalk";
import { table } from "table";
import type { ApiClient } from "../api-client.js";

interface ApiKey {
  id: string;
  prefix: string;
  name: string;
  enabled: boolean;
  suspended: boolean;
  expiresAt: number | null;
  rateLimitRpm: number | null;
  tokenBudgetDay: number | null;
  lastUsedAt: number | null;
}

interface CreateKeyResponse {
  id: string;
  key: string;
  prefix: string;
  name: string;
}

export function registerKeyCommands(program: Command, getClient: () => ApiClient): void {
  const cmd = program.command("key").description("Manage API keys");

  cmd
    .command("list")
    .description("List all API keys")
    .action(async () => {
      const client = getClient();
      const keys = await client.get<ApiKey[]>("/api/v1/keys");
      if (keys.length === 0) {
        console.log(chalk.yellow("No API keys."));
        return;
      }
      const data = [
        ["Prefix", "Name", "Enabled", "Suspended", "RPM", "Day Budget", "Last Used"],
        ...keys.map((k) => [
          k.prefix,
          k.name,
          k.enabled ? chalk.green("yes") : chalk.red("no"),
          k.suspended ? chalk.red("yes") : "no",
          k.rateLimitRpm ?? "unlimited",
          k.tokenBudgetDay ?? "unlimited",
          k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never",
        ]),
      ];
      console.log(table(data));
    });

  cmd
    .command("create")
    .description("Create a new API key")
    .requiredOption("--name <name>", "Key name/label")
    .option("--expires-in <days>", "Expiry in days")
    .option("--models <models>", "Allowed v-models (comma-separated, default: all)")
    .option("--backends <backends>", "Allowed pass-through backends by ID (comma-separated, default: all)")
    .option("--rpm <rpm>", "Rate limit requests per minute")
    .option("--day-budget <tokens>", "Daily token budget")
    .option("--no-tools", "Disable tool calling")
    .action(async (opts) => {
      const client = getClient();
      const body: Record<string, unknown> = {
        name: opts.name,
        allowToolCalling: opts.tools !== false,
      };
      if (opts.expiresIn) {
        body["expiresAt"] = Date.now() + parseInt(opts.expiresIn, 10) * 86400 * 1000;
      }
      if (opts.models) {
        body["allowedModels"] = opts.models.split(",").map((m: string) => m.trim());
      }
      if (opts.backends) {
        body["allowedBackends"] = opts.backends.split(",").map((b: string) => b.trim());
      }
      if (opts.rpm) body["rateLimitRpm"] = parseInt(opts.rpm, 10);
      if (opts.dayBudget) body["tokenBudgetDay"] = parseInt(opts.dayBudget, 10);

      const result = await client.post<CreateKeyResponse>("/api/v1/keys", body);
      console.log(chalk.green("API key created:"));
      console.log(chalk.bold(`  Key: ${result.key}`));
      console.log(`  ID:  ${result.id}`);
      console.log(chalk.yellow("  ⚠ Save this key now — it won't be shown again!"));
    });

  cmd
    .command("suspend <prefix>")
    .description("Suspend an API key")
    .option("--reason <reason>", "Suspension reason")
    .action(async (prefix, opts) => {
      const client = getClient();
      const keys = await client.get<ApiKey[]>("/api/v1/keys");
      const key = keys.find((k) => k.prefix === prefix || k.id === prefix);
      if (!key) {
        console.error(chalk.red(`Key '${prefix}' not found`));
        process.exit(1);
      }
      await client.post(`/api/v1/keys/${key.id}/suspend`, { reason: opts.reason });
      console.log(chalk.yellow(`Key '${key.name}' suspended`));
    });

  cmd
    .command("resume <prefix>")
    .description("Resume a suspended API key")
    .action(async (prefix) => {
      const client = getClient();
      const keys = await client.get<ApiKey[]>("/api/v1/keys");
      const key = keys.find((k) => k.prefix === prefix || k.id === prefix);
      if (!key) {
        console.error(chalk.red(`Key '${prefix}' not found`));
        process.exit(1);
      }
      await client.post(`/api/v1/keys/${key.id}/resume`);
      console.log(chalk.green(`Key '${key.name}' resumed`));
    });

  cmd
    .command("delete <prefix>")
    .description("Delete an API key")
    .action(async (prefix) => {
      const client = getClient();
      const keys = await client.get<ApiKey[]>("/api/v1/keys");
      const key = keys.find((k) => k.prefix === prefix || k.id === prefix);
      if (!key) {
        console.error(chalk.red(`Key '${prefix}' not found`));
        process.exit(1);
      }
      await client.delete(`/api/v1/keys/${key.id}`);
      console.log(chalk.green(`Key '${key.name}' deleted`));
    });

  cmd
    .command("logs <prefix>")
    .description("Show request logs for a key")
    .option("--limit <n>", "Number of log entries", "20")
    .action(async (prefix, opts) => {
      const client = getClient();
      const keys = await client.get<ApiKey[]>("/api/v1/keys");
      const key = keys.find((k) => k.prefix === prefix || k.id === prefix);
      if (!key) {
        console.error(chalk.red(`Key '${prefix}' not found`));
        process.exit(1);
      }
      const logs = await client.get<Array<Record<string, unknown>>>(
        `/api/v1/keys/${key.id}/logs?limit=${opts.limit}`,
      );
      if (logs.length === 0) {
        console.log(chalk.yellow("No logs found."));
        return;
      }
      const data = [
        ["Time", "Endpoint", "Status", "Tokens", "Duration", "TPS"],
        ...logs.map((l) => [
          new Date(l["timestamp"] as number).toLocaleString(),
          l["endpoint"] as string,
          l["statusCode"] as number,
          l["totalTokens"] as number,
          `${l["durationMs"]}ms`,
          l["tps"] ? `${(l["tps"] as number).toFixed(1)}` : "-",
        ]),
      ];
      console.log(table(data));
    });
}

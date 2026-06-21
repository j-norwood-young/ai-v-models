#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { createApiClient, type ApiClient } from "./api-client.js";
import { registerBackendCommands } from "./commands/backends.js";
import { registerVModelCommands } from "./commands/vmodels.js";
import { registerKeyCommands } from "./commands/keys.js";
import { registerHookCommands } from "./commands/hooks.js";
import { registerUserCommands } from "./commands/users.js";
import { registerAdminTokenCommands } from "./commands/admin-tokens.js";

const program = new Command();

program
  .name("aivm")
  .description("AiVM CLI — manage your LLM reverse proxy")
  .version("0.0.1")
  .option("-u, --url <url>", "Proxy URL", process.env["AIVM_URL"] ?? process.env["AVM_URL"] ?? "http://localhost:4000")
  .option("-t, --token <token>", "Admin API token", process.env["AIVM_ADMIN_TOKEN"] ?? process.env["AVM_ADMIN_TOKEN"]);

program.hook("preSubcommand", (thisCmd) => {
  const opts = thisCmd.opts() as { url: string; token?: string };
  const client = createApiClient(opts.url);
  if (opts.token) client["opts"].token = opts.token;
  thisCmd.setOptionValue("client", client);
});

// Status / health
program
  .command("status")
  .description("Show proxy status")
  .action(async () => {
    const opts = program.opts() as { url: string };
    try {
      const res = await fetch(`${opts.url}/health`);
      const data = await res.json() as Record<string, unknown>;
      console.log(chalk.green("✓ Proxy is running"));
      console.log(`  URL:     ${opts.url}`);
      console.log(`  Status:  ${data["status"]}`);
      console.log(`  Version: ${data["version"]}`);
      console.log(`  Time:    ${data["timestamp"]}`);
    } catch {
      console.error(chalk.red("✗ Proxy is not reachable at"), opts.url);
      process.exit(1);
    }
  });

// Register sub-command groups
const getClient = () => {
  const opts = program.opts() as { url: string; token?: string };
  const client = createApiClient(opts.url);
  return client;
};

registerBackendCommands(program, getClient);
registerVModelCommands(program, getClient);
registerKeyCommands(program, getClient);
registerHookCommands(program, getClient);
registerUserCommands(program);
registerAdminTokenCommands(program, getClient);

// Config command
program
  .command("config")
  .description("Show current configuration")
  .action(async () => {
    const opts = program.opts() as { url: string };
    console.log(chalk.bold("ai-v-models configuration"));
    console.log(`  Proxy URL: ${opts.url}`);
    console.log(`  Token:     ${process.env["AVM_ADMIN_TOKEN"] ? "set" : "not set"}`);
  });

program.parse();

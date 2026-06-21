import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import * as esbuild from "esbuild";
import type { PluginManifest } from "@ai-v-models/plugin-sdk";
import { getLogger } from "../logger.js";

const _require = createRequire(import.meta.url);

export interface InstallResult {
  bundlePath: string;
  manifest: PluginManifest;
  configSchema: Record<string, unknown> | null;
  needsResponseBuffer: boolean;
  version: string | null;
}

/**
 * Install a plugin and produce a single-file bundle for isolated-vm execution.
 *
 * Source formats:
 *   "npm:<pkg>"             e.g. "npm:@my-org/my-plugin"
 *   "npm:<pkg>@<version>"
 *   "github:<owner>/<repo>"
 *   "local:<path>"          absolute or cwd-relative filesystem path
 */
export async function installPlugin(
  source: string,
  pluginsDir: string,
  pluginId: string,
): Promise<InstallResult> {
  const log = getLogger();
  const pluginDir = join(pluginsDir, pluginId);
  mkdirSync(pluginDir, { recursive: true });

  let packageDir: string;
  let pkgJson: Record<string, unknown>;

  if (source.startsWith("local:")) {
    packageDir = resolve(source.slice("local:".length));
    pkgJson = readPkgJson(packageDir);
  } else {
    // npm or github — install into a temp sandbox, then read the package
    const installSpec = source.startsWith("npm:")
      ? source.slice("npm:".length)
      : `github:${source.slice("github:".length)}`;

    const tmpInstallDir = join(tmpdir(), `avm-plugin-install-${pluginId}`);
    mkdirSync(tmpInstallDir, { recursive: true });

    // Create a minimal package.json for the install sandbox
    const sandboxPkg = JSON.stringify({ name: "avm-install-sandbox", type: "module", private: true });
    require("node:fs").writeFileSync(join(tmpInstallDir, "package.json"), sandboxPkg);

    log.info({ source, installSpec }, "Installing plugin package");
    execSync(`npm install --prefix "${tmpInstallDir}" "${installSpec}" --save false --ignore-scripts`, {
      stdio: "pipe",
      timeout: 120_000,
    });

    // Resolve the package directory from the installed node_modules
    // Strip version suffix to get just the package name
    const pkgName = installSpec.replace(/@[^@/]+$/, "") || installSpec;
    packageDir = join(tmpInstallDir, "node_modules", pkgName);
    pkgJson = readPkgJson(packageDir);
  }

  // Read and validate the "avm-plugin" manifest from package.json
  const avmPlugin = pkgJson["avm-plugin"] as Partial<PluginManifest> | undefined;
  if (!avmPlugin) {
    throw new Error(
      `Package missing "avm-plugin" key in package.json. Is this an ai-v-models plugin? See docs for the required manifest format.`,
    );
  }

  const rawDesc = avmPlugin.description ?? (pkgJson["description"] as string | undefined);
  const manifest: PluginManifest = {
    name: (avmPlugin.name ?? pkgJson["name"] ?? "unknown") as string,
    ...(rawDesc !== undefined ? { description: rawDesc } : {}),
    version: (avmPlugin.version ?? pkgJson["version"] ?? "0.0.0") as string,
    ...(avmPlugin.configSchema !== undefined ? { configSchema: avmPlugin.configSchema } : {}),
    needsResponseBuffer: avmPlugin.needsResponseBuffer ?? false,
    hooks: avmPlugin.hooks ?? [],
  };

  // Find the main entry point for bundling
  const mainField = (pkgJson["module"] ?? pkgJson["main"] ?? "index.js") as string;
  const mainEntry = join(packageDir, mainField);

  // Bundle into a single IIFE for isolated-vm
  const bundlePath = join(pluginDir, "bundle.js");
  log.info({ source, mainEntry, bundlePath }, "Bundling plugin");

  await esbuild.build({
    entryPoints: [mainEntry],
    bundle: true,
    platform: "neutral",
    format: "iife",
    globalName: "__avmPlugin",
    outfile: bundlePath,
    define: { "process.env.NODE_ENV": '"production"' },
    // After the IIFE, expose the default export as __avmPluginDef
    footer: {
      js: [
        "if (typeof __avmPlugin !== 'undefined') {",
        "  globalThis.__avmPluginDef = __avmPlugin && __avmPlugin.default ? __avmPlugin.default : __avmPlugin;",
        "}",
      ].join("\n"),
    },
    logLevel: "silent",
  });

  log.info({ source, bundlePath }, "Plugin installed and bundled successfully");

  return {
    bundlePath,
    manifest,
    configSchema: avmPlugin.configSchema ? (avmPlugin.configSchema as Record<string, unknown>) : null,
    needsResponseBuffer: manifest.needsResponseBuffer ?? false,
    version: manifest.version ?? null,
  };
}

function readPkgJson(dir: string): Record<string, unknown> {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }
  return JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function require(module: string): any {
  return _require(module);
}

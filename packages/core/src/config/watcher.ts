import chokidar from "chokidar";
import { EventEmitter } from "node:events";
import { loadConfig, type LoadConfigOptions } from "./loader.js";
import type { AppConfig } from "./schema.js";

export class ConfigWatcher extends EventEmitter {
  private currentConfig: AppConfig;
  private watcher: ReturnType<typeof chokidar.watch> | null = null;

  constructor(
    private readonly opts: LoadConfigOptions = {},
  ) {
    super();
    this.currentConfig = loadConfig(opts);
  }

  get config(): AppConfig {
    return this.currentConfig;
  }

  watch(configFilePath: string): void {
    this.watcher = chokidar.watch(configFilePath, { ignoreInitial: true });
    this.watcher.on("change", () => {
      try {
        const newConfig = loadConfig(this.opts);
        this.currentConfig = newConfig;
        this.emit("change", newConfig);
      } catch (err) {
        this.emit("error", err);
      }
    });
  }

  async close(): Promise<void> {
    await this.watcher?.close();
    this.watcher = null;
  }
}

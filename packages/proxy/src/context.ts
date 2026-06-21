import type { DbClient } from "@ai-v-models/core";
import type { AppConfig } from "@ai-v-models/core";
import type { KeyAuthenticator } from "./key-auth.js";
import type { BackendBalancer } from "./balancer.js";
import type { SseEmitter } from "./sse.js";
import type { PluginRuntime } from "./plugins/runtime.js";

export interface AppContext {
  db: DbClient;
  config: AppConfig;
  masterKey: Buffer;
  keyAuth: KeyAuthenticator;
  balancer: BackendBalancer;
  sse: SseEmitter;
  pluginRuntime: PluginRuntime;
  /** Absolute path to the plugins data directory */
  pluginsDir: string;
}

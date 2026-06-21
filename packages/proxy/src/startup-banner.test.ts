import { describe, expect, it, afterEach } from "vitest";
import type { AppConfig } from "@ai-v-models/core";
import { resolvePublicBaseUrl, resolveWebUiUrl } from "./startup-banner.js";

const config = {
  server: { host: "0.0.0.0", port: 4000 },
} as AppConfig;

describe("resolvePublicBaseUrl", () => {
  const original = process.env["AIVM_URL"];

  afterEach(() => {
    if (original === undefined) delete process.env["AIVM_URL"];
    else process.env["AIVM_URL"] = original;
  });

  it("uses AIVM_URL when set", () => {
    process.env["AIVM_URL"] = "http://localhost:4001/";
    expect(resolvePublicBaseUrl(config)).toBe("http://localhost:4001");
  });

  it("falls back to localhost and bind port", () => {
    delete process.env["AIVM_URL"];
    expect(resolvePublicBaseUrl(config)).toBe("http://localhost:4000");
  });
});

describe("resolveWebUiUrl", () => {
  const original = process.env["AIVM_WEB_URL"];

  afterEach(() => {
    if (original === undefined) delete process.env["AIVM_WEB_URL"];
    else process.env["AIVM_WEB_URL"] = original;
  });

  it("uses AIVM_WEB_URL when set", () => {
    process.env["AIVM_WEB_URL"] = "http://localhost:5174";
    expect(resolveWebUiUrl("http://localhost:4001")).toBe("http://localhost:5174");
  });

  it("falls back to base URL", () => {
    delete process.env["AIVM_WEB_URL"];
    expect(resolveWebUiUrl("http://localhost:4001")).toBe("http://localhost:4001");
  });
});

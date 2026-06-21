import { describe, expect, it } from "vitest";
import { buildJsonRequestInit, hasJsonRequestBody } from "./client.js";

describe("hasJsonRequestBody", () => {
  it("returns false for null, undefined, and empty string", () => {
    expect(hasJsonRequestBody(null)).toBe(false);
    expect(hasJsonRequestBody(undefined)).toBe(false);
    expect(hasJsonRequestBody("")).toBe(false);
  });

  it("returns true for non-empty strings and objects", () => {
    expect(hasJsonRequestBody("{}")).toBe(true);
    expect(hasJsonRequestBody({ a: 1 })).toBe(true);
  });
});

describe("buildJsonRequestInit", () => {
  it("does not set Content-Type for body-less POST", () => {
    const init = buildJsonRequestInit("POST", {});
    const headers = new Headers(init.headers);
    expect(headers.has("Content-Type")).toBe(false);
    expect(init.body).toBeUndefined();
  });

  it("sets Content-Type when body is present", () => {
    const init = buildJsonRequestInit("POST", { body: { ok: true } });
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe('{"ok":true}');
  });

  it("does not set Content-Type for empty string body", () => {
    const init = buildJsonRequestInit("POST", { body: "" });
    const headers = new Headers(init.headers);
    expect(headers.has("Content-Type")).toBe(false);
    expect(init.body).toBeUndefined();
  });

  it("preserves explicit Content-Type header", () => {
    const init = buildJsonRequestInit("POST", {
      body: { x: 1 },
      headers: { "Content-Type": "application/vnd.api+json" },
    });
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/vnd.api+json");
  });
});

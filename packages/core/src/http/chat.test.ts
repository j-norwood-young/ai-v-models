import { describe, expect, it } from "vitest";
import { buildAivmPromptCommand, buildChatCompletionUrl } from "./chat.js";

describe("buildChatCompletionUrl", () => {
  it("builds the chat completions endpoint", () => {
    expect(buildChatCompletionUrl("http://localhost:4001/")).toBe(
      "http://localhost:4001/v1/chat/completions",
    );
  });
});

describe("buildAivmPromptCommand", () => {
  it("builds a streaming prompt command", () => {
    expect(
      buildAivmPromptCommand("http://localhost:4001", "aivm-sk-test", "smart-chat"),
    ).toBe(
      [
        "aivm prompt",
        '"Hello!"',
        '-u "http://localhost:4001"',
        '-k "aivm-sk-test"',
        '-m "smart-chat"',
      ].join(" \\\n  "),
    );
  });

  it("includes --no-stream when streaming is disabled", () => {
    expect(
      buildAivmPromptCommand("http://localhost:4001", "aivm-sk-test", "smart-chat", "Hi", false),
    ).toContain("--no-stream");
  });
});

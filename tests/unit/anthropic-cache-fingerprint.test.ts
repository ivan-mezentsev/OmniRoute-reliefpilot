import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CLAUDE_CODE_CLIENT_VERSION } from "../../src/shared/constants/claudeCodeClient.ts";
import { computeFingerprint } from "../../open-sse/services/claudeCodeFingerprint.ts";

describe("Anthropic billing header fingerprint (#1638)", () => {
  it("advertises the current Claude Code client version", () => {
    assert.equal(CLAUDE_CODE_CLIENT_VERSION, "2.1.284");
  });

  it("derives the cc_version suffix from the first user message", () => {
    const text = "Hello, this is a long enough first user message";
    const suffix = computeFingerprint(text, CLAUDE_CODE_CLIENT_VERSION);
    assert.equal(suffix, computeFingerprint(text, "2.1.284"));
    assert.notEqual(suffix, computeFingerprint(text, "2.1.280"));
  });
});

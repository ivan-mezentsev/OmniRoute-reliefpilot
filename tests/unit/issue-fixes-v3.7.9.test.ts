import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Import the translator to test through the public API
import { claudeToOpenAIRequest } from "../../open-sse/translator/request/claude-to-openai.ts";
import { CodexExecutor } from "../../open-sse/executors/codex.ts";

describe("#1914 — normalizeCodexTools: Chat Completions → Responses format", () => {
  test("normalizeCodexTools preserves Responses-format tools (no function wrapper)", () => {
    const executor = new CodexExecutor();
    const tool = {
      type: "function",
      name: "search",
      description: "Search docs",
      strict: false,
      defer_loading: true,
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    };

    const result = executor.transformRequest(
      "gpt-5.4",
      { model: "gpt-5.4", input: [], tools: [tool] },
      false,
      {}
    );

    const tools = result.tools as Array<Record<string, unknown>>;
    assert.equal(tools.length, 1);
    assert.deepStrictEqual(tools[0], tool);
  });

  test("flattens Chat Completions tool and keeps function.strict", () => {
    const executor = new CodexExecutor();
    const result = executor.transformRequest(
      "gpt-5.4",
      {
        model: "gpt-5.4",
        input: [],
        tools: [
          {
            type: "function",
            function: {
              name: "search",
              description: "Search docs",
              strict: false,
              parameters: { type: "object", properties: { query: { type: "string" } } },
            },
          },
          {
            type: "function",
            function: {
              name: "lookup",
              description: "Lookup",
              strict: true,
              parameters: { type: "object", properties: { id: { type: "string" } } },
            },
          },
        ],
      },
      false,
      {}
    );

    const tools = result.tools as Array<Record<string, unknown>>;
    assert.equal(tools.length, 2);
    assert.equal("function" in tools[0], false);
    assert.deepStrictEqual(tools[0], {
      type: "function",
      description: "Search docs",
      parameters: { type: "object", properties: { query: { type: "string" } } },
      strict: false,
      name: "search",
    });
    assert.equal("function" in tools[1], false);
    assert.deepStrictEqual(tools[1], {
      type: "function",
      description: "Lookup",
      parameters: { type: "object", properties: { id: { type: "string" } } },
      strict: true,
      name: "lookup",
    });
  });

  test("invalid function tool without any name should be filtered", () => {
    const executor = new CodexExecutor();
    const result = executor.transformRequest(
      "gpt-5.4",
      {
        model: "gpt-5.4",
        input: [],
        tools: [
          {
            type: "function",
            function: {
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            name: "kept",
            parameters: { type: "object", properties: {} },
          },
        ],
      },
      false,
      {}
    );

    const tools = result.tools as Array<Record<string, unknown>>;
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "kept");
  });
});

describe("#1898 — Zero-argument MCP tool schema normalization", () => {
  test("injects properties:{} for zero-arg tool in claude-to-openai translation", () => {
    const claudeBody = {
      messages: [{ role: "user", content: "hello" }],
      tools: [
        {
          name: "get_time",
          description: "Get current time",
          input_schema: { type: "object" },
        },
      ],
    };

    const result = claudeToOpenAIRequest("gpt-4o", claudeBody, false);

    assert.ok(result.tools, "should have tools");
    assert.equal(result.tools.length, 1);
    const params = result.tools[0].function.parameters;
    assert.equal(params.type, "object");
    assert.deepStrictEqual(params.properties, {}, "should inject empty properties");
  });

  test("preserves existing properties on tool schema", () => {
    const claudeBody = {
      messages: [{ role: "user", content: "hello" }],
      tools: [
        {
          name: "search",
          description: "Search",
          input_schema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
        },
      ],
    };

    const result = claudeToOpenAIRequest("gpt-4o", claudeBody, false);

    const params = result.tools[0].function.parameters;
    assert.equal(params.type, "object");
    assert.ok(params.properties.query, "should preserve existing properties");
    assert.deepStrictEqual(params.required, ["query"]);
  });

  test("handles missing input_schema gracefully", () => {
    const claudeBody = {
      messages: [{ role: "user", content: "hello" }],
      tools: [
        {
          name: "no_schema_tool",
          description: "Tool without schema",
        },
      ],
    };

    const result = claudeToOpenAIRequest("gpt-4o", claudeBody, false);

    const params = result.tools[0].function.parameters;
    assert.equal(params.type, "object");
    assert.deepStrictEqual(params.properties, {}, "should default to empty properties");
  });
});

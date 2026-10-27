import test from "node:test";
import assert from "node:assert/strict";

import { getDefaultPricing } from "../../src/shared/constants/pricing.ts";
import { REGISTRY } from "../../open-sse/config/providerRegistry.ts";
import { IMAGE_PROVIDERS } from "../../open-sse/config/imageRegistry.ts";
import { computeCostFromPricing } from "../../src/lib/usage/costCalculator.ts";

test("T12: pricing table includes MiniMax, GLM, Kimi and gpt-5.4 mini entries", () => {
  const pricing = getDefaultPricing();

  assert.ok(pricing.cx["gpt-5.4"], "missing cx/gpt-5.4");
  assert.ok(pricing.cx["gpt-5.4-mini"], "missing cx/gpt-5.4-mini");

  assert.ok(pricing.minimax["minimax-m2.5"], "missing minimax/minimax-m2.5");
  assert.ok(pricing.minimax["minimax-m2.7"], "missing minimax/minimax-m2.7");
  assert.equal(pricing.minimax["minimax-m2.5"].input, 0.27);
  assert.equal(pricing.minimax["minimax-m2.5"].output, 0.95);

  assert.ok(pricing.glm["glm-4.7"], "missing glm/glm-4.7");
  assert.ok(pricing.glm["glm-5"], "missing glm/glm-5");
  assert.ok(pricing.glmt["glm-4.7"], "missing glmt/glm-4.7");
  assert.ok(pricing.glmt["glm-5"], "missing glmt/glm-5");
  assert.equal(pricing.glm["glm-4.7"].input, 0.6);
  assert.equal(pricing.glm["glm-4.7"].output, 2.2);
  assert.equal(pricing.glmt["glm-4.7"].input, 0.6);
  assert.equal(pricing.glmt["glm-4.7"].output, 2.2);

  assert.ok(pricing.kimi["kimi-k2.5"], "missing kimi/kimi-k2.5");
  assert.ok(pricing.kimi["kimi-k2.5-thinking"], "missing kimi/kimi-k2.5-thinking");
  assert.ok(pricing.kimi["kimi-for-coding"], "missing kimi/kimi-for-coding");

  assert.ok(pricing.cc["claude-opus-5-5"], "missing cc/claude-opus-5-5");
  assert.ok(pricing.gh["claude-opus-5"], "missing gh/claude-opus-5");
  assert.ok(pricing.anthropic["claude-opus-5"], "missing anthropic/claude-opus-5");
  assert.ok(pricing.anthropic["claude-opus-4.8"], "missing anthropic/claude-opus-4.8");
  assert.ok(pricing.anthropic["claude-opus-4-8"], "missing anthropic/claude-opus-4-8");
  assert.ok(pricing.anthropic["claude-opus-4-7"], "missing anthropic/claude-opus-4-7");
  assert.equal(pricing.anthropic["claude-opus-5"].output, 25.0);
});

test("T12: codex catalog adds GPT 6.1 Terra with official capabilities", () => {
  const codexModels = new Map(REGISTRY.codex.models.map((m) => [m.id, m]));
  assert.deepEqual(codexModels.get("gpt-6.1-terra"), {
    id: "gpt-6.1-terra",
    name: "GPT 6.1 Terra",
    targetFormat: "openai-responses",
    toolCalling: true,
    supportsReasoning: true,
    supportsVision: true,
    supportsXHighEffort: true,
    contextLength: 1050000,
    maxOutputTokens: 128000,
  });
  for (const id of [
    "gpt-6-astra",
    "gpt-6.1-sol",
    "gpt-6-luna",
    "gpt-5.6-sol",
    "gpt-5.6-sol-review",
    "gpt-5.6-terra",
    "gpt-5.6-terra-review",
  ]) {
    assert.ok(codexModels.has(id), `missing codex/${id}`);
  }
  assert.deepEqual(IMAGE_PROVIDERS.codex.models, [
    { id: "gpt-6.1-terra", name: "GPT 6.1 Terra (Codex Image)" },
  ]);
});

test("T12: codex removes retired models and all catalog/pricing variations", () => {
  const pricing = getDefaultPricing();
  const isRemoved = (id: string) =>
    /^(?:gpt-?5\.5(?:-|$)|gpt-6-sol(?:-|$)|gpt-5\.6-luna(?:-|$))/.test(id);
  assert.deepEqual(
    REGISTRY.codex.models.filter((model) => isRemoved(model.id)),
    []
  );
  assert.deepEqual(Object.keys(pricing.cx).filter(isRemoved), []);
  assert.ok(pricing.openai["gpt-5.5"], "other providers keep GPT 5.5 pricing");
});

test("T12: codex GPT 6.1 Terra uses official standard and fast pricing", () => {
  const pricing = getDefaultPricing().cx;
  assert.deepEqual(pricing["gpt-6.1-terra"], {
    input: 1,
    output: 5,
    cached: 0.05,
    reasoning: 5,
    cache_creation: 1.25,
  });
  assert.equal(pricing["gpt-5.6-sol"].output, 30);
  assert.equal(pricing["gpt-5.6-terra"].output, 15);
  const tokens = { input: 100000, output: 100000 };
  assert.equal(computeCostFromPricing(pricing["gpt-6.1-terra"], tokens), 0.6);
  assert.equal(
    computeCostFromPricing(pricing["gpt-6.1-terra"], tokens, {
      provider: "codex",
      model: "gpt-6.1-terra",
      serviceTier: "priority",
    }),
    1.2
  );
  assert.equal(
    computeCostFromPricing(pricing["gpt-6.1-terra"], tokens, {
      provider: "cx",
      model: "gpt-6.1-terra",
      serviceTier: "flex",
    }),
    0.3
  );
});

test("T12: minimax default model list starts with M2.7", () => {
  const minimaxModels = REGISTRY.minimax.models.map((m) => m.id);
  const minimaxCnModels = REGISTRY["minimax-cn"].models.map((m) => m.id);

  assert.equal(minimaxModels[0], "MiniMax-M2.7");
  assert.equal(minimaxCnModels[0], "MiniMax-M2.7");
});

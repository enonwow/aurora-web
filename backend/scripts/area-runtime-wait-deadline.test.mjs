import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePostMutationRuntimeWaitDeadline,
  shouldWaitForNewAreaRealTileModelsBeforeScenario
} from "./lib/area-runtime-wait-deadline.mjs";

test("post-mutation settlement honours the requested runtime proof window", () => {
  assert.equal(
    resolvePostMutationRuntimeWaitDeadline({ requestedWaitMs: 300_000, chromeCdpTimeoutMs: 300_000 }),
    300_000
  );
});

test("post-mutation settlement never outlives the CDP transport", () => {
  assert.equal(
    resolvePostMutationRuntimeWaitDeadline({ requestedWaitMs: 600_000, chromeCdpTimeoutMs: 180_000 }),
    180_000
  );
});

test("post-mutation settlement rejects an invalid deadline instead of guessing", () => {
  assert.throws(
    () => resolvePostMutationRuntimeWaitDeadline({ requestedWaitMs: 0, chromeCdpTimeoutMs: 180_000 }),
    /requestedWaitMs/u
  );
});

test("matrix final-state proof skips disposable pre-mutation model warm-up", () => {
  assert.equal(
    shouldWaitForNewAreaRealTileModelsBeforeScenario(
      "tile-add-connect-matrix-local"
    ),
    false
  );
});

test("other local editing proofs retain their pre-mutation visual readiness gate", () => {
  for (const scenario of [
    "tile-transform-local",
    "tile-replace-local",
    "group-placement-local",
    "eraser-local"
  ]) {
    assert.equal(
      shouldWaitForNewAreaRealTileModelsBeforeScenario(scenario),
      true,
      scenario
    );
  }
});

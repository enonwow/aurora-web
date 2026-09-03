#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AURORA_MODULE_PROOF_RUNNER_VERSION,
  buildAuroraModuleProofRunnerPlan,
  validateAuroraModuleProofRunnerConfig,
} from "./lib/aurora-toolset-module-proof-runner-plan.mjs";

const plan = buildAuroraModuleProofRunnerPlan();
assert.equal(AURORA_MODULE_PROOF_RUNNER_VERSION, "1.0.0");
assert.equal(plan.config.hak, "m2a_codex_aproof");
assert.equal(plan.config.appearance, "M2A_M6_PROOF");
assert.equal(plan.config.hardDeadlineMs, 240_000);
assert.deepEqual(
  plan.stages.map((stage) => stage.id),
  [
    "preflight",
    "module-and-area",
    "initial-save",
    "hak",
    "creature",
    "appearance",
    "save-and-readback",
    "visual-proof",
  ],
);
assert.ok(plan.stages.every((stage, index, stages) => index === 0 || stage.deadlineMs > stages[index - 1].deadlineMs));
assert.ok(plan.stages.at(-1).deadlineMs < plan.config.hardDeadlineMs);
assert.ok(plan.invariants.some((item) => item.includes("exact text")));
assert.ok(plan.invariants.some((item) => item.includes("rainbow placeholder")));

assert.throws(
  () => validateAuroraModuleProofRunnerConfig({ ...plan.config, hak: "m2a_codex_aproof.hak" }),
  /without the \.hak extension/u,
);
assert.throws(
  () => validateAuroraModuleProofRunnerConfig({ ...plan.config, hardDeadlineMs: 240_001 }),
  /must not exceed 240000/u,
);
assert.throws(
  () => validateAuroraModuleProofRunnerConfig({ ...plan.config, module: "contains spaces" }),
  /Aurora resref/u,
);

const implementationFiles = [
  "create-aurora-toolset-module-and-area-no-global-input.mjs",
  "attach-aurora-toolset-module-hak-no-global-input.mjs",
  "commit-aurora-toolset-creature-properties-no-global-input.mjs",
  "select-aurora-toolset-dialog-combo-item-timeout-validated.mjs",
  "run-aurora-toolset-module-proof.mjs",
];
for (const file of implementationFiles) {
  const source = readFileSync(resolve("backend/scripts", file), "utf8");
  assert.doesNotMatch(
    source,
    /SendKeys|SetCursorPos|mouse_event|keybd_event|WM_CHAR|0x0102/iu,
    `${file} contains a forbidden global-input or synchronous character transport`,
  );
}
const runnerSource = readFileSync(
  resolve("backend/scripts/run-aurora-toolset-module-proof.mjs"),
  "utf8",
);
assert.match(runnerSource, /options\.live \?\? "false"/u);
assert.match(runnerSource, /hard_deadline_exceeded/u);
assert.match(runnerSource, /module_destination_already_exists/u);
assert.doesNotMatch(runnerSource, /capture-aurora-toolset-frame-no-global-input/u);
assert.match(runnerSource, /aurora-toolset-viewport-proof\.mjs/u);
assert.match(runnerSource, /validated TScrollBox/u);

console.log(
  JSON.stringify(
    {
      ok: true,
      version: plan.version,
      stageCount: plan.stages.length,
      hardDeadlineMs: plan.config.hardDeadlineMs,
      finalProofDeadlineMs: plan.stages.at(-1).deadlineMs,
      implementationFilesChecked: implementationFiles.length,
    },
    null,
    2,
  ),
);

#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "aurora-module-proof-runner-"));
const manifestPath = join(dir, "manifest.json");

try {
  const stdout = execFileSync(
    process.execPath,
    [
      resolve("backend/scripts/run-aurora-toolset-module-proof.mjs"),
      "--live",
      "false",
      "--module",
      "contract_proof",
      "--area",
      "proof_area",
      "--out",
      manifestPath,
      "--artifactDir",
      dir,
    ],
    { encoding: "utf8", windowsHide: true, timeout: 10_000 },
  );
  const result = JSON.parse(stdout.trim());
  const saved = JSON.parse(readFileSync(manifestPath, "utf8"));

  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.liveMutationPerformed, false);
  assert.equal(result.plan.config.module, "contract_proof");
  assert.equal(result.plan.config.hak, "m2a_codex_aproof");
  assert.equal(result.plan.config.appearance, "M2A_M6_PROOF");
  assert.deepEqual(saved, result);
  assert.ok(result.commands.some((command) => command.stage === "module-and-area"));
  assert.ok(result.commands.some((command) => command.exactHak === "m2a_codex_aproof"));
  assert.ok(result.commands.some((command) => command.exactAppearance === "M2A_M6_PROOF"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: result.mode,
        stages: result.plan.stages.map((stage) => stage.id),
        manifestRoundTrip: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}

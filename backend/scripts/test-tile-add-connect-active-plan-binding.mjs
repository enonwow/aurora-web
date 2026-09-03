#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildActiveMatrixChildArguments } from "./aurora-tile-add-connect-active-plan.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDirectory, "..");
const repoRoot = path.resolve(backendRoot, "..");
const bindingPath = path.join(
  backendRoot,
  "docs",
  "aurora-reverse",
  "proof-profiles",
  "tile-add-connect-active-plan.json",
);
const activeRunnerPath = path.join(
  scriptDirectory,
  "aurora-tile-add-connect-active-plan.mjs",
);
const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));
const activeDirectory = path.resolve(repoRoot, binding.planDirectory);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(backendRoot, "package.json"), "utf8"),
);
const matrixSource = fs.readFileSync(
  path.join(scriptDirectory, "aurora-tile-add-connect-matrix.mjs"),
  "utf8",
);
const activeRunnerSource = fs.readFileSync(activeRunnerPath, "utf8");
const manifestPath = path.join(activeDirectory, "manifest.json");
const checkpointPath = path.join(activeDirectory, "checkpoint.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
const manifestSha256 = createHash("sha256")
  .update(fs.readFileSync(manifestPath))
  .digest("hex");

assert.equal(binding.schema, "aurora-tile-add-connect-active-plan-binding/v1");
assert.match(binding.planId, /^[a-f0-9]{64}$/u);
assert.equal(path.isAbsolute(binding.planDirectory), false);
assert.equal(
  activeDirectory.startsWith(`${path.join(repoRoot, "output", "proof")}${path.sep}`),
  true,
);
assert.equal(manifestSha256, binding.planId);
assert.equal(checkpoint.planId, binding.planId);
assert.equal(checkpoint.manifestSha256, binding.planId);
assert.equal(path.resolve(checkpoint.planDirectory), activeDirectory);
assert.equal(
  manifest.runtimeBuildBinding?.profile?.profileId,
  binding.runtimeBuildProfile.profileId,
);
assert.equal(
  manifest.runtimeBuildBinding?.profile?.sha256,
  binding.runtimeBuildProfile.sha256,
);
assert.equal(
  path.resolve(manifest.runtimeBuildBinding?.profile?.path),
  path.resolve(repoRoot, binding.runtimeBuildProfile.path),
);
assert.equal(checkpoint.capturedChunkIds?.length, checkpoint.nextChunkIndex);
assert.equal(
  checkpoint.acceptedVisualReviews?.length,
  checkpoint.nextChunkIndex,
);

assert.doesNotMatch(matrixSource, /const DEFAULT_OUT_DIRECTORY/u);
assert.match(matrixSource, /MATRIX_OUT_DIRECTORY_REQUIRED/u);
assert.match(activeRunnerSource, /tile-add-connect-active-plan\.json/u);
assert.match(activeRunnerSource, /ACTIVE_MATRIX_CALLER_BINDING_OVERRIDE_FORBIDDEN/u);

const directStatusArguments = buildActiveMatrixChildArguments(
  "status",
  {
    planDirectory: activeDirectory,
    planId: binding.planId,
  },
  [],
);
assert.equal(directStatusArguments.at(-1), "--verify-runtime-source");

const overrideAttemptArguments = buildActiveMatrixChildArguments(
  "status",
  {
    planDirectory: activeDirectory,
    planId: binding.planId,
  },
  ["--verify-runtime-source=false"],
);
assert.deepEqual(overrideAttemptArguments.slice(-2), [
  "--verify-runtime-source=false",
  "--verify-runtime-source",
]);

for (const [scriptName, commandName] of [
  ["tiles:matrix-status", "status"],
  ["tiles:matrix-next", "next"],
  ["tiles:matrix-capture", "capture"],
]) {
  const command = packageJson.scripts?.[scriptName];
  assert.equal(typeof command, "string", `${scriptName} must exist`);
  assert.equal(
    command,
    `node scripts/aurora-tile-add-connect-active-plan.mjs ${commandName} --verify-runtime-source`,
  );
  assert.doesNotMatch(command, /--out-directory|--plan-id/u);
  assert.match(command, /--verify-runtime-source/u);
}

process.stdout.write(
  `${JSON.stringify({
    status: "passed",
    schema: "aurora-tile-add-connect-active-plan-binding-test/v1",
    bindingPath,
    activeDirectory,
    planId: binding.planId,
    nextChunkIndex: checkpoint.nextChunkIndex,
    lastAcceptedChunkId: checkpoint.capturedChunkIds.at(-1) ?? null,
  })}\n`,
);

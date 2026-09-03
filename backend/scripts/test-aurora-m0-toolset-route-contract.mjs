#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createToolsetSession, markModuleReady, recordStartupLoadSignal } from "./lib/aurora-toolset-session-state.mjs";
import { persistM0CaptureFailure } from "./lib/aurora-toolset-m0-route-state.mjs";

const session = resolve("backend/scripts/aurora-toolset-session.mjs");
const packetValidator = resolve("backend/scripts/validate-aurora-m0-toolset-packet.mjs");
const artifactDir = mkdtempSync(join(tmpdir(), "aurora-m0-toolset-route-"));

try {
  const dryRun = runJson([session, "m0-dry-run", "--profile", "m0-static-rigid-v5", "--outDir", artifactDir]);
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.route.capture.targetClass, "TScrollBox");
  assert.equal(dryRun.route.artifactDestination, artifactDir);
  assert.equal(dryRun.route.proofReadiness, "failed");
  assert.equal(dryRun.route.geometryBlockerCode, "area_geometry_invalid");
  assert.deepEqual(dryRun.route.queue, [{
    resref: "m2a_m0proof_area",
    name: "Meshy2Aurora M0 static runtime proof area",
  }]);

  const missingDestination = spawnSync(process.execPath, [session, "m0-dry-run", "--profile", "m0-static-rigid-v5"], { encoding: "utf8" });
  assert.equal(missingDestination.status, 2);
  assert.equal(JSON.parse(missingDestination.stdout).blockerCode, "M0_ARTIFACT_DESTINATION_REQUIRED");

  const overriddenArea = spawnSync(process.execPath, [session, "m0-dry-run", "--profile", "m0-static-rigid-v5", "--outDir", artifactDir, "--area", "wrong_area"], { encoding: "utf8" });
  assert.equal(overriddenArea.status, 2);
  assert.equal(JSON.parse(overriddenArea.stdout).blockerCode, "IMMUTABLE_TOOLSET_PROFILE_OVERRIDE");

  const reconciliationManifest = join(artifactDir, "manifest.json");
  writeFileSync(reconciliationManifest, JSON.stringify({ version: "toolset-area-oracle-queue/v1", status: "completed", expectedModule: "m2a_m0_proof.mod", items: [{ area: { resref: "m2a_m0proof_area", name: "Meshy2Aurora M0 static runtime proof area" }, status: "opened" }] }));
  let reconciliationState = createToolsetSession({ modulePath: dryRun.route.modulePath, moduleSha256: dryRun.route.moduleSha256, queuePath: resolve("backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5-toolset-queue.json"), areaCount: 1 });
  reconciliationState = recordStartupLoadSignal(reconciliationState, { owner: "external", kind: "module_frame" });
  reconciliationState = markModuleReady(reconciliationState, { windowTitle: "m2a_m0_proof.mod" });
  writeFileSync(join(artifactDir, "session-state.json"), JSON.stringify(reconciliationState));
  const captureEvidencePath = join(artifactDir, "capture-failure-evidence.json");
  writeFileSync(captureEvidencePath, JSON.stringify({ source: "canonical-runner", capturedError: "toolset_viewport_scene_pixels_unavailable: physicalFallback=validated_viewport_but_uniform_pixels" }));
  const reconciliationPlan = runJson([session, "m0-reconcile-capture-failure", "--profile", "m0-static-rigid-v5", "--outDir", artifactDir, "--captureError", "toolset_viewport_scene_pixels_unavailable: physicalFallback=validated_viewport_but_uniform_pixels", "--captureEvidence", captureEvidencePath, "--dryRun", "true"]);
  assert.equal(reconciliationPlan.ok, true);
  assert.equal(reconciliationPlan.command, "m0-reconcile-capture-failure");
  assert.equal(reconciliationPlan.wouldWrite.state.phase, "area_ready");
  assert.equal(reconciliationPlan.wouldWrite.state.laneFailures.at(-1).lane, "m0_tscrollbox_capture");
  const missingCaptureError = spawnSync(process.execPath, [session, "m0-reconcile-capture-failure", "--profile", "m0-static-rigid-v5", "--outDir", artifactDir, "--dryRun", "true"], { encoding: "utf8" });
  assert.equal(missingCaptureError.status, 2);
  assert.equal(JSON.parse(missingCaptureError.stdout).blockerCode, "M0_CAPTURE_ERROR_REQUIRED");

  let state = createToolsetSession({ modulePath: "m2a_m0_proof.mod", moduleSha256: "hash", queuePath: "m0-queue.json", areaCount: 1 });
  state = recordStartupLoadSignal(state, { owner: "external", kind: "module_frame" });
  state = markModuleReady(state, { windowTitle: "m2a_m0_proof.mod" });
  const captureFailure = persistM0CaptureFailure({
    state,
    artifactDir,
    profileId: "m0-static-rigid-v5",
    modulePath: "m2a_m0_proof.mod",
    moduleSha256: "hash",
    resref: "m2a_m0proof_area",
    name: "Meshy2Aurora M0 static runtime proof area",
    queueManifestPath: join(artifactDir, "manifest.json"),
    viewportPath: join(artifactDir, "viewport.png"),
    viewportResultPath: join(artifactDir, "viewport.json"),
    captureError: { message: "toolset_viewport_scene_pixels_unavailable: physicalFallback=validated_viewport_but_uniform_pixels" },
  });
  state = captureFailure.state;
  assert.equal(state.phase, "area_ready");
  assert.equal(state.currentArea.resref, "m2a_m0proof_area");
  assert.equal(state.laneFailures.at(-1).lane, "m0_tscrollbox_capture");
  assert.match(state.laneFailures.at(-1).details.captureError.message, /toolset_viewport_scene_pixels_unavailable/);
  const durableBlocker = JSON.parse(readFileSync(captureFailure.blockerPath, "utf8"));
  assert.equal(durableBlocker.status, "failed");
  assert.equal(durableBlocker.area.resref, "m2a_m0proof_area");
  assert.match(durableBlocker.captureError.message, /toolset_viewport_scene_pixels_unavailable/);

  const capturePath = join(artifactDir, "viewport.png");
  const captureResultPath = join(artifactDir, "viewport.json");
  const queueManifestPath = join(artifactDir, "queue-manifest.json");
  writeFileSync(capturePath, "m0 viewport");
  writeFileSync(captureResultPath, JSON.stringify({ ok: true, status: "verified", safety: { usesGlobalCursor: false, usesGlobalKeyboard: false, usesGlobalMouse: false, method: "read-only capture of validated TScrollBox viewport" } }));
  writeFileSync(queueManifestPath, JSON.stringify({ version: "toolset-area-oracle-queue/v1", status: "completed", expectedModule: "m2a_m0_proof.mod", items: [{ area: { resref: "m2a_m0proof_area", name: "Meshy2Aurora M0 static runtime proof area" }, status: "opened" }] }));
  const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
  const packet = {
    version: "aurora-m0-toolset-packet/v1",
    profileId: "m0-static-rigid-v5",
    moduleSha256: "d63b9b71c421ee07ad678619be92b3f624febfecdcd4b09ebd9fdcaa2e13c753",
    area: "m2a_m0proof_area",
    fixtures: [
      { id: "tortoise", resref: "m2a_m0_tort", appearanceRow: 15108, position: [12, 10] },
      { id: "meshy-m0", resref: "m2a_m0p01", appearanceRow: 15109, position: [16, 10] },
    ],
    artifacts: [
      { kind: "toolset-queue-manifest", path: queueManifestPath, sha256: hash(queueManifestPath) },
      { kind: "toolset-viewport", path: capturePath, sha256: hash(capturePath) },
      { kind: "toolset-viewport-result", path: captureResultPath, sha256: hash(captureResultPath) },
    ],
  };
  const packetPath = join(artifactDir, "m0-toolset-packet.json");
  writeFileSync(packetPath, JSON.stringify(packet));
  assert.equal(runJson([packetValidator, "--packet", packetPath]).status, "verified");
  writeFileSync(queueManifestPath, JSON.stringify({ version: "toolset-area-oracle-queue/v1", status: "completed", expectedModule: "m2a_m0_proof.mod", items: [{ area: { resref: "m2a_m0proof_area", name: "m2a_m0proof_area" }, status: "opened" }] }));
  packet.artifacts.find((artifact) => artifact.kind === "toolset-queue-manifest").sha256 = hash(queueManifestPath);
  writeFileSync(packetPath, JSON.stringify(packet));
  const wrongDisplayName = spawnSync(process.execPath, [packetValidator, "--packet", packetPath], { encoding: "utf8" });
  assert.notEqual(wrongDisplayName.status, 0);
  assert.match(wrongDisplayName.stderr, /toolset_queue_area_display_name_mismatch/);
  writeFileSync(queueManifestPath, JSON.stringify({ version: "toolset-area-oracle-queue/v1", status: "completed", expectedModule: "m2a_m0_proof.mod", items: [{ area: { resref: "m2a_m0proof_area", name: "Meshy2Aurora M0 static runtime proof area" }, status: "opened" }] }));
  packet.artifacts.find((artifact) => artifact.kind === "toolset-queue-manifest").sha256 = hash(queueManifestPath);
  writeFileSync(captureResultPath, JSON.stringify({ ok: true, status: "verified", safety: { usesGlobalCursor: true, usesGlobalKeyboard: false, usesGlobalMouse: false, method: "read-only capture of validated TScrollBox viewport" } }));
  packet.artifacts.find((artifact) => artifact.kind === "toolset-viewport-result").sha256 = hash(captureResultPath);
  writeFileSync(packetPath, JSON.stringify(packet));
  const unsafeCapture = spawnSync(process.execPath, [packetValidator, "--packet", packetPath], { encoding: "utf8" });
  assert.notEqual(unsafeCapture.status, 0);
  assert.match(unsafeCapture.stderr, /toolset_viewport_safety_usesGlobalCursor/);
} finally {
  rmSync(artifactDir, { recursive: true, force: true });
}

function runJson(args) {
  return JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" }));
}

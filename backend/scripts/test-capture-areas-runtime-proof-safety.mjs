#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const runtimeCapture = readFileSync(
  resolve(repoRoot, "backend/scripts/capture-areas-runtime-cdp.mjs"),
  "utf8"
);
const retailLauncher = readFileSync(
  resolve(repoRoot, "backend/scripts/capture-area-lighting-retail-oracle-window.ps1"),
  "utf8"
);
const retailMaxLightsLauncher = readFileSync(
  resolve(repoRoot, "backend/scripts/capture-area-lighting-retail-max-light-variants.mjs"),
  "utf8"
);
const vfxRetailLauncher = readFileSync(
  resolve(repoRoot, "backend/scripts/capture_all_vfx_clips.py"),
  "utf8"
);
const toolsetOpener = readFileSync(
  resolve(repoRoot, "backend/scripts/open-last-city-module-and-area-toolset-no-global-input.mjs"),
  "utf8"
);
const toolsetSession = readFileSync(
  resolve(repoRoot, "backend/scripts/aurora-toolset-session.mjs"),
  "utf8"
);

assert.doesNotMatch(runtimeCapture, /captureVisibleCanvasFallback/);
assert.doesNotMatch(runtimeCapture, /if \(allowPartialEvidence && lastStatus\)/);
assert.match(runtimeCapture, /Unsupported options: \$\{unsupportedProofOptions\.join/);
assert.match(runtimeCapture, /models_or_textures_not_fully_settled/);
assert.match(runtimeCapture, /nonSettledTextureCount/);
assert.match(retailLauncher, /This retail proof launcher is retired/);
assert.match(retailMaxLightsLauncher, /This retail max-light proof launcher is retired/);
assert.match(vfxRetailLauncher, /This VFX retail capture launcher is retired/);
assert.match(toolsetOpener, /toolset_primary_display_target_rejected/);
assert.match(toolsetOpener, /toolset_unsafe_override_rejected/);
assert.match(toolsetOpener, /TOOLSET_APPROVED_PROOF_WINDOW_LEFT/);
assert.match(toolsetOpener, /isApprovedToolsetProofWindowLeft/);
assert.match(toolsetOpener, /window_position_would_be_staged/);
assert.match(toolsetSession, /proofWindowLeft: TOOLSET_APPROVED_PROOF_WINDOW_LEFT/);
assert.doesNotMatch(toolsetSession, /allowRepeatedAccessViolationFamily/);

console.log("area runtime proof safety contract: PASS");

#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const artifactRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-concept-parity"
);
const defaultPlanPath = resolve(
  artifactRoot,
  "next-visual-candidate-plan-20260706",
  "next-visual-candidate-plan-20260706.json"
);

const options = parseArgs(process.argv.slice(2));
const planPath = resolveMaybe(options.plan ?? defaultPlanPath);
const candidateDiffPath = resolveMaybe(options.candidateDiff ?? null);
const outPath = resolveMaybe(
  options.out ??
    (candidateDiffPath
      ? candidateDiffPath.replace(/\.json$/u, ".next-candidate-contract-check.json")
      : planPath.replace(/\.json$/u, ".contract-check.json"))
);

assertFile(planPath, "candidate plan");
const plan = readJson(planPath);
const candidateDiff = candidateDiffPath ? readJson(candidateDiffPath) : null;
const errors = [];
const warnings = [];

if (plan.safety?.launchesToolset !== false) {
  errors.push({
    code: "plan_may_launch_toolset",
    message: "The next-candidate plan must be offline-only."
  });
}
if (plan.safety?.mutatesModule !== false) {
  errors.push({
    code: "plan_may_mutate_module",
    message: "The next-candidate plan must not mutate modules."
  });
}
if (!plan.selectedTile?.tile) {
  errors.push({
    code: "plan_missing_selected_tile",
    message: "The plan must select the visual tile before candidate generation."
  });
}

if (candidateDiff) {
  validateCandidateDiff({ plan, candidateDiff, errors, warnings });
} else {
  warnings.push({
    code: "candidate_diff_not_supplied",
    message: "Validated the plan only. Supply --candidateDiff to check a generated module delta."
  });
}

const report = {
  version: "last-city-next-candidate-contract-check/v1",
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? "passed" : "failed",
  planPath,
  candidateDiffPath,
  selectedTile: plan.selectedTile?.tile ?? null,
  allowedLayer: plan.nextCandidateContract?.allowedLayer ?? null,
  errors,
  warnings
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      status: report.status,
      errors: errors.length,
      warnings: warnings.length,
      outPath
    },
    null,
    2
  )
);
if (errors.length > 0) {
  process.exitCode = 2;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function resolveMaybe(value) {
  return value ? resolve(value) : null;
}

function assertFile(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function readJson(path) {
  assertFile(path, basename(path));
  return JSON.parse(readFileSync(path, "utf8"));
}

function validateCandidateDiff({ plan, candidateDiff, errors, warnings }) {
  const delta = candidateDiff.delta ?? {};
  const selectedTile = plan.selectedTile?.tile;
  const rejectIfMixedWith = new Set(plan.nextCandidateContract?.rejectIfMixedWith ?? []);
  const blockedTokens = new Set((plan.nextCandidateContract?.blockedTokens ?? []).map(normalizeToken));
  const changedCount =
    Number(delta.addedCount ?? 0) +
    Number(delta.removedCount ?? 0) +
    Number(delta.visualTransformChangedCount ?? 0);

  if (changedCount === 0) {
    warnings.push({
      code: "candidate_has_no_delta",
      message: "Candidate diff has no placeable or VisualTransform changes."
    });
  }
  if (changedCount > 2) {
    errors.push({
      code: "candidate_not_single_delta",
      message: `Candidate has ${changedCount} changed objects; next pass must be one isolated delta.`
    });
  }
  if (Number(delta.visualTransformChangedCount ?? 0) > 0 && hasAny(rejectIfMixedWith, ["new_visual_transform", "vt_growth_bundle"])) {
    errors.push({
      code: "visual_transform_change_rejected",
      message: "Plan rejects VisualTransform growth/bundles for the next candidate."
    });
  }

  for (const [label, byTile] of [
    ["added", delta.addedByTile],
    ["removed", delta.removedByTile],
    ["visualTransformChanged", delta.visualTransformChangedByTile]
  ]) {
    for (const tile of Object.keys(byTile ?? {})) {
      if (selectedTile && tile !== selectedTile) {
        errors.push({
          code: "candidate_changes_wrong_tile",
          message: `${label} change touches ${tile}, but plan selected ${selectedTile}.`
        });
      }
    }
  }

  if (Number(candidateDiff.after?.riskyOverlayCount ?? 0) > Number(candidateDiff.before?.riskyOverlayCount ?? 0)) {
    errors.push({
      code: "candidate_increases_risky_overlays",
      message: "Candidate increases risky overlay count."
    });
  }
  if (
    Number(candidateDiff.after?.nonMotifFloorOverlayCount ?? 0) >
    Number(candidateDiff.before?.nonMotifFloorOverlayCount ?? 0)
  ) {
    errors.push({
      code: "candidate_increases_non_motif_floor_overlays",
      message: "Candidate increases non-motif floor overlays."
    });
  }

  const sampleText = JSON.stringify([
    ...(delta.addedSamples ?? []),
    ...(delta.removedSamples ?? []),
    ...(delta.visualTransformChangedSamples ?? [])
  ]).toLowerCase();
  for (const token of blockedTokens) {
    if (token && sampleText.includes(token)) {
      errors.push({
        code: "candidate_matches_blocked_token",
        message: `Candidate diff references blocked token ${token}.`
      });
    }
  }
}

function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

function hasAny(set, values) {
  return values.some((value) => set.has(value));
}

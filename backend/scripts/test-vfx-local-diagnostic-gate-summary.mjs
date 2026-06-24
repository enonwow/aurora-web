#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const backendRoot = path.join(repoRoot, "backend");
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-local-diagnostic-gate-summary-regression.json"
);

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);

const gate = spawnSync(
  "node",
  ["scripts/run-vfx-local-diagnostic-gate.mjs", "--out", outPath],
  {
    cwd: backendRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  }
);

if (gate.status !== 0) {
  process.stderr.write(gate.stderr ?? "");
  process.stdout.write(gate.stdout ?? "");
  throw new Error(`local diagnostic gate failed with exit code ${gate.status ?? "unknown"}`);
}

const report = readJson(outPath);
const contractEvidencePath = path.resolve(repoRoot, report.artifacts?.contractVisualEvidence ?? "");
const catalogPreviewGuardrailsPath = path.resolve(repoRoot, report.artifacts?.catalogPreviewGuardrails ?? "");
const contractEvidence = readJson(contractEvidencePath);
const catalogPreviewGuardrails = readJson(catalogPreviewGuardrailsPath);
const checks = [];

checks.push(["result passed", report.result === "local-diagnostic-gate-passed"]);
checks.push(["canonical promotion blocked", report.canonicalParityPromoted === false]);
checks.push(["local-only marker present", report.localOnlyNotRetailEvidence === true]);
checks.push([
  "visual artifact missing count surfaced",
  report.summary?.contractVisualEvidenceVisualArtifactMissingCount ===
    contractEvidence.visualArtifactMissingCount
]);
checks.push([
  "visual artifact mismatch count surfaced",
  report.summary?.contractVisualEvidenceVisualArtifactMismatchCount ===
    contractEvidence.visualArtifactMismatchCount
]);
checks.push([
  "render-contract hash mismatch count surfaced",
  report.summary?.contractVisualEvidenceRenderContractHashMismatchCount ===
    contractEvidence.renderContractHashMismatchCount
]);
checks.push([
  "semantic requirement count surfaced",
  report.summary?.contractVisualEvidenceSemanticRequirementCount ===
    contractEvidence.semanticRequirementCount
]);
checks.push([
  "semantic failed count surfaced",
  report.summary?.contractVisualEvidenceSemanticRequirementFailedCount ===
    contractEvidence.semanticRequirementFailedCount
]);
checks.push([
  "requirements-applied count surfaced",
  report.summary?.contractVisualEvidenceRequirementsAppliedCount ===
    contractEvidence.requirementsAppliedCount
]);
checks.push([
  "visual semantic oracle missing count surfaced",
  report.summary?.contractVisualEvidenceVisualSemanticOracleMissingCount ===
    contractEvidence.visualSemanticOracleMissingCount
]);
checks.push([
  "visual semantic check count surfaced",
  report.summary?.contractVisualEvidenceVisualSemanticCheckCount ===
    contractEvidence.visualSemanticCheckCount
]);
checks.push([
  "visual semantic failed count surfaced",
  report.summary?.contractVisualEvidenceVisualSemanticCheckFailedCount ===
    contractEvidence.visualSemanticCheckFailedCount
]);
checks.push([
  "human review missing count surfaced",
  report.summary?.contractVisualEvidenceHumanReviewNeededMissingCount ===
    contractEvidence.humanReviewNeededMissingCount
]);
checks.push([
  "semantic requirements are nonempty",
  Number(report.summary?.contractVisualEvidenceSemanticRequirementCount ?? 0) > 0
]);
checks.push([
  "visual semantic checks are nonempty",
  Number(report.summary?.contractVisualEvidenceVisualSemanticCheckCount ?? 0) > 0
]);
checks.push([
  "visual semantic oracles are present for all fixtures",
  report.summary?.contractVisualEvidenceVisualSemanticOracleMissingCount === 0
]);
checks.push([
  "visual semantic checks all pass",
  report.summary?.contractVisualEvidenceVisualSemanticCheckFailedCount === 0
]);
checks.push([
  "human review gaps are recorded for all fixtures",
  report.summary?.contractVisualEvidenceHumanReviewNeededMissingCount === 0
]);
checks.push([
  "semantic requirements are applied to all fixtures",
  report.summary?.contractVisualEvidenceRequirementsAppliedCount ===
    report.summary?.contractVisualEvidenceFixtureCount
]);
checks.push([
  "semantic failures contribute no hidden aggregate failure",
  report.summary?.contractVisualEvidenceSemanticRequirementFailedCount === 0 &&
    report.summary?.nestedFailedCheckCount === 0
]);
checks.push([
  "catalog preview guardrails result surfaced",
  report.summary?.catalogPreviewGuardrailsResult === catalogPreviewGuardrails.result
]);
checks.push([
  "catalog preview guardrails failed count surfaced",
  report.summary?.catalogPreviewGuardrailsFailedCheckCount === catalogPreviewGuardrails.failedCheckCount
]);
checks.push([
  "catalog preview guardrails pass",
  report.summary?.catalogPreviewGuardrailsResult === "catalog-preview-guardrails-passed"
]);
checks.push([
  "catalog preview grid-excluding pixels exceed threshold",
  Number(report.summary?.catalogPreviewGuardrailsObjectPixelsWithoutGrid ?? 0) >=
    Number(report.summary?.catalogPreviewGuardrailsObjectPixelThreshold ?? 1)
]);
checks.push([
  "catalog preview source-mdl payload ready surfaced",
  report.summary?.catalogPreviewGuardrailsSourceMdlPayloadReady === true
]);
checks.push([
  "catalog preview local-only marker surfaced",
  report.summary?.catalogPreviewGuardrailsLocalOnlyNotCanonical === true
]);

const failedChecks = checks.filter(([, passed]) => !passed).map(([name]) => name);
const result = {
  version: "aurora-vfx-local-diagnostic-gate-summary-regression/v1",
  generatedAt: new Date().toISOString(),
  report: toRepoPath(outPath),
  contractVisualEvidence: toRepoPath(contractEvidencePath),
  catalogPreviewGuardrails: toRepoPath(catalogPreviewGuardrailsPath),
  result: failedChecks.length === 0 ? "local-diagnostic-gate-summary-passed" : "local-diagnostic-gate-summary-failed",
  failedChecks,
  summary: {
    commandCount: report.summary?.commandCount ?? null,
    canonicalPromotionAttemptCount: report.summary?.canonicalPromotionAttemptCount ?? null,
    nestedFailedCheckCount: report.summary?.nestedFailedCheckCount ?? null,
    contractVisualEvidenceFixtureCount: report.summary?.contractVisualEvidenceFixtureCount ?? null,
    contractVisualEvidenceVisualArtifactMissingCount:
      report.summary?.contractVisualEvidenceVisualArtifactMissingCount ?? null,
    contractVisualEvidenceVisualArtifactMismatchCount:
      report.summary?.contractVisualEvidenceVisualArtifactMismatchCount ?? null,
    contractVisualEvidenceRenderContractHashMismatchCount:
      report.summary?.contractVisualEvidenceRenderContractHashMismatchCount ?? null,
    contractVisualEvidenceSemanticRequirementCount:
      report.summary?.contractVisualEvidenceSemanticRequirementCount ?? null,
    contractVisualEvidenceSemanticRequirementFailedCount:
      report.summary?.contractVisualEvidenceSemanticRequirementFailedCount ?? null,
    contractVisualEvidenceVisualSemanticOracleMissingCount:
      report.summary?.contractVisualEvidenceVisualSemanticOracleMissingCount ?? null,
    contractVisualEvidenceVisualSemanticCheckCount:
      report.summary?.contractVisualEvidenceVisualSemanticCheckCount ?? null,
    contractVisualEvidenceVisualSemanticCheckFailedCount:
      report.summary?.contractVisualEvidenceVisualSemanticCheckFailedCount ?? null,
    contractVisualEvidenceHumanReviewNeededMissingCount:
      report.summary?.contractVisualEvidenceHumanReviewNeededMissingCount ?? null,
    contractVisualEvidenceRequirementsAppliedCount:
      report.summary?.contractVisualEvidenceRequirementsAppliedCount ?? null,
    catalogPreviewGuardrailsResult: report.summary?.catalogPreviewGuardrailsResult ?? null,
    catalogPreviewGuardrailsFailedCheckCount:
      report.summary?.catalogPreviewGuardrailsFailedCheckCount ?? null,
    catalogPreviewGuardrailsObjectPixelsWithoutGrid:
      report.summary?.catalogPreviewGuardrailsObjectPixelsWithoutGrid ?? null,
    catalogPreviewGuardrailsObjectPixelThreshold:
      report.summary?.catalogPreviewGuardrailsObjectPixelThreshold ?? null
  },
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  notes: [
    "This regression check validates aggregate local diagnostic summary wiring only.",
    "Passing this check cannot promote canonical retail parity."
  ]
};

const resultPath = outPath.replace(/\.json$/, ".summary-regression.json");
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ result: result.result, report: toRepoPath(resultPath), summary: result.summary }, null, 2));

if (failedChecks.length > 0) {
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/test-vfx-local-diagnostic-gate-summary.mjs [--out path]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

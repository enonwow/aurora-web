#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDeterministicPlanDigest,
  resolveVfxGateArtifacts,
  validateVfxArtifactFile,
  validateVfxArtifactProducerRegistry
} from "./lib/vfx-artifact-producer-registry.mjs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRepoRoot = path.resolve(backendRoot, "..");
const args = parseArgs(process.argv.slice(2));
const repoRoot = path.resolve(args["repo-root"] ?? defaultRepoRoot);
const registryPath = path.resolve(
  repoRoot,
  args.registry ??
    path.join(repoRoot, "backend/docs/aurora-reverse/vfx-artifact-producer-registry-v1.json")
);
const gateId = args.gate ?? "vfx-runtime-health-retail-blocker-crosscheck";
const execute = args.execute === "true";

const registryValidation = validateVfxArtifactProducerRegistry({ registryPath, repoRoot });
if (!registryValidation.valid) {
  finish({
    version: "aurora-vfx-control-plane-bootstrap/v1",
    mode: execute ? "execute" : "dry-run",
    gateId,
    status: "blocked_invalid_registry",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    registryErrors: registryValidation.errors,
    actions: []
  });
} else {
  const resolution = resolveVfxGateArtifacts({ registry: registryValidation.registry, gateId });
  if (!resolution.ok) {
    finish({
      version: "aurora-vfx-control-plane-bootstrap/v1",
      mode: execute ? "execute" : "dry-run",
      gateId,
      status: "blocked_unknown_gate",
      canonicalParityPromoted: false,
      localOnlyNotRetailEvidence: true,
      registryErrors: [{ code: resolution.code, artifactId: null, detail: gateId }],
      actions: []
    });
  } else {
    const actions = [];
    const usable = new Set();
    let blocked = false;
    for (const artifact of resolution.artifacts) {
      const artifactPath = path.resolve(repoRoot, artifact.outputPath);
      const validation = validateVfxArtifactFile({ artifact, artifactPath, repoRoot });
      if (validation.valid) {
        usable.add(artifact.artifactId);
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "validated",
          diagnosticCode: null,
          bytes: validation.bytes,
          sha256: validation.sha256,
          sourceClass: artifact.sourceClass
        });
        continue;
      }
      if (validation.code !== "artifact_missing") {
        blocked = true;
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "blocked_invalid_artifact",
          diagnosticCode: validation.code,
          sourceClass: artifact.sourceClass
        });
        if (execute) break;
        continue;
      }
      const missingInputs = artifact.inputs.filter((inputId) => !usable.has(inputId));
      if (missingInputs.length > 0) {
        blocked = true;
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "blocked_dependency",
          diagnosticCode: "artifact_dependency_unavailable",
          missingInputs,
          sourceClass: artifact.sourceClass
        });
        if (execute) break;
        continue;
      }
      if (artifact.producer.kind === "tracked-repository-input") {
        blocked = true;
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "blocked_missing_tracked_input",
          diagnosticCode: "artifact_missing",
          sourceClass: artifact.sourceClass
        });
        if (execute) break;
        continue;
      }
      if (artifact.producer.kind === "external-ingestion") {
        blocked = true;
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "blocked_external_ingestion",
          diagnosticCode: "external_ingestion_required",
          resumeCondition: artifact.producer.resumeCondition,
          sourceClass: artifact.sourceClass
        });
        if (execute) break;
        continue;
      }
      if (!execute) {
        blocked = true;
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "would_produce",
          diagnosticCode: "producer_not_executed_in_dry_run",
          command: artifact.producer.command,
          sourceClass: artifact.sourceClass
        });
        continue;
      }
      const produced = spawnSync(artifact.producer.command, {
        cwd: repoRoot,
        encoding: "utf8",
        shell: true
      });
      if (produced.status !== 0) {
        blocked = true;
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "blocked_producer_failed",
          diagnosticCode: "producer_exit_nonzero",
          producerExitCode: produced.status,
          sourceClass: artifact.sourceClass
        });
        break;
      }
      const producedValidation = validateVfxArtifactFile({ artifact, artifactPath, repoRoot });
      if (!producedValidation.valid) {
        blocked = true;
        actions.push({
          artifactId: artifact.artifactId,
          outputPath: artifact.outputPath,
          action: "blocked_producer_output_invalid",
          diagnosticCode:
            producedValidation.code === "artifact_missing"
              ? "producer_output_missing"
              : producedValidation.code,
          producerExitCode: produced.status,
          sourceClass: artifact.sourceClass
        });
        break;
      }
      usable.add(artifact.artifactId);
      actions.push({
        artifactId: artifact.artifactId,
        outputPath: artifact.outputPath,
        action: "produced_and_validated",
        diagnosticCode: null,
        bytes: producedValidation.bytes,
        sha256: producedValidation.sha256,
        sourceClass: artifact.sourceClass
      });
    }
    finish({
      version: "aurora-vfx-control-plane-bootstrap/v1",
      mode: execute ? "execute" : "dry-run",
      gateId,
      status: blocked ? "blocked" : "complete",
      canonicalParityPromoted: false,
      localOnlyNotRetailEvidence: true,
      registryErrors: [],
      actions
    });
  }
}

function finish(report) {
  const digestInput = {
    version: report.version,
    mode: report.mode,
    gateId: report.gateId,
    status: report.status,
    registryErrors: report.registryErrors,
    actions: report.actions
  };
  const output = {
    ...report,
    planDigest: createDeterministicPlanDigest(digestInput)
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (report.status !== "complete") process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) continue;
    if (key === "--execute") {
      parsed.execute = "true";
      continue;
    }
    parsed[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}

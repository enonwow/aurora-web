import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VFX_ARTIFACT_PRODUCER_REGISTRY_VERSION =
  "aurora-vfx-artifact-producer-registry/v1";
export const VFX_ARTIFACT_PRODUCER_REGISTRY_VALIDATION_VERSION =
  "aurora-vfx-artifact-producer-registry-validation/v1";

const PRODUCER_KINDS = new Set([
  "repository-command",
  "tracked-repository-input",
  "external-ingestion"
]);
const VALIDATION_FORMATS = new Set(["json", "jsonl", "markdown"]);

export function validateVfxArtifactProducerRegistry({ registryPath, repoRoot }) {
  const errors = [];
  let registry = null;
  const registryFile = inspectRegularFile(registryPath);
  if (!registryFile.ok) {
    errors.push({
      code: registryFile.code === "artifact_missing"
        ? "registry_file_missing"
        : "registry_file_not_regular",
      artifactId: null,
      detail: portablePath(repoRoot, registryPath)
    });
    return buildValidationResult(null, errors);
  }

  try {
    registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch {
    errors.push({
      code: "registry_json_malformed",
      artifactId: null,
      detail: portablePath(repoRoot, registryPath)
    });
    return buildValidationResult(null, errors);
  }

  if (!isRecord(registry)) {
    errors.push({ code: "registry_root_invalid", artifactId: null, detail: null });
    return buildValidationResult(null, errors);
  }
  if (registry.version !== VFX_ARTIFACT_PRODUCER_REGISTRY_VERSION) {
    errors.push({
      code: "registry_version_invalid",
      artifactId: null,
      detail: String(registry.version ?? "missing")
    });
  }

  const artifacts = Array.isArray(registry.artifacts) ? registry.artifacts : [];
  if (artifacts.length === 0) {
    errors.push({ code: "registry_artifacts_empty", artifactId: null, detail: null });
  }
  const artifactById = new Map();
  const artifactIdCounts = new Map();
  const outputPathCounts = new Map();

  for (const candidate of artifacts) {
    if (!isRecord(candidate)) {
      errors.push({ code: "registry_artifact_invalid", artifactId: null, detail: null });
      continue;
    }
    const artifactId = readNonEmptyString(candidate.artifactId);
    const outputPath = readNonEmptyString(candidate.outputPath);
    if (!artifactId) {
      errors.push({ code: "registry_artifact_id_missing", artifactId: null, detail: null });
      continue;
    }
    artifactIdCounts.set(artifactId, (artifactIdCounts.get(artifactId) ?? 0) + 1);
    if (!artifactById.has(artifactId)) artifactById.set(artifactId, candidate);

    if (!readNonEmptyString(candidate.schemaId)) {
      errors.push({ code: "registry_schema_id_missing", artifactId, detail: null });
    }
    if (!outputPath || !isNormalizedRepositoryPath(outputPath)) {
      errors.push({
        code: "registry_output_path_invalid",
        artifactId,
        detail: outputPath
      });
    } else {
      outputPathCounts.set(outputPath, (outputPathCounts.get(outputPath) ?? 0) + 1);
    }
    validateProducer(candidate, artifactId, outputPath, errors);
    validateArtifactPolicy(candidate, artifactId, errors);
  }

  for (const [artifactId, count] of artifactIdCounts) {
    if (count > 1) {
      errors.push({ code: "registry_artifact_id_duplicate", artifactId, detail: String(count) });
    }
  }
  for (const [outputPath, count] of outputPathCounts) {
    if (count > 1) {
      errors.push({
        code: "registry_output_path_duplicate",
        artifactId: null,
        detail: outputPath
      });
    }
  }

  for (const [artifactId, artifact] of artifactById) {
    const inputs = Array.isArray(artifact.inputs) ? artifact.inputs : [];
    if (!Array.isArray(artifact.inputs)) {
      errors.push({ code: "registry_inputs_invalid", artifactId, detail: null });
      continue;
    }
    for (const inputId of inputs) {
      if (typeof inputId !== "string" || !artifactById.has(inputId)) {
        errors.push({
          code: "registry_input_artifact_unknown",
          artifactId,
          detail: String(inputId)
        });
      }
    }
  }

  const gates = isRecord(registry.gates) ? registry.gates : {};
  if (!isRecord(registry.gates)) {
    errors.push({ code: "registry_gates_invalid", artifactId: null, detail: null });
  }
  for (const [gateId, artifactIds] of Object.entries(gates)) {
    if (!gateId.trim() || !Array.isArray(artifactIds) || artifactIds.length === 0) {
      errors.push({ code: "registry_gate_invalid", artifactId: null, detail: gateId });
      continue;
    }
    const seen = new Set();
    for (const artifactId of artifactIds) {
      if (typeof artifactId !== "string" || !artifactById.has(artifactId)) {
        errors.push({
          code: "registry_gate_artifact_unknown",
          artifactId: typeof artifactId === "string" ? artifactId : null,
          detail: gateId
        });
      } else if (seen.has(artifactId)) {
        errors.push({ code: "registry_gate_artifact_duplicate", artifactId, detail: gateId });
      }
      seen.add(artifactId);
    }
  }

  if (hasDependencyCycle(artifactById)) {
    errors.push({ code: "registry_dependency_cycle", artifactId: null, detail: null });
  }

  return buildValidationResult(registry, sortErrors(errors));
}

export function resolveVfxGateArtifacts({ registry, gateId }) {
  const artifactById = new Map(registry.artifacts.map((artifact) => [artifact.artifactId, artifact]));
  const requested = registry.gates[gateId];
  if (!Array.isArray(requested)) {
    return { ok: false, code: "registry_gate_unknown", artifacts: [] };
  }
  const ordered = [];
  const visited = new Set();
  const visit = (artifactId) => {
    if (visited.has(artifactId)) return;
    visited.add(artifactId);
    const artifact = artifactById.get(artifactId);
    for (const inputId of artifact.inputs) visit(inputId);
    ordered.push(artifact);
  };
  for (const artifactId of requested) visit(artifactId);
  return { ok: true, code: null, artifacts: ordered };
}

export function validateVfxArtifactFile({ artifact, artifactPath, repoRoot }) {
  const inspected = inspectRegularFile(artifactPath);
  if (!inspected.ok) {
    return {
      valid: false,
      code: inspected.code,
      path: portablePath(repoRoot, artifactPath),
      bytes: null,
      sha256: null
    };
  }
  const bytes = fs.readFileSync(artifactPath);
  const common = {
    path: portablePath(repoRoot, artifactPath),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
  const text = bytes.toString("utf8");
  const validation = artifact.validation;
  if (validation.format === "markdown") {
    return text.trim()
      ? { valid: true, code: null, ...common }
      : { valid: false, code: "artifact_markdown_empty", ...common };
  }
  if (validation.format === "jsonl") {
    const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
      return { valid: false, code: "artifact_jsonl_empty", ...common };
    }
    for (const line of lines) {
      try {
        JSON.parse(line);
      } catch {
        return { valid: false, code: "artifact_jsonl_malformed", ...common };
      }
    }
    return { valid: true, code: null, ...common };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: false, code: "artifact_json_malformed", ...common };
  }
  if (validation.expectedVersion) {
    const actual = readObjectPath(parsed, validation.versionField ?? "version");
    if (actual !== validation.expectedVersion) {
      if (
        actual === "aurora-vfx-control-gate-prerequisite-blocker/v2" &&
        isRecord(parsed)
      ) {
        return {
          valid: false,
          code: "artifact_upstream_gate_blocked",
          expectedVersion: validation.expectedVersion,
          actualVersion: actual,
          upstreamStatus: readNonEmptyString(parsed.status),
          upstreamGateId: readNonEmptyString(parsed.gateId),
          upstreamBlockers: Array.isArray(parsed.blockers)
            ? parsed.blockers.filter((entry) => typeof entry === "string")
            : [],
          ...common
        };
      }
      return {
        valid: false,
        code: "artifact_schema_version_mismatch",
        expectedVersion: validation.expectedVersion,
        actualVersion: actual ?? null,
        ...common
      };
    }
  }
  return { valid: true, code: null, ...common };
}

export function createDeterministicPlanDigest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function portablePath(repoRoot, filePath) {
  const relative = path.relative(repoRoot, filePath);
  return (relative.startsWith("..") ? filePath : relative).replaceAll("\\", "/");
}

function validateProducer(artifact, artifactId, outputPath, errors) {
  if (!isRecord(artifact.producer) || !PRODUCER_KINDS.has(artifact.producer.kind)) {
    errors.push({ code: "registry_producer_invalid", artifactId, detail: null });
    return;
  }
  const command = readNonEmptyString(artifact.producer.command);
  if (artifact.producer.kind === "repository-command") {
    if (!command) {
      errors.push({ code: "registry_repository_command_missing", artifactId, detail: null });
    } else if (!outputPath || !command.includes(outputPath)) {
      errors.push({
        code: "registry_repository_command_output_mismatch",
        artifactId,
        detail: outputPath
      });
    }
  } else if (command) {
    errors.push({ code: "registry_non_repository_command_forbidden", artifactId, detail: null });
  }
  if (
    artifact.producer.kind === "external-ingestion" &&
    !readNonEmptyString(artifact.producer.resumeCondition)
  ) {
    errors.push({ code: "registry_external_resume_condition_missing", artifactId, detail: null });
  }
}

function validateArtifactPolicy(artifact, artifactId, errors) {
  if (!Array.isArray(artifact.inputs)) {
    errors.push({ code: "registry_inputs_invalid", artifactId, detail: null });
  }
  if (!readNonEmptyString(artifact.sourceClass)) {
    errors.push({ code: "registry_source_class_missing", artifactId, detail: null });
  }
  if (!isRecord(artifact.freshness) || !readNonEmptyString(artifact.freshness.mode)) {
    errors.push({ code: "registry_freshness_invalid", artifactId, detail: null });
  }
  if (!isRecord(artifact.validation) || !VALIDATION_FORMATS.has(artifact.validation.format)) {
    errors.push({ code: "registry_validation_invalid", artifactId, detail: null });
  }
  if (typeof artifact.retailEvidence !== "boolean") {
    errors.push({ code: "registry_retail_evidence_flag_invalid", artifactId, detail: null });
  }
}

function hasDependencyCycle(artifactById) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (artifactId) => {
    if (visiting.has(artifactId)) return true;
    if (visited.has(artifactId)) return false;
    visiting.add(artifactId);
    const artifact = artifactById.get(artifactId);
    for (const inputId of artifact?.inputs ?? []) {
      if (artifactById.has(inputId) && visit(inputId)) return true;
    }
    visiting.delete(artifactId);
    visited.add(artifactId);
    return false;
  };
  return [...artifactById.keys()].some(visit);
}

function inspectRegularFile(filePath) {
  let stats;
  try {
    stats = fs.lstatSync(filePath);
  } catch (error) {
    return {
      ok: false,
      code: error && error.code === "ENOENT" ? "artifact_missing" : "artifact_unreadable"
    };
  }
  return stats.isFile()
    ? { ok: true, code: null }
    : { ok: false, code: "artifact_not_regular_file" };
}

function buildValidationResult(registry, errors) {
  const artifacts = Array.isArray(registry?.artifacts) ? registry.artifacts : [];
  const gates = isRecord(registry?.gates) ? registry.gates : {};
  return {
    version: VFX_ARTIFACT_PRODUCER_REGISTRY_VALIDATION_VERSION,
    valid: errors.length === 0,
    artifactCount: artifacts.length,
    gateCount: Object.keys(gates).length,
    errors,
    registry
  };
}

function sortErrors(errors) {
  return [...errors].sort((left, right) =>
    `${left.code}:${left.artifactId ?? ""}:${left.detail ?? ""}`.localeCompare(
      `${right.code}:${right.artifactId ?? ""}:${right.detail ?? ""}`
    )
  );
}

function isNormalizedRepositoryPath(value) {
  if (value.includes("\\") || path.posix.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value);
  return normalized === value && value !== "." && !value.startsWith("../");
}

function readObjectPath(value, fieldPath) {
  return String(fieldPath)
    .split(".")
    .reduce((current, key) => (isRecord(current) ? current[key] : undefined), value);
}

function readNonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

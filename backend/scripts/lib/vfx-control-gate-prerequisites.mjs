import fs from "node:fs";
import path from "node:path";
import {
  portablePath,
  resolveVfxGateArtifacts,
  validateVfxArtifactFile,
  validateVfxArtifactProducerRegistry
} from "./vfx-artifact-producer-registry.mjs";

const DEFAULT_REGISTRY_RELATIVE_PATH =
  "backend/docs/aurora-reverse/vfx-artifact-producer-registry-v1.json";

/**
 * Stops a VFX control gate before it dereferences missing, non-regular,
 * malformed, or wrong-schema coordinator/evidence state. The producer
 * registry is the only source for default paths, producers, dependencies,
 * formats, and recovery metadata. CLI overrides retain the same validation.
 */
export function blockVfxControlGateOnMissingPrerequisites({
  repoRoot,
  gateId,
  result,
  outPath,
  pathOverrides = {},
  producerRegistryPath = path.join(repoRoot, DEFAULT_REGISTRY_RELATIVE_PATH)
}) {
  const registryValidation = validateVfxArtifactProducerRegistry({
    registryPath: producerRegistryPath,
    repoRoot
  });
  if (!registryValidation.valid) {
    writeBlocker({
      repoRoot,
      outPath,
      report: createRegistryBlocker({
        repoRoot,
        producerRegistryPath,
        gateId,
        result,
        status: "blocked_invalid_producer_registry",
        errors: registryValidation.errors,
        blocker: "vfx_control_plane_registry_invalid"
      })
    });
    return true;
  }

  const gateResolution = resolveVfxGateArtifacts({
    registry: registryValidation.registry,
    gateId
  });
  if (!gateResolution.ok) {
    writeBlocker({
      repoRoot,
      outPath,
      report: createRegistryBlocker({
        repoRoot,
        producerRegistryPath,
        gateId,
        result,
        status: "blocked_invalid_producer_registry",
        errors: [{ code: gateResolution.code, artifactId: null, detail: gateId }],
        blocker: "vfx_control_plane_gate_unregistered"
      })
    });
    return true;
  }

  const missingPrerequisites = [];
  const invalidPrerequisites = [];
  const presentPrerequisites = [];
  for (const artifact of gateResolution.artifacts) {
    const configuredOverride = pathOverrides[artifact.artifactId];
    const artifactPath = configuredOverride
      ? path.resolve(configuredOverride)
      : path.resolve(repoRoot, artifact.outputPath);
    const validation = validateVfxArtifactFile({ artifact, artifactPath, repoRoot });
    const common = {
      artifactId: artifact.artifactId,
      role: artifact.artifactId,
      path: portablePath(repoRoot, artifactPath),
      registeredPath: artifact.outputPath,
      sourceClass: artifact.sourceClass
    };
    if (validation.valid) {
      presentPrerequisites.push({
        ...common,
        bytes: validation.bytes,
        sha256: validation.sha256
      });
    } else if (
      validation.code === "artifact_missing" ||
      validation.code === "artifact_upstream_gate_blocked"
    ) {
      missingPrerequisites.push({
        ...common,
        diagnosticCode: validation.code,
        upstreamStatus: validation.upstreamStatus ?? null,
        upstreamGateId: validation.upstreamGateId ?? null,
        upstreamBlockers: validation.upstreamBlockers ?? [],
        producerCommand: artifact.producer.command ?? null,
        producerKind: artifact.producer.kind,
        resumeCondition: artifact.producer.resumeCondition ?? null
      });
    } else {
      invalidPrerequisites.push({
        ...common,
        diagnosticCode: validation.code,
        expectedVersion: validation.expectedVersion ?? null,
        actualVersion: validation.actualVersion ?? null,
        producerCommand: artifact.producer.command ?? null,
        producerKind: artifact.producer.kind,
        resumeCondition: artifact.producer.resumeCondition ?? null
      });
    }
  }

  if (missingPrerequisites.length === 0 && invalidPrerequisites.length === 0) {
    return false;
  }

  const blocked = [...missingPrerequisites, ...invalidPrerequisites];
  const artifactsById = new Map(
    registryValidation.registry.artifacts.map((artifact) => [artifact.artifactId, artifact])
  );
  const externalIngestionBlockersById = new Map();
  for (const prerequisite of missingPrerequisites) {
    for (const externalArtifact of findExternalIngestionRoots(
      prerequisite.artifactId,
      artifactsById
    )) {
      externalIngestionBlockersById.set(externalArtifact.artifactId, {
        artifactId: externalArtifact.artifactId,
        path: externalArtifact.outputPath,
        sourceClass: externalArtifact.sourceClass,
        resumeCondition: externalArtifact.producer.resumeCondition
      });
    }
  }
  const externalIngestionBlockers = [...externalIngestionBlockersById.values()].sort(
    (left, right) => left.artifactId.localeCompare(right.artifactId, "en")
  );
  const status =
    invalidPrerequisites.length > 0
      ? "blocked_invalid_or_missing_prerequisites"
      : externalIngestionBlockers.length > 0
        ? "blocked_external_ingestion"
        : "blocked_missing_prerequisites";
  const commands = [
    ...new Set(
      blocked
        .map((entry) => entry.producerCommand)
        .filter((command) => typeof command === "string" && command.length > 0)
    )
  ];
  const report = {
    version: "aurora-vfx-control-gate-prerequisite-blocker/v2",
    generatedAt: new Date().toISOString(),
    gateId,
    result: classifyBlockedResult(result, status),
    status,
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    producerRegistry: portablePath(repoRoot, producerRegistryPath),
    missingPrerequisites,
    invalidPrerequisites,
    presentPrerequisites,
    externalIngestionBlockers,
    recovery: {
      rule:
        "Produce, ingest, or repair every listed prerequisite from its registered authoritative source, then rerun this exact gate. Do not synthesize coordinator, director, or retail evidence content.",
      commands,
      generationOrder: blocked.map((entry, index) => ({
        order: index + 1,
        artifactId: entry.artifactId,
        role: entry.role,
        path: entry.path,
        action:
          entry.producerCommand ??
          entry.resumeCondition ??
          `Restore ${entry.artifactId} from its registered ${entry.sourceClass} source; do not synthesize its contents.`
      }))
    },
    blockers: [
      invalidPrerequisites.length > 0
        ? "vfx_control_gate_prerequisites_invalid"
        : externalIngestionBlockers.length > 0
          ? "vfx_control_gate_external_ingestion_required"
          : "vfx_control_gate_prerequisites_missing",
      "retail_parity_remains_blocked"
    ]
  };
  writeBlocker({ repoRoot, outPath, report });
  return true;
}

function findExternalIngestionRoots(artifactId, artifactsById, visited = new Set()) {
  if (visited.has(artifactId)) return [];
  visited.add(artifactId);
  const artifact = artifactsById.get(artifactId);
  if (!artifact) return [];
  if (artifact.producer.kind === "external-ingestion") return [artifact];
  return artifact.inputs.flatMap((inputId) =>
    findExternalIngestionRoots(inputId, artifactsById, new Set(visited))
  );
}

function classifyBlockedResult(result, status) {
  const suffix = "-blocked-missing-prerequisites";
  if (!result.endsWith(suffix)) return result;
  const prefix = result.slice(0, -suffix.length);
  if (status === "blocked_external_ingestion") {
    return `${prefix}-blocked-external-ingestion`;
  }
  if (status === "blocked_invalid_or_missing_prerequisites") {
    return `${prefix}-blocked-invalid-prerequisites`;
  }
  return result;
}

function createRegistryBlocker({
  repoRoot,
  producerRegistryPath,
  gateId,
  result,
  status,
  errors,
  blocker
}) {
  return {
    version: "aurora-vfx-control-gate-prerequisite-blocker/v2",
    generatedAt: new Date().toISOString(),
    gateId,
    result,
    status,
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    producerRegistry: portablePath(repoRoot, producerRegistryPath),
    producerRegistryErrors: errors,
    missingPrerequisites: [],
    invalidPrerequisites: [],
    presentPrerequisites: [],
    externalIngestionBlockers: [],
    recovery: {
      rule: "Repair and validate the tracked VFX artifact producer registry, then rerun this exact gate.",
      commands: ["npm.cmd run vfx:control-plane:validate"],
      generationOrder: []
    },
    blockers: [blocker, "retail_parity_remains_blocked"]
  };
}

function writeBlocker({ repoRoot, outPath, report }) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(
    JSON.stringify(
      {
        result: report.result,
        report: portablePath(repoRoot, outPath),
        status: report.status,
        missingPrerequisiteCount: report.missingPrerequisites?.length ?? 0,
        invalidPrerequisiteCount: report.invalidPrerequisites?.length ?? 0,
        externalIngestionBlockerCount: report.externalIngestionBlockers?.length ?? 0
      },
      null,
      2
    )
  );
}

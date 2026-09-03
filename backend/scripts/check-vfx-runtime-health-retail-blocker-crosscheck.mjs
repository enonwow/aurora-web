#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blockVfxControlGateOnMissingPrerequisites } from "./lib/vfx-control-gate-prerequisites.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsRoot = path.join(repoRoot, "backend/docs/aurora-reverse");
const guardRoot = path.join(docsRoot, "guard-reports");
const artifactRoot = path.join(docsRoot, "artifacts");
const defaultArtifactDir = path.join(artifactRoot, "vfx-iteration-224");

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(
  repoRoot,
  args.out ?? path.join(defaultArtifactDir, "vfx-runtime-health-retail-blocker-crosscheck.json")
);

const paths = {
  directorJson: path.join(guardRoot, "ai-factory-director-latest.json"),
  directorMd: path.join(guardRoot, "ai-factory-director-latest.md"),
  coordinatorJson: path.join(guardRoot, "vfx-domain-coordinator-latest.json"),
  coordinatorMd: path.join(guardRoot, "vfx-domain-coordinator-latest.md"),
  state: path.join(docsRoot, "vfx-loop-state.json"),
  registry: path.join(docsRoot, "vfx-claim-registry.json"),
  runLog: path.join(docsRoot, "vfx-run-log.jsonl"),
  context: path.join(docsRoot, "vfx-context-pack.md"),
  failedAssumptions: path.join(docsRoot, "vfx-failed-assumptions.md"),
  visualAuditLatest: path.join(guardRoot, "vfx-visual-audit-latest.json"),
  visualAuditBacklog: path.join(guardRoot, "vfx-visual-audit-backlog.json"),
  runtimeClassification: path.join(
    artifactRoot,
    "vfx-iteration-222/vfx-runtime-health-dependency-classification.json"
  ),
  directiveAlignment: path.join(
    artifactRoot,
    "vfx-iteration-223/vfx-worker-directive-completion-alignment-current.json"
  ),
  retailBlockerPacket: path.join(artifactRoot, "vfx-iteration-215/vfx-retail-blocker-packet.json"),
  retailCaptureSetup: path.join(
    artifactRoot,
    "vfx-iteration-217/vfx-retail-capture-setup-validation-packet.json"
  ),
  retailHandoff: path.join(artifactRoot, "vfx-iteration-218/vfx-retail-evidence-handoff-manifest.json")
};

if (
  blockVfxControlGateOnMissingPrerequisites({
    repoRoot,
    gateId: "vfx-runtime-health-retail-blocker-crosscheck",
    result: "runtime-health-retail-blocker-crosscheck-blocked-missing-prerequisites",
    outPath,
    pathOverrides: {
      "ai-factory-director-json": paths.directorJson,
      "ai-factory-director-markdown": paths.directorMd,
      "vfx-domain-coordinator-json": paths.coordinatorJson,
      "vfx-domain-coordinator-markdown": paths.coordinatorMd,
      "vfx-loop-state": paths.state,
      "vfx-claim-registry": paths.registry,
      "vfx-run-log": paths.runLog,
      "vfx-context-pack": paths.context,
      "vfx-failed-assumptions": paths.failedAssumptions,
      "vfx-visual-audit-latest": paths.visualAuditLatest,
      "vfx-visual-audit-backlog": paths.visualAuditBacklog,
      "vfx-runtime-health-dependency-classification": paths.runtimeClassification,
      "vfx-worker-directive-completion-alignment-current": paths.directiveAlignment,
      "vfx-retail-blocker-packet": paths.retailBlockerPacket,
      "vfx-retail-capture-setup-validation": paths.retailCaptureSetup,
      "vfx-retail-evidence-handoff-manifest": paths.retailHandoff
    }
  })
) {
  process.exit(1);
}

const director = readJson(paths.directorJson);
const directorMd = readText(paths.directorMd);
const coordinator = readJson(paths.coordinatorJson);
const coordinatorMd = readText(paths.coordinatorMd);
const state = readJson(paths.state);
const registry = readJson(paths.registry);
const runLogEntries = readJsonl(paths.runLog);
const contextText = readText(paths.context);
const failedText = readText(paths.failedAssumptions);
const visualAuditLatest = readJsonIfPresent(paths.visualAuditLatest);
const visualAuditBacklog = readJsonIfPresent(paths.visualAuditBacklog);
const runtimeClassification = readJson(paths.runtimeClassification);
const directiveAlignment = readJson(paths.directiveAlignment);
const retailBlockerPacket = readJson(paths.retailBlockerPacket);
const retailCaptureSetup = readJson(paths.retailCaptureSetup);
const retailHandoff = readJson(paths.retailHandoff);

const topClaim = registry.claims?.[0] ?? {};
const latestWorkerLog = [...runLogEntries].reverse().find((entry) => entry.type === "worker_iteration_completed") ?? {};
const classificationLanes = runtimeClassification.dependencyClassification ?? [];
const laneById = new Map(classificationLanes.map((lane) => [lane.id, lane]));
const requiredBlockers = [
  "retail_runtime_tick_dumps_missing",
  "retail_render_contract_snapshots_missing",
  "retail_capture_references_missing",
  "retail_comparison_evidence_missing",
  "chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing",
  "retail_zlc_o45_magic_mouth_texture_timing_blend_intensity_framebuffer_oracle_missing"
];
const blockerStrings = flattenStrings([
  state.blockers,
  topClaim.blockers,
  latestWorkerLog.blockers,
  directiveAlignment.blockers,
  runtimeClassification.blockers,
  retailBlockerPacket.prioritizedBlockers,
  retailCaptureSetup.captureSubjects,
  retailHandoff.handoffSubjects,
  contextText,
  failedText
]);
const canonicalParityPromoted =
  state.canonicalParityPromoted === true ||
  topClaim.canonicalParityPromoted === true ||
  latestWorkerLog.canonicalParityPromoted === true ||
  registry.claims?.some((claim) => claim.canonicalParityPromoted === true) === true ||
  runtimeClassification.canonicalParityPromoted === true ||
  directiveAlignment.canonicalParityPromoted === true ||
  retailBlockerPacket.canonicalParityPromoted === true ||
  retailCaptureSetup.canonicalParityPromoted === true ||
  retailHandoff.canonicalParityPromoted === true;

const retailLane = laneById.get("retail-blocker-capture-setup-handoff-packets");
const futureApiLane = laneById.get("future-api-dependent-evidence-handoff-checks");
const catalogLane = laneById.get("catalog-and-dev-route-preview-evidence");
const migrationLane = laneById.get("migration-continuity-guards");
const canonicalLane = laneById.get("retail-canonical-parity-evidence");
const backendHealthStrings = flattenStrings([
  director.infrastructureRuntimeHealthWatch,
  coordinator.backendRuntimeHealthWatch,
  runtimeClassification.backendRuntimeHealthWatch
]);

const visualSemanticChecks = {
  directorJsonRead: Boolean(director.timestamp),
  directorMdRead: directorMd.includes("default_backend_runtime_health_port_3000"),
  coordinatorJsonRead: Boolean(coordinator.generatedAt),
  coordinatorMdRead: coordinatorMd.includes("VFX"),
  durableStateAtIteration223Or224:
    (state.iteration === 223 &&
      state.activeClaim === "vfx-dev-current-worker-directive-completion-alignment-guard-after-runtime-health") ||
    (state.iteration === 224 &&
      state.activeClaim === "vfx-dev-runtime-health-retail-blocker-crosscheck-guard"),
  registryTopMatchesState:
    topClaim.id === state.activeClaim && topClaim.iteration === state.iteration && topClaim.status === "completed",
  runLogLatestWorkerMatchesState:
    latestWorkerLog.iteration === state.iteration && latestWorkerLog.activeClaim === state.activeClaim,
  contextPackMentionsPriorOrCurrentCheckpoint:
    (contextText.includes("## Iteration 223 Result") &&
      contextText.includes("vfx-dev-current-worker-directive-completion-alignment-guard-after-runtime-health")) ||
    (contextText.includes("## Iteration 224 Result") &&
      contextText.includes("vfx-dev-runtime-health-retail-blocker-crosscheck-guard")),
  failedAssumptionsMentionPriorOrCurrentCheckpoint:
    failedText.includes("vfx-dev-current-worker-directive-completion-alignment-guard-after-runtime-health") ||
    failedText.includes("vfx-dev-runtime-health-retail-blocker-crosscheck-guard"),
  visualAuditSurfacesOptionalAndNonCanonical:
    visualAuditLatest === null ||
    visualAuditBacklog === null ||
    flattenStrings([visualAuditLatest, visualAuditBacklog]).some((value) => value.includes("canonicalPromotionAttemptCount")),
  iteration222RuntimeClassificationPassed:
    runtimeClassification.result === "runtime-health-dependency-classification-passed" &&
    runtimeClassification.summary?.failedCheckCount === 0,
  iteration222RetailPacketLaneDefaultBackendIndependent:
    retailLane?.defaultBackendPort3000Dependency === "none" &&
    retailLane?.evidenceClass === "file_script_local_artifact_only" &&
    retailLane?.canonicalEvidence === false,
  iteration222MigrationLaneDefaultBackendIndependent:
    migrationLane?.defaultBackendPort3000Dependency === "none" &&
    migrationLane?.canonicalEvidence === false,
  iteration222FutureApiFailuresInfrastructure:
    futureApiLane?.failureClassification === "infrastructure_runtime_health_not_vfx_semantic_render_debt" &&
    futureApiLane?.canonicalEvidence === false,
  iteration222CatalogApiFailuresInfrastructure:
    catalogLane?.failureClassification ===
      "infrastructure_runtime_health_when_backend_or_api_unavailable_not_vfx_semantic_render_debt" &&
    catalogLane?.canonicalEvidence === false,
  iteration222RetailCanonicalEvidenceStillMissing:
    canonicalLane?.evidenceClass === "missing_retail_oracle" &&
    canonicalLane?.failureClassification === "missing_retail_evidence_blocks_canonical_parity" &&
    canonicalLane?.canonicalEvidence === false,
  iteration223AlignmentPassed:
    directiveAlignment.result === "worker-directive-completion-alignment-passed" &&
    directiveAlignment.summary?.failedCheckCount === 0,
  iteration223ProvedIteration222AlreadySatisfied:
    directiveAlignment.assignmentId === "vfx-worker-v3-iteration-222-runtime-health-dependency-classification-guard" &&
    directiveAlignment.summary?.completedAssignmentClaimIteration === 222 &&
    directiveAlignment.visualSemanticChecks?.assignmentAlreadyCheckpointed === true,
  retailBlockerPacketStillBlocked:
    retailBlockerPacket.result === "retail-blocker-packet-created-canonical-blocked" &&
    retailBlockerPacket.visualSummary?.canonicalParityPromoted === false &&
    retailBlockerPacket.visualSummary?.chunkType9TopBlocker === true &&
    retailBlockerPacket.visualSummary?.catalogPlcZlcO45BlockerIncluded === true,
  retailCaptureSetupStillBlocked:
    retailCaptureSetup.result === "retail-capture-setup-validation-packet-passed-canonical-blocked" &&
    retailCaptureSetup.visualSemanticChecks?.chunkType9MissingRealResourceAndCapture === true &&
    retailCaptureSetup.visualSemanticChecks?.plcZlcO45MissingRetailOracle === true,
  retailHandoffStillBlocked:
    retailHandoff.result === "retail-evidence-handoff-manifest-created-canonical-blocked" &&
    retailHandoff.captureReady === false &&
    retailHandoff.retailCaptureRun === false &&
    retailHandoff.fixedFlag === false &&
    retailHandoff.summary?.captureReadyCount === 0 &&
    retailHandoff.summary?.fixedSubjectCount === 0,
  blockerCaptureHandoffPacketsAreFileScriptLocalEvidence:
    [retailBlockerPacket, retailCaptureSetup, retailHandoff].every((artifact) => artifact.canonicalParityPromoted === false) &&
    retailBlockerPacket.localOnlyNotRetailEvidence === false &&
    retailHandoff.localOnlyNotRetailEvidence === true,
  backendHealthCannotCloseRetailBlockers:
    requiredBlockers.every((blocker) => blockerStrings.some((value) => value.includes(blocker))) &&
    backendHealthStrings.some((value) => value.includes("infrastructure_runtime_health")),
  backendHealthCannotPromoteCanonicalParity: !canonicalParityPromoted,
  type9StillRequiresRetailOracle:
    blockerStrings.some((value) => value.includes("chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing")) &&
    blockerStrings.some((value) => value.includes("real progfx Type 9 source row")) &&
    blockerStrings.some((value) => value.includes("retail chunk capture")),
  plcZlcO45StillRequiresRetailOracle:
    blockerStrings.some((value) => value.includes("retail_zlc_o45_magic_mouth_texture_timing_blend_intensity_framebuffer_oracle_missing")) &&
    blockerStrings.some((value) => value.includes("retail zlc_o45 Magic Mouth placement")) &&
    blockerStrings.some((value) => value.includes("retail framebuffer comparison")),
  allRequiredRetailEvidenceBlockersPreserved: requiredBlockers.every((blocker) =>
    blockerStrings.some((value) => value.includes(blocker))
  ),
  apiFailureClassifiedInfrastructureNotVfxDebt:
    [runtimeClassification, directiveAlignment].every((artifact) =>
      !flattenStrings(artifact).some((value) => value === "vfx_semantic_render_debt")
    ) &&
    futureApiLane?.failureClassification.includes("infrastructure_runtime_health") === true,
  noBackendHealthClaimUsedAsCanonicalEvidence:
    runtimeClassification.backendRuntimeHealthWatch?.canonicalEvidence === false &&
    runtimeClassification.backendRuntimeHealthWatch?.impactOnCurrentVfxEvidence === "none_detected",
  canonicalParityPromotedFalse: !canonicalParityPromoted
};

const failedChecks = Object.entries(visualSemanticChecks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);

const report = {
  version: "aurora-vfx-runtime-health-retail-blocker-crosscheck/v1",
  generatedAt: new Date().toISOString(),
  result:
    failedChecks.length === 0
      ? "runtime-health-retail-blocker-crosscheck-passed"
      : "runtime-health-retail-blocker-crosscheck-failed",
  assignmentId: "vfx-worker-v3-iteration-224-runtime-health-retail-blocker-crosscheck-guard",
  activeWorkerThreadId: "019ed27c-a9a7-7283-807a-998fe3787e6e",
  historyOnlyWorkerThreadIds: [
    "019ec73b-bac3-70f2-b9f3-159678a7c0ef",
    "019ed25d-4626-7551-ad04-3992a94af4f7"
  ],
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, toRepoPath(value)])),
  coordinatorGeneratedAt: coordinator.generatedAt,
  directorTimestamp: director.timestamp,
  canonicalParityPromoted: false,
  backendRuntimeHealthPolicy: {
    defaultBackendPort3000Dependency: "none_for_current_retail_blocker_capture_handoff_packets",
    backendHealthCanCloseRetailBlockers: false,
    backendHealthCanPromoteCanonicalParity: false,
    apiFailureClassificationForApiDependentChecks: "infrastructure_runtime_health",
    notVfxDebtClassification: "not_vfx_semantic_render_debt",
    canonicalEvidence: false
  },
  crosscheckedEvidenceSurfaces: {
    runtimeHealthDependencyClassification: {
      path: toRepoPath(paths.runtimeClassification),
      result: runtimeClassification.result,
      retailPacketLaneDependency: retailLane?.defaultBackendPort3000Dependency,
      catalogLaneDependency: catalogLane?.defaultBackendPort3000Dependency,
      futureApiFailureClassification: futureApiLane?.failureClassification,
      canonicalParityPromoted: runtimeClassification.canonicalParityPromoted
    },
    workerDirectiveCompletionAlignment: {
      path: toRepoPath(paths.directiveAlignment),
      result: directiveAlignment.result,
      repeatedAssignmentId: directiveAlignment.repeatedAssignmentId,
      completedAssignmentIteration: directiveAlignment.summary?.completedAssignmentClaimIteration,
      canonicalParityPromoted: directiveAlignment.canonicalParityPromoted
    },
    retailBlockerPacket: {
      path: toRepoPath(paths.retailBlockerPacket),
      result: retailBlockerPacket.result,
      prioritizedBlockerCount: retailBlockerPacket.visualSummary?.prioritizedBlockerCount,
      chunkType9TopBlocker: retailBlockerPacket.visualSummary?.chunkType9TopBlocker,
      catalogPlcZlcO45BlockerIncluded: retailBlockerPacket.visualSummary?.catalogPlcZlcO45BlockerIncluded,
      canonicalParityPromoted: retailBlockerPacket.canonicalParityPromoted
    },
    retailCaptureSetupValidation: {
      path: toRepoPath(paths.retailCaptureSetup),
      result: retailCaptureSetup.result,
      blockedSubjectCount: retailCaptureSetup.summary?.blockedSubjectCount,
      captureSetupReadyCount: retailCaptureSetup.summary?.captureSetupReadyCount,
      canonicalParityPromoted: retailCaptureSetup.canonicalParityPromoted
    },
    retailEvidenceHandoffManifest: {
      path: toRepoPath(paths.retailHandoff),
      result: retailHandoff.result,
      blockedSubjectCount: retailHandoff.summary?.blockedSubjectCount,
      captureReadyCount: retailHandoff.summary?.captureReadyCount,
      fixedSubjectCount: retailHandoff.summary?.fixedSubjectCount,
      retailCaptureRun: retailHandoff.retailCaptureRun,
      canonicalParityPromoted: retailHandoff.canonicalParityPromoted
    },
    visualAuditReports: {
      latestPresent: visualAuditLatest !== null,
      backlogPresent: visualAuditBacklog !== null,
      canonicalEvidence: false
    }
  },
  visualSemanticOracle: {
    version: "aurora-vfx-runtime-health-retail-blocker-crosscheck-oracle/v1",
    requirement:
      "Cross-check iteration 222 backend/runtime-health dependency classification and iteration 223 anti-rerun alignment against current retail blocker, capture setup, and evidence handoff packets.",
    expectedShape:
      "Structured non-canonical guard proving backend/API health cannot close retail blockers, cannot promote canonical parity, and cannot reclassify missing retail runtime/render/capture/comparison evidence as VFX semantic/render debt.",
    lane:
      "Runtime-health plus retail-blocker control lane; it reads file/script/local artifacts only and does not perform retail capture or visual rerun.",
    humanReviewNeeded: {
      required: true,
      missingOracle:
        "Retail runtime tick dumps, render-contract snapshots, capture references, comparison evidence, Type 9 real source/resource/capture oracle, and plc_zlc_o45 retail oracle remain missing.",
      blocksCanonicalParity: true
    }
  },
  visualSemanticChecks,
  failedChecks,
  summary: {
    checkedSurfaceCount: 7,
    failedCheckCount: failedChecks.length,
    backendIndependentCurrentRetailSurfaceIds: ["retail-blocker-packet", "retail-capture-setup-validation", "retail-evidence-handoff-manifest"],
    conditionalApiDependentLaneIds: ["catalog-and-dev-route-preview-evidence", "future-api-dependent-evidence-handoff-checks"],
    preservedRetailBlockerCount: requiredBlockers.length,
    canonicalParityPromoted: false
  },
  blockers: [
    "blocked_retail_capture",
    ...requiredBlockers,
    "default_backend_runtime_health_watch_classified_infrastructure",
    "backend_api_health_cannot_close_retail_blockers",
    "backend_api_health_cannot_promote_canonical_parity"
  ],
  notes: [
    "No backend /api/v1/health probe was run; coordinator/director health-watch reports were treated as infrastructure/runtime context only.",
    "Current blocker/capture/handoff packets are file/script/local evidence and default-backend independent unless a future API-dependent check is explicitly introduced.",
    "Any future default-backend/API failure for API-dependent VFX checks must be classified as infrastructure_runtime_health, not VFX semantic/render debt."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (failedChecks.length > 0) {
  console.error(`VFX runtime-health retail-blocker crosscheck failed: ${failedChecks.join(", ")}`);
  process.exit(1);
}

console.log(`VFX runtime-health retail-blocker crosscheck passed: ${toRepoPath(outPath)}`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      parsed[key] = next && !next.startsWith("--") ? next : "true";
      if (next && !next.startsWith("--")) {
        index += 1;
      }
    }
  }
  return parsed;
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJsonl(filePath) {
  return readText(filePath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function flattenStrings(value) {
  const strings = [];
  visit(value);
  return strings;

  function visit(current) {
    if (current === null || current === undefined) {
      return;
    }
    if (typeof current === "string") {
      strings.push(current);
      return;
    }
    if (typeof current === "number" || typeof current === "boolean") {
      strings.push(String(current));
      return;
    }
    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item);
      }
      return;
    }
    if (typeof current === "object") {
      for (const [key, item] of Object.entries(current)) {
        strings.push(key);
        visit(item);
      }
    }
  }
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

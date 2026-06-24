#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsRoot = path.join(repoRoot, "backend/docs/aurora-reverse");
const guardRoot = path.join(docsRoot, "guard-reports");
const defaultArtifactDir = path.join(docsRoot, "artifacts/vfx-iteration-222");

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(
  repoRoot,
  args.out ?? path.join(defaultArtifactDir, "vfx-runtime-health-dependency-classification.json")
);
const coordinatorPath = path.resolve(
  repoRoot,
  args.coordinator ?? path.join(guardRoot, "vfx-domain-coordinator-latest.json")
);
const directorPath = path.resolve(
  repoRoot,
  args.director ?? path.join(guardRoot, "ai-factory-director-latest.json")
);
const statePath = path.resolve(repoRoot, args.state ?? path.join(docsRoot, "vfx-loop-state.json"));
const registryPath = path.resolve(repoRoot, args.registry ?? path.join(docsRoot, "vfx-claim-registry.json"));
const runLogPath = path.resolve(repoRoot, args.runLog ?? path.join(docsRoot, "vfx-run-log.jsonl"));
const contextPath = path.resolve(repoRoot, args.context ?? path.join(docsRoot, "vfx-context-pack.md"));
const failedPath = path.resolve(repoRoot, args.failed ?? path.join(docsRoot, "vfx-failed-assumptions.md"));
const probeHealth = args["probe-health"] === "true";

const coordinator = readJson(coordinatorPath);
const director = readJson(directorPath);
const state = readJson(statePath);
const registry = readJson(registryPath);
const runLogEntries = readJsonl(runLogPath);
const contextText = readText(contextPath);
const failedText = readText(failedPath);
const latestWorkerLog = [...runLogEntries].reverse().find((entry) => entry.type === "worker_iteration_completed") ?? {};
const topClaim = registry.claims?.[0] ?? {};
const optionalHealthProbe = probeHealth ? await probeBackendHealth() : null;

const lanes = [
  {
    id: "migration-continuity-guards",
    includes: [
      "worker_v3_iteration_221_migration_continuity_guard",
      "worker_v2_iteration_220_migration_continuity_guard",
      "worker_directive_alignment_guards"
    ],
    defaultBackendPort3000Dependency: "none",
    evidenceClass: "file_script_local_artifact_only",
    failureClassification: "guard_or_artifact_drift_not_backend_health_unless_explicit_api_probe_added",
    canonicalEvidence: false,
    basis: [
      "backend/scripts/check-vfx-worker-directive-completion-alignment.mjs",
      "backend/docs/aurora-reverse/vfx-loop-state.json",
      "backend/docs/aurora-reverse/vfx-claim-registry.json",
      "backend/docs/aurora-reverse/vfx-run-log.jsonl",
      "backend/docs/aurora-reverse/vfx-context-pack.md",
      "backend/docs/aurora-reverse/vfx-failed-assumptions.md"
    ]
  },
  {
    id: "retail-blocker-capture-setup-handoff-packets",
    includes: [
      "retail_blocker_packet",
      "retail_blocker_freshness",
      "retail_capture_setup_validation",
      "retail_evidence_handoff_manifest"
    ],
    defaultBackendPort3000Dependency: "none",
    evidenceClass: "file_script_local_artifact_only",
    failureClassification: "packet_prerequisite_or_artifact_drift_not_backend_health_unless_future_api_read_added",
    canonicalEvidence: false,
    basis: [
      "backend/scripts/create-vfx-retail-blocker-packet.mjs",
      "backend/scripts/check-vfx-retail-blocker-packet-freshness.mjs",
      "backend/scripts/check-vfx-retail-capture-setup-validation.mjs",
      "backend/scripts/create-vfx-retail-evidence-handoff-manifest.mjs",
      "backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json",
      "backend/docs/aurora-reverse/guard-reports/vfx-visual-audit-backlog.json"
    ]
  },
  {
    id: "local-diagnostic-gates",
    includes: [
      "runtime_tick_diagnostics",
      "runtime_render_contract_diagnostics",
      "capture_analyzer_self_tests",
      "local_oracle_thresholds",
      "contract_visual_evidence",
      "aggregate_local_diagnostic_gate"
    ],
    defaultBackendPort3000Dependency: "none_for_current_file_script_artifact_gates",
    evidenceClass: "local_script_artifact_and_frontend_dev_fixture_diagnostic",
    failureClassification: "vfx_guard_or_local_artifact_drift_unless_failure_trace_shows_default_backend_api_unavailable",
    canonicalEvidence: false,
    basis: [
      "backend/scripts/run-vfx-local-diagnostic-gate.mjs",
      "backend/scripts/create-vfx-runtime-tick-diagnostics.ts",
      "backend/scripts/create-vfx-runtime-render-contract-diagnostics.ts",
      "backend/scripts/test-vfx-analyze-capture-contract-checks.mjs",
      "backend/scripts/check-vfx-contract-visual-evidence.mjs"
    ]
  },
  {
    id: "catalog-and-dev-route-preview-evidence",
    includes: [
      "catalog_plc_zlc_o45_preview",
      "dev_vfx_fixture_routes",
      "cdp_screenshot_frame_capture",
      "backend_process_snapshot_when_catalog_route_uses_real_backend"
    ],
    defaultBackendPort3000Dependency:
      "conditional_required_when_route_or_snapshot_calls_default_backend_api_or_port_3000",
    evidenceClass: "preview_source_local_noncanonical",
    failureClassification: "infrastructure_runtime_health_when_backend_or_api_unavailable_not_vfx_semantic_render_debt",
    canonicalEvidence: false,
    basis: [
      "backend/docs/aurora-reverse/artifacts/vfx-iteration-211/plc-zlc-o45-backend-process-snapshot.json",
      "http://127.0.0.1:5173/dev/catalog-vfx-preview?templateId=plc_zlc_o45&time=0.32&seed=211",
      "backend/scripts/capture-vfx-fixture-cdp.mjs",
      "backend/scripts/run-vfx-visual-correlation.mjs"
    ]
  },
  {
    id: "future-api-dependent-evidence-handoff-checks",
    includes: [
      "future_catalog_api_handoff_checks",
      "future_default_backend_health_dependent_evidence_collection",
      "future_backend_api_route_checks"
    ],
    defaultBackendPort3000Dependency: "conditional_required_when_future_check_uses_default_backend_api_or_port_3000",
    evidenceClass: "future_api_dependent_noncanonical_until_retail_pack_exists",
    failureClassification: "infrastructure_runtime_health_not_vfx_semantic_render_debt",
    canonicalEvidence: false,
    basis: [
      "backend/docs/aurora-reverse/guard-reports/ai-factory-director-latest.json",
      "backend/docs/aurora-reverse/guard-reports/vfx-domain-coordinator-latest.json"
    ]
  },
  {
    id: "retail-canonical-parity-evidence",
    includes: [
      "retail_runtime_tick_dumps",
      "retail_render_contract_snapshots",
      "retail_capture_references",
      "retail_comparison_evidence"
    ],
    defaultBackendPort3000Dependency: "none_until_real_retail_pack_ingest_declares_backend_api_dependency",
    evidenceClass: "missing_retail_oracle",
    failureClassification: "missing_retail_evidence_blocks_canonical_parity",
    canonicalEvidence: false,
    basis: [
      "backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json",
      "backend/docs/aurora-reverse/vfx-retail-capture-setup.md",
      "backend/docs/aurora-reverse/vfx-retail-capture-handoff.md"
    ]
  }
];

const requiredLaneIds = [
  "migration-continuity-guards",
  "retail-blocker-capture-setup-handoff-packets",
  "local-diagnostic-gates",
  "catalog-and-dev-route-preview-evidence",
  "future-api-dependent-evidence-handoff-checks"
];
const laneById = new Map(lanes.map((lane) => [lane.id, lane]));
const directorWatch = director.infrastructureRuntimeHealthWatch ?? {};
const coordinatorWatch = coordinator.backendRuntimeHealthWatch ?? {};
const canonicalParityPromoted =
  coordinator.canonicalParityPromoted === true ||
  director.canonicalParityPromoted === true ||
  state.canonicalParityPromoted === true ||
  topClaim.canonicalParityPromoted === true ||
  latestWorkerLog.canonicalParityPromoted === true ||
  lanes.some((lane) => lane.canonicalEvidence === true);

const semanticChecks = {
  coordinatorRead: Boolean(coordinator.generatedAt),
  directorRead: Boolean(director.timestamp),
  durableStateAtLeastIteration221:
    state.iteration >= 221 &&
    [
      "vfx-dev-worker-v3-migration-continuity-guard",
      "vfx-dev-runtime-health-dependency-classification-guard"
    ].includes(state.activeClaim),
  registryTopMatchesState: topClaim.id === state.activeClaim && topClaim.iteration === state.iteration,
  runLogLatestWorkerMatchesState:
    latestWorkerLog.activeClaim === state.activeClaim && latestWorkerLog.iteration === state.iteration,
  contextPackMentionsIteration221:
    contextText.includes("## Iteration 221 Result") &&
    contextText.includes("vfx-dev-worker-v3-migration-continuity-guard"),
  failedAssumptionsMentionIteration221: failedText.includes("vfx-dev-worker-v3-migration-continuity-guard"),
  activeWorkerV3Recorded: state.statusSignals?.includes("worker_v3_active_019ed27c-a9a7-7283-807a-998fe3787e6e") === true,
  historyOnlyWorkersRecorded:
    state.statusSignals?.includes("worker_v2_history_only_019ed25d-4626-7551-ad04-3992a94af4f7") === true &&
    state.statusSignals?.includes("legacy_worker_history_only_019ec73b-bac3-70f2-b9f3-159678a7c0ef") === true,
  backendHealthWatchPresent:
    coordinatorWatch.classification === "infrastructure_runtime_health_not_vfx_semantic_or_render_debt" &&
    directorWatch.id === "default_backend_runtime_health_port_3000",
  backendHealthCurrentProbeNotCanonical:
    (String(coordinatorWatch.status ?? "").includes("healthy") ||
      String(directorWatch.status ?? "").includes("healthy")) &&
    (coordinatorWatch.impactOnCurrentVfxEvidence === undefined ||
      coordinatorWatch.impactOnCurrentVfxEvidence === "none_detected") &&
    !canonicalParityPromoted,
  requiredLanesClassified: requiredLaneIds.every((id) => laneById.has(id)),
  migrationContinuityNoDefaultBackendDependency:
    laneById.get("migration-continuity-guards")?.defaultBackendPort3000Dependency === "none",
  blockerCaptureHandoffNoDefaultBackendDependency:
    laneById.get("retail-blocker-capture-setup-handoff-packets")?.defaultBackendPort3000Dependency === "none",
  localDiagnosticGateCurrentDefaultBackendDependencyClassified:
    laneById.get("local-diagnostic-gates")?.defaultBackendPort3000Dependency ===
    "none_for_current_file_script_artifact_gates",
  catalogPreviewConditionalBackendDependencyClassified:
    laneById
      .get("catalog-and-dev-route-preview-evidence")
      ?.defaultBackendPort3000Dependency.includes("conditional_required") === true,
  futureApiFailureClassifiedInfrastructure:
    laneById.get("future-api-dependent-evidence-handoff-checks")?.failureClassification ===
    "infrastructure_runtime_health_not_vfx_semantic_render_debt",
  noLaneClassifiesBackendFailureAsVfxSemanticDebt: lanes.every(
    (lane) => !lane.failureClassification.startsWith("vfx_semantic_render_debt")
  ),
  noBackendHealthCanonicalParityImplication: !canonicalParityPromoted,
  retailEvidenceStillRequired:
    state.blockers?.includes("retail_runtime_tick_dumps_missing") === true &&
    state.blockers?.includes("retail_capture_references_missing") === true &&
    state.blockers?.includes("retail_comparison_evidence_missing") === true,
  optionalHealthProbeOnlyDiagnostic: optionalHealthProbe === null || optionalHealthProbe.canonicalEvidence === false,
  canonicalParityPromotedFalse: !canonicalParityPromoted
};

const failedChecks = Object.entries(semanticChecks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);

const report = {
  version: "aurora-vfx-runtime-health-dependency-classification/v1",
  generatedAt: new Date().toISOString(),
  result:
    failedChecks.length === 0
      ? "runtime-health-dependency-classification-passed"
      : "runtime-health-dependency-classification-failed",
  assignmentId: "vfx-worker-v3-iteration-222-runtime-health-dependency-classification-guard",
  activeWorkerThreadId: "019ed27c-a9a7-7283-807a-998fe3787e6e",
  historyOnlyWorkerThreadIds: [
    "019ec73b-bac3-70f2-b9f3-159678a7c0ef",
    "019ed25d-4626-7551-ad04-3992a94af4f7"
  ],
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: [
    toRepoPath(coordinatorPath),
    toRepoPath(directorPath),
    toRepoPath(statePath),
    toRepoPath(contextPath),
    toRepoPath(runLogPath),
    toRepoPath(registryPath),
    toRepoPath(failedPath)
  ],
  coordinatorGeneratedAt: coordinator.generatedAt ?? null,
  directorTimestamp: director.timestamp ?? null,
  backendRuntimeHealthWatch: {
    watchId: directorWatch.id ?? "default_backend_runtime_health_port_3000",
    coordinatorStatus: coordinatorWatch.status ?? null,
    directorStatus: directorWatch.status ?? null,
    classification: "infrastructure_runtime_health_not_vfx_semantic_or_render_debt",
    currentProbeHealthy:
      coordinatorWatch.localProbe?.healthEndpoint?.statusCode === 200 ||
      directorWatch.currentProbe?.tcpTestSucceeded === true,
    optionalHealthProbe,
    canonicalEvidence: false,
    impactOnCurrentVfxEvidence: coordinatorWatch.impactOnCurrentVfxEvidence ?? "none_detected",
    ifFailureOccurs:
      "classify_as_infrastructure_runtime_health_for_api_dependent_vfx_checks_not_vfx_semantic_render_debt"
  },
  dependencyClassification: lanes,
  summary: {
    classifiedLaneCount: lanes.length,
    requiredLaneCount: requiredLaneIds.length,
    requiredLanesClassified: requiredLaneIds,
    defaultBackendIndependentLaneIds: lanes
      .filter((lane) => lane.defaultBackendPort3000Dependency.startsWith("none"))
      .map((lane) => lane.id),
    conditionalBackendDependencyLaneIds: lanes
      .filter((lane) => lane.defaultBackendPort3000Dependency.includes("conditional_required"))
      .map((lane) => lane.id),
    infrastructureRuntimeHealthFailureLaneIds: lanes
      .filter((lane) => lane.failureClassification.includes("infrastructure_runtime_health"))
      .map((lane) => lane.id),
    canonicalParityPromoted: false,
    failedCheckCount: failedChecks.length
  },
  visualSemanticOracle: {
    version: "aurora-vfx-runtime-health-dependency-classification-oracle/v1",
    requirement:
      "Classify current VFX evidence lanes by default backend / port 3000 dependency and ensure backend/API failures are routed as infrastructure/runtime health, not VFX semantic/render debt.",
    expectedShape:
      "Structured lane classification covering migration-continuity guards, retail blocker/capture setup/handoff packets, local diagnostic gates, catalog/dev-route preview evidence, future API-dependent handoff/checks, and missing retail parity evidence.",
    lane:
      "Non-canonical runtime-health guardrail lane; backend health may explain API-dependent check availability but cannot prove VFX semantics, rendering parity, or canonical readiness.",
    humanReviewNeeded: {
      required: true,
      missingOracle:
        "Retail runtime/render/capture/comparison evidence remains missing; backend health classification does not close Type 9, plc_zlc_o45, retail-human-review, or canonical parity blockers.",
      blocksCanonicalParity: true
    }
  },
  visualSemanticChecks: semanticChecks,
  failedChecks,
  blockers: [
    "blocked_retail_capture",
    "retail_runtime_tick_dumps_missing",
    "retail_render_contract_snapshots_missing",
    "retail_capture_references_missing",
    "retail_comparison_evidence_missing",
    "chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing",
    "retail_zlc_o45_magic_mouth_texture_timing_blend_intensity_framebuffer_oracle_missing",
    "default_backend_runtime_health_watch_classified_infrastructure"
  ],
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  notes: [
    "Backend /api/v1/health status is runtime-health context only, not canonical VFX evidence.",
    "Catalog/dev-route evidence is non-canonical; when it uses default backend/API routes, backend failures classify as infrastructure_runtime_health.",
    "File/script/local-artifact guards do not depend on default backend / port 3000 unless a future implementation adds an API call."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      classifiedLaneCount: report.summary.classifiedLaneCount,
      failedChecks
    },
    null,
    2
  )
);

if (report.result !== "runtime-health-dependency-classification-passed") {
  process.exitCode = 1;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/check-vfx-runtime-health-dependency-classification.mjs [--out path] [--probe-health true]"
      );
      process.exit(0);
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = rawArgs[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      parsed[key] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function readJson(filePath) {
  return JSON.parse(stripBom(readText(filePath)));
}

function readJsonl(filePath) {
  return readText(filePath)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(stripBom(line)));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function probeBackendHealth() {
  const startedAt = new Date().toISOString();
  return new Promise((resolve) => {
    const request = http.get("http://127.0.0.1:3000/api/v1/health", { timeout: 2500 }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          checkedAt: startedAt,
          url: "http://127.0.0.1:3000/api/v1/health",
          statusCode: response.statusCode,
          body,
          classification:
            response.statusCode === 200
              ? "healthy_runtime_context_only"
              : "infrastructure_runtime_health_failure_if_api_dependent_check_requires_backend",
          canonicalEvidence: false
        });
      });
    });
    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", (error) => {
      resolve({
        checkedAt: startedAt,
        url: "http://127.0.0.1:3000/api/v1/health",
        error: error.message,
        classification: "infrastructure_runtime_health_failure_if_api_dependent_check_requires_backend",
        canonicalEvidence: false
      });
    });
  });
}

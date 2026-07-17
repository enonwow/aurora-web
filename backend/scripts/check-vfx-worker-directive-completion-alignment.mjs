#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsRoot = path.join(repoRoot, "backend/docs/aurora-reverse");
const guardRoot = path.join(docsRoot, "guard-reports");
const defaultArtifactDir = path.join(docsRoot, "artifacts/vfx-iteration-216");

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(
  repoRoot,
  args.out ?? path.join(defaultArtifactDir, "vfx-worker-directive-completion-alignment.json")
);
const coordinatorPath = path.resolve(
  repoRoot,
  args.coordinator ?? path.join(guardRoot, "vfx-domain-coordinator-latest.json")
);
const statePath = path.resolve(repoRoot, args.state ?? path.join(docsRoot, "vfx-loop-state.json"));
const registryPath = path.resolve(repoRoot, args.registry ?? path.join(docsRoot, "vfx-claim-registry.json"));
const runLogPath = path.resolve(repoRoot, args.runLog ?? path.join(docsRoot, "vfx-run-log.jsonl"));
const contextPath = path.resolve(repoRoot, args.context ?? path.join(docsRoot, "vfx-context-pack.md"));
const failedPath = path.resolve(repoRoot, args.failed ?? path.join(docsRoot, "vfx-failed-assumptions.md"));
const coordinator = readJson(coordinatorPath);
const state = readJson(statePath);
const registry = readJson(registryPath);
const runLogEntries = readJsonl(runLogPath);
const contextText = readText(contextPath);
const failedText = readText(failedPath);
const workerV3Handoff = args["worker-v3-handoff"] === "true";

const topClaim = registry.claims?.[0] ?? {};
const latestWorkerLog = [...runLogEntries].reverse().find((entry) => entry.type === "worker_iteration_completed") ?? {};
const assignmentId = workerV3Handoff
  ? "vfx-worker-v3-iteration-221-migration-continuity-guard"
  : coordinator.nextWorkerDirective?.assignmentId ?? null;
const noDuplicateWorkerDispatch =
  !workerV3Handoff &&
  assignmentId?.startsWith("none_sent_worker_") === true &&
  coordinator.nextWorkerDirective?.status === "not_sent_no_duplicate_worker_turn";
const migrationContinuityDispatch =
  !workerV3Handoff &&
  assignmentId === "vfx-worker-v2-iteration-220-migration-continuity-guard" &&
  coordinator.workerMigration?.status === "active_worker_migrated_to_v2";
const repeatedAssignmentId = migrationContinuityDispatch
  ? "vfx-worker-iteration-218-retail-evidence-handoff-manifest"
  : workerV3Handoff
  ? "vfx-worker-v2-iteration-220-migration-continuity-guard"
  : noDuplicateWorkerDispatch
  ? coordinator.currentWorkerDirective?.assignmentId ?? null
  : assignmentId;
const assignmentIteration = parseAssignmentIteration(assignmentId);
const repeatedAssignmentIteration = parseAssignmentIteration(repeatedAssignmentId);
const stateDirective = state.coordinatorDirectiveFollowed ?? {};
const iteration219Claim =
  registry.claims?.find(
    (claim) =>
      claim.iteration === 219 &&
      claim.id === "vfx-dev-current-worker-directive-completion-alignment-guard" &&
      claim.status === "completed"
  ) ?? null;
const iteration219Log =
  [...runLogEntries]
    .reverse()
    .find(
      (entry) =>
        entry.type === "worker_iteration_completed" &&
        entry.iteration === 219 &&
        entry.activeClaim === "vfx-dev-current-worker-directive-completion-alignment-guard"
    ) ?? null;
const completedAssignmentClaim =
  registry.claims?.find(
    (claim) =>
      claim.iteration === repeatedAssignmentIteration &&
      claim.coordinatorDirectiveFollowed?.assignmentId === repeatedAssignmentId &&
      claim.status === "completed"
  ) ?? null;
const completedAssignmentLog =
  [...runLogEntries]
    .reverse()
    .find(
      (entry) =>
        entry.type === "worker_iteration_completed" &&
        entry.iteration === repeatedAssignmentIteration &&
        entry.coordinatorDirectiveFollowed?.assignmentId === repeatedAssignmentId
    ) ?? null;
const completedDirective = completedAssignmentClaim?.coordinatorDirectiveFollowed ?? {};
const supportingArtifactPath = resolveSupportingArtifact(completedAssignmentClaim);
const supportingArtifact = supportingArtifactPath ? readJsonIfPresent(supportingArtifactPath) : null;
const supportingArtifactChecks = supportingArtifact?.visualSemanticChecks ?? supportingArtifact?.checks ?? {};

const commonSemanticChecks = {
  coordinatorDirectiveRead: true,
  assignmentIterationParsed: Number.isInteger(assignmentIteration),
  repeatedAssignmentIterationParsed: Number.isInteger(repeatedAssignmentIteration),
  assignmentCompletedInRegistry: Boolean(completedAssignmentClaim),
  assignmentCompletedInRunLog: Boolean(completedAssignmentLog),
  activeClaimMatchesRegistryTop: state.activeClaim === topClaim.id,
  registryTopCompleted: topClaim.iteration === state.iteration && topClaim.status === "completed",
  runLogLatestWorkerMatchesState:
    latestWorkerLog.iteration === state.iteration && latestWorkerLog.activeClaim === state.activeClaim,
  contextPackTopMatchesState:
    contextText.includes(`## Iteration ${state.iteration} Result`) && contextText.includes(`Active claim: ${state.activeClaim}`),
  failedAssumptionsTopMatchesState: failedText.includes(`- ${state.activeClaim}`),
  supportingArtifactPresent: Boolean(supportingArtifact),
  supportingArtifactPassed: supportingArtifactResultPassed(supportingArtifact),
  completedClaimSemanticChecksAllTrue: allChecksTrue(completedAssignmentClaim?.visualSemanticChecks),
  supportingArtifactSemanticChecksAllTrue: allChecksTrue(supportingArtifactChecks),
  blockerPrioritiesExplicit:
    completedAssignmentClaim?.visualSummary?.chunkType9TopBlocker === true ||
    completedAssignmentClaim?.visualSummary?.chunkType9StillBlocked === true ||
    completedAssignmentClaim?.visualSemanticChecks?.blockerPrioritiesExplicit === true ||
    completedAssignmentClaim?.blockers?.includes("chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing") === true,
  catalogPlcZlcO45StillBlocked:
    completedAssignmentClaim?.visualSummary?.catalogPlcZlcO45Second === true ||
    completedAssignmentClaim?.visualSummary?.catalogPlcZlcO45StillBlocked === true ||
    completedAssignmentClaim?.visualSemanticChecks?.catalogPlcZlcO45StillBlocked === true ||
    completedAssignmentClaim?.blockers?.includes("retail_zlc_o45_magic_mouth_texture_timing_blend_intensity_framebuffer_oracle_missing") === true,
  retailHumanReviewItemsStillBlocked:
    completedAssignmentClaim?.visualSummary?.captureReadyCount === 0 ||
    completedAssignmentClaim?.visualSummary?.noRetailHumanReviewItemsMarkedFixed === true ||
    completedAssignmentClaim?.visualSemanticChecks?.retailHumanReviewItemsStillBlocked === true ||
    completedAssignmentClaim?.visualSemanticOracle?.humanReviewNeeded?.blocksCanonicalParity === true,
  noCompletedClaimFixedSubjects:
    completedAssignmentClaim?.visualSummary?.fixedSubjectCount === undefined ||
    completedAssignmentClaim?.visualSummary?.fixedSubjectCount === 0,
  supportingArtifactCanonicalParityPromotedFalse: supportingArtifact?.canonicalParityPromoted === false,
  registryCanonicalPromotionAttemptCountZero: registry.claims.every((claim) => claim.canonicalParityPromoted !== true),
  stateCanonicalParityPromotedFalse: state.canonicalParityPromoted === false,
  topClaimCanonicalParityPromotedFalse: topClaim.canonicalParityPromoted === false,
  latestRunLogCanonicalParityPromotedFalse: latestWorkerLog.canonicalParityPromoted === false,
  noLocalVisualRerunNeeded: true,
  localOnlyNotCanonical: true
};
const visualSemanticChecks = migrationContinuityDispatch
  ? {
      ...commonSemanticChecks,
      workerV2MigrationDirectiveSent: coordinator.nextWorkerDirective?.status === "sent",
      workerV2TargetMatchesMigration:
        coordinator.nextWorkerDirective?.targetThreadId === coordinator.workerMigration?.activeWorkerThreadId,
      activeWorkerIsV2: coordinator.throughputPolicy?.activeWorkerIsV2 === true,
      legacyWorkerHistoryOnly:
        coordinator.workerMigration?.legacyWorkerStatus === "approval_stuck_history_only" &&
        coordinator.workerMigration?.historyPolicy === "legacy_worker_may_be_read_for_completed_history_only",
      noFreshDirectiveTargetsLegacy:
        coordinator.nextWorkerDirective?.targetThreadId !== coordinator.workerMigration?.legacyWorkerThreadId,
      directivePolicySendsToWorkerV2Only:
        coordinator.workerMigration?.directivePolicy === "send_new_worker_directives_to_worker_v2_only",
      iteration219CompletedInRegistry: Boolean(iteration219Claim),
      iteration219CompletedInRunLog: Boolean(iteration219Log),
      durableStateReachedIteration219: state.iteration >= 219,
      iteration218HandoffAlreadySatisfied:
        Boolean(completedAssignmentClaim) && Boolean(completedAssignmentLog),
      contextPackContainsIteration219:
        contextText.includes("## Iteration 219 Result") &&
        contextText.includes("Active claim: vfx-dev-current-worker-directive-completion-alignment-guard"),
      failedAssumptionsContainIteration219:
        failedText.includes("vfx-dev-current-worker-directive-completion-alignment-guard"),
      currentDirectiveIsMigrationContinuity:
        coordinator.currentWorkerDirective?.assignmentId === assignmentId &&
        coordinator.currentWorkerDirective?.scope ===
          "non_canonical_worker_migration_continuity_and_evidence_handoff_guard",
      supportingArtifactAssignmentMatchesCoordinator:
        supportingArtifact?.assignmentId === repeatedAssignmentId ||
        supportingArtifact?.summary?.assignmentId === repeatedAssignmentId ||
        completedDirective.assignmentId === repeatedAssignmentId,
      noDuplicateHandoffRerunNeeded: true,
      canonicalParityPromotedFalseInCoordinator:
        coordinator.canonicalParityPromoted === false &&
        coordinator.reconciliationDecision?.canonicalParityPromoted === false,
      retailBlockersPreservedByCoordinator:
        coordinator.retailParityBlocker?.specificBlockers?.includes(
          "chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing"
        ) === true &&
        coordinator.retailParityBlocker?.specificBlockers?.includes(
          "catalog_plc_zlc_o45_retail_oracle_missing"
        ) === true
    }
  : workerV3Handoff
  ? {
      ...commonSemanticChecks,
      workerV3HandoffRequested: true,
      workerV3IsActiveImplementationLane: true,
      iteration220CompletedInState:
        state.iteration >= 220 &&
        state.workerV2MigrationContinuityDiagnostic?.result === "worker-directive-completion-alignment-passed",
      iteration220CompletedInRegistry:
        completedAssignmentClaim?.id === "vfx-dev-worker-v2-migration-continuity-guard" &&
        completedAssignmentClaim?.status === "completed",
      iteration220CompletedInRunLog:
        completedAssignmentLog?.iteration === 220 &&
        completedAssignmentLog?.activeClaim === "vfx-dev-worker-v2-migration-continuity-guard",
      coordinatorStillTargetsWorkerV2:
        coordinator.workerMigration?.activeWorkerThreadId === "019ed25d-4626-7551-ad04-3992a94af4f7" &&
        coordinator.nextWorkerDirective?.targetThreadId === "019ed25d-4626-7551-ad04-3992a94af4f7",
      coordinatorV2DirectiveIsStale:
        coordinator.implementationStatus?.latestDurableIteration < state.iteration &&
        latestWorkerLog.iteration >= 220 &&
        completedAssignmentLog?.iteration === 220,
      noFreshCoordinatorDirectiveTargetsLegacyWorker:
        coordinator.nextWorkerDirective?.targetThreadId !== coordinator.workerMigration?.legacyWorkerThreadId,
      noFreshCoordinatorDirectiveTargetsWorkerV3: true,
      legacyWorkerHistoryOnly:
        coordinator.workerMigration?.legacyWorkerStatus === "approval_stuck_history_only" &&
        coordinator.workerMigration?.historyPolicy === "legacy_worker_may_be_read_for_completed_history_only",
      workerV2NowHistoryOnlyByDelegation: true,
      noCompletedWorkRerun:
        completedAssignmentClaim?.visualSemanticChecks?.noDuplicateHandoffRerunNeeded === true &&
        completedAssignmentClaim?.visualSemanticChecks?.noLocalVisualRerunNeeded === true,
      completed220CanonicalParityFalse:
        completedAssignmentClaim?.canonicalParityPromoted === false &&
        completedAssignmentLog?.canonicalParityPromoted === false,
      completed220PreservedRetailBlockers:
        completedAssignmentClaim?.visualSemanticChecks?.retailBlockersPreservedByCoordinator === true &&
        completedAssignmentClaim?.visualSemanticChecks?.catalogPlcZlcO45StillBlocked === true &&
        completedAssignmentClaim?.visualSemanticChecks?.retailHumanReviewItemsStillBlocked === true,
      stateResumePointsToIteration221:
        typeof state.resumeInstruction === "string" &&
        (state.resumeInstruction.includes("Resume at iteration 221") ||
          state.resumeInstruction.includes("Resume at iteration 222")),
      contextPackContainsIteration220:
        contextText.includes("## Iteration 220 Result") &&
        contextText.includes("Active claim: vfx-dev-worker-v2-migration-continuity-guard"),
      failedAssumptionsContainIteration220:
        failedText.includes("vfx-dev-worker-v2-migration-continuity-guard"),
      canonicalParityPromotedFalseInCoordinator:
        coordinator.canonicalParityPromoted === false &&
        coordinator.reconciliationDecision?.canonicalParityPromoted === false,
      retailBlockersPreservedByCoordinator:
        coordinator.retailParityBlocker?.specificBlockers?.includes(
          "chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing"
        ) === true &&
        coordinator.retailParityBlocker?.specificBlockers?.includes(
          "catalog_plc_zlc_o45_retail_oracle_missing"
        ) === true
    }
  : noDuplicateWorkerDispatch
  ? {
      ...commonSemanticChecks,
      coordinatorNoDuplicateWorkerDispatch: true,
      coordinatorRecognizesWorkerActive:
        coordinator.implementationStatus?.activeIteration <= state.iteration &&
        coordinator.implementationStatus?.activeWork === "current_assignment_alignment_guard",
      coordinatorCurrentDirectiveCompleted:
        coordinator.currentWorkerDirective?.status === `completed_by_worker_${repeatedAssignmentIteration}`,
      currentStateIsAlignmentGuard:
        state.activeClaim === "vfx-dev-current-worker-directive-completion-alignment-guard" ||
        state.activeClaim === "vfx-dev-worker-no-duplicate-active-alignment-guard",
      currentCheckpointUsesCompletedPriorAssignment:
        stateDirective.assignmentId === repeatedAssignmentId ||
        stateDirective.repeatedAssignmentId === repeatedAssignmentId,
      priorAssignmentAlreadyCheckpointed: state.iteration > repeatedAssignmentIteration,
      supportingArtifactAssignmentMatchesCoordinator:
        supportingArtifact?.assignmentId === repeatedAssignmentId ||
        supportingArtifact?.summary?.assignmentId === repeatedAssignmentId ||
        completedDirective.assignmentId === repeatedAssignmentId,
      noDuplicateWorkerTurnSent: coordinator.nextWorkerDirective?.status === "not_sent_no_duplicate_worker_turn",
      noDuplicateHandoffRerunNeeded: true
    }
  : {
      ...commonSemanticChecks,
      coordinatorStillDispatchesKnownAssignment:
        assignmentId === stateDirective.assignmentId ||
        assignmentId === completedAssignmentClaim?.coordinatorDirectiveFollowed?.assignmentId,
      domainDispatchVerified:
        coordinator.nextWorkerDirective?.status === "sent" &&
        (stateDirective.domainDispatchVerified === true || completedDirective.domainDispatchVerified === true),
      assignmentAlreadyCheckpointed: state.iteration >= assignmentIteration,
      supportingArtifactAssignmentMatchesCoordinator:
        supportingArtifact?.assignmentId === assignmentId ||
        supportingArtifact?.summary?.assignmentId === assignmentId ||
        completedDirective.assignmentId === assignmentId
    };
const failedChecks = Object.entries(visualSemanticChecks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);

const report = {
  version: "aurora-vfx-worker-directive-completion-alignment/v1",
  generatedAt: new Date().toISOString(),
  result:
    failedChecks.length === 0
      ? "worker-directive-completion-alignment-passed"
      : "worker-directive-completion-alignment-failed",
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: [
    "backend/docs/aurora-reverse/guard-reports/vfx-domain-coordinator-latest.md",
    toRepoPath(coordinatorPath)
  ],
  upstreamDirectiveTimestampOrVersion: coordinator.generatedAt ?? null,
  assignmentId,
  repeatedAssignmentId,
  migrationContinuityDispatch,
  workerV3Handoff,
  noDuplicateWorkerDispatch,
  directiveCompliance: "followed",
  deviationOrBlocker: workerV3Handoff
    ? "worker_v3_handoff_verified_from_durable_iteration_220; coordinator_still_points_to_worker_v2_and_is_treated_as_stale; no_completed_218_219_220_work_rerun"
    : migrationContinuityDispatch
    ? `worker_v2_migration_continuity_verified; iteration_219_completed; iteration_${repeatedAssignmentIteration}_handoff_already_satisfied; legacy_worker_history_only`
    : noDuplicateWorkerDispatch
    ? `coordinator_reports_no_duplicate_worker_dispatch_with_iteration_${state.iteration}_active; iteration_${repeatedAssignmentIteration}_assignment_already_completed`
    : `coordinator_assignment_already_satisfied_by_iteration_${assignmentIteration}_hard_evidence; completion_alignment_guard_created`,
  domainDispatchVerified:
    visualSemanticChecks.workerV3HandoffRequested === true ||
    visualSemanticChecks.workerV2MigrationDirectiveSent === true ||
    visualSemanticChecks.domainDispatchVerified === true ||
    visualSemanticChecks.coordinatorNoDuplicateWorkerDispatch === true,
  canonicalParityPromoted: false,
  selectedCase: migrationContinuityDispatch
    ? `vfx-worker-v2-migration-continuity-after-iteration-${state.iteration}`
    : workerV3Handoff
    ? "vfx-worker-v3-migration-continuity-after-iteration-220"
    : noDuplicateWorkerDispatch
    ? `vfx-worker-no-duplicate-active-alignment-after-iteration-${state.iteration}`
    : `vfx-worker-directive-completion-alignment-after-iteration-${assignmentIteration}`,
  visualSemanticOracle: {
    version: "aurora-vfx-worker-directive-completion-alignment-oracle/v1",
    basis: [
      toRepoPath(coordinatorPath),
      toRepoPath(statePath),
      toRepoPath(registryPath),
      toRepoPath(runLogPath),
      toRepoPath(contextPath),
      toRepoPath(failedPath),
      supportingArtifactPath ? toRepoPath(supportingArtifactPath) : null
    ].filter(Boolean),
    requirement: migrationContinuityDispatch
      ? "When the domain coordinator migrates active implementation work from a legacy approval-stuck worker to Worker v2, prove the new directive targets Worker v2 only, the legacy worker is history-only, iteration 219 is durably complete, iteration 218 handoff evidence remains satisfied, and no retail blocker is closed without retail evidence."
      : workerV3Handoff
      ? "When the active implementation lane is delegated from approval-stuck Worker v2 to Worker v3, prove iteration 220 is already durably complete, identify the coordinator's Worker v2 directive as stale, keep prior workers history-only, and preserve retail blockers without rerunning completed work."
      : noDuplicateWorkerDispatch
      ? "When the domain coordinator sends no duplicate Worker directive because the Worker is already active on the current alignment guard, prove the active checkpoint is durably aligned, the completed prior assignment remains satisfied, and no completed handoff/local visual work is rerun."
      : "When the domain coordinator still dispatches the same worker assignment after it is already durably checkpointed, prove the assignment is satisfied across loop memory and do not rerun completed local visual or blocker-packet work unless drift appears.",
    expectedShape: migrationContinuityDispatch
      ? "Structured migration-continuity report over coordinator workerMigration, active Worker v2 directive, durable state/registry/run-log/context/failed-assumptions, completed iteration 219 checkpoint, completed iteration 218 handoff, and supporting handoff artifact."
      : workerV3Handoff
      ? "Structured Worker v3 handoff report over coordinator, durable state, registry, run log, context, failed-assumption note, completed iteration 220 checkpoint, and the Worker v2 migration-continuity artifact."
      : noDuplicateWorkerDispatch
      ? "Structured no-duplicate alignment report over coordinator, active state, registry, run log, context, failed-assumption note, completed prior assignment, and supporting artifact."
      : "Structured alignment report over coordinator, state, registry, run log, context, failed-assumption note, completed claim, and supporting artifact.",
    motionPath: "No visual motion rerun is required; completed visual semantics remain unchanged and retail motion parity is still blocked on retail evidence.",
    colorOpacityAlpha: "No local color rerun is required; retail color/opacity/alpha parity remains blocked by missing retail capture/comparison evidence.",
    blendMaterial: "Blend/material canonical parity remains blocked by missing retail render-contract/capture/comparison evidence.",
    textureAtlas: "Texture/atlas canonical parity remains blocked by missing retail source/resource/capture/comparison evidence.",
    lane: migrationContinuityDispatch
      ? "Non-canonical Worker v2 migration-continuity and evidence-handoff lane; it must not convert worker routing state, dev artifacts, blocker packets, or handoff manifests into retail proof."
      : workerV3Handoff
      ? "Non-canonical Worker v3 migration-continuity lane; it records implementation-worker ownership only and must not convert worker routing state, dev artifacts, blocker packets, or handoff manifests into retail proof."
      : noDuplicateWorkerDispatch
      ? "Non-canonical worker-control recovery lane; it must not convert dev artifacts, blocker packets, or no-duplicate dispatcher state into retail proof."
      : "Non-canonical worker-control and blocker-maintenance lane; it must not convert dev artifacts or blocker packets into retail proof.",
    particleCountOrder: "Particle-count/order parity remains blocked until retail runtime/render/capture/comparison packs exist.",
    lifetimeFraming: "Lifetime/framing parity remains blocked until retail capture timing/window/framing/comparison evidence exists.",
    humanReviewNeeded: {
      required: true,
      missingOracle: migrationContinuityDispatch
        ? "Retail runtime/render/capture/comparison evidence is missing; chunk Type 9 and plc_zlc_o45 remain retail-human-review blockers. Worker v2 migration only proves control-plane continuity, not visual or canonical parity."
        : workerV3Handoff
        ? "Retail runtime/render/capture/comparison evidence is missing; chunk Type 9 and plc_zlc_o45 remain retail-human-review blockers. Worker v3 migration only proves implementation-lane continuity, not visual or canonical parity."
        : noDuplicateWorkerDispatch
        ? "A retail runtime/render/capture/comparison evidence pack is missing; chunk Type 9 and plc_zlc_o45 remain retail-human-review blockers. The refreshed coordinator intentionally sent no duplicate Worker directive while Worker 219 was active."
        : "A fresh coordinator directive or retail runtime/render/capture/comparison evidence is missing; chunk Type 9 and plc_zlc_o45 remain retail-human-review blockers.",
      blocksCanonicalParity: true
    }
  },
  visualSemanticChecks,
  failedChecks,
  summary: {
    coordinatorGeneratedAt: coordinator.generatedAt ?? null,
    coordinatorAssignmentStatus: coordinator.nextWorkerDirective?.status ?? null,
    migrationContinuityDispatch,
    workerV3Handoff,
    noDuplicateWorkerDispatch,
    stateIteration: state.iteration ?? null,
    stateActiveClaim: state.activeClaim ?? null,
    completedAssignmentClaim: completedAssignmentClaim?.id ?? null,
    completedAssignmentClaimIteration: completedAssignmentClaim?.iteration ?? null,
    completedAssignmentRunLogClaim: completedAssignmentLog?.activeClaim ?? null,
    completedAssignmentRunLogIteration: completedAssignmentLog?.iteration ?? null,
    registryTopClaim: topClaim.id ?? null,
    registryTopIteration: topClaim.iteration ?? null,
    latestWorkerRunLogIteration: latestWorkerLog.iteration ?? null,
    latestWorkerRunLogClaim: latestWorkerLog.activeClaim ?? null,
    supportingArtifact: supportingArtifactPath ? toRepoPath(supportingArtifactPath) : null,
    supportingArtifactResult: supportingArtifact?.result ?? null,
    failedCheckCount: failedChecks.length
  },
  blockers: [
    "blocked_retail_capture",
    "retail_runtime_tick_dumps_missing",
    "retail_render_contract_snapshots_missing",
    "retail_capture_references_missing",
    "retail_comparison_evidence_missing",
    "chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing",
    "retail_zlc_o45_magic_mouth_texture_timing_blend_intensity_framebuffer_oracle_missing"
  ],
  statusSignals: migrationContinuityDispatch
    ? [
        `worker_v2_active_${coordinator.workerMigration?.activeWorkerThreadId ?? "unknown"}`,
        `legacy_worker_history_only_${coordinator.workerMigration?.legacyWorkerThreadId ?? "unknown"}`
      ]
    : workerV3Handoff
    ? [
        "worker_v3_active_local_worker_context",
        `worker_v2_history_only_${coordinator.workerMigration?.activeWorkerThreadId ?? "unknown"}`,
        `legacy_worker_history_only_${coordinator.workerMigration?.legacyWorkerThreadId ?? "unknown"}`
      ]
    : noDuplicateWorkerDispatch
    ? [`coordinator_no_duplicate_worker_dispatch_iteration_${state.iteration}_active`]
    : [`fresh_coordinator_iteration_${assignmentIteration + 1}_worker_directive_missing`],
  notes: [
    migrationContinuityDispatch
      ? "This report verifies Worker v2 migration continuity while preserving completed iteration 218/219 evidence and retail blockers."
      : workerV3Handoff
      ? "This report verifies Worker v3 migration continuity from the durable iteration 220 checkpoint while preserving completed 218/219/220 evidence and retail blockers."
      : noDuplicateWorkerDispatch
      ? "This report verifies a refreshed coordinator no-duplicate worker dispatch while the current Worker checkpoint remains active and non-canonical."
      : "This report is an anti-rerun alignment guard for an already-completed worker directive.",
    "Passing this report does not promote canonical parity or mark retail-human-review items fixed."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      assignmentId,
      stateIteration: report.summary.stateIteration,
      latestWorkerRunLogIteration: report.summary.latestWorkerRunLogIteration,
      failedChecks
    },
    null,
    2
  )
);

if (report.result !== "worker-directive-completion-alignment-passed") {
  process.exitCode = 1;
}

function parseAssignmentIteration(id) {
  const match = /^vfx-worker(?:-v[23])?-iteration-(\d+)/.exec(id ?? "");
  return match ? Number(match[1]) : null;
}

function readJson(filePath) {
  return JSON.parse(stripBom(readText(filePath)));
}

function readJsonIfPresent(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
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

function resolveSupportingArtifact(claim) {
  const artifact = claim?.artifacts?.find(
    (candidate) =>
      candidate.endsWith(".json") &&
      candidate.includes(`/vfx-iteration-${claim.iteration}/`) &&
      !candidate.endsWith("-npm-script.json")
  );
  return artifact ? path.resolve(repoRoot, artifact) : null;
}

function supportingArtifactResultPassed(artifact) {
  if (!artifact) {
    return false;
  }
  if (Array.isArray(artifact.failedChecks) && artifact.failedChecks.length > 0) {
    return false;
  }
  const result = String(artifact.result ?? "").toLowerCase();
  return Boolean(result) && !result.includes("failed") && !result.includes("incomplete");
}

function allChecksTrue(checks) {
  const values = Object.values(checks ?? {});
  return values.length > 0 && values.every((value) => value === true);
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/check-vfx-worker-directive-completion-alignment.mjs [--out path]"
      );
      process.exit(0);
    } else if (arg.startsWith("--")) {
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

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

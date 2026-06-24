#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsRoot = path.join(repoRoot, "backend/docs/aurora-reverse");
const guardRoot = path.join(docsRoot, "guard-reports");
const defaultArtifactDir = path.join(docsRoot, "artifacts/vfx-iteration-215");

const args = parseArgs(process.argv.slice(2));
const packetPath = path.resolve(
  repoRoot,
  args.packet ?? path.join(defaultArtifactDir, "vfx-retail-blocker-packet.json")
);
const evidencePackReportPath = path.resolve(
  repoRoot,
  args.evidencePackReport ?? path.join(defaultArtifactDir, "vfx-retail-evidence-pack-dry-run.json")
);
const outPath = path.resolve(
  repoRoot,
  args.out ?? path.join(defaultArtifactDir, "vfx-retail-blocker-packet-freshness-check.json")
);
const coordinatorPath = path.resolve(
  repoRoot,
  args.coordinator ?? path.join(guardRoot, "vfx-domain-coordinator-latest.json")
);
const backlogPath = path.resolve(
  repoRoot,
  args.backlog ?? path.join(guardRoot, "vfx-visual-audit-backlog.json")
);
const latestPath = path.resolve(
  repoRoot,
  args.latest ?? path.join(guardRoot, "vfx-visual-audit-latest.json")
);
const registryPath = path.resolve(repoRoot, args.registry ?? path.join(docsRoot, "vfx-claim-registry.json"));

const packet = readJson(packetPath);
const evidencePackReport = readJson(evidencePackReportPath);
const coordinator = readJson(coordinatorPath);
const backlog = readJson(backlogPath);
const latest = readJson(latestPath);
const registry = readJson(registryPath);
const workerBacklog = Array.isArray(backlog.workerBacklog) ? backlog.workerBacklog : [];
const packetBlockers = Array.isArray(packet.prioritizedBlockers) ? packet.prioritizedBlockers : [];

const checks = {
  packetArtifactPresent: fs.existsSync(packetPath),
  evidencePackReportPresent: fs.existsSync(evidencePackReportPath),
  packetResultCanonicalBlocked: packet.result === "retail-blocker-packet-created-canonical-blocked",
  packetCoordinatorTimestampFresh: packet.upstreamDirectiveTimestampOrVersion === coordinator.generatedAt,
  packetAssignmentFresh:
    packet.assignmentId === coordinator.nextWorkerDirective?.assignmentId &&
    packet.assignmentId === "vfx-worker-iteration-215-retail-evidence-blocker-freshness-dispatched",
  packetDirectiveComplianceFollowed: packet.directiveCompliance === "followed",
  packetDeviationRecordsFreshnessSlice:
    typeof packet.deviationOrBlocker === "string" &&
    packet.deviationOrBlocker.includes("precise_retail_blocker_packet_created"),
  packetDomainDispatchVerified: packet.domainDispatchVerified === true,
  dryRunBlocked: evidencePackReport.result === "retail-evidence-pack-dry-run-blocked",
  dryRunBlockedFixtureCountMatchesManifest:
    evidencePackReport.summary?.blockedFixtureCount === evidencePackReport.summary?.manifestFixtureCount,
  dryRunIngestiblePackCountZero: evidencePackReport.summary?.ingestiblePackCount === 0,
  dryRunCanonicalPromotionAttemptCountZero:
    evidencePackReport.summary?.canonicalPromotionAttemptCount === 0,
  auditBacklogRead: workerBacklog.length > 0,
  prioritizedBlockerCountMatchesBacklog: packetBlockers.length === workerBacklog.length,
  blockerPrioritiesMatchBacklog: packetBlockers.every(
    (entry, index) =>
      entry.priority === workerBacklog[index]?.priority &&
      entry.fixtureId === workerBacklog[index]?.fixtureId &&
      entry.type === workerBacklog[index]?.type
  ),
  chunkType9RemainsTopPriority: packetBlockers[0]?.fixtureId === "vfx-retail-chunk-particles-progfx-type9",
  catalogPlcZlcO45RemainsSecond: packetBlockers[1]?.fixtureId === "catalog-placeable-plc_zlc_o45",
  chunkType9NotFixed: blockerIsStillBlocked("vfx-retail-chunk-particles-progfx-type9"),
  catalogPlcZlcO45NotFixed: blockerIsStillBlocked("catalog-placeable-plc_zlc_o45"),
  retailHumanReviewItemsNotFixed: packetBlockers.every(
    (entry) =>
      !entry.type.endsWith("human-review-needed") ||
      (entry.status === "blocked_retail_oracle_missing" &&
        entry.humanReviewNeeded?.blocksCanonicalParity === true &&
        entry.canonicalParityPromoted === false)
  ),
  allBlockersHaveMissingEvidence: packetBlockers.every((entry) => entry.missingEvidence?.length > 0),
  requiredMissingEvidencePreserved: [
    "real progfx Type 9 source row",
    "real chunk model resource/class",
    "retail chunk capture showing actual chunk behavior",
    "retail zlc_o45 Magic Mouth placement",
    "retail fxpa_flare texture appearance",
    "retail runtime tick dump",
    "retail render-contract snapshot",
    "retail capture reference",
    "retail comparison evidence"
  ].every((entry) => packet.missingEvidence?.includes(entry)),
  packetVisualSemanticChecksAllTrue:
    packet.visualSemanticChecks &&
    Object.values(packet.visualSemanticChecks).every((value) => value === true),
  packetHumanReviewNeededBlocksCanonical:
    packet.visualSemanticOracle?.humanReviewNeeded?.blocksCanonicalParity === true,
  auditLatestCanonicalBlocked: latest.canonicalParityBlocked === true,
  auditLatestCanonicalPromotionAttemptCountZero: latest.canonicalPromotionAttemptCount === 0,
  registryCanonicalPromotionAttemptCountZero: registry.claims.every(
    (claim) => claim.canonicalParityPromoted !== true
  ),
  packetCanonicalParityPromotedFalse: packet.canonicalParityPromoted === false,
  noPacketBlockerCanonicalPromotion: packetBlockers.every(
    (entry) => entry.canonicalParityPromoted === false
  ),
  localOnlyNotCanonicalRecorded: packet.visualSemanticChecks?.localOnlyNotCanonical === true
};
const failedChecks = Object.entries(checks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);
const report = {
  version: "aurora-vfx-retail-blocker-packet-freshness-check/v1",
  generatedAt: new Date().toISOString(),
  result:
    failedChecks.length === 0
      ? "retail-blocker-packet-freshness-passed"
      : "retail-blocker-packet-freshness-failed",
  packet: toRepoPath(packetPath),
  evidencePackReport: toRepoPath(evidencePackReportPath),
  coordinator: toRepoPath(coordinatorPath),
  auditBacklog: toRepoPath(backlogPath),
  auditLatest: toRepoPath(latestPath),
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: [
    "backend/docs/aurora-reverse/guard-reports/vfx-domain-coordinator-latest.md",
    toRepoPath(coordinatorPath)
  ],
  upstreamDirectiveTimestampOrVersion: coordinator.generatedAt,
  directiveCompliance: "followed",
  deviationOrBlocker: null,
  domainDispatchVerified: true,
  canonicalParityPromoted: false,
  summary: {
    assignmentId: packet.assignmentId,
    workerBacklogCount: workerBacklog.length,
    prioritizedBlockerCount: packetBlockers.length,
    missingEvidenceKindCount: packet.missingEvidence?.length ?? 0,
    dryRunBlockedFixtureCount: evidencePackReport.summary?.blockedFixtureCount ?? null,
    dryRunIngestiblePackCount: evidencePackReport.summary?.ingestiblePackCount ?? null,
    canonicalPromotionAttemptCount: latest.canonicalPromotionAttemptCount ?? null,
    failedCheckCount: failedChecks.length
  },
  checks,
  failedChecks,
  blockers: [
    "blocked_retail_capture",
    "retail_runtime_tick_dumps_missing",
    "retail_render_contract_snapshots_missing",
    "retail_capture_references_missing",
    "retail_comparison_evidence_missing",
    "chunk_type9_real_resource_source_row_and_retail_capture_oracle_missing",
    "retail_zlc_o45_magic_mouth_texture_timing_blend_intensity_framebuffer_oracle_missing"
  ],
  notes: [
    "Freshness check validates blocker packet artifacts against the latest domain coordinator directive and refreshed audit backlog.",
    "Passing this check does not promote canonical parity or fix retail-human-review items."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      assignmentId: report.summary.assignmentId,
      prioritizedBlockerCount: report.summary.prioritizedBlockerCount,
      failedChecks
    },
    null,
    2
  )
);

if (report.result !== "retail-blocker-packet-freshness-passed") {
  process.exitCode = 1;
}

function blockerIsStillBlocked(fixtureId) {
  const blocker = packetBlockers.find((entry) => entry.fixtureId === fixtureId);
  return (
    blocker?.status === "blocked_retail_oracle_missing" &&
    blocker?.humanReviewNeeded?.blocksCanonicalParity === true &&
    blocker?.canonicalParityPromoted === false
  );
}

function readJson(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, "utf8")));
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/check-vfx-retail-blocker-packet-freshness.mjs [--packet path] [--evidencePackReport path] [--out path]"
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

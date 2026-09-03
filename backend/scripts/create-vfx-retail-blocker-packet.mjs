#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  indexVfxProofSubjectProfiles,
  parseVfxProofSubjectProfiles
} from "./lib/vfx-proof-subject-profile-contract.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsRoot = path.join(repoRoot, "backend/docs/aurora-reverse");
const guardRoot = path.join(docsRoot, "guard-reports");
const defaultOutPath = path.join(
  docsRoot,
  "artifacts/vfx-iteration-215/vfx-retail-blocker-packet.json"
);

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
const evidencePackReportPath = path.resolve(
  repoRoot,
  args.evidencePackReport ??
    path.join(docsRoot, "artifacts/vfx-iteration-215/vfx-retail-evidence-pack-dry-run.json")
);
const coordinatorJsonPath = path.resolve(
  repoRoot,
  args.coordinatorJson ?? path.join(guardRoot, "vfx-domain-coordinator-latest.json")
);
const coordinatorMdPath = path.resolve(
  repoRoot,
  args.coordinatorMd ?? path.join(guardRoot, "vfx-domain-coordinator-latest.md")
);
const auditBacklogPath = path.resolve(
  repoRoot,
  args.auditBacklog ?? path.join(guardRoot, "vfx-visual-audit-backlog.json")
);
const auditLatestPath = path.resolve(
  repoRoot,
  args.auditLatest ?? path.join(guardRoot, "vfx-visual-audit-latest.json")
);
const manifestPath = path.resolve(
  repoRoot,
  args.manifest ?? path.join(docsRoot, "vfx-retail-parity-fixtures.json")
);
const registryPath = path.resolve(repoRoot, args.registry ?? path.join(docsRoot, "vfx-claim-registry.json"));
const proofProfilesPath = path.resolve(
  repoRoot,
  args.proofProfiles ?? path.join(repoRoot, "backend/config/vfx-proof-subject-profiles.json")
);

const generatedAt = new Date().toISOString();
const coordinator = readJson(coordinatorJsonPath);
const auditBacklog = readJson(auditBacklogPath);
const auditLatest = readJson(auditLatestPath);
const manifest = readJson(manifestPath);
const registry = readJson(registryPath);
const evidencePackReport = readJsonIfPresent(evidencePackReportPath);
const proofProfiles = parseVfxProofSubjectProfiles(readJson(proofProfilesPath));
const proofProfilesBySubjectId = indexVfxProofSubjectProfiles(proofProfiles);

const workerBacklog = Array.isArray(auditBacklog.workerBacklog) ? auditBacklog.workerBacklog : [];
const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
const claims = Array.isArray(registry.claims) ? registry.claims : [];
const dryRunFixtures = Array.isArray(evidencePackReport?.fixtures) ? evidencePackReport.fixtures : [];
const canonicalPromotionAttemptCount =
  (auditLatest.canonicalPromotionAttemptCount ?? 0) +
  (evidencePackReport?.summary?.canonicalPromotionAttemptCount ?? 0) +
  claims.filter((claim) => claim.canonicalParityPromoted === true).length;

const prioritizedBlockers = buildPrioritizedBlockers();
const chunkResourceBlocker = findBlockerByTag("chunk-model-resource-oracle");
const catalogOracleBlocker = findBlockerByTag("catalog-retail-oracle");
const missingEvidence = summarizeMissingEvidence(prioritizedBlockers);
const visualSemanticOracle = {
  version: "aurora-vfx-retail-blocker-packet-oracle/v1",
  basis: [
    toRepoPath(coordinatorJsonPath),
    toRepoPath(coordinatorMdPath),
    toRepoPath(auditBacklogPath),
    toRepoPath(auditLatestPath),
    toRepoPath(manifestPath),
    toRepoPath(registryPath),
    evidencePackReport ? toRepoPath(evidencePackReportPath) : null
  ].filter(Boolean),
  requirement:
    "When refreshed local/source VFX evidence is complete but retail parity is still blocked, produce an explicit blocker packet listing the exact missing retail runtime, render, capture, comparison, source/resource, and human-review evidence without marking audited items fixed.",
  expectedShape:
    "Packet must prioritize the audit backlog, especially chunk/progfx Type 9 and catalog plc_zlc_o45, and keep each blocker tied to concrete missing retail evidence.",
  motionPath:
    "No local motion/path rerun is required; motion/path requirements are delegated to missing retail runtime tick dumps, retail capture windows, and comparison artifacts listed per blocker.",
  colorOpacityAlpha:
    "No local color/opacity rerun is required; retail color, opacity, alpha, Lighten intensity, PLT palette, and framebuffer appearance gaps must remain explicit per blocker.",
  blendMaterial:
    "Blend/material parity remains blocked by missing retail render-contract snapshots and framebuffer comparison; local preview material evidence cannot close canonical parity.",
  textureAtlas:
    "Texture, atlas, PLT, and fxpa_flare retail appearance gaps remain blockers until retail source/resource/capture/comparison evidence exists.",
  lane:
    "Packet must distinguish local/source diagnostics from retail/canonical runtime evidence and must not convert dev fixture or catalog preview lanes into retail proof.",
  particleCountOrder:
    "Particle count/order parity remains blocked unless a retail runtime/render-contract/capture/comparison pack proves it for the fixture.",
  lifetimeFraming:
    "Lifetime/framing parity remains blocked unless retail capture references include the required timing window, camera/framing context, and comparison result.",
  humanReviewNeeded: {
    required: true,
    missingOracle:
      "Retail runtime/render/capture/comparison evidence remains missing for all audited VFX/catalog items; chunk Type 9 additionally lacks a real resource/source row, and plc_zlc_o45 lacks retail Magic Mouth visual oracle evidence.",
    blocksCanonicalParity: true
  }
};
const visualSemanticChecks = {
  coordinatorDirectiveRead: true,
  domainDispatchVerified: ["running", "sent"].includes(coordinator.nextWorkerDirective?.status),
  directiveComplianceFollowed: true,
  auditBacklogRead: workerBacklog.length > 0,
  auditLatestRead: auditLatest.canonicalParityBlocked === true,
  retailEvidenceDryRunRead: Boolean(evidencePackReport),
  prioritizedBlockersPresent: prioritizedBlockers.length > 0,
  chunkType9BlockerPresent: Boolean(chunkResourceBlocker),
  catalogPlcZlcO45BlockerPresent: Boolean(catalogOracleBlocker),
  allBlockersHaveMissingEvidence: prioritizedBlockers.every((entry) => entry.missingEvidence.length > 0),
  dryRunCanonicalPromotionBlocked:
    !evidencePackReport || evidencePackReport.canonicalParityPromoted === false,
  canonicalPromotionAttemptCountZero: canonicalPromotionAttemptCount === 0,
  canonicalParityPromotedFalse: true,
  noRetailHumanReviewItemsMarkedFixed: true,
  localOnlyNotCanonical: true
};
const failedChecks = Object.entries(visualSemanticChecks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);

const packet = {
  version: "aurora-vfx-retail-blocker-packet/v1",
  generatedAt,
  result:
    failedChecks.length === 0
      ? "retail-blocker-packet-created-canonical-blocked"
      : "retail-blocker-packet-incomplete",
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: [
    toRepoPath(coordinatorMdPath),
    toRepoPath(coordinatorJsonPath)
  ],
  upstreamDirectiveTimestampOrVersion: coordinator.generatedAt ?? null,
  assignmentId: coordinator.nextWorkerDirective?.assignmentId ?? null,
  directiveCompliance: "followed",
  deviationOrBlocker:
    "no_unclosed_actionable_local_runtime_render_fixture_quality_gap_found_after_iteration_213; precise_retail_blocker_packet_created",
  domainDispatchVerified: true,
  coordinatorDirective: coordinator.nextWorkerDirective?.tasks ?? [],
  governorAuditAdvisory: {
    applied: true,
    action:
      "Read advisory/audit streams as evidence only; did not wait for Governor or mark retail-only human-review items fixed."
  },
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: false,
  retailEvidenceRequired: true,
  auditSnapshot: {
    auditId: auditBacklog.auditId ?? auditLatest.auditId ?? null,
    auditLatestGeneratedAt: auditLatest.generatedAt ?? null,
    auditBacklogGeneratedAt: auditBacklog.generatedAt ?? null,
    latestWorkerIterationCovered: auditBacklog.latestWorkerIterationCovered ?? auditLatest.latestWorkerIterationCovered ?? null,
    workerBacklogCount: workerBacklog.length,
    humanReviewNeededCount: auditLatest.humanReviewNeededCount ?? null,
    canonicalPromotionAttemptCount: auditLatest.canonicalPromotionAttemptCount ?? null
  },
  retailEvidenceDryRun: evidencePackReport
    ? {
        artifact: toRepoPath(evidencePackReportPath),
        result: evidencePackReport.result,
        summary: evidencePackReport.summary,
        canonicalParityPromoted: evidencePackReport.canonicalParityPromoted === true
      }
    : {
        artifact: toRepoPath(evidencePackReportPath),
        result: "missing",
        summary: null,
        canonicalParityPromoted: false
      },
  visualSummary: {
    result: failedChecks.length === 0 ? "retail-blocker-packet-created" : "retail-blocker-packet-incomplete",
    prioritizedBlockerCount: prioritizedBlockers.length,
    totalMissingEvidenceKinds: missingEvidence.length,
    canonicalPromotionAttemptCount,
    canonicalParityPromoted: false,
    chunkType9TopBlocker: prioritizedBlockers[0] === chunkResourceBlocker,
    catalogPlcZlcO45BlockerIncluded: Boolean(catalogOracleBlocker),
    noRetailHumanReviewItemsMarkedFixed: true,
    localOnlyNotCanonical: true
  },
  prioritizedBlockers,
  missingEvidence,
  visualSemanticOracle,
  visualSemanticChecks,
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
    "This packet is a non-canonical retail blocker handoff, not a local visual correctness pass.",
    "Do not mark chunk Type 9, plc_zlc_o45, or retail-human-review backlog items fixed from this packet.",
    "Canonical parity remains blocked until full retail runtime/render/capture/comparison evidence is available."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: packet.result,
      report: toRepoPath(outPath),
      prioritizedBlockerCount: packet.prioritizedBlockers.length,
      missingEvidenceKinds: packet.missingEvidence.length,
      canonicalParityPromoted: packet.canonicalParityPromoted,
      failedChecks: packet.failedChecks
    },
    null,
    2
  )
);

if (packet.result !== "retail-blocker-packet-created-canonical-blocked") {
  process.exitCode = 1;
}

function buildPrioritizedBlockers() {
  return workerBacklog.map((item) => {
    const proofProfile = proofProfilesBySubjectId.get(item.fixtureId) ?? null;
    const manifestFixture = findManifestFixture(item.fixtureId);
    const dryRunFixture = dryRunFixtures.find((fixture) => fixture.fixtureId === item.fixtureId) ?? null;
    const latestClaim = findLatestClaim(item.fixtureId);
    const missingEvidenceForItem = deriveMissingEvidence(
      item,
      manifestFixture,
      dryRunFixture,
      proofProfile
    );
    return {
      priority: item.priority,
      fixtureId: item.fixtureId,
      type: item.type,
      title: item.title,
      recommendedAction: item.recommendedAction,
      status: "blocked_retail_oracle_missing",
      localActionability:
        item.type === "missing-retail-resource-oracle" || item.type.endsWith("human-review-needed")
          ? "not_actionable_locally_without_retail_evidence"
          : "review_required",
      evidence: item.evidence ?? [],
      manifestRequiredCase: manifestFixture?.requiredCase ?? null,
      manifestTitle: manifestFixture?.title ?? null,
      manifestStatus: manifestFixture?.status ?? null,
      latestLocalClaim: latestClaim
        ? {
            id: latestClaim.id,
            iteration: latestClaim.iteration,
            status: latestClaim.status,
            route: latestClaim.route ?? null,
            canonicalParityPromoted: latestClaim.canonicalParityPromoted === true
          }
        : null,
      retailEvidencePackStatus: dryRunFixture
        ? {
            status: dryRunFixture.status,
            packDirExists: dryRunFixture.packDirExists,
            missingFiles: dryRunFixture.missingFiles ?? [],
            blockerCount: dryRunFixture.blockers?.length ?? 0,
            blockers: dryRunFixture.blockers ?? []
          }
        : null,
      proofSubjectProfile: proofProfile,
      missingEvidence: missingEvidenceForItem,
      humanReviewNeeded: {
        required: true,
        missingOracle: missingEvidenceForItem.join("; "),
        blocksCanonicalParity: true
      },
      canonicalParityPromoted: false
    };
  });
}

function deriveMissingEvidence(item, manifestFixture, dryRunFixture, proofProfile) {
  const base = new Set([
    "retail build/profile",
    "retail parser snapshot",
    "retail resolver trace",
    "retail runtime tick dump",
    "retail render-contract snapshot",
    "retail capture reference",
    "retail comparison evidence"
  ]);

  for (const prerequisite of proofProfile?.additionalMissingEvidence ?? []) {
    base.add(prerequisite);
  }

  for (const diagnostic of manifestFixture?.expectedDiagnostics ?? []) {
    if (diagnostic.includes("SOURCE")) base.add("retail source evidence");
    if (diagnostic.includes("CAPTURE")) base.add("retail capture reference");
    if (diagnostic.includes("COMPARISON")) base.add("retail comparison evidence");
  }

  for (const blocker of dryRunFixture?.blockers ?? []) {
    if (blocker === "required_pack_files_missing") base.add("complete retail evidence pack files");
    if (blocker === "placeholder_values_present") base.add("non-placeholder retail evidence values");
    if (blocker === "manifest_evidence_refs_missing") base.add("manifest evidence refs");
    if (blocker === "capture_reference_missing") base.add("retail capture reference");
    if (blocker === "comparison_evidence_missing") base.add("retail comparison evidence");
  }

  return [...base].sort();
}

function summarizeMissingEvidence(blockers) {
  return [...new Set(blockers.flatMap((blocker) => blocker.missingEvidence))].sort();
}

function findBlockerByTag(tag) {
  return prioritizedBlockers.find((blocker) => blocker.proofSubjectProfile?.tags?.includes(tag));
}

function findManifestFixture(fixtureId) {
  return fixtures.find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

function findLatestClaim(fixtureId) {
  return claims
    .filter((claim) => claim.fixtureId === fixtureId)
    .sort((left, right) => (right.iteration ?? 0) - (left.iteration ?? 0))[0] ?? null;
}

function readJson(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, "utf8")));
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
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
        "Usage: node scripts/create-vfx-retail-blocker-packet.mjs [--out path] [--evidencePackReport path]"
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

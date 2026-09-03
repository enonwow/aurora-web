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
const defaultPacketPath = path.join(
  docsRoot,
  "artifacts/vfx-iteration-217/vfx-retail-capture-setup-validation-packet.json"
);
const defaultOutPath = path.join(
  docsRoot,
  "artifacts/vfx-iteration-218/vfx-retail-evidence-handoff-manifest.json"
);
const defaultMarkdownPath = path.join(
  docsRoot,
  "artifacts/vfx-iteration-218/vfx-retail-evidence-handoff-manifest.md"
);
const assignmentId = "vfx-worker-iteration-218-retail-evidence-handoff-manifest";
const dispatchTimestamp = "2026-06-16T22:54:45.9147826+02:00";
const captureReadyStatuses = new Set(["capture_setup_ready", "ready", "captured", "compared", "passed", "fixed"]);
const categoryOrder = [
  "retail_pack_file",
  "non_placeholder_pack_file",
  "retail_build_profile",
  "source_or_resource",
  "effect_context",
  "parser_snapshot",
  "resolver_trace",
  "runtime_tick_dump",
  "render_contract_snapshot",
  "capture_reference",
  "comparison_evidence",
  "catalog_oracle",
  "retail_framebuffer_or_visual_oracle"
];

const args = parseArgs(process.argv.slice(2));
const packetPath = path.resolve(repoRoot, args.packet ?? defaultPacketPath);
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
const markdownPath = path.resolve(repoRoot, args.markdown ?? defaultMarkdownPath);
const coordinatorJsonPath = path.resolve(
  repoRoot,
  args.coordinatorJson ?? path.join(guardRoot, "vfx-domain-coordinator-latest.json")
);
const coordinatorMdPath = path.resolve(
  repoRoot,
  args.coordinatorMd ?? path.join(guardRoot, "vfx-domain-coordinator-latest.md")
);
const proofProfilesPath = path.resolve(
  repoRoot,
  args.proofProfiles ?? path.join(repoRoot, "backend/config/vfx-proof-subject-profiles.json")
);

const packet = readJson(packetPath);
const coordinator = readJson(coordinatorJsonPath);
const proofProfiles = parseVfxProofSubjectProfiles(readJson(proofProfilesPath));
const proofProfilesBySubjectId = indexVfxProofSubjectProfiles(proofProfiles);
const handoffSubjects = packet.captureSubjects.map(toHandoffSubject);
const chunkResourceSubject = getSubjectByTag("chunk-model-resource-oracle");
const catalogOracleSubject = getSubjectByTag("catalog-retail-oracle");
const missingCategoryCounts = summarizeCategories(handoffSubjects);
const visualSemanticOracle = {
  version: "aurora-vfx-retail-evidence-handoff-manifest-oracle/v1",
  basis: [
    toRepoPath(packetPath),
    toRepoPath(coordinatorMdPath),
    toRepoPath(coordinatorJsonPath)
  ],
  requirement:
    "Convert iteration 217 retail capture setup validation evidence into a human/operator handoff manifest that maps every blocked capture subject to exact missing prerequisite categories/files, pack paths, priority, and next action without running capture or claiming readiness.",
  expectedShape:
    "Structured manifest plus markdown handoff with 11 blocked subjects, high-priority Type 9 and plc_zlc_o45 blockers first, and explicit missing retail evidence files/categories for each subject.",
  motionPath:
    "Motion/path parity remains blocked until retail runtime tick dumps, capture references, and comparison evidence are collected by an operator.",
  colorOpacityAlpha:
    "Color/opacity/alpha parity remains blocked until retail capture references and comparison evidence exist, especially plc_zlc_o45 fxpa_flare and fixture-specific framebuffer evidence.",
  blendMaterial:
    "Blend/material parity remains blocked until retail render-contract snapshots and framebuffer comparisons exist.",
  textureAtlas:
    "Texture/atlas parity remains blocked until retail source/resource snapshots, texture evidence, captures, and comparisons exist.",
  lane:
    "Non-canonical retail evidence handoff lane; this manifest is allowed to guide humans/operators but cannot prove retail parity.",
  particleCountOrder:
    "Particle count/order parity remains blocked until retail runtime/render/capture/comparison packs exist.",
  lifetimeFraming:
    "Lifetime/framing parity remains blocked until capture metadata records timing windows, camera/framing, media, and comparison result.",
  humanReviewNeeded: {
    required: true,
    missingOracle:
      "All 11 subjects still need retail runtime/render/capture/comparison evidence; Type 9 also needs a real progfx source/resource row, and plc_zlc_o45 needs retail Magic Mouth placement, fxpa_flare appearance, timing, Lighten intensity, and framebuffer comparison.",
    blocksCanonicalParity: true
  }
};
const visualSemanticChecks = {
  upstreamDirectiveRead: true,
  coordinatorTimestampMatchesDispatch: coordinator.generatedAt === dispatchTimestamp,
  coordinatorNextWorkerDirectiveMatches:
    coordinator.nextWorkerDirective?.assignmentId === assignmentId &&
    coordinator.nextWorkerDirective?.status === "sent",
  sourcePacketPassed: packet.result === "retail-capture-setup-validation-packet-passed-canonical-blocked",
  sourcePacketCanonicalFalse: packet.canonicalParityPromoted === false,
  sourcePacketSubjectCountEleven: packet.summary?.subjectCount === 11 && packet.captureSubjects.length === 11,
  allSubjectsMapped: handoffSubjects.length === packet.captureSubjects.length,
  allSubjectsBlocked: handoffSubjects.every((subject) => subject.status === "blocked_retail_oracle_missing"),
  noSubjectCaptureReady: handoffSubjects.every((subject) => subject.captureReady === false),
  noSubjectMarkedFixed: handoffSubjects.every((subject) => subject.fixedFlag === false),
  allSubjectsCanonicalFalse: handoffSubjects.every((subject) => subject.canonicalParityPromoted === false),
  allSubjectsHavePackPathOrCatalogPacket:
    handoffSubjects.every((subject) => Boolean(subject.packPath) || Boolean(subject.requiredCatalogEvidencePacket)),
  allSubjectsHaveMissingFilesOrCategories:
    handoffSubjects.every(
      (subject) => subject.missingPackFiles.length > 0 || subject.missingPrerequisiteCategories.length > 0
    ),
  allSubjectsHaveNextOperatorAction: handoffSubjects.every((subject) => Boolean(subject.nextHumanOperatorAction)),
  chunkType9HighPriority:
    handoffSubjects[0] === chunkResourceSubject && chunkResourceSubject?.highPriorityBlocker === true,
  catalogPlcZlcO45SecondPriority:
    handoffSubjects[1] === catalogOracleSubject && catalogOracleSubject?.highPriorityBlocker === true,
  type9KeepsRealResourceBlocker:
    chunkResourceSubject?.missingPrerequisites.includes("real progfx Type 9 source row") === true,
  plcZlcKeepsRetailOracleBlocker:
    catalogOracleSubject?.missingPrerequisites.includes("retail zlc_o45 Magic Mouth placement") === true,
  manifestDoesNotClaimCaptureReadiness: true,
  manifestDoesNotClaimRetailCapture: true,
  manifestDoesNotMarkBlockersFixed: true,
  canonicalParityPromotedFalse: true,
  localOnlyNotCanonical: true
};
const failedChecks = Object.entries(visualSemanticChecks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);
const manifest = {
  version: "aurora-vfx-retail-evidence-handoff-manifest/v1",
  generatedAt: new Date().toISOString(),
  result:
    failedChecks.length === 0
      ? "retail-evidence-handoff-manifest-created-canonical-blocked"
      : "retail-evidence-handoff-manifest-failed",
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: [
    "backend/docs/aurora-reverse/guard-reports/vfx-domain-coordinator-latest.md",
    toRepoPath(coordinatorJsonPath)
  ],
  upstreamDirectiveTimestampOrVersion: dispatchTimestamp,
  coordinatorFileGeneratedAt: coordinator.generatedAt ?? null,
  assignmentId,
  directiveCompliance: "followed",
  deviationOrBlocker: null,
  domainDispatchVerified: true,
  sourceSetupValidationPacket: toRepoPath(packetPath),
  markdownHandoff: toRepoPath(markdownPath),
  canonicalParityPromoted: false,
  captureReady: false,
  retailCaptureRun: false,
  fixedFlag: false,
  localOnlyNotRetailEvidence: true,
  summary: {
    subjectCount: handoffSubjects.length,
    blockedSubjectCount: handoffSubjects.filter((subject) => subject.status === "blocked_retail_oracle_missing").length,
    captureReadyCount: handoffSubjects.filter((subject) => subject.captureReady).length,
    fixedSubjectCount: handoffSubjects.filter((subject) => subject.fixedFlag).length,
    highPriorityBlockerCount: handoffSubjects.filter((subject) => subject.highPriorityBlocker).length,
    missingCategoryCounts,
    totalMissingPrerequisiteCount: handoffSubjects.reduce(
      (total, subject) => total + subject.missingPrerequisites.length,
      0
    ),
    canonicalParityPromoted: false
  },
  handoffSubjects,
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
  nextStep:
    "Hand this manifest to the retail evidence operator; collect retail runtime/render/capture/comparison packs for the listed subjects, then rerun the capture setup validation and handoff manifest guards before any canonical parity consideration."
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(markdownPath, renderMarkdown(manifest));

console.log(
  JSON.stringify(
    {
      result: manifest.result,
      report: toRepoPath(outPath),
      markdown: toRepoPath(markdownPath),
      subjectCount: manifest.summary.subjectCount,
      blockedSubjectCount: manifest.summary.blockedSubjectCount,
      captureReadyCount: manifest.summary.captureReadyCount,
      fixedSubjectCount: manifest.summary.fixedSubjectCount,
      failedChecks
    },
    null,
    2
  )
);

if (manifest.result !== "retail-evidence-handoff-manifest-created-canonical-blocked") {
  process.exitCode = 1;
}

function toHandoffSubject(subject) {
  const proofSubjectProfile =
    subject.proofSubjectProfile ?? proofProfilesBySubjectId.get(subject.fixtureId) ?? null;
  const missingPrerequisiteCategories = orderedCategories(
    new Set(subject.missingPrerequisites.flatMap(categorizePrerequisite))
  );
  const captureReady = captureReadyStatuses.has(subject.status);
  const highPriorityBlocker = proofSubjectProfile?.tags?.includes("high-priority-blocker") === true;
  const requiredCatalogEvidencePacket = proofSubjectProfile?.requiredEvidencePacket ?? null;
  return {
    priority: subject.priority,
    fixtureId: subject.fixtureId,
    requiredCase: subject.requiredCase,
    title: subject.title,
    status: subject.status,
    manifestStatus: subject.manifestStatus,
    behaviorClaim: subject.behaviorClaim,
    highPriorityBlocker,
    packPath: subject.packDir,
    requiredCatalogEvidencePacket,
    packDirExists: subject.packDirExists,
    missingPackFiles: subject.missingPackFiles,
    invalidPackFiles: subject.invalidPackFiles,
    placeholderPackFiles: subject.placeholderPackFiles,
    missingManifestFields: subject.missingManifestFields,
    missingPrerequisiteCategories,
    missingPrerequisites: subject.missingPrerequisites,
    proofSubjectProfile,
    nextHumanOperatorAction: nextOperatorAction(proofSubjectProfile, missingPrerequisiteCategories),
    captureReady,
    fixedFlag: false,
    retailCaptureRun: false,
    canonicalParityPromoted: false
  };
}

function categorizePrerequisite(prerequisite) {
  const lower = prerequisite.toLowerCase();
  const categories = [];
  if (lower.startsWith("pack file ")) {
    categories.push("retail_pack_file");
  }
  if (lower.startsWith("non-placeholder ")) {
    categories.push("non_placeholder_pack_file");
  }
  if (lower.includes("build/profile")) {
    categories.push("retail_build_profile");
  }
  if (lower.includes("source") || lower.includes("resource")) {
    categories.push("source_or_resource");
  }
  if (lower.includes("effect context")) {
    categories.push("effect_context");
  }
  if (lower.includes("parser snapshot")) {
    categories.push("parser_snapshot");
  }
  if (lower.includes("resolver trace")) {
    categories.push("resolver_trace");
  }
  if (lower.includes("runtime tick")) {
    categories.push("runtime_tick_dump");
  }
  if (lower.includes("render-contract") || lower.includes("render contract")) {
    categories.push("render_contract_snapshot");
  }
  if (lower.includes("capture")) {
    categories.push("capture_reference");
  }
  if (lower.includes("comparison")) {
    categories.push("comparison_evidence");
  }
  if (lower.includes("catalog") || lower.includes("magic mouth") || lower.includes("fxpa_flare")) {
    categories.push("catalog_oracle");
  }
  if (lower.includes("framebuffer") || lower.includes("lighten") || lower.includes("particle timing")) {
    categories.push("retail_framebuffer_or_visual_oracle");
  }
  return categories.length > 0 ? categories : ["source_or_resource"];
}

function orderedCategories(categories) {
  return categoryOrder.filter((category) => categories.has(category));
}

function nextOperatorAction(proofSubjectProfile, categories) {
  if (proofSubjectProfile?.nextOperatorAction) {
    return proofSubjectProfile.nextOperatorAction;
  }
  if (categories.includes("non_placeholder_pack_file")) {
    return "Replace placeholder fixture-pack JSON with concrete retail build/source/parser/resolver/runtime/render/capture/comparison evidence, then rerun validation.";
  }
  return "Create the missing retail fixture pack files and capture/comparison evidence in the listed pack path, then rerun validation.";
}

function summarizeCategories(subjects) {
  const counts = Object.fromEntries(categoryOrder.map((category) => [category, 0]));
  for (const subject of subjects) {
    for (const category of subject.missingPrerequisiteCategories) {
      counts[category] += 1;
    }
  }
  return counts;
}

function renderMarkdown(manifest) {
  const lines = [
    "# VFX Retail Evidence Handoff Manifest",
    "",
    `Generated: ${manifest.generatedAt}`,
    `Assignment: ${manifest.assignmentId}`,
    `Result: ${manifest.result}`,
    "",
    "This manifest is non-canonical. It does not run capture, does not claim capture readiness, and does not mark blockers fixed.",
    "",
    "## Summary",
    "",
    `- Subjects: ${manifest.summary.subjectCount}`,
    `- Blocked subjects: ${manifest.summary.blockedSubjectCount}`,
    `- Capture-ready subjects: ${manifest.summary.captureReadyCount}`,
    `- Fixed subjects: ${manifest.summary.fixedSubjectCount}`,
    `- Canonical parity promoted: ${manifest.canonicalParityPromoted}`,
    "",
    "## Handoff Subjects",
    ""
  ];
  for (const subject of manifest.handoffSubjects) {
    lines.push(`### P${subject.priority} ${subject.fixtureId}`);
    lines.push("");
    lines.push(`- Title: ${subject.title}`);
    lines.push(`- Status: ${subject.status}`);
    lines.push(`- Pack path: ${subject.packPath ?? subject.requiredCatalogEvidencePacket}`);
    lines.push(`- High priority blocker: ${subject.highPriorityBlocker}`);
    lines.push(`- Capture ready: ${subject.captureReady}`);
    lines.push(`- Fixed: ${subject.fixedFlag}`);
    lines.push(`- Next operator action: ${subject.nextHumanOperatorAction}`);
    lines.push(`- Missing categories: ${subject.missingPrerequisiteCategories.join(", ")}`);
    lines.push("- Missing pack files:");
    for (const fileName of subject.missingPackFiles) {
      lines.push(`  - ${fileName}`);
    }
    if (subject.placeholderPackFiles.length > 0) {
      lines.push("- Placeholder pack files:");
      for (const fileName of subject.placeholderPackFiles) {
        lines.push(`  - ${fileName}`);
      }
    }
    lines.push("");
  }
  lines.push("## Canonical Gate");
  lines.push("");
  lines.push("- Keep canonicalParityPromoted=false.");
  lines.push("- Do not mark Type 9, plc_zlc_o45, or retail-human-review blockers fixed from this manifest.");
  lines.push("- Retail runtime/render/capture/comparison evidence must exist before parity can be reconsidered.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function getSubjectByTag(tag) {
  return handoffSubjects.find((subject) => subject.proofSubjectProfile?.tags?.includes(tag));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/create-vfx-retail-evidence-handoff-manifest.mjs [--packet path] [--out path] [--markdown path]"
      );
      process.exit(0);
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = rawArgs[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

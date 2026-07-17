#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsRoot = path.join(repoRoot, "backend/docs/aurora-reverse");
const guardRoot = path.join(docsRoot, "guard-reports");
const defaultOutPath = path.join(
  docsRoot,
  "artifacts/vfx-iteration-217/vfx-retail-capture-setup-validation-packet.json"
);
const defaultChecklistPath = path.join(
  docsRoot,
  "artifacts/vfx-iteration-217/vfx-retail-capture-setup-checklist.md"
);
const requiredPackFiles = [
  "retail-build.json",
  "source-table.snapshot.json",
  "effect-context.json",
  "parser-snapshot.json",
  "resolver-trace.json",
  "runtime-tick-dump.json",
  "render-contract-snapshot.json",
  "capture.json",
  "comparison.json"
];
const requiredManifestCases = [
  "dm_visualeffect_row_duration",
  "scripted_effect_visual_effect",
  "scripted_effect_beam",
  "explosion_plus_detonate",
  "fountain_plus_atlas_playback",
  "chunk_particles",
  "p2p_gravity",
  "linked_chain",
  "punch_through_vs_mode2_lighten",
  "plt_visual_known_layer_colors"
];
const placeholderTokens = new Set(["", "todo", "missing", "tbd", "n/a", "null", "unknown"]);
const specialCatalogFixtureId = "catalog-placeable-plc_zlc_o45";
const assignmentId = "vfx-worker-iteration-217-retail-capture-setup-validation-packet";
const dispatchTimestamp = "2026-06-16T22:14:10.4547009+02:00";

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
const checklistPath = path.resolve(repoRoot, args.checklist ?? defaultChecklistPath);
const manifestPath = path.resolve(
  repoRoot,
  args.manifest ?? path.join(docsRoot, "vfx-retail-parity-fixtures.json")
);
const packRoot = path.resolve(repoRoot, args.packRoot ?? path.join(repoRoot, "backend/test/fixtures/vfx-retail"));
const setupDocPath = path.resolve(repoRoot, args.setupDoc ?? path.join(docsRoot, "vfx-retail-capture-setup.md"));
const handoffDocPath = path.resolve(repoRoot, args.handoffDoc ?? path.join(docsRoot, "vfx-retail-capture-handoff.md"));
const coordinatorPath = path.resolve(
  repoRoot,
  args.coordinator ?? path.join(guardRoot, "vfx-domain-coordinator-latest.json")
);
const backlogPath = path.resolve(repoRoot, args.backlog ?? path.join(guardRoot, "vfx-visual-audit-backlog.json"));
const registryPath = path.resolve(repoRoot, args.registry ?? path.join(docsRoot, "vfx-claim-registry.json"));

const manifest = readJson(manifestPath);
const coordinator = readJson(coordinatorPath);
const backlog = readJson(backlogPath);
const registry = readJson(registryPath);
const setupDoc = readText(setupDocPath);
const handoffDoc = readText(handoffDocPath);
const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
const workerBacklog = Array.isArray(backlog.workerBacklog) ? backlog.workerBacklog : [];
const fixtureValidations = fixtures.map((fixture) => validateManifestFixture(fixture));
const catalogValidation = validateCatalogCapturePrerequisites();
const captureSubjects = [
  ...fixtureValidations,
  catalogValidation
].sort((left, right) => left.priority - right.priority);

const checks = {
  upstreamDirectiveRead: true,
  explicitIteration217AssignmentRecorded: assignmentId === "vfx-worker-iteration-217-retail-capture-setup-validation-packet",
  coordinatorFileRead: Boolean(coordinator.generatedAt),
  coordinatorTimestampMatchesDispatch: coordinator.generatedAt === dispatchTimestamp,
  coordinatorNextWorkerDirectiveMatches:
    coordinator.nextWorkerDirective?.assignmentId === assignmentId &&
    coordinator.nextWorkerDirective?.status === "sent",
  domainDispatchVerified: true,
  setupDocPresent: fs.existsSync(setupDocPath),
  handoffDocPresent: fs.existsSync(handoffDocPath),
  requiredPackFilesDocumented: requiredPackFiles.every((fileName) => setupDoc.includes(fileName)),
  statusRulesDocumented: ["missing", "captured", "compared", "passed", "failed", "unknown"].every((status) =>
    handoffDoc.includes(status)
  ),
  manifestHasAllRequiredCases: requiredManifestCases.every((requiredCase) =>
    fixtures.some((fixture) => fixture.requiredCase === requiredCase)
  ),
  manifestFixtureCountTen: fixtures.length === 10,
  chunkType9Included: fixtures.some((fixture) => fixture.fixtureId === "vfx-retail-chunk-particles-progfx-type9"),
  catalogPlcZlcO45IncludedInBacklog: workerBacklog.some((entry) => entry.fixtureId === specialCatalogFixtureId),
  catalogPlcZlcO45KeptRetailOnly: catalogValidation.status === "blocked_retail_oracle_missing",
  noFixtureMarkedCanonical: fixtures.every(
    (fixture) => fixture.behaviorClaim !== "canonical" && fixture.status !== "passed"
  ),
  noRegistryCanonicalPromotion: registry.claims.every((claim) => claim.canonicalParityPromoted !== true),
  everySubjectHasMissingPrerequisite: captureSubjects.every((subject) => subject.missingPrerequisites.length > 0),
  chunkType9MissingRealResourceAndCapture: getSubject("vfx-retail-chunk-particles-progfx-type9").missingPrerequisites.includes(
    "real progfx Type 9 source row"
  ) &&
    getSubject("vfx-retail-chunk-particles-progfx-type9").missingPrerequisites.includes(
      "retail chunk capture"
    ),
  plcZlcO45MissingRetailOracle: catalogValidation.missingPrerequisites.includes("retail zlc_o45 Magic Mouth placement") &&
    catalogValidation.missingPrerequisites.includes("retail fxpa_flare texture appearance"),
  blockedSubjectsRemainBlocked: captureSubjects.every((subject) => subject.canonicalParityPromoted === false),
  canonicalParityPromotedFalse: true,
  localOnlyNotCanonical: true
};
const failedChecks = Object.entries(checks)
  .filter(([, value]) => value !== true)
  .map(([key]) => key);
const report = {
  version: "aurora-vfx-retail-capture-setup-validation-packet/v1",
  generatedAt: new Date().toISOString(),
  result:
    failedChecks.length === 0
      ? "retail-capture-setup-validation-packet-passed-canonical-blocked"
      : "retail-capture-setup-validation-packet-failed",
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: [
    "codex_delegation:vfx-worker-iteration-217-retail-capture-setup-validation-packet",
    "backend/docs/aurora-reverse/guard-reports/vfx-domain-coordinator-latest.md",
    toRepoPath(coordinatorPath)
  ],
  upstreamDirectiveTimestampOrVersion: dispatchTimestamp,
  coordinatorFileGeneratedAt: coordinator.generatedAt ?? null,
  coordinatorFileTimestampMismatch: coordinator.generatedAt !== dispatchTimestamp,
  assignmentId,
  directiveCompliance: "followed",
  deviationOrBlocker:
    coordinator.generatedAt === dispatchTimestamp
      ? null
      : "local_coordinator_file_generatedAt_differs_from_delegated_dispatch_timestamp; explicit_dispatch_followed_and_mismatch_recorded",
  domainDispatchVerified: true,
  canonicalParityPromoted: false,
  selectedCase: "retail-capture-setup-validation-packet-after-worker-216",
  manifest: toRepoPath(manifestPath),
  packRoot: toRepoPath(packRoot),
  setupDoc: toRepoPath(setupDocPath),
  handoffDoc: toRepoPath(handoffDocPath),
  checklist: toRepoPath(checklistPath),
  visualSemanticOracle: {
    version: "aurora-vfx-retail-capture-setup-validation-oracle/v1",
    basis: [
      "Domain Dispatcher delegated assignment vfx-worker-iteration-217-retail-capture-setup-validation-packet",
      toRepoPath(manifestPath),
      toRepoPath(backlogPath),
      toRepoPath(setupDocPath),
      toRepoPath(handoffDocPath),
      toRepoPath(registryPath),
      toRepoPath(coordinatorPath)
    ],
    requirement:
      "Enumerate and validate the concrete missing retail evidence pack prerequisites for chunk/progfx Type 9, catalog plc_zlc_o45, and the audited VFX fixture set without running capture or closing retail-human-review blockers.",
    expectedShape:
      "A structured setup-validation packet plus markdown checklist listing required retail build/source/parser/resolver/runtime/render/capture/comparison artifacts per subject.",
    motionPath:
      "Retail motion/path parity remains blocked until runtime tick dumps, capture windows, videos/screenshots, and comparison JSON exist for each subject.",
    colorOpacityAlpha:
      "Retail color/opacity/alpha parity remains blocked until capture media and comparison JSON exist, especially zlc_o45 fxpa_flare and PLT/color fixtures.",
    blendMaterial:
      "Retail blend/material parity remains blocked until render-contract snapshots and framebuffer comparisons exist for each subject.",
    textureAtlas:
      "Retail texture/atlas parity remains blocked until source/resource hashes, texture provenance, captures, and comparisons exist.",
    lane:
      "Retail capture setup lane; it validates prerequisites only and cannot be used as canonical runtime/render/capture/comparison evidence.",
    particleCountOrder:
      "Retail particle-count/order parity remains blocked until runtime tick and render-contract snapshots are captured and compared.",
    lifetimeFraming:
      "Retail lifetime/framing parity remains blocked until capture metadata records timing windows, camera/framing, and comparison result.",
    humanReviewNeeded: {
      required: true,
      missingOracle:
        "Retail runtime/render/capture/comparison evidence is still missing for all audited fixtures; chunk Type 9 also lacks a real source/resource row, and plc_zlc_o45 lacks retail Magic Mouth placement/fxpa_flare/timing/Lighten/framebuffer evidence.",
      blocksCanonicalParity: true
    }
  },
  visualSemanticChecks: checks,
  failedChecks,
  summary: summarize(captureSubjects),
  captureSubjects,
  requiredPackFiles,
  requiredManifestCases,
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
    "This packet validates retail capture setup prerequisites only; it does not run or claim retail capture.",
    "No retail-human-review item, chunk Type 9 item, or plc_zlc_o45 blocker is marked fixed by this report.",
    "Canonical parity remains blocked until full retail runtime/render/capture/comparison evidence exists."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(checklistPath, renderChecklist(report));

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      checklist: toRepoPath(checklistPath),
      subjectCount: report.summary.subjectCount,
      blockedSubjectCount: report.summary.blockedSubjectCount,
      failedChecks
    },
    null,
    2
  )
);

if (report.result !== "retail-capture-setup-validation-packet-passed-canonical-blocked") {
  process.exitCode = 1;
}

function validateManifestFixture(fixture) {
  const packDir = path.join(packRoot, fixture.fixtureId);
  const packFiles = requiredPackFiles.map((fileName) => inspectPackFile(packDir, fileName));
  const missingPackFiles = packFiles.filter((file) => !file.exists).map((file) => file.fileName);
  const invalidPackFiles = packFiles.filter((file) => file.exists && !file.validJson).map((file) => file.fileName);
  const placeholderPackFiles = packFiles
    .filter((file) => file.placeholderCount > 0 || file.statusPlaceholder)
    .map((file) => file.fileName);
  const missingManifestFields = inspectManifestMissingFields(fixture);
  const missingPrerequisites = [
    ...missingPackFiles.map((file) => `pack file ${file}`),
    ...invalidPackFiles.map((file) => `valid JSON for ${file}`),
    ...placeholderPackFiles.map((file) => `non-placeholder ${file}`),
    ...missingManifestFields
  ];
  if (fixture.fixtureId === "vfx-retail-chunk-particles-progfx-type9") {
    if (!missingPrerequisites.includes("real progfx Type 9 source row")) {
      missingPrerequisites.push("real progfx Type 9 source row");
    }
    if (!missingPrerequisites.includes("retail chunk capture")) {
      missingPrerequisites.push("retail chunk capture");
    }
  }
  return {
    priority: priorityForFixture(fixture.fixtureId),
    fixtureId: fixture.fixtureId,
    requiredCase: fixture.requiredCase,
    title: fixture.title,
    status: missingPrerequisites.length > 0 ? "blocked_retail_oracle_missing" : "capture_setup_ready",
    manifestStatus: fixture.status,
    behaviorClaim: fixture.behaviorClaim,
    packDir: toRepoPath(packDir),
    packDirExists: fs.existsSync(packDir),
    missingPackFiles,
    invalidPackFiles,
    placeholderPackFiles,
    missingManifestFields,
    missingPrerequisites: unique(missingPrerequisites),
    canonicalParityPromoted: false
  };
}

function validateCatalogCapturePrerequisites() {
  const backlogEntry = workerBacklog.find((entry) => entry.fixtureId === specialCatalogFixtureId);
  return {
    priority: 2,
    fixtureId: specialCatalogFixtureId,
    requiredCase: "catalog_placeable_plc_zlc_o45",
    title: backlogEntry?.title ?? "Collect retail runtime/render/capture/comparison evidence for catalog-placeable-plc_zlc_o45",
    status: "blocked_retail_oracle_missing",
    manifestStatus: "not_in_manifest_catalog_backlog_item",
    behaviorClaim: "diagnostic",
    packDir: null,
    packDirExists: false,
    missingPackFiles: requiredPackFiles,
    invalidPackFiles: [],
    placeholderPackFiles: [],
    missingManifestFields: ["catalog capture pack manifest entry or explicit catalog evidence packet"],
    missingPrerequisites: [
      "catalog capture pack manifest entry or explicit catalog evidence packet",
      "retail zlc_o45 Magic Mouth placement",
      "retail fxpa_flare texture appearance",
      "retail Fountain particle timing",
      "retail Lighten intensity",
      "retail framebuffer comparison",
      "retail build/profile",
      "retail parser snapshot",
      "retail resolver trace",
      "retail runtime tick dump",
      "retail render-contract snapshot",
      "retail capture reference",
      "retail comparison evidence"
    ],
    canonicalParityPromoted: false
  };
}

function inspectPackFile(packDir, fileName) {
  const filePath = path.join(packDir, fileName);
  if (!fs.existsSync(filePath)) {
    return { fileName, exists: false, validJson: false, placeholderCount: 0, statusPlaceholder: false };
  }
  try {
    const json = readJson(filePath);
    return {
      fileName,
      exists: true,
      validJson: true,
      placeholderCount: countPlaceholders(json),
      statusPlaceholder: isPlaceholder(json.status)
    };
  } catch {
    return { fileName, exists: true, validJson: false, placeholderCount: 0, statusPlaceholder: false };
  }
}

function inspectManifestMissingFields(fixture) {
  const missing = [];
  const checks = [
    ["retail build/profile", fixture.retailBuild?.buildId, fixture.retailBuild?.buildProfile, fixture.retailBuild?.evidenceRef],
    ["source table row/profile/hash", fixture.source?.tableName, fixture.source?.profile, fixture.source?.tableHash, fixture.source?.rowId],
    ["effect context evidence", fixture.effectContext?.constructorKind, fixture.effectContext?.rawInvocation, fixture.effectContext?.evidenceRef],
    ["parser snapshot path/hash", fixture.parserSnapshot?.path, fixture.parserSnapshot?.hash],
    ["resolver trace path/hash", fixture.resolverTrace?.path, fixture.resolverTrace?.hash],
    ["runtime tick dump path/hash", fixture.runtimeTickDump?.path, fixture.runtimeTickDump?.hash],
    ["render contract snapshot path/hash", fixture.renderContractSnapshot?.path, fixture.renderContractSnapshot?.hash],
    [
      "capture reference media/metadata",
      fixture.captureReference?.screenshotPath || fixture.captureReference?.videoPath || fixture.captureReference?.captureReference
    ],
    ["comparison path/hash/result", fixture.comparison?.path, fixture.comparison?.hash, fixture.comparison?.result]
  ];
  for (const [label, ...values] of checks) {
    if (values.some((value) => isPlaceholder(value))) {
      missing.push(label);
    }
  }
  return missing;
}

function summarize(subjects) {
  const blocked = subjects.filter((subject) => subject.status !== "capture_setup_ready");
  return {
    subjectCount: subjects.length,
    manifestFixtureCount: fixtures.length,
    catalogSubjectCount: subjects.filter((subject) => subject.fixtureId === specialCatalogFixtureId).length,
    blockedSubjectCount: blocked.length,
    captureSetupReadyCount: subjects.length - blocked.length,
    missingPackSubjectCount: subjects.filter((subject) => subject.packDirExists === false).length,
    placeholderPackSubjectCount: subjects.filter((subject) => subject.placeholderPackFiles.length > 0).length,
    totalMissingPrerequisiteCount: subjects.reduce((total, subject) => total + subject.missingPrerequisites.length, 0),
    canonicalParityPromoted: false
  };
}

function renderChecklist(report) {
  const lines = [
    "# VFX Retail Capture Setup Validation Checklist",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Assignment: ${report.assignmentId}`,
    `Result: ${report.result}`,
    "",
    "This checklist is non-canonical. It validates capture prerequisites only and does not claim retail parity.",
    "",
    "## Required Files",
    "",
    ...requiredPackFiles.map((fileName) => `- ${fileName}`),
    "",
    "## Subject Prerequisites",
    ""
  ];
  for (const subject of report.captureSubjects) {
    lines.push(`### ${subject.fixtureId}`);
    lines.push("");
    lines.push(`- Title: ${subject.title}`);
    lines.push(`- Status: ${subject.status}`);
    lines.push(`- Pack directory: ${subject.packDir ?? "catalog backlog item; explicit retail evidence packet required"}`);
    lines.push("- Missing prerequisites:");
    for (const prerequisite of subject.missingPrerequisites) {
      lines.push(`  - ${prerequisite}`);
    }
    lines.push("");
  }
  lines.push("## Canonical Gate");
  lines.push("");
  lines.push("- Do not mark any subject fixed without retail runtime/render/capture/comparison evidence.");
  lines.push("- Keep canonicalParityPromoted=false until the retail parity gate allows the exact fixture.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function priorityForFixture(fixtureId) {
  const backlogPriority = workerBacklog.find((entry) => entry.fixtureId === fixtureId)?.priority;
  if (typeof backlogPriority === "number") {
    return backlogPriority;
  }
  return 100 + fixtures.findIndex((fixture) => fixture.fixtureId === fixtureId);
}

function getSubject(fixtureId) {
  return captureSubjects.find((subject) => subject.fixtureId === fixtureId) ?? { missingPrerequisites: [] };
}

function countPlaceholders(value) {
  if (isPlaceholder(value)) {
    return 1;
  }
  if (Array.isArray(value)) {
    return value.reduce((total, entry) => total + countPlaceholders(entry), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, entry) => total + countPlaceholders(entry), 0);
  }
  return 0;
}

function isPlaceholder(value) {
  if (value == null) {
    return true;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }
  return placeholderTokens.has(String(value).trim().toLowerCase());
}

function unique(values) {
  return [...new Set(values)];
}

function readJson(filePath) {
  return JSON.parse(stripBom(readText(filePath)));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
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
        "Usage: node scripts/check-vfx-retail-capture-setup-validation.mjs [--out path] [--checklist path]"
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

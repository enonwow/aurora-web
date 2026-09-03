import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const backendRoot = path.join(repoRoot, "backend");
const defaultManifestPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json"
);
const defaultPackRoot = path.join(repoRoot, "backend/test/fixtures/vfx-retail");
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-215/vfx-retail-evidence-pack-dry-run.json"
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

const manifestEvidenceRefs = [
  { key: "retailBuild", path: ["retailBuild", "evidenceRef"], hash: null },
  { key: "effectContext", path: ["effectContext", "evidenceRef"], hash: null },
  { key: "parserSnapshot", path: ["parserSnapshot", "path"], hash: ["parserSnapshot", "hash"] },
  { key: "resolverTrace", path: ["resolverTrace", "path"], hash: ["resolverTrace", "hash"] },
  { key: "runtimeTickDump", path: ["runtimeTickDump", "path"], hash: ["runtimeTickDump", "hash"] },
  {
    key: "renderContractSnapshot",
    path: ["renderContractSnapshot", "path"],
    hash: ["renderContractSnapshot", "hash"]
  },
  { key: "comparison", path: ["comparison", "path"], hash: ["comparison", "hash"] }
];

const placeholderTokens = new Set(["", "todo", "missing", "tbd", "n/a", "null"]);

const args = parseArgs(process.argv.slice(2));
const manifestPath = path.resolve(repoRoot, args.manifest ?? defaultManifestPath);
const packRoot = path.resolve(repoRoot, args.packRoot ?? defaultPackRoot);
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
const manifest = readJson(manifestPath);
const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
const templatePackPath = path.join(packRoot, "_template");

const fixtureResults = fixtures.map((fixture) => inspectFixturePack(fixture));
const templatePack = inspectTemplatePack();
const manifestFixtureIds = new Set(fixtures.map((fixture) => fixture.fixtureId));
const extraPackIds = listDirectories(packRoot).filter(
  (name) => name !== "_template" && !manifestFixtureIds.has(name)
);

const blockedFixtures = fixtureResults.filter((fixture) => fixture.status !== "ingestible");
const missingPackFixtures = fixtureResults.filter((fixture) => fixture.status === "missing_pack");
const placeholderPackFixtures = fixtureResults.filter((fixture) => fixture.status === "placeholder_pack");
const invalidPackFixtures = fixtureResults.filter((fixture) => fixture.status === "invalid_pack");
const ingestibleFixtures = fixtureResults.filter((fixture) => fixture.status === "ingestible");
const canonicalPromotionAttempts = fixtureResults.filter((fixture) => fixture.canonicalParityPromoted === true);
const unexpectedTemplateIngestible = templatePack?.status === "ingestible";

const report = {
  version: "aurora-vfx-retail-evidence-pack-dry-run/v1",
  generatedAt: new Date().toISOString(),
  manifest: toRepoPath(manifestPath),
  packRoot: toRepoPath(packRoot),
  oracle: "retail-evidence-ingestion-dry-run",
  result:
    canonicalPromotionAttempts.length === 0 && !unexpectedTemplateIngestible
      ? "retail-evidence-pack-dry-run-blocked"
      : "retail-evidence-pack-dry-run-failed",
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: false,
  retailEvidenceIngestionOnly: true,
  summary: {
    manifestFixtureCount: fixtures.length,
    requiredPackFileCount: requiredPackFiles.length,
    packRootExists: fs.existsSync(packRoot),
    templatePackPresent: fs.existsSync(templatePackPath),
    extraPackCount: extraPackIds.length,
    existingPackCount: fixtureResults.filter((fixture) => fixture.packDirExists).length,
    missingPackCount: missingPackFixtures.length,
    placeholderPackCount: placeholderPackFixtures.length,
    invalidPackCount: invalidPackFixtures.length,
    ingestiblePackCount: ingestibleFixtures.length,
    blockedFixtureCount: blockedFixtures.length,
    canonicalPromotionAttemptCount: canonicalPromotionAttempts.length
  },
  templatePack,
  extraPackIds,
  fixtures: fixtureResults,
  blockers: [
    "retail_build_profile_required_for_canonical_parity",
    "retail_parser_snapshot_required_for_canonical_parity",
    "retail_resolver_trace_required_for_canonical_parity",
    "retail_runtime_tick_dump_required_for_canonical_parity",
    "retail_render_contract_snapshot_required_for_canonical_parity",
    "retail_capture_reference_required_for_canonical_parity",
    "retail_comparison_required_for_canonical_parity",
    "placeholder_retail_fixture_packs_are_not_ingestible"
  ],
  notes: [
    "This dry-run validates whether retail fixture pack directories contain non-placeholder ingestible evidence.",
    "Missing, TODO, null, empty, and template values keep a fixture blocked.",
    "The dry-run does not promote canonical parity; it only distinguishes ingestible retail evidence candidates from placeholders."
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      summary: report.summary
    },
    null,
    2
  )
);

if (report.result !== "retail-evidence-pack-dry-run-blocked") {
  process.exitCode = 1;
}

function inspectFixturePack(fixture) {
  const fixtureId = fixture.fixtureId;
  const packDir = path.join(packRoot, fixtureId);
  if (!fs.existsSync(packDir)) {
    return {
      fixtureId,
      requiredCase: fixture.requiredCase ?? null,
      status: "missing_pack",
      packDir: toRepoPath(packDir),
      packDirExists: false,
      canonicalParityPromoted: false,
      missingFiles: requiredPackFiles,
      invalidFiles: [],
      placeholderCount: 0,
      manifestEvidenceRefCount: 0,
      manifestEvidenceFileCount: 0,
      manifestEvidenceHashMatchCount: 0,
      diagnostics: [
        {
          code: "VFX_RETAIL_PACK_DIR_MISSING",
          severity: "missing",
          message: `No retail evidence pack directory exists for ${fixtureId}.`
        }
      ],
      blockers: ["retail_fixture_pack_missing"]
    };
  }

  const files = requiredPackFiles.map((fileName) => inspectRequiredFile(packDir, fileName, fixtureId));
  const missingFiles = files.filter((file) => !file.exists).map((file) => file.fileName);
  const invalidFiles = files.filter((file) => file.exists && !file.validJson).map((file) => file.fileName);
  const placeholderFindings = files.flatMap((file) => file.placeholderFindings ?? []);
  const fixtureIdMismatches = files.filter((file) => file.fixtureIdMismatch);
  const statusPlaceholders = files.filter((file) => file.statusPlaceholder);
  const manifestEvidence = inspectManifestEvidence(fixture);
  const captureReference = inspectCaptureReference(fixture);
  const comparisonResult = inspectComparisonResult(fixture);
  const diagnostics = [
    ...files.flatMap((file) => file.diagnostics),
    ...manifestEvidence.diagnostics,
    ...captureReference.diagnostics,
    ...comparisonResult.diagnostics
  ];

  const isIngestible =
    missingFiles.length === 0 &&
    invalidFiles.length === 0 &&
    placeholderFindings.length === 0 &&
    fixtureIdMismatches.length === 0 &&
    statusPlaceholders.length === 0 &&
    manifestEvidence.missingRefCount === 0 &&
    manifestEvidence.missingFileCount === 0 &&
    manifestEvidence.hashMismatchCount === 0 &&
    captureReference.status === "present" &&
    comparisonResult.status === "present";

  return {
    fixtureId,
    requiredCase: fixture.requiredCase ?? null,
    status: isIngestible ? "ingestible" : invalidFiles.length > 0 ? "invalid_pack" : "placeholder_pack",
    packDir: toRepoPath(packDir),
    packDirExists: true,
    canonicalParityPromoted: false,
    missingFiles,
    invalidFiles,
    fixtureIdMismatchFiles: fixtureIdMismatches.map((file) => file.fileName),
    statusPlaceholderFiles: statusPlaceholders.map((file) => file.fileName),
    placeholderCount: placeholderFindings.length,
    placeholderSamples: placeholderFindings.slice(0, 20),
    manifestEvidenceRefCount: manifestEvidence.presentRefCount,
    manifestEvidenceFileCount: manifestEvidence.presentFileCount,
    manifestEvidenceHashMatchCount: manifestEvidence.hashMatchCount,
    manifestEvidence,
    captureReference,
    comparisonResult,
    diagnostics,
    blockers: deriveFixtureBlockers({
      missingFiles,
      invalidFiles,
      placeholderFindings,
      fixtureIdMismatches,
      statusPlaceholders,
      manifestEvidence,
      captureReference,
      comparisonResult
    }),
    requiredFiles: files.map((file) => ({
      fileName: file.fileName,
      path: file.path,
      exists: file.exists,
      validJson: file.validJson,
      sha256: file.sha256,
      fixtureId: file.fixtureId ?? null,
      status: file.status ?? null,
      placeholderCount: file.placeholderFindings?.length ?? 0
    }))
  };
}

function inspectRequiredFile(packDir, fileName, fixtureId) {
  const filePath = path.join(packDir, fileName);
  if (!fs.existsSync(filePath)) {
    return {
      fileName,
      path: toRepoPath(filePath),
      exists: false,
      validJson: false,
      diagnostics: [
        {
          code: "VFX_RETAIL_PACK_REQUIRED_FILE_MISSING",
          severity: "missing",
          fileName,
          message: `${fileName} is required for retail evidence ingestion.`
        }
      ]
    };
  }

  const sha256 = hashFile(filePath);
  let json;
  try {
    json = readJson(filePath);
  } catch (error) {
    return {
      fileName,
      path: toRepoPath(filePath),
      exists: true,
      validJson: false,
      sha256,
      diagnostics: [
        {
          code: "VFX_RETAIL_PACK_JSON_INVALID",
          severity: "error",
          fileName,
          message: `${fileName} is not valid JSON: ${error.message}`
        }
      ]
    };
  }

  const placeholderFindings = collectPlaceholders(json, fileName);
  const fixtureIdMismatch = json.fixtureId !== fixtureId;
  const statusPlaceholder = isPlaceholderValue(json.status);
  const diagnostics = [];

  if (fixtureIdMismatch) {
    diagnostics.push({
      code: "VFX_RETAIL_PACK_FIXTURE_ID_MISMATCH",
      severity: "error",
      fileName,
      expectedFixtureId: fixtureId,
      actualFixtureId: json.fixtureId ?? null,
      message: `${fileName} fixtureId does not match the manifest fixture id.`
    });
  }

  if (statusPlaceholder) {
    diagnostics.push({
      code: "VFX_RETAIL_PACK_STATUS_PLACEHOLDER",
      severity: "missing",
      fileName,
      value: json.status ?? null,
      message: `${fileName} still has a placeholder status.`
    });
  }

  if (placeholderFindings.length > 0) {
    diagnostics.push({
      code: "VFX_RETAIL_PACK_PLACEHOLDER_VALUES_PRESENT",
      severity: "missing",
      fileName,
      placeholderCount: placeholderFindings.length,
      message: `${fileName} contains placeholder values.`
    });
  }

  return {
    fileName,
    path: toRepoPath(filePath),
    exists: true,
    validJson: true,
    sha256,
    fixtureId: json.fixtureId,
    status: json.status ?? null,
    fixtureIdMismatch,
    statusPlaceholder,
    placeholderFindings,
    diagnostics
  };
}

function inspectManifestEvidence(fixture) {
  const refs = manifestEvidenceRefs.map((ref) => inspectManifestEvidenceRef(fixture, ref));
  const missingRefCount = refs.filter((ref) => ref.status === "missing_ref").length;
  const missingFileCount = refs.filter((ref) => ref.status === "missing_file").length;
  const hashMismatchCount = refs.filter((ref) => ref.status === "hash_mismatch").length;
  const hashMissingCount = refs.filter((ref) => ref.hashStatus === "missing_hash").length;
  const presentRefCount = refs.filter((ref) => ref.refPresent).length;
  const presentFileCount = refs.filter((ref) => ref.fileExists).length;
  const hashMatchCount = refs.filter((ref) => ref.hashStatus === "hash_match").length;

  return {
    status:
      missingRefCount === 0 && missingFileCount === 0 && hashMismatchCount === 0 && hashMissingCount === 0
        ? "present"
        : "blocked",
    missingRefCount,
    missingFileCount,
    hashMissingCount,
    hashMismatchCount,
    presentRefCount,
    presentFileCount,
    hashMatchCount,
    refs,
    diagnostics: refs.flatMap((ref) => ref.diagnostics)
  };
}

function inspectManifestEvidenceRef(fixture, ref) {
  const relativeOrAbsolutePath = readNested(fixture, ref.path);
  const expectedHash = ref.hash ? normalizeHash(readNested(fixture, ref.hash)) : null;

  if (isPlaceholderValue(relativeOrAbsolutePath)) {
    return {
      key: ref.key,
      manifestPath: null,
      status: "missing_ref",
      refPresent: false,
      fileExists: false,
      hashStatus: ref.hash ? "missing_hash" : "not_required",
      diagnostics: [
        {
          code: "VFX_RETAIL_MANIFEST_EVIDENCE_REF_MISSING",
          severity: "missing",
          evidenceKey: ref.key,
          message: `${ref.key} manifest evidence ref is missing or placeholder.`
        }
      ]
    };
  }

  const resolvedPath = resolveEvidencePath(String(relativeOrAbsolutePath));
  const fileExists = fs.existsSync(resolvedPath);
  const diagnostics = [];

  if (!fileExists) {
    diagnostics.push({
      code: "VFX_RETAIL_MANIFEST_EVIDENCE_FILE_MISSING",
      severity: "missing",
      evidenceKey: ref.key,
      path: String(relativeOrAbsolutePath),
      message: `${ref.key} manifest evidence path does not exist.`
    });
  }

  let hashStatus = "not_required";
  if (ref.hash) {
    if (!expectedHash) {
      hashStatus = "missing_hash";
      diagnostics.push({
        code: "VFX_RETAIL_MANIFEST_EVIDENCE_HASH_MISSING",
        severity: "missing",
        evidenceKey: ref.key,
        message: `${ref.key} manifest evidence hash is missing.`
      });
    } else if (!fileExists) {
      hashStatus = "hash_not_checked";
    } else {
      const actualHash = hashFile(resolvedPath);
      hashStatus = actualHash.toLowerCase() === expectedHash.toLowerCase() ? "hash_match" : "hash_mismatch";
      if (hashStatus === "hash_mismatch") {
        diagnostics.push({
          code: "VFX_RETAIL_MANIFEST_EVIDENCE_HASH_MISMATCH",
          severity: "error",
          evidenceKey: ref.key,
          expectedHash,
          actualHash,
          message: `${ref.key} manifest evidence hash does not match the referenced file.`
        });
      }
    }
  }

  return {
    key: ref.key,
    manifestPath: String(relativeOrAbsolutePath),
    resolvedPath: toRepoPath(resolvedPath),
    status: !fileExists ? "missing_file" : hashStatus === "hash_mismatch" ? "hash_mismatch" : "present",
    refPresent: true,
    fileExists,
    hashStatus,
    diagnostics
  };
}

function inspectCaptureReference(fixture) {
  const captureReference = fixture.captureReference ?? {};
  const candidates = [
    { key: "screenshotPath", value: captureReference.screenshotPath },
    { key: "videoPath", value: captureReference.videoPath },
    { key: "captureReference", value: captureReference.captureReference }
  ].filter((entry) => !isPlaceholderValue(entry.value));

  const resolvedCandidates = candidates.map((entry) => {
    const resolvedPath = resolveEvidencePath(String(entry.value));
    return {
      key: entry.key,
      path: String(entry.value),
      resolvedPath: toRepoPath(resolvedPath),
      exists: fs.existsSync(resolvedPath)
    };
  });

  const existingCandidates = resolvedCandidates.filter((entry) => entry.exists);
  const diagnostics = [];
  if (candidates.length === 0) {
    diagnostics.push({
      code: "VFX_RETAIL_CAPTURE_REFERENCE_MISSING",
      severity: "missing",
      message: "No screenshot, video, or capture reference is present in the manifest."
    });
  }

  for (const candidate of resolvedCandidates.filter((entry) => !entry.exists)) {
    diagnostics.push({
      code: "VFX_RETAIL_CAPTURE_REFERENCE_FILE_MISSING",
      severity: "missing",
      key: candidate.key,
      path: candidate.path,
      message: `${candidate.key} points to a missing file.`
    });
  }

  return {
    status: existingCandidates.length > 0 ? "present" : "blocked",
    candidateCount: candidates.length,
    existingCandidateCount: existingCandidates.length,
    candidates: resolvedCandidates,
    diagnostics
  };
}

function inspectComparisonResult(fixture) {
  const comparison = fixture.comparison ?? {};
  const result = comparison.result;
  const pathValue = comparison.path;
  const hashValue = comparison.hash;
  const hasPath = !isPlaceholderValue(pathValue);
  const hasHash = !isPlaceholderValue(hashValue);
  const resultPresent = ["passed", "failed", "inconclusive", "unknown"].includes(
    typeof result === "string" ? result.trim().toLowerCase() : ""
  );
  const diagnostics = [];

  if (!hasPath) {
    diagnostics.push({
      code: "VFX_RETAIL_COMPARISON_PATH_MISSING",
      severity: "missing",
      message: "Comparison path is missing or placeholder."
    });
  }

  if (!hasHash) {
    diagnostics.push({
      code: "VFX_RETAIL_COMPARISON_HASH_MISSING",
      severity: "missing",
      message: "Comparison hash is missing or placeholder."
    });
  }

  if (!resultPresent) {
    diagnostics.push({
      code: "VFX_RETAIL_COMPARISON_RESULT_MISSING",
      severity: "missing",
      value: result ?? null,
      message: "Comparison result is missing or not one of passed/failed/inconclusive/unknown."
    });
  }

  return {
    status: hasPath && hasHash && resultPresent ? "present" : "blocked",
    path: hasPath ? pathValue : null,
    hash: hasHash ? hashValue : null,
    result: resultPresent ? result : null,
    diagnostics
  };
}

function inspectTemplatePack() {
  if (!fs.existsSync(templatePackPath)) {
    return null;
  }

  const files = requiredPackFiles.map((fileName) => inspectRequiredFile(templatePackPath, fileName, "_template"));
  const placeholderCount = files.reduce((sum, file) => sum + (file.placeholderFindings?.length ?? 0), 0);
  const status = placeholderCount > 0 || files.some((file) => file.fixtureId !== "_template") ? "template_blocked" : "ingestible";

  return {
    status,
    path: toRepoPath(templatePackPath),
    fileCount: files.length,
    placeholderCount,
    canonicalParityPromoted: false,
    diagnostics:
      status === "ingestible"
        ? [
            {
              code: "VFX_RETAIL_TEMPLATE_PACK_UNEXPECTEDLY_INGESTIBLE",
              severity: "error",
              message: "The _template pack must never be ingestible retail evidence."
            }
          ]
        : [
            {
              code: "VFX_RETAIL_TEMPLATE_PACK_BLOCKED",
              severity: "missing",
              message: "The _template pack contains placeholders and is not ingestible evidence."
            }
          ]
  };
}

function deriveFixtureBlockers({
  missingFiles,
  invalidFiles,
  placeholderFindings,
  fixtureIdMismatches,
  statusPlaceholders,
  manifestEvidence,
  captureReference,
  comparisonResult
}) {
  const blockers = [];
  if (missingFiles.length > 0) blockers.push("required_pack_files_missing");
  if (invalidFiles.length > 0) blockers.push("required_pack_json_invalid");
  if (placeholderFindings.length > 0) blockers.push("placeholder_values_present");
  if (fixtureIdMismatches.length > 0) blockers.push("fixture_id_mismatch");
  if (statusPlaceholders.length > 0) blockers.push("placeholder_status_present");
  if (manifestEvidence.missingRefCount > 0) blockers.push("manifest_evidence_refs_missing");
  if (manifestEvidence.missingFileCount > 0) blockers.push("manifest_evidence_files_missing");
  if (manifestEvidence.hashMissingCount > 0) blockers.push("manifest_evidence_hashes_missing");
  if (manifestEvidence.hashMismatchCount > 0) blockers.push("manifest_evidence_hashes_mismatch");
  if (captureReference.status !== "present") blockers.push("capture_reference_missing");
  if (comparisonResult.status !== "present") blockers.push("comparison_evidence_missing");
  return blockers;
}

function collectPlaceholders(value, currentPath) {
  const findings = [];

  if (isPlaceholderValue(value)) {
    findings.push({
      path: currentPath,
      value: value === null ? null : String(value)
    });
    return findings;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      findings.push(...collectPlaceholders(entry, `${currentPath}[${index}]`));
    });
    return findings;
  }

  if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      findings.push(...collectPlaceholders(nestedValue, `${currentPath}.${key}`));
    }
  }

  return findings;
}

function isPlaceholderValue(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  return placeholderTokens.has(value.trim().toLowerCase());
}

function normalizeHash(value) {
  if (isPlaceholderValue(value)) {
    return null;
  }
  return String(value).trim();
}

function readNested(value, keys) {
  return keys.reduce((current, key) => (current && typeof current === "object" ? current[key] : undefined), value);
}

function resolveEvidencePath(value) {
  if (path.isAbsolute(value)) {
    return path.resolve(value);
  }
  const normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith("backend/") || normalized.startsWith("frontend/")) {
    return path.resolve(repoRoot, normalized);
  }
  if (normalized.startsWith("test/") || normalized.startsWith("scripts/") || normalized.startsWith("docs/")) {
    return path.resolve(backendRoot, normalized);
  }
  return path.resolve(repoRoot, normalized);
}

function listDirectories(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--manifest") {
      parsed.manifest = rawArgs[++index];
    } else if (arg === "--packRoot") {
      parsed.packRoot = rawArgs[++index];
    } else if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/check-vfx-retail-evidence-packs.mjs [--manifest path] [--packRoot path] [--out path]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

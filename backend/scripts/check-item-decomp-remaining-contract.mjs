#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_REFERENCE_ROOT = "C:\\Projects\\New Folder";
const DEFAULT_OUT_DIR = ".codex-tmp/item-proof-all/item-decomp-remaining-contract";
const DEFAULT_COVERAGE_SUMMARY =
  "frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/visual-source-coverage/26-item-visual-source-coverage-summary.json";
const DEFAULT_VISUAL_MATRIX_SUMMARY =
  "frontend/public/aurora-evidence/item-decomp-closure-2026-07-08/runtime-proof-v74-full-thumbnail-quality/24-item-visual-matrix-summary.json";
const DEFAULT_THUMBNAIL_SUMMARY =
  "frontend/public/aurora-evidence/item-decomp-closure-2026-07-08/runtime-proof-v74-full-thumbnail-quality/24-item-visual-matrix-summary.json";
const DEFAULT_SOURCE_BLOCKED_RUNTIME_SUMMARY =
  "frontend/public/aurora-evidence/item-decomp-closure-2026-07-07/runtime-proof-v70-source-blocked/24-item-visual-matrix-summary.json";
const DEFAULT_THUMBNAIL_CONTACT_SHEET =
  "frontend/public/aurora-evidence/item-decomp-closure-2026-07-08/runtime-contact-sheet-v75-thumbnail-quality/item-runtime-contact-sheet-v75-thumbnail-quality.png";
const REQUIRED_ANGLES = ["front", "side", "back", "top-oblique"];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    referenceRoot: process.env.AURORA_DECOMPILATION_ROOT ?? DEFAULT_REFERENCE_ROOT,
    outDir: DEFAULT_OUT_DIR,
    coverageSummary: DEFAULT_COVERAGE_SUMMARY,
    visualMatrixSummary: DEFAULT_VISUAL_MATRIX_SUMMARY,
    thumbnailSummary: DEFAULT_THUMBNAIL_SUMMARY,
    sourceBlockedRuntimeSummary: DEFAULT_SOURCE_BLOCKED_RUNTIME_SUMMARY,
    thumbnailContactSheet: DEFAULT_THUMBNAIL_CONTACT_SHEET
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--referenceRoot") {
      index += 1;
      options.referenceRoot = requireValue(arg, argv[index]);
    } else if (arg === "--outDir") {
      index += 1;
      options.outDir = requireValue(arg, argv[index]);
    } else if (arg === "--coverageSummary") {
      index += 1;
      options.coverageSummary = requireValue(arg, argv[index]);
    } else if (arg === "--visualMatrixSummary") {
      index += 1;
      options.visualMatrixSummary = requireValue(arg, argv[index]);
    } else if (arg === "--thumbnailSummary") {
      index += 1;
      options.thumbnailSummary = requireValue(arg, argv[index]);
    } else if (arg === "--sourceBlockedRuntimeSummary") {
      index += 1;
      options.sourceBlockedRuntimeSummary = requireValue(arg, argv[index]);
    } else if (arg === "--thumbnailContactSheet") {
      index += 1;
      options.thumbnailContactSheet = requireValue(arg, argv[index]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/check-item-decomp-remaining-contract.mjs [options]

Options:
  --repoRoot <path>                Repository root. Defaults to aurora-web root.
  --referenceRoot <path>           Aurora decompilation reference. Defaults to ${DEFAULT_REFERENCE_ROOT}
  --outDir <path>                  Output dir for item-decomp-remaining-contract-summary.json.
  --coverageSummary <path>         Source coverage summary JSON.
  --visualMatrixSummary <path>     Four-angle visual matrix summary JSON.
  --thumbnailSummary <path>        UI thumbnail summary JSON.
  --sourceBlockedRuntimeSummary <path>
                                    Runtime summary for an expected source-blocked item.
  --thumbnailContactSheet <path>   UI thumbnail contact sheet PNG.
`);
}

function resolveFromRoot(root, maybeRelative) {
  return resolve(root, maybeRelative);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readAsciiHeader(path, length = 16) {
  const bytes = readFileSync(path);
  return bytes.subarray(0, Math.min(length, bytes.length)).toString("ascii");
}

function addFailure(failures, code, message, details = {}) {
  failures.push({ code, message, details });
}

function classifyUtgHeader(header) {
  const normalized = header.replace(/\0/g, "").trim();
  if (/^UTG\s+V[0-9.]+/iu.test(normalized)) {
    return "gff-candidate";
  }
  if (/^LTR\s+V[0-9.]+/iu.test(normalized)) {
    return "ltr-lexicon";
  }
  return "unknown";
}

function checkUtgSources(options, failures) {
  const utgDir = resolve(options.referenceRoot, "item-retail-extract", "utg");
  if (!existsSync(utgDir)) {
    addFailure(failures, "utg-source-dir-missing", "UTG source directory is missing.", {
      path: utgDir
    });
    return {
      status: "missing",
      sourceDir: utgDir,
      sourceCount: 0,
      ltrLexiconCount: 0,
      gffCandidateCount: 0,
      unknownCount: 0,
      sources: []
    };
  }

  const sources = readdirSync(utgDir)
    .filter((name) => name.toLowerCase().endsWith(".utg"))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const fullPath = join(utgDir, name);
      const header = readAsciiHeader(fullPath);
      return {
        name,
        path: fullPath,
        bytes: statSync(fullPath).size,
        header: header.replace(/[^\x20-\x7e]+/gu, "").trim(),
        classification: classifyUtgHeader(header)
      };
    });

  const gffCandidateCount = sources.filter((source) => source.classification === "gff-candidate")
    .length;
  const ltrLexiconCount = sources.filter((source) => source.classification === "ltr-lexicon")
    .length;
  const unknownCount = sources.filter((source) => source.classification === "unknown").length;

  if (sources.length === 0) {
    addFailure(failures, "utg-sources-missing", "No .utg sources were found.", { utgDir });
  }
  if (gffCandidateCount > 0) {
    addFailure(
      failures,
      "utg-gff-candidate-needs-parser",
      "A GFF-style UTG source exists; item-generator parser/serializer must be implemented before this gate can pass.",
      { sources: sources.filter((source) => source.classification === "gff-candidate") }
    );
  }
  if (unknownCount > 0) {
    addFailure(failures, "utg-unknown-header", "One or more .utg sources have unknown headers.", {
      sources: sources.filter((source) => source.classification === "unknown")
    });
  }

  return {
    status:
      gffCandidateCount > 0
        ? "requires-parser"
        : sources.length > 0 && ltrLexiconCount === sources.length
          ? "unsupported-gated-ltr-only"
          : "needs-review",
    sourceDir: utgDir,
    sourceCount: sources.length,
    ltrLexiconCount,
    gffCandidateCount,
    unknownCount,
    sources
  };
}

function checkGeneratorUnsupportedSource(repoRoot, failures) {
  const servicePath = resolve(
    repoRoot,
    "backend/src/modules/catalog/application/catalog.application.service.ts"
  );
  if (!existsSync(servicePath)) {
    addFailure(failures, "generator-service-missing", "Catalog service file is missing.", {
      servicePath
    });
    return { servicePath, sourceGatePresent: false };
  }
  const source = readFileSync(servicePath, "utf8");
  const requiredSnippets = [
    "GFF-style UTG header detected, but Aurora Web does not yet have a verified TNWItemGenerator parser/serializer.",
    "LTR V1.0 resource, not a GFF item-generator blueprint.",
    "Detected .utg resources are LTR V1.0 lexicons, not item-generator blueprints."
  ];
  const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
  if (missing.length > 0) {
    addFailure(
      failures,
      "generator-unsupported-gate-source-missing",
      "Generator unsupported gate messages are missing from the backend source.",
      { servicePath, missing }
    );
  }
  return { servicePath, sourceGatePresent: missing.length === 0 };
}

function checkRequiredSourceSnippets(repoRoot, relativePath, snippets, failureCode, message, failures) {
  const sourcePath = resolve(repoRoot, relativePath);
  if (!existsSync(sourcePath)) {
    addFailure(failures, failureCode, message, { sourcePath, missingFile: true });
    return { sourcePath, present: false, missingFile: true, missing: snippets };
  }
  const source = readFileSync(sourcePath, "utf8");
  const missing = snippets.filter((snippet) => !source.includes(snippet));
  if (missing.length > 0) {
    addFailure(failures, failureCode, message, { sourcePath, missing });
  }
  return { sourcePath, present: missing.length === 0, missing };
}

function checkGeneratorUnsupportedFrontend(repoRoot, failures) {
  const panel = checkRequiredSourceSnippets(
    repoRoot,
    "frontend/src/modules/layout/components/ItemsModePanel.tsx",
    [
      "Item Generator Unsupported",
      "aria-label=\"item generator support\"",
      "generatorSupport.status === \"ready\"",
      "generatorSupport.status === \"no-sources\""
    ],
    "generator-unsupported-frontend-source-missing",
    "Generator unsupported state is missing from the Items UI source.",
    failures
  );
  const test = checkRequiredSourceSnippets(
    repoRoot,
    "frontend/tests/unit/modules/layout/ItemsModePanel.test.tsx",
    [
      "shows item generator support as unsupported when sources are LTR lexicons",
      "Item Generator Unsupported",
      "animal.utg: LTR V1.0",
      "Detected .utg resources are LTR V1.0 lexicons, not item-generator blueprints."
    ],
    "generator-unsupported-frontend-test-missing",
    "Generator unsupported UI proof is missing from the Items panel tests.",
    failures
  );
  return {
    statusPresent: panel.present && test.present,
    panel,
    test
  };
}

function checkVisualUnsupportedFrontend(repoRoot, failures) {
  const supportResolver = checkRequiredSourceSnippets(
    repoRoot,
    "frontend/src/modules/items/application/itemVisualSupport.ts",
    [
      "metadata-without-supported-asset",
      "Preview unavailable",
      "Preview unsupported"
    ],
    "visual-unsupported-resolver-source-missing",
    "Source-blocked visual support resolver evidence is missing.",
    failures
  );
  const panel = checkRequiredSourceSnippets(
    repoRoot,
    "frontend/src/modules/layout/components/ItemsModePanel.tsx",
    [
      "resolveItemVisualSupportInfo",
      "shouldSuppressUnsupportedThumbnail",
      "data-visual-support-code",
      "items-mode-visual-status"
    ],
    "visual-unsupported-panel-source-missing",
    "Source-blocked visual status is missing from the Items panel source.",
    failures
  );
  const inspector = checkRequiredSourceSnippets(
    repoRoot,
    "frontend/src/modules/layout/components/ItemsModeRightPanel.tsx",
    [
      "resolveItemVisualSupportInfo",
      "items-visual-support-notice",
      "role={visualSupportInfo.tone === \"warning\" ? \"alert\" : \"status\"}"
    ],
    "visual-unsupported-inspector-source-missing",
    "Source-blocked visual status is missing from the Items inspector source.",
    failures
  );
  const panelTest = checkRequiredSourceSnippets(
    repoRoot,
    "frontend/tests/unit/modules/layout/ItemsModePanel.test.tsx",
    [
      "labels item rows whose source visual is unsupported",
      "does not use cached preview images for unsupported item visuals",
      "does not render metadata-only model assets as item thumbnails",
      "Preview unsupported",
      "empty-model-no-real-icon",
      "data-visual-support-code"
    ],
    "visual-unsupported-panel-test-missing",
    "Source-blocked visual status proof is missing from the Items panel tests.",
    failures
  );
  const inspectorTest = checkRequiredSourceSnippets(
    repoRoot,
    "frontend/tests/unit/modules/layout/ItemsModeRightPanel.test.tsx",
    [
      "shows an unsupported preview notice for item sources without real visuals",
      "Preview unsupported"
    ],
    "visual-unsupported-inspector-test-missing",
    "Source-blocked visual status proof is missing from the Items inspector tests.",
    failures
  );
  return {
    statusPresent:
      supportResolver.present &&
      panel.present &&
      inspector.present &&
      panelTest.present &&
      inspectorTest.present,
    supportResolver,
    panel,
    inspector,
    panelTest,
    inspectorTest
  };
}

function checkEmbeddedItemParityProofs(repoRoot, failures) {
  const templateParser = checkRequiredSourceSnippets(
    repoRoot,
    "backend/src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser.ts",
    [
      "const GFF_MAX_PARSED_NESTING_DEPTH = 4",
      "function readInventoryItemListEntries",
      "function readEquippedItemListEntries",
      "function readStoreListEntries"
    ],
    "embedded-item-template-parser-source-missing",
    "Embedded item parser parity source is missing.",
    failures
  );
  const templateTests = checkRequiredSourceSnippets(
    repoRoot,
    "backend/test/unit/aurora-gff-template-parser.spec.ts",
    [
      "round-trips full embedded item fields through creature inventory and equipment GFF",
      "round-trips full embedded item fields through placeable inventory UTP GFF",
      "round-trips full embedded item fields through store UTM StoreList",
      "localizedNameStrRef",
      "bodyPartRFoot",
      "itemPropertyListEntries"
    ],
    "embedded-item-template-test-missing",
    "Embedded item UTC/UTP/UTM parity proof tests are missing.",
    failures
  );
  const areaTests = checkRequiredSourceSnippets(
    repoRoot,
    "backend/test/unit/aurora-gff-area-parser.spec.ts",
    [
      "round-trips placed item properties through the GIT ItemList writer and parser",
      "localizedNameStrRef",
      "bodyPartRFoot",
      "itemPropertyListEntries",
      "bearing"
    ],
    "embedded-item-area-test-missing",
    "Area placed item GIT parity proof test is missing.",
    failures
  );
  return {
    statusPresent: templateParser.present && templateTests.present && areaTests.present,
    templateParser,
    templateTests,
    areaTests
  };
}

function checkCoverageSummary(summaryPath, failures) {
  if (!existsSync(summaryPath)) {
    addFailure(failures, "coverage-summary-missing", "Item visual source coverage summary is missing.", {
      summaryPath
    });
    return null;
  }
  const summary = readJson(summaryPath);
  if (summary.webBugCandidateItemCount !== 0) {
    addFailure(failures, "coverage-web-bug-candidates", "Visual source coverage found Web bug candidates.", {
      webBugCandidateItemCount: summary.webBugCandidateItemCount
    });
  }
  if (!Number.isFinite(summary.sourceBlockedItemCount) || summary.sourceBlockedItemCount < 1) {
    addFailure(failures, "coverage-source-blocked-missing", "Source-blocked item count is missing.", {
      sourceBlockedItemCount: summary.sourceBlockedItemCount
    });
  }
  if (summary.sourceBlockedItemCount !== summary.issueItemCount) {
    addFailure(
      failures,
      "coverage-issues-not-source-blocked",
      "Coverage issues must be source-blocked rather than Web bug candidates.",
      {
        sourceBlockedItemCount: summary.sourceBlockedItemCount,
        issueItemCount: summary.issueItemCount
      }
    );
  }
  return {
    path: summaryPath,
    totalItems: summary.totalItems,
    uniqueVisualSignatures: summary.uniqueVisualSignatures,
    issueItemCount: summary.issueItemCount,
    sourceBlockedItemCount: summary.sourceBlockedItemCount,
    webBugCandidateItemCount: summary.webBugCandidateItemCount,
    statusCounts: summary.statusCounts ?? {}
  };
}

function checkVisualMatrixSummary(summaryPath, label, failures, requiredAngles = REQUIRED_ANGLES) {
  if (!existsSync(summaryPath)) {
    addFailure(failures, `${label}-summary-missing`, `${label} summary is missing.`, {
      summaryPath
    });
    return null;
  }
  const summary = readJson(summaryPath);
  const totalCases = summary.totalCases;
  if (!Number.isFinite(totalCases) || totalCases < 1) {
    addFailure(failures, `${label}-total-cases-invalid`, `${label} has invalid totalCases.`, {
      totalCases
    });
  }
  if (summary.capturedCases !== totalCases) {
    addFailure(failures, `${label}-not-all-captured`, `${label} did not capture all cases.`, {
      totalCases,
      capturedCases: summary.capturedCases
    });
  }
  if (summary.failedCases !== 0 || summary.issueCaseCount !== 0) {
    addFailure(failures, `${label}-has-failures`, `${label} contains failures or issue cases.`, {
      failedCases: summary.failedCases,
      issueCaseCount: summary.issueCaseCount
    });
  }

  const angleCounts = summary.coverage?.angleCounts ?? {};
  for (const angle of requiredAngles) {
    if (angleCounts[angle] !== totalCases) {
      addFailure(failures, `${label}-angle-missing`, `${label} is missing angle coverage.`, {
        angle,
        expected: totalCases,
        actual: angleCounts[angle]
      });
    }
  }
  if (summary.coverage?.fullDefaultCaseSet !== true) {
    addFailure(
      failures,
      `${label}-not-full-default-case-set`,
      `${label} does not report the full default item case set.`,
      { fullDefaultCaseSet: summary.coverage?.fullDefaultCaseSet }
    );
  }

  const thumbnailReadiness = summary.thumbnailReadiness;
  if (
    !thumbnailReadiness ||
    thumbnailReadiness.readyCount !== thumbnailReadiness.totalCount ||
    thumbnailReadiness.readyCount !== totalCases
  ) {
    addFailure(failures, `${label}-thumbnail-readiness`, `${label} thumbnail readiness is incomplete.`, {
      thumbnailReadiness
    });
  }
  const entries = Array.isArray(thumbnailReadiness?.entries) ? thumbnailReadiness.entries : [];
  const nonFrontFacing = entries.filter((entry) => entry.frontFacingProof !== true);
  if (nonFrontFacing.length > 0) {
    addFailure(
      failures,
      `${label}-front-facing-proof-missing`,
      `${label} has thumbnails without front-facing proof.`,
      { entries: nonFrontFacing.map((entry) => ({ id: entry.id, resRef: entry.resRef })) }
    );
  }
  const thumbnailQualityIssues = entries.filter(
    (entry) =>
      entry.expectedSourceIssue !== true &&
      (entry.thumbnailQuality?.ready !== true || entry.thumbnailQuality?.status !== "ready")
  );
  if (thumbnailQualityIssues.length > 0) {
    addFailure(
      failures,
      `${label}-thumbnail-quality`,
      `${label} has thumbnails without measured UI image quality proof.`,
      {
        entries: thumbnailQualityIssues.map((entry) => ({
          id: entry.id,
          resRef: entry.resRef,
          imageSourceKind: entry.imageSourceKind,
          thumbnailQuality: entry.thumbnailQuality ?? null
        }))
      }
    );
  }

  return {
    path: summaryPath,
    totalCases,
    capturedCases: summary.capturedCases,
    failedCases: summary.failedCases,
    issueCaseCount: summary.issueCaseCount,
    angleCounts,
    thumbnailReadiness: thumbnailReadiness
      ? {
          readyCount: thumbnailReadiness.readyCount,
          totalCount: thumbnailReadiness.totalCount,
          qualityReadyCount: entries.filter((entry) => entry.thumbnailQuality?.ready === true)
            .length,
          missing: thumbnailReadiness.missing ?? []
        }
      : null
  };
}

function checkContactSheet(contactSheetPath, failures) {
  if (!existsSync(contactSheetPath)) {
    addFailure(failures, "thumbnail-contact-sheet-missing", "Thumbnail contact sheet is missing.", {
      contactSheetPath
    });
    return null;
  }
  const bytes = statSync(contactSheetPath).size;
  if (bytes < 1024) {
    addFailure(failures, "thumbnail-contact-sheet-too-small", "Thumbnail contact sheet is too small.", {
      contactSheetPath,
      bytes
    });
  }
  return { path: contactSheetPath, bytes };
}

function checkSourceBlockedRuntimeSummary(summaryPath, failures) {
  if (!existsSync(summaryPath)) {
    addFailure(
      failures,
      "source-blocked-runtime-summary-missing",
      "Source-blocked runtime summary is missing.",
      { summaryPath }
    );
    return null;
  }
  const summary = readJson(summaryPath);
  const totalCases = summary.totalCases;
  if (!Number.isFinite(totalCases) || totalCases < 1) {
    addFailure(
      failures,
      "source-blocked-runtime-total-cases-invalid",
      "Source-blocked runtime proof has invalid totalCases.",
      { totalCases }
    );
  }
  if (summary.capturedCases !== totalCases || summary.failedCases !== 0) {
    addFailure(
      failures,
      "source-blocked-runtime-not-captured",
      "Source-blocked runtime proof did not capture cleanly.",
      {
        totalCases,
        capturedCases: summary.capturedCases,
        failedCases: summary.failedCases
      }
    );
  }
  if (summary.expectedSourceIssueCaseCount !== totalCases || summary.issueCaseCount !== totalCases) {
    addFailure(
      failures,
      "source-blocked-runtime-not-expected-issue",
      "Source-blocked runtime proof must be explicitly marked as expected source issue.",
      {
        totalCases,
        issueCaseCount: summary.issueCaseCount,
        expectedSourceIssueCaseCount: summary.expectedSourceIssueCaseCount
      }
    );
  }

  const evidence = summary.sourceBlockedEvidence;
  const entries = Array.isArray(evidence?.entries) ? evidence.entries : [];
  if (
    !evidence ||
    evidence.count !== totalCases ||
    evidence.withExplicitCodeCount !== totalCases ||
    entries.length !== totalCases
  ) {
    addFailure(
      failures,
      "source-blocked-runtime-evidence-missing",
      "Source-blocked runtime proof lacks explicit visual support evidence.",
      { sourceBlockedEvidence: evidence }
    );
  }
  const missingCodeEntries = entries.filter(
    (entry) =>
      typeof entry.visualSupportCode !== "string" ||
      entry.visualSupportCode.trim().length === 0 ||
      typeof entry.visualSupportKind !== "string" ||
      entry.visualSupportKind.trim().length === 0 ||
      typeof entry.visualSupportLabel !== "string" ||
      entry.visualSupportLabel.trim().length === 0
  );
  if (missingCodeEntries.length > 0) {
    addFailure(
      failures,
      "source-blocked-runtime-code-missing",
      "Source-blocked runtime proof has entries without explicit support code/kind/label.",
      { entries: missingCodeEntries }
    );
  }

  return {
    path: summaryPath,
    totalCases,
    capturedCases: summary.capturedCases,
    failedCases: summary.failedCases,
    issueCaseCount: summary.issueCaseCount,
    expectedSourceIssueCaseCount: summary.expectedSourceIssueCaseCount,
    sourceBlockedEvidence: evidence
      ? {
          count: evidence.count,
          withExplicitCodeCount: evidence.withExplicitCodeCount,
          entries: entries.map((entry) => ({
            id: entry.id,
            resRef: entry.resRef,
            visualSupportCode: entry.visualSupportCode,
            visualSupportKind: entry.visualSupportKind,
            visualSupportLabel: entry.visualSupportLabel
          }))
        }
      : null
  };
}

function buildReport(options) {
  const repoRoot = resolve(options.repoRoot);
  const failures = [];
  const report = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    referenceRoot: resolve(options.referenceRoot),
    checks: {},
    failures
  };

  report.checks.utg = checkUtgSources({ ...options, referenceRoot: report.referenceRoot }, failures);
  report.checks.generatorUnsupportedGate = checkGeneratorUnsupportedSource(repoRoot, failures);
  report.checks.generatorUnsupportedFrontend = checkGeneratorUnsupportedFrontend(repoRoot, failures);
  report.checks.visualUnsupportedFrontend = checkVisualUnsupportedFrontend(repoRoot, failures);
  report.checks.embeddedItemParityProofs = checkEmbeddedItemParityProofs(repoRoot, failures);
  report.checks.coverage = checkCoverageSummary(
    resolveFromRoot(repoRoot, options.coverageSummary),
    failures
  );
  report.checks.visualMatrix = checkVisualMatrixSummary(
    resolveFromRoot(repoRoot, options.visualMatrixSummary),
    "visual-matrix",
    failures
  );
  report.checks.thumbnailMatrix = checkVisualMatrixSummary(
    resolveFromRoot(repoRoot, options.thumbnailSummary),
    "thumbnail-matrix",
    failures,
    ["front"]
  );
  report.checks.sourceBlockedRuntime = checkSourceBlockedRuntimeSummary(
    resolveFromRoot(repoRoot, options.sourceBlockedRuntimeSummary),
    failures
  );
  report.checks.thumbnailContactSheet = checkContactSheet(
    resolveFromRoot(repoRoot, options.thumbnailContactSheet),
    failures
  );

  report.status = failures.length === 0 ? "pass" : "fail";
  report.summary = {
    utgStatus: report.checks.utg.status,
    sourceBlockedItemCount: report.checks.coverage?.sourceBlockedItemCount ?? null,
    webBugCandidateItemCount: report.checks.coverage?.webBugCandidateItemCount ?? null,
    visualMatrixCases: report.checks.visualMatrix?.totalCases ?? null,
    thumbnailMatrixCases: report.checks.thumbnailMatrix?.totalCases ?? null,
    sourceBlockedRuntimeCases: report.checks.sourceBlockedRuntime?.totalCases ?? null,
    generatorFrontendGatePresent:
      report.checks.generatorUnsupportedFrontend?.statusPresent ?? false,
    visualUnsupportedFrontendGatePresent:
      report.checks.visualUnsupportedFrontend?.statusPresent ?? false,
    embeddedItemParityGatePresent:
      report.checks.embeddedItemParityProofs?.statusPresent ?? false,
    failureCount: failures.length
  };
  return report;
}

function writeReport(repoRoot, outDir, report) {
  const absoluteOutDir = resolveFromRoot(repoRoot, outDir);
  mkdirSync(absoluteOutDir, { recursive: true });
  const outPath = join(absoluteOutDir, "item-decomp-remaining-contract-summary.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  return outPath;
}

try {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  const outPath = writeReport(resolve(options.repoRoot), options.outDir, report);
  report.outputPath = outPath;
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "pass") {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const backendRoot = path.join(repoRoot, "backend");
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-89/vfx-local-diagnostic-gate-report.json"
);

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
const artifactDir = path.dirname(outPath);
const runtimeReportPath = path.join(artifactDir, "vfx-runtime-tick-diagnostics-gate.json");
const runtimeRenderContractReportPath = path.join(
  artifactDir,
  "vfx-runtime-render-contract-diagnostics-gate.json"
);
const captureAnalyzerReportPath = path.join(artifactDir, "vfx-analyze-capture-contract-checks-gate.json");
const thresholdReportPath = path.join(artifactDir, "vfx-local-oracle-threshold-check-gate.json");
const contractVisualEvidenceReportPath = path.join(
  artifactDir,
  "vfx-contract-visual-evidence-gate.json"
);
const catalogPreviewGuardrailsReportPath = path.join(
  artifactDir,
  "vfx-catalog-preview-guardrails-gate.json"
);

fs.mkdirSync(artifactDir, { recursive: true });

const commandResults = [
  runGateCommand({
    id: "runtime-tick-diagnostics",
    command: "node",
    args: [
      "-r",
      "ts-node/register/transpile-only",
      "scripts/create-vfx-runtime-tick-diagnostics.ts",
      "--out",
      runtimeReportPath
    ],
    cwd: backendRoot
  }),
  runGateCommand({
    id: "runtime-render-contract-diagnostics",
    command: "node",
    args: [
      "-r",
      "ts-node/register/transpile-only",
      "scripts/create-vfx-runtime-render-contract-diagnostics.ts",
      "--out",
      runtimeRenderContractReportPath
    ],
    cwd: backendRoot
  }),
  runGateCommand({
    id: "visual-correlation-self-test",
    command: "node",
    args: ["scripts/test-vfx-visual-correlation-runner.mjs"],
    cwd: backendRoot
  }),
  runGateCommand({
    id: "capture-analyzer-contract-checks",
    command: "node",
    args: [
      "scripts/test-vfx-analyze-capture-contract-checks.mjs",
      "--out",
      captureAnalyzerReportPath
    ],
    cwd: backendRoot
  }),
  runGateCommand({
    id: "local-oracle-threshold-checker",
    command: "node",
    args: [
      "scripts/check-vfx-local-oracle-thresholds.mjs",
      "--out",
      thresholdReportPath
    ],
    cwd: backendRoot
  }),
  runGateCommand({
    id: "contract-visual-evidence",
    command: "node",
    args: [
      "scripts/check-vfx-contract-visual-evidence.mjs",
      "--out",
      contractVisualEvidenceReportPath
    ],
    cwd: backendRoot
  }),
  runGateCommand({
    id: "catalog-preview-guardrails",
    command: "node",
    args: [
      "scripts/check-vfx-catalog-preview-guardrails.mjs",
      "--out",
      catalogPreviewGuardrailsReportPath
    ],
    cwd: backendRoot
  })
];

const runtimeReport = readJsonIfPresent(runtimeReportPath);
const runtimeRenderContractReport = readJsonIfPresent(runtimeRenderContractReportPath);
const captureAnalyzerReport = readJsonIfPresent(captureAnalyzerReportPath);
const thresholdReport = readJsonIfPresent(thresholdReportPath);
const contractVisualEvidenceReport = readJsonIfPresent(contractVisualEvidenceReportPath);
const catalogPreviewGuardrailsReport = readJsonIfPresent(catalogPreviewGuardrailsReportPath);
const failedCommands = commandResults.filter((entry) => entry.exitCode !== 0);
const nestedCanonicalPromotionAttempts = [
  runtimeReport?.canonicalParityPromoted === true,
  runtimeRenderContractReport?.canonicalParityPromoted === true,
  captureAnalyzerReport?.canonicalParityPromoted === true,
  thresholdReport?.canonicalParityPromoted === true,
  catalogPreviewGuardrailsReport?.canonicalParityPromoted === true
].filter(Boolean).length + (contractVisualEvidenceReport?.canonicalPromotionAttemptCount ?? 0);
const nestedFailures =
  (runtimeReport?.summary?.failedCheckCount ?? 0) +
  (runtimeRenderContractReport?.summary?.failedCheckCount ?? 0) +
  (captureAnalyzerReport?.summary?.failedCheckCount ?? 0) +
  (thresholdReport?.summary?.failedCheckCount ?? 0) +
  (contractVisualEvidenceReport?.failedCheckCount ?? 0) +
  (catalogPreviewGuardrailsReport?.failedCheckCount ?? 0);

const report = {
  version: "aurora-vfx-local-diagnostic-gate/v1",
  generatedAt: new Date().toISOString(),
  artifact: toRepoPath(outPath),
  oracle: "aggregate-local-vfx-diagnostic-gate",
  result:
    failedCommands.length === 0 &&
    nestedFailures === 0 &&
    nestedCanonicalPromotionAttempts === 0
      ? "local-diagnostic-gate-passed"
      : "local-diagnostic-gate-failed",
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  artifacts: {
    runtimeTickDiagnostics: toRepoPath(runtimeReportPath),
    runtimeRenderContractDiagnostics: toRepoPath(runtimeRenderContractReportPath),
    captureAnalyzerContractChecks: toRepoPath(captureAnalyzerReportPath),
    localOracleThresholdCheck: toRepoPath(thresholdReportPath),
    contractVisualEvidence: toRepoPath(contractVisualEvidenceReportPath),
    catalogPreviewGuardrails: toRepoPath(catalogPreviewGuardrailsReportPath)
  },
  summary: {
    commandCount: commandResults.length,
    passedCommandCount: commandResults.length - failedCommands.length,
    failedCommandCount: failedCommands.length,
    nestedFailedCheckCount: nestedFailures,
    canonicalPromotionAttemptCount: nestedCanonicalPromotionAttempts,
    runtimeCaseCount: runtimeReport?.summary?.caseCount ?? null,
    runtimePassedCaseCount: runtimeReport?.summary?.passedCaseCount ?? null,
    runtimeFailedCaseCount: runtimeReport?.summary?.failedCaseCount ?? null,
    runtimeRenderContractCaseCount: runtimeRenderContractReport?.summary?.caseCount ?? null,
    runtimeRenderContractPassedCaseCount:
      runtimeRenderContractReport?.summary?.passedCaseCount ?? null,
    runtimeRenderContractFailedCaseCount:
      runtimeRenderContractReport?.summary?.failedCaseCount ?? null,
    captureAnalyzerCaseCount: captureAnalyzerReport?.summary?.caseCount ?? null,
    captureAnalyzerPassedCaseCount: captureAnalyzerReport?.summary?.passedCaseCount ?? null,
    captureAnalyzerFailedCaseCount: captureAnalyzerReport?.summary?.failedCaseCount ?? null,
    thresholdFixtureCount: thresholdReport?.summary?.thresholdFixtureCount ?? null,
    thresholdFixturesChecked: thresholdReport?.summary?.fixturesChecked ?? null,
    thresholdFrameCountChecked: thresholdReport?.summary?.frameCountChecked ?? null,
    thresholdFailedFixtureCount: thresholdReport?.summary?.failedFixtureCount ?? null,
    contractVisualEvidenceFixtureCount: contractVisualEvidenceReport?.fixtureCount ?? null,
    contractVisualEvidenceCheckedFixtureCount:
      contractVisualEvidenceReport?.checkedFixtureCount ?? null,
    contractVisualEvidenceFailedFixtureCount:
      contractVisualEvidenceReport?.failedFixtureCount ?? null,
    contractVisualEvidenceVisualArtifactMissingCount:
      contractVisualEvidenceReport?.visualArtifactMissingCount ?? null,
    contractVisualEvidenceVisualArtifactMismatchCount:
      contractVisualEvidenceReport?.visualArtifactMismatchCount ?? null,
    contractVisualEvidenceRenderContractHashMismatchCount:
      contractVisualEvidenceReport?.renderContractHashMismatchCount ?? null,
    contractVisualEvidenceSemanticRequirementCount:
      contractVisualEvidenceReport?.semanticRequirementCount ?? null,
    contractVisualEvidenceSemanticRequirementFailedCount:
      contractVisualEvidenceReport?.semanticRequirementFailedCount ?? null,
    contractVisualEvidenceVisualSemanticOracleMissingCount:
      contractVisualEvidenceReport?.visualSemanticOracleMissingCount ?? null,
    contractVisualEvidenceVisualSemanticCheckCount:
      contractVisualEvidenceReport?.visualSemanticCheckCount ?? null,
    contractVisualEvidenceVisualSemanticCheckFailedCount:
      contractVisualEvidenceReport?.visualSemanticCheckFailedCount ?? null,
    contractVisualEvidenceHumanReviewNeededMissingCount:
      contractVisualEvidenceReport?.humanReviewNeededMissingCount ?? null,
    contractVisualEvidenceRequirementsAppliedCount:
      contractVisualEvidenceReport?.requirementsAppliedCount ?? null,
    catalogPreviewGuardrailsResult: catalogPreviewGuardrailsReport?.result ?? null,
    catalogPreviewGuardrailsFailedCheckCount:
      catalogPreviewGuardrailsReport?.failedCheckCount ?? null,
    catalogPreviewGuardrailsObjectPixelsWithoutGrid:
      catalogPreviewGuardrailsReport?.visualSummary?.objectPixelsWithoutGrid ?? null,
    catalogPreviewGuardrailsObjectPixelThreshold:
      catalogPreviewGuardrailsReport?.visualSummary?.objectPixelThreshold ?? null,
    catalogPreviewGuardrailsSourceMdlPayloadReady:
      catalogPreviewGuardrailsReport?.visualSemanticChecks?.sourceMdlPayloadReady ?? null,
    catalogPreviewGuardrailsLocalOnlyNotCanonical:
      catalogPreviewGuardrailsReport?.visualSemanticChecks?.localOnlyNotCanonical ?? null,
    catalogPreviewGuardrailsCanonicalObjectPixelsWithoutGrid:
      catalogPreviewGuardrailsReport?.visualSummary?.canonicalObjectPixelsWithoutGrid ?? null,
    catalogPreviewGuardrailsCanonicalBackendPayloadReady:
      catalogPreviewGuardrailsReport?.visualSemanticChecks?.canonicalBackendPayloadReady ?? null,
    catalogPreviewGuardrailsCanonicalBackendCanonical:
      catalogPreviewGuardrailsReport?.visualSemanticChecks?.canonicalBackendCanonical ?? null,
    catalogPreviewGuardrailsCanonicalRendererSelected:
      catalogPreviewGuardrailsReport?.visualSemanticChecks?.canonicalRendererSelected ?? null,
    catalogPreviewGuardrailsCanonicalDevReady:
      catalogPreviewGuardrailsReport?.visualSemanticChecks?.canonicalDevReady ?? null,
    catalogPreviewGuardrailsCanonicalSourceMdlOverlaySuppressed:
      catalogPreviewGuardrailsReport?.visualSemanticChecks
        ?.canonicalSourceMdlOverlaySuppressed ?? null
  },
  commandResults,
  blockers: [
    "retail_capture_required_for_canonical_parity",
    "retail_runtime_tick_dump_required_for_canonical_parity",
    "retail_render_contract_snapshot_required_for_canonical_parity",
    "retail_comparison_required_for_canonical_parity",
    "aggregate_local_diagnostic_gate_is_not_retail_evidence"
  ],
  notes: [
    "This aggregate gate runs local diagnostics only.",
    "Passing this gate cannot promote canonical retail parity."
  ]
};

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

if (report.result !== "local-diagnostic-gate-passed") {
  process.exitCode = 1;
}

function runGateCommand({ id, command, args, cwd }) {
  const startedAt = new Date().toISOString();
  const startMs = performance.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });
  const durationMs = Math.round(performance.now() - startMs);

  return {
    id,
    command: [command, ...args].join(" "),
    cwd: toRepoPath(cwd),
    startedAt,
    durationMs,
    exitCode: typeof result.status === "number" ? result.status : 1,
    status: result.status === 0 ? "passed" : "failed",
    stdoutTail: tail(result.stdout ?? ""),
    stderrTail: tail(result.stderr ?? ""),
    ...(result.error ? { error: result.error.message } : {})
  };
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function tail(value) {
  const trimmed = value.trim();
  if (trimmed.length <= 4000) {
    return trimmed;
  }
  return trimmed.slice(-4000);
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/run-vfx-local-diagnostic-gate.mjs [--out path]");
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

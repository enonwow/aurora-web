#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");
const defaultModulePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_writer_concept_sic_tilemap77_nw_couch_bench_material_lab.mod";
const defaultBaselinePath =
  "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_writer_concept_sic_tilemap58_deep_mood_lab.mod";
const defaultAreaResref = "cdx_mapflat01";
const defaultAreaName = "Ostatnie Miasto - Port, Mieszkanie Kartografa";
const defaultToolsetCrop = "610,275,690,470";

const options = parseArgs(process.argv.slice(2));
const modulePath = resolve(options.modulePath ?? process.env.AURORA_TOOLSET_MODULE_PATH ?? defaultModulePath);
const baselinePath = resolve(options.baseline ?? defaultBaselinePath);
const areaResref = options.area ?? defaultAreaResref;
const areaName = options.areaName ?? defaultAreaName;
const label = sanitizeSegment(options.label ?? `${basename(modulePath, ".mod")}-supervised-proof`);
const execute = booleanOption(options.execute, false);
const riskAck = booleanOption(options["i-understand-toolset-av-risk"], false);
const closeAfter = booleanOption(options.closeAfter, false);
const ingestCapturePath = options.ingestCapture ? resolve(repoRoot, options.ingestCapture) : null;
const toolsetCrop = options.toolsetCrop ?? defaultToolsetCrop;
const expectedModuleParts = options.expectedModuleParts ?? `${basename(modulePath, ".mod")}|mod`;
const expectedModule = options.expectedModule ?? basename(modulePath);
const outDir = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-concept-parity",
  `${label}-packet`
);
const reportPath = resolve(outDir, "supervised-toolset-proof-packet.json");
const preflightPath = resolve(outDir, "toolset-proof-preflight.json");

if (!existsSync(modulePath)) {
  throw new Error(`Missing module: ${modulePath}`);
}
if (!existsSync(baselinePath)) {
  throw new Error(`Missing baseline module: ${baselinePath}`);
}
mkdirSync(outDir, { recursive: true });

const steps = [];
let preflight = null;
if (options.preflightReport && existsSync(resolve(repoRoot, options.preflightReport))) {
  preflight = readJson(resolve(repoRoot, options.preflightReport));
} else if (ingestCapturePath) {
  preflight = buildExistingCaptureNoLaunchPreflight(ingestCapturePath);
  steps.push({
    id: "preflight",
    status: "skipped_existing_capture_no_launch",
    elapsedMs: 0,
    script: null,
    args: ["--ingestCapture", ingestCapturePath],
    summary: summarize(preflight)
  });
} else {
  runStep({
    id: "preflight",
    script: "preflight-last-city-toolset-proof.mjs",
    args: ["--modulePath", modulePath, "--out", preflightPath],
    allowStatuses: ["passed", "requires_explicit_override"]
  });
  preflight = readJson(preflightPath);
}

const hardBlockers = preflight.blockers ?? [];
const readyForSupervisedProbe =
  hardBlockers.length === 0 &&
  ["passed", "requires_explicit_override"].includes(preflight.status) &&
  preflight.cleanupProbe?.processCount === 0 &&
  preflight.cleanupProbe?.temp0Exists === false;
const requiresOverride = preflight.requiresExplicitOverride === true || preflight.status === "requires_explicit_override";
const commandPacket = buildCommandPacket();
let execution = null;
let ingestion = null;

if (execute) {
  if (!riskAck) {
    execution = {
      status: "refused",
      blockerCode: "missing_explicit_toolset_av_risk_ack",
      hint: "Pass --i-understand-toolset-av-risk 1 for exactly one supervised probe."
    };
  } else if (!readyForSupervisedProbe) {
    execution = {
      status: "refused",
      blockerCode: "supervised_probe_not_ready",
      preflightStatus: preflight.status,
      hardBlockers
    };
  } else {
    execution = runSupervisedProbe();
  }
}
if (ingestCapturePath) {
  ingestion = ingestCapture(ingestCapturePath);
}

const report = {
  version: "last-city-supervised-toolset-proof-packet/v1",
  generatedAt: new Date().toISOString(),
  status: execute
    ? execution?.status === "completed"
      ? "completed"
      : "not_completed"
    : ingestion
      ? ingestion.status === "completed"
        ? "ingested_visual_comparison_completed"
        : "ingest_failed"
      : readyForSupervisedProbe
        ? "ready_for_explicit_supervised_execution"
        : "not_ready",
  safety: {
    launchesToolset: execute && execution?.openedToolset === true,
    dryRunOnly: !execute,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    method:
      "preflight plus optional one single-open Toolset probe, readonly capture, and optional targeted WM_CLOSE; no global input"
  },
  modulePath,
  baselinePath,
  areaResref,
  areaName,
  expectedModule,
  expectedModuleParts,
  toolsetCrop,
  readyForSupervisedProbe,
  requiresOverride,
  hardBlockers,
  softBlockers: preflight.softBlockers ?? [],
  preflight: summarizePreflight(preflight),
  commandPacket,
  execution,
  ingestion,
  steps
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(resolve(outDir, "README.md"), renderMarkdown(report), "utf8");
console.log(
  JSON.stringify(
    {
      status: report.status,
      execute,
      readyForSupervisedProbe,
      requiresOverride,
      hardBlockers,
      softBlockers: report.softBlockers,
      ingestionStatus: ingestion?.status ?? null,
      reportPath,
      markdownPath: resolve(outDir, "README.md")
    },
    null,
    2
  )
);
if (execute && execution?.status !== "completed") {
  process.exitCode = 2;
}
if (ingestion && ingestion.status !== "completed") {
  process.exitCode = 2;
}

function runSupervisedProbe() {
  const openResult = runStep({
    id: "open_toolset_once",
    script: "open-last-city-module-and-area-toolset-no-global-input.mjs",
    args: [
      "--modulePath",
      modulePath,
      "--expectedModuleParts",
      expectedModuleParts,
      "--area",
      areaResref,
      "--areaName",
      areaName
    ],
    env: {
      AURORA_TOOLSET_ALLOW_REPEATED_AV_FAMILY: requiresOverride ? "1" : "0",
      AURORA_TOOLSET_ALLOW_SECOND_TOOLSET_START: "0"
    },
    allowStatuses: ["ok"]
  });
  if (openResult.ok !== true) {
    return {
      status: "failed",
      openedToolset: true,
      blockerCode: openResult.blockerCode ?? "open_toolset_once_failed",
      openResult
    };
  }

  const capture = runStep({
    id: "readonly_capture",
    script: "capture-areas-toolset-window-readonly.mjs",
    args: ["--expectedModule", expectedModule, "--expectedModuleParts", expectedModuleParts, "--expectedArea", areaResref],
    allowStatuses: ["captured", "blocked"]
  });
  if (capture.status !== "captured" || capture.canRunVisualComparison !== true || !capture.pngPath) {
    return {
      status: "failed",
      openedToolset: true,
      blockerCode: capture.blockerCode ?? "readonly_capture_not_comparable",
      capture
    };
  }

  const comparison = runStep({
    id: "compare_visual",
    script: "compare-last-city-concept-parity.mjs",
    args: [
      "--modulePath",
      modulePath,
      "--baseline",
      baselinePath,
      "--toolset",
      capture.pngPath,
      "--toolsetCrop",
      toolsetCrop,
      "--preflightReport",
      preflightPath,
      "--label",
      `${label}-visual-proof`
    ],
    allowStatuses: ["needs_visual_tile_or_composition_iteration", "visual_pass_with_iteration_notes", "passed"]
  });

  let closeResult = null;
  if (closeAfter) {
    closeResult = runStep({
      id: "targeted_close_after_capture",
      script: "close-aurora-toolset-window-no-global-input.mjs",
      args: [],
      allowStatuses: ["ok"]
    });
  }

  return {
    status: "completed",
    openedToolset: true,
    capture,
    comparison,
    closeResult
  };
}

function ingestCapture(capturePath) {
  if (!existsSync(capturePath)) {
    return {
      status: "failed",
      blockerCode: "capture_png_missing",
      capturePath
    };
  }
  const validation = runStep({
    id: "validate_ingested_capture",
    script: "capture-areas-toolset-window-readonly.mjs",
    args: ["--validateCaptureImage", capturePath],
    allowStatuses: ["passed", "blocked"]
  });
  if (validation.status !== "passed") {
    return {
      status: "failed",
      blockerCode: validation.blockerCode ?? "ingested_capture_validation_failed",
      capturePath,
      validation
    };
  }
  if (hardBlockers.length > 0) {
    return {
      status: "failed",
      blockerCode: "preflight_hard_blockers_present",
      hardBlockers,
      capturePath,
      validation
    };
  }
  const comparisonArgs = [
      "--modulePath",
      modulePath,
      "--baseline",
      baselinePath,
      "--toolset",
      capturePath,
      "--toolsetCrop",
      toolsetCrop,
      "--label",
      `${label}-ingested-visual-proof`
  ];
  if (options.preflightReport) {
    comparisonArgs.push("--preflightReport", resolve(repoRoot, options.preflightReport));
  }
  const comparison = runStep({
    id: "compare_ingested_capture",
    script: "compare-last-city-concept-parity.mjs",
    args: comparisonArgs,
    allowStatuses: [
      "needs_visual_tile_or_composition_iteration",
      "visual_pass_with_iteration_notes",
      "passed",
      "blocked_by_toolset_preflight",
      "blocked_by_crash_risk"
    ]
  });
  return {
    status: "completed",
    capturePath,
    validation,
    comparison
  };
}

function buildCommandPacket() {
  return {
    note: "These commands are generated for a deliberate supervised single probe. Do not run them from automation without execute+risk ack.",
    preflight: commandLine("preflight-last-city-toolset-proof.mjs", ["--modulePath", modulePath, "--out", preflightPath]),
    openOnce: {
      env: {
        AURORA_TOOLSET_ALLOW_REPEATED_AV_FAMILY: requiresOverride ? "1" : "0",
        AURORA_TOOLSET_ALLOW_SECOND_TOOLSET_START: "0"
      },
      command: commandLine("open-last-city-module-and-area-toolset-no-global-input.mjs", [
        "--modulePath",
        modulePath,
        "--expectedModuleParts",
        expectedModuleParts,
        "--area",
        areaResref,
        "--areaName",
        areaName
      ])
    },
    readonlyCapture: commandLine("capture-areas-toolset-window-readonly.mjs", [
      "--expectedModule",
      expectedModule,
      "--expectedModuleParts",
      expectedModuleParts,
      "--expectedArea",
      areaResref
    ]),
    compareAfterCapture: commandLine("compare-last-city-concept-parity.mjs", [
      "--modulePath",
      modulePath,
      "--baseline",
      baselinePath,
      "--toolset",
      "<pngPath-from-readonly-capture>",
      "--toolsetCrop",
      toolsetCrop,
      "--preflightReport",
      preflightPath,
      "--label",
      `${label}-visual-proof`
    ]),
    ingestCapture: commandLine("run-last-city-supervised-toolset-proof.mjs", [
      "--label",
      label,
      "--ingestCapture",
      "<pngPath-from-supervised-capture>"
    ]),
    optionalClose: commandLine("close-aurora-toolset-window-no-global-input.mjs", [])
  };
}

function runStep({ id, script, args, env = {}, allowStatuses = [] }) {
  const startedAt = Date.now();
  const scriptPath = resolve(scriptDir, script);
  try {
    const raw = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      timeout: 300_000
    }).trim();
    const parsed = parseJsonOutput(raw);
    steps.push({ id, status: "passed", elapsedMs: Date.now() - startedAt, script: scriptPath, args, summary: summarize(parsed) });
    return parsed;
  } catch (error) {
    const parsed = parseJsonOutput(String(error.stdout ?? ""));
    const parsedStatus = parsed?.status ?? (parsed?.ok === true ? "ok" : null);
    if (parsed && allowStatuses.includes(parsedStatus)) {
      steps.push({ id, status: parsedStatus, elapsedMs: Date.now() - startedAt, script: scriptPath, args, summary: summarize(parsed) });
      return parsed;
    }
    steps.push({
      id,
      status: "failed",
      elapsedMs: Date.now() - startedAt,
      script: scriptPath,
      args,
      message: String(error.message ?? error),
      stdout: String(error.stdout ?? "").slice(-8000),
      stderr: String(error.stderr ?? "").slice(-8000)
    });
    if (parsed) {
      return parsed;
    }
    throw error;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function booleanOption(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (value === true) {
    return true;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseJsonOutput(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error(`Could not parse JSON output: ${text.slice(0, 1000)}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function buildExistingCaptureNoLaunchPreflight(capturePath) {
  return {
    version: "last-city-toolset-proof-preflight/existing-capture-no-launch",
    generatedAt: new Date().toISOString(),
    status: "existing_capture_no_launch_preflight_skipped",
    blockers: [],
    softBlockers: ["preflight_report_not_supplied_for_existing_capture"],
    requiresExplicitOverride: false,
    supervisedSingleProbeAllowed: false,
    proofLaunchAllowedWithoutOverride: false,
    ingestCapturePath: capturePath,
    safety: {
      launchesToolset: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
      method:
        "existing screenshot ingestion only; skip Toolset launch preflight to avoid reopening a module that already has visual evidence"
    },
    note:
      "This synthetic preflight is valid only for comparing an already captured PNG. Run the real preflight before any new Toolset launch."
  };
}

function summarize(value) {
  return {
    status: value?.status ?? null,
    ok: value?.ok ?? null,
    blockerCode: value?.blockerCode ?? null,
    blockers: value?.blockers ?? null,
    softBlockers: value?.softBlockers ?? null,
    requiresExplicitOverride: value?.requiresExplicitOverride ?? null,
    captureSuccess: value?.captureSuccess ?? value?.capture?.success ?? null,
    canRunVisualComparison: value?.canRunVisualComparison ?? value?.context?.canRunVisualComparison ?? null,
    pngPath: value?.pngPath ?? value?.capture?.pngPath ?? null,
    reportPath: value?.reportPath ?? value?.outputs?.report ?? null
  };
}

function summarizePreflight(value) {
  return {
    status: value?.status ?? null,
    blockers: value?.blockers ?? [],
    softBlockers: value?.softBlockers ?? [],
    requiresExplicitOverride: value?.requiresExplicitOverride === true,
    supervisedSingleProbeAllowed: value?.supervisedSingleProbeAllowed === true,
    proofLaunchAllowedWithoutOverride: value?.proofLaunchAllowedWithoutOverride === true,
    cleanupProbe: value?.cleanupProbe ?? null,
    avReadiness: value?.avReadiness
      ? {
          status: value.avReadiness.status,
          hardBlockers: value.avReadiness.hardBlockers ?? [],
          requiresExplicitOverride: value.avReadiness.requiresExplicitOverride === true,
          family: value.avReadiness.family ?? null
        }
      : null
  };
}

function commandLine(script, args) {
  return ["node", `backend/scripts/${script}`, ...args.map(quoteArg)].join(" ");
}

function quoteArg(value) {
  const text = String(value);
  return /[\s'"|]/u.test(text) ? `"${text.replaceAll('"', '\\"')}"` : text;
}

function sanitizeSegment(value) {
  return String(value ?? "supervised-proof")
    .replace(/[^a-z0-9_.-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 110) || "supervised-proof";
}

function renderMarkdown(report) {
  return `# Last City Supervised Toolset Proof Packet

Status: \`${report.status}\`

Module: \`${report.modulePath}\`

Baseline: \`${report.baselinePath}\`

Area: \`${report.areaResref}\`

Hard blockers: ${report.hardBlockers.length ? report.hardBlockers.map((item) => `\`${item}\``).join(", ") : "_none_"}

Soft blockers: ${report.softBlockers.length ? report.softBlockers.map((item) => `\`${item}\``).join(", ") : "_none_"}

This packet does not launch Toolset unless run with both \`--execute 1\` and
\`--i-understand-toolset-av-risk 1\`. A valid proof is one module open, one area
open, one readonly capture, and then concept comparison. No second open and no
automatic restart are part of this packet.

## Commands

Preflight:

\`\`\`powershell
${report.commandPacket.preflight}
\`\`\`

Open once:

\`\`\`powershell
$env:AURORA_TOOLSET_ALLOW_REPEATED_AV_FAMILY='${report.commandPacket.openOnce.env.AURORA_TOOLSET_ALLOW_REPEATED_AV_FAMILY}'
$env:AURORA_TOOLSET_ALLOW_SECOND_TOOLSET_START='0'
${report.commandPacket.openOnce.command}
\`\`\`

Readonly capture:

\`\`\`powershell
${report.commandPacket.readonlyCapture}
\`\`\`

Compare after capture:

\`\`\`powershell
${report.commandPacket.compareAfterCapture}
\`\`\`

Ingest an existing capture PNG:

\`\`\`powershell
${report.commandPacket.ingestCapture}
\`\`\`
`;
}

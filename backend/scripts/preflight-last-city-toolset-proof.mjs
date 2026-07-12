#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildToolsetLaunchSafetyGate } from "./lib/toolset-open-safety.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");
const artifactRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area"
);

const options = parseArgs(process.argv.slice(2));
const modulePath = resolveMaybe(options.modulePath ?? process.env.AURORA_TOOLSET_MODULE_PATH);
const outPath = resolveMaybe(options.out);
const expectedArea = options.area ?? process.env.AURORA_TOOLSET_EXPECTED_AREA ?? "cdx_mapflat01";
const expectedAreaName =
  options.areaName ??
  process.env.AURORA_TOOLSET_EXPECTED_AREA_NAME ??
  "Ostatnie Miasto - Port, Mieszkanie Kartografa";
const expectedModuleParts =
  options.expectedModuleParts ??
  `${basename(modulePath ?? "missing.mod", ".mod")}|mod`;
const allowFullLastCityDirectOpen =
  flagEnabled(options.allowFullLastCityDirectOpen) ||
  process.env.AURORA_TOOLSET_ALLOW_FULL_LAST_CITY_DIRECT_OPEN === "1";
const allowFullModuleConceptTilemapTarget =
  flagEnabled(options.allowFullModuleConceptTilemapTarget) ||
  process.env.AURORA_LAST_CITY_ALLOW_FULL_MODULE_CONCEPT_TILEMAP_TARGET === "1";

if (!modulePath) {
  throw new Error("Missing --modulePath or AURORA_TOOLSET_MODULE_PATH.");
}
if (!existsSync(modulePath)) {
  throw new Error(`Missing module: ${modulePath}`);
}

const label = sanitizeSegment(options.label ?? basename(modulePath, ".mod"));
const generatedAt = new Date().toISOString();
const stamp = generatedAt.replace(/[:.]/gu, "-");
const reportPath = outPath ?? resolve(artifactRoot, `toolset-proof-preflight-${label}-${stamp}.json`);
const crashRiskPath = reportPath.replace(/\.json$/u, ".crash-risk.json");
const conceptMapPath = reportPath.replace(/\.json$/u, ".concept-map.json");
const criticalFailureRegistryPath = resolve(artifactRoot, "toolset-critical-failures.json");
mkdirSync(dirname(reportPath), { recursive: true });

const candidateQuarantine = findCriticalFailureForModule(modulePath);
const launchSafetyGate = buildToolsetLaunchSafetyGate({
  modulePath,
  criticalFailureRegistryPath,
  allowFullLastCityDirectOpen,
  allowFullModuleConceptTilemapTarget
});
const cleanupProbe = runJsonScript(["cleanup-aurora-toolset-critical-stop.mjs", "--probeOnly"]);
const avReadiness = runJsonScript(["audit-last-city-toolset-av-readiness.mjs", "--modulePath", modulePath, "--area", expectedArea]);
const repeatedFamilyNeedsExplicitOverride = avReadiness.requiresExplicitOverride === true;
const toolsetPreflight = runJsonScript(["open-last-city-module-and-area-toolset-no-global-input.mjs"], {
  env: {
    ...process.env,
    AURORA_TOOLSET_PREFLIGHT_ONLY: "1",
    AURORA_TOOLSET_ALLOW_REPEATED_AV_FAMILY: repeatedFamilyNeedsExplicitOverride ? "1" : "0",
    AURORA_TOOLSET_MODULE_PATH: modulePath,
    AURORA_TOOLSET_EXPECTED_MODULE_PARTS: expectedModuleParts,
    AURORA_TOOLSET_EXPECTED_AREA: expectedArea,
    AURORA_TOOLSET_EXPECTED_AREA_NAME: expectedAreaName,
    AURORA_TOOLSET_ALLOW_FULL_LAST_CITY_DIRECT_OPEN: allowFullLastCityDirectOpen ? "1" : "0",
    AURORA_LAST_CITY_ALLOW_FULL_MODULE_CONCEPT_TILEMAP_TARGET: allowFullModuleConceptTilemapTarget ? "1" : "0"
  }
});
const crashRisk = runJsonScript([
  "check-last-city-apartment-area-crash-risk.mjs",
  "--modulePath",
  modulePath,
  "--out",
  crashRiskPath
]);
const conceptMap = runJsonScript([
  "check-last-city-concept-placeable-map.mjs",
  "--modulePath",
  modulePath,
  "--out",
  conceptMapPath
]);

const blockers = [];
const softBlockers = [];
if (candidateQuarantine) {
  addBlocker("candidate_quarantined_after_toolset_critical_failure");
}
for (const blocker of launchSafetyGate.blockers ?? []) {
  addBlocker(blocker);
}
const cleanupProcesses = cleanupProbe.processes ?? [];
const cleanupToolsetProcesses = cleanupProcesses.filter((process) =>
  String(process?.ProcessName ?? "").toLowerCase().includes("nwtoolset")
);
const cleanupNonToolsetProcesses = cleanupProcesses.filter(
  (process) => !String(process?.ProcessName ?? "").toLowerCase().includes("nwtoolset")
);
if (cleanupToolsetProcesses.length > 0) {
  addBlocker("toolset_processes_present");
}
if (cleanupNonToolsetProcesses.length > 0) {
  addBlocker("nwn_runtime_processes_present");
}
if (cleanupProbe.temp0?.exists) {
  addBlocker("toolset_temp0_present");
}
if (avReadiness.status === "blocked") {
  addBlocker("toolset_av_readiness_blocked");
} else if (repeatedFamilyNeedsExplicitOverride) {
  addSoftBlocker("repeated_area_toolset_access_violation_family_requires_explicit_override");
}
if (toolsetPreflight.ok !== true) {
  const blockerCode = toolsetPreflight.blockerCode ?? "toolset_preflight_failed";
  if (blockerCode === "repeated_area_toolset_access_violation_family" && repeatedFamilyNeedsExplicitOverride) {
    addSoftBlocker("repeated_area_toolset_access_violation_family_requires_explicit_override");
  } else {
    addBlocker(blockerCode);
  }
}
if (crashRisk.status !== "passed" || Number(crashRisk.errorCount ?? 0) > 0 || Number(crashRisk.warningCount ?? 0) > 0) {
  addBlocker("crash_risk_not_clean");
}
if (conceptMap.status !== "passed" || Number(conceptMap.errorCount ?? 0) > 0 || Number(conceptMap.warningCount ?? 0) > 0) {
  addBlocker("concept_map_not_clean");
}

const status =
  blockers.length > 0
    ? "blocked"
    : softBlockers.length > 0
      ? "requires_explicit_override"
      : "passed";

const report = {
  version: "last-city-toolset-proof-preflight/v1",
  generatedAt,
  status,
  blockers,
  softBlockers,
  requiresExplicitOverride: status === "requires_explicit_override",
  supervisedSingleProbeAllowed:
    status === "requires_explicit_override" && avReadiness.allowedProbeContract?.allowed === true,
  proofLaunchAllowedWithoutOverride: status === "passed",
  modulePath,
  expectedModuleParts,
  expectedArea,
  expectedAreaName,
  launchSafetyGate,
  safety: {
    launchesToolset: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    usesGlobalMouse: false,
    method: "cleanup probe + Toolset preflight-only + crash-risk + concept map checker"
  },
  candidateQuarantine,
  avReadiness: {
    status: avReadiness.status,
    blockers: avReadiness.blockers ?? [],
    hardBlockers: avReadiness.hardBlockers ?? [],
    requiresExplicitOverride: avReadiness.requiresExplicitOverride === true,
    safetyGuard: avReadiness.safetyGuard ?? null,
    openerGuard: avReadiness.openerGuard ?? null,
    moduleInfo: avReadiness.moduleInfo ?? null,
    family: avReadiness.family
      ? {
          totalFailureCount: avReadiness.family.totalFailureCount,
          smallLabFailureCount: avReadiness.family.smallLabFailureCount,
          uniqueSmallLabModuleCount: avReadiness.family.uniqueSmallLabModuleCount,
          fullModuleFailureCount: avReadiness.family.fullModuleFailureCount,
          uniqueFullModuleTargetCount: avReadiness.family.uniqueFullModuleTargetCount,
          postGuardFailureCount: avReadiness.family.postGuardFailureCount
        }
      : null,
    allowedProbeContract: avReadiness.allowedProbeContract ?? null
  },
  cleanupProbe: {
    ok: cleanupProbe.ok,
    processCount: cleanupProcesses.length,
    toolsetProcessCount: cleanupToolsetProcesses.length,
    nonToolsetProcessCount: cleanupNonToolsetProcesses.length,
    nonToolsetProcesses: cleanupNonToolsetProcesses.map((process) => ({
      processName: process.ProcessName,
      id: process.Id,
      mainWindowTitle: process.MainWindowTitle,
      responding: process.Responding
    })),
    temp0Exists: cleanupProbe.temp0?.exists === true,
    temp0Path: cleanupProbe.temp0?.path
  },
  toolsetPreflight: {
    ok: toolsetPreflight.ok,
    blockerCode: toolsetPreflight.blockerCode ?? null,
    allowRepeatedAccessViolationFamily: repeatedFamilyNeedsExplicitOverride,
    preflightOnly: toolsetPreflight.preflightOnly === true,
    temp0Exists: toolsetPreflight.temp0?.exists === true,
    existingToolsetProcessCount: (toolsetPreflight.existingToolsetProcesses ?? []).length,
    repeatedCriticalFailureFamily: toolsetPreflight.repeatedCriticalFailureFamily ?? null,
    fullSizeConceptTilemapTarget: toolsetPreflight.fullSizeConceptTilemapTarget ?? null,
    fullLastCityModuleTarget: toolsetPreflight.fullLastCityModuleTarget ?? null,
    candidateQuarantine: toolsetPreflight.candidateQuarantine ?? null
  },
  crashRisk: {
    status: crashRisk.status,
    errorCount: crashRisk.errorCount,
    warningCount: crashRisk.warningCount,
    outputPath: crashRisk.outputPath ?? crashRiskPath
  },
  conceptMap: {
    status: conceptMap.status,
    errorCount: conceptMap.errorCount,
    warningCount: conceptMap.warningCount,
    totalPlaceables: conceptMap.totalPlaceables,
    outPath: conceptMap.outPath ?? conceptMapPath,
    markdownPath: conceptMap.markdownPath,
    svgPath: conceptMap.svgPath
  }
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(reportPath.replace(/\.json$/u, ".md"), renderMarkdown(report), "utf8");
console.log(
  JSON.stringify(
    {
      status: report.status,
      blockers: report.blockers,
      softBlockers: report.softBlockers,
      requiresExplicitOverride: report.requiresExplicitOverride,
      modulePath: report.modulePath,
      reportPath,
      markdownPath: reportPath.replace(/\.json$/u, ".md"),
      crashRiskPath,
      conceptMapPath
    },
    null,
    2
  )
);
if (report.status === "blocked") {
  process.exitCode = 2;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function resolveMaybe(value) {
  return value ? resolve(repoRoot, value) : value;
}

function flagEnabled(value) {
  if (value === undefined || value === null) {
    return false;
  }
  return ["1", "true", "yes", "y", "on"].includes(String(value).trim().toLowerCase());
}

function runJsonScript(args, options = {}) {
  let raw = "";
  try {
    raw = execFileSync(process.execPath, args.map((arg, index) => (index === 0 ? resolve(scriptDir, arg) : arg)), {
      cwd: repoRoot,
      encoding: "utf8",
      env: options.env ?? process.env,
      maxBuffer: 1024 * 1024 * 16,
      timeout: options.timeoutMs ?? 120_000
    }).trim();
  } catch (error) {
    raw = String(error.stdout ?? "").trim();
    if (!raw) {
      throw new Error(
        `Script failed without JSON: ${args.join(" ")}\n${String(error.stderr ?? error.message).slice(0, 2000)}`
      );
    }
  }
  if (!raw) {
    throw new Error(`Script produced no JSON: ${args.join(" ")}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${args.join(" ")}: ${error.message}\n${raw.slice(0, 2000)}`);
  }
}

function renderMarkdown(report) {
  return `# Last City Toolset Proof Preflight

Status: \`${report.status}\`

Module: \`${report.modulePath}\`

Blockers: ${report.blockers.length > 0 ? report.blockers.map((blocker) => `\`${blocker}\``).join(", ") : "_none_"}

Soft blockers: ${report.softBlockers.length > 0 ? report.softBlockers.map((blocker) => `\`${blocker}\``).join(", ") : "_none_"}

| Gate | Status |
| --- | --- |
| Toolset processes | ${report.cleanupProbe.processCount} |
| temp0 | ${report.cleanupProbe.temp0Exists ? "present" : "absent"} |
| Toolset launch safety | ${renderLaunchSafetyGateSummary(report.launchSafetyGate)} |
| Toolset dry preflight | ${report.toolsetPreflight.ok ? "passed" : report.toolsetPreflight.blockerCode} |
| Repeated AV family | ${renderRepeatedFamilySummary(report.toolsetPreflight.repeatedCriticalFailureFamily)} |
| AV readiness | ${renderAvReadinessSummary(report.avReadiness)} |
| Single-open guard | ${renderSingleOpenGuardSummary(report.avReadiness)} |
| Candidate quarantine | ${report.candidateQuarantine ? `blocked (${report.candidateQuarantine.reason})` : "clear"} |
| Crash risk | ${report.crashRisk.status}, errors ${report.crashRisk.errorCount}, warnings ${report.crashRisk.warningCount} |
| Concept map | ${report.conceptMap.status}, errors ${report.conceptMap.errorCount}, warnings ${report.conceptMap.warningCount} |

This preflight does not launch Aurora Toolset. Status
\`requires_explicit_override\` means the candidate is offline-clean, but a
Toolset proof may only proceed as a deliberately supervised single probe with
the single-open guard active.
`;
}

function renderRepeatedFamilySummary(family) {
  if (!family) {
    return "clear";
  }
  return `blocked: smallLab=${family.failureCount}/${family.uniqueModuleCount} modules, fullModule=${family.fullModuleFailureCount}/${family.uniqueFullModuleTargetCount} modules`;
}

function renderAvReadinessSummary(readiness) {
  if (!readiness) {
    return "missing";
  }
  const family = readiness.family;
  const familyText = family
    ? `smallLab=${family.smallLabFailureCount}/${family.uniqueSmallLabModuleCount}, fullModule=${family.fullModuleFailureCount}/${family.uniqueFullModuleTargetCount}, postGuard=${family.postGuardFailureCount}`
    : "family=none";
  return `${readiness.status}${readiness.requiresExplicitOverride ? " (explicit override required)" : ""}; ${familyText}`;
}

function renderSingleOpenGuardSummary(readiness) {
  const openerGuard = readiness?.openerGuard;
  const safetyGuard = readiness?.safetyGuard;
  if (!openerGuard) {
    return "missing";
  }
  const missing = openerGuard.missingMarkers ?? [];
  const version = safetyGuard?.version ?? openerGuard.version ?? "unknown";
  if (missing.length > 0) {
    return `${version}; missing ${missing.join(", ")}`;
  }
  return `${version}; markers ok`;
}

function renderLaunchSafetyGateSummary(gate) {
  if (!gate) {
    return "missing";
  }
  if (gate.ok) {
    return "passed";
  }
  return `blocked: ${(gate.blockers ?? []).join(", ")}`;
}

function sanitizeSegment(value) {
  return String(value ?? "candidate")
    .replace(/[^a-z0-9_.-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96) || "candidate";
}

function addBlocker(blocker) {
  if (!blockers.includes(blocker)) {
    blockers.push(blocker);
  }
}

function addSoftBlocker(blocker) {
  if (!softBlockers.includes(blocker)) {
    softBlockers.push(blocker);
  }
}

function findCriticalFailureForModule(modulePath) {
  if (!existsSync(criticalFailureRegistryPath)) {
    return null;
  }
  const registry = JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"));
  const records = Array.isArray(registry.records) ? registry.records : [];
  const moduleBaseName = basename(modulePath).toLowerCase();
  const normalizedPath = resolve(modulePath).toLowerCase();
  const match = [...records].reverse().find((record) => {
    if (record.status !== "rejected") {
      return false;
    }
    const recordPath = record.modulePath ? resolve(record.modulePath).toLowerCase() : null;
    const recordBaseName = record.moduleBaseName ? String(record.moduleBaseName).toLowerCase() : null;
    return recordPath === normalizedPath || recordBaseName === moduleBaseName;
  });
  if (!match) {
    return null;
  }
  return {
    blocked: true,
    reason: match.reason,
    recordedAt: match.recordedAt,
    modulePath: match.modulePath,
    moduleBaseName: match.moduleBaseName,
    registryPath: criticalFailureRegistryPath
  };
}

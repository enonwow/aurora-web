#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
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
const criticalFailureRegistryPath = resolve(artifactRoot, "toolset-critical-failures.json");
const openerPath = resolve(scriptDir, "open-last-city-module-and-area-toolset-no-global-input.mjs");
const conceptTilemapLabMaxBytes = 10 * 1024 * 1024;
const safetyGuard = {
  version: "single-open-sizeclass-persistent-guard-v3",
  // First guard version after the last recorded AV in this family. It is a
  // diagnostic boundary, not proof that Toolset is safe.
  introducedAt: "2026-07-06T20:15:00.000Z",
  requiredMarkers: [
    "moduleOpenActionSubmitted",
    "module_open_selection_submitted_but_expected_frame_not_loaded",
    "moduleOpenSessionGuard",
    "module_open_session_already_active",
    "module_open_session_fresh_guard_without_visible_process",
    "AURORA_TOOLSET_ALLOW_SECOND_TOOLSET_START",
    "classifyConceptTilemapFailureRecord"
  ]
};

const options = parseArgs(process.argv.slice(2));
const modulePath = resolveMaybe(options.modulePath ?? process.env.AURORA_TOOLSET_MODULE_PATH);
const areaResref = options.area ?? process.env.AURORA_TOOLSET_EXPECTED_AREA ?? "cdx_mapflat01";

if (!modulePath) {
  throw new Error("Missing --modulePath or AURORA_TOOLSET_MODULE_PATH.");
}
if (!existsSync(modulePath)) {
  throw new Error(`Missing module: ${modulePath}`);
}

const moduleInfo = classifyModule(modulePath);
const cleanup = {
  processes: listNwnProcesses(),
  temp0: getTemp0Status()
};
const registry = readRegistry();
const candidateQuarantine = findCriticalFailureForModule(registry, modulePath);
const launchSafetyGate = buildToolsetLaunchSafetyGate({
  modulePath,
  criticalFailureRegistryPath
});
const family = buildFamilyBreakdown(registry, areaResref);
const openerGuard = inspectOpenerGuard();
const blockers = [];

if (cleanup.processes.length > 0) {
  addBlocker("nwn_or_toolset_processes_present");
}
if (cleanup.temp0.exists) {
  addBlocker("toolset_temp0_present");
}
if (candidateQuarantine) {
  addBlocker("candidate_quarantined_after_toolset_critical_failure");
}
for (const blocker of launchSafetyGate.blockers ?? []) {
  addBlocker(blocker);
}
if (moduleInfo.sizeClass !== "small_lab_target") {
  addBlocker(moduleInfo.sizeClass === "full_module_target" ? "full_module_concept_tilemap_lab_target" : "invalid_module_size_class");
}
if (!openerGuard.present) {
  addBlocker("opener_safety_guard_markers_missing");
}
if (family.postGuardFailureCount > 0) {
  addBlocker("post_guard_access_violation_recorded");
}
if (family.smallLabFailureCount >= 3 && family.uniqueSmallLabModuleCount >= 2) {
  addBlocker("repeated_small_lab_access_violation_history_requires_override");
}

const hardBlockers = blockers.filter((blocker) => blocker !== "repeated_small_lab_access_violation_history_requires_override");
const status =
  hardBlockers.length > 0
    ? "blocked"
    : blockers.includes("repeated_small_lab_access_violation_history_requires_override")
      ? "ready_for_supervised_single_probe_with_explicit_override"
      : "ready_for_supervised_single_probe";

const report = {
  version: "last-city-toolset-av-readiness/v1",
  generatedAt: new Date().toISOString(),
  status,
  blockers,
  hardBlockers,
  requiresExplicitOverride: status === "ready_for_supervised_single_probe_with_explicit_override",
  safety: {
    launchesToolset: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    method: "offline registry/process/temp0/module-size/opener-guard audit"
  },
  modulePath,
  moduleInfo,
  areaResref,
  launchSafetyGate,
  cleanup: {
    processCount: cleanup.processes.length,
    processes: cleanup.processes,
    temp0: cleanup.temp0
  },
  safetyGuard,
  openerGuard,
  candidateQuarantine,
  family,
  allowedProbeContract: buildAllowedProbeContract(status)
};

console.log(JSON.stringify(report, null, 2));
if (status === "blocked") {
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

function resolveMaybe(value) {
  return value ? resolve(repoRoot, value) : value;
}

function classifyModule(targetPath) {
  const moduleBaseName = basename(targetPath).toLowerCase();
  const sizeBytes = statSync(targetPath).size;
  const isConceptTilemap = moduleBaseName.startsWith("codex_writer_concept_sic_tilemap");
  return {
    moduleBaseName,
    sizeBytes,
    isConceptTilemap,
    sizeClass: !isConceptTilemap
      ? "non_concept_tilemap"
      : sizeBytes > conceptTilemapLabMaxBytes
        ? "full_module_target"
        : "small_lab_target",
    maxSmallLabBytes: conceptTilemapLabMaxBytes
  };
}

function listNwnProcesses() {
  const script = String.raw`
$processes = @(Get-Process nwtoolset,nwmain,nwserver -ErrorAction SilentlyContinue |
  Select-Object Id,ProcessName,MainWindowTitle,Responding,StartTime,Path)
if ($processes.Count -eq 0) { '[]' } else { $processes | ConvertTo-Json -Depth 4 }
`;
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  }).trim();
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function getTemp0Status() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\enonw";
  const temp0Path = join(home, "Documents", "Neverwinter Nights", "modules", "temp0");
  return {
    exists: existsSync(temp0Path),
    path: temp0Path
  };
}

function readRegistry() {
  if (!existsSync(criticalFailureRegistryPath)) {
    return { version: "last-city-toolset-critical-failures/v1", records: [] };
  }
  return JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"));
}

function findCriticalFailureForModule(registry, targetPath) {
  const records = Array.isArray(registry.records) ? registry.records : [];
  const moduleBaseName = basename(targetPath).toLowerCase();
  const normalizedPath = resolve(targetPath).toLowerCase();
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

function buildFamilyBreakdown(registry, targetAreaResref) {
  const normalizedArea = String(targetAreaResref ?? "").toLowerCase();
  const records = (Array.isArray(registry.records) ? registry.records : []).filter((record) => {
    if (record.status !== "rejected") {
      return false;
    }
    const recordBaseName = String(record.moduleBaseName ?? "").toLowerCase();
    if (!recordBaseName.startsWith("codex_writer_concept_sic_tilemap")) {
      return false;
    }
    const recordArea = String(record.areaResref ?? normalizedArea).toLowerCase();
    if (normalizedArea && recordArea && recordArea !== normalizedArea) {
      return false;
    }
    return criticalRecordMentionsAccessViolation(record);
  });
  const classified = records.map((record) => ({ record, size: classifyRecordModule(record) }));
  const smallLab = classified.filter((item) => item.size.sizeClass === "small_lab_target");
  const fullModule = classified.filter((item) => item.size.sizeClass === "full_module_target");
  const guardTime = Date.parse(safetyGuard.introducedAt);
  const postGuard = classified.filter((item) => Date.parse(item.record.recordedAt ?? "") >= guardTime);
  const uniqueSmall = new Set(smallLab.map((item) => String(item.record.moduleBaseName ?? "").toLowerCase()).filter(Boolean));
  const uniqueFull = new Set(fullModule.map((item) => String(item.record.moduleBaseName ?? "").toLowerCase()).filter(Boolean));
  return {
    registryPath: criticalFailureRegistryPath,
    totalFailureCount: classified.length,
    smallLabFailureCount: smallLab.length,
    uniqueSmallLabModuleCount: uniqueSmall.size,
    fullModuleFailureCount: fullModule.length,
    uniqueFullModuleTargetCount: uniqueFull.size,
    postGuardFailureCount: postGuard.length,
    postGuardFailures: postGuard.map(formatFailureSample),
    recentSmallLabFailures: smallLab.slice(-8).map(formatFailureSample),
    recentFullModuleFailures: fullModule.slice(-8).map(formatFailureSample)
  };
}

function classifyRecordModule(record) {
  const moduleBaseName = String(record.moduleBaseName ?? "").toLowerCase();
  if (!moduleBaseName.startsWith("codex_writer_concept_sic_tilemap")) {
    return { sizeClass: "non_concept_tilemap", moduleBaseName, sizeBytes: null, exists: false };
  }
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\enonw";
  const candidatePaths = [
    record.modulePath ? resolve(record.modulePath) : null,
    join(home, "Documents", "Neverwinter Nights", "modules", moduleBaseName)
  ].filter(Boolean);
  const existingPath = candidatePaths.find((candidatePath) => existsSync(candidatePath));
  if (!existingPath) {
    return { sizeClass: "missing_module_file", moduleBaseName, sizeBytes: null, exists: false };
  }
  const sizeBytes = statSync(existingPath).size;
  return {
    sizeClass: sizeBytes > conceptTilemapLabMaxBytes ? "full_module_target" : "small_lab_target",
    moduleBaseName,
    modulePath: existingPath,
    sizeBytes,
    exists: true
  };
}

function criticalRecordMentionsAccessViolation(record) {
  const text = JSON.stringify(record).toLowerCase();
  return text.includes("access violation") || text.includes("access-violation") || text.includes("access_violation");
}

function formatFailureSample(item) {
  return {
    recordedAt: item.record.recordedAt,
    reason: item.record.reason,
    moduleBaseName: item.record.moduleBaseName,
    sizeClass: item.size.sizeClass,
    sizeBytes: item.size.sizeBytes,
    message: extractCriticalFailureMessage(item.record)
  };
}

function extractCriticalFailureMessage(record) {
  const direct = record.evidence?.postLoadBlockingModal?.childTexts;
  if (Array.isArray(direct)) {
    const message = direct.find((text) => String(text).toLowerCase().includes("access violation"));
    if (message) {
      return message;
    }
  }
  if (record.evidence?.userVisibleCrash) {
    return record.evidence.userVisibleCrash;
  }
  const serialized = JSON.stringify(record);
  const match = /Access violation[^"]+/u.exec(serialized);
  return match?.[0] ?? null;
}

function inspectOpenerGuard() {
  if (!existsSync(openerPath)) {
    return {
      present: false,
      openerPath,
      missingMarkers: safetyGuard.requiredMarkers
    };
  }
  const source = readFileSync(openerPath, "utf8");
  const missingMarkers = safetyGuard.requiredMarkers.filter((marker) => !source.includes(marker));
  return {
    present: missingMarkers.length === 0,
    openerPath,
    version: safetyGuard.version,
    introducedAt: safetyGuard.introducedAt,
    missingMarkers,
    foundMarkers: safetyGuard.requiredMarkers.filter((marker) => source.includes(marker))
  };
}

function buildAllowedProbeContract(status) {
  if (status === "blocked") {
    return {
      allowed: false,
      reason: "Hard blockers remain; do not launch Toolset."
    };
  }
  return {
    allowed: true,
    reason:
      status === "ready_for_supervised_single_probe_with_explicit_override"
        ? "Only a deliberately supervised single probe may proceed; historical small-lab AVs still require explicit override."
        : "No historical family override is required, but proof still needs normal clean-start controls.",
    requiredControls: [
      "AURORA_TOOLSET_PREFLIGHT_ONLY must pass immediately before proof.",
      "No nwtoolset/nwmain/nwserver processes.",
      "No temp0.",
      "Candidate module must be a small lab target and not quarantined.",
      "Use the single-open opener; no second Open Module action is allowed.",
      "Abort on any recovery prompt, Loading Inventory List stall, or access violation."
    ]
  };
}

function addBlocker(blocker) {
  if (!blockers.includes(blocker)) {
    blockers.push(blocker);
  }
}

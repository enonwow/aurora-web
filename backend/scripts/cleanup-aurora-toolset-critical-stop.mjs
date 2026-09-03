#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  renameSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const artifactRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area"
);

const reason = sanitizeSegment(readArg("--reason") ?? process.env.AURORA_TOOLSET_CRITICAL_STOP_REASON ?? "critical-stop");
const modulePath = resolveMaybe(readArg("--modulePath") ?? process.env.AURORA_TOOLSET_MODULE_PATH ?? null);
const areaResref = readArg("--area") ?? process.env.AURORA_TOOLSET_EXPECTED_AREA ?? null;
const probeOnly =
  readFlag("--probeOnly") || process.env.AURORA_TOOLSET_CRITICAL_STOP_PROBE_ONLY === "1";
const archiveTemp0Requested =
  readFlag("--archiveTemp0") || process.env.AURORA_TOOLSET_ARCHIVE_TEMP0 === "1";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const nwnRoot = join(getHomeDir(), "Documents", "Neverwinter Nights");
const modulesDir = join(nwnRoot, "modules");
const temp0Path = join(modulesDir, "temp0");
const iniPath = process.env.AURORA_TOOLSET_INI_PATH ?? join(nwnRoot, "nwtoolset.ini");
const iniSnapshotPath =
  process.env.AURORA_TOOLSET_INI_SNAPSHOT ??
  join(artifactRoot, "nwtoolset.ini.snapshot-20260703T1135.txt");
const criticalFailureRegistryPath = join(artifactRoot, "toolset-critical-failures.json");
const moduleOpenSessionGuardPath = join(artifactRoot, "toolset-module-open-session-guard.json");

mkdirSync(artifactRoot, { recursive: true });

const beforeProcesses = listAuroraProcesses();
const inferredModuleCandidate = inferModuleCandidateFromProcesses(beforeProcesses);
if (probeOnly) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        probeOnly: true,
        safety: {
          criticalStop: false,
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouse: false,
          method: "Read Aurora process and temp0 state only; do not stop or mutate files"
        },
        reason,
        processes: beforeProcesses,
        inferredModuleCandidate,
        moduleOpenSessionGuard: readModuleOpenSessionGuard(),
        temp0: {
          exists: existsSync(temp0Path),
          path: temp0Path
        },
        iniPath
      },
      null,
      2
    )
  );
  process.exit(0);
}
const stoppedProcesses = stopAuroraProcesses();
const archivedTemp0 = archiveTemp0Requested
  ? archiveTemp0()
  : {
      moved: false,
      reason: "preserved_without_explicit_archive",
      path: temp0Path
    };
const restoredIni = {
  restored: false,
  reason: "toolset_ini_mutation_forbidden",
  iniPath,
  iniSnapshotPath
};
const releasedModuleOpenSessionGuard = releaseModuleOpenSessionGuard(beforeProcesses);
// Cleanup may preserve a stale workspace, but that is not evidence of an access violation.
const criticalFailureRecord = {
  recorded: false,
  reason: "cleanup_does_not_assert_critical_failure",
  registryPath: criticalFailureRegistryPath
};
const afterProcesses = listAuroraProcesses();

console.log(
  JSON.stringify(
    {
      ok: afterProcesses.length === 0,
      safety: {
        criticalStop: true,
        usesGlobalCursor: false,
        usesGlobalKeyboard: false,
        usesGlobalMouse: false,
        method: "Stop Aurora processes; preserve temp0 unless --archiveTemp0 is explicit; never read or write nwtoolset.ini"
      },
      reason,
      archiveTemp0Requested,
      beforeProcesses,
      stoppedProcesses,
      archivedTemp0,
      restoredIni,
      releasedModuleOpenSessionGuard,
      criticalFailureRecord,
      afterProcesses
    },
    null,
    2
  )
);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function readFlag(name) {
  return process.argv.includes(name);
}

function resolveMaybe(value) {
  return value ? resolve(value) : null;
}

function sanitizeSegment(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80) || "critical-stop";
}

function getHomeDir() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required.");
  }
  return home;
}

function runPowerShell(script) {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 4
    }
  ).trim();
}

function listAuroraProcesses() {
  const raw = runPowerShell(String.raw`
$processes = @(Get-Process nwtoolset,nwmain,nwserver -ErrorAction SilentlyContinue |
  Select-Object ProcessName,Id,MainWindowTitle,Responding,StartTime)
if ($processes.Count -eq 0) {
  '[]'
} else {
  $processes | ConvertTo-Json -Depth 4
}
`);
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function stopAuroraProcesses() {
  const raw = runPowerShell(String.raw`
$processes = @(Get-Process nwtoolset,nwmain,nwserver -ErrorAction SilentlyContinue)
$summary = @($processes | Select-Object ProcessName,Id,MainWindowTitle,Responding)
foreach ($process in $processes) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
if ($summary.Count -eq 0) {
  '[]'
} else {
  $summary | ConvertTo-Json -Depth 4
}
`);
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function archiveTemp0() {
  if (!existsSync(temp0Path)) {
    return { moved: false, reason: "temp0_missing", path: temp0Path };
  }
  const resolvedTemp0 = resolve(temp0Path);
  const resolvedModules = resolve(modulesDir);
  if (!resolvedTemp0.toLowerCase().startsWith(`${resolvedModules.toLowerCase()}\\`)) {
    throw new Error(`Refusing to move temp0 outside modules dir: ${resolvedTemp0}`);
  }
  const destination = join(artifactRoot, `toolset-temp0-${timestamp}-${reason}`);
  renameSync(resolvedTemp0, destination);
  return {
    moved: true,
    source: resolvedTemp0,
    destination,
    bytes: safeSize(destination)
  };
}

function readModuleOpenSessionGuard() {
  if (!existsSync(moduleOpenSessionGuardPath)) {
    return {
      exists: false,
      path: moduleOpenSessionGuardPath
    };
  }
  try {
    return {
      exists: true,
      path: moduleOpenSessionGuardPath,
      value: JSON.parse(readFileSync(moduleOpenSessionGuardPath, "utf8"))
    };
  } catch (error) {
    return {
      exists: true,
      path: moduleOpenSessionGuardPath,
      unreadable: true,
      error: error?.message ?? String(error)
    };
  }
}

function releaseModuleOpenSessionGuard(beforeProcesses) {
  const guard = readModuleOpenSessionGuard();
  if (!guard.exists) {
    return {
      released: false,
      reason: "guard_missing",
      path: moduleOpenSessionGuardPath
    };
  }
  const value = guard.value ?? {
    state: "unreadable_guard",
    unreadable: true,
    error: guard.error ?? null
  };
  const released = {
    ...value,
    state: "released",
    releasedAt: new Date().toISOString(),
    releaseReason: reason,
    beforeProcessCount: beforeProcesses.length
  };
  writeFileSync(moduleOpenSessionGuardPath, `${JSON.stringify(released, null, 2)}\n`, "utf8");
  return {
    released: true,
    path: moduleOpenSessionGuardPath,
    previousState: value.state ?? null,
    releaseReason: reason
  };
}

function recordCriticalFailure({ reason, modulePath, areaResref, beforeProcesses, stoppedProcesses, archivedTemp0 }) {
  const registry = readCriticalFailureRegistry();
  const inferred = inferModuleCandidateFromProcesses(beforeProcesses);
  const resolvedModulePath = modulePath ?? inferred?.modulePath ?? null;
  const moduleBaseName = resolvedModulePath
    ? basename(resolvedModulePath).toLowerCase()
    : inferred?.moduleBaseName ?? null;
  const record = {
    recordedAt: new Date().toISOString(),
    status: "rejected",
    reason,
    modulePath: resolvedModulePath,
    moduleBaseName,
    modulePathInferredFromWindowTitle: modulePath ? false : inferred !== null,
    inferredModuleCandidate: inferred,
    areaResref,
    beforeProcesses: beforeProcesses.map((process) => ({
      processName: process.ProcessName ?? process.processName ?? null,
      id: process.Id ?? process.id ?? null,
      mainWindowTitle: process.MainWindowTitle ?? process.mainWindowTitle ?? null
    })),
    stoppedProcessCount: stoppedProcesses.length,
    archivedTemp0
  };
  registry.records = Array.isArray(registry.records) ? registry.records : [];
  registry.records.push(record);
  registry.version = "last-city-toolset-critical-failures/v1";
  writeFileSync(criticalFailureRegistryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return {
    recorded: true,
    registryPath: criticalFailureRegistryPath,
    record
  };
}

function readCriticalFailureRegistry() {
  if (!existsSync(criticalFailureRegistryPath)) {
    return { version: "last-city-toolset-critical-failures/v1", records: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"));
    return {
      version: parsed.version ?? "last-city-toolset-critical-failures/v1",
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch (error) {
    throw new Error(`Failed to read critical failure registry ${criticalFailureRegistryPath}: ${error.message}`);
  }
}

function safeSize(path) {
  try {
    const stat = statSync(path);
    return stat.isFile() ? stat.size : null;
  } catch {
    return null;
  }
}

function inferModuleCandidateFromProcesses(processes) {
  for (const process of processes) {
    const title = String(process.MainWindowTitle ?? process.mainWindowTitle ?? "");
    const moduleBaseName = extractModuleBaseNameFromTitle(title);
    if (!moduleBaseName) {
      continue;
    }
    const candidateModulePath = join(modulesDir, moduleBaseName);
    return {
      moduleBaseName: moduleBaseName.toLowerCase(),
      modulePath: existsSync(candidateModulePath) ? candidateModulePath : null,
      modulePathExists: existsSync(candidateModulePath),
      source: "toolset-window-title",
      title
    };
  }
  return null;
}

function extractModuleBaseNameFromTitle(title) {
  const matches = [...String(title).matchAll(/([^\\/:*?"<>|\r\n]+\.mod)\b/giu)];
  if (matches.length === 0) {
    return null;
  }
  return matches[matches.length - 1][1].trim();
}

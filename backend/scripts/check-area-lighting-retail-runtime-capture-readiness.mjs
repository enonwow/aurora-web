#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_GATE_REPORT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-oracle-artifact-gate.json";
const DEFAULT_DRIVER_SOURCE_MANIFEST =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/retail-oracle-scene-drivers-manifest.json";
const DEFAULT_DRIVER_COMPILE_MANIFEST =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/retail-oracle-scene-drivers-compile-manifest.json";
const DEFAULT_DRIVER_MODULE_INJECTION_SUMMARY =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/compiled-driver-module-injection-summary.json";

const RESOURCE_TYPES = {
  txt: 10,
  nss: 2009,
  ncs: 2010,
  are: 2012,
  ifo: 2014,
  git: 2023,
  gic: 2046,
};

const ORACLE_STAGE_AREA_RESREF = "als_light_lab";

const ORACLE_SCENE_REQUIREMENTS = [
  {
    caseId: "shadowvol-campfire-pixel-geometry-opacity",
    requiredDriverScripts: ["als_shcamp"],
    requiredAreaResrefs: [ORACLE_STAGE_AREA_RESREF],
    partialModuleNamePatterns: [/lightboost/i, /camp/i, /fire/i],
    partialEvidence:
      "A module name hints at a light/campfire probe, but no dedicated same-fixture shadow-volume oracle driver is present.",
    blocker:
      "Missing compiled retail/toolset scene driver for the same campfire/placeable fixture used by aurora-web-shadowvol-campfire.png.",
  },
  {
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    requiredDriverScripts: ["als_xlane"],
    requiredAreaResrefs: [ORACLE_STAGE_AREA_RESREF],
    partialModuleNamePatterns: [/vfx/i, /light/i],
    partialEvidence:
      "VFX/light lab modules exist, but no all-lane tile/placeable/MDL/item/ProgFX constrained-budget oracle scene is present.",
    blocker:
      "Missing compiled retail nwmain scene driver that creates all required light lanes and records active-slot ordering.",
  },
  {
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    requiredDriverScripts: ["als_pfxpri"],
    requiredAreaResrefs: [ORACLE_STAGE_AREA_RESREF],
    partialModuleNamePatterns: [/vfx/i],
    genericScriptResrefs: ["vfxlab_one", "vxlb00100"],
    partialEvidence:
      "The VFX catalog lab can play individual visualeffects rows, but priority/tie/zero needs simultaneous Type 4 requests.",
    blocker:
      "Missing compiled ProgFX priority/tie/zero oracle driver; row-by-row catalog playback is not a priority-policy proof.",
  },
  {
    caseId: "progfx-type4-proximity-threshold",
    requiredDriverScripts: ["als_pfxprox"],
    requiredAreaResrefs: [ORACLE_STAGE_AREA_RESREF],
    partialModuleNamePatterns: [/vfx/i],
    genericScriptResrefs: ["vfxlab_one", "vxlb00100"],
    partialEvidence:
      "The VFX catalog lab can play rows with Param5 source data, but it does not perform a distance sweep.",
    blocker:
      "Missing compiled ProgFX proximity oracle driver with measured distance samples around the suppression threshold.",
  },
  {
    caseId: "progfx-type4-attach-to-scene-restore",
    requiredDriverScripts: ["als_pfxatt"],
    requiredAreaResrefs: [ORACLE_STAGE_AREA_RESREF],
    partialModuleNamePatterns: [/vfx/i],
    genericScriptResrefs: ["vfxlab_one", "vxlb00000"],
    partialEvidence:
      "The VFX catalog lab can play the blackout owner row, but it does not create before/active/after scene-light restore states.",
    blocker:
      "Missing compiled ProgFX attach-to-scene oracle driver that records scene-light removal and restoration.",
  },
  {
    caseId: "progfx-type4-blind-vision-pixels",
    requiredDriverScripts: ["als_pfxblind"],
    requiredAreaResrefs: [ORACLE_STAGE_AREA_RESREF],
    partialModuleNamePatterns: [/vfx/i],
    genericScriptResrefs: ["vfxlab_one", "vxlb00200"],
    partialEvidence:
      "The VFX catalog lab can play VFX_DUR_BLINDVISION by row block, but it does not produce before/active fixed-camera oracle screenshots.",
    blocker:
      "Missing compiled Blind_Vision oracle driver with before and active viewport capture points.",
  },
];

const RUNTIME_CAPTURE_TARGETS = [
  {
    artifact: "retail-or-toolset-shadowvol-campfire.png",
    caseId: "shadowvol-campfire-pixel-geometry-opacity",
    source: "retail-or-toolset-window-pixels",
    requiredRuntime: ["nwtoolset-or-nwmain"],
    captureKind: "single-reference-png",
    acceptance: "Same campfire/placeable fixture as aurora-web-shadowvol-campfire.png.",
  },
  {
    artifact: "retail-cross-lane-all-lanes-before-budget.png",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-budget-reference-png",
    acceptance: "Scene shows all tile/placeable/MDL/item/ProgFX lanes before active-light budget pressure.",
  },
  {
    artifact: "retail-cross-lane-all-lanes-after-budget.png",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "after-budget-reference-png",
    acceptance: "Scene shows accepted/dropped lanes after constrained active-light budget pressure.",
  },
  {
    artifact: "retail-cross-lane-active-slots.json",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-slot-dump-or-observed-oracle",
    requiredRuntime: ["nwmain"],
    captureKind: "structured-active-slot-oracle",
    acceptance: "Lists accepted/dropped tile/placeable/MDL/item/ProgFX lanes under the same constrained budget.",
  },
  {
    artifact: "retail-progfx-priority-policy-before.png",
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-policy-reference-png",
    acceptance: "Before image for priority/tie/zero policy scene.",
  },
  {
    artifact: "retail-progfx-priority-policy-after.png",
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "after-policy-reference-png",
    acceptance: "After image proving the visible winner under priority/tie/zero policy.",
  },
  {
    artifact: "retail-progfx-proximity-distance-sweep-contact-sheet.png",
    caseId: "progfx-type4-proximity-threshold",
    source: "retail-runtime-distance-sweep-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "distance-sweep-contact-sheet",
    acceptance: "Contact sheet covers distances around the suppression threshold.",
  },
  {
    artifact: "retail-progfx-attach-scene-before.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-attach-reference-png",
    acceptance: "Scene-light state before Param6 attach-to-scene effect.",
  },
  {
    artifact: "retail-progfx-attach-scene-active.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "active-attach-reference-png",
    acceptance: "Scene-light state while Param6 attach-to-scene effect is active.",
  },
  {
    artifact: "retail-progfx-attach-scene-after-remove.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "after-remove-attach-reference-png",
    acceptance: "Scene-light state after effect removal/cessation.",
  },
  {
    artifact: "retail-progfx-blindvision-before.png",
    caseId: "progfx-type4-blind-vision-pixels",
    source: "retail-runtime-vision-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-vision-reference-png",
    acceptance: "Viewport before Blind_Vision/Darkvision mutation.",
  },
  {
    artifact: "retail-progfx-blindvision-active.png",
    caseId: "progfx-type4-blind-vision-pixels",
    source: "retail-runtime-vision-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "active-vision-reference-png",
    acceptance: "Viewport while Blind_Vision/Darkvision mutation is active.",
  },
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    gateReport: DEFAULT_GATE_REPORT,
    driverSourceManifest: DEFAULT_DRIVER_SOURCE_MANIFEST,
    driverCompileManifest: DEFAULT_DRIVER_COMPILE_MANIFEST,
    driverModuleInjectionSummary: DEFAULT_DRIVER_MODULE_INJECTION_SUMMARY,
    nwnModulesDir: defaultNwnModulesDir(),
    processProbeJson: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--gateReport") {
      index += 1;
      options.gateReport = requireValue(arg, argv[index]);
    } else if (arg === "--driverSourceManifest") {
      index += 1;
      options.driverSourceManifest = requireValue(arg, argv[index]);
    } else if (arg === "--driverCompileManifest") {
      index += 1;
      options.driverCompileManifest = requireValue(arg, argv[index]);
    } else if (arg === "--driverModuleInjectionSummary") {
      index += 1;
      options.driverModuleInjectionSummary = requireValue(arg, argv[index]);
    } else if (arg === "--nwnModulesDir") {
      index += 1;
      options.nwnModulesDir = requireValue(arg, argv[index]);
    } else if (arg === "--processProbeJson") {
      index += 1;
      options.processProbeJson = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/check-area-lighting-retail-runtime-capture-readiness.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --gateReport <path>     Existing oracle gate report. Defaults to ${DEFAULT_GATE_REPORT}
  --driverSourceManifest <path>  Generated driver-source manifest.
  --driverCompileManifest <path> Compiled driver-pack manifest.
  --driverModuleInjectionSummary <path> Disposable module injection/autostart summary.
  --nwnModulesDir <path>  NWN user modules directory. Defaults to Documents/Neverwinter Nights/modules
  --processProbeJson <path> Read a fixed process-probe JSON fixture instead of probing Windows processes.
`);
}

function defaultNwnModulesDir() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  return home ? join(home, "Documents", "Neverwinter Nights", "modules") : null;
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function probeRetailProcesses() {
  const script = String.raw`
$processes = @(Get-Process nwtoolset,nwmain -ErrorAction SilentlyContinue |
  Select-Object ProcessName,Id,MainWindowTitle,Responding)
if ($processes.Count -eq 0) {
  [pscustomobject]@{
    status = 'not_running'
    processes = @()
  } | ConvertTo-Json -Depth 6 -Compress
} else {
  [pscustomobject]@{
    status = 'running'
    processes = @($processes)
  } | ConvertTo-Json -Depth 6 -Compress
}
`;
  try {
    const raw = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      },
    ).trim();
    return JSON.parse(raw);
  } catch (error) {
    return {
      status: "probe_error",
      processes: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function processProbeForOptions(options, repoRoot) {
  if (!options.processProbeJson) {
    return probeRetailProcesses();
  }
  const processProbePath = toAbsolute(repoRoot, options.processProbeJson);
  const fixture = readJsonIfExists(processProbePath);
  if (!fixture) {
    throw new Error(`Process probe fixture not found: ${processProbePath}`);
  }
  return {
    ...fixture,
    fixturePath: toRepoRelative(repoRoot, processProbePath),
  };
}

function targetRuntimeObserved(target, processNames) {
  if (target.requiredRuntime.includes("nwtoolset-or-nwmain")) {
    return processNames.includes("nwtoolset") || processNames.includes("nwmain");
  }
  return target.requiredRuntime.every((processName) => processNames.includes(processName));
}

function readErfEntryIndex(sourcePath) {
  const bytes = readFileSync(sourcePath);
  if (bytes.length < 160) {
    throw new Error(`ERF file is too small: ${sourcePath}`);
  }
  const signature = bytes.toString("ascii", 0, 4);
  const version = bytes.toString("ascii", 4, 8);
  if (!["MOD ", "HAK ", "ERF ", "NWM "].includes(signature)) {
    throw new Error(`Unsupported ERF signature ${JSON.stringify(signature)} in ${sourcePath}`);
  }
  if (version !== "V1.0" && version !== "V1.1") {
    throw new Error(`Unsupported ERF version ${JSON.stringify(version)} in ${sourcePath}`);
  }

  const keyEntrySize = version === "V1.1" ? 40 : 24;
  const resrefLength = version === "V1.1" ? 32 : 16;
  const entryCount = bytes.readUInt32LE(16);
  const keyListOffset = bytes.readUInt32LE(24);
  const resourceListOffset = bytes.readUInt32LE(28);
  const keys = new Set();
  const byType = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    const keyOffset = keyListOffset + index * keyEntrySize;
    const resourceOffset = resourceListOffset + index * 8;
    const resref = bytes
      .subarray(keyOffset, keyOffset + resrefLength)
      .toString("ascii")
      .replace(/\0.*$/u, "")
      .trim()
      .toLowerCase();
    const type = bytes.readUInt16LE(keyOffset + resrefLength + 4);
    const size = bytes.readUInt32LE(resourceOffset + 4);
    keys.add(`${resref}:${type}`);
    const bucket = byType.get(type) ?? [];
    bucket.push({ resref, size });
    byType.set(type, bucket);
  }

  return {
    path: sourcePath,
    fileName: sourcePath.split(/[\\/]/u).at(-1),
    entryCount,
    keys,
    byType,
  };
}

function listModuleIndexes(modulesDir) {
  if (!modulesDir || !existsSync(modulesDir)) {
    return {
      modulesDir,
      status: "missing-modules-dir",
      modules: [],
      errors: [],
    };
  }

  const modules = [];
  const errors = [];
  for (const fileName of readdirSync(modulesDir)) {
    if (!fileName.toLowerCase().endsWith(".mod")) {
      continue;
    }
    const modulePath = join(modulesDir, fileName);
    try {
      modules.push(readErfEntryIndex(modulePath));
    } catch (error) {
      errors.push({
        modulePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    modulesDir,
    status: modules.length > 0 ? "modules-indexed" : "no-modules-found",
    modules,
    errors,
  };
}

function hasResource(moduleIndex, resref, type) {
  return moduleIndex.keys.has(`${resref.toLowerCase()}:${type}`);
}

function summarizeModule(moduleIndex) {
  const areaCount = moduleIndex.byType.get(RESOURCE_TYPES.are)?.length ?? 0;
  const compiledScriptCount = moduleIndex.byType.get(RESOURCE_TYPES.ncs)?.length ?? 0;
  const sourceScriptCount = moduleIndex.byType.get(RESOURCE_TYPES.nss)?.length ?? 0;
  return {
    modulePath: moduleIndex.path,
    fileName: moduleIndex.fileName,
    entryCount: moduleIndex.entryCount,
    areaCount,
    compiledScriptCount,
    sourceScriptCount,
  };
}

function buildSceneStaging(options) {
  const moduleIndex = listModuleIndexes(options.nwnModulesDir);
  const repoRoot = resolve(options.repoRoot);
  const driverSourceManifestPath = toAbsolute(repoRoot, options.driverSourceManifest);
  const driverCompileManifestPath = toAbsolute(repoRoot, options.driverCompileManifest);
  const driverModuleInjectionSummaryPath = toAbsolute(
    repoRoot,
    options.driverModuleInjectionSummary,
  );
  const driverSourceManifest = readJsonIfExists(driverSourceManifestPath);
  const driverCompileManifest = readJsonIfExists(driverCompileManifestPath);
  const driverModuleInjectionSummary = readJsonIfExists(driverModuleInjectionSummaryPath);
  const sourceDriverByCase = new Map(
    (driverSourceManifest?.drivers ?? []).map((driver) => [driver.caseId, driver]),
  );
  const compiledDriverByCase = new Map(
    (driverCompileManifest?.drivers ?? []).map((driver) => [driver.caseId, driver]),
  );
  const injectedDriverByCase = new Map(
    (driverModuleInjectionSummary?.drivers ?? [])
      .filter((driver) => driver.kind === "driver")
      .map((driver) => [driver.caseId, driver]),
  );
  const autorunPrepared = Boolean(driverModuleInjectionSummary?.runtimeAutostart?.prepared);
  const outputModulePath = driverModuleInjectionSummary?.outputModulePath ?? null;
  const cases = ORACLE_SCENE_REQUIREMENTS.map((requirement) => {
    const readyCandidates = [];
    const partialCandidates = [];
    const sourceDriver = sourceDriverByCase.get(requirement.caseId) ?? null;
    const compiledDriver = compiledDriverByCase.get(requirement.caseId) ?? null;
    const injectedDriver = injectedDriverByCase.get(requirement.caseId) ?? null;

    for (const module of moduleIndex.modules) {
      const hasRequiredDrivers = requirement.requiredDriverScripts.every((resref) =>
        hasResource(module, resref, RESOURCE_TYPES.ncs),
      );
      const hasRequiredAreas = requirement.requiredAreaResrefs.every((resref) =>
        hasResource(module, resref, RESOURCE_TYPES.are),
      );
      const hasGenericScripts = (requirement.genericScriptResrefs ?? []).filter((resref) =>
        hasResource(module, resref, RESOURCE_TYPES.ncs),
      );
      const hasNameHint = requirement.partialModuleNamePatterns.some((pattern) =>
        pattern.test(module.fileName),
      );

      if (hasRequiredDrivers && hasRequiredAreas) {
        readyCandidates.push(summarizeModule(module));
      } else if (hasRequiredAreas || hasGenericScripts.length > 0 || hasNameHint) {
        partialCandidates.push({
          ...summarizeModule(module),
          hasRequiredAreas,
          presentGenericScripts: hasGenericScripts,
          nameHintMatched: hasNameHint,
          missingCompiledDriverScripts: requirement.requiredDriverScripts.filter(
            (resref) => !hasResource(module, resref, RESOURCE_TYPES.ncs),
          ),
        });
      }
    }

    const status =
      readyCandidates.length > 0
        ? "ready-scene-driver-present"
        : partialCandidates.length > 0
          ? "partial-generic-lab-or-module-present-driver-missing"
          : "blocked-scene-driver-missing";

    return {
      caseId: requirement.caseId,
      status,
      requiredCompiledDriverScripts: requirement.requiredDriverScripts,
      requiredAreaResrefs: requirement.requiredAreaResrefs,
      sourceDriverPrepared: Boolean(sourceDriver?.sourceReady),
      sourceDriverStatus: sourceDriver?.status ?? "missing-source-driver-manifest-entry",
      sourceDriverPath: sourceDriver?.sourcePath ?? null,
      compiledPackPrepared: Boolean(compiledDriver?.compiledReady),
      compiledPackStatus: compiledDriver
        ? compiledDriver.compiledReady
          ? "compiled-pack-driver-ready"
          : "compiled-pack-driver-missing"
        : "missing-compiled-driver-manifest-entry",
      compiledPackPath: compiledDriver?.compiledPath ?? null,
      compiledPackSha256: compiledDriver?.compiledSha256 ?? null,
      runtimeModulePrepared: Boolean(
        injectedDriver?.presentInOutputModule && autorunPrepared,
      ),
      runtimeModuleStatus: injectedDriver
        ? injectedDriver.presentInOutputModule && autorunPrepared
          ? "runtime-module-driver-and-autostart-ready"
          : "runtime-module-driver-or-autostart-incomplete"
        : "missing-runtime-module-injection-summary-entry",
      runtimeModulePath: outputModulePath,
      autorunPrepared,
      autorunScriptResref:
        driverModuleInjectionSummary?.runtimeAutostart?.scriptResref ?? null,
      requiredCompiledResource: sourceDriver?.requiredCompiledResource ?? null,
      readyCandidates,
      partialCandidates,
      partialEvidence: partialCandidates.length > 0 ? requirement.partialEvidence : null,
      blocker: status === "ready-scene-driver-present" ? null : requirement.blocker,
    };
  });

  return {
    version: "aurora-area-lighting-retail-scene-staging-readiness/v1",
    generatedAt: new Date().toISOString(),
    status: cases.every((captureCase) => captureCase.status === "ready-scene-driver-present")
      ? "ready-all-scene-drivers-present"
      : "blocked-scene-driver-gaps",
    modulesDir: moduleIndex.modulesDir,
    driverSourceManifest: driverSourceManifest
      ? {
          path: toRepoRelative(repoRoot, driverSourceManifestPath),
          status: driverSourceManifest.status,
          summary: driverSourceManifest.summary,
        }
      : {
          path: toRepoRelative(repoRoot, driverSourceManifestPath),
          status: "missing-driver-source-manifest",
          summary: null,
        },
    driverCompileManifest: driverCompileManifest
      ? {
          path: toRepoRelative(repoRoot, driverCompileManifestPath),
          status: driverCompileManifest.status,
          summary: driverCompileManifest.summary,
        }
      : {
          path: toRepoRelative(repoRoot, driverCompileManifestPath),
          status: "missing-driver-compile-manifest",
          summary: null,
        },
    driverModuleInjectionSummary: driverModuleInjectionSummary
      ? {
          path: toRepoRelative(repoRoot, driverModuleInjectionSummaryPath),
          status: driverModuleInjectionSummary.status,
          outputModulePath,
          runtimeAutostart: driverModuleInjectionSummary.runtimeAutostart?.final ?? null,
          summary: driverModuleInjectionSummary.summary,
        }
      : {
          path: toRepoRelative(repoRoot, driverModuleInjectionSummaryPath),
          status: "missing-driver-module-injection-summary",
          outputModulePath: null,
          runtimeAutostart: null,
          summary: null,
        },
    moduleScanStatus: moduleIndex.status,
    moduleCount: moduleIndex.modules.length,
    moduleErrors: moduleIndex.errors,
    sourceDriverPreparedCases: cases.filter((captureCase) => captureCase.sourceDriverPrepared).length,
    compiledPackPreparedCases: cases.filter((captureCase) => captureCase.compiledPackPrepared).length,
    runtimeModulePreparedCases: cases.filter((captureCase) => captureCase.runtimeModulePrepared).length,
    autorunPrepared,
    cases,
  };
}

function sceneStagingByCase(sceneStaging) {
  return new Map(sceneStaging.cases.map((captureCase) => [captureCase.caseId, captureCase]));
}

function targetReadiness({ exists, runtimeObserved, caseStaging }) {
  if (exists) {
    return "already-present";
  }
  if (!runtimeObserved) {
    return "blocked-retail-runtime-not-running";
  }
  if (caseStaging?.status !== "ready-scene-driver-present") {
    return "blocked-retail-scene-driver-missing";
  }
  return "runtime-observed-capture-case-staging-required";
}

function buildReadiness(options) {
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const gateReportPath = toAbsolute(repoRoot, options.gateReport);
  const gateReport = readJsonIfExists(gateReportPath);
  const missingFromGate = new Set(gateReport?.missingRequiredArtifacts ?? []);
  const processProbe = processProbeForOptions(options, repoRoot);
  const sceneStaging = buildSceneStaging(options);
  const stagingByCase = sceneStagingByCase(sceneStaging);
  const processNames = (processProbe.processes ?? [])
    .map((process) => String(process.ProcessName ?? process.processName ?? "").toLowerCase())
    .filter(Boolean);

  const targets = RUNTIME_CAPTURE_TARGETS.map((target) => {
    const outputPath = resolve(artifactDir, target.artifact);
    const exists = existsSync(outputPath);
    const runtimeObserved = targetRuntimeObserved(target, processNames);
    const caseStaging = stagingByCase.get(target.caseId);
    return {
      ...target,
      outputPath: toRepoRelative(repoRoot, outputPath),
      artifactExists: exists,
      missingInOracleGate: missingFromGate.has(target.artifact),
      runtimeObserved,
      sceneStagingStatus: caseStaging?.status ?? "blocked-scene-driver-missing",
      sceneStagingBlocker: caseStaging?.blocker ?? "Missing retail/toolset oracle scene staging.",
      sourceDriverPrepared: Boolean(caseStaging?.sourceDriverPrepared),
      sourceDriverStatus: caseStaging?.sourceDriverStatus ?? "missing-source-driver-manifest-entry",
      sourceDriverPath: caseStaging?.sourceDriverPath ?? null,
      compiledPackPrepared: Boolean(caseStaging?.compiledPackPrepared),
      compiledPackStatus: caseStaging?.compiledPackStatus ?? "missing-compiled-driver-manifest-entry",
      compiledPackPath: caseStaging?.compiledPackPath ?? null,
      compiledPackSha256: caseStaging?.compiledPackSha256 ?? null,
      runtimeModulePrepared: Boolean(caseStaging?.runtimeModulePrepared),
      runtimeModuleStatus:
        caseStaging?.runtimeModuleStatus ?? "missing-runtime-module-injection-summary-entry",
      runtimeModulePath: caseStaging?.runtimeModulePath ?? null,
      autorunPrepared: Boolean(caseStaging?.autorunPrepared),
      autorunScriptResref: caseStaging?.autorunScriptResref ?? null,
      requiredCompiledDriverResource: caseStaging?.requiredCompiledResource ?? null,
      readiness: targetReadiness({ exists, runtimeObserved, caseStaging }),
    };
  });

  const missingTargets = targets.filter((target) => !target.artifactExists);
  const runtimeObservedTargets = missingTargets.filter((target) => target.runtimeObserved);
  const sceneReadyTargets = missingTargets.filter(
    (target) => target.sceneStagingStatus === "ready-scene-driver-present",
  );
  const sceneDriverBlockedTargets = missingTargets.filter(
    (target) => target.sceneStagingStatus !== "ready-scene-driver-present",
  );
  const sourceDriverPreparedTargets = missingTargets.filter(
    (target) => target.sourceDriverPrepared === true,
  );
  const compiledPackPreparedTargets = missingTargets.filter(
    (target) => target.compiledPackPrepared === true,
  );
  const runtimeModulePreparedTargets = missingTargets.filter(
    (target) => target.runtimeModulePrepared === true,
  );
  const autorunPreparedTargets = missingTargets.filter(
    (target) => target.autorunPrepared === true,
  );
  const runtimeReadyTargets = missingTargets.filter(
    (target) => target.readiness === "runtime-observed-capture-case-staging-required",
  );
  const sceneBlockedTargets = missingTargets.filter(
    (target) => target.readiness === "blocked-retail-scene-driver-missing",
  );
  const runtimeBlockedTargets = missingTargets.filter(
    (target) => target.readiness === "blocked-retail-runtime-not-running",
  );
  const blockedTargets = missingTargets.filter((target) => target.readiness.startsWith("blocked-"));
  const status =
    missingTargets.length === 0
      ? "ready-all-runtime-artifacts-present"
      : runtimeReadyTargets.length > 0
        ? "partial-runtime-observed-case-staging-required"
        : runtimeObservedTargets.length > 0 && sceneBlockedTargets.length > 0
          ? "blocked-retail-scene-driver-missing"
        : "blocked-no-retail-runtime-process";

  return {
    version: "aurora-area-lighting-retail-runtime-capture-readiness/v1",
    generatedAt: new Date().toISOString(),
    status,
    safety: {
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouseWheel: false,
      sendsWindowMessages: false,
      launchesRetailProcess: false,
      method: "read-only process probe, oracle-gate artifact inventory, and NWN module scene-driver inventory",
    },
    oracleGate: gateReport
      ? {
          path: toRepoRelative(repoRoot, gateReportPath),
          status: gateReport.status,
          summary: gateReport.summary,
        }
      : {
          path: toRepoRelative(repoRoot, gateReportPath),
          status: "missing-gate-report",
          summary: null,
        },
    processProbe,
    sceneStaging,
    summary: {
      requiredRuntimeArtifacts: targets.length,
      presentRuntimeArtifacts: targets.filter((target) => target.artifactExists).length,
      missingRuntimeArtifacts: missingTargets.length,
      runtimeObservedTargets: runtimeObservedTargets.length,
      sceneReadyTargets: sceneReadyTargets.length,
      sceneDriverBlockedTargets: sceneDriverBlockedTargets.length,
      sourceDriverPreparedTargets: sourceDriverPreparedTargets.length,
      compiledPackPreparedTargets: compiledPackPreparedTargets.length,
      runtimeModulePreparedTargets: runtimeModulePreparedTargets.length,
      autorunPreparedTargets: autorunPreparedTargets.length,
      runtimeReadyTargets: runtimeReadyTargets.length,
      sceneBlockedTargets: sceneBlockedTargets.length,
      runtimeBlockedTargets: runtimeBlockedTargets.length,
      blockedRuntimeTargets: blockedTargets.length,
    },
    targets,
    blocker:
      runtimeBlockedTargets.length > 0
        ? "Retail/toolset runtime processes are not observed, so image/slot capture artifacts cannot be produced without launching/staging the retail runtime."
        : sceneBlockedTargets.length > 0
          ? "Retail/toolset runtime is observed, but the required oracle scene drivers are missing, so capture would not prove the targeted light/shadow cases."
        : "",
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  mkdirSync(artifactDir, { recursive: true });
  const report = buildReadiness(options);
  const outputPath = resolve(artifactDir, "area-lighting-retail-runtime-capture-readiness.json");
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.status,
        output: toRepoRelative(repoRoot, outputPath),
        summary: report.summary,
        processStatus: report.processProbe.status,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

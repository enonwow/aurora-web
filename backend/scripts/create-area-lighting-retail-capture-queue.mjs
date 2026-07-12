#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_GATE_REPORT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-oracle-artifact-gate.json";
const DEFAULT_READINESS_REPORT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-runtime-capture-readiness.json";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-capture-queue.json";
const DEFAULT_CUSTOM_PROGFX_ZERO_OVERRIDE_MANIFEST =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/custom-progfx-param4-zero-override/custom-progfx-param4-zero-override-manifest.json";

const CAPTURE_CASES = [
  {
    caseId: "shadowvol-campfire-pixel-geometry-opacity",
    order: 10,
    title: "Retail shadow-volume campfire pixel geometry and opacity",
    retailSurface: "nwtoolset-or-nwmain",
    localInputs: [
      "aurora-web-shadowvol-campfire.png",
      "aurora-web-shadowvol-state-trace.json",
    ],
    comparisonArtifacts: ["shadowvol-campfire-pixel-compare.json"],
    validation: {
      retailSourceRequired: true,
      sameFixtureRequired: "campfire/placeable fixture matching aurora-web-shadowvol-campfire.png",
      requiredObservations: [
        "projected shadow footprint",
        "receiver-plane alignment",
        "ShadowOpacity-derived alpha",
        "ShadowSize-derived projection radius",
      ],
      acceptanceArtifactChain: [
        "retail-or-toolset-shadowvol-campfire.png",
        "aurora-web-shadowvol-campfire.png",
        "shadowvol-campfire-pixel-compare.json",
      ],
    },
  },
  {
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    order: 20,
    title: "Retail cross-lane active-light ordering under constrained budget",
    retailSurface: "nwmain",
    localInputs: ["aurora-web-cross-lane-all-lanes.frame.json"],
    comparisonArtifacts: ["cross-lane-precedence-compare.json"],
    validation: {
      retailSourceRequired: true,
      sameFixtureRequired: "tile/placeable/MDL/item/ProgFX all-lane scene",
      requiredObservations: [
        "before-budget all-lane visibility",
        "after-budget accepted lane list",
        "after-budget dropped lane list",
        "active slot ordering",
      ],
      outputSchema: {
        artifact: "retail-cross-lane-active-slots.json",
        requiredFields: ["budget", "acceptedSlots", "droppedSlots", "laneOwners"],
      },
      acceptanceArtifactChain: [
        "retail-cross-lane-all-lanes-before-budget.png",
        "retail-cross-lane-all-lanes-after-budget.png",
        "retail-cross-lane-active-slots.json",
        "aurora-web-cross-lane-all-lanes.frame.json",
        "cross-lane-precedence-compare.json",
      ],
    },
  },
  {
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    order: 30,
    title: "Retail ProgFX Type 4 priority, tie, and priority-zero policy",
    retailSurface: "nwmain",
    localInputs: ["retail-progfx-priority-policy.json"],
    comparisonArtifacts: ["retail-progfx-priority-policy.json"],
    validation: {
      retailSourceRequired: true,
      sameFixtureRequired: "visualeffects.2da Type 4 priority policy scene",
      requiredObservations: [
        "priority winner",
        "tie behavior",
        "priority 0 behavior",
        "visible owner before and after scheduler decision",
      ],
      acceptanceArtifactChain: [
        "retail-progfx-priority-policy-before.png",
        "retail-progfx-priority-policy-after.png",
        "retail-progfx-priority-policy.json",
      ],
    },
  },
  {
    caseId: "progfx-type4-proximity-threshold",
    order: 40,
    title: "Retail ProgFX Type 4 proximity suppression threshold",
    retailSurface: "nwmain",
    localInputs: ["retail-progfx-proximity-distance-sweep.json"],
    comparisonArtifacts: ["retail-progfx-proximity-distance-sweep.json"],
    validation: {
      retailSourceRequired: true,
      sameFixtureRequired: "distance sweep around Type 4 proximity suppression threshold",
      requiredObservations: [
        "nearest active source lane",
        "suppressed distance samples",
        "restored distance samples",
        "contact-sheet frame labels",
      ],
      acceptanceArtifactChain: [
        "retail-progfx-proximity-distance-sweep.json",
        "retail-progfx-proximity-distance-sweep-contact-sheet.png",
      ],
    },
  },
  {
    caseId: "progfx-type4-attach-to-scene-restore",
    order: 50,
    title: "Retail ProgFX Type 4 attach-to-scene removal and restore",
    retailSurface: "nwmain",
    localInputs: ["retail-progfx-attach-scene-restore.json"],
    comparisonArtifacts: ["retail-progfx-attach-scene-restore.json"],
    validation: {
      retailSourceRequired: true,
      sameFixtureRequired: "Param6 attach-to-scene effect over pre-existing scene lights",
      requiredObservations: [
        "scene state before attach",
        "scene light removal while active",
        "scene light restoration after effect removal",
      ],
      acceptanceArtifactChain: [
        "retail-progfx-attach-scene-before.png",
        "retail-progfx-attach-scene-active.png",
        "retail-progfx-attach-scene-after-remove.png",
        "retail-progfx-attach-scene-restore.json",
      ],
    },
  },
  {
    caseId: "progfx-type4-blind-vision-pixels",
    order: 60,
    title: "Retail ProgFX Type 4 Blind_Vision/Darkvision viewport pixels",
    retailSurface: "nwmain",
    localInputs: [
      "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png",
      "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json",
    ],
    comparisonArtifacts: ["retail-progfx-blindvision-pixel-compare.json"],
    validation: {
      retailSourceRequired: true,
      sameFixtureRequired: "visualeffects.2da row 329 Blind_Vision/Darkvision viewport",
      requiredObservations: [
        "before vision mutation viewport pixels",
        "active vision mutation viewport pixels",
        "owner phase for the same visualeffects.2da row",
      ],
      acceptanceArtifactChain: [
        "retail-progfx-blindvision-before.png",
        "retail-progfx-blindvision-active.png",
        "retail-progfx-blindvision-pixel-compare.json",
      ],
    },
  },
];

const CASE_BY_ID = new Map(CAPTURE_CASES.map((captureCase) => [captureCase.caseId, captureCase]));

const CLASSIFIER_REFERENCE_CAPTURES = [
  {
    artifact: "retail-cross-lane-openpad-smoke.png",
    utilityScriptResref: "als_refbase",
    moduleFile: "als_refbase.mod",
    lane: "open-pad-no-light-baseline",
    title: "Open-pad no-light baseline reference",
  },
  {
    artifact: "retail-ref-tile-main-light.png",
    utilityScriptResref: "als_reftmain",
    moduleFile: "als_rtmain.mod",
    lane: "terrain-tile-main-light",
    title: "Isolated tile main light lane reference",
  },
  {
    artifact: "retail-ref-tile-source-light.png",
    utilityScriptResref: "als_reftsrc",
    moduleFile: "als_rtsrc.mod",
    lane: "terrain-tile-source-light",
    title: "Isolated tile source light lane reference",
  },
  {
    artifact: "retail-ref-placeable-lightcolor.png",
    utilityScriptResref: "als_refplc",
    moduleFile: "als_refplc.mod",
    lane: "placeables-2da-light",
    title: "Isolated placeables.2da LightColor lane reference",
  },
  {
    artifact: "retail-ref-mdl-source-light.png",
    utilityScriptResref: "als_refmdl",
    moduleFile: "als_refmdl.mod",
    lane: "source-mdl-light-node",
    title: "Isolated MDL source light lane reference",
  },
  {
    artifact: "retail-ref-item-property-light.png",
    utilityScriptResref: "als_refitem",
    moduleFile: "als_refitm.mod",
    lane: "item-property-light",
    title: "Isolated item-property light lane reference",
  },
  {
    artifact: "retail-ref-progfx-type4-light.png",
    utilityScriptResref: "als_refpfx",
    moduleFile: "als_refpfx.mod",
    lane: "progfx-type4-light-or-vision",
    title: "Isolated ProgFX Type 4 light lane reference",
  },
];

const CUSTOM_PROGFX_ZERO_ORACLE = {
  caseId: "progfx-type4-custom-param4-zero-policy",
  title: "Custom ProgFX Type 4 Param4=0 priority oracle",
  utilityScriptResref: "als_pfxzero",
  referenceModuleFile: "als_pfxzero.mod",
  runtimeArea: "als_light_lab",
  artifacts: [
    "retail-progfx-priority-policy-custom-zero-before.png",
    "retail-progfx-priority-policy-custom-zero-after.png",
  ],
  requiredFor: [
    "retail-progfx-priority-policy.json runtimeObservation.priorityZeroPolicy",
    "progfx-type4-priority-tie-and-zero-policy custom Param4=0 behavior",
  ],
};

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    gateReport: DEFAULT_GATE_REPORT,
    readinessReport: DEFAULT_READINESS_REPORT,
    output: DEFAULT_OUTPUT,
    customProgFxZeroOverrideManifest: DEFAULT_CUSTOM_PROGFX_ZERO_OVERRIDE_MANIFEST,
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
    } else if (arg === "--readinessReport") {
      index += 1;
      options.readinessReport = requireValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--customProgFxZeroOverrideManifest") {
      index += 1;
      options.customProgFxZeroOverrideManifest = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-area-lighting-retail-capture-queue.mjs [options]

Options:
  --repoRoot <path>          Repository root. Defaults to aurora-web root.
  --artifactDir <path>       Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --gateReport <path>        Oracle artifact gate report. Defaults to ${DEFAULT_GATE_REPORT}
  --readinessReport <path>   Runtime readiness report. Defaults to ${DEFAULT_READINESS_REPORT}
  --out <path>               JSON output path. Defaults to ${DEFAULT_OUTPUT}
  --customProgFxZeroOverrideManifest <path>
                              Optional custom Param4=0 override manifest.
`);
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

function readCustomProgFxZeroOverride(repoRoot, manifestPath) {
  const path = toAbsolute(repoRoot, manifestPath);
  const manifest = readJsonIfExists(path);
  if (!manifest) {
    return {
      present: false,
      path: toRepoRelative(repoRoot, path),
      status: "missing-custom-param4-zero-override-manifest",
    };
  }
  const prepared =
    manifest.status === "custom-param4-zero-override-pack-prepared-not-stock-retail-parity" &&
    manifest.customOverrideRequired === true &&
    manifest.installsOverrideFiles === false &&
    manifest.canonicalParityPromoted === false &&
    manifest.outputs?.visualeffects2da?.sha256 &&
    manifest.outputs?.progfx2da?.sha256;
  return {
    present: true,
    prepared: Boolean(prepared),
    path: toRepoRelative(repoRoot, path),
    status: manifest.status ?? "unknown",
    canonicalParityPromoted: manifest.canonicalParityPromoted ?? null,
    installsOverrideFiles: manifest.installsOverrideFiles ?? null,
    customRows: manifest.customRows ?? null,
    outputs: manifest.outputs ?? null,
  };
}

function artifactType(artifact) {
  const extension = extname(artifact).toLowerCase();
  if (extension === ".png") {
    return "png";
  }
  if (extension === ".json") {
    return "json";
  }
  return extension.replace(".", "") || "unknown";
}

function buildQueue(options) {
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const gateReportPath = toAbsolute(repoRoot, options.gateReport);
  const readinessReportPath = toAbsolute(repoRoot, options.readinessReport);
  const gateReport = readJsonIfExists(gateReportPath);
  const readinessReport = readJsonIfExists(readinessReportPath);
  const customProgFxZeroOverride = readCustomProgFxZeroOverride(
    repoRoot,
    options.customProgFxZeroOverrideManifest,
  );
  const missingFromGate = new Set(gateReport?.missingRequiredArtifacts ?? []);
  const readinessTargets = readinessReport?.targets ?? [];
  const targets = readinessTargets
    .filter((target) => !target.artifactExists)
    .map((target, index) => toQueueItem(target, index, repoRoot, artifactDir, missingFromGate));
  const classifierReferenceQueue = buildClassifierReferenceQueue(repoRoot, artifactDir);
  const customProgFxZeroQueue = buildCustomProgFxZeroQueue(
    repoRoot,
    artifactDir,
    customProgFxZeroOverride,
  );

  const runtimeReadyCount = targets.filter((item) => item.status === "ready-for-runtime-staging").length;
  const blockedCount = targets.filter((item) => item.status === "blocked-retail-runtime-not-running").length;
  const sceneBlockedCount = targets.filter((item) => item.status === "blocked-retail-scene-driver-missing").length;
  const sceneDriverBlockedCount = targets.filter(
    (item) => item.sceneStagingStatus !== "ready-scene-driver-present",
  ).length;
  const sourceDriverPreparedCount = targets.filter((item) => item.sourceDriverPrepared === true).length;
  const compiledPackPreparedCount = targets.filter((item) => item.compiledPackPrepared === true).length;
  const runtimeModulePreparedCount = targets.filter((item) => item.runtimeModulePrepared === true).length;
  const autorunPreparedCount = targets.filter((item) => item.autorunPrepared === true).length;
  const status =
    targets.length === 0
      ? classifierReferenceQueue.length > 0 || customProgFxZeroQueue.length > 0
        ? "complete-required-runtime-artifacts-reference-captures-missing"
        : "complete-all-runtime-artifacts-present"
      : blockedCount === targets.length
        ? "blocked-no-retail-runtime-process"
        : sceneBlockedCount === targets.length
          ? "blocked-retail-scene-driver-missing"
          : runtimeReadyCount === 0 && sceneBlockedCount > 0 && blockedCount > 0
            ? "blocked-mixed-runtime-and-scene-driver-gaps"
          : runtimeReadyCount > 0 && blockedCount > 0
            ? "partial-runtime-observed-case-staging-required"
          : runtimeReadyCount > 0 && sceneBlockedCount > 0
            ? "partial-runtime-observed-scene-driver-gaps"
          : "ready-for-runtime-staging";

  const cases = CAPTURE_CASES.map((captureCase) => {
    const items = targets.filter((item) => item.caseId === captureCase.caseId);
    return {
      caseId: captureCase.caseId,
      order: captureCase.order,
      title: captureCase.title,
      itemCount: items.length,
      missingArtifacts: items.map((item) => item.artifact),
      retailSurface: captureCase.retailSurface,
      localInputs: captureCase.localInputs,
      comparisonArtifacts: captureCase.comparisonArtifacts,
      validation: captureCase.validation,
      status:
        items.length === 0
          ? "no-missing-runtime-artifacts"
          : items.every((item) => item.status === "blocked-retail-runtime-not-running")
            ? "blocked-retail-runtime-not-running"
            : items.every((item) => item.status === "blocked-retail-scene-driver-missing")
              ? "blocked-retail-scene-driver-missing"
            : "ready-for-runtime-staging",
    };
  }).filter((captureCase) => captureCase.itemCount > 0);

  return {
    version: "aurora-area-lighting-retail-capture-queue/v1",
    generatedAt: new Date().toISOString(),
    status,
    safety: {
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouseWheel: false,
      sendsWindowMessages: false,
      launchesRetailProcess: false,
      doesNotFabricateArtifacts: true,
      captureRequiresExistingRuntime: true,
      method: "Read oracle gate plus runtime-readiness manifest and emit an operator queue only.",
    },
    inputs: {
      oracleGate: {
        path: toRepoRelative(repoRoot, gateReportPath),
        exists: Boolean(gateReport),
        status: gateReport?.status ?? "missing-gate-report",
        summary: gateReport?.summary ?? null,
      },
      runtimeReadiness: {
        path: toRepoRelative(repoRoot, readinessReportPath),
        exists: Boolean(readinessReport),
        status: readinessReport?.status ?? "missing-readiness-report",
        summary: readinessReport?.summary ?? null,
        processStatus: readinessReport?.processProbe?.status ?? "unknown",
      },
      customProgFxZeroOverride,
    },
    summary: {
      requiredRuntimeArtifactCount: readinessTargets.length,
      missingArtifactCount: targets.length,
      queueItemCount: targets.length,
      caseCount: cases.length,
      runtimeReadyItemCount: runtimeReadyCount,
      blockedItemCount: blockedCount,
      sceneBlockedItemCount: sceneBlockedCount,
      sceneDriverBlockedItemCount: sceneDriverBlockedCount,
      sourceDriverPreparedItemCount: sourceDriverPreparedCount,
      compiledPackPreparedItemCount: compiledPackPreparedCount,
      runtimeModulePreparedItemCount: runtimeModulePreparedCount,
      autorunPreparedItemCount: autorunPreparedCount,
      missingInOracleGateCount: targets.filter((item) => item.missingInOracleGate).length,
      classifierReferenceQueueItemCount: classifierReferenceQueue.length,
      missingClassifierReferenceArtifactCount: classifierReferenceQueue.length,
      customProgFxZeroQueueItemCount: customProgFxZeroQueue.length,
      missingCustomProgFxZeroArtifactCount: customProgFxZeroQueue.length,
      customProgFxZeroOverridePackPrepared: customProgFxZeroOverride.prepared === true,
    },
    cases,
    queue: targets,
    classifierReferenceQueue,
    customProgFxZeroQueue,
    blocker:
      status === "blocked-no-retail-runtime-process"
        ? "Retail/toolset runtime is not observed, so the queue is staged but cannot produce real retail PNG/slot artifacts yet."
        : status === "blocked-retail-scene-driver-missing"
          ? "Retail/toolset runtime is observed, but required oracle scene drivers are missing, so capture would not prove the targeted cases."
        : status === "blocked-mixed-runtime-and-scene-driver-gaps"
          ? "Some retail/toolset runtime surface is observed, but no queued artifact is ready: missing scene-driver injection blocks observed targets, and missing nwmain blocks the rest."
        : status === "complete-required-runtime-artifacts-reference-captures-missing"
          ? "All required runtime artifacts are present, but optional cross-lane lane-owner references and/or custom ProgFX Param4=0 captures remain missing."
        : "",
    nonEvidenceNotice:
      "This queue is not retail proof. It is the exact capture plan for the missing proof artifacts and must not be promoted until the listed outputs exist and their comparison gates pass.",
  };
}

function buildCustomProgFxZeroQueue(repoRoot, artifactDir, customOverride) {
  return CUSTOM_PROGFX_ZERO_ORACLE.artifacts
    .filter((artifact) => !existsSync(resolve(artifactDir, artifact)))
    .map((artifact, index) => ({
      queueId: `pfxzero-${String(index + 1).padStart(2, "0")}-${artifact.replaceAll(".", "-")}`,
      order: 300 + index,
      caseId: CUSTOM_PROGFX_ZERO_ORACLE.caseId,
      title: CUSTOM_PROGFX_ZERO_ORACLE.title,
      lane: "progfx-type4-light-or-vision",
      stage: "optional-custom-param4-zero-png",
      artifact,
      artifactType: "png",
      outputPath: toRepoRelative(repoRoot, resolve(artifactDir, artifact)),
      status: "optional-custom-zero-reference-missing",
      requiredFor: CUSTOM_PROGFX_ZERO_ORACLE.requiredFor,
      utilityScriptResref: CUSTOM_PROGFX_ZERO_ORACLE.utilityScriptResref,
      referenceModuleFile: CUSTOM_PROGFX_ZERO_ORACLE.referenceModuleFile,
      runtimeArea: CUSTOM_PROGFX_ZERO_ORACLE.runtimeArea,
      manualScriptInputRequired: false,
      stockRetailRowPresent: false,
      customOverrideRequired: true,
      customOverridePackPrepared: customOverride.prepared === true,
      customOverrideManifest: customOverride,
      autostart:
        `${CUSTOM_PROGFX_ZERO_ORACLE.referenceModuleFile} starts in als_light_lab and runs ${CUSTOM_PROGFX_ZERO_ORACLE.utilityScriptResref} through OnEnter.`,
      safeCapture: {
        script: "backend/scripts/capture-area-lighting-retail-oracle-window.ps1",
        flags: ["-NoFocus", "-NoTopMost", "-NoEscape"],
        launchesRetailProcess: false,
        requiresExistingRuntime: true,
        usesGlobalCursor: false,
        usesGlobalKeyboard: false,
        usesForegroundWindow: false,
        usesTopmost: false,
      },
      blocker:
        "Stock retail progfx.2da has no Type 4 Param4=0 row. This capture requires a recorded module/HAK override and must not be promoted as stock retail parity.",
    }));
}

function buildClassifierReferenceQueue(repoRoot, artifactDir) {
  return CLASSIFIER_REFERENCE_CAPTURES.filter(
    (reference) => !existsSync(resolve(artifactDir, reference.artifact)),
  ).map((reference, index) => ({
    queueId: `xref-${String(index + 1).padStart(2, "0")}-${reference.artifact.replaceAll(".", "-")}`,
    order: 200 + index,
    caseId: "cross-lane-isolated-reference-classifier",
    title: reference.title,
    lane: reference.lane,
    stage: "optional-classifier-reference-png",
    artifact: reference.artifact,
    artifactType: "png",
    outputPath: toRepoRelative(repoRoot, resolve(artifactDir, reference.artifact)),
    status: "optional-reference-missing",
    requiredFor: [
      "cross-lane-precedence-compare.json retailMaxLightVariantClassifier.classifierGrade",
      "retail-cross-lane-active-slots.json lane-owner pixel classifier",
    ],
    utilityScriptResref: reference.utilityScriptResref,
    referenceModuleFile: reference.moduleFile,
    runtimeArea: "als_light_lab",
    manualScriptInputRequired: false,
    autostart:
      `${reference.moduleFile} starts in als_light_lab and runs ${reference.utilityScriptResref} through OnEnter.`,
    safeCapture: {
      script: "backend/scripts/capture-area-lighting-retail-oracle-window.ps1",
      flags: ["-NoFocus", "-NoTopMost", "-NoEscape"],
      launchesRetailProcess: false,
      requiresExistingRuntime: true,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesForegroundWindow: false,
      usesTopmost: false,
    },
    blocker:
      "This isolated reference is missing. Without it, max-light variant pixels cannot be mapped back to accepted/dropped lane owners.",
  }));
}

function toQueueItem(target, index, repoRoot, artifactDir, missingFromGate) {
  const captureCase = CASE_BY_ID.get(target.caseId);
  if (!captureCase) {
    throw new Error(`No capture case definition for '${target.caseId}' (${target.artifact}).`);
  }
  const status =
    target.readiness === "runtime-observed-capture-case-staging-required"
      ? "ready-for-runtime-staging"
      : target.readiness === "blocked-retail-scene-driver-missing"
        ? "blocked-retail-scene-driver-missing"
        : "blocked-retail-runtime-not-running";
  const outputPath = target.outputPath ?? toRepoRelative(repoRoot, resolve(artifactDir, target.artifact));
  return {
    queueId: `${String(captureCase.order).padStart(2, "0")}-${target.artifact.replaceAll(".", "-")}`,
    order: captureCase.order + index / 100,
    caseId: target.caseId,
    title: captureCase.title,
    stage: target.captureKind,
    artifact: target.artifact,
    artifactType: artifactType(target.artifact),
    outputPath,
    source: target.source,
    requiredRuntime: target.requiredRuntime,
    retailSurface: captureCase.retailSurface,
    runtimeObserved: Boolean(target.runtimeObserved),
    sceneStagingStatus: target.sceneStagingStatus ?? "unknown",
    sceneStagingBlocker: target.sceneStagingBlocker ?? null,
    sourceDriverPrepared: Boolean(target.sourceDriverPrepared),
    sourceDriverStatus: target.sourceDriverStatus ?? "unknown",
    sourceDriverPath: target.sourceDriverPath ?? null,
    compiledPackPrepared: Boolean(target.compiledPackPrepared),
    compiledPackStatus: target.compiledPackStatus ?? "unknown",
    compiledPackPath: target.compiledPackPath ?? null,
    compiledPackSha256: target.compiledPackSha256 ?? null,
    runtimeModulePrepared: Boolean(target.runtimeModulePrepared),
    runtimeModuleStatus: target.runtimeModuleStatus ?? "unknown",
    runtimeModulePath: target.runtimeModulePath ?? null,
    autorunPrepared: Boolean(target.autorunPrepared),
    autorunScriptResref: target.autorunScriptResref ?? null,
    requiredCompiledDriverResource: target.requiredCompiledDriverResource ?? null,
    missingInOracleGate: missingFromGate.has(target.artifact) || Boolean(target.missingInOracleGate),
    readiness: target.readiness,
    status,
    localInputs: captureCase.localInputs,
    comparisonArtifacts: captureCase.comparisonArtifacts,
    acceptance: target.acceptance,
    validation: captureCase.validation,
    operatorAction:
      status === "ready-for-runtime-staging"
        ? "Capture this artifact from the staged retail/toolset scene without changing Aurora Web evidence files."
        : status === "blocked-retail-scene-driver-missing"
          ? target.runtimeModulePrepared
            ? "Start or attach to the already prepared disposable runtime module, then rerun readiness before capture."
            : target.compiledPackPrepared
            ? "Inject the already compiled retail/toolset oracle scene driver into a disposable module, then rerun readiness before capture."
            : "Create, compile, and inject the required retail/toolset oracle scene driver, then rerun readiness before capture."
          : "Start or attach to the already-staged retail/toolset scene, then rerun readiness before capture.",
    canonicalPromotionBlockedUntil: captureCase.validation.acceptanceArtifactChain,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const outputPath = toAbsolute(repoRoot, options.output);
  const queue = buildQueue(options);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: queue.status,
        output: toRepoRelative(repoRoot, outputPath),
        summary: queue.summary,
        processStatus: queue.inputs.runtimeReadiness.processStatus,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

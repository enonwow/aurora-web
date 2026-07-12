#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_DECOMPILED_SOURCE = "C:/Projects/New Folder/export/decompiled_all.c";
const DEFAULT_STRINGS_SOURCE = "C:/Projects/New Folder/export/strings.tsv";
const sourceAuditName = "audit-retail-light-function-disasm-2026-07-03.json";
const progFxAuditName = "audit-retail-progfx-type4-table-2026-07-03.json";
const itemLightAuditName = "audit-retail-item-light-tables-2026-07-05.json";
const lightStateAuditName = "audit-lightstate-default-retail-binary-2026-07-05.json";
let runtimeOptions = null;
let repoRoot = defaultRepoRoot;
let artifactDir = resolve(defaultRepoRoot, DEFAULT_ARTIFACT_DIR);

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    sourceAudit: null,
    decompiledSource: DEFAULT_DECOMPILED_SOURCE,
    stringsSource: DEFAULT_STRINGS_SOURCE,
    progFxAudit: null,
    itemLightAudit: null,
    lightStateAudit: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--sourceAudit") {
      index += 1;
      options.sourceAudit = requireValue(arg, argv[index]);
    } else if (arg === "--decompiledSource") {
      index += 1;
      options.decompiledSource = requireValue(arg, argv[index]);
    } else if (arg === "--stringsSource") {
      index += 1;
      options.stringsSource = requireValue(arg, argv[index]);
    } else if (arg === "--progFxAudit") {
      index += 1;
      options.progFxAudit = requireValue(arg, argv[index]);
    } else if (arg === "--itemLightAudit") {
      index += 1;
      options.itemLightAudit = requireValue(arg, argv[index]);
    } else if (arg === "--lightStateAudit") {
      index += 1;
      options.lightStateAudit = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-lightmanager-lane-owner-artifacts.mjs [options]

Options:
  --repoRoot <path>            Repository root. Defaults to aurora-web root.
  --artifactDir <path>         Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --sourceAudit <path>         Source audit JSON. Defaults to <artifactDir>/${sourceAuditName}
  --decompiledSource <path>    Decompiled source path. Defaults to ${DEFAULT_DECOMPILED_SOURCE}
  --stringsSource <path>       Decompiled string table path. Defaults to ${DEFAULT_STRINGS_SOURCE}
  --progFxAudit <path>         Optional ProgFX Type 4 table audit. Defaults to <artifactDir>/${progFxAuditName}
  --itemLightAudit <path>      Optional item light table audit. Defaults to <artifactDir>/${itemLightAuditName}
  --lightStateAudit <path>     Optional LightState binary audit. Defaults to <artifactDir>/${lightStateAuditName}
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function requireSourceAudit() {
  const sourceAuditPath = resolveSourceAuditPath();
  if (!existsSync(sourceAuditPath)) {
    throw new Error(`Missing source audit artifact: ${sourceAuditPath}`);
  }
  return readJsonFile(sourceAuditPath);
}

function readJsonFile(path) {
  const buffer = readFileSync(path);
  const text =
    buffer[0] === 0xff && buffer[1] === 0xfe
      ? buffer.toString("utf16le")
      : buffer.includes(0)
        ? buffer.toString("utf16le")
        : buffer.toString("utf8");
  return JSON.parse(text.replace(/^\uFEFF/u, ""));
}

function resolveSourceAuditPath() {
  return runtimeOptions?.sourceAudit
    ? toAbsolute(repoRoot, runtimeOptions.sourceAudit)
    : resolve(artifactDir, sourceAuditName);
}

function resolveOptionalArtifactPath(optionName, defaultName) {
  const inputPath = runtimeOptions?.[optionName];
  return inputPath ? toAbsolute(repoRoot, inputPath) : resolve(artifactDir, defaultName);
}

function readOptionalJsonArtifact(optionName, defaultName) {
  const path = resolveOptionalArtifactPath(optionName, defaultName);
  if (!existsSync(path)) {
    return {
      artifact: null,
      descriptor: {
        name: basename(path),
        path: toRepoRelative(repoRoot, path),
        status: "missing",
      },
    };
  }
  return {
    artifact: readJsonFile(path),
    descriptor: {
      ...describeFile(path),
      status: "present",
    },
  };
}

function findFirstObjectByKey(value, key) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(value, key)) {
    return value[key];
  }
  for (const child of Object.values(value)) {
    const found = findFirstObjectByKey(child, key);
    if (found) {
      return found;
    }
  }
  return null;
}

function findLightManagerXrefs(audit) {
  const reports = Array.isArray(audit.reports) ? audit.reports : [];
  for (const report of reports) {
    if (report?.lightManagerRetailXrefs) {
      return report.lightManagerRetailXrefs;
    }
  }
  throw new Error("No reports[].lightManagerRetailXrefs object found in source audit.");
}

function findSourceOrderingEvidence(audit) {
  return audit.lightManagerSourceOrderingEvidence ?? findFirstObjectByKey(audit, "lightManagerSourceOrderingEvidence");
}

function describeArtifact(name) {
  const path = resolve(artifactDir, name);
  return describeFile(path);
}

function describeFile(path) {
  const stats = statSync(path);
  return {
    name: basename(path),
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function findReportWithObject(audit, key) {
  return asArray(audit?.reports).find((report) => report?.[key])?.[key] ?? null;
}

function readSourceLines(sourcePath) {
  if (!existsSync(sourcePath)) {
    return null;
  }
  return readFileSync(sourcePath, "utf8").split(/\r?\n/u);
}

function findLine(lines, predicate, startLine = 1) {
  if (!lines) {
    return null;
  }
  for (let index = Math.max(0, startLine - 1); index < lines.length; index += 1) {
    const text = lines[index];
    if (predicate(text, index + 1)) {
      return {
        line: index + 1,
        text: text.trim().slice(0, 240),
      };
    }
  }
  return null;
}

function buildAnchor(lines, key, label, predicate, startLine = 1) {
  const hit = findLine(lines, predicate, startLine);
  return {
    key,
    label,
    status: hit ? "observed" : "missing",
    line: hit?.line ?? null,
    text: hit?.text ?? null,
  };
}

function buildActiveSlotAlgorithmEvidence(sourcePath) {
  const normalizedSource = sourcePath.replaceAll("\\", "/");
  const lines = readSourceLines(sourcePath);
  if (!lines) {
    return {
      source: normalizedSource,
      proofStatus: "blocked-decompiled-source-missing",
      anchors: [],
      blockedSemantics: [
        "retail active-slot algorithm cannot be audited without decompiled_all.c",
      ],
    };
  }
  const decompiledCallsiteSearch = buildLightManagerCallsiteSearch(lines);

  const maxFunction = buildAnchor(
    lines,
    "max-active-light-function",
    "FUN_00a41e30 returns min(configured max, 0x80)",
    (line) => line.includes("undefined4 __stdcall FUN_00a41e30"),
  );
  const maxDefault = buildAnchor(
    lines,
    "max-active-light-hard-cap",
    "hard cap literal 0x80",
    (line) => line.includes("local_4 = 0x80"),
    maxFunction.line ?? 1,
  );
  const maxConfigClamp = buildAnchor(
    lines,
    "max-active-light-config-clamp",
    "DAT_00cc3098 is used when below 0x81",
    (line) => line.includes("DAT_00cc3098 < 0x81"),
    maxFunction.line ?? 1,
  );
  const activeFunction = buildAnchor(
    lines,
    "active-list-function",
    "FUN_00a41e50 prunes/fades/adds/uploads active lights",
    (line) => line.includes("void __cdecl FUN_00a41e50"),
  );
  const addLightFunction = buildAnchor(
    lines,
    "lightmanager-add-light-function",
    "FUN_00a4128c adds a PartLight into LightManager source lists",
    (line) => line.includes("void __cdecl FUN_00a4128c"),
  );
  const addLightAllList = buildAnchor(
    lines,
    "lightmanager-add-all-list",
    "new lights are appended to the all-light list at param_1+8",
    (line) => line.includes("FUN_00a4139c((int *)(param_1 + 8),param_2)"),
    addLightFunction.line ?? 1,
  );
  const candidateSortComparator = buildAnchor(
    lines,
    "candidate-score-sort-comparator",
    "FUN_00a41694 sorts candidates by light+0x84",
    (line) => line.includes("return *(float *)(param_1 + 0x84) < *(float *)(param_2 + 0x84)"),
  );
  const candidateListFunction = buildAnchor(
    lines,
    "candidate-list-score-sort-function",
    "FUN_00a417bc rebuilds and score-sorts the param_1+0x38 candidate list",
    (line) => line.includes("void __cdecl FUN_00a417bc"),
  );
  const candidateListAppend = buildAnchor(
    lines,
    "candidate-list-append",
    "candidate entries append to param_1+0x38 before sorting",
    (line) => line.includes("FUN_00a4139c((int *)(param_1 + 0x38),iVar1)"),
    candidateListFunction.line ?? 1,
  );
  const candidateListSort = buildAnchor(
    lines,
    "candidate-list-sort",
    "candidate list is sorted with FUN_00a41694",
    (line) => line.includes("FUN_00a416bc(puVar2,puVar2 + *(int *)(param_1 + 0x3c),iVar4 >> 2,FUN_00a41694)"),
    candidateListFunction.line ?? 1,
  );
  const candidateFilterFunction = buildAnchor(
    lines,
    "candidate-filter-function",
    "FUN_00a42b80 filters all lights into the param_1+0x2c candidate-source list",
    (line) => line.includes("void __cdecl FUN_00a42b80"),
  );
  const candidateFilterReset = buildAnchor(
    lines,
    "candidate-filter-list-reset",
    "candidate-source list count at param_1+0x30 is reset before filtering",
    (line) => line.includes("*(undefined4 *)(param_1 + 0x30) = 0"),
    candidateFilterFunction.line ?? 1,
  );
  const candidateFilterAllList = buildAnchor(
    lines,
    "candidate-filter-all-list-iteration",
    "candidate filter iterates the all-light list at param_1+8",
    (line) => line.includes("FUN_00a41648((int *)(param_1 + 8),local_8)"),
    candidateFilterFunction.line ?? 1,
  );
  const candidateFilterSourceHandles = buildAnchor(
    lines,
    "candidate-filter-source-handles",
    "candidate requires either light+0x6c or light+0x70 source handle",
    (line) => line.includes("(*(int *)(iVar1 + 0x6c) != 0) || (*(int *)(iVar1 + 0x70) != 0)"),
    candidateFilterFunction.line ?? 1,
  );
  const candidateFilterShape = buildAnchor(
    lines,
    "candidate-filter-nonzero-shape",
    "candidate rejects lights whose 0x4c/0x50/0x54 shape vector is all zero",
    (line) => line.includes("(*(float *)(iVar1 + 0x4c) == 0.0) && (*(float *)(iVar1 + 0x50) == 0.0)"),
    candidateFilterFunction.line ?? 1,
  );
  const candidateFilterFalloff = buildAnchor(
    lines,
    "candidate-filter-positive-falloff",
    "candidate requires positive light+0x8c falloff/intensity scalar",
    (line) => line.includes("*(float *)(iVar1 + 0x8c) < 0.0 == (*(float *)(iVar1 + 0x8c) == 0.0)"),
    candidateFilterFunction.line ?? 1,
  );
  const candidateFilterFiniteRadius = buildAnchor(
    lines,
    "candidate-filter-finite-radius",
    "candidate radius light+0x58 must be below the 1000.0 sentinel",
    (line) => line.includes("*(float *)(iVar1 + 0x58) < 1000.0"),
    candidateFilterFunction.line ?? 1,
  );
  const candidateFilterDistance = buildAnchor(
    lines,
    "candidate-filter-distance-test",
    "candidate requires squared distance to be below (FUN_00a40904(light)+param_3)^2",
    (line) => line.includes("fVar2 * fVar2 + fVar3 * fVar3 + fVar4 * fVar4 < (float)lVar7 * (float)lVar7"),
    candidateFilterFunction.line ?? 1,
  );
  const candidateFilterAppend = buildAnchor(
    lines,
    "candidate-filter-append-to-source-list",
    "passing candidates append into param_1+0x2c",
    (line) => line.includes("FUN_00a4139c((int *)(param_1 + 0x2c),iVar1)"),
    candidateFilterFunction.line ?? 1,
  );
  const scoreFunction = buildAnchor(
    lines,
    "active-score-computation-function",
    "FUN_00a41850 computes per-light distance and score fields",
    (line) => line.includes("void __cdecl FUN_00a41850"),
  );
  const scorePositionDelta = buildAnchor(
    lines,
    "active-score-position-delta",
    "score computation subtracts camera/target position from light position fields 0x94/0x98/0x9c",
    (line) => line.includes("local_3c = *(float *)(iVar1 + 0x9c) - param_2[2]"),
    scoreFunction.line ?? 1,
  );
  const scoreDistanceWrite = buildAnchor(
    lines,
    "active-score-distance-write",
    "computed light distance is written to light+0x80",
    (line) => line.includes("*(float *)(iVar1 + 0x80) = (float)in_ST3"),
    scoreFunction.line ?? 1,
  );
  const scoreInvalidSentinel = buildAnchor(
    lines,
    "active-score-invalid-sentinel",
    "invalid radius/falloff inputs push score to the 0x47c35000 sentinel",
    (line) => line.includes("*(undefined4 *)(iVar1 + 0x84) = 0x47c35000"),
    scoreFunction.line ?? 1,
  );
  const scoreFalloffProduct = buildAnchor(
    lines,
    "active-score-falloff-product",
    "non-default path multiplies light+0x58 by light+0x8c and the selected range component",
    (line) => line.includes("fVar2 = *(float *)(iVar1 + 0x58) * *(float *)(iVar1 + 0x8c) * local_8"),
    scoreFunction.line ?? 1,
  );
  const scorePriorityOverride = buildAnchor(
    lines,
    "active-score-priority-override",
    "priority input uses light+0x74 when present, otherwise owner field +0xb0",
    (line) => line.includes("iVar4 = *(int *)(iVar1 + 0x74)"),
    scoreFunction.line ?? 1,
  );
  const scoreFormula = buildAnchor(
    lines,
    "active-score-formula",
    "light+0x84 is assigned ((priority+1) * distance) / ((class+4) * (falloff+1))",
    (line) => line.includes("((float)(iVar4 + 1) * *(float *)(iVar1 + 0x80)) /"),
    scoreFunction.line ?? 1,
  );
  const scoreSpecialSentinel = buildAnchor(
    lines,
    "active-score-special-sentinel",
    "matching DAT_00cc3094 receives the -1.0 score sentinel",
    (line) => line.includes("*(undefined4 *)(iVar1 + 0x84) = 0xbf800000"),
    scoreFunction.line ?? 1,
  );
  const activeSelectionFunction = buildAnchor(
    lines,
    "active-selection-function",
    "FUN_00a42728 selects active candidates from param_1+0x38 into param_1+0x5c",
    (line) => line.includes("int __cdecl FUN_00a42728"),
  );
  const activeSelectionAppend = buildAnchor(
    lines,
    "active-selection-append",
    "active candidates append to param_1+0x5c",
    (line) => line.includes("FUN_00a4139c((int *)(param_1 + 0x5c),iVar6)"),
    activeSelectionFunction.line ?? 1,
  );
  const activeSelectionCap = buildAnchor(
    lines,
    "active-selection-dat-00cc309c-cap",
    "active selection stops when the active count reaches DAT_00cc309c",
    (line) => line.includes("*(int *)(param_1 + 0x60) < DAT_00cc309c"),
    activeSelectionFunction.line ?? 1,
  );
  const activeSelectionRadius = buildAnchor(
    lines,
    "active-selection-distance-radius-test",
    "active selection requires light distance light+0x80 to be within radius light+0x58 or override light+0x60",
    (line) => line.includes("*(float *)(iVar6 + 0x80) <= fVar1"),
    activeSelectionFunction.line ?? 1,
  );
  const activeMaxLoad = buildAnchor(
    lines,
    "active-list-max-load",
    "active list uses FUN_00a41e30 max",
    (line) => line.includes("local_14 = FUN_00a41e30()"),
    activeFunction.line ?? 1,
  );
  const specialReserve = buildAnchor(
    lines,
    "special-light-reserve-two-slots",
    "special/head lights reserve two slots when DAT_00cc2314 is active",
    (line) => line.includes("local_14 = local_14 + -2"),
    activeFunction.line ?? 1,
  );
  const appendActive = buildAnchor(
    lines,
    "candidate-append-to-active-list",
    "candidate lights append into active list before upload",
    (line) => line.includes("FUN_00a4139c(param_2,iVar4)"),
    activeFunction.line ?? 1,
  );
  const uploadActive = buildAnchor(
    lines,
    "active-slot-upload-order",
    "active list order is uploaded with FUN_00a40b60(slot, intensity)",
    (line) => line.includes("FUN_00a40b60(*piVar1,uVar15,fVar16)"),
    activeFunction.line ?? 1,
  );
  const disableRemainder = buildAnchor(
    lines,
    "disable-unused-slots",
    "unused light slots are disabled after upload",
    (line) => line.includes("FUN_00a7817c(uVar7)"),
    activeFunction.line ?? 1,
  );
  const proximityFunction = buildAnchor(
    lines,
    "direct-proximity-upload-function",
    "FUN_00a42f5c uploads direct/proximity light slots by list order",
    (line) => line.includes("FUN_00a42f5c"),
  );
  const proximityUpload = buildAnchor(
    lines,
    "direct-proximity-upload",
    "direct/proximity path calls FUN_00a40b60 with incrementing local_8 slot",
    (line) => line.includes("FUN_00a40b60(iVar3,local_8"),
    proximityFunction.line ?? 1,
  );
  const shaderFunction = buildAnchor(
    lines,
    "shader-uniform-upload-function",
    "FUN_00a72ed8 uploads active light arrays to shader uniforms",
    (line) => line.includes("void FUN_00a72ed8"),
  );
  const shaderActiveArray = buildAnchor(
    lines,
    "shader-active-array-source",
    "shader upload reads DAT_00cff7e0 active-slot records",
    (line) => line.includes("local_10c = &DAT_00cff7e0"),
    shaderFunction.line ?? 1,
  );
  const shaderMaxLoop = buildAnchor(
    lines,
    "shader-max-light-loop",
    "shader upload loops up to FUN_00a41e30",
    (line) => line.includes("while (iVar5 = FUN_00a41e30(), local_a4 < iVar5)"),
    shaderFunction.line ?? 1,
  );
  const anchors = [
    maxFunction,
    maxDefault,
    maxConfigClamp,
    addLightFunction,
    addLightAllList,
    candidateSortComparator,
    candidateListFunction,
    candidateListAppend,
    candidateListSort,
    candidateFilterFunction,
    candidateFilterReset,
    candidateFilterAllList,
    candidateFilterSourceHandles,
    candidateFilterShape,
    candidateFilterFalloff,
    candidateFilterFiniteRadius,
    candidateFilterDistance,
    candidateFilterAppend,
    scoreFunction,
    scorePositionDelta,
    scoreDistanceWrite,
    scoreInvalidSentinel,
    scoreFalloffProduct,
    scorePriorityOverride,
    scoreFormula,
    scoreSpecialSentinel,
    activeSelectionFunction,
    activeSelectionAppend,
    activeSelectionCap,
    activeSelectionRadius,
    activeFunction,
    activeMaxLoad,
    specialReserve,
    appendActive,
    uploadActive,
    disableRemainder,
    proximityFunction,
    proximityUpload,
    shaderFunction,
    shaderActiveArray,
    shaderMaxLoop,
  ];
  const requiredKeys = new Set([
    "max-active-light-function",
    "max-active-light-hard-cap",
    "max-active-light-config-clamp",
    "lightmanager-add-light-function",
    "lightmanager-add-all-list",
    "candidate-score-sort-comparator",
    "candidate-list-score-sort-function",
    "candidate-list-sort",
    "candidate-filter-function",
    "candidate-filter-list-reset",
    "candidate-filter-all-list-iteration",
    "candidate-filter-source-handles",
    "candidate-filter-nonzero-shape",
    "candidate-filter-positive-falloff",
    "candidate-filter-finite-radius",
    "candidate-filter-distance-test",
    "candidate-filter-append-to-source-list",
    "active-score-computation-function",
    "active-score-position-delta",
    "active-score-distance-write",
    "active-score-invalid-sentinel",
    "active-score-falloff-product",
    "active-score-priority-override",
    "active-score-formula",
    "active-score-special-sentinel",
    "active-selection-function",
    "active-selection-append",
    "active-selection-dat-00cc309c-cap",
    "active-selection-distance-radius-test",
    "active-list-function",
    "active-list-max-load",
    "candidate-append-to-active-list",
    "active-slot-upload-order",
    "disable-unused-slots",
    "shader-active-array-source",
    "shader-max-light-loop",
  ]);
  const requiredAnchorsPresent = anchors
    .filter((anchor) => requiredKeys.has(anchor.key))
    .every((anchor) => anchor.status === "observed");

  return {
    source: normalizedSource,
    proofStatus: requiredAnchorsPresent
      ? "source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked"
      : "partial-active-slot-algorithm-anchors-missing",
    maxActiveLights: {
      configuredGlobal: "DAT_00cc3098",
      hardCap: 128,
      clampRule: "FUN_00a41e30 returns DAT_00cc3098 when DAT_00cc3098 < 0x81, otherwise 0x80",
    },
    activeListSemantics: [
      "FUN_00a4128c appends new PartLight entries into the all-light list at param_1+8",
      "FUN_00a42b80 filters the all-light list into the candidate-source list at param_1+0x2c",
      "FUN_00a41850 computes the active score scalar at light+0x84 before candidate sorting",
      "FUN_00a417bc rebuilds the candidate list at param_1+0x38 and sorts it with FUN_00a41694",
      "FUN_00a41694 orders candidates by the float at light+0x84",
      "FUN_00a42728 selects candidates from param_1+0x38 into active list param_1+0x5c",
      "FUN_00a41e50 loads the max active-light count from FUN_00a41e30",
      "when special/head lights are active, two slots are reserved before ordinary active-list upload",
      "existing active entries outside the sorted candidate window are removed or faded",
      "new candidates append from the candidate list until the active list reaches the max",
      "active list order is the slot upload order passed to FUN_00a40b60",
      "remaining slots up to the max are disabled with FUN_00a7817c",
    ],
    candidateFilterSemantics: {
      function: "FUN_00a42b80",
      sourceList: "param_1+8",
      candidateSourceList: "param_1+0x2c",
      requiredSourceHandles: ["light+0x6c", "light+0x70"],
      requiredNonZeroShapeFields: ["light+0x4c", "light+0x50", "light+0x54"],
      radiusField: "light+0x58",
      falloffOrIntensityField: "light+0x8c",
      finiteRadiusSentinel: 1000,
      distanceCull:
        "distanceSquared(light.position, cameraOrTarget) < (FUN_00a40904(light) + param_3)^2",
      activeSelectionRadiusRule:
        "FUN_00a42728 accepts a sorted candidate only when light+0x80 <= (light+0x60 when positive, otherwise light+0x58)",
      activeSelectionCountCap: "DAT_00cc309c",
    },
    scoreComputationSemantics: {
      function: "FUN_00a41850",
      distanceField: "light+0x80",
      scoreField: "light+0x84",
      positionFields: {
        x: "light+0x94",
        y: "light+0x98",
        z: "light+0x9c",
      },
      formula:
        "score = ((priority + 1) * distance) / ((class + 4) * (falloff + 1))",
      prioritySource:
        "light+0x74 when non-zero, otherwise the owning object field at owner+0xb0",
      falloffSource:
        "20.0 for the owner+200 default path, otherwise light+0x58 * light+0x8c * selectedRangeComponent",
      invalidScoreSentinel: "0x47c35000",
      specialScoreSentinel: "0xbf800000 (-1.0)",
      orderingInterpretation:
        "the comparator observes lower light+0x84 values before higher values; invalid inputs are pushed behind normal candidates while the special sentinel is forced ahead",
    },
    directProximitySemantics: [
      "FUN_00a42f5c can upload direct/proximity lights by iterating the source list and incrementing local_8",
      "that path is range-filtered and still depends on its caller/source list ordering",
    ],
    shaderUploadSemantics: [
      "FUN_00a72ed8 reads DAT_00cff7e0 active flags and adjacent light arrays",
      "shader upload loops to FUN_00a41e30 and copies active slots into uniform buffers",
    ],
    anchors,
    decompiledCallsiteSearch,
    blockedSemantics: [
      "this proves active slot cap, prune/append/upload mechanics, and shader upload arrays",
      "this proves a score-sorted active candidate path and the central light+0x84 score formula",
      "the decompiled callsite search does not expose direct upstream owner callsites for the core LightManager add/filter/upload functions",
      "this does not yet identify enough upstream lane-owner data-flow to predict tile/placeable/MDL/item/ProgFX accepted/dropped owners",
      "retail cross-lane accepted/dropped owners still require upstream owner data-flow or a direct runtime slot dump",
    ],
  };
}

function buildLightManagerCallsiteSearch(lines) {
  const targets = [
    {
      symbol: "FUN_00a4128c",
      label: "LightManager add PartLight into all-light/source lists",
    },
    {
      symbol: "FUN_00a42b80",
      label: "LightManager candidate-source filter from all-light list",
    },
    {
      symbol: "FUN_00a41e50",
      label: "LightManager prune/append/upload active slots",
    },
    {
      symbol: "FUN_00a42728",
      label: "LightManager select sorted candidates into active list",
    },
    {
      symbol: "FUN_00a417bc",
      label: "LightManager rebuild and sort active candidates",
    },
    {
      symbol: "FUN_00a41850",
      label: "LightManager compute active-light score",
    },
  ];
  const searchedTargets = targets.map((target) => {
    const occurrences = lines
      .map((line, index) => ({ line: index + 1, text: line.trim().slice(0, 240) }))
      .filter((entry) => entry.text.includes(target.symbol));
    const definitions = occurrences.filter(
      (entry) =>
        entry.text.includes(`${target.symbol}(`) &&
        (entry.text.includes("__cdecl") ||
          entry.text.includes("__stdcall") ||
          entry.text.startsWith("int ")),
    );
    const directCalls = occurrences.filter(
      (entry) =>
        !definitions.some((definition) => definition.line === entry.line) &&
        entry.text.includes(`${target.symbol}(`),
    );
    return {
      ...target,
      occurrenceCount: occurrences.length,
      definitionCount: definitions.length,
      directCallCount: directCalls.length,
      definitions,
      directCalls,
      status:
        directCalls.length > 0
          ? "direct-callsite-observed-in-decompiled-source"
          : "no-direct-callsite-observed-in-decompiled-source",
    };
  });
  return {
    proofStatus: "decompiled-lightmanager-callsite-search-complete-upstream-owner-calls-still-blocked",
    searchedTargetCount: searchedTargets.length,
    directCallTargetCount: searchedTargets.filter((target) => target.directCallCount > 0).length,
    searchedTargets,
    blockedSemantics: [
      "definitions alone do not recover tile/placeable/MDL/item/ProgFX owner insertion order",
      "direct calls found here are internal LightManager flow unless their receiver/owner input is also recovered",
      "upstream cross-lane owner precedence remains blocked when add/filter/upload functions have no lane-owned direct callsite in decompiled_all.c",
    ],
  };
}

function summarizeProgFxAudit(progFxAudit) {
  const summary = progFxAudit?.summary ?? {};
  const ownerSummary = progFxAudit?.visualEffectsOwnerSummary ?? {};
  return {
    status: progFxAudit ? "present" : "missing",
    proofStatus:
      summary.proofStatus ??
      ownerSummary.proofStatus ??
      "missing-retail-progfx-type4-table-audit",
    source: progFxAudit?.source ?? null,
    visualEffectsSource: progFxAudit?.visualEffectsSource ?? null,
    type4RowCount: summary.type4RowCount ?? null,
    itemLightNormalRowCount: summary.itemLightNormalRowCount ?? null,
    itemLightFadeRowCount: summary.itemLightFadeRowCount ?? null,
    nonItemType4RowCount: summary.nonItemType4RowCount ?? null,
    animationKindCounts: summary.animationKindCounts ?? {},
    castShadowsBooleanCounts: summary.castShadowsBooleanCounts ?? {},
    priorityRawCounts: summary.priorityRawCounts ?? {},
    proximitySuppressionBooleanCounts: summary.proximitySuppressionBooleanCounts ?? {},
    attachToSceneBooleanCounts: summary.attachToSceneBooleanCounts ?? {},
    type4OwnerPhaseCount: ownerSummary.type4OwnerPhaseCount ?? null,
    itemLightOwnerPhaseCount: ownerSummary.itemLightOwnerPhaseCount ?? null,
    nonItemOwnerPhaseCount: ownerSummary.nonItemOwnerPhaseCount ?? null,
    nonItemCastShadowOwnerPhaseCount: ownerSummary.nonItemCastShadowOwnerPhaseCount ?? null,
    nonItemAttachToSceneOwnerPhaseCount:
      ownerSummary.nonItemAttachToSceneOwnerPhaseCount ?? null,
    nonItemProximitySuppressionOwnerPhaseCount:
      ownerSummary.nonItemProximitySuppressionOwnerPhaseCount ?? null,
    sampleItemLightOwnerRows: asArray(ownerSummary.itemLightOwnerRows).slice(0, 8),
    sampleNonItemOwnerRows: asArray(ownerSummary.nonItemOwnerRows).slice(0, 8),
  };
}

function summarizeItemLightAudit(itemLightAudit) {
  const tables = asArray(itemLightAudit?.tables);
  const tableByResref = Object.fromEntries(tables.map((table) => [table.resref, table]));
  const pickRows = (resref, limit = 8) => asArray(tableByResref[resref]?.rows).slice(0, limit);
  return {
    status: itemLightAudit ? "present" : "missing",
    proofStatus: itemLightAudit?.proofStatus ?? "missing-retail-key-bif-item-light-table-audit",
    readers: itemLightAudit?.readers ?? [],
    tableStatuses: tables.map((table) => ({
      resref: table.resref,
      status: table.status,
      rowCount: asArray(table.rows).length,
    })),
    itemPropertyLightRow: pickRows("itempropdef", 1)[0] ?? null,
    itemLightCostTableRow: pickRows("iprp_costtable", 1)[0] ?? null,
    itemLightParamTableRow: pickRows("iprp_paramtable", 1)[0] ?? null,
    lightCostRows: pickRows("iprp_lightcost"),
    colorRows: pickRows("iprp_color"),
  };
}

function summarizeLightStateAudit(lightStateAudit) {
  const references = asArray(lightStateAudit?.references);
  return {
    status: lightStateAudit ? "present" : "missing",
    proofStatus:
      lightStateAudit?.proofStatus ?? "missing-lightstate-default-retail-binary-audit",
    source: lightStateAudit?.source ?? null,
    referenceCount: references.length,
    defaultOnInstructionCount: references.filter((reference) => reference.defaultOnInstruction)
      .length,
    firstDefaultOnReference:
      references.find((reference) => reference.defaultOnInstruction) ?? references[0] ?? null,
  };
}

function buildSourceFamilyEvidence(
  audit,
  laneOwnerSourceAnchorScan,
  laneOwnerStringTableAnchorScan,
  lightManagerXrefs,
  progFxAudit,
  itemLightAudit,
  lightStateAudit,
) {
  const progFxSummary = summarizeProgFxAudit(progFxAudit);
  const itemLightSummary = summarizeItemLightAudit(itemLightAudit);
  const lightStateSummary = summarizeLightStateAudit(lightStateAudit);
  const clientVfxEvidence = findReportWithObject(audit, "clientVisualEffectReceiveRenderEvidence");
  const progFxSourceEvidence = audit.progfxType4SourceSchedulerEvidence ?? null;
  const hasPartLightTargets = hasPartLightBinaryTargets(lightManagerXrefs);
  const progFxHasPriorityZero =
    Object.prototype.hasOwnProperty.call(progFxSummary.priorityRawCounts, "0");
  return [
    {
      lane: "terrain-tile-main-light",
      status: "source-backed-lane-family-owner-order-blocked",
      proofStatus: findLaneAnchor(laneOwnerSourceAnchorScan, "terrain-tile-main-light").status,
      acceptedSourceBackedFacts: [
        "Tile_MainLight1/2 ARE fields are recovered in the decompiled source",
        "main tile lights resolve through lightcolor.2da as static tile-light data, not fake point emitters",
      ],
      blockedSemantics: [
        "retail cross-lane insertion precedence into the common active-light budget is not recovered",
      ],
    },
    {
      lane: "terrain-tile-source-light",
      status: "source-backed-lane-family-owner-order-blocked",
      proofStatus: findLaneAnchor(laneOwnerSourceAnchorScan, "terrain-tile-source-light").status,
      acceptedSourceBackedFacts: [
        "decompiled source creates fx_flame01 carriers for sourcelight1/sourcelight2",
        "source-light carrier uses an AuroraLight01 source-family path before LightManager ordering",
      ],
      blockedSemantics: [
        "exact receiver data-flow from the carrier owner into LightManager Add/Prioritize order is not recovered",
      ],
    },
    {
      lane: "placeables-2da-light",
      status: "retail-table-binary-family-owner-order-blocked",
      proofStatus:
        lightStateSummary.defaultOnInstructionCount > 0
          ? "retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked"
          : "partial-placeable-light-family-lightstate-audit-missing",
      sourceAnchorStatus: findLaneAnchor(laneOwnerSourceAnchorScan, "placeables-2da-light").status,
      stringTableAnchorStatus:
        findLaneAnchor(laneOwnerStringTableAnchorScan, "placeables-2da-light").status,
      stringTableAnchors:
        findLaneAnchor(laneOwnerStringTableAnchorScan, "placeables-2da-light").hits,
      lightStateAudit: lightStateSummary,
      acceptedSourceBackedFacts: [],
      acceptedRetailResourceBackedFacts: [
        "placeables.2da LightColor/LightOffset drives a real placeable point-light lane in Aurora Web diagnostics",
        "retail fx_placeable01/AuroraLight01 carrier supplies radius/falloff for placeable LightColor",
        "retail ShadowSize mapping selects Fx_Shadow_S for 0, Fx_Shadow_L for 2, otherwise Fx_Shadow_M",
      ],
      acceptedRetailBinaryBackedFacts: [
        "missing UTP LightState defaults to ON when the LightState binary audit is present",
      ],
      blockedSemantics: [
        "the source-only decompiled C dump does not expose a direct placeables.2da LightColor owner callsite",
        "the recovered placeable family does not prove retail cross-lane active-light precedence",
      ],
    },
    {
      lane: "mdl-source-light-node",
      status: hasPartLightTargets
        ? "source-backed-lane-family-owner-order-blocked"
        : "partial-mdl-light-family-partlight-target-missing",
      proofStatus: hasPartLightTargets
        ? "retail-binary-backed-mdl-partlight-family-owner-order-blocked"
        : "not-observed-in-current-audit",
      acceptedSourceBackedFacts: [
        "MdlNodeLight::InternalCreateInstance creates PartLight instances",
        "PartLight target symbols and Gob light collection helpers are visible in the retail binary audit",
      ],
      blockedSemantics: [
        "PartLight creation/collection does not identify final cross-lane insertion precedence",
      ],
    },
    {
      lane: "item-property-light",
      status:
        itemLightSummary.status === "present" && progFxSummary.status === "present"
          ? "retail-table-family-owner-order-blocked"
          : "partial-item-light-family-audit-missing",
      proofStatus:
        itemLightSummary.status === "present" && progFxSummary.status === "present"
          ? "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked"
          : "missing-item-light-or-progfx-source-family-audit",
      itemLightTables: itemLightSummary,
      progFxType4Table: {
        proofStatus: progFxSummary.proofStatus,
        itemLightNormalRowCount: progFxSummary.itemLightNormalRowCount,
        itemLightFadeRowCount: progFxSummary.itemLightFadeRowCount,
        itemLightOwnerPhaseCount: progFxSummary.itemLightOwnerPhaseCount,
        sampleItemLightOwnerRows: progFxSummary.sampleItemLightOwnerRows,
      },
      clientVisualEffectReceiveRenderProofStatus: clientVfxEvidence?.proofStatus ?? null,
      clientObjectVisualEffectVtableSlots:
        clientVfxEvidence?.clientObjectVisualEffectVtableSlots ?? null,
      acceptedSourceBackedFacts: [
        "client VFX receive/render evidence proves the looping-VFX object attach/load path, but not scheduler data-flow",
      ],
      acceptedRetailResourceBackedFacts: [
        "itempropdef.2da row 44 identifies the Light item property and its cost/parameter tables",
        "iprp_lightcost.2da rows encode Dim 5m, Low 10m, Normal 15m, and Bright 20m",
        "iprp_color.2da rows encode Blue, Yellow, Purple, Red, Green, Orange, and White",
        "visualeffects.2da item-light rows map through progfx.2da Type 4 to fx_light_clr.mdl light animations when the ProgFX audit is present",
      ],
      blockedSemantics: [
        "ApplyLight/source-family evidence does not prove item-light insertion order against tile/placeable/MDL/ProgFX lanes",
        "retail item-light shadow projection parity still depends on the shadow-volume retail oracle",
      ],
    },
    {
      lane: "progfx-type4-light-or-vision",
      status:
        progFxSummary.status === "present"
          ? "retail-table-family-owner-order-blocked"
          : "partial-progfx-type4-family-table-audit-missing",
      proofStatus:
        progFxSummary.status === "present"
          ? "retail-table-backed-progfx-type4-table-owner-phase-family-runtime-scheduler-blocked"
          : "missing-retail-progfx-type4-table-audit",
      decompiledSourceSchedulerProofStatus: progFxSourceEvidence?.proofStatus ?? null,
      retailTable: progFxSummary,
      acceptedSourceBackedFacts: [],
      acceptedRetailResourceBackedFacts: [
        "progfx.2da Type 4 Param3/Param4/Param5/Param6 values are retail-table backed",
        "visualeffects.2da owner phases referencing Type 4 rows are retail-table backed",
        "vanilla non-item Type 4 rows do not request cast shadows in the table audit",
        progFxHasPriorityZero
          ? "retail progfx.2da includes at least one stock Type 4 Param4=0 row"
          : "retail progfx.2da includes no stock Type 4 Param4=0 row; zero-priority requires a custom override scene",
      ],
      blockedSemantics: [
        progFxHasPriorityZero
          ? "priority tie/zero behavior still requires retail runtime capture or scheduler data-flow"
          : "priority tie and custom Param4=0 behavior still require retail runtime capture or scheduler data-flow",
        "proximity threshold and attach-to-scene restore timing are not proven by table data alone",
        "vision pixel mutation parity is still blocked without retail/toolset oracle captures",
      ],
    },
  ];
}

function describeSourceAuditArtifact() {
  const path = resolveSourceAuditPath();
  const stats = statSync(path);
  return {
    name: basename(path),
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

function scanLaneOwnerSourceAnchors(sourcePath) {
  if (!existsSync(sourcePath)) {
    return {
      source: sourcePath.replaceAll("\\", "/"),
      proofStatus: "blocked-decompiled-source-missing",
      lanes: [],
    };
  }
  const laneNeedles = [
    {
      lane: "terrain-tile-main-light",
      needles: ["Tile_MainLight1", "Tile_MainLight2"],
    },
    {
      lane: "terrain-tile-source-light",
      needles: ["fx_flame01", "sourcelight1", "sourcelight2"],
    },
    {
      lane: "placeables-2da-light",
      needles: ["placeablelight", "LightColor", "ShadowSize", "LightState"],
    },
    {
      lane: "progfx-type4-light-or-vision",
      needles: ["visualeffects"],
    },
  ];
  const laneHits = new Map(laneNeedles.map((lane) => [lane.lane, []]));
  const lines = readFileSync(sourcePath, "utf8").split(/\r?\n/u);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const text = line.trim();
    for (const lane of laneNeedles) {
      if (laneHits.get(lane.lane).length >= 16) {
        continue;
      }
      const needle = lane.needles.find((candidate) => text.includes(candidate));
      if (needle) {
        laneHits.get(lane.lane).push({
          line: lineNumber,
          needle,
          text: text.slice(0, 240),
        });
      }
    }
  });
  const lanes = laneNeedles.map((lane) => {
    const hits = laneHits.get(lane.lane) ?? [];
    return {
      lane: lane.lane,
      needles: lane.needles,
      status:
        hits.length > 0
          ? "source-backed-lane-anchor-observed"
          : "not-observed-in-source-only-decompilation",
      hits,
    };
  });
  return {
    source: sourcePath.replaceAll("\\", "/"),
    proofStatus: lanes.some((lane) => lane.hits.length > 0)
      ? "source-backed-lane-owner-anchor-scan-ran"
      : "source-lane-owner-anchor-scan-no-hits",
    lanes,
  };
}

function scanLaneOwnerStringTableAnchors(stringsPath) {
  if (!existsSync(stringsPath)) {
    return {
      source: stringsPath.replaceAll("\\", "/"),
      proofStatus: "decompilation-string-table-missing",
      lanes: [],
    };
  }
  const laneNeedles = [
    {
      lane: "placeables-2da-light",
      needles: ["placeablelight"],
    },
  ];
  const laneHits = new Map(laneNeedles.map((lane) => [lane.lane, []]));
  const lines = readFileSync(stringsPath, "utf8").split(/\r?\n/u);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const text = line.trim();
    for (const lane of laneNeedles) {
      if (laneHits.get(lane.lane).length >= 16) {
        continue;
      }
      const needle = lane.needles.find((candidate) => text.includes(candidate));
      if (needle) {
        laneHits.get(lane.lane).push({
          line: lineNumber,
          needle,
          text: text.slice(0, 240),
        });
      }
    }
  });
  const lanes = laneNeedles.map((lane) => {
    const hits = laneHits.get(lane.lane) ?? [];
    return {
      lane: lane.lane,
      needles: lane.needles,
      status:
        hits.length > 0
          ? "decompilation-string-table-anchor-observed"
          : "not-observed-in-decompilation-string-table",
      hits,
    };
  });
  return {
    source: stringsPath.replaceAll("\\", "/"),
    proofStatus: lanes.some((lane) => lane.hits.length > 0)
      ? "decompilation-string-table-anchor-scan-ran"
      : "decompilation-string-table-anchor-scan-no-hits",
    lanes,
  };
}

function summarizeSourceOrderingEvidence(sourceOrderingEvidence) {
  if (!sourceOrderingEvidence) {
    return {
      proofStatus: "not-present-in-source-audit",
      directInsertionCallHitCount: null,
      laneSourceHintCount: null,
      internalInsertionProofStatus: "",
      scoreSortUploadProofStatus: "",
      retailUploadOrderProofStatus: "",
      frameRebuildOrderingProofStatus: "",
      directProximityUploadProofStatus: "",
      remainingBlockedSemantics: [],
    };
  }
  return {
    proofStatus: sourceOrderingEvidence.proofStatus ?? "",
    source: sourceOrderingEvidence.source ?? "",
    directInsertionCallHitCount: Array.isArray(sourceOrderingEvidence.directInsertionCallHits)
      ? sourceOrderingEvidence.directInsertionCallHits.length
      : null,
    laneSourceHintCount: Array.isArray(sourceOrderingEvidence.laneSourceHints)
      ? sourceOrderingEvidence.laneSourceHints.length
      : null,
    internalInsertionProofStatus:
      sourceOrderingEvidence.internalInsertionEvidence?.proofStatus ?? "",
    scoreSortUploadProofStatus:
      sourceOrderingEvidence.scoreSortUploadEvidence?.proofStatus ?? "",
    retailUploadOrderProofStatus:
      sourceOrderingEvidence.retailUploadOrderEvidence?.proofStatus ?? "",
    frameRebuildOrderingProofStatus:
      sourceOrderingEvidence.frameRebuildOrderingEvidence?.proofStatus ?? "",
    directProximityUploadProofStatus:
      sourceOrderingEvidence.directProximityUploadEvidence?.proofStatus ?? "",
    firstHits: sourceOrderingEvidence.firstHits ?? {},
    laneSourceHints: sourceOrderingEvidence.laneSourceHints ?? [],
    remainingBlockedSemantics: sourceOrderingEvidence.remainingBlockedSemantics ?? [],
  };
}

function trimSlotCandidates(indirectEvidence) {
  return (indirectEvidence?.slotCandidates ?? []).map((slot) => ({
    slotOffset: slot.slotOffset,
    target: slot.target,
    slotVa: slot.slotVa,
    targetVa: slot.targetVa,
    candidateCount: slot.candidateCount,
    sampleCount: Array.isArray(slot.samples) ? slot.samples.length : 0,
    samples: (slot.samples ?? []).slice(0, 32),
  }));
}

function buildReceiverXrefsArtifact(lightManagerXrefs) {
  const indirect = lightManagerXrefs.indirectVtableSlotCallEvidence ?? {};
  return {
    version: "aurora-lightmanager-vtable-receiver-xrefs/v1",
    generatedAt: new Date().toISOString(),
    status: "blocked-owner-receiver-dataflow-not-recovered",
    passed: false,
    sourceAuditArtifact: describeSourceAuditArtifact(),
    summary: {
      proofStatus: lightManagerXrefs.proofStatus,
      targetCount: lightManagerXrefs.targetCount,
      requestedTargetCount: lightManagerXrefs.requestedTargetCount,
      directCallXrefCount: lightManagerXrefs.directCallXrefCount,
      requestedDirectCallXrefCount: lightManagerXrefs.requestedDirectCallXrefCount,
      absoluteAddressRefCount: lightManagerXrefs.absoluteAddressRefCount,
      indirectCandidateCount: indirect.candidateCount,
      sampledCandidateCount: indirect.sampledCandidateCount,
      sampledCandidatesWithKnownDirectCallContextCount:
        indirect.sampledCandidatesWithKnownDirectCallContextCount,
    },
    targets: lightManagerXrefs.targets ?? [],
    directCallTargetSummary: lightManagerXrefs.directCallTargetSummary ?? [],
    requestedDirectCallTargetSummary: lightManagerXrefs.requestedDirectCallTargetSummary ?? [],
    requestedDirectCallXrefs: lightManagerXrefs.requestedDirectCallXrefs ?? [],
    absoluteVtableClusterEvidence: lightManagerXrefs.absoluteVtableClusterEvidence ?? null,
    indirectVtableSlotCallEvidence: {
      proofStatus: indirect.proofStatus,
      candidateCount: indirect.candidateCount,
      sampledCandidateCount: indirect.sampledCandidateCount,
      sampledCandidatesWithKnownDirectCallContextCount:
        indirect.sampledCandidatesWithKnownDirectCallContextCount,
      sampledKnownDirectCallTargetSummary: indirect.sampledKnownDirectCallTargetSummary ?? [],
      slotCandidates: trimSlotCandidates(indirect),
      remainingBlockedSemantics: indirect.remainingBlockedSemantics ?? [],
    },
    blocker:
      "The retail binary proves the LightManager vtable cluster and indirect slot candidates, but the receiver/owner data-flow for tile/placeable/MDL/item/ProgFX lane insertion is still not recovered.",
  };
}

function findLaneAnchor(scan, lane) {
  return scan.lanes?.find((entry) => entry.lane === lane) ?? {
    lane,
    status: "not-scanned",
    hits: [],
  };
}

function hasPartLightBinaryTargets(lightManagerXrefs) {
  return (lightManagerXrefs.targets ?? []).some((target) =>
    String(target.name ?? "").includes("PartLight")
  );
}

function buildLaneOwnerCallgraphArtifact(
  audit,
  lightManagerXrefs,
  sourceOrderingEvidence,
  laneOwnerSourceAnchorScan,
  laneOwnerStringTableAnchorScan,
  activeSlotAlgorithmEvidence,
  sourceFamilyArtifactDescriptors,
  progFxAudit,
  itemLightAudit,
  lightStateAudit,
) {
  const cluster = lightManagerXrefs.absoluteVtableClusterEvidence ?? {};
  const indirect = lightManagerXrefs.indirectVtableSlotCallEvidence ?? {};
  const sourceOrderingSummary = summarizeSourceOrderingEvidence(sourceOrderingEvidence);
  const hasPartLightTargets = hasPartLightBinaryTargets(lightManagerXrefs);
  const sourceFamilyEvidence = buildSourceFamilyEvidence(
    audit,
    laneOwnerSourceAnchorScan,
    laneOwnerStringTableAnchorScan,
    lightManagerXrefs,
    progFxAudit,
    itemLightAudit,
    lightStateAudit,
  );
  const sourceFamilyByLane = Object.fromEntries(
    sourceFamilyEvidence.map((evidence) => [evidence.lane, evidence])
  );
  const familyStatus = (lane) => sourceFamilyByLane[lane]?.status ?? "not-evaluated";
  const familyProof = (lane) => sourceFamilyByLane[lane]?.proofStatus ?? "not-evaluated";
  return {
    version: "aurora-lightmanager-lane-owner-callgraph/v1",
    generatedAt: new Date().toISOString(),
    status: "blocked-common-lane-owner-precedence-not-recovered",
    passed: false,
    sourceAuditArtifact: describeSourceAuditArtifact(),
    requiredLaneOwners: [
      {
        lane: "terrain-tile-main-light",
        localEvidence:
          "Tile_MainLight1/2 fields are visible in the decompiled tile data source; final manager owner precedence remains unresolved.",
        sourceAnchorStatus: findLaneAnchor(laneOwnerSourceAnchorScan, "terrain-tile-main-light").status,
        sourceAnchors: findLaneAnchor(laneOwnerSourceAnchorScan, "terrain-tile-main-light").hits,
        sourceFamilyStatus: familyStatus("terrain-tile-main-light"),
        sourceFamilyProofStatus: familyProof("terrain-tile-main-light"),
        lightManagerOwnerPath: "not-recovered",
      },
      {
        lane: "terrain-tile-source-light",
        localEvidence:
          "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates terrain source-light fx_flame01 carriers.",
        sourceAnchorStatus: findLaneAnchor(laneOwnerSourceAnchorScan, "terrain-tile-source-light").status,
        sourceAnchors: findLaneAnchor(laneOwnerSourceAnchorScan, "terrain-tile-source-light").hits,
        sourceFamilyStatus: familyStatus("terrain-tile-source-light"),
        sourceFamilyProofStatus: familyProof("terrain-tile-source-light"),
        lightManagerOwnerPath: "not-recovered",
      },
      {
        lane: "placeables-2da-light",
        localEvidence:
          "placeables.2da LightColor/LightOffset/ShadowSize and UTP LightState are mapped into Aurora Web diagnostics.",
        sourceAnchorStatus: findLaneAnchor(laneOwnerSourceAnchorScan, "placeables-2da-light").status,
        sourceAnchors: findLaneAnchor(laneOwnerSourceAnchorScan, "placeables-2da-light").hits,
        stringTableAnchorStatus:
          findLaneAnchor(laneOwnerStringTableAnchorScan, "placeables-2da-light").status,
        stringTableAnchors:
          findLaneAnchor(laneOwnerStringTableAnchorScan, "placeables-2da-light").hits,
        sourceFamilyStatus: familyStatus("placeables-2da-light"),
        sourceFamilyProofStatus: familyProof("placeables-2da-light"),
        lightManagerOwnerPath: "not-recovered",
      },
      {
        lane: "mdl-source-light-node",
        localEvidence:
          "MdlNodeLight::InternalCreateInstance creates PartLight and attaches it to Gob+0x470.",
        sourceAnchorStatus: hasPartLightTargets
          ? "retail-binary-partlight-targets-observed"
          : "not-observed-in-current-audit",
        binaryTargetEvidence: (lightManagerXrefs.targets ?? []).filter((target) =>
          String(target.name ?? "").includes("PartLight")
        ),
        sourceFamilyStatus: familyStatus("mdl-source-light-node"),
        sourceFamilyProofStatus: familyProof("mdl-source-light-node"),
        lightManagerOwnerPath: "not-recovered",
      },
      {
        lane: "item-property-light",
        localEvidence:
          "ApplyLight maps item-property color/brightness to VFX_DUR_LIGHT rows and looping visual effects.",
        sourceAnchorStatus: "not-observed-in-current-lightmanager-artifact",
        sourceAnchors: [],
        sourceFamilyStatus: familyStatus("item-property-light"),
        sourceFamilyProofStatus: familyProof("item-property-light"),
        lightManagerOwnerPath: "not-recovered",
      },
      {
        lane: "progfx-type4-light-or-vision",
        localEvidence:
          "visualeffects.2da/progfx.2da Type 4 rows are table-backed and local scheduler diagnostics preserve priority/proximity/attach/vision lanes.",
        sourceAnchorStatus: findLaneAnchor(laneOwnerSourceAnchorScan, "progfx-type4-light-or-vision").status,
        sourceAnchors: findLaneAnchor(laneOwnerSourceAnchorScan, "progfx-type4-light-or-vision").hits,
        sourceFamilyStatus: familyStatus("progfx-type4-light-or-vision"),
        sourceFamilyProofStatus: familyProof("progfx-type4-light-or-vision"),
        lightManagerOwnerPath: "not-recovered",
      },
    ],
    sourceFamilyArtifacts: sourceFamilyArtifactDescriptors,
    sourceFamilyEvidence,
    recoveredSourceOrdering: sourceOrderingSummary,
    activeSlotAlgorithmEvidence,
    laneOwnerSourceAnchorScan,
    laneOwnerStringTableAnchorScan,
    recoveredLightManagerCore: {
      proofStatus: lightManagerXrefs.proofStatus,
      requestedDirectCallXrefCount: lightManagerXrefs.requestedDirectCallXrefCount,
      requestedDirectCallTargetSummary: lightManagerXrefs.requestedDirectCallTargetSummary ?? [],
      vtableClusterProofStatus: cluster.proofStatus,
      requestedCoreSlots: cluster.requestedCoreSlots ?? [],
      indirectSlotProofStatus: indirect.proofStatus,
      indirectCandidateCount: indirect.candidateCount,
      sampledKnownDirectCallTargetSummary: indirect.sampledKnownDirectCallTargetSummary ?? [],
    },
    conclusion:
      "The active slot cap, active-list prune/append/upload, unused-slot disable, and shader active-light array upload are source-backed. No direct AddLight/PrioritizeLights/RemoveLight/UpdateLights xrefs and no sampled indirect receiver context tie the required lane owners to a common upstream insertion/merge order, so cross-lane owner precedence remains blocked pending deeper data-flow recovery or a direct retail slot dump.",
  };
}

try {
  runtimeOptions = parseArgs(process.argv.slice(2));
  repoRoot = resolve(runtimeOptions.repoRoot);
  artifactDir = toAbsolute(repoRoot, runtimeOptions.artifactDir);
  mkdirSync(artifactDir, { recursive: true });
  const audit = requireSourceAudit();
  const lightManagerXrefs = findLightManagerXrefs(audit);
  const sourceOrderingEvidence = findSourceOrderingEvidence(audit);
  const laneOwnerSourceAnchorScan = scanLaneOwnerSourceAnchors(
    toAbsolute(repoRoot, runtimeOptions.decompiledSource)
  );
  const laneOwnerStringTableAnchorScan = scanLaneOwnerStringTableAnchors(
    toAbsolute(repoRoot, runtimeOptions.stringsSource)
  );
  const activeSlotAlgorithmEvidence = buildActiveSlotAlgorithmEvidence(
    toAbsolute(repoRoot, runtimeOptions.decompiledSource)
  );
  const progFxArtifact = readOptionalJsonArtifact("progFxAudit", progFxAuditName);
  const itemLightArtifact = readOptionalJsonArtifact("itemLightAudit", itemLightAuditName);
  const lightStateArtifact = readOptionalJsonArtifact("lightStateAudit", lightStateAuditName);
  const receiverArtifact = buildReceiverXrefsArtifact(lightManagerXrefs);
  const callgraphArtifact = buildLaneOwnerCallgraphArtifact(
    audit,
    lightManagerXrefs,
    sourceOrderingEvidence,
    laneOwnerSourceAnchorScan,
    laneOwnerStringTableAnchorScan,
    activeSlotAlgorithmEvidence,
    {
      progFxAudit: progFxArtifact.descriptor,
      itemLightAudit: itemLightArtifact.descriptor,
      lightStateAudit: lightStateArtifact.descriptor,
    },
    progFxArtifact.artifact,
    itemLightArtifact.artifact,
    lightStateArtifact.artifact,
  );
  const receiverPath = resolve(artifactDir, "lightmanager-vtable-receiver-xrefs.json");
  const callgraphPath = resolve(artifactDir, "lightmanager-lane-owner-callgraph.json");
  writeFileSync(receiverPath, `${JSON.stringify(receiverArtifact, null, 2)}\n`, "utf8");
  writeFileSync(callgraphPath, `${JSON.stringify(callgraphArtifact, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: "lightmanager-lane-owner-artifacts-written-cross-lane-order-still-blocked",
        outputs: [
          "lightmanager-vtable-receiver-xrefs.json",
          "lightmanager-lane-owner-callgraph.json",
        ],
        requestedDirectCallXrefCount: lightManagerXrefs.requestedDirectCallXrefCount,
        sourceOrderingProofStatus: callgraphArtifact.recoveredSourceOrdering.proofStatus,
        activeSlotAlgorithmProofStatus:
          callgraphArtifact.activeSlotAlgorithmEvidence.proofStatus,
        sourceFamilyProofStatuses: Object.fromEntries(
          callgraphArtifact.sourceFamilyEvidence.map((evidence) => [
            evidence.lane,
            evidence.proofStatus,
          ])
        ),
        indirectCandidateCount: lightManagerXrefs.indirectVtableSlotCallEvidence?.candidateCount ?? null,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

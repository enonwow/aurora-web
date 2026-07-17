#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");

const AREA_RESREF = "cdx_mapflat01";
const RESOURCE_TYPES = {
  ifo: 2014,
  git: 2023,
  gic: 2046
};

const FIELD_TYPE = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  VOID: 13,
  STRUCT: 14,
  LIST: 15
};
const GIT_GIC_LIST_LABELS = [
  "Creature List",
  "Door List",
  "Encounter List",
  "List",
  "Placeable List",
  "SoundList",
  "StoreList",
  "TriggerList",
  "WaypointList"
];

const options = parseArgs(process.argv.slice(2));
const areaResref = normalizeResref(options.area ?? AREA_RESREF);
const modulePath = resolveMaybeAbsolute(options.modulePath ?? findDefaultLastCityModulePath());
const conceptMapPath = resolveMaybeAbsolute(
  options.map ??
    "backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map.json"
);
const outputPath = resolveMaybeAbsolute(
  options.out ??
    "backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-audit.json"
);

const { readErfEntries, parseGff } = loadGeneratorReaders();
const moduleBytes = readFileSync(modulePath);
const erf = readErfEntries(moduleBytes, modulePath);
const targetGitEntry = findEntry(erf, areaResref, RESOURCE_TYPES.git);
const targetGicEntry = findEntry(erf, areaResref, RESOURCE_TYPES.gic);
const ifoEntry = findEntry(erf, "module", RESOURCE_TYPES.ifo);

if (!targetGitEntry) {
  throw new Error(`Missing ${areaResref}.git in ${modulePath}`);
}
if (!targetGicEntry) {
  throw new Error(`Missing ${areaResref}.gic in ${modulePath}`);
}
if (!ifoEntry) {
  throw new Error(`Missing module.ifo in ${modulePath}`);
}

const targetGit = parseGff(targetGitEntry.bytes, `${areaResref}.git`);
const targetGic = parseGff(targetGicEntry.bytes, `${areaResref}.gic`);
const moduleIfo = parseGff(ifoEntry.bytes, "module.ifo");
const viewportRiskPolicy = loadViewportRenderRiskPolicy(conceptMapPath);
const erfEntryOrder = auditErfEntryOrder(erf, areaResref);
const targetAudit = auditGit(areaResref, targetGit, viewportRiskPolicy);
const gitGicCardinality = auditGitGicListCardinality(areaResref, targetGit, targetGic);
const moduleInvariant = auditExistingModuleVisualTransformStaticInvariant(erf, areaResref, parseGff);
const moduleAreaEntry = auditModuleIfoAreaEntry(moduleIfo, areaResref);
const errors = [
  ...erfEntryOrder.errors,
  ...targetAudit.errors,
  ...gitGicCardinality.errors,
  ...moduleInvariant.errors,
  ...moduleAreaEntry.errors
];
const warnings = [
  ...erfEntryOrder.warnings,
  ...targetAudit.warnings,
  ...gitGicCardinality.warnings,
  ...moduleInvariant.warnings,
  ...moduleAreaEntry.warnings
];

const report = {
  version: "last-city-apartment-crash-risk-audit/v1",
  generatedAt: new Date().toISOString(),
  status: errors.length === 0 ? "passed" : "failed",
  modulePath,
  areaResref,
  checks: {
    erfEntryOrder: erfEntryOrder.summary,
    targetGit: targetAudit.summary,
    gitGicCardinality: gitGicCardinality.summary,
    moduleInvariant: moduleInvariant.summary,
    moduleIfoAreaEntry: moduleAreaEntry.summary
  },
  errors,
  warnings,
  safety: {
    launchesToolset: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    method: "offline ERF/GFF audit before Aurora Toolset launch"
  }
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      status: report.status,
      modulePath,
      areaResref,
      outputPath,
      erfEntryOrder: report.checks.erfEntryOrder,
      targetGit: report.checks.targetGit,
      gitGicCardinality: report.checks.gitGicCardinality,
      moduleInvariant: report.checks.moduleInvariant,
      moduleIfoAreaEntry: report.checks.moduleIfoAreaEntry,
      viewportRiskPolicy: report.checks.targetGit.viewportRenderRiskPolicy,
      errorCount: errors.length,
      warningCount: warnings.length
    },
    null,
    2
  )
);

if (errors.length > 0) {
  process.exitCode = 1;
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
      continue;
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function resolveMaybeAbsolute(value) {
  return resolve(repoRoot, value);
}

function normalizeResref(value) {
  return String(value ?? "").trim().toLowerCase();
}

function findDefaultLastCityModulePath() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  const modulesDir = join(home, "Documents", "Neverwinter Nights", "modules");
  const candidates = readdirSync(modulesDir)
    .filter(
      (name) =>
        name.startsWith("the_last_city") &&
        name.endsWith("codex.mod") &&
        !name.includes("pre-") &&
        !name.includes("vfx") &&
        !name.includes("new")
    )
    .sort();
  if (candidates.length === 0) {
    throw new Error(`Could not find active the_last_city codex module in ${modulesDir}`);
  }
  return join(modulesDir, candidates[0]);
}

function loadGeneratorReaders() {
  const generatorPath = resolve(scriptDir, "create-last-city-apartment-area.mjs");
  if (!existsSync(generatorPath)) {
    throw new Error(`Missing generator script: ${generatorPath}`);
  }
  const source = readFileSync(generatorPath, "utf8");
  return {
    readErfEntries: evaluateFunctionFromSource(source, "readErfEntries", "buildErfV10FromEntries"),
    parseGff: evaluateFunctionFromSource(source, "parseGff", "buildGff")
  };
}

function evaluateFunctionFromSource(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}`);
  const end = source.indexOf(`function ${nextFunctionName}`, start);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not extract ${functionName} from generator source.`);
  }
  // The generator already owns the ERF/GFF reader used to build the area.
  // Reusing it keeps this prelaunch gate aligned with the writer.
  return Function(
    "FIELD_TYPE",
    `${source.slice(start, end)}\nreturn ${functionName};`
  )(FIELD_TYPE);
}

function findEntry(erf, resref, type) {
  return erf.entries.find(
    (entry) => normalizeResref(entry.resref) === normalizeResref(resref) && entry.type === type
  );
}

function getField(struct, label) {
  return struct?.fields?.find((field) => field.label === label);
}

function auditErfEntryOrder(erf, area) {
  const errors = [];
  const warnings = [];
  const moduleIndices = [];
  const markerIndices = [];
  const areaEntries = [];
  for (let index = 0; index < erf.entries.length; index += 1) {
    const entry = erf.entries[index];
    if (normalizeResref(entry.resref) === "module" && entry.type === RESOURCE_TYPES.ifo) {
      moduleIndices.push(index);
    }
    if (normalizeResref(entry.resref) === "cdxmapflat01" && entry.type === 10) {
      markerIndices.push(index);
    }
    if (normalizeResref(entry.resref) === normalizeResref(area)) {
      areaEntries.push({ index, type: entry.type });
    }
  }

  const areaTypeOrder = areaEntries.map((entry) => entry.type);
  const expectedAreaTypeOrder = [2012, 2046, 2023];
  if (JSON.stringify(areaTypeOrder) !== JSON.stringify(expectedAreaTypeOrder)) {
    errors.push({
      kind: "area_resource_entry_order_unexpected",
      area,
      expectedAreaTypeOrder,
      actualAreaEntries: areaEntries
    });
  }
  if (moduleIndices.length !== 1) {
    errors.push({ kind: "module_ifo_entry_count_invalid", moduleIndices });
  }
  if (moduleIndices.length === 1 && areaEntries.length > 0 && moduleIndices[0] > areaEntries[0].index) {
    errors.push({
      kind: "module_ifo_entry_moved_after_generated_area",
      moduleIndex: moduleIndices[0],
      firstGeneratedAreaIndex: areaEntries[0].index
    });
  }
  if (markerIndices.length > 0) {
    errors.push({ kind: "generated_marker_resource_present_in_module", markerIndices });
  }

  return {
    summary: {
      moduleIndices,
      markerIndices,
      areaEntries,
      areaTypeOrder,
      expectedAreaTypeOrder
    },
    errors,
    warnings
  };
}

function auditGit(area, gff, viewportRiskPolicy) {
  const errors = [];
  const warnings = [];
  const placeableList = getField(gff.structs[0], "Placeable List")?.value ?? [];
  const unreachableStructs = findUnreachableStructs(gff);
  if (unreachableStructs.length > 0) {
    errors.push({
      kind: "unreachable_git_structs",
      area,
      count: unreachableStructs.length,
      sample: summarizeStructSamples(gff, unreachableStructs)
    });
  }

  for (let structIndex = 0; structIndex < gff.structs.length; structIndex += 1) {
    const struct = gff.structs[structIndex];
    for (const field of struct.fields ?? []) {
      if (field.typeId === FIELD_TYPE.STRUCT && !isValidStructIndex(gff, field.value)) {
        errors.push({ kind: "bad_struct_reference", area, structIndex, label: field.label, value: field.value });
      }
      if (field.typeId === FIELD_TYPE.LIST) {
        for (const value of field.value ?? []) {
          if (!isValidStructIndex(gff, value)) {
            errors.push({ kind: "bad_list_reference", area, structIndex, label: field.label, value });
          }
        }
      }
    }
  }

  let visualTransformCount = 0;
  let visualTransformOnStaticCount = 0;
  let itemListCount = 0;
  let nonVisualTransformListFieldCount = 0;
  let invalidVisualTransformCount = 0;
  let viewportRenderRiskCount = 0;
  const visualTransformStaticSamples = [];
  const nonVisualTransformListFieldSamples = [];
  const viewportRenderRiskSamples = [];

  for (let listIndex = 0; listIndex < placeableList.length; listIndex += 1) {
    const structIndex = placeableList[listIndex];
    const placeable = gff.structs[structIndex];
    const templateResRef = getField(placeable, "TemplateResRef")?.value ?? null;
    const tag = getField(placeable, "Tag")?.value ?? null;
    const z = Number(getField(placeable, "Z")?.value ?? 0);
    const hasVisualTransform =
      Boolean(getField(placeable, "VisTransformList")) || Boolean(getField(placeable, "VisualTransform"));

    const floorOverlayRisk = evaluateNonMotifFloorOverlayRisk({ templateResRef, tag }, viewportRiskPolicy);
    if (floorOverlayRisk) {
      viewportRenderRiskCount += 1;
      const sample = { listIndex, structIndex, templateResRef, tag, ...floorOverlayRisk };
      if (viewportRenderRiskSamples.length < 30) {
        viewportRenderRiskSamples.push(sample);
      }
      errors.push({ kind: "toolset_viewport_floor_overlay_risk", area, ...sample });
    }

    if (getField(placeable, "ItemList")) {
      itemListCount += 1;
      warnings.push({ kind: "placeable_item_list_present", area, listIndex, structIndex, templateResRef, tag });
    }

    for (const field of placeable.fields ?? []) {
      if (field.typeId === FIELD_TYPE.LIST && field.label !== "VisTransformList") {
        nonVisualTransformListFieldCount += 1;
        if (nonVisualTransformListFieldSamples.length < 10) {
          nonVisualTransformListFieldSamples.push({
            listIndex,
            structIndex,
            templateResRef,
            tag,
            label: field.label,
            count: Array.isArray(field.value) ? field.value.length : null
          });
        }
      }
    }

    if (!hasVisualTransform) {
      continue;
    }

    visualTransformCount += 1;
    if (getField(placeable, "Static")?.value) {
      visualTransformOnStaticCount += 1;
      const sample = { listIndex, structIndex, templateResRef, tag };
      if (visualTransformStaticSamples.length < 20) {
        visualTransformStaticSamples.push(sample);
      }
      errors.push({ kind: "visual_transform_on_static_placeable", area, ...sample });
    }

    const visualTransformFields = [
      getField(placeable, "VisTransformList"),
      getField(placeable, "VisualTransform")
    ].filter(Boolean);
    for (const field of visualTransformFields) {
      const transformStructIndices =
        field.typeId === FIELD_TYPE.LIST ? field.value ?? [] : field.typeId === FIELD_TYPE.STRUCT ? [field.value] : [];
      if (transformStructIndices.length === 0) {
        invalidVisualTransformCount += 1;
        errors.push({ kind: "visual_transform_empty_or_wrong_type", area, listIndex, structIndex, templateResRef, tag });
        continue;
      }
      for (const transformStructIndex of transformStructIndices) {
        const result = auditVisualTransformStruct(gff, transformStructIndex);
        if (!result.ok) {
          invalidVisualTransformCount += 1;
          errors.push({
            kind: "invalid_visual_transform_struct",
            area,
            listIndex,
            structIndex,
            templateResRef,
            tag,
            transformStructIndex,
            details: result.errors
          });
        }
      }
    }

    const visualTransform = summarizeVisualTransformFromFields(gff, visualTransformFields);
    const structuralVtRisk = evaluateStructuralVisualTransformRisk(
      { templateResRef, tag, z, visualTransform },
      viewportRiskPolicy
    );
    if (structuralVtRisk) {
      viewportRenderRiskCount += 1;
      const sample = { listIndex, structIndex, templateResRef, tag, z, visualTransform, ...structuralVtRisk };
      if (viewportRenderRiskSamples.length < 30) {
        viewportRenderRiskSamples.push(sample);
      }
      errors.push({ kind: "toolset_viewport_structural_visual_transform_risk", area, ...sample });
    }
  }

  return {
    summary: {
      structCount: gff.structs.length,
      placeableCount: placeableList.length,
      visualTransformCount,
      visualTransformOnStaticCount,
      itemListCount,
      nonVisualTransformListFieldCount,
      invalidVisualTransformCount,
      viewportRenderRiskCount,
      unreachableStructCount: unreachableStructs.length,
      unreachableStructSamples: summarizeStructSamples(gff, unreachableStructs),
      visualTransformStaticSamples,
      nonVisualTransformListFieldSamples,
      viewportRenderRiskSamples,
      viewportRenderRiskPolicy: {
        sourcePath: viewportRiskPolicy.sourcePath,
        nonMotifFloorOverlayTemplates: [...viewportRiskPolicy.nonMotifFloorOverlayTemplates],
        allowedStructuralFloorTags: viewportRiskPolicy.allowedStructuralFloorTags,
        structuralVisualTransformLimits: viewportRiskPolicy.structuralVisualTransformLimits
      }
    },
    errors,
    warnings
  };
}

function auditGitGicListCardinality(area, gitGff, gicGff) {
  const errors = [];
  const warnings = [];
  const listCounts = {};
  const unreachableGicStructs = findUnreachableStructs(gicGff);
  if (unreachableGicStructs.length > 0) {
    errors.push({
      kind: "unreachable_gic_structs",
      area,
      count: unreachableGicStructs.length,
      sample: summarizeStructSamples(gicGff, unreachableGicStructs)
    });
  }

  for (const label of GIT_GIC_LIST_LABELS) {
    const gitField = getField(gitGff.structs[0], label);
    const gicField = getField(gicGff.structs[0], label);
    const gitCount = gitField?.typeId === FIELD_TYPE.LIST ? (gitField.value ?? []).length : null;
    const gicCount = gicField?.typeId === FIELD_TYPE.LIST ? (gicField.value ?? []).length : null;
    listCounts[label] = { git: gitCount, gic: gicCount };

    if (gitCount === null) {
      errors.push({ kind: "git_list_missing_or_wrong_type", area, label, typeId: gitField?.typeId ?? null });
      continue;
    }
    if (gicCount === null) {
      errors.push({ kind: "gic_list_missing_or_wrong_type", area, label, typeId: gicField?.typeId ?? null });
      continue;
    }
    if (gitCount !== gicCount) {
      errors.push({ kind: "git_gic_list_count_mismatch", area, label, gitCount, gicCount });
    }
  }

  for (let structIndex = 0; structIndex < gicGff.structs.length; structIndex += 1) {
    const struct = gicGff.structs[structIndex];
    for (const field of struct.fields ?? []) {
      if (field.typeId === FIELD_TYPE.STRUCT && !isValidStructIndex(gicGff, field.value)) {
        errors.push({ kind: "bad_gic_struct_reference", area, structIndex, label: field.label, value: field.value });
      }
      if (field.typeId === FIELD_TYPE.LIST) {
        for (const value of field.value ?? []) {
          if (!isValidStructIndex(gicGff, value)) {
            errors.push({ kind: "bad_gic_list_reference", area, structIndex, label: field.label, value });
          }
        }
      }
    }
  }

  return {
    summary: {
      gitStructCount: gitGff.structs.length,
      gicStructCount: gicGff.structs.length,
      listCounts,
      unreachableGicStructCount: unreachableGicStructs.length,
      unreachableGicStructSamples: summarizeStructSamples(gicGff, unreachableGicStructs),
      mismatchCount: errors.filter((error) => error.kind === "git_gic_list_count_mismatch").length
    },
    errors,
    warnings
  };
}

function auditVisualTransformStruct(gff, structIndex) {
  const errors = [];
  if (!isValidStructIndex(gff, structIndex)) {
    return { ok: false, errors: [{ kind: "missing_transform_struct", structIndex }] };
  }
  const struct = gff.structs[structIndex];
  if (struct.typeId !== 6) {
    errors.push({ kind: "unexpected_transform_struct_type", structIndex, typeId: struct.typeId });
  }
  const requiredFields = [
    "Scope",
    "AnimationSpeed",
    "ScaleX",
    "ScaleY",
    "ScaleZ",
    "RotateX",
    "RotateY",
    "RotateZ",
    "TranslateX",
    "TranslateY",
    "TranslateZ"
  ];
  for (const label of requiredFields) {
    const field = getField(struct, label);
    if (!field) {
      errors.push({ kind: "missing_transform_field", structIndex, label });
      continue;
    }
    if (label !== "Scope" && field.typeId !== FIELD_TYPE.STRUCT) {
      errors.push({ kind: "transform_controller_not_struct", structIndex, label, typeId: field.typeId });
      continue;
    }
    if (label !== "Scope") {
      const controller = gff.structs[field.value];
      if (!controller) {
        errors.push({ kind: "missing_transform_controller", structIndex, label, controllerStructIndex: field.value });
        continue;
      }
      for (const controllerLabel of ["TimerType", "ValueTo", "LerpType"]) {
        if (!getField(controller, controllerLabel)) {
          errors.push({
            kind: "missing_transform_controller_field",
            structIndex,
            label,
            controllerStructIndex: field.value,
            controllerLabel
          });
        }
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function summarizeVisualTransformFromFields(gff, visualTransformFields) {
  const defaults = {
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0
  };
  const summary = { ...defaults };
  const labelToKey = {
    ScaleX: "scaleX",
    ScaleY: "scaleY",
    ScaleZ: "scaleZ",
    RotateX: "rotateX",
    RotateY: "rotateY",
    RotateZ: "rotateZ",
    TranslateX: "translateX",
    TranslateY: "translateY",
    TranslateZ: "translateZ"
  };
  for (const field of visualTransformFields) {
    const transformStructIndices =
      field.typeId === FIELD_TYPE.LIST ? field.value ?? [] : field.typeId === FIELD_TYPE.STRUCT ? [field.value] : [];
    for (const transformStructIndex of transformStructIndices) {
      const transformStruct = gff.structs[transformStructIndex];
      if (!transformStruct) {
        continue;
      }
      for (const [label, key] of Object.entries(labelToKey)) {
        const controllerField = getField(transformStruct, label);
        const value = readVisualTransformControllerValue(gff, controllerField);
        if (Number.isFinite(value)) {
          summary[key] = value;
        }
      }
    }
  }
  return Object.fromEntries(
    Object.entries(summary).map(([key, value]) => [key, Number(Number(value).toFixed(4))])
  );
}

function readVisualTransformControllerValue(gff, field) {
  if (!field) {
    return null;
  }
  if (field.typeId === FIELD_TYPE.FLOAT || field.typeId === FIELD_TYPE.INT || field.typeId === FIELD_TYPE.DWORD) {
    return Number(field.value);
  }
  if (field.typeId !== FIELD_TYPE.STRUCT || !isValidStructIndex(gff, field.value)) {
    return null;
  }
  const controller = gff.structs[field.value];
  const valueTo = getField(controller, "ValueTo");
  return Number(valueTo?.value);
}

function loadViewportRenderRiskPolicy(mapPath) {
  const fallback = {
    nonMotifFloorOverlayTemplates: ["q_148", "q_154", "zep_house001"],
    allowedStructuralFloorTags: ["concept_stone_spine"]
  };
  let riskControls = {};
  if (existsSync(mapPath)) {
    try {
      riskControls = JSON.parse(readFileSync(mapPath, "utf8")).riskControls ?? {};
    } catch {
      riskControls = {};
    }
  }
  const nonMotifFloorOverlayTemplates = new Set(
    (riskControls.nonMotifFloorOverlayTemplates ?? fallback.nonMotifFloorOverlayTemplates).map(normalizeResref)
  );
  const allowedStructuralFloorTags = (
    riskControls.allowedStructuralFloorTags ?? fallback.allowedStructuralFloorTags
  ).map(normalizeResref);
  return {
    sourcePath: mapPath,
    nonMotifFloorOverlayTemplates,
    allowedStructuralFloorTags,
    structuralVisualTransformLimits: {
      q_148: {
        reason: "tilemap41 repeated the Toolset access-violation pattern after q_148 stone-spine VT was raised above the last clean range",
        tagMustInclude: "concept_stone_spine",
        maxScaleX: 0.45,
        maxScaleY: 0.5,
        maxScaleZ: 0.45
      },
      witcher939: {
        reason: "tilemap41 repeated the Toolset access-violation pattern after low wall-panel VT was raised above the last clean range",
        maxPlacementZ: 0.06,
        maxScaleX: 1.42,
        maxScaleY: 1.4,
        maxScaleZ: 1.42
      }
    }
  };
}

function evaluateNonMotifFloorOverlayRisk(placeable, policy) {
  const template = normalizeResref(placeable.templateResRef);
  if (!policy.nonMotifFloorOverlayTemplates.has(template)) {
    return null;
  }
  const tag = normalizeResref(placeable.tag);
  if (policy.allowedStructuralFloorTags.some((allowedTag) => allowedTag && tag.includes(allowedTag))) {
    return null;
  }
  return {
    rule: "non_motif_floor_overlay_blocks_toolset_proof",
    reason:
      "tilemap15 repeatedly produced Toolset access violations with dense non-motif floor overlays; rebuild with real tile/placeable composition instead"
  };
}

function evaluateStructuralVisualTransformRisk(placeable, policy) {
  const template = normalizeResref(placeable.templateResRef);
  const limits = policy.structuralVisualTransformLimits[template];
  if (!limits) {
    return null;
  }
  const tag = normalizeResref(placeable.tag);
  if (limits.tagMustInclude && !tag.includes(normalizeResref(limits.tagMustInclude))) {
    return null;
  }
  if (Number.isFinite(limits.maxPlacementZ) && Number(placeable.z) > limits.maxPlacementZ) {
    return null;
  }
  const exceeded = [];
  for (const [key, limitKey] of [
    ["scaleX", "maxScaleX"],
    ["scaleY", "maxScaleY"],
    ["scaleZ", "maxScaleZ"]
  ]) {
    const value = Number(placeable.visualTransform?.[key]);
    const limit = Number(limits[limitKey]);
    if (Number.isFinite(value) && Number.isFinite(limit) && value > limit + 0.0001) {
      exceeded.push({ field: key, value, limit });
    }
  }
  if (exceeded.length === 0) {
    return null;
  }
  return {
    rule: "structural_visual_transform_above_last_clean_toolset_range",
    reason: limits.reason,
    exceeded
  };
}

function isValidStructIndex(gff, index) {
  return Number.isInteger(index) && index >= 0 && index < gff.structs.length;
}

function findUnreachableStructs(gff) {
  const reachable = new Set();
  const stack = [0];
  while (stack.length > 0) {
    const structIndex = stack.pop();
    if (!isValidStructIndex(gff, structIndex) || reachable.has(structIndex)) {
      continue;
    }
    reachable.add(structIndex);
    const struct = gff.structs[structIndex];
    for (const field of struct.fields ?? []) {
      if (field.typeId === FIELD_TYPE.STRUCT) {
        stack.push(field.value);
      } else if (field.typeId === FIELD_TYPE.LIST) {
        for (const value of field.value ?? []) {
          stack.push(value);
        }
      }
    }
  }

  const unreachable = [];
  for (let structIndex = 0; structIndex < gff.structs.length; structIndex += 1) {
    if (!reachable.has(structIndex)) {
      unreachable.push(structIndex);
    }
  }
  return unreachable;
}

function summarizeStructSamples(gff, structIndices, limit = 12) {
  return structIndices.slice(0, limit).map((structIndex) => ({
    structIndex,
    typeId: gff.structs[structIndex]?.typeId ?? null,
    fields: (gff.structs[structIndex]?.fields ?? []).slice(0, 10).map((field) => field.label)
  }));
}

function auditExistingModuleVisualTransformStaticInvariant(erf, targetArea, parseGff) {
  const errors = [];
  const warnings = [];
  let areasWithVisualTransforms = 0;
  let visualTransformCount = 0;
  let visualTransformOnStaticCount = 0;
  const staticSamples = [];

  for (const entry of erf.entries) {
    if (entry.type !== RESOURCE_TYPES.git) {
      continue;
    }
    const area = normalizeResref(entry.resref);
    if (area === normalizeResref(targetArea)) {
      continue;
    }
    let gff;
    try {
      gff = parseGff(entry.bytes, `${area}.git`);
    } catch (error) {
      warnings.push({ kind: "git_parse_failed_for_reference_area", area, message: error.message });
      continue;
    }
    const placeables = getField(gff.structs[0], "Placeable List")?.value ?? [];
    let areaVisualTransforms = 0;
    for (let listIndex = 0; listIndex < placeables.length; listIndex += 1) {
      const structIndex = placeables[listIndex];
      const placeable = gff.structs[structIndex];
      if (!getField(placeable, "VisTransformList") && !getField(placeable, "VisualTransform")) {
        continue;
      }
      areaVisualTransforms += 1;
      visualTransformCount += 1;
      if (getField(placeable, "Static")?.value) {
        visualTransformOnStaticCount += 1;
        const sample = {
          area,
          listIndex,
          structIndex,
          templateResRef: getField(placeable, "TemplateResRef")?.value ?? null,
          tag: getField(placeable, "Tag")?.value ?? null
        };
        if (staticSamples.length < 20) {
          staticSamples.push(sample);
        }
        errors.push({ kind: "reference_area_visual_transform_on_static_placeable", ...sample });
      }
    }
    if (areaVisualTransforms > 0) {
      areasWithVisualTransforms += 1;
    }
  }

  return {
    summary: {
      areasWithVisualTransforms,
      visualTransformCount,
      visualTransformOnStaticCount,
      staticSamples
    },
    errors,
    warnings
  };
}

function auditModuleIfoAreaEntry(moduleIfo, areaResref) {
  const errors = [];
  const warnings = [];
  const areaList = getField(moduleIfo.structs[0], "Mod_Area_list")?.value ?? [];
  const matchingIndices = [];
  const nonContiguousAreaStructs = [];
  for (let index = 0; index < areaList.length; index += 1) {
    const structIndex = areaList[index];
    if (structIndex !== index + 1) {
      nonContiguousAreaStructs.push({ index, structIndex, expectedStructIndex: index + 1 });
    }
    const areaName = normalizeResref(getField(moduleIfo.structs[structIndex], "Area_Name")?.value ?? "");
    if (areaName === normalizeResref(areaResref)) {
      matchingIndices.push(index);
    }
  }
  if (nonContiguousAreaStructs.length > 0) {
    errors.push({
      kind: "module_ifo_area_structs_not_contiguous",
      areaResref,
      count: nonContiguousAreaStructs.length,
      sample: nonContiguousAreaStructs.slice(0, 20)
    });
  }
  if (matchingIndices.length === 0) {
    errors.push({ kind: "module_ifo_area_entry_missing", areaResref });
  }
  if (matchingIndices.length > 1) {
    warnings.push({ kind: "module_ifo_area_entry_duplicate", areaResref, matchingIndices });
  }
  return {
    summary: {
      areaCount: areaList.length,
      matchingIndices,
      matched: matchingIndices.length === 1,
      areaStructContiguous: nonContiguousAreaStructs.length === 0,
      nonContiguousAreaStructSamples: nonContiguousAreaStructs.slice(0, 20)
    },
    errors,
    warnings
  };
}

#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node"
});
require("ts-node/register/transpile-only");

const {
  parseAreaObjectsFromGitGff
} = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");

const RESOURCE_TYPES = {
  git: 2023
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");
const defaultMapPath = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area",
  "concept-placeable-tile-map.json"
);
const defaultOutPath = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area",
  "concept-placeable-tile-map-check.json"
);

const options = parseArgs(process.argv.slice(2));
const mapPath = resolveMaybe(options.map ?? defaultMapPath);
const modulePath = resolveMaybe(
  options.modulePath ?? process.env.AURORA_LAST_CITY_CONCEPT_MAP_MODULE_PATH
);
const outPath = resolveMaybe(options.out ?? defaultOutPath);

if (!modulePath) {
  throw new Error("Missing --modulePath or AURORA_LAST_CITY_CONCEPT_MAP_MODULE_PATH.");
}
assertReadableFile(mapPath, "concept placeable tile map");
assertReadableFile(modulePath, "module");

const map = JSON.parse(readFileSync(mapPath, "utf8"));
const moduleBytes = readFileSync(modulePath);
const gitEntry = findEntry(readErfEntries(moduleBytes, modulePath), map.areaResref, RESOURCE_TYPES.git);
if (!gitEntry) {
  throw new Error(`Missing ${map.areaResref}.git in ${modulePath}.`);
}

const areaObjects = parseAreaObjectsFromGitGff(gitEntry.bytes, {
  areaResRef: map.areaResref
});
const areaObjectList = Array.isArray(areaObjects)
  ? areaObjects
  : areaObjects?.placeables ?? areaObjects?.objects ?? [];
const placeables = areaObjectList.filter((object) => object.listKind === "placeable");
const roleByTemplate = buildRoleByTemplate(map.globalCandidateFamilies);
const riskyTemplates = new Set((map.riskControls?.blockedMoodShortcuts ?? []).map(normalize));
const nonMotifFloorOverlayTemplates = new Set(
  (map.riskControls?.nonMotifFloorOverlayTemplates ?? []).map(normalize)
);
const allowedStructuralFloorTags = (map.riskControls?.allowedStructuralFloorTags ?? []).map(normalize);
const tileReports = map.tiles.map((tile) =>
  buildTileReport({
    tile,
    placeables: placeables.filter((placeable) => isInsideTile(placeable, tile)),
    roleByTemplate,
    riskyTemplates,
    nonMotifFloorOverlayTemplates
  })
);

const outsidePlaceables = placeables.filter(
  (placeable) => !map.tiles.some((tile) => isInsideTile(placeable, tile))
);
const errorCount = tileReports.reduce((sum, tile) => sum + tile.errorCount, 0);
const warningCount =
  tileReports.reduce((sum, tile) => sum + tile.warningCount, 0) +
  (outsidePlaceables.length > 0 ? 1 : 0);
const report = {
  version: "last-city-concept-placeable-map-check/v1",
  generatedAt: new Date().toISOString(),
  status: errorCount > 0 ? "failed" : warningCount > 0 ? "passed_with_warnings" : "passed",
  modulePath,
  mapPath,
  areaResref: map.areaResref,
  totalPlaceables: placeables.length,
  outsideTilePlaceableCount: outsidePlaceables.length,
  outsideTileSamples: outsidePlaceables.slice(0, 12).map(summarizePlaceable),
  tileCount: tileReports.length,
  errorCount,
  warningCount,
  tiles: tileReports
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outPath.replace(/\.json$/u, ".md"), renderMarkdown(report), "utf8");
writeFileSync(
  outPath.replace(/\.json$/u, ".svg"),
  renderSvg({ map, report, placeables, roleByTemplate, riskyTemplates, nonMotifFloorOverlayTemplates }),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      status: report.status,
      areaResref: report.areaResref,
      totalPlaceables: report.totalPlaceables,
      errorCount: report.errorCount,
      warningCount: report.warningCount,
      outPath,
      markdownPath: outPath.replace(/\.json$/u, ".md"),
      svgPath: outPath.replace(/\.json$/u, ".svg"),
      tiles: report.tiles.map((tile) => ({
        id: tile.id,
        conceptRole: tile.conceptRole,
        placeableCount: tile.placeableCount,
        budgetStatus: tile.budgetStatus,
        visualIntentStatus: tile.visualIntent?.status ?? "not_configured",
        missingHeroMotifs: tile.missingHeroMotifs,
        warningCount: tile.warningCount,
        errorCount: tile.errorCount
      }))
    },
    null,
    2
  )
);

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

function assertReadableFile(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildRoleByTemplate(families) {
  const roleByTemplate = new Map();
  for (const [role, templates] of Object.entries(families ?? {})) {
    for (const template of templates) {
      const key = normalize(template);
      if (key && !roleByTemplate.has(key)) {
        roleByTemplate.set(key, role);
      }
    }
  }
  return roleByTemplate;
}

function readErfEntries(bytes, sourcePath) {
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
  const entries = [];
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
    const dataOffset = bytes.readUInt32LE(resourceOffset);
    const size = bytes.readUInt32LE(resourceOffset + 4);
    entries.push({
      resref,
      type,
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size))
    });
  }
  return entries;
}

function findEntry(entries, resref, type) {
  const key = normalize(resref);
  return entries.find((entry) => entry.resref === key && entry.type === type);
}

function isInsideTile(placeable, tile) {
  const bounds = tile.worldBounds;
  return (
    Number(placeable.x) >= Number(bounds.minX) &&
    Number(placeable.x) < Number(bounds.maxX) &&
    Number(placeable.y) >= Number(bounds.minY) &&
    Number(placeable.y) < Number(bounds.maxY)
  );
}

function buildTileReport({ tile, placeables, roleByTemplate, riskyTemplates, nonMotifFloorOverlayTemplates }) {
  const roleCounts = {};
  const risky = [];
  const nonMotifFloorOverlays = [];
  let visualTransformCount = 0;
  let visualTransformOnStaticCount = 0;
  for (const placeable of placeables) {
    const template = normalize(placeable.templateResRef);
    const role = roleByTemplate.get(template) ?? "unmapped";
    roleCounts[role] = (roleCounts[role] ?? 0) + 1;
    if (riskyTemplates.has(template)) {
      risky.push(summarizePlaceable(placeable));
    }
    if (nonMotifFloorOverlayTemplates.has(template) && !isAllowedStructuralFloorMotif(placeable)) {
      nonMotifFloorOverlays.push(summarizePlaceable(placeable));
    }
    if (hasNonDefaultVisualTransform(placeable.visualTransform)) {
      visualTransformCount += 1;
      if (placeable.isStatic) {
        visualTransformOnStaticCount += 1;
      }
    }
  }

  const motifReports = (tile.requiredMotifs ?? []).map((motif) => {
    const templates = new Set((motif.templates ?? []).map(normalize));
    const matched = placeables.filter((placeable) => templates.has(normalize(placeable.templateResRef)));
    const min = Number(motif.count?.min ?? 0);
    const target = Number(motif.count?.target ?? min);
    return {
      motif: motif.motif,
      role: motif.role,
      priority: motif.priority,
      min,
      target,
      count: matched.length,
      status: matched.length >= min ? "ok" : "missing",
      samples: matched.slice(0, 6).map(summarizePlaceable)
    };
  });
  const visualIntent = buildVisualIntentReport({ tile, placeables, roleByTemplate });

  const budget = tile.densityBudget ?? {};
  const budgetStatus =
    placeables.length < Number(budget.min ?? 0)
      ? "under"
      : placeables.length > Number(budget.max ?? Number.POSITIVE_INFINITY)
        ? "over"
        : "ok";
  const missingHeroMotifs = motifReports
    .filter((motif) => motif.priority === "hero" && motif.status !== "ok")
    .map((motif) => motif.motif);
  const missingSupportMotifs = motifReports
    .filter((motif) => motif.priority !== "hero" && motif.status !== "ok")
    .map((motif) => motif.motif);
  const errors = [];
  const warnings = [];
  if (missingHeroMotifs.length > 0) {
    errors.push(`missing hero motifs: ${missingHeroMotifs.join(", ")}`);
  }
  if (visualTransformOnStaticCount > 0) {
    errors.push(`VisualTransform on Static placeables: ${visualTransformOnStaticCount}`);
  }
  if (budgetStatus !== "ok") {
    warnings.push(`density budget ${budgetStatus}: ${placeables.length}`);
  }
  if (missingSupportMotifs.length > 0) {
    warnings.push(`missing support/accent motifs: ${missingSupportMotifs.join(", ")}`);
  }
  if (risky.length > 0) {
    warnings.push(`risky mood overlay templates present: ${risky.length}`);
  }
  if (nonMotifFloorOverlays.length > 0) {
    warnings.push(`non-motif floor overlay templates present: ${nonMotifFloorOverlays.length}`);
  }
  for (const blockedGrowth of visualIntent.blockedVisualTransformGrowth ?? []) {
    if (blockedGrowth.status === "blocked") {
      errors.push(
        `blocked visual-intent VT growth ${blockedGrowth.ruleId}: ${blockedGrowth.exceededCount} placeable(s)`
      );
    }
  }
  for (const blockedDirection of visualIntent.blockedDirections ?? []) {
    if (blockedDirection.status === "blocked") {
      errors.push(`blocked visual-intent direction ${blockedDirection.ruleId}: ${blockedDirection.matchedCount} placeable(s)`);
    }
  }
  for (const target of visualIntent.targetSubcells ?? []) {
    if (target.gate === "required" && target.status !== "ok") {
      warnings.push(
        `visual intent target ${target.subcell} weak: ${target.desiredRoleCount}/${target.minDesiredRoleCount} desired-role placeable(s)`
      );
    }
  }

  return {
    id: tile.id,
    conceptRole: tile.conceptRole,
    primaryRead: tile.primaryRead,
    bounds: tile.worldBounds,
    budget,
    placeableCount: placeables.length,
    budgetStatus,
    roleCounts,
    visualTransformCount,
    visualTransformOnStaticCount,
    riskyTemplateCount: risky.length,
    riskyTemplateSamples: risky.slice(0, 12),
    nonMotifFloorOverlayCount: nonMotifFloorOverlays.length,
    nonMotifFloorOverlaySamples: nonMotifFloorOverlays.slice(0, 12),
    motifReports,
    visualIntent,
    missingHeroMotifs,
    missingSupportMotifs,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    samplePlaceables: placeables.slice(0, 12).map((placeable) => summarizePlaceable(placeable, roleByTemplate)),
    adjustmentCandidates: buildAdjustmentCandidates({
      tile,
      placeables,
      roleByTemplate,
      riskyTemplates,
      nonMotifFloorOverlayTemplates
    })
  };
}

function buildVisualIntentReport({ tile, placeables, roleByTemplate }) {
  const intent = tile.visualIntent ?? null;
  if (!intent) {
    return {
      status: "not_configured",
      targetSubcells: [],
      blockedVisualTransformGrowth: [],
      blockedDirections: []
    };
  }

  const targetSubcells = (intent.targetSubcells ?? []).map((target) => {
    const bounds = resolveVisualIntentBounds(tile, target);
    const desiredRoles = new Set((target.desiredRoles ?? []).map(normalize));
    const matched = placeables.filter((placeable) => isInsideBounds(placeable, bounds));
    const desiredMatched =
      desiredRoles.size > 0
        ? matched.filter((placeable) => desiredRoles.has(normalize(roleForPlaceable(placeable, roleByTemplate))))
        : matched;
    const gate = target.gate ?? "advisory";
    const minDesiredRoleCount = Number(target.minDesiredRoleCount ?? 0);
    const status = gate === "required" && desiredMatched.length < minDesiredRoleCount ? "weak" : "ok";
    return {
      subcell: target.subcell ?? buildSubcellId(tile.id, target),
      zone: target.zone ?? zoneFromCell(target),
      goal: target.goal ?? null,
      gate,
      bounds: roundBounds(bounds),
      desiredRoles: Array.from(desiredRoles),
      minDesiredRoleCount,
      matchedCount: matched.length,
      desiredRoleCount: desiredMatched.length,
      status,
      samples: desiredMatched.slice(0, 8).map((placeable) => summarizePlaceableWithVt(placeable, roleByTemplate))
    };
  });

  const blockedVisualTransformGrowth = (intent.blockedVisualTransformGrowth ?? []).map((rule, index) => {
    const matched = placeables.filter((placeable) => matchesVisualIntentRule(placeable, rule));
    const exceeded = matched.filter((placeable) => exceedsVisualTransformRule(placeable.visualTransform, rule));
    return {
      ruleId: rule.id ?? `visual-intent-vt-growth-${index + 1}`,
      blockedBy: rule.blockedBy ?? null,
      reason: rule.reason ?? null,
      tagContains: rule.tagContains ?? null,
      templateResRef: rule.templateResRef ?? null,
      maxScaleX: rule.maxScaleX ?? null,
      maxScaleY: rule.maxScaleY ?? null,
      maxScaleZ: rule.maxScaleZ ?? null,
      minScaleX: rule.minScaleX ?? null,
      minScaleY: rule.minScaleY ?? null,
      minScaleZ: rule.minScaleZ ?? null,
      matchedCount: matched.length,
      exceededCount: exceeded.length,
      status: exceeded.length > 0 ? "blocked" : "ok",
      samples: exceeded.slice(0, 8).map((placeable) => summarizePlaceableWithVt(placeable, roleByTemplate))
    };
  });

  const blockedDirections = (intent.blockedDirections ?? []).map((rule, index) =>
    buildBlockedDirectionReport({ tile, placeables, roleByTemplate, rule, index })
  );

  const blockedCount =
    blockedVisualTransformGrowth.filter((rule) => rule.status === "blocked").length +
    blockedDirections.filter((rule) => rule.status === "blocked").length;
  const weakTargetCount = targetSubcells.filter((target) => target.gate === "required" && target.status !== "ok").length;
  return {
    status: blockedCount > 0 ? "blocked" : weakTargetCount > 0 ? "weak" : "ok",
    source: intent.source ?? null,
    reading: intent.reading ?? null,
    nextChangePolicy: intent.nextChangePolicy ?? null,
    targetSubcells,
    blockedVisualTransformGrowth,
    blockedDirections
  };
}

function buildBlockedDirectionReport({ tile, placeables, roleByTemplate, rule, index }) {
  const matched = placeables.filter((placeable) => matchesBlockedDirectionRule({ tile, placeable, roleByTemplate, rule }));
  const hasSelector =
    toArray(rule.tagContains).length > 0 ||
    toArray(rule.templateResRef).length > 0 ||
    toArray(rule.role).length > 0 ||
    rule.row !== undefined ||
    rule.col !== undefined ||
    rule.zone !== undefined ||
    rule.bounds !== undefined ||
    rule.minZ !== undefined ||
    rule.maxZ !== undefined;
  const maxCount = rule.maxCount === undefined || rule.maxCount === null ? null : Number(rule.maxCount);
  const blocked =
    hasSelector &&
    matched.length > 0 &&
    (rule.blockIfPresent === true || (Number.isFinite(maxCount) && matched.length > maxCount));
  return {
    ruleId: rule.id ?? `visual-intent-blocked-direction-${index + 1}`,
    class: rule.class ?? null,
    result: rule.result ?? null,
    blockedBy: rule.blockedBy ?? rule.id ?? null,
    reason: rule.lesson ?? rule.reason ?? null,
    tagContains: rule.tagContains ?? null,
    templateResRef: rule.templateResRef ?? null,
    role: rule.role ?? null,
    zone: rule.zone ?? null,
    row: rule.row ?? null,
    col: rule.col ?? null,
    requiresVisualTransform: Boolean(rule.requiresVisualTransform),
    minZ: rule.minZ ?? null,
    maxZ: rule.maxZ ?? null,
    maxCount,
    blockIfPresent: Boolean(rule.blockIfPresent),
    matchedCount: matched.length,
    status: !hasSelector ? "recorded" : blocked ? "blocked" : "ok",
    samples: matched.slice(0, 8).map((placeable) => summarizePlaceableWithVt(placeable, roleByTemplate))
  };
}

function roleForPlaceable(placeable, roleByTemplate) {
  return roleByTemplate.get(normalize(placeable.templateResRef)) ?? "unmapped";
}

function matchesBlockedDirectionRule({ tile, placeable, roleByTemplate, rule }) {
  if (rule.bounds && !isInsideBounds(placeable, rule.bounds)) {
    return false;
  }
  if (!rule.bounds && (rule.row !== undefined || rule.col !== undefined || rule.zone !== undefined)) {
    const bounds = resolveVisualIntentBounds(tile, rule);
    if (!isInsideBounds(placeable, bounds)) {
      return false;
    }
  }
  const tag = normalize(placeable.tag);
  const template = normalize(placeable.templateResRef);
  const role = normalize(roleForPlaceable(placeable, roleByTemplate));
  const tagNeedles = toArray(rule.tagContains).map(normalize).filter(Boolean);
  const templateNeedles = toArray(rule.templateResRef).map(normalize).filter(Boolean);
  const roleNeedles = toArray(rule.role).map(normalize).filter(Boolean);
  if (rule.requiresVisualTransform === true && !hasNonDefaultVisualTransform(placeable.visualTransform)) {
    return false;
  }
  if (rule.minZ !== undefined && Number(placeable.z ?? 0) < Number(rule.minZ)) {
    return false;
  }
  if (rule.maxZ !== undefined && Number(placeable.z ?? 0) > Number(rule.maxZ)) {
    return false;
  }
  if (tagNeedles.length > 0 && !tagNeedles.some((needle) => tag.includes(needle))) {
    return false;
  }
  if (templateNeedles.length > 0 && !templateNeedles.some((needle) => template === needle)) {
    return false;
  }
  if (roleNeedles.length > 0 && !roleNeedles.some((needle) => role === needle)) {
    return false;
  }
  return true;
}

function matchesVisualIntentRule(placeable, rule) {
  const tag = normalize(placeable.tag);
  const template = normalize(placeable.templateResRef);
  const tagNeedles = toArray(rule.tagContains).map(normalize).filter(Boolean);
  const templateNeedles = toArray(rule.templateResRef).map(normalize).filter(Boolean);
  const tagMatches = tagNeedles.length === 0 || tagNeedles.some((needle) => tag.includes(needle));
  const templateMatches = templateNeedles.length === 0 || templateNeedles.some((needle) => template === needle);
  return tagMatches && templateMatches;
}

function exceedsVisualTransformRule(visualTransform, rule) {
  if (!visualTransform) {
    return false;
  }
  const scaleFields = [
    ["scaleX", "maxScaleX", "minScaleX"],
    ["scaleY", "maxScaleY", "minScaleY"],
    ["scaleZ", "maxScaleZ", "minScaleZ"]
  ];
  return scaleFields.some(([field, maxField, minField]) => {
    const value = Number(visualTransform[field] ?? 1);
    if (rule[maxField] !== undefined && rule[maxField] !== null) {
      if (value > Number(rule[maxField]) + 0.0001) {
        return true;
      }
    }
    if (rule[minField] !== undefined && rule[minField] !== null) {
      if (value < Number(rule[minField]) - 0.0001) {
        return true;
      }
    }
    return false;
  });
}

function resolveVisualIntentBounds(tile, target) {
  if (target.bounds) {
    return target.bounds;
  }
  const cell = cellFromTarget(target);
  const bounds = tile.worldBounds ?? {};
  const minX = Number(bounds.minX ?? 0);
  const maxX = Number(bounds.maxX ?? minX + 1);
  const minY = Number(bounds.minY ?? 0);
  const maxY = Number(bounds.maxY ?? minY + 1);
  const width = (maxX - minX) / 3;
  const height = (maxY - minY) / 3;
  return {
    minX: minX + cell.col * width,
    maxX: minX + (cell.col + 1) * width,
    minY: maxY - (cell.row + 1) * height,
    maxY: maxY - cell.row * height
  };
}

function cellFromTarget(target) {
  if (Number.isFinite(Number(target.row)) && Number.isFinite(Number(target.col))) {
    return {
      row: clampCell(Number(target.row)),
      col: clampCell(Number(target.col))
    };
  }
  return zoneToCell(target.zone);
}

function zoneToCell(zone) {
  const [vertical = "middle", horizontal = "center"] = String(zone ?? "middle-center").split("-");
  const rowByVertical = {
    north: 0,
    middle: 1,
    center: 1,
    south: 2
  };
  const colByHorizontal = {
    west: 0,
    middle: 1,
    center: 1,
    east: 2
  };
  return {
    row: rowByVertical[vertical] ?? 1,
    col: colByHorizontal[horizontal] ?? 1
  };
}

function zoneFromCell(target) {
  const cell = cellFromTarget(target);
  const vertical = ["north", "middle", "south"][cell.row] ?? "middle";
  const horizontal = ["west", "center", "east"][cell.col] ?? "center";
  return `${vertical}-${horizontal}`;
}

function buildSubcellId(tileId, target) {
  const cell = cellFromTarget(target);
  return `${tileId}_r${cell.row}c${cell.col}`;
}

function isInsideBounds(placeable, bounds) {
  return (
    Number(placeable.x) >= Number(bounds.minX) &&
    Number(placeable.x) < Number(bounds.maxX) &&
    Number(placeable.y) >= Number(bounds.minY) &&
    Number(placeable.y) < Number(bounds.maxY)
  );
}

function roundBounds(bounds) {
  return {
    minX: round2(bounds.minX),
    maxX: round2(bounds.maxX),
    minY: round2(bounds.minY),
    maxY: round2(bounds.maxY)
  };
}

function clampCell(value) {
  return Math.max(0, Math.min(2, Math.trunc(Number(value))));
}

function summarizePlaceableWithVt(placeable, roleByTemplate = null) {
  return {
    ...summarizePlaceable(placeable, roleByTemplate),
    visualTransformValues: summarizeVisualTransform(placeable.visualTransform)
  };
}

function summarizeVisualTransform(visualTransform) {
  if (!visualTransform) {
    return null;
  }
  return {
    scaleX: round2(visualTransform.scaleX ?? 1),
    scaleY: round2(visualTransform.scaleY ?? 1),
    scaleZ: round2(visualTransform.scaleZ ?? 1),
    rotateX: round2(visualTransform.rotateX ?? 0),
    rotateY: round2(visualTransform.rotateY ?? 0),
    rotateZ: round2(visualTransform.rotateZ ?? 0),
    translateX: round2(visualTransform.translateX ?? 0),
    translateY: round2(visualTransform.translateY ?? 0),
    translateZ: round2(visualTransform.translateZ ?? 0)
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function hasNonDefaultVisualTransform(visualTransform) {
  if (!visualTransform) {
    return false;
  }
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
  return Object.entries(defaults).some(
    ([key, defaultValue]) => Math.abs(Number(visualTransform[key] ?? defaultValue) - defaultValue) > 0.0001
  );
}

function summarizePlaceable(placeable, roleByTemplate = null) {
  const template = normalize(placeable.templateResRef);
  const role = typeof roleByTemplate?.get === "function" ? roleByTemplate.get(template) : null;
  return {
    templateResRef: placeable.templateResRef,
    ...(role ? { role } : {}),
    tag: placeable.tag,
    x: round2(placeable.x),
    y: round2(placeable.y),
    z: round2(placeable.z),
    bearing: round2(placeable.bearing),
    visualTransform: hasNonDefaultVisualTransform(placeable.visualTransform),
    isStatic: Boolean(placeable.isStatic)
  };
}

function buildAdjustmentCandidates({ tile, placeables, roleByTemplate, riskyTemplates, nonMotifFloorOverlayTemplates }) {
  return placeables
    .map((placeable) => {
      const template = normalize(placeable.templateResRef);
      const role = roleByTemplate.get(template) ?? "unmapped";
      const hasVisualTransform = hasNonDefaultVisualTransform(placeable.visualTransform);
      const isRisky = riskyTemplates.has(template);
      const isFloorOverlay =
        nonMotifFloorOverlayTemplates.has(template) && !isAllowedStructuralFloorMotif(placeable);
      const score = scoreAdjustmentCandidate({ role, hasVisualTransform, isRisky, isFloorOverlay, placeable });
      return {
        ...summarizePlaceable(placeable, roleByTemplate),
        role,
        zone: zoneForPlaceable(tile, placeable),
        score,
        safeUse: safeAdjustmentUse({ role, hasVisualTransform, isRisky, isFloorOverlay, placeable })
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 24);
}

function scoreAdjustmentCandidate({ role, hasVisualTransform, isRisky, isFloorOverlay, placeable }) {
  const baseByRole = {
    storage_containers: 8,
    structural_windows_walls: 7,
    textiles_rugs: 7,
    sleep_private: 6,
    tables_seating: 6,
    tools_port_work: 5,
    maps_books_papers: 4,
    lighting_fire: 3,
    structural_floor_spine: 2,
    plants_vases: 2,
    unmapped: 1
  };
  let score = baseByRole[role] ?? 1;
  if (hasVisualTransform) {
    score += 0.5;
  }
  if (placeable.isStatic) {
    score -= 1.5;
  }
  if (isRisky) {
    score -= 6;
  }
  if (isFloorOverlay) {
    score -= 5;
  }
  return round2(score);
}

function safeAdjustmentUse({ role, hasVisualTransform, isRisky, isFloorOverlay, placeable }) {
  if (isRisky || isFloorOverlay) {
    return "avoid_for_next_pass";
  }
  if (placeable.isStatic && hasVisualTransform) {
    return "blocked_static_visual_transform";
  }
  if (["storage_containers", "structural_windows_walls", "textiles_rugs"].includes(role)) {
    return hasVisualTransform ? "move_existing_keep_vt" : "move_or_duplicate_without_new_vt";
  }
  if (["sleep_private", "tables_seating", "tools_port_work"].includes(role)) {
    return "move_bearing_or_cluster";
  }
  if (role === "lighting_fire") {
    return "use_only_for_local_light_not_dark_mass";
  }
  return "low_priority_support_only";
}

function zoneForPlaceable(tile, placeable) {
  const bounds = tile.worldBounds ?? {};
  const minX = Number(bounds.minX ?? 0);
  const maxX = Number(bounds.maxX ?? minX + 1);
  const minY = Number(bounds.minY ?? 0);
  const maxY = Number(bounds.maxY ?? minY + 1);
  const xRatio = clamp01((Number(placeable.x) - minX) / Math.max(0.001, maxX - minX));
  const yRatio = clamp01((Number(placeable.y) - minY) / Math.max(0.001, maxY - minY));
  const horizontal = xRatio < 0.33 ? "west" : xRatio > 0.67 ? "east" : "center";
  const vertical = yRatio < 0.33 ? "south" : yRatio > 0.67 ? "north" : "middle";
  return `${vertical}-${horizontal}`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

function round2(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : value;
}

function renderMarkdown(report) {
  const lines = [
    "# Concept Placeable Tile Map Check",
    "",
    `Status: \`${report.status}\``,
    "",
    `Module: \`${report.modulePath}\``,
    "",
    `Area: \`${report.areaResref}\``,
    "",
    `Total placeables: ${report.totalPlaceables}`,
    "",
    `Errors: ${report.errorCount}`,
    "",
    `Warnings: ${report.warningCount}`,
    "",
    "| Tile | Role | Count | Budget | Visual intent | Missing hero | Warnings |",
    "| --- | --- | ---: | --- | --- | --- | --- |"
  ];
  for (const tile of report.tiles) {
    lines.push(
      `| \`${tile.id}\` | ${tile.conceptRole} | ${tile.placeableCount} | ${tile.budgetStatus} | ${tile.visualIntent?.status ?? "not_configured"} | ${tile.missingHeroMotifs.join(", ") || "-"} | ${tile.warnings.join("; ") || "-"} |`
    );
  }
  lines.push("");
  for (const tile of report.tiles) {
    lines.push(`## ${tile.id} - ${tile.conceptRole}`);
    lines.push("");
    lines.push(tile.primaryRead);
    lines.push("");
    lines.push(
      `Placeables: ${tile.placeableCount}; VT: ${tile.visualTransformCount}; risky templates: ${tile.riskyTemplateCount}; non-motif floor overlays: ${tile.nonMotifFloorOverlayCount}`
    );
    lines.push("");
    lines.push("| Motif | Priority | Count | Min | Target | Status |");
    lines.push("| --- | --- | ---: | ---: | ---: | --- |");
    for (const motif of tile.motifReports) {
      lines.push(
        `| ${motif.motif} | ${motif.priority} | ${motif.count} | ${motif.min} | ${motif.target} | ${motif.status} |`
      );
    }
    lines.push("");
    if (tile.visualIntent?.status && tile.visualIntent.status !== "not_configured") {
      lines.push("Visual intent:");
      lines.push("");
      lines.push(`Status: \`${tile.visualIntent.status}\``);
      if (tile.visualIntent.reading) {
        lines.push("");
        lines.push(tile.visualIntent.reading);
      }
      if (tile.visualIntent.targetSubcells.length > 0) {
        lines.push("");
        lines.push("| Subcell | Zone | Gate | Desired roles | Desired count | Status | Goal |");
        lines.push("| --- | --- | --- | --- | ---: | --- | --- |");
        for (const target of tile.visualIntent.targetSubcells) {
          lines.push(
            `| \`${target.subcell}\` | ${target.zone} | ${target.gate} | ${target.desiredRoles.join(", ") || "-"} | ${target.desiredRoleCount}/${target.minDesiredRoleCount} | ${target.status} | ${target.goal ?? "-"} |`
          );
        }
      }
      if (tile.visualIntent.blockedVisualTransformGrowth.length > 0) {
        lines.push("");
        lines.push("| Blocked VT rule | Blocked by | Matched | Exceeded | Status | Reason |");
        lines.push("| --- | --- | ---: | ---: | --- | --- |");
        for (const rule of tile.visualIntent.blockedVisualTransformGrowth) {
          lines.push(
            `| \`${rule.ruleId}\` | ${rule.blockedBy ?? "-"} | ${rule.matchedCount} | ${rule.exceededCount} | ${rule.status} | ${rule.reason ?? "-"} |`
          );
        }
      }
      if (tile.visualIntent.blockedDirections.length > 0) {
        lines.push("");
        lines.push("| Blocked direction | Class | Zone | Matched | Status | Reason |");
        lines.push("| --- | --- | --- | ---: | --- | --- |");
        for (const rule of tile.visualIntent.blockedDirections) {
          lines.push(
            `| \`${rule.ruleId}\` | ${rule.class ?? "-"} | ${rule.zone ?? "-"} | ${rule.matchedCount} | ${rule.status} | ${rule.reason ?? "-"} |`
          );
        }
      }
      lines.push("");
    }
    lines.push("Top safe adjustment candidates:");
    lines.push("");
    lines.push("| Template | Tag | Role | Zone | VT | Static | Safe use | Score |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | ---: |");
    for (const candidate of tile.adjustmentCandidates.slice(0, 8)) {
      lines.push(
        `| \`${candidate.templateResRef}\` | \`${candidate.tag}\` | ${candidate.role} | ${candidate.zone} | ${candidate.visualTransform} | ${candidate.isStatic} | ${candidate.safeUse} | ${candidate.score} |`
      );
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function renderSvg({ map, report, placeables, roleByTemplate, riskyTemplates, nonMotifFloorOverlayTemplates }) {
  const width = 1060;
  const height = 760;
  const margin = { left: 72, top: 86, right: 310, bottom: 72 };
  const gridWidth = width - margin.left - margin.right;
  const gridHeight = height - margin.top - margin.bottom;
  const world = {
    minX: Math.min(...map.tiles.map((tile) => Number(tile.worldBounds.minX))),
    maxX: Math.max(...map.tiles.map((tile) => Number(tile.worldBounds.maxX))),
    minY: Math.min(...map.tiles.map((tile) => Number(tile.worldBounds.minY))),
    maxY: Math.max(...map.tiles.map((tile) => Number(tile.worldBounds.maxY)))
  };
  const roleColors = {
    maps_books_papers: "#2f74b5",
    tables_seating: "#8d5a2b",
    lighting_fire: "#d9822b",
    textiles_rugs: "#b63f5d",
    sleep_private: "#6f58a8",
    storage_containers: "#6f7d32",
    tools_port_work: "#227b78",
    plants_vases: "#3c8d40",
    structural_windows_walls: "#444444",
    unmapped: "#a6a6a6"
  };
  const roleLabels = {
    maps_books_papers: "maps/books/papers",
    tables_seating: "tables/seating",
    lighting_fire: "warm light",
    textiles_rugs: "rugs/textiles",
    sleep_private: "bed/private",
    storage_containers: "storage",
    tools_port_work: "port tools",
    plants_vases: "plants",
    structural_windows_walls: "walls/windows",
    unmapped: "unmapped"
  };
  const usedRoles = new Set();
  const pointRows = [];
  for (const placeable of placeables) {
    const template = normalize(placeable.templateResRef);
    const role = roleByTemplate.get(template) ?? "unmapped";
    usedRoles.add(role);
    const x = margin.left + ((Number(placeable.x) - world.minX) / (world.maxX - world.minX)) * gridWidth;
    const y =
      margin.top +
      ((world.maxY - Number(placeable.y)) / (world.maxY - world.minY)) * gridHeight;
    const isRisky = riskyTemplates.has(template);
    const isFloorOverlay =
      nonMotifFloorOverlayTemplates.has(template) && !isAllowedStructuralFloorMotif(placeable);
    const hasVt = hasNonDefaultVisualTransform(placeable.visualTransform);
    const radius = isRisky || isFloorOverlay ? 5.2 : hasVt ? 4.4 : 3.6;
    const stroke = isRisky ? "#c21f1f" : isFloorOverlay ? "#111111" : hasVt ? "#f6f0d0" : "#ffffff";
    const strokeWidth = isRisky || isFloorOverlay ? 2.4 : hasVt ? 1.8 : 0.8;
    pointRows.push(
      `<circle cx="${roundSvg(x)}" cy="${roundSvg(y)}" r="${radius}" fill="${roleColors[role] ?? roleColors.unmapped}" stroke="${stroke}" stroke-width="${strokeWidth}"><title>${escapeXml(`${placeable.templateResRef} | ${placeable.tag} | ${round2(placeable.x)},${round2(placeable.y)}`)}</title></circle>`
    );
  }

  const intentRows = [];
  for (const tile of map.tiles) {
    for (const target of tile.visualIntent?.targetSubcells ?? []) {
      const bounds = resolveVisualIntentBounds(tile, target);
      const x = margin.left + ((Number(bounds.minX) - world.minX) / (world.maxX - world.minX)) * gridWidth;
      const y =
        margin.top +
        ((world.maxY - Number(bounds.maxY)) / (world.maxY - world.minY)) * gridHeight;
      const w = ((Number(bounds.maxX) - Number(bounds.minX)) / (world.maxX - world.minX)) * gridWidth;
      const h = ((Number(bounds.maxY) - Number(bounds.minY)) / (world.maxY - world.minY)) * gridHeight;
      intentRows.push(
        `<rect x="${roundSvg(x)}" y="${roundSvg(y)}" width="${roundSvg(w)}" height="${roundSvg(h)}" class="intent-cell"><title>${escapeXml(`${target.subcell ?? buildSubcellId(tile.id, target)} | ${target.goal ?? "visual intent target"}`)}</title></rect>`
      );
    }
  }

  const tileRows = [];
  for (const tile of map.tiles) {
    const bounds = tile.worldBounds;
    const x = margin.left + ((Number(bounds.minX) - world.minX) / (world.maxX - world.minX)) * gridWidth;
    const y =
      margin.top +
      ((world.maxY - Number(bounds.maxY)) / (world.maxY - world.minY)) * gridHeight;
    const w = ((Number(bounds.maxX) - Number(bounds.minX)) / (world.maxX - world.minX)) * gridWidth;
    const h = ((Number(bounds.maxY) - Number(bounds.minY)) / (world.maxY - world.minY)) * gridHeight;
    const tileReport = report.tiles.find((candidate) => candidate.id === tile.id);
    const statusColor =
      tileReport?.errorCount > 0 ? "#c21f1f" : tileReport?.warningCount > 0 ? "#c77700" : "#2f7d32";
    tileRows.push(
      [
        `<rect x="${roundSvg(x)}" y="${roundSvg(y)}" width="${roundSvg(w)}" height="${roundSvg(h)}" fill="none" stroke="#252525" stroke-width="1.4"/>`,
        `<text x="${roundSvg(x + 10)}" y="${roundSvg(y + 22)}" class="tile-id">${escapeXml(tile.id)} - ${escapeXml(tile.conceptRole)}</text>`,
        `<text x="${roundSvg(x + 10)}" y="${roundSvg(y + 41)}" class="tile-note" fill="${statusColor}">${tileReport?.placeableCount ?? 0} plc / ${escapeXml(tileReport?.budgetStatus ?? "unknown")}</text>`
      ].join("\n")
    );
  }

  const legendRows = Array.from(usedRoles)
    .sort()
    .map((role, index) => {
      const y = margin.top + 44 + index * 24;
      return `<circle cx="${width - margin.right + 34}" cy="${y}" r="6" fill="${roleColors[role] ?? roleColors.unmapped}" stroke="#ffffff" stroke-width="1"/><text x="${width - margin.right + 48}" y="${y + 4}" class="legend">${escapeXml(roleLabels[role] ?? role)}</text>`;
    });
  const summaryRows = [
    `Status: ${report.status}`,
    `Placeables: ${report.totalPlaceables}`,
    `Errors: ${report.errorCount}`,
    `Warnings: ${report.warningCount}`,
    `Area: ${report.areaResref}`
  ].map(
    (line, index) =>
      `<text x="${width - margin.right + 18}" y="${height - margin.bottom - 112 + index * 22}" class="summary">${escapeXml(line)}</text>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .title { font: 700 24px Segoe UI, Arial, sans-serif; fill: #1f1f1f; }
    .subtitle { font: 13px Segoe UI, Arial, sans-serif; fill: #555; }
    .tile-id { font: 700 13px Segoe UI, Arial, sans-serif; fill: #1f1f1f; }
    .tile-note { font: 12px Segoe UI, Arial, sans-serif; }
    .legend { font: 13px Segoe UI, Arial, sans-serif; fill: #2b2b2b; }
    .summary { font: 13px Consolas, monospace; fill: #2b2b2b; }
    .intent-cell { fill: rgba(182, 63, 93, 0.08); stroke: #9f2f48; stroke-width: 1.6; stroke-dasharray: 6 5; }
  </style>
  <rect width="${width}" height="${height}" fill="#f6f3ed"/>
  <text x="40" y="42" class="title">Last City cartographer apartment - concept placement plan</text>
  <text x="40" y="64" class="subtitle">${escapeXml(report.modulePath)}</text>
  <rect x="${margin.left}" y="${margin.top}" width="${gridWidth}" height="${gridHeight}" fill="#ddd6ca" stroke="#1f1f1f" stroke-width="2"/>
  ${tileRows.join("\n  ")}
  ${intentRows.join("\n  ")}
  ${pointRows.join("\n  ")}
  <text x="${width - margin.right + 18}" y="${margin.top + 10}" class="tile-id">Role legend</text>
  ${legendRows.join("\n  ")}
  <text x="${width - margin.right + 18}" y="${height - margin.bottom - 136}" class="tile-id">Checker summary</text>
  ${summaryRows.join("\n  ")}
  <text x="${margin.left}" y="${height - 30}" class="subtitle">Stroke: pale ring = VisualTransform, black ring = non-motif floor overlay, red ring = risky mood overlay.</text>
</svg>
`;
}

function isAllowedStructuralFloorMotif(placeable) {
  const tag = normalize(placeable.tag);
  return allowedStructuralFloorTags.some((allowedTag) => allowedTag && tag.includes(allowedTag));
}

function roundSvg(value) {
  return Math.round(Number(value) * 10) / 10;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

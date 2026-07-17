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

const options = parseArgs(process.argv.slice(2));
const beforePath = resolveMaybe(options.before);
const afterPath = resolveMaybe(options.after);
const mapPath = resolveMaybe(options.map ?? defaultMapPath);
const outPath = resolveMaybe(options.out);

if (!beforePath || !afterPath || !outPath) {
  throw new Error("Usage: compare-last-city-area-candidates.mjs --before <old.mod> --after <new.mod> --out <report.json> [--map <map.json>]");
}
assertReadableFile(beforePath, "before module");
assertReadableFile(afterPath, "after module");
assertReadableFile(mapPath, "concept placeable tile map");

const map = JSON.parse(readFileSync(mapPath, "utf8"));
const roleByTemplate = buildRoleByTemplate(map.globalCandidateFamilies);
const riskyTemplates = new Set((map.riskControls?.blockedMoodShortcuts ?? []).map(normalize));
const nonMotifFloorOverlayTemplates = new Set(
  (map.riskControls?.nonMotifFloorOverlayTemplates ?? []).map(normalize)
);
const allowedStructuralFloorTags = (map.riskControls?.allowedStructuralFloorTags ?? []).map(normalize);

const beforePlaceables = readAreaPlaceables(beforePath, map.areaResref);
const afterPlaceables = readAreaPlaceables(afterPath, map.areaResref);
const beforeKeys = new Map(beforePlaceables.map((placeable) => [identityKey(placeable), placeable]));
const afterKeys = new Map(afterPlaceables.map((placeable) => [identityKey(placeable), placeable]));
const removed = beforePlaceables.filter((placeable) => !afterKeys.has(identityKey(placeable)));
const added = afterPlaceables.filter((placeable) => !beforeKeys.has(identityKey(placeable)));
const visualTransformChanges = [...beforeKeys.entries()]
  .map(([key, before]) => ({ before, after: afterKeys.get(key) }))
  .filter((pair) => pair.after && visualTransformSignature(pair.before.visualTransform) !== visualTransformSignature(pair.after.visualTransform))
  .map(({ before, after }) => ({
    placeable: summarizePlaceable(before),
    before: summarizeVisualTransform(before.visualTransform),
    after: summarizeVisualTransform(after.visualTransform)
  }));

const report = {
  version: "last-city-area-candidate-compare/v1",
  generatedAt: new Date().toISOString(),
  areaResref: map.areaResref,
  beforePath,
  afterPath,
  mapPath,
  before: summarizeSet(beforePlaceables),
  after: summarizeSet(afterPlaceables),
  delta: {
    placeables: afterPlaceables.length - beforePlaceables.length,
    addedCount: added.length,
    removedCount: removed.length,
    addedByClass: countBy(added, classifyPlaceable),
    removedByClass: countBy(removed, classifyPlaceable),
    addedByTile: countBy(added, tileIdForPlaceable),
    removedByTile: countBy(removed, tileIdForPlaceable),
    addedByRole: countBy(added, roleForPlaceable),
    removedByRole: countBy(removed, roleForPlaceable),
    removedTemplateTop: topCounts(removed, (placeable) => normalize(placeable.templateResRef), 20),
    addedTemplateTop: topCounts(added, (placeable) => normalize(placeable.templateResRef), 20),
    removedSamples: removed.slice(0, 80).map(summarizePlaceable),
    addedSamples: added.slice(0, 80).map(summarizePlaceable),
    visualTransformChangedCount: visualTransformChanges.length,
    visualTransformChangedByTile: countBy(visualTransformChanges, (change) => change.placeable.tile),
    visualTransformChangedByRole: countBy(visualTransformChanges, (change) => change.placeable.role),
    visualTransformChangedSamples: visualTransformChanges.slice(0, 80)
  }
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outPath.replace(/\.json$/u, ".md"), renderMarkdown(report), "utf8");
console.log(
  JSON.stringify(
    {
      before: report.before,
      after: report.after,
      delta: report.delta.placeables,
      removedCount: report.delta.removedCount,
      addedCount: report.delta.addedCount,
      removedByClass: report.delta.removedByClass,
      addedByClass: report.delta.addedByClass,
      visualTransformChangedCount: report.delta.visualTransformChangedCount,
      visualTransformChangedByTile: report.delta.visualTransformChangedByTile,
      outPath,
      markdownPath: outPath.replace(/\.json$/u, ".md")
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

function readAreaPlaceables(modulePath, areaResref) {
  const moduleBytes = readFileSync(modulePath);
  const gitEntry = findEntry(readErfEntries(moduleBytes, modulePath), areaResref, RESOURCE_TYPES.git);
  if (!gitEntry) {
    throw new Error(`Missing ${areaResref}.git in ${modulePath}.`);
  }
  const areaObjects = parseAreaObjectsFromGitGff(gitEntry.bytes, {
    areaResRef: areaResref
  });
  const areaObjectList = Array.isArray(areaObjects)
    ? areaObjects
    : areaObjects?.placeables ?? areaObjects?.objects ?? [];
  return areaObjectList.filter((object) => object.listKind === "placeable");
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

function identityKey(placeable) {
  return [
    normalize(placeable.templateResRef),
    normalize(placeable.tag),
    round2(placeable.x),
    round2(placeable.y),
    round2(placeable.z),
    round2(placeable.bearing)
  ].join("|");
}

function summarizeSet(placeables) {
  return {
    placeableCount: placeables.length,
    visualTransformCount: placeables.filter((placeable) =>
      hasNonDefaultVisualTransform(placeable.visualTransform)
    ).length,
    riskyOverlayCount: placeables.filter((placeable) =>
      riskyTemplates.has(normalize(placeable.templateResRef))
    ).length,
    nonMotifFloorOverlayCount: placeables.filter((placeable) =>
      isNonMotifFloorOverlay(placeable)
    ).length,
    byTile: countBy(placeables, tileIdForPlaceable),
    byRole: countBy(placeables, roleForPlaceable),
    byClass: countBy(placeables, classifyPlaceable)
  };
}

function classifyPlaceable(placeable) {
  const template = normalize(placeable.templateResRef);
  if (riskyTemplates.has(template)) {
    return "risky-mood-overlay";
  }
  if (isNonMotifFloorOverlay(placeable)) {
    return "non-motif-floor-overlay";
  }
  if (hasNonDefaultVisualTransform(placeable.visualTransform)) {
    return "visual-transform";
  }
  return "ordinary";
}

function isNonMotifFloorOverlay(placeable) {
  const template = normalize(placeable.templateResRef);
  if (!nonMotifFloorOverlayTemplates.has(template)) {
    return false;
  }
  const tag = normalize(placeable.tag);
  return !allowedStructuralFloorTags.some((allowedTag) => allowedTag && tag.includes(allowedTag));
}

function roleForPlaceable(placeable) {
  return roleByTemplate.get(normalize(placeable.templateResRef)) ?? "unmapped";
}

function tileIdForPlaceable(placeable) {
  const x = Number(placeable.x);
  const y = Number(placeable.y);
  const tile = map.tiles.find((candidate) => {
    const bounds = candidate.worldBounds;
    return (
      x >= Number(bounds.minX) &&
      x < Number(bounds.maxX) &&
      y >= Number(bounds.minY) &&
      y < Number(bounds.maxY)
    );
  });
  return tile?.id ?? "outside";
}

function countBy(values, selector) {
  const counts = {};
  for (const value of values) {
    const key = selector(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function topCounts(values, selector, limit) {
  const counts = countBy(values, selector);
  return Object.entries(counts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function summarizePlaceable(placeable) {
  return {
    templateResRef: placeable.templateResRef,
    tag: placeable.tag,
    tile: tileIdForPlaceable(placeable),
    role: roleForPlaceable(placeable),
    class: classifyPlaceable(placeable),
    x: round2(placeable.x),
    y: round2(placeable.y),
    z: round2(placeable.z),
    bearing: round2(placeable.bearing),
    visualTransform: hasNonDefaultVisualTransform(placeable.visualTransform)
  };
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

function visualTransformSignature(visualTransform) {
  return JSON.stringify(summarizeVisualTransform(visualTransform));
}

function summarizeVisualTransform(visualTransform) {
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
  return Object.fromEntries(
    Object.entries(defaults).map(([key, defaultValue]) => [
      key,
      round4(Number(visualTransform?.[key] ?? defaultValue))
    ])
  );
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function round2(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : value;
}

function round4(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 10000) / 10000 : value;
}

function renderMarkdown(report) {
  const lines = [
    "# Last City Area Candidate Compare",
    "",
    `Area: \`${report.areaResref}\``,
    "",
    `Before: \`${report.beforePath}\``,
    "",
    `After: \`${report.afterPath}\``,
    "",
    "## Summary",
    "",
    "| Metric | Before | After | Delta |",
    "| --- | ---: | ---: | ---: |",
    `| Placeables | ${report.before.placeableCount} | ${report.after.placeableCount} | ${report.delta.placeables} |`,
    `| VisualTransform | ${report.before.visualTransformCount} | ${report.after.visualTransformCount} | ${report.after.visualTransformCount - report.before.visualTransformCount} |`,
    `| VisualTransform value changes | 0 | ${report.delta.visualTransformChangedCount} | ${report.delta.visualTransformChangedCount} |`,
    `| Risky overlays | ${report.before.riskyOverlayCount} | ${report.after.riskyOverlayCount} | ${report.after.riskyOverlayCount - report.before.riskyOverlayCount} |`,
    `| Non-motif floor overlays | ${report.before.nonMotifFloorOverlayCount} | ${report.after.nonMotifFloorOverlayCount} | ${report.after.nonMotifFloorOverlayCount - report.before.nonMotifFloorOverlayCount} |`,
    "",
    "## Removed By Class",
    "",
    renderObjectTable(report.delta.removedByClass),
    "",
    "## Added By Class",
    "",
    renderObjectTable(report.delta.addedByClass),
    "",
    "## Removed By Tile",
    "",
    renderObjectTable(report.delta.removedByTile),
    "",
    "## VisualTransform Changes By Tile",
    "",
    renderObjectTable(report.delta.visualTransformChangedByTile),
    "",
    "## VisualTransform Change Samples",
    "",
    renderVisualTransformChangeTable(report.delta.visualTransformChangedSamples),
    "",
    "## Top Removed Templates",
    "",
    "| Template | Count |",
    "| --- | ---: |",
    ...report.delta.removedTemplateTop.map((row) => `| \`${row.key}\` | ${row.count} |`)
  ];
  return `${lines.join("\n")}\n`;
}

function renderObjectTable(object) {
  const entries = Object.entries(object);
  if (entries.length === 0) {
    return "_None_";
  }
  return ["| Key | Count |", "| --- | ---: |", ...entries.map(([key, count]) => `| \`${key}\` | ${count} |`)].join("\n");
}

function renderVisualTransformChangeTable(changes) {
  if (changes.length === 0) {
    return "_None_";
  }
  return [
    "| Template | Tag | Tile | Role | Before scale | After scale |",
    "| --- | --- | --- | --- | --- | --- |",
    ...changes.map((change) => {
      const beforeScale = `${change.before.scaleX}/${change.before.scaleY}/${change.before.scaleZ}`;
      const afterScale = `${change.after.scaleX}/${change.after.scaleY}/${change.after.scaleZ}`;
      return `| \`${change.placeable.templateResRef}\` | \`${change.placeable.tag}\` | \`${change.placeable.tile}\` | ${change.placeable.role} | ${beforeScale} | ${afterScale} |`;
    })
  ].join("\n");
}

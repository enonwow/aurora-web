#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
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

const ROLE_COLORS = {
  lighting_fire: "#f4b860",
  maps_books_papers: "#e7d38a",
  plants_vases: "#6faf7a",
  sleep_private: "#7aa4d8",
  storage_containers: "#b58257",
  structural_floor_spine: "#9a9a9a",
  structural_windows_walls: "#5d6570",
  tables_seating: "#c58d5d",
  textiles_rugs: "#c65757",
  tools_port_work: "#9fc0c5",
  unmapped: "#b0b0b0"
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
const artifactRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area"
);

const options = parseArgs(process.argv.slice(2));
const modulePath = resolveMaybe(options.modulePath ?? process.env.AURORA_LAST_CITY_CONCEPT_ANCHOR_MODULE_PATH);
const mapPath = resolveMaybe(options.map ?? defaultMapPath);
const label = sanitizeSegment(options.label ?? basename(modulePath ?? "module", ".mod"));
const outPath =
  resolveMaybe(options.out) ?? resolve(artifactRoot, `concept-anchor-compare-${label}-${timestampSegment()}.json`);

if (!modulePath) {
  throw new Error("Missing --modulePath or AURORA_LAST_CITY_CONCEPT_ANCHOR_MODULE_PATH.");
}
assertReadableFile(modulePath, "module");
assertReadableFile(mapPath, "concept placeable tile map");

const map = JSON.parse(readFileSync(mapPath, "utf8"));
const rolesByTemplate = buildRolesByTemplate(map);
const placeables = readAreaPlaceables(modulePath, map.areaResref).map((placeable) => ({
  ...placeable,
  templateKey: normalize(placeable.templateResRef),
  roles: rolesForTemplate(rolesByTemplate, placeable.templateResRef),
  role: rolesForTemplate(rolesByTemplate, placeable.templateResRef)[0] ?? "unmapped"
}));

const tileReports = map.tiles.map((tile) => buildTileReport(tile, placeables));
const anchorReports = tileReports.flatMap((tile) => tile.anchors);
const totalAnchors = anchorReports.length;
const passedAnchors = anchorReports.filter((anchor) => anchor.status === "passed").length;
const partialAnchors = anchorReports.filter((anchor) => anchor.status === "partial").length;
const failedAnchors = anchorReports.filter((anchor) => anchor.status === "failed").length;
const motifReports = tileReports.flatMap((tile) => tile.motifs);
const motifGapCount = motifReports.filter((motif) => motif.status !== "matched").length;
const recommendations = buildRecommendations(tileReports);
const score =
  totalAnchors === 0
    ? 1
    : round3((passedAnchors + partialAnchors * 0.5) / totalAnchors);

const report = {
  version: "last-city-concept-anchor-compare/v1",
  generatedAt: new Date().toISOString(),
  status: failedAnchors > 0 || motifGapCount > 0 ? "needs_iteration" : "passed",
  score,
  modulePath,
  mapPath,
  areaResref: map.areaResref,
  conceptPath: map.conceptPath,
  summary: {
    placeableCount: placeables.length,
    totalAnchors,
    passedAnchors,
    partialAnchors,
    failedAnchors,
    motifGapCount,
    lowestTiles: tileReports
      .slice()
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((tile) => ({
        id: tile.id,
        conceptRole: tile.conceptRole,
        score: tile.score,
        failedAnchors: tile.failedAnchors,
        partialAnchors: tile.partialAnchors,
        motifGaps: tile.motifGaps
      }))
  },
  recommendations,
  tiles: tileReports,
  safety: {
    launchesToolset: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    method: "offline concept anchor zones + GIT placeable positions"
  }
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outPath.replace(/\.json$/u, ".md"), renderMarkdown(report), "utf8");
writeFileSync(outPath.replace(/\.json$/u, ".svg"), renderSvg({ map, report, placeables }), "utf8");

console.log(
  JSON.stringify(
    {
      status: report.status,
      score: report.score,
      modulePath,
      outPath,
      markdownPath: outPath.replace(/\.json$/u, ".md"),
      svgPath: outPath.replace(/\.json$/u, ".svg"),
      lowestTiles: report.summary.lowestTiles,
      recommendations: report.recommendations.slice(0, 8)
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

function readAreaPlaceables(sourceModulePath, areaResref) {
  const moduleBytes = readFileSync(sourceModulePath);
  const gitEntry = findEntry(readErfEntries(moduleBytes, sourceModulePath), areaResref, RESOURCE_TYPES.git);
  if (!gitEntry) {
    throw new Error(`Missing ${areaResref}.git in ${sourceModulePath}.`);
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

function buildRolesByTemplate(map) {
  const rolesByTemplate = new Map();
  for (const [role, templates] of Object.entries(map.globalCandidateFamilies ?? {})) {
    for (const template of templates) {
      addTemplateRole(rolesByTemplate, template, role);
    }
  }
  for (const tile of map.tiles ?? []) {
    for (const motif of tile.requiredMotifs ?? []) {
      for (const template of motif.templates ?? []) {
        addTemplateRole(rolesByTemplate, template, motif.role);
      }
    }
  }
  return rolesByTemplate;
}

function addTemplateRole(rolesByTemplate, template, role) {
  const key = normalize(template);
  const nextRole = normalize(role);
  if (!key || !nextRole || key === "existing door") {
    return;
  }
  const roles = rolesByTemplate.get(key) ?? [];
  if (!roles.includes(nextRole)) {
    roles.push(nextRole);
  }
  rolesByTemplate.set(key, roles);
}

function rolesForTemplate(rolesByTemplate, template) {
  return rolesByTemplate.get(normalize(template)) ?? ["unmapped"];
}

function buildTileReport(tile, allPlaceables) {
  const tilePlaceables = allPlaceables.filter((placeable) => isInsideBounds(placeable, tile.worldBounds));
  const anchors = (tile.anchorZones ?? []).map((anchor) =>
    buildAnchorReport(tile, anchor, tilePlaceables)
  );
  const motifs = (tile.requiredMotifs ?? []).map((motif) => buildMotifReport(tile, motif, tilePlaceables));
  const failedAnchors = anchors.filter((anchor) => anchor.status === "failed").length;
  const partialAnchors = anchors.filter((anchor) => anchor.status === "partial").length;
  const motifGaps = motifs.filter((motif) => motif.status !== "matched").length;
  const score =
    anchors.length === 0
      ? 1
      : round3(
          (anchors.filter((anchor) => anchor.status === "passed").length + partialAnchors * 0.5) /
            anchors.length
        );
  return {
    id: tile.id,
    conceptRole: tile.conceptRole,
    primaryRead: tile.primaryRead,
    placeableCount: tilePlaceables.length,
    roleCounts: countRoles(tilePlaceables),
    score,
    failedAnchors,
    partialAnchors,
    motifGaps,
    anchors,
    motifs
  };
}

function buildAnchorReport(tile, anchor, tilePlaceables) {
  const expectedRoles = inferAnchorRoles(anchor);
  const anchorPlaceables = tilePlaceables.filter((placeable) => isInsideZone(placeable, anchor));
  const roleCounts = countRoles(anchorPlaceables);
  const missingRoles = expectedRoles.filter((role) => Number(roleCounts[role] ?? 0) === 0);
  const matchedRoles = expectedRoles.filter((role) => Number(roleCounts[role] ?? 0) > 0);
  const status =
    missingRoles.length === 0
      ? "passed"
      : matchedRoles.length > 0
        ? "partial"
        : "failed";
  return {
    tile: tile.id,
    name: anchor.name,
    use: anchor.use,
    expectedRoles,
    status,
    objectCount: anchorPlaceables.length,
    roleCounts,
    missingRoles,
    fillPerTileUnit: round3(anchorPlaceables.length / Math.max(zoneArea(anchor), 0.001)),
    center: zoneCenter(anchor),
    samples: anchorPlaceables.slice(0, 10).map(summarizePlaceable),
    nearestForMissingRoles: Object.fromEntries(
      missingRoles.map((role) => [role, nearestPlaceables(tilePlaceables, role, zoneCenter(anchor), 3)])
    )
  };
}

function buildMotifReport(tile, motif, tilePlaceables) {
  const templates = new Set((motif.templates ?? []).map(normalize));
  const matches = tilePlaceables.filter((placeable) => templates.has(placeable.templateKey));
  const min = Number(motif.count?.min ?? 0);
  const target = Number(motif.count?.target ?? min);
  const count = matches.length;
  const status = count >= min ? "matched" : "missing";
  return {
    tile: tile.id,
    motif: motif.motif,
    role: motif.role,
    priority: motif.priority,
    count,
    min,
    target,
    status,
    samples: matches.slice(0, 8).map(summarizePlaceable),
    nearestSameRole:
      status === "missing"
        ? nearestPlaceables(tilePlaceables, motif.role, motifPreferredCenter(tile, motif), 5)
        : []
  };
}

function inferAnchorRoles(anchor) {
  const use = normalize(anchor.use);
  const roles = [];
  addIf(roles, "tables_seating", /\b(table|desk|bench|seat|chair|couch|commode)\b/u.test(use));
  addIf(roles, "maps_books_papers", /\b(map|maps|chart|charts|paper|papers|note|notes|book|books|scroll|scrolls|shelf|shelves)\b/u.test(use));
  addIf(roles, "lighting_fire", /\b(candle|candles|lantern|light|fire|ember|soot)\b/u.test(use));
  addIf(roles, "textiles_rugs", /\b(rug|runner|textile|fabric|tapestry)\b/u.test(use));
  addIf(roles, "sleep_private", /\b(bed|pillow|wardrobe|chest)\b/u.test(use));
  addIf(roles, "storage_containers", /\b(storage|crate|crates|barrel|barrels|sack|sacks|box|boxes|jar|jars)\b/u.test(use));
  addIf(roles, "tools_port_work", /\b(rope|tool|tools|bucket|ladder)\b/u.test(use));
  addIf(roles, "plants_vases", /\b(plant|vase)\b/u.test(use));
  addIf(roles, "structural_windows_walls", /\b(wall|window|door|threshold|split|silhouette|side)\b/u.test(use));
  return roles.length > 0 ? roles : ["unmapped"];
}

function addIf(list, value, condition) {
  if (condition && !list.includes(value)) {
    list.push(value);
  }
}

function buildRecommendations(tileReports) {
  const recommendations = [];
  for (const tile of tileReports.slice().sort((a, b) => a.score - b.score)) {
    for (const anchor of tile.anchors.filter((entry) => entry.status !== "passed")) {
      recommendations.push({
        tile: tile.id,
        anchor: anchor.name,
        reason: `missing anchor roles: ${anchor.missingRoles.join(", ")}`,
        action: `move or add ${anchor.missingRoles.join("/")} into ${tile.id}.${anchor.name}; prefer real X/Y/Bearing before VT`
      });
    }
    for (const motif of tile.motifs.filter((entry) => entry.status !== "matched")) {
      recommendations.push({
        tile: tile.id,
        motif: motif.motif,
        reason: `${motif.count}/${motif.min} required templates in tile`,
        action: `use templates ${String((motif.samples ?? []).length > 0 ? "already nearby" : "from concept map")} for ${motif.role}`
      });
    }
  }
  return recommendations.slice(0, 20);
}

function isInsideBounds(placeable, bounds) {
  return (
    Number(placeable.x) >= Number(bounds.minX) &&
    Number(placeable.x) < Number(bounds.maxX) &&
    Number(placeable.y) >= Number(bounds.minY) &&
    Number(placeable.y) < Number(bounds.maxY)
  );
}

function isInsideZone(placeable, zone) {
  const ranges = zoneRectangles(zone);
  return ranges.some(
    (rect) =>
      Number(placeable.x) >= rect.minX &&
      Number(placeable.x) <= rect.maxX &&
      Number(placeable.y) >= rect.minY &&
      Number(placeable.y) <= rect.maxY
  );
}

function zoneRectangles(zone) {
  const xRanges = rangesFromArray(zone.x);
  const yRanges = rangesFromArray(zone.y);
  return xRanges.flatMap((xRange) =>
    yRanges.map((yRange) => ({
      minX: xRange[0],
      maxX: xRange[1],
      minY: yRange[0],
      maxY: yRange[1]
    }))
  );
}

function rangesFromArray(value) {
  const entries = Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
  if (entries.length < 2) {
    return [[0, 0]];
  }
  const ranges = [];
  for (let index = 0; index + 1 < entries.length; index += 2) {
    ranges.push([Math.min(entries[index], entries[index + 1]), Math.max(entries[index], entries[index + 1])]);
  }
  return ranges;
}

function zoneArea(zone) {
  return zoneRectangles(zone).reduce((sum, rect) => {
    return sum + Math.max(rect.maxX - rect.minX, 0) * Math.max(rect.maxY - rect.minY, 0);
  }, 0);
}

function zoneCenter(zone) {
  const rects = zoneRectangles(zone);
  let weightedX = 0;
  let weightedY = 0;
  let totalArea = 0;
  for (const rect of rects) {
    const area = Math.max(rect.maxX - rect.minX, 0.001) * Math.max(rect.maxY - rect.minY, 0.001);
    weightedX += ((rect.minX + rect.maxX) / 2) * area;
    weightedY += ((rect.minY + rect.maxY) / 2) * area;
    totalArea += area;
  }
  return {
    x: round2(weightedX / Math.max(totalArea, 0.001)),
    y: round2(weightedY / Math.max(totalArea, 0.001))
  };
}

function nearestPlaceables(placeables, role, center, limit) {
  return placeables
    .filter((placeable) => placeable.roles.includes(role))
    .map((placeable) => ({
      ...summarizePlaceable(placeable),
      distance: round2(distance2d(placeable, center))
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

function motifPreferredCenter(tile, motif) {
  const tileCenter = {
    x: (Number(tile.worldBounds.minX) + Number(tile.worldBounds.maxX)) / 2,
    y: (Number(tile.worldBounds.minY) + Number(tile.worldBounds.maxY)) / 2
  };
  const roleHints = inferAnchorRoles({ use: motif.motif });
  const matchingAnchor = (tile.anchorZones ?? []).find((anchor) =>
    inferAnchorRoles(anchor).some((role) => roleHints.includes(role) || role === motif.role)
  );
  return matchingAnchor ? zoneCenter(matchingAnchor) : tileCenter;
}

function distance2d(a, b) {
  return Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));
}

function summarizePlaceable(placeable) {
  return {
    template: normalize(placeable.templateResRef),
    tag: String(placeable.tag ?? placeable.id ?? ""),
    role: placeable.role,
    roles: placeable.roles,
    x: round2(placeable.x),
    y: round2(placeable.y),
    z: round2(placeable.z),
    bearingDeg: round1(toDegreesIfRadians(Number(placeable.bearing ?? 0)))
  };
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = String(selector(item));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function countRoles(placeables) {
  const counts = {};
  for (const placeable of placeables) {
    for (const role of placeable.roles ?? [placeable.role ?? "unmapped"]) {
      counts[role] = (counts[role] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function renderMarkdown(report) {
  const tileRows = report.tiles
    .map(
      (tile) =>
        `| ${tile.id} | ${tile.conceptRole} | ${tile.score} | ${tile.placeableCount} | ${tile.failedAnchors} | ${tile.partialAnchors} | ${tile.motifGaps} |`
    )
    .join("\n");
  const anchorRows = report.tiles
    .flatMap((tile) =>
      tile.anchors.map(
        (anchor) =>
          `| ${tile.id} | ${anchor.name} | ${anchor.status} | ${anchor.expectedRoles.join(", ")} | ${anchor.objectCount} | ${anchor.missingRoles.join(", ") || "-"} |`
      )
    )
    .join("\n");
  const recRows = report.recommendations
    .map((rec) => `- ${rec.tile}${rec.anchor ? `.${rec.anchor}` : ""}: ${rec.reason}. ${rec.action}.`)
    .join("\n");
  return `# Last City Concept Anchor Compare

Status: \`${report.status}\`

Score: \`${report.score}\`

Module: \`${report.modulePath}\`

Concept: \`${report.conceptPath}\`

This is an offline object-to-concept-zone check. It does not launch Aurora or use the mouse/keyboard.

## Summary

- Placeables: ${report.summary.placeableCount}
- Anchors: ${report.summary.passedAnchors}/${report.summary.totalAnchors} passed, ${report.summary.partialAnchors} partial, ${report.summary.failedAnchors} failed
- Motif gaps: ${report.summary.motifGapCount}

## Lowest Tiles

| Tile | Concept role | Score | Placeables | Failed anchors | Partial anchors | Motif gaps |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${tileRows}

## Anchor Checks

| Tile | Anchor | Status | Expected roles | Objects | Missing roles |
| --- | --- | --- | --- | ---: | --- |
${anchorRows}

## Recommendations

${recRows || "- none"}
`;
}

function renderSvg({ map, report, placeables }) {
  const scale = 26;
  const pad = 44;
  const width = 30 * scale + pad * 2;
  const height = 20 * scale + pad * 2;
  const points = placeables
    .map((placeable) => {
      const color = ROLE_COLORS[placeable.role] ?? ROLE_COLORS.unmapped;
      return `<circle cx="${toSvgX(placeable.x, scale, pad)}" cy="${toSvgY(placeable.y, scale, pad)}" r="3" fill="${color}" opacity="0.86"><title>${escapeXml(placeable.role)} ${escapeXml(placeable.templateKey)} ${round2(placeable.x)},${round2(placeable.y)}</title></circle>`;
    })
    .join("\n");
  const tileRects = (map.tiles ?? [])
    .map((tile) => {
      const b = tile.worldBounds;
      return `<rect x="${toSvgX(b.minX, scale, pad)}" y="${toSvgY(b.maxY, scale, pad)}" width="${(b.maxX - b.minX) * scale}" height="${(b.maxY - b.minY) * scale}" fill="none" stroke="#777" stroke-width="1"/><text x="${toSvgX(b.minX, scale, pad) + 6}" y="${toSvgY(b.maxY, scale, pad) + 16}" fill="#ddd" font-size="12">${escapeXml(tile.id)} ${escapeXml(tile.conceptRole)}</text>`;
    })
    .join("\n");
  const anchors = (map.tiles ?? [])
    .flatMap((tile) =>
      (tile.anchorZones ?? []).flatMap((anchor) => {
        const anchorReport = report.tiles
          .find((entry) => entry.id === tile.id)
          ?.anchors.find((entry) => entry.name === anchor.name);
        const color =
          anchorReport?.status === "passed"
            ? "#56b870"
            : anchorReport?.status === "partial"
              ? "#d4aa47"
              : "#d76666";
        return zoneRectangles(anchor).map((rect) => {
          return `<rect x="${toSvgX(rect.minX, scale, pad)}" y="${toSvgY(rect.maxY, scale, pad)}" width="${(rect.maxX - rect.minX) * scale}" height="${(rect.maxY - rect.minY) * scale}" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="2"><title>${escapeXml(tile.id)}.${escapeXml(anchor.name)} ${escapeXml(anchorReport?.status ?? "")}</title></rect><text x="${toSvgX(rect.minX, scale, pad) + 4}" y="${toSvgY(rect.maxY, scale, pad) + 14}" fill="${color}" font-size="10">${escapeXml(anchor.name)}</text>`;
        });
      })
    )
    .join("\n");
  const legend = Object.entries(ROLE_COLORS)
    .map(([role, color], index) => {
      const x = pad + (index % 4) * 180;
      const y = height - 24 - Math.floor(index / 4) * 18;
      return `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/><text x="${x + 8}" y="${y + 4}" fill="#ddd" font-size="11">${escapeXml(role)}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#171717"/>
<text x="${pad}" y="24" fill="#f2f2f2" font-size="16">Last City concept anchor compare: ${escapeXml(report.status)} score ${report.score}</text>
${tileRects}
${anchors}
${points}
${legend}
</svg>
`;
}

function toSvgX(value, scale, pad) {
  return pad + Number(value) * scale;
}

function toSvgY(value, scale, pad) {
  return pad + (20 - Number(value)) * scale;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toDegreesIfRadians(value) {
  const abs = Math.abs(value);
  return abs <= Math.PI * 2 + 0.001 ? value * (180 / Math.PI) : value;
}

function round1(value) {
  return Number(Number(value ?? 0).toFixed(1));
}

function round2(value) {
  return Number(Number(value ?? 0).toFixed(2));
}

function round3(value) {
  return Number(Number(value ?? 0).toFixed(3));
}

function sanitizeSegment(value) {
  return String(value ?? "area")
    .replace(/[^a-z0-9_.-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96);
}

function timestampSegment() {
  return new Date().toISOString().replace(/[:.]/gu, "-");
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

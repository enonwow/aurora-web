#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node"
});
require("ts-node/register/transpile-only");

const {
  parseAreaMetadataFromAreGff
} = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");
const {
  __moduleSnapshotAreaRepositoryInternals
} = require("../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository");

const RESOURCE_TYPES = {
  are: 2012,
  set: 2013
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");
const defaultUsageMapPath = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-placeable-usage-map",
  "placeable-usage-map.json"
);
const defaultOutRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area"
);

const options = parseArgs(process.argv.slice(2));
const usageMapPath = resolveMaybe(options.usageMap ?? defaultUsageMapPath);
const usageMap = existsSync(usageMapPath) ? readJson(usageMapPath) : null;
const modulePath = resolveMaybe(
  options.modulePath ??
    process.env.AURORA_LAST_CITY_SIC11_TILE_RANK_MODULE_PATH ??
    process.env.AURORA_LAST_CITY_MODULE_PATH ??
    usageMap?.modulePath
);
if (!modulePath) {
  throw new Error("Missing --modulePath, AURORA_LAST_CITY_SIC11_TILE_RANK_MODULE_PATH, or usageMap.modulePath.");
}
assertReadableFile(modulePath, "module");

const hakPath = resolveMaybe(
  options.sicHak ??
    process.env.AURORA_LAST_CITY_SIC11_HAK_PATH ??
    join(getNwnUserRoot(), "hak", "+sic11.hak")
);
assertReadableFile(hakPath, "sic11 hak");

const label = sanitizeSegment(options.label ?? `${basename(modulePath, ".mod")}-sic11-layouts-${timestampSegment()}`);
const outPath = resolveMaybe(options.out ?? resolve(defaultOutRoot, `sic11-tile-layout-rank-${label}.json`));

const moduleEntries = readErfEntries(readFileSync(modulePath), modulePath);
const sic11Set = readSic11Set(hakPath);
const areasByUsage = new Map((usageMap?.areas ?? []).map((area) => [normalize(area.resref), area]));
const layouts = moduleEntries
  .filter((entry) => entry.type === RESOURCE_TYPES.are)
  .map((entry) => buildAreaLayout(entry, areasByUsage, sic11Set))
  .filter((area) => area && area.tileSet === "sic11")
  .sort((left, right) => right.relevanceScore - left.relevanceScore || right.placeableCount - left.placeableCount);

const tileFrequency = buildTileFrequency(layouts);
const subLayouts3x2 = buildSubLayouts3x2(layouts);
const report = {
  version: "last-city-sic11-tile-layout-rank/v1",
  generatedAt: new Date().toISOString(),
  modulePath,
  hakPath,
  usageMapPath: usageMap ? usageMapPath : null,
  summary: {
    sic11AreaCount: layouts.length,
    exact3x2Count: layouts.filter((area) => area.width === 3 && area.height === 2).length,
    residentialCount: layouts.filter((area) => area.category?.startsWith("apartment")).length,
    topLayouts: layouts.slice(0, 12).map(summarizeLayout),
    topSubLayouts3x2: subLayouts3x2.slice(0, 12)
  },
  tileFrequency,
  subLayouts3x2,
  layouts,
  safety: {
    launchesToolset: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    method: "offline ARE scan + sic11 SET parsing from HAK"
  }
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outPath.replace(/\.json$/u, ".md"), renderMarkdown(report), "utf8");

console.log(
  JSON.stringify(
    {
      status: "ok",
      modulePath,
      hakPath,
      outPath,
      markdownPath: outPath.replace(/\.json$/u, ".md"),
      summary: report.summary
    },
    null,
    2
  )
);

function buildAreaLayout(entry, areasByUsage, sic11Set) {
  const metadata = parseAreaMetadataFromAreGff(entry.bytes);
  if (!metadata || normalize(metadata.tileSet) !== "sic11") {
    return null;
  }
  const usage = areasByUsage.get(normalize(entry.resref));
  const tiles = (metadata.tiles ?? []).map((tile) => {
    const setTile = sic11Set.get(tile.tileId);
    return {
      index: tile.index,
      x: tile.col,
      y: tile.row,
      tileId: tile.tileId ?? null,
      orientation: tile.orientation ?? null,
      modelResRef: tile.modelResRef ?? setTile?.modelResRef ?? null,
      imageMap2D: setTile?.imageMap2D ?? null,
      setOrientation: setTile?.orientation ?? null,
      pathNode: setTile?.pathNode ?? null,
      visibilityNode: setTile?.visibilityNode ?? null,
      edges: setTile?.edges ?? null
    };
  });
  const area = {
    resref: entry.resref,
    name: metadata.name ?? usage?.name ?? entry.resref,
    category: usage?.category ?? "unknown",
    tileSet: normalize(metadata.tileSet),
    width: metadata.width ?? usage?.width ?? null,
    height: metadata.height ?? usage?.height ?? null,
    tileCount: metadata.tileCount ?? tiles.length,
    placeableCount: usage?.counts?.placeables ?? 0,
    density: tiles.length > 0 ? round((usage?.counts?.placeables ?? 0) / tiles.length, 2) : 0,
    tileIds: tiles.map((tile) => tile.tileId),
    tileOrientations: tiles.map((tile) => tile.orientation),
    models: [...new Set(tiles.map((tile) => tile.modelResRef).filter(Boolean))].sort(),
    imageMaps: [...new Set(tiles.map((tile) => tile.imageMap2D).filter(Boolean))].sort(),
    tiles
  };
  return {
    ...area,
    relevanceScore: scoreLayout(area)
  };
}

function scoreLayout(area) {
  let score = 0;
  if (area.width === 3 && area.height === 2) {
    score += 40;
  } else if (area.tileCount >= 4 && area.tileCount <= 8) {
    score += 20;
  }
  if (area.category === "apartment_rich") {
    score += 28;
  } else if (area.category === "apartment_middle") {
    score += 22;
  } else if (area.category === "apartment_template") {
    score += 16;
  } else if (area.category === "tavern_brothel") {
    score += 8;
  }
  if (area.density >= 45) {
    score += 14;
  } else if (area.density >= 25) {
    score += 8;
  }
  if (area.models.some((model) => /wall|wood|room|int|hall|house/iu.test(model))) {
    score += 5;
  }
  return score;
}

function buildTileFrequency(layouts) {
  const byTile = new Map();
  for (const area of layouts) {
    for (const tile of area.tiles) {
      const key = String(tile.tileId);
      const next = byTile.get(key) ?? {
        tileId: tile.tileId,
        count: 0,
        residentialCount: 0,
        exact3x2Count: 0,
        models: new Set(),
        imageMaps: new Set(),
        sampleAreas: []
      };
      next.count += 1;
      if (area.category?.startsWith("apartment")) {
        next.residentialCount += 1;
      }
      if (area.width === 3 && area.height === 2) {
        next.exact3x2Count += 1;
      }
      if (tile.modelResRef) {
        next.models.add(tile.modelResRef);
      }
      if (tile.imageMap2D) {
        next.imageMaps.add(tile.imageMap2D);
      }
      if (next.sampleAreas.length < 8 && !next.sampleAreas.some((sample) => sample.resref === area.resref)) {
        next.sampleAreas.push({
          resref: area.resref,
          category: area.category,
          size: `${area.width}x${area.height}`,
          orientation: tile.orientation
        });
      }
      byTile.set(key, next);
    }
  }
  return [...byTile.values()]
    .map((entry) => ({
      ...entry,
      models: [...entry.models].sort(),
      imageMaps: [...entry.imageMaps].sort()
    }))
    .sort(
      (left, right) =>
        right.residentialCount - left.residentialCount ||
        right.exact3x2Count - left.exact3x2Count ||
        right.count - left.count
    );
}

function buildSubLayouts3x2(layouts) {
  const sublayouts = [];
  for (const area of layouts) {
    if (area.width < 3 || area.height < 2) {
      continue;
    }
    for (let y = 0; y <= area.height - 2; y += 1) {
      for (let x = 0; x <= area.width - 3; x += 1) {
        const tiles = [];
        for (let row = 0; row < 2; row += 1) {
          for (let col = 0; col < 3; col += 1) {
            const tile = area.tiles.find((candidate) => candidate.x === x + col && candidate.y === y + row);
            if (tile) {
              tiles.push(tile);
            }
          }
        }
        if (tiles.length !== 6) {
          continue;
        }
        const tileIds = tiles.map((tile) => tile.tileId);
        const orientations = tiles.map((tile) => tile.orientation);
        const models = [...new Set(tiles.map((tile) => tile.modelResRef).filter(Boolean))].sort();
        const nonBlankCount = tileIds.filter((tileId) => tileId !== 0).length;
        const currentTemplateMatch =
          tileIds.join(",") === "82,80,89,72,73,91" &&
          orientations.join(",") === "1,3,2,2,3,0";
        const score =
          (area.category === "apartment_rich" ? 32 : area.category === "apartment_middle" ? 24 : 8) +
          Math.min(20, area.density / 3) +
          nonBlankCount * 3 +
          models.length * 2 -
          (currentTemplateMatch ? 18 : 0);
        sublayouts.push({
          parentResref: area.resref,
          parentCategory: area.category,
          parentSize: `${area.width}x${area.height}`,
          origin: { x, y },
          score: round(score, 2),
          nonBlankCount,
          currentTemplateMatch,
          tileIds,
          tileOrientations: orientations,
          models
        });
      }
    }
  }
  return sublayouts.sort(
    (left, right) =>
      right.score - left.score ||
      right.nonBlankCount - left.nonBlankCount ||
      left.parentResref.localeCompare(right.parentResref)
  );
}

function summarizeLayout(area) {
  return {
    resref: area.resref,
    name: area.name,
    category: area.category,
    size: `${area.width}x${area.height}`,
    placeableCount: area.placeableCount,
    density: area.density,
    score: area.relevanceScore,
    tileIds: area.tileIds,
    tileOrientations: area.tileOrientations,
    models: area.models
  };
}

function renderMarkdown(report) {
  const topRows = report.summary.topLayouts
    .map(
      (area) =>
        `| ${area.resref} | ${area.category} | ${area.size} | ${area.placeableCount} | ${area.density} | ${area.score} | ${area.tileIds.join(",")} | ${area.tileOrientations.join(",")} | ${area.models.join(", ")} |`
    )
    .join("\n");
  const freqRows = report.tileFrequency
    .slice(0, 30)
    .map(
      (tile) =>
        `| ${tile.tileId} | ${tile.count} | ${tile.residentialCount} | ${tile.exact3x2Count} | ${tile.models.join(", ")} | ${tile.sampleAreas.map((area) => `${area.resref}(${area.orientation})`).join("; ")} |`
    )
    .join("\n");
  const subRows = report.summary.topSubLayouts3x2
    .map(
      (layout) =>
        `| ${layout.parentResref} | ${layout.parentCategory} | ${layout.parentSize} | ${layout.origin.x},${layout.origin.y} | ${layout.score} | ${layout.nonBlankCount} | ${layout.currentTemplateMatch} | ${layout.tileIds.join(",")} | ${layout.tileOrientations.join(",")} | ${layout.models.join(", ")} |`
    )
    .join("\n");
  return `# Last City SIC11 Tile Layout Rank

Generated: ${report.generatedAt}

Module: \`${report.modulePath}\`

HAK: \`${report.hakPath}\`

SIC11 areas: \`${report.summary.sic11AreaCount}\`

Exact 3x2 areas: \`${report.summary.exact3x2Count}\`

Residential areas: \`${report.summary.residentialCount}\`

## Top Layouts

| ResRef | Category | Size | Placeables | Density | Score | Tile IDs | Orientations | Models |
| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |
${topRows}

## Top 3x2 Sublayouts

| Parent | Category | Parent size | Origin | Score | Nonblank | Current 3x2 | Tile IDs | Orientations | Models |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
${subRows}

## Tile Frequency

| Tile ID | Count | Residential | Exact 3x2 | Models | Sample areas |
| ---: | ---: | ---: | ---: | --- | --- |
${freqRows}

## Safety

Offline only. Does not launch Toolset and does not use global input.
`;
}

function readSic11Set(hakPath) {
  const entries = readErfEntries(readFileSync(hakPath), hakPath);
  const setEntry = entries.find(
    (entry) => entry.type === RESOURCE_TYPES.set && normalize(entry.resref) === "sic11"
  );
  if (!setEntry) {
    throw new Error(`Missing sic11.set in ${hakPath}.`);
  }
  if (typeof __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles !== "function") {
    throw new Error("Missing parseAuroraSetTiles internal parser.");
  }
  return __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles(setEntry.bytes);
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
      size,
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size))
    });
  }
  return entries;
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
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function getNwnUserRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  return join(home, "Documents", "Neverwinter Nights");
}

function resolveMaybe(value) {
  return value ? resolve(repoRoot, value) : value;
}

function assertReadableFile(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sanitizeSegment(value) {
  return String(value ?? "artifact")
    .trim()
    .replace(/[^a-z0-9_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 120);
}

function timestampSegment() {
  return new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
}

function round(value, digits) {
  return Number(Number(value).toFixed(digits));
}

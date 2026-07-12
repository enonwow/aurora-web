#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RESOURCE_TYPES = {
  are: 2012
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

const options = parseArgs(process.argv.slice(2));
const modulePath = resolveMaybe(options.modulePath);
const areaResref = options.area ?? "cdx_mapflat01";
const label = sanitizeSegment(options.label ?? basename(modulePath ?? areaResref, ".mod"));
const outPath =
  resolveMaybe(options.out) ?? resolve(artifactRoot, `tile-layout-${label}-${timestampSegment()}.json`);

if (!modulePath) {
  throw new Error("Missing --modulePath.");
}
if (!existsSync(modulePath)) {
  throw new Error(`Missing module: ${modulePath}`);
}

const { readErfEntries, parseGff } = loadGeneratorReaders();
const erf = readErfEntries(readFileSync(modulePath), modulePath);
const areEntry = findEntry(erf, areaResref, RESOURCE_TYPES.are);
if (!areEntry) {
  throw new Error(`Missing ${areaResref}.are in ${modulePath}`);
}

const areGff = parseGff(areEntry.bytes, `${areaResref}.are`);
const root = areGff.structs[0];
const tileList = getField(root, "Tile_List");
const tileStructIndices = tileList?.typeId === FIELD_TYPE.LIST ? tileList.value ?? [] : [];
const areaDimensions = resolveAreaTileDimensions(root, tileStructIndices.length);
const tiles = tileStructIndices.map((structIndex, index) =>
  summarizeTile(areGff.structs[structIndex], index, areaDimensions.width)
);
const areaLighting = summarizeAreaLighting(root);
const tileLightSummary = summarizeTileLights(tiles);

const report = {
  version: "last-city-area-tile-layout-inspect/v1",
  generatedAt: new Date().toISOString(),
  modulePath,
  areaResref,
  areaDimensions,
  areaLighting,
  tileCount: tiles.length,
  tileLightSummary,
  tileIds: tiles.map((tile) => tile.tileId),
  tileOrientations: tiles.map((tile) => tile.orientation),
  tiles,
  safety: {
    launchesToolset: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    method: "offline ERF/GFF ARE tile inspection"
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
      areaResref,
      tileCount: report.tileCount,
      tileIds: report.tileIds,
      tileOrientations: report.tileOrientations,
      outPath,
      markdownPath: outPath.replace(/\.json$/u, ".md")
    },
    null,
    2
  )
);

function summarizeAreaLighting(rootStruct) {
  const labels = [
    "ShadowOpacity",
    "MoonAmbientColor",
    "MoonDiffuseColor",
    "SunAmbientColor",
    "SunDiffuseColor",
    "SunShadows",
    "MoonShadows",
    "FogColor",
    "FogAmount",
    "FogClipDist",
    "IsNight",
    "DayNightCycle"
  ];
  return Object.fromEntries(labels.map((label) => [label, getFieldValue(rootStruct, label)]));
}

function resolveAreaTileDimensions(rootStruct, tileCount) {
  const width = Number(getFieldValue(rootStruct, "Width"));
  const height = Number(getFieldValue(rootStruct, "Height"));
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error("ARE Width/Height are required for source-backed tile coordinates.");
  }
  if (width * height !== tileCount) {
    throw new Error(`ARE tile grid mismatch: Width=${width}, Height=${height}, Tile_List=${tileCount}.`);
  }
  return { width, height, tileCount };
}

function summarizeTile(tileStruct, index, areaWidth) {
  const fields = Object.fromEntries(
    (tileStruct?.fields ?? [])
      .filter((field) => field.label.startsWith("Tile_"))
      .map((field) => [field.label, field.value])
  );
  return {
    index,
    x: index % areaWidth,
    y: Math.floor(index / areaWidth),
    tileId: fields.Tile_ID ?? null,
    orientation: fields.Tile_Orientation ?? null,
    mainLight1: fields.Tile_MainLight1 ?? null,
    mainLight2: fields.Tile_MainLight2 ?? null,
    sourceLight1: fields.Tile_SrcLight1 ?? null,
    sourceLight2: fields.Tile_SrcLight2 ?? null,
    allTileFields: fields
  };
}

function summarizeTileLights(tiles) {
  const lightKeys = ["mainLight1", "mainLight2", "sourceLight1", "sourceLight2"];
  const nonZero = [];
  for (const tile of tiles) {
    for (const key of lightKeys) {
      if (Number(tile[key] ?? 0) !== 0) {
        nonZero.push({ index: tile.index, key, value: tile[key] });
      }
    }
  }
  return {
    allZero: nonZero.length === 0,
    nonZeroCount: nonZero.length,
    nonZero
  };
}

function renderMarkdown(report) {
  const rows = report.tiles
    .map(
      (tile) =>
        `| ${tile.index} | ${tile.x},${tile.y} | ${tile.tileId ?? ""} | ${tile.orientation ?? ""} | ${tile.mainLight1 ?? ""}/${tile.mainLight2 ?? ""} | ${tile.sourceLight1 ?? ""}/${tile.sourceLight2 ?? ""} |`
    )
    .join("\n");
  return `# Last City Area Tile Layout Inspect

Status: offline inspection only; this does not launch Aurora Toolset.

Module: \`${report.modulePath}\`

Area: \`${report.areaResref}\`

Tile count: \`${report.tileCount}\`

Source grid: \`${report.areaDimensions.width} x ${report.areaDimensions.height}\`

Tile IDs: \`${report.tileIds.join(",")}\`

Tile orientations: \`${report.tileOrientations.join(",")}\`

Tile lights all zero: \`${report.tileLightSummary.allZero}\`

Area lighting:

\`\`\`json
${JSON.stringify(report.areaLighting, null, 2)}
\`\`\`

| Index | Grid | Tile_ID | Orientation | Main lights | Source lights |
| ---: | --- | ---: | ---: | --- | --- |
${rows}
`;
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
  return Function("FIELD_TYPE", `${source.slice(start, end)}\nreturn ${functionName};`)(FIELD_TYPE);
}

function findEntry(erf, resref, type) {
  return erf.entries.find(
    (entry) => normalizeResref(entry.resref) === normalizeResref(resref) && entry.type === type
  );
}

function getField(struct, label) {
  return struct?.fields?.find((field) => field.label === label);
}

function getFieldValue(struct, label) {
  const field = getField(struct, label);
  return field ? field.value : null;
}

function normalizeResref(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sanitizeSegment(value) {
  return String(value ?? "area")
    .replace(/[^a-z0-9_.-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96) || "area";
}

function timestampSegment() {
  return new Date().toISOString().replace(/[-:]/gu, "").replace(/\..+$/u, "Z");
}

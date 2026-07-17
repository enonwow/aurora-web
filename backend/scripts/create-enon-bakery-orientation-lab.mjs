#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");

const AREA_RESREF = "enon_bakery";
const RESOURCE_TYPES = {
  are: 2012,
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
const START_LOCATION = {
  x: 5,
  y: 5,
  z: 0,
  dirX: 0,
  dirY: -1
};

const options = parseArgs(process.argv.slice(2));
const generatedAt = new Date().toISOString();
const stamp = generatedAt.replace(/[:.]/gu, "-");
const modulesDir = join(process.env.USERPROFILE ?? process.env.HOME ?? "", "Documents", "Neverwinter Nights", "modules");
const defaultBaseModulePath = join(modulesDir, "als_refbase.mod");
const defaultSourceDir = join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "Documents",
  "Neverwinter Nights",
  "LC-Decompiled",
  "temp0"
);
const artifactDir = resolve(
  options.outDir ?? join(backendRoot, "docs", "aurora-reverse", "artifacts", "areas-runtime-capture")
);
const outputModulePath = resolve(
  options.outputModulePath ?? join(modulesDir, `codex_enon_bakery_orientation_lab_${stamp}.mod`)
);
const baseModulePath = resolve(options.baseModulePath ?? defaultBaseModulePath);
const sourceDir = resolve(options.sourceDir ?? defaultSourceDir);
const manifestPath = resolve(
  options.manifestPath ?? join(artifactDir, `enon-bakery-orientation-lab-${stamp}.manifest.json`)
);
const generatorPath = resolve(scriptDir, "create-last-city-apartment-area.mjs");

main();

function main() {
  assertReadableFile(generatorPath, "generator");
  assertReadableFile(baseModulePath, "base lab module");
  assertReadableFile(join(sourceDir, `${AREA_RESREF}.are`), "source ARE");
  assertReadableFile(join(sourceDir, `${AREA_RESREF}.git`), "source GIT");
  assertReadableFile(join(sourceDir, `${AREA_RESREF}.gic`), "source GIC");

  const { readErfEntries, buildErfV10FromEntries, parseGff, buildGff } = loadGeneratorFunctions();
  const baseBytes = readFileSync(baseModulePath);
  const sourceAreBytes = readFileSync(join(sourceDir, `${AREA_RESREF}.are`));
  const sourceGitBytes = readFileSync(join(sourceDir, `${AREA_RESREF}.git`));
  const sourceGicBytes = readFileSync(join(sourceDir, `${AREA_RESREF}.gic`));
  const baseErf = readErfEntries(baseBytes, baseModulePath);
  const ifoEntry = findEntry(baseErf, "module", RESOURCE_TYPES.ifo);
  if (!ifoEntry) {
    throw new Error(`Base lab is missing module.ifo: ${baseModulePath}`);
  }

  const areSummary = summarizeArea(sourceAreBytes, parseGff);
  const nextIfoBytes = mutateModuleIfoForSingleArea(ifoEntry.bytes, parseGff, buildGff);
  const nextEntries = [];
  let replacedIfo = false;
  let insertedArea = false;
  for (const entry of baseErf.entries) {
    if ([RESOURCE_TYPES.are, RESOURCE_TYPES.git, RESOURCE_TYPES.gic].includes(entry.type)) {
      continue;
    }
    if (entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo) {
      nextEntries.push({ resref: "module", type: RESOURCE_TYPES.ifo, bytes: nextIfoBytes });
      replacedIfo = true;
      nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.are, bytes: sourceAreBytes });
      nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.gic, bytes: sourceGicBytes });
      nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.git, bytes: sourceGitBytes });
      insertedArea = true;
      continue;
    }
    nextEntries.push(entry);
  }
  if (!replacedIfo || !insertedArea) {
    throw new Error("Failed to build lab entries with module.ifo and enon_bakery resources.");
  }

  const outputBytes = buildErfV10FromEntries(baseErf.header, baseErf.localizedStrings, nextEntries);
  mkdirSync(dirname(outputModulePath), { recursive: true });
  if (existsSync(outputModulePath)) {
    const backupPath = `${outputModulePath}.pre-create-enon-bakery-lab-${stamp}.bak`;
    copyFileSync(outputModulePath, backupPath);
  }
  writeFileSync(outputModulePath, outputBytes);

  const finalErf = readErfEntries(readFileSync(outputModulePath), outputModulePath);
  const finalIfo = parseGff(findEntry(finalErf, "module", RESOURCE_TYPES.ifo).bytes, "module.ifo");
  const finalRoot = finalIfo.structs[0];
  const areaList = getField(finalRoot, "Mod_Area_list")?.value ?? [];
  const finalAreaNames = areaList.map((structIndex) => getField(finalIfo.structs[structIndex], "Area_Name")?.value);
  const manifest = {
    version: "enon-bakery-orientation-lab/v1",
    generatedAt,
    purpose:
      "Fresh small Toolset lab for visual proof of enon_bakery tile orientation. This module is created by the current proof workflow and is the only module target approved by this manifest.",
    safety: {
      createdByCurrentWorkflow: true,
      opensFullLastCityModule: false,
      opensBackupModule: false,
      sourceModulesOpenedInToolset: false,
      sourceFilesReadOnly: true
    },
    outputModulePath,
    outputModule: summarizeFile(outputModulePath),
    baseModulePath,
    baseModule: summarizeFile(baseModulePath),
    sourceDir,
    sourceFiles: {
      are: summarizeFile(join(sourceDir, `${AREA_RESREF}.are`)),
      git: summarizeFile(join(sourceDir, `${AREA_RESREF}.git`)),
      gic: summarizeFile(join(sourceDir, `${AREA_RESREF}.gic`))
    },
    area: areSummary,
    finalChecks: {
      entryCount: finalErf.entries.length,
      moduleSizeBytes: statSync(outputModulePath).size,
      hasAre: Boolean(findEntry(finalErf, AREA_RESREF, RESOURCE_TYPES.are)),
      hasGit: Boolean(findEntry(finalErf, AREA_RESREF, RESOURCE_TYPES.git)),
      hasGic: Boolean(findEntry(finalErf, AREA_RESREF, RESOURCE_TYPES.gic)),
      moduleStartArea: getField(finalRoot, "Mod_Entry_Area")?.value ?? null,
      moduleStartX: getField(finalRoot, "Mod_Entry_X")?.value ?? null,
      moduleStartY: getField(finalRoot, "Mod_Entry_Y")?.value ?? null,
      moduleAreaList: finalAreaNames
    }
  };
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: "created", outputModulePath, manifestPath, finalChecks: manifest.finalChecks }, null, 2));
}

function mutateModuleIfoForSingleArea(ifoBytes, parseGff, buildGff) {
  const gff = parseGff(ifoBytes, "module.ifo");
  const root = gff.structs[0];
  const areaList = getField(root, "Mod_Area_list");
  if (!areaList || areaList.typeId !== FIELD_TYPE.LIST) {
    throw new Error("module.ifo missing Mod_Area_list.");
  }
  const targetStructIndex = areaList.value[0];
  if (typeof targetStructIndex !== "number") {
    throw new Error("module.ifo Mod_Area_list has no first area struct.");
  }
  setFieldValue(gff.structs[targetStructIndex], "Area_Name", AREA_RESREF);
  areaList.value = [targetStructIndex];
  setFieldValue(root, "Mod_Entry_Area", AREA_RESREF);
  setFieldValue(root, "Mod_Entry_X", START_LOCATION.x);
  setFieldValue(root, "Mod_Entry_Y", START_LOCATION.y);
  setFieldValue(root, "Mod_Entry_Z", START_LOCATION.z);
  setFieldValue(root, "Mod_Entry_Dir_X", START_LOCATION.dirX);
  setFieldValue(root, "Mod_Entry_Dir_Y", START_LOCATION.dirY);
  return buildGff(gff);
}

function summarizeArea(areBytes, parseGff) {
  const gff = parseGff(areBytes, `${AREA_RESREF}.are`);
  const root = gff.structs[0];
  const tileStructIndices = getField(root, "Tile_List")?.value ?? [];
  const tiles = tileStructIndices.map((structIndex, index) => {
    const struct = gff.structs[structIndex];
    return {
      index,
      tileId: getField(struct, "Tile_ID")?.value ?? null,
      orientation: getField(struct, "Tile_Orientation")?.value ?? null,
      height: getField(struct, "Tile_Height")?.value ?? null
    };
  });
  return {
    resref: AREA_RESREF,
    width: getField(root, "Width")?.value ?? null,
    height: getField(root, "Height")?.value ?? null,
    tileset: getField(root, "Tileset")?.value ?? null,
    tag: getField(root, "Tag")?.value ?? null,
    resRef: getField(root, "ResRef")?.value ?? null,
    tileCount: tiles.length,
    tileIds: tiles.map((tile) => tile.tileId),
    tileOrientations: tiles.map((tile) => tile.orientation),
    tiles
  };
}

function loadGeneratorFunctions() {
  const source = readFileSync(generatorPath, "utf8");
  return {
    readErfEntries: evaluateFunctionFromSource(source, "readErfEntries", "buildErfV10FromEntries"),
    buildErfV10FromEntries: evaluateFunctionFromSource(source, "buildErfV10FromEntries", "parseGff"),
    parseGff: evaluateFunctionFromSource(source, "parseGff", "buildGff"),
    buildGff: evaluateFunctionFromSource(source, "buildGff", "deepClone")
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
  return erf.entries.find((entry) => normalizeResref(entry.resref) === normalizeResref(resref) && entry.type === type);
}

function getField(struct, label) {
  return struct?.fields?.find((field) => field.label === label);
}

function setFieldValue(struct, label, value) {
  const field = getField(struct, label);
  if (!field) {
    throw new Error(`Missing GFF field ${label}.`);
  }
  field.value = value;
}

function summarizeFile(path) {
  const bytes = readFileSync(path);
  return {
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

function assertReadableFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function normalizeResref(value) {
  return String(value ?? "").trim().toLowerCase();
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

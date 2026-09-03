#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node"
});
require("ts-node/register/transpile-only");

const {
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");
const {
  __moduleSnapshotAreaRepositoryInternals
} = require("../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository");
const {
  readNwnErfResource
} = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");
const {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} = require("../src/modules/runtime-settings/application/nwn-key-bif-resource-reader");
const {
  extractModuleIfoHakList
} = require("../src/modules/runtime-settings/application/runtime-settings.application.service");

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
  STRUCT: 14,
  LIST: 15
};

const AREA_LIST_KEYS = [
  "placeables",
  "doors",
  "creatures",
  "encounters",
  "items",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
];

const DEFAULT_MODULE_DECOMPILED_PATH = join(
  process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\enonw",
  "Documents",
  "Neverwinter Nights",
  "LC-Decompiled",
  "temp0"
);

const backendRoot = resolve(import.meta.dirname, "..");
const runtimeSettingsPath = resolve(backendRoot, "config", "runtime-settings.json");
const defaultOutputRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "areas-source-pack"
);

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  console.log(
    `
Usage:
  node backend/scripts/build-area-source-proof-pack.mjs --area enon_bakery

Options:
  --area <resref>        Area resref to export. Defaults to enon_bakery.
  --modulePath <path>   Decompiled module directory with .are/.git/.gic/module.ifo.
  --outDir <path>       Output directory. Defaults under backend/docs/aurora-reverse/artifacts.
  --name <name>         Output folder name. Defaults to <area>-source-pack-<timestamp>.
`.trim()
  );
  process.exit(0);
}

await main();

async function main() {
  const generatedAt = new Date().toISOString();
  const areaResref = normalizeResref(options.area ?? "enon_bakery");
  const modulePath = resolve(options.modulePath ?? DEFAULT_MODULE_DECOMPILED_PATH);
  const outputName =
    options.name ?? `${areaResref}-source-pack-${generatedAt.replace(/[:.]/gu, "").replace("T", "T").replace("Z", "Z")}`;
  const outputDir = resolve(options.outDir ?? defaultOutputRoot, outputName);
  const moduleStat = await statSafe(modulePath);
  const packedModule = moduleStat?.isFile() === true;

  const sourceFiles = {
    are: packedModule ? `${modulePath}::${areaResref}.are` : join(modulePath, `${areaResref}.are`),
    git: packedModule ? `${modulePath}::${areaResref}.git` : join(modulePath, `${areaResref}.git`),
    gic: packedModule ? `${modulePath}::${areaResref}.gic` : join(modulePath, `${areaResref}.gic`),
    ifo: packedModule ? `${modulePath}::module.ifo` : join(modulePath, "module.ifo")
  };

  const [areBytes, gitBytes, gicBytes, ifoBytes] = await Promise.all([
    readAreaResource({ modulePath, packedModule, resref: areaResref, resourceType: 2012, sourcePath: sourceFiles.are, required: true }),
    readAreaResource({ modulePath, packedModule, resref: areaResref, resourceType: 2023, sourcePath: sourceFiles.git, required: true }),
    readAreaResource({ modulePath, packedModule, resref: areaResref, resourceType: 2046, sourcePath: sourceFiles.gic, required: false }),
    readAreaResource({ modulePath, packedModule, resref: "module", resourceType: 2014, sourcePath: sourceFiles.ifo, required: false })
  ]);

  const parsedAre = parseAreaMetadataFromAreGff(areBytes);
  if (!parsedAre) {
    throw new Error(`Could not parse ARE source: ${sourceFiles.are}`);
  }
  const parsedGit = parseAreaObjectsFromGitGff(gitBytes);
  if (!parsedGit) {
    throw new Error(`Could not parse GIT source: ${sourceFiles.git}`);
  }

  const tilesetResref = normalizeResref(parsedAre.tileSet ?? "");
  const moduleIfoHakListAuthoritative = Boolean(ifoBytes);
  const moduleIfoHakList = ifoBytes ? extractModuleIfoHakList(ifoBytes) : [];
  const tilesetSetSource = tilesetResref
    ? await resolveTilesetSetSource(modulePath, tilesetResref, moduleIfoHakList, {
        moduleIfoHakListAuthoritative
      })
    : null;
  const setTiles =
    tilesetSetSource?.bytes && typeof __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles === "function"
      ? __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles(tilesetSetSource.bytes)
      : new Map();

  const objectRows = buildObjectRows(areaResref, parsedGit);
  const tileRows = buildTileRows(parsedAre);
  const tileContractRows = buildTileContractRows(parsedAre, setTiles);
  const counts = Object.fromEntries(
    AREA_LIST_KEYS.map((key) => [key, Array.isArray(parsedGit[key]) ? parsedGit[key].length : 0])
  );
  counts.total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const moduleIfoAreaEntry = ifoBytes
    ? buildModuleIfoAreaEntry(ifoBytes, areaResref, sourceFiles.ifo)
    : {
        status: "missing",
        sourcePath: sourceFiles.ifo,
        areaResref
      };

  const rawAreSummary = {
    version: "aurora-area-source-pack/raw-are-summary/v1",
    generatedAt,
    source: await summarizeSourceFile(sourceFiles.are, areBytes),
    parsed: parsedAre
  };

  const rawGitSummary = {
    version: "aurora-area-source-pack/raw-git-summary/v1",
    generatedAt,
    source: await summarizeSourceFile(sourceFiles.git, gitBytes),
    sourceFileType: parsedGit.sourceFileType,
    sourceFileVersion: parsedGit.sourceFileVersion,
    sourceStructTypeId: parsedGit.sourceStructTypeId,
    soundIds: parsedGit.soundIds,
    dependencyFingerprint: parsedGit.dependencyFingerprint,
    counts,
    visualTransformCounts: summarizeVisualTransformCounts(parsedGit),
    objects: Object.fromEntries(
      AREA_LIST_KEYS.map((key) => [key, parsedGit[key] ?? []])
    )
  };

  const rawGicStatus = gicBytes
    ? {
        version: "aurora-area-source-pack/raw-gic-status/v1",
        generatedAt,
        status: "present",
        source: await summarizeSourceFile(sourceFiles.gic, gicBytes),
        header: summarizeGffHeader(gicBytes)
      }
    : {
        version: "aurora-area-source-pack/raw-gic-status/v1",
        generatedAt,
        status: "missing",
        sourcePath: sourceFiles.gic
      };

  const tilesetSetSummary = buildTilesetSetSummary({
    generatedAt,
    tilesetResref,
    tilesetSetSource,
    moduleIfoHakList,
    moduleIfoHakListAuthoritative,
    setTiles,
    parsedAre,
    tileContractRows
  });

  const contract = {
    version: "aurora-area-source-pack/transform-contract/v1",
    generatedAt,
    areaResref,
    conclusion:
      "Tiles and GIT objects use separate rotation contracts. Tile orientation comes from ARE Tile_List and is a discrete 0..3 tile/grid value. Placeable bearing comes from GIT orientation/bearing fields. VisualTransform is a separate visual-only payload and must not be merged into tile orientation or GIT placement.",
    tileContract: {
      source: "ARE Tile_List + SET tile section",
      fields: [
        "ARE Tile_ID",
        "ARE Tile_Orientation",
        "ARE Tile_Height",
        "SET Model",
        "SET ImageMap2D",
        "SET Orientation",
        "SET VisibilityNode",
        "SET DoorVisibilityNode"
      ],
      unit: "quarter-turns",
      outputRows: "tile-contract.csv",
      rows: tileRows.length
    },
    objectContract: {
      source: "GIT object lists",
      placementFields: ["XPosition/Position.X", "YPosition/Position.Y", "ZPosition/Position.Z", "Bearing or XOrientation/YOrientation"],
      visualTransformFields: ["VisTransformList/VisualTransform scale, rotate, translate"],
      outputRows: "objects.csv",
      rows: objectRows.length
    }
  };

  const manifest = {
    version: "aurora-area-source-pack/manifest/v1",
    generatedAt,
    areaResref,
    modulePath,
    outputDir,
    sourceFiles,
    parsed: {
      are: {
        name: parsedAre.name,
        tag: parsedAre.tag,
        width: parsedAre.width,
        height: parsedAre.height,
        tileSet: parsedAre.tileSet,
        tileCount: parsedAre.tileCount
      },
      tilesetSet: {
        status: tilesetSetSummary.status,
        tilesetResref,
        sourcePath: tilesetSetSummary.source?.path ?? null,
        parsedTileCount: tilesetSetSummary.parsedTileCount,
        referencedTileCount: tilesetSetSummary.referencedTileCount,
        referencedModelResolvedCount: tilesetSetSummary.referencedModelResolvedCount,
        referencedImageMap2DCount: tilesetSetSummary.referencedImageMap2DCount,
        sourceResolution: tilesetSetSummary.sourceResolution
      },
      git: {
        counts,
        visualTransformCounts: rawGitSummary.visualTransformCounts
      },
      gic: {
        status: rawGicStatus.status
      },
      moduleIfo: {
        status: moduleIfoAreaEntry.status,
        areaCount: moduleIfoAreaEntry.areaCount ?? null,
        areaIndex: moduleIfoAreaEntry.areaIndex ?? null
      }
    },
    files: {
      rawAreSummary: "raw.are.summary.json",
      rawGitSummary: "raw.git.summary.json",
      rawGicStatus: "raw.gic.status.json",
      moduleIfoAreaEntry: "module-ifo-area-entry.json",
      tilesetSetSummary: "tileset.set.summary.json",
      tilesCsv: "tiles.csv",
      tileContractCsv: "tile-contract.csv",
      objectsCsv: "objects.csv",
      transformContract: "transform-contract.json",
      verdict: "verdict.md"
    }
  };

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeJson(join(outputDir, "manifest.json"), manifest),
    writeJson(join(outputDir, "raw.are.summary.json"), rawAreSummary),
    writeJson(join(outputDir, "raw.git.summary.json"), rawGitSummary),
    writeJson(join(outputDir, "raw.gic.status.json"), rawGicStatus),
    writeJson(join(outputDir, "module-ifo-area-entry.json"), moduleIfoAreaEntry),
    writeJson(join(outputDir, "tileset.set.summary.json"), tilesetSetSummary),
    writeJson(join(outputDir, "transform-contract.json"), contract),
    writeFile(join(outputDir, "tiles.csv"), `${toCsv(tileRows)}\n`, "utf-8"),
    writeFile(join(outputDir, "tile-contract.csv"), `${toCsv(tileContractRows)}\n`, "utf-8"),
    writeFile(join(outputDir, "objects.csv"), `${toCsv(objectRows)}\n`, "utf-8"),
    writeFile(join(outputDir, "verdict.md"), buildVerdictMarkdown(manifest, contract), "utf-8")
  ]);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        outputDir,
        areaResref,
        tileCount: tileRows.length,
        objectCount: objectRows.length,
        counts,
        visualTransformCounts: rawGitSummary.visualTransformCounts,
        tilesetSet: manifest.parsed.tilesetSet,
        moduleIfoStatus: moduleIfoAreaEntry.status,
        gicStatus: rawGicStatus.status
      },
      null,
      2
    )
  );
}

async function readAreaResource({ modulePath, packedModule, resref, resourceType, sourcePath, required }) {
  if (!packedModule) return required ? readRequired(sourcePath) : readOptional(sourcePath);
  try {
    const bytes = await readNwnErfResource(modulePath, resref, resourceType);
    if (bytes) return bytes;
  } catch (error) {
    if (required) throw new Error(`Required packed-module resource is missing or unreadable: ${sourcePath}. ${error.message}`);
    return null;
  }
  if (required) throw new Error(`Required packed-module resource is missing: ${sourcePath}.`);
  return null;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

async function readRequired(path) {
  try {
    return await readFile(path);
  } catch (error) {
    throw new Error(`Required source file is missing or unreadable: ${path}. ${error.message}`);
  }
}

async function readOptional(path) {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

async function statSafe(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function readRuntimeSettings() {
  try {
    return JSON.parse(await readFile(runtimeSettingsPath, "utf-8"));
  } catch {
    return null;
  }
}

async function resolveTilesetSetSource(
  modulePath,
  tilesetResref,
  moduleIfoHakList = [],
  { moduleIfoHakListAuthoritative = false } = {}
) {
  const runtimeSettings = await readRuntimeSettings();
  const hakResolution = resolveTileHakPaths(runtimeSettings, moduleIfoHakList, {
    moduleIfoHakListAuthoritative
  });
  const candidates = [
    join(modulePath, `${tilesetResref}.set`),
    join(modulePath, `${tilesetResref.toLowerCase()}.set`),
    join(modulePath, `${tilesetResref.toUpperCase()}.set`)
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const bytes = await readOptional(candidate);
    if (bytes) {
      return {
        status: "present",
        sourceKind: "loose-set",
        path: candidate,
        bytes,
        sourceResolution: hakResolution.summary,
        attempts: [{ source: "module-path-loose-set", path: candidate, exists: true }]
      };
    }
  }
  const attempts = candidates.map((candidate) => ({
    source: "module-path-loose-set",
    path: candidate,
    exists: false
  }));

  for (const hakPath of hakResolution.paths) {
    const fileStat = await statSafe(hakPath);
    const attempt = {
      source: hakResolution.summary.selectedHakSource,
      path: hakPath,
      exists: Boolean(fileStat?.isFile()),
      resourceType: "SET",
      resref: tilesetResref
    };
    attempts.push(attempt);
    if (!fileStat?.isFile()) {
      continue;
    }
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        tilesetResref,
        NWN_KEY_BIF_RESOURCE_TYPES.SET
      );
      attempt.found = Boolean(bytes);
      if (bytes) {
        return {
          status: "present",
          sourceKind: "hak-erf-set",
          path: hakPath,
          resref: tilesetResref,
          bytes,
          sourceResolution: hakResolution.summary,
          attempts
        };
      }
    } catch (error) {
      attempt.error = formatErrorForSummary(error);
    }
  }

  const vanillaDataPath = mapRuntimeHostPath(runtimeSettings?.paths?.vanillaDataPath);
  for (const keyPath of resolveVanillaKeyFileCandidates(vanillaDataPath)) {
    const fileStat = await statSafe(keyPath);
    const attempt = {
      source: "runtime-vanilla-key-bif",
      path: keyPath,
      exists: Boolean(fileStat?.isFile()),
      resourceType: "SET",
      resref: tilesetResref
    };
    attempts.push(attempt);
    if (!fileStat?.isFile() || !vanillaDataPath) {
      continue;
    }
    try {
      const reader = await NwnKeyBifResourceReader.open(keyPath, vanillaDataPath);
      attempt.readerOpened = true;
      attempt.hasResource = reader.has(tilesetResref, NWN_KEY_BIF_RESOURCE_TYPES.SET);
      const bytes = await reader.read(tilesetResref, NWN_KEY_BIF_RESOURCE_TYPES.SET);
      if (bytes) {
        return {
          status: "present",
          sourceKind: "vanilla-key-bif-set",
          path: keyPath,
          resref: tilesetResref,
          bytes,
          sourceResolution: hakResolution.summary,
          attempts
        };
      }
    } catch (error) {
      attempt.error = formatErrorForSummary(error);
    }
  }

  return {
    status: "missing",
    path: candidates[0],
    bytes: null,
    sourceResolution: hakResolution.summary,
    attempts
  };
}

function mapRuntimeHostPath(value) {
  const normalized = String(value ?? "").trim().replace(/\\/gu, "/");
  if (!normalized) {
    return null;
  }
  if (/^[a-z]:\//iu.test(normalized)) {
    return normalized;
  }
  const mappings = [
    {
      prefix: "/host/nwn-user",
      hostRoot: join("C:", "Users", "enonw", "Documents", "Neverwinter Nights")
    },
    {
      prefix: "/host/nwn-docs",
      hostRoot: join("C:", "Users", "enonw", "Documents", "Neverwinter Nights")
    },
    {
      prefix: "/host/nwn-game",
      hostRoot: join("C:", "Program Files (x86)", "Steam", "steamapps", "common", "Neverwinter Nights")
    }
  ];
  for (const mapping of mappings) {
    if (normalized === mapping.prefix || normalized.startsWith(`${mapping.prefix}/`)) {
      const suffix = normalized.slice(mapping.prefix.length).replace(/^\/+/u, "");
      return suffix ? join(mapping.hostRoot, ...suffix.split("/")) : mapping.hostRoot;
    }
  }
  return normalized;
}

function resolveTileHakPaths(
  runtimeSettings,
  moduleIfoHakList = [],
  { moduleIfoHakListAuthoritative = false } = {}
) {
  const hakDirectoryPath = mapRuntimeHostPath(runtimeSettings?.paths?.hakDirectoryPath);
  const tileSource = runtimeSettings?.sources?.tile ?? {};
  const profileId = tileSource.hakProfileId ?? "lc_tiles";
  const profile = runtimeSettings?.hakProfiles?.[profileId] ?? [];
  const priority = Array.isArray(tileSource.hakPriorityList) ? tileSource.hakPriorityList : [];
  const sourceHaks =
    moduleIfoHakListAuthoritative
      ? moduleIfoHakList
      : priority.length > 0
        ? priority
        : profile;
  const selectedHakSource = moduleIfoHakListAuthoritative
    ? "module-ifo"
    : priority.length > 0
      ? "runtime-explicit-priority-fallback"
      : "runtime-hak-profile-fallback";
  const policy = moduleIfoHakListAuthoritative
    ? "module-ifo-hak-list-then-vanilla"
    : priority.length > 0
      ? "runtime-explicit-priority-fallback-then-vanilla"
      : "runtime-hak-profile-fallback-then-vanilla";
  const haks = sourceHaks
    .flatMap((name) => {
      const text = String(name ?? "").trim();
      return text.startsWith("+") ? [text, text.replace(/^\+/u, "")] : [text];
    })
    .filter(Boolean);
  const selectedHakNames = [...new Set(haks)];
  return {
    paths: hakDirectoryPath
      ? selectedHakNames.map((name) => join(hakDirectoryPath, toHakFileName(name)))
      : [],
    summary: {
      policy,
      selectedHakSource,
      moduleIfoHakListAuthoritative,
      moduleIfoHakList: [...moduleIfoHakList],
      selectedHakNames,
      runtimeFallbackProfileId: profileId,
      runtimeFallbackProfileIgnored: moduleIfoHakListAuthoritative
    }
  };
}

function toHakFileName(name) {
  const normalized = String(name ?? "").trim();
  return /\.hak$/iu.test(normalized) ? normalized : `${normalized}.hak`;
}

function resolveVanillaKeyFileCandidates(vanillaDataPath) {
  if (!vanillaDataPath) {
    return [];
  }
  return ["nwn_base.key", "nwn_retail.key"].map((name) => join(vanillaDataPath, name));
}

function formatErrorForSummary(error) {
  return error instanceof Error ? error.message : String(error);
}

async function summarizeSourceFile(path, bytes) {
  const packedSeparator = path.indexOf("::");
  const containerPath = packedSeparator >= 0 ? path.slice(0, packedSeparator) : path;
  const info = await stat(containerPath);
  return {
    path,
    ...(packedSeparator >= 0 ? { containerPath, sourceKind: "packed-module-erf" } : { sourceKind: "loose-file" }),
    sizeBytes: bytes.length,
    mtime: info.mtime.toISOString(),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    header: summarizeGffHeader(bytes)
  };
}

async function summarizePlainSourceFile(path, bytes) {
  const packedSeparator = path.indexOf("::");
  const containerPath = packedSeparator >= 0 ? path.slice(0, packedSeparator) : path;
  const info = await stat(containerPath);
  return {
    path,
    ...(packedSeparator >= 0 ? { containerPath, sourceKind: "packed-module-erf" } : { sourceKind: "loose-file" }),
    sizeBytes: bytes.length,
    mtime: info.mtime.toISOString(),
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

function summarizeGffHeader(bytes) {
  if (!bytes || bytes.length < 56) {
    return { status: "too-small" };
  }
  return {
    status: "read",
    fileType: bytes.toString("ascii", 0, 4).trim(),
    fileVersion: bytes.toString("ascii", 4, 8).trim(),
    structCount: bytes.readUInt32LE(12),
    fieldCount: bytes.readUInt32LE(20),
    labelCount: bytes.readUInt32LE(28)
  };
}

function buildTileContractRows(parsedAre, setTiles) {
  return (parsedAre.tiles ?? []).map((tile) => {
    const setTile = tile.tileId === undefined ? undefined : setTiles.get(tile.tileId);
    const sourceOrientation = normalizeQuarterTurn(tile.orientation ?? 0);
    const currentWebMirrorOrientation = normalizeQuarterTurn(-sourceOrientation);
    const tilesetOrientation = normalizeOptionalQuarterTurn(setTile?.orientation);
    const modelResRef = normalizeResref(tile.modelResRef ?? setTile?.modelResRef ?? "");
    const modelResRefSource = tile.modelResRef
      ? "are-tile-list"
      : setTile?.modelResRef
        ? "set-tile-section"
        : "";
    return {
      index: tile.index,
      row: tile.row,
      col: tile.col,
      tileId: tile.tileId ?? "",
      areModelResRef: tile.modelResRef ?? "",
      setModelResRef: setTile?.modelResRef ?? "",
      resolvedModelResRef: modelResRef,
      modelResRefSource,
      imageMap2D: setTile?.imageMap2D ?? "",
      sourceTileOrientation: tile.orientation ?? "",
      sourceAuroraYawDegreesCcw: sourceOrientation * 90,
      currentWebMirrorOrientation,
      currentWebMirrorYawDegrees: currentWebMirrorOrientation * 90,
      tilesetOrientation: tilesetOrientation ?? "",
      tilesetYawDegreesCcw: tilesetOrientation === undefined ? "" : tilesetOrientation * 90,
      height: tile.height ?? "",
      pathNode: setTile?.pathNode ?? "",
      visibilityNode: setTile?.visibilityNode ?? "",
      visibilityOrientation: setTile?.visibilityOrientation ?? "",
      doorVisibilityNode: setTile?.doorVisibilityNode ?? "",
      doorVisibilityOrientation: setTile?.doorVisibilityOrientation ?? "",
      topEdge: setTile?.edges?.top ?? "",
      rightEdge: setTile?.edges?.right ?? "",
      bottomEdge: setTile?.edges?.bottom ?? "",
      leftEdge: setTile?.edges?.left ?? "",
      topLeftHeight: setTile?.cornerHeights?.topLeft ?? "",
      topRightHeight: setTile?.cornerHeights?.topRight ?? "",
      bottomLeftHeight: setTile?.cornerHeights?.bottomLeft ?? "",
      bottomRightHeight: setTile?.cornerHeights?.bottomRight ?? "",
      mainLight1: tile.mainLight1 ?? "",
      mainLight2: tile.mainLight2 ?? "",
      sourceLight1: tile.sourceLight1 ?? "",
      sourceLight2: tile.sourceLight2 ?? "",
      animLoop1: tile.animLoop1 ?? "",
      animLoop2: tile.animLoop2 ?? "",
      animLoop3: tile.animLoop3 ?? "",
      contractLane: "are-tile-list-plus-set-tile-section"
    };
  });
}

function buildTileRows(parsedAre) {
  return (parsedAre.tiles ?? []).map((tile) => {
    const sourceOrientation = normalizeQuarterTurn(tile.orientation ?? 0);
    const currentWebMirrorOrientation = normalizeQuarterTurn(-sourceOrientation);
    return {
      index: tile.index,
      row: tile.row,
      col: tile.col,
      tileId: tile.tileId ?? "",
      modelResRef: tile.modelResRef ?? "",
      sourceTileOrientation: tile.orientation ?? "",
      sourceAuroraYawDegreesCcw: sourceOrientation * 90,
      currentWebMirrorOrientation,
      currentWebMirrorYawDegrees: currentWebMirrorOrientation * 90,
      height: tile.height ?? "",
      mainLight1: tile.mainLight1 ?? "",
      mainLight2: tile.mainLight2 ?? "",
      sourceLight1: tile.sourceLight1 ?? "",
      sourceLight2: tile.sourceLight2 ?? "",
      animLoop1: tile.animLoop1 ?? "",
      animLoop2: tile.animLoop2 ?? "",
      animLoop3: tile.animLoop3 ?? "",
      contractLane: "tile-only"
    };
  });
}

function buildTilesetSetSummary({
  generatedAt,
  tilesetResref,
  tilesetSetSource,
  moduleIfoHakList,
  moduleIfoHakListAuthoritative,
  setTiles,
  parsedAre,
  tileContractRows
}) {
  const referencedTileIds = [...new Set((parsedAre.tiles ?? [])
    .map((tile) => tile.tileId)
    .filter((tileId) => tileId !== undefined))]
    .sort((left, right) => left - right);
  const referencedTiles = tileContractRows.map((row) => ({
    index: row.index,
    row: row.row,
    col: row.col,
    tileId: row.tileId,
    resolvedModelResRef: row.resolvedModelResRef,
    modelResRefSource: row.modelResRefSource,
    imageMap2D: row.imageMap2D,
    sourceTileOrientation: row.sourceTileOrientation,
    currentWebMirrorOrientation: row.currentWebMirrorOrientation,
    tilesetOrientation: row.tilesetOrientation,
    visibilityNode: row.visibilityNode,
    visibilityOrientation: row.visibilityOrientation,
    doorVisibilityNode: row.doorVisibilityNode,
    doorVisibilityOrientation: row.doorVisibilityOrientation
  }));
  const uniqueResolvedModels = [...new Set(tileContractRows
    .map((row) => row.resolvedModelResRef)
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const uniqueImageMaps = [...new Set(tileContractRows
    .map((row) => row.imageMap2D)
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  return {
    version: "aurora-area-source-pack/tileset-set-summary/v1",
    generatedAt,
    status: tilesetSetSource?.status ?? "not-requested",
    tilesetResref,
    sourceResolution: tilesetSetSource?.sourceResolution ?? {
      policy: moduleIfoHakListAuthoritative
        ? "module-ifo-hak-list-then-vanilla"
        : "runtime-fallback-then-vanilla",
      selectedHakSource: moduleIfoHakListAuthoritative ? "module-ifo" : "runtime-fallback",
      moduleIfoHakListAuthoritative,
      moduleIfoHakList: [...moduleIfoHakList],
      selectedHakNames: []
    },
    source: tilesetSetSource?.bytes
      ? {
          path: tilesetSetSource.path,
          sizeBytes: tilesetSetSource.bytes.length,
          sha256: createHash("sha256").update(tilesetSetSource.bytes).digest("hex")
        }
      : null,
    parser: "__moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles",
    parsedTileCount: setTiles.size,
    referencedTileIds,
    referencedTileCount: tileContractRows.length,
    referencedModelResolvedCount: tileContractRows.filter((row) => row.resolvedModelResRef).length,
    referencedImageMap2DCount: tileContractRows.filter((row) => row.imageMap2D).length,
    uniqueResolvedModels,
    uniqueImageMaps,
    referencedTiles
  };
}

function buildObjectRows(areaResref, parsedGit) {
  const rows = [];
  for (const key of AREA_LIST_KEYS) {
    const list = parsedGit[key] ?? [];
    list.forEach((entry, index) => {
      const vt = entry.visualTransform;
      rows.push({
        index: rows.length,
        listIndex: index,
        kind: entry.listKind,
        listKey: key,
        objectSourceId: `${areaResref}:${entry.listKind}:${index}`,
        templateResRef: entry.templateResRef ?? "",
        tag: entry.tag ?? "",
        localizedName: entry.localizedName ?? "",
        x: entry.x,
        y: entry.y,
        z: entry.z,
        bearingDegrees: entry.bearing,
        bearingRadians: roundNumber((entry.bearing * Math.PI) / 180),
        isStatic: entry.isStatic ?? "",
        appearanceType: entry.appearanceType ?? "",
        genericType: entry.genericType ?? "",
        hasVisualTransform: Boolean(vt),
        vtScaleX: vt?.scaleX ?? "",
        vtScaleY: vt?.scaleY ?? "",
        vtScaleZ: vt?.scaleZ ?? "",
        vtRotateX: vt?.rotateX ?? "",
        vtRotateY: vt?.rotateY ?? "",
        vtRotateZ: vt?.rotateZ ?? "",
        vtTranslateX: vt?.translateX ?? "",
        vtTranslateY: vt?.translateY ?? "",
        vtTranslateZ: vt?.translateZ ?? "",
        contractLane: "git-object-placement-plus-optional-visual-transform"
      });
    });
  }
  return rows;
}

function summarizeVisualTransformCounts(parsedGit) {
  return Object.fromEntries(
    AREA_LIST_KEYS.map((key) => {
      const list = parsedGit[key] ?? [];
      return [key, list.filter((entry) => Boolean(entry.visualTransform)).length];
    })
  );
}

function buildModuleIfoAreaEntry(bytes, areaResref, sourcePath) {
  const gff = parseGff(bytes, sourcePath);
  if (gff.fileType.trim() !== "IFO") {
    return {
      status: "wrong-file-type",
      sourcePath,
      fileType: gff.fileType,
      areaResref
    };
  }

  const root = gff.structs[0];
  const areaList = getField(root, "Mod_Area_list");
  const areaStructIndices = areaList?.typeId === FIELD_TYPE.LIST ? areaList.value : [];
  const areas = areaStructIndices
    .map((structIndex, index) => {
      const struct = gff.structs[structIndex];
      const name = getField(struct, "Area_Name")?.value ?? "";
      return { index, areaName: String(name).toLowerCase() };
    })
    .filter((entry) => entry.areaName);
  const match = areas.find((entry) => entry.areaName === areaResref);

  return {
    version: "aurora-area-source-pack/module-ifo-area-entry/v1",
    status: match ? "present" : "missing-from-mod-area-list",
    sourcePath,
    fileType: gff.fileType.trim(),
    fileVersion: gff.fileVersion.trim(),
    areaResref,
    areaCount: areas.length,
    areaIndex: match?.index ?? null,
    entryArea: getField(root, "Mod_Entry_Area")?.value ?? null,
    entryPosition: {
      x: getField(root, "Mod_Entry_X")?.value ?? null,
      y: getField(root, "Mod_Entry_Y")?.value ?? null,
      z: getField(root, "Mod_Entry_Z")?.value ?? null,
      dirX: getField(root, "Mod_Entry_Dir_X")?.value ?? null,
      dirY: getField(root, "Mod_Entry_Dir_Y")?.value ?? null
    },
    areaSample: areas.slice(0, 24)
  };
}

function parseGff(bytes, sourceLabel) {
  if (bytes.length < 56) {
    throw new Error(`GFF file too small: ${sourceLabel}`);
  }

  const header = {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    listIndicesOffset: bytes.readUInt32LE(48)
  };

  const labels = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    labels.push(
      bytes
        .subarray(header.labelOffset + index * 16, header.labelOffset + index * 16 + 16)
        .toString("ascii")
        .replace(/\0.*$/u, "")
    );
  }

  const structEntries = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * 12;
    structEntries.push({
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8)
    });
  }

  const fieldEntries = [];
  for (let index = 0; index < header.fieldCount; index += 1) {
    const offset = header.fieldOffset + index * 12;
    fieldEntries.push({
      typeId: bytes.readUInt32LE(offset),
      label: labels[bytes.readUInt32LE(offset + 4)] ?? "",
      dataOrOffset: bytes.readUInt32LE(offset + 8)
    });
  }

  function readStructFieldIndices(structEntry) {
    if (structEntry.fieldCount === 0) {
      return [];
    }
    if (structEntry.fieldCount === 1) {
      return [structEntry.dataOrOffset];
    }
    const indices = [];
    for (let index = 0; index < structEntry.fieldCount; index += 1) {
      indices.push(
        bytes.readUInt32LE(header.fieldIndicesOffset + structEntry.dataOrOffset + index * 4)
      );
    }
    return indices;
  }

  function readListIndices(fieldEntry) {
    const offset = header.listIndicesOffset + fieldEntry.dataOrOffset;
    const count = bytes.readUInt32LE(offset);
    const indices = [];
    for (let index = 0; index < count; index += 1) {
      indices.push(bytes.readUInt32LE(offset + 4 + index * 4));
    }
    return indices;
  }

  function readFieldValue(fieldEntry) {
    const offset = header.fieldDataOffset + fieldEntry.dataOrOffset;
    switch (fieldEntry.typeId) {
      case FIELD_TYPE.BYTE:
      case FIELD_TYPE.CHAR:
        return fieldEntry.dataOrOffset & 0xff;
      case FIELD_TYPE.WORD:
      case FIELD_TYPE.SHORT:
        return fieldEntry.dataOrOffset & 0xffff;
      case FIELD_TYPE.DWORD:
        return fieldEntry.dataOrOffset >>> 0;
      case FIELD_TYPE.INT:
        return fieldEntry.dataOrOffset | 0;
      case FIELD_TYPE.FLOAT: {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt32LE(fieldEntry.dataOrOffset, 0);
        return buffer.readFloatLE(0);
      }
      case FIELD_TYPE.CEXOSTRING: {
        const length = bytes.readUInt32LE(offset);
        return bytes.subarray(offset + 4, offset + 4 + length).toString("utf-8");
      }
      case FIELD_TYPE.RESREF: {
        const length = bytes.readUInt8(offset);
        return bytes.subarray(offset + 1, offset + 1 + length).toString("ascii");
      }
      case FIELD_TYPE.CEXOLOCSTRING: {
        const strRef = bytes.readUInt32LE(offset + 4);
        const count = bytes.readUInt32LE(offset + 8);
        const entries = [];
        let cursor = offset + 12;
        for (let index = 0; index < count; index += 1) {
          const id = bytes.readUInt32LE(cursor);
          const length = bytes.readUInt32LE(cursor + 4);
          const text = bytes.subarray(cursor + 8, cursor + 8 + length).toString("utf-8");
          entries.push({ id, text });
          cursor += 8 + length;
        }
        return { strRef, entries };
      }
      case FIELD_TYPE.STRUCT:
        return fieldEntry.dataOrOffset;
      case FIELD_TYPE.LIST:
        return readListIndices(fieldEntry);
      default:
        return null;
    }
  }

  const structs = structEntries.map((structEntry) => ({
    typeId: structEntry.typeId,
    fields: readStructFieldIndices(structEntry).map((fieldIndex) => {
      const fieldEntry = fieldEntries[fieldIndex];
      return {
        label: fieldEntry.label,
        typeId: fieldEntry.typeId,
        value: readFieldValue(fieldEntry)
      };
    })
  }));

  return {
    fileType: header.fileType,
    fileVersion: header.fileVersion,
    structs
  };
}

function getField(struct, label) {
  return struct?.fields?.find((field) => field.label === label);
}

function toCsv(rows) {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/u.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function normalizeResref(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.(are|git|gic)$/u, "");
}

function normalizeQuarterTurn(value) {
  const numeric = Math.trunc(Number(value) || 0);
  return ((numeric % 4) + 4) % 4;
}

function normalizeOptionalQuarterTurn(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? normalizeQuarterTurn(numeric) : undefined;
}

function roundNumber(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function buildVerdictMarkdown(manifest, contract) {
  return [
    `# ${manifest.areaResref} source proof pack`,
    "",
    `Generated: ${manifest.generatedAt}`,
    "",
    `Module path: \`${manifest.modulePath}\``,
    "",
    "## Verdict",
    "",
    contract.conclusion,
    "",
    "## Counts",
    "",
    `- Tiles: ${manifest.parsed.are.tileCount}`,
    `- Tileset SET status: ${manifest.parsed.tilesetSet.status}`,
    `- SET referenced tile models resolved: ${manifest.parsed.tilesetSet.referencedModelResolvedCount}/${manifest.parsed.tilesetSet.referencedTileCount}`,
    `- SET referenced ImageMap2D rows: ${manifest.parsed.tilesetSet.referencedImageMap2DCount}`,
    `- Objects: ${manifest.parsed.git.counts.total}`,
    `- Placeables: ${manifest.parsed.git.counts.placeables}`,
    `- VisualTransform placeables: ${manifest.parsed.git.visualTransformCounts.placeables}`,
    `- GIC status: ${manifest.parsed.gic.status}`,
    `- module.ifo status: ${manifest.parsed.moduleIfo.status}`,
    "",
    "## Files",
    "",
    ...Object.entries(manifest.files).map(([key, file]) => `- ${key}: \`${file}\``),
    ""
  ].join("\n");
}

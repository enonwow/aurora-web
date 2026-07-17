#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node"
});
require("ts-node/register/transpile-only");

const {
  parseAuroraProgFxTwoDa,
  parseAuroraTwoDaTable,
  parseAuroraVisualEffectsTwoDa
} = require("../src/modules/vfx/domain/aurora-vfx-source.parser");
const {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} = require("../src/modules/runtime-settings/application/nwn-key-bif-resource-reader");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_NWN_ROOT =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const DEFAULT_OUT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/custom-progfx-param4-zero-override";
const DEFAULT_VISUAL_EFFECT_ROW = 1302;
const DEFAULT_PROGFX_ROW = 1302;
const DEFAULT_PRIORITY = 0;
const DEFAULT_ANIMATION = "Blue_5m";

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    nwnRoot: DEFAULT_NWN_ROOT,
    outDir: DEFAULT_OUT_DIR,
    visualeffects: null,
    progfx: null,
    customVisualEffectRow: DEFAULT_VISUAL_EFFECT_ROW,
    customProgFxRow: DEFAULT_PROGFX_ROW,
    priority: DEFAULT_PRIORITY,
    animation: DEFAULT_ANIMATION
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--nwnRoot") {
      index += 1;
      options.nwnRoot = requireValue(arg, argv[index]);
    } else if (arg === "--outDir") {
      index += 1;
      options.outDir = requireValue(arg, argv[index]);
    } else if (arg === "--visualeffects") {
      index += 1;
      options.visualeffects = requireValue(arg, argv[index]);
    } else if (arg === "--progfx") {
      index += 1;
      options.progfx = requireValue(arg, argv[index]);
    } else if (arg === "--customVisualEffectRow") {
      index += 1;
      options.customVisualEffectRow = parseIntegerArg(arg, argv[index]);
    } else if (arg === "--customProgFxRow") {
      index += 1;
      options.customProgFxRow = parseIntegerArg(arg, argv[index]);
    } else if (arg === "--priority") {
      index += 1;
      options.priority = parseIntegerArg(arg, argv[index]);
    } else if (arg === "--animation") {
      index += 1;
      options.animation = requireValue(arg, argv[index]);
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

function parseIntegerArg(flag, value) {
  const parsed = Number.parseInt(requireValue(flag, value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} requires a non-negative integer.`);
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: node scripts/create-area-lighting-progfx-custom-zero-override.mjs [options]

Options:
  --repoRoot <path>                 Repository root. Defaults to aurora-web root.
  --nwnRoot <path>                  NWN root for retail KEY/BIF reads.
  --visualeffects <path>            Optional fixture/source visualeffects.2da.
  --progfx <path>                   Optional fixture/source progfx.2da.
  --outDir <path>                   Output directory for the custom override pack.
  --customVisualEffectRow <id>      visualeffects.2da row to fill. Defaults to 1302.
  --customProgFxRow <id>            progfx.2da row to append/fill. Defaults to 1302.
  --priority <number>               ProgFX Type 4 Param4 value. Defaults to 0.
  --animation <token>               ProgFX Type 4 Param1 animation. Defaults to Blue_5m.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readFixture(path) {
  return readFileSync(path);
}

async function readRetailTwoDa(nwnRoot, resref) {
  const keyFiles = ["nwn_base.key", "nwn_retail.key"];
  for (const keyFile of keyFiles) {
    const keyPath = resolve(nwnRoot, "data", keyFile);
    if (!existsSync(keyPath)) {
      continue;
    }
    const reader = await NwnKeyBifResourceReader.open(keyPath, nwnRoot);
    const bytes = await reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
    if (bytes) {
      return {
        bytes,
        source: keyPath.replaceAll("\\", "/")
      };
    }
  }
  throw new Error(`Unable to read ${resref}.2da from ${nwnRoot}/data/*.key`);
}

function cellValuesForRow(table, row) {
  return Object.fromEntries(
    table.header.map((column) => [column, row?.cellsByColumn?.[column]?.raw ?? "****"])
  );
}

function blankValues(table) {
  return Object.fromEntries(table.header.map((column) => [column, "****"]));
}

function renderTwoDa(table, replacementRows) {
  const replacementsById = new Map(replacementRows.map((row) => [row.rowId, row.values]));
  const maxRowId = Math.max(...table.rows.map((row) => row.rowId), ...replacementRows.map((row) => row.rowId));
  const outputIds = Array.from({ length: maxRowId + 1 }, (_, rowId) => rowId);
  const lines = ["2DA V2.0", ""];
  if (table.defaultTokens.length > 0) {
    lines.push(table.defaultTokens.join(" "));
  }
  lines.push(table.header.join(" "));
  for (const rowId of outputIds) {
    const sourceRow = table.rows.find((row) => row.rowId === rowId);
    const sourceValues = sourceRow ? cellValuesForRow(table, sourceRow) : blankValues(table);
    const values = {
      ...sourceValues,
      ...(replacementsById.get(rowId) ?? {})
    };
    lines.push(`${rowId} ${table.header.map((column) => values[column] ?? "****").join(" ")}`);
  }
  return `${lines.join("\n")}\n`;
}

function valuesWith(table, values) {
  return {
    ...blankValues(table),
    ...values
  };
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  const bytes = readFileSync(path);
  return {
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(bytes)
  };
}

function isBlankRow(row) {
  return row && row.cells.every((cell) => cell.blank);
}

function buildOverride(options, visualEffectsSource, progFxSource) {
  const visualEffectsTable = parseAuroraTwoDaTable(visualEffectsSource.bytes, {
    tableName: "visualeffects.2da",
    profile: "retail-custom-param4-zero-source",
    sourceObjectKey: `${visualEffectsSource.source}::visualeffects.2da`,
    sourceLayer: visualEffectsSource.kind,
    sourceHash: `sha256:${sha256(visualEffectsSource.bytes)}`
  });
  const progFxTable = parseAuroraTwoDaTable(progFxSource.bytes, {
    tableName: "progfx.2da",
    profile: "retail-custom-param4-zero-source",
    sourceObjectKey: `${progFxSource.source}::progfx.2da`,
    sourceLayer: progFxSource.kind,
    sourceHash: `sha256:${sha256(progFxSource.bytes)}`
  });

  const sourceVisualEffectRow = visualEffectsTable.rows.find(
    (row) => row.rowId === options.customVisualEffectRow
  );
  const sourceProgFxRow = progFxTable.rows.find((row) => row.rowId === options.customProgFxRow);
  if (sourceVisualEffectRow && !isBlankRow(sourceVisualEffectRow)) {
    throw new Error(
      `visualeffects.2da row ${options.customVisualEffectRow} is not blank; refusing to overwrite stock data.`
    );
  }
  if (sourceProgFxRow && !isBlankRow(sourceProgFxRow)) {
    throw new Error(
      `progfx.2da row ${options.customProgFxRow} is not blank; refusing to overwrite stock data.`
    );
  }

  const visualEffectsText = renderTwoDa(visualEffectsTable, [
    {
      rowId: options.customVisualEffectRow,
      values: valuesWith(visualEffectsTable, {
        Label: "ALS_PFX_ZERO_BLUE_5",
        Type_FD: "D",
        OrientWithGround: "0",
        ProgFX_Duration: String(options.customProgFxRow),
        OrientWithObject: "0"
      })
    }
  ]);
  const progFxText = renderTwoDa(progFxTable, [
    {
      rowId: options.customProgFxRow,
      values: valuesWith(progFxTable, {
        Label: "ALS_LightBlue5mPriority0",
        Type: "4",
        Param1: options.animation,
        Param2: "1.0",
        Param3: "0",
        Param4: String(options.priority),
        Param5: "0",
        Param6: "0",
        Param7: "fx_light_clr",
        Param8: "****"
      })
    }
  ]);

  const parsedVisualEffects = parseAuroraVisualEffectsTwoDa(visualEffectsText, {
    profile: "custom-param4-zero-override",
    sourceLayer: "external_fixture",
    sourceObjectKey: "generated/custom-param4-zero/visualeffects.2da",
    sourceHash: `sha256:${sha256(Buffer.from(visualEffectsText))}`
  });
  const parsedProgFx = parseAuroraProgFxTwoDa(progFxText, {
    profile: "custom-param4-zero-override",
    sourceLayer: "external_fixture",
    sourceObjectKey: "generated/custom-param4-zero/progfx.2da",
    sourceHash: `sha256:${sha256(Buffer.from(progFxText))}`
  });
  const visualEffectRow = parsedVisualEffects.rows.find(
    (row) => row.rowId === options.customVisualEffectRow
  );
  const progFxRow = parsedProgFx.rows.find((row) => row.rowId === options.customProgFxRow);
  const durationPhase = visualEffectRow?.phases.find((phase) => phase.phase === "duration");
  const checks = [
    {
      key: "source-visualeffects-row-blank",
      passed: sourceVisualEffectRow ? isBlankRow(sourceVisualEffectRow) : false,
      actual: sourceVisualEffectRow ? "blank" : "missing"
    },
    {
      key: "source-progfx-row-not-stock-active",
      passed: !sourceProgFxRow || isBlankRow(sourceProgFxRow),
      actual: sourceProgFxRow ? "blank" : "missing"
    },
    {
      key: "custom-visualeffects-duration-points-to-custom-progfx",
      passed: durationPhase?.progFxRowId === options.customProgFxRow,
      actual: durationPhase?.progFxRowId ?? null
    },
    {
      key: "custom-progfx-row-type4",
      passed: progFxRow?.type === 4,
      actual: progFxRow?.type ?? null
    },
    {
      key: "custom-progfx-param4-zero",
      passed: progFxRow?.type4Light?.priority === options.priority && options.priority === 0,
      actual: progFxRow?.type4Light?.priority ?? null
    },
    {
      key: "custom-progfx-fx-light-clr-model",
      passed: progFxRow?.type4Light?.modelRef === "fx_light_clr",
      actual: progFxRow?.type4Light?.modelRef ?? null
    }
  ];

  return {
    visualEffectsText,
    progFxText,
    manifest: {
      version: "aurora-area-lighting-custom-progfx-param4-zero-override/v1",
      generatedAt: new Date().toISOString(),
      status: checks.every((check) => check.passed)
        ? "custom-param4-zero-override-pack-prepared-not-stock-retail-parity"
        : "blocked-custom-param4-zero-override-validation-failed",
      passed: false,
      canonicalParityPromoted: false,
      stockRetailRowPresent: false,
      customOverrideRequired: true,
      installsOverrideFiles: false,
      overwritesUserOverrideDirectory: false,
      customRows: {
        visualeffects2da: {
          rowId: options.customVisualEffectRow,
          label: "ALS_PFX_ZERO_BLUE_5",
          typeFd: "D",
          progFxDuration: options.customProgFxRow
        },
        progfx2da: {
          rowId: options.customProgFxRow,
          label: "ALS_LightBlue5mPriority0",
          type: 4,
          param1Animation: options.animation,
          param2Speed: "1.0",
          param3CastShadows: "0",
          param4Priority: String(options.priority),
          param5ProximitySuppression: "0",
          param6AttachToScene: "0",
          param7Model: "fx_light_clr"
        }
      },
      sourceRows: {
        visualeffects2da1302:
          sourceVisualEffectRow && isBlankRow(sourceVisualEffectRow) ? "blank-stock-row" : "not-blank-or-missing",
        progfx2da1302: sourceProgFxRow ? "blank-stock-row" : "missing-stock-row"
      },
      checks,
      nonEvidenceNotice:
        "This pack prepares a custom override for the optional Param4=0 oracle. It is not a stock retail capture and must not be promoted as retail parity without a recorded run that loads these exact hashes.",
      requiredRuntimeUse:
        "Place these two generated 2DA files into a module/HAK/override setup only for the optional als_pfxzero.mod oracle; do not use them as stock-retail evidence."
    }
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const outDir = toAbsolute(repoRoot, options.outDir);
  mkdirSync(outDir, { recursive: true });

  const visualEffectsSource = options.visualeffects
    ? {
        kind: "external_fixture",
        source: toAbsolute(repoRoot, options.visualeffects).replaceAll("\\", "/"),
        bytes: readFixture(toAbsolute(repoRoot, options.visualeffects))
      }
    : {
        kind: "vanilla",
        ...(await readRetailTwoDa(options.nwnRoot, "visualeffects"))
      };
  const progFxSource = options.progfx
    ? {
        kind: "external_fixture",
        source: toAbsolute(repoRoot, options.progfx).replaceAll("\\", "/"),
        bytes: readFixture(toAbsolute(repoRoot, options.progfx))
      }
    : {
        kind: "vanilla",
        ...(await readRetailTwoDa(options.nwnRoot, "progfx"))
      };

  const { visualEffectsText, progFxText, manifest } = buildOverride(
    options,
    visualEffectsSource,
    progFxSource
  );
  const visualEffectsPath = resolve(outDir, "visualeffects.2da");
  const progFxPath = resolve(outDir, "progfx.2da");
  const manifestPath = resolve(outDir, "custom-progfx-param4-zero-override-manifest.json");
  const markdownPath = resolve(outDir, "custom-progfx-param4-zero-override.md");
  writeFileSync(visualEffectsPath, visualEffectsText, "utf8");
  writeFileSync(progFxPath, progFxText, "utf8");
  const outputManifest = {
    ...manifest,
    repoRoot,
    outputDirectory: toRepoRelative(repoRoot, outDir),
    sourceFiles: {
      visualeffects2da: {
        source: visualEffectsSource.source,
        kind: visualEffectsSource.kind,
        sha256: sha256(visualEffectsSource.bytes),
        bytes: visualEffectsSource.bytes.length
      },
      progfx2da: {
        source: progFxSource.source,
        kind: progFxSource.kind,
        sha256: sha256(progFxSource.bytes),
        bytes: progFxSource.bytes.length
      }
    },
    outputs: {
      visualeffects2da: describeFile(repoRoot, visualEffectsPath),
      progfx2da: describeFile(repoRoot, progFxPath)
    }
  };
  writeFileSync(manifestPath, `${JSON.stringify(outputManifest, null, 2)}\n`, "utf8");
  writeFileSync(
    markdownPath,
    [
      "# Custom ProgFX Param4=0 Override",
      "",
      "This is an optional oracle pack for `als_pfxzero.mod`.",
      "",
      "- It does not install files into the user override directory.",
      "- It is not stock retail parity evidence.",
      "- A runtime capture can only use it if the exact manifest hashes are recorded.",
      "",
      `- visualeffects.2da row: ${options.customVisualEffectRow}`,
      `- progfx.2da row: ${options.customProgFxRow}`,
      `- Param4 priority: ${options.priority}`,
      "",
      `Manifest: \`${toRepoRelative(repoRoot, manifestPath)}\``,
      ""
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        status: outputManifest.status,
        manifest: toRepoRelative(repoRoot, manifestPath),
        visualeffects: outputManifest.outputs.visualeffects2da,
        progfx: outputManifest.outputs.progfx2da,
        installsOverrideFiles: outputManifest.installsOverrideFiles,
        canonicalParityPromoted: outputManifest.canonicalParityPromoted
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

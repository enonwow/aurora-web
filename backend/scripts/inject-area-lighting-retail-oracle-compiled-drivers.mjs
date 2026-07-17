#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, isAbsolute, join, parse, relative, resolve } from "node:path";

const RESOURCE_TYPES = {
  are: 2012,
  fac: 2038,
  git: 2023,
  gic: 2046,
  ifo: 2014,
  ncs: 2010,
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
  LIST: 15,
};

const DEFAULT_OUTPUT_ROOT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers";
const DEFAULT_COMPILE_MANIFEST = join(
  DEFAULT_OUTPUT_ROOT,
  "retail-oracle-scene-drivers-compile-manifest.json",
);
const DEFAULT_SUMMARY = join(DEFAULT_OUTPUT_ROOT, "compiled-driver-module-injection-summary.json");
const DEFAULT_SOURCE_MODULE_FILE = "tlc_vfx_catalog_lab.mod";
const DEFAULT_OUTPUT_MODULE_FILE = "als_oracle.mod";
const BASE_STAGE_AREA_RESREF = "enon_test_effect";
const ORACLE_STAGE_AREA_RESREF = "als_light_lab";
const AUTORUN_SCRIPT_RESREF = "als_autorun";
const MODULE_SUPPORT_RESOURCES = [{ resref: "repute", type: RESOURCE_TYPES.fac }];
const RUNTIME_AREA_LIST_LABELS = [
  "Creature List",
  "Door List",
  "Encounter List",
  "List",
  "Placeable List",
  "SoundList",
  "StoreList",
  "TriggerList",
  "WaypointList",
];
const SOURCE_MODULE_RUNTIME_FIELDS_TO_DROP = ["Mod_CustomTlk", "Mod_HakList"];
const SOURCE_MODULE_EVENT_FIELDS_TO_CLEAR = [
  "Mod_OnHeartbeat",
  "Mod_OnModLoad",
  "Mod_OnModStart",
  "Mod_OnClientEntr",
  "Mod_OnClientLeav",
  "Mod_OnActvtItem",
  "Mod_OnAcquirItem",
  "Mod_OnUsrDefined",
  "Mod_OnUnAqreItem",
  "Mod_OnPlrDeath",
  "Mod_OnPlrDying",
  "Mod_OnPlrEqItm",
  "Mod_OnPlrLvlUp",
  "Mod_OnSpawnBtnDn",
  "Mod_OnPlrRest",
  "Mod_OnPlrUnEqItm",
  "Mod_OnCutsnAbort",
  "Mod_OnPlrChat",
  "Mod_OnPlrTarget",
  "Mod_OnPlrGuiEvt",
  "Mod_OnPlrTileAct",
  "Mod_OnNuiEvent",
  "Mod_StartMovie",
];
const SOURCE_AREA_EVENT_FIELDS_TO_CLEAR = ["OnExit", "OnHeartbeat", "OnUserDefined"];
const STAGE_AREA_TILESET = "tin01";
const STAGE_AREA_WIDTH = 12;
const STAGE_AREA_HEIGHT = 12;
const STAGE_AREA_TILE_ID = 18;
const STOCK_STAGE_TILES = Array.from({ length: STAGE_AREA_WIDTH * STAGE_AREA_HEIGHT }, () => ({
  id: STAGE_AREA_TILE_ID,
  orientation: 0,
  main1: 0,
  main2: 0,
  source1: 0,
  source2: 0,
}));
const REFERENCE_MODULE_VARIANTS = [
  {
    moduleFile: "als_refbase.mod",
    utilityScriptResref: "als_refbase",
    lane: "open-pad-no-light-baseline",
    artifact: "retail-cross-lane-openpad-smoke.png",
  },
  {
    moduleFile: "als_rtmain.mod",
    utilityScriptResref: "als_reftmain",
    lane: "terrain-tile-main-light",
    artifact: "retail-ref-tile-main-light.png",
  },
  {
    moduleFile: "als_xnoitem.mod",
    utilityScriptResref: "als_xnoitem",
    lane: "cross-lane-no-item-property-light-ablation",
    artifact: "retail-cross-lane-no-item-after-budget.png",
  },
  {
    moduleFile: "als_xnopfx.mod",
    utilityScriptResref: "als_xnopfx",
    lane: "cross-lane-no-progfx-type4-ablation",
    artifact: "retail-cross-lane-no-progfx-after-budget.png",
  },
  {
    moduleFile: "als_xnoplc.mod",
    utilityScriptResref: "als_xnoplc",
    lane: "cross-lane-no-placeables-2da-lightcolor-ablation",
    artifact: "retail-cross-lane-no-placeable-after-budget.png",
  },
  {
    moduleFile: "als_xnomdl.mod",
    utilityScriptResref: "als_xnomdl",
    lane: "cross-lane-no-mdl-source-light-ablation",
    artifact: "retail-cross-lane-no-mdl-after-budget.png",
  },
  {
    moduleFile: "als_xnotmain.mod",
    utilityScriptResref: "als_xnotmain",
    lane: "cross-lane-no-tile-main-light-ablation",
    artifact: "retail-cross-lane-no-tile-main-after-budget.png",
  },
  {
    moduleFile: "als_xnotsrc.mod",
    utilityScriptResref: "als_xnotsrc",
    lane: "cross-lane-no-tile-source-light-ablation",
    artifact: "retail-cross-lane-no-tile-source-after-budget.png",
  },
  {
    moduleFile: "als_rtsrc.mod",
    utilityScriptResref: "als_reftsrc",
    lane: "terrain-tile-source-light",
    artifact: "retail-ref-tile-source-light.png",
  },
  {
    moduleFile: "als_refplc.mod",
    utilityScriptResref: "als_refplc",
    lane: "placeables-2da-light",
    artifact: "retail-ref-placeable-lightcolor.png",
  },
  {
    moduleFile: "als_refmdl.mod",
    utilityScriptResref: "als_refmdl",
    lane: "source-mdl-light-node",
    artifact: "retail-ref-mdl-source-light.png",
  },
  {
    moduleFile: "als_refitm.mod",
    utilityScriptResref: "als_refitem",
    lane: "item-property-light",
    artifact: "retail-ref-item-property-light.png",
  },
  {
    moduleFile: "als_refpfx.mod",
    utilityScriptResref: "als_refpfx",
    lane: "progfx-type4-light-or-vision",
    artifact: "retail-ref-progfx-type4-light.png",
  },
  {
    moduleFile: "als_pfxzero.mod",
    utilityScriptResref: "als_pfxzero",
    lane: "progfx-type4-custom-param4-zero",
    artifact: "retail-progfx-priority-policy-custom-zero-after.png",
  },
];
const STAGE_START_LOCATION = {
  x: 65.0,
  y: 55.0,
  z: 0,
  dirX: 0,
  dirY: 1,
};

const scriptDir = resolve(import.meta.dirname);
const defaultRepoRoot = resolve(scriptDir, "..", "..");

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    compileManifest: DEFAULT_COMPILE_MANIFEST,
    summary: DEFAULT_SUMMARY,
    nwnModulesDir: defaultNwnModulesDir(),
    sourceModuleFile: process.env.AURORA_LIGHT_SHADOW_ORACLE_SOURCE_MODULE_FILE ?? DEFAULT_SOURCE_MODULE_FILE,
    outputModuleFile: process.env.AURORA_LIGHT_SHADOW_ORACLE_OUTPUT_MODULE_FILE ?? DEFAULT_OUTPUT_MODULE_FILE,
    writeReferenceModules: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--compileManifest") {
      index += 1;
      options.compileManifest = requireValue(arg, argv[index]);
    } else if (arg === "--summary") {
      index += 1;
      options.summary = requireValue(arg, argv[index]);
    } else if (arg === "--nwnModulesDir") {
      index += 1;
      options.nwnModulesDir = requireValue(arg, argv[index]);
    } else if (arg === "--sourceModuleFile") {
      index += 1;
      options.sourceModuleFile = requireValue(arg, argv[index]);
    } else if (arg === "--outputModuleFile") {
      index += 1;
      options.outputModuleFile = requireValue(arg, argv[index]);
    } else if (arg === "--skipReferenceModules") {
      options.writeReferenceModules = false;
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
  console.log(`Usage: node scripts/inject-area-lighting-retail-oracle-compiled-drivers.mjs [options]

Options:
  --repoRoot <path>          Repository root. Defaults to aurora-web root.
  --compileManifest <path>   Compiled driver manifest. Defaults to ${DEFAULT_COMPILE_MANIFEST}
  --summary <path>           Injection summary output. Defaults to ${DEFAULT_SUMMARY}
  --nwnModulesDir <path>     NWN modules directory. Defaults to Documents/Neverwinter Nights/modules.
  --sourceModuleFile <file>  Source lab module. Defaults to ${DEFAULT_SOURCE_MODULE_FILE}
  --outputModuleFile <file>  Disposable output module. Defaults to ${DEFAULT_OUTPUT_MODULE_FILE}
  --skipReferenceModules     Do not write per-lane isolated reference modules.
`);
}

function defaultNwnModulesDir() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  return home ? join(home, "Documents", "Neverwinter Nights", "modules") : null;
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function resolveModulePath(modulesDir, moduleFile) {
  return isAbsolute(moduleFile) ? moduleFile : join(modulesDir, moduleFile);
}

async function chooseSourceModule(modulesDir, requestedModuleFile) {
  const requestedPath = resolveModulePath(modulesDir, requestedModuleFile);
  if (existsSync(requestedPath)) {
    return requestedPath;
  }

  const moduleNames = await readdir(modulesDir);
  const fallback = moduleNames
    .filter((fileName) => fileName.toLowerCase().endsWith("vfx_catalog_lab.mod"))
    .sort((a, b) => a.localeCompare(b))[0];
  if (fallback) {
    return join(modulesDir, fallback);
  }
  throw new Error(`Source module not found: ${requestedPath}`);
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
  const localizedStringSize = bytes.readUInt32LE(12);
  const localizedStringOffset = bytes.readUInt32LE(20);
  const keyListOffset = bytes.readUInt32LE(24);
  const resourceListOffset = bytes.readUInt32LE(28);
  const localizedStrings =
    localizedStringSize > 0
      ? Buffer.from(bytes.subarray(localizedStringOffset, localizedStringOffset + localizedStringSize))
      : Buffer.alloc(0);

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
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size)),
    });
  }

  return {
    header: Buffer.from(bytes.subarray(0, 160)),
    localizedStrings,
    entries,
  };
}

function buildErfV10FromEntries(originalHeader, localizedStrings, entries) {
  const keyEntrySize = 24;
  const resourceEntrySize = 8;
  const header = Buffer.from(originalHeader);
  const entryCount = entries.length;
  const localizedStringOffset = 160;
  const keyListOffset = localizedStringOffset + localizedStrings.length;
  const resourceListOffset = keyListOffset + entryCount * keyEntrySize;
  const resourceDataOffsetStart = resourceListOffset + entryCount * resourceEntrySize;

  header.writeUInt32LE(entryCount, 16);
  header.writeUInt32LE(localizedStringOffset, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  const keyTable = Buffer.alloc(entryCount * keyEntrySize);
  const resourceTable = Buffer.alloc(entryCount * resourceEntrySize);
  const payloads = [];
  let currentOffset = resourceDataOffsetStart;

  entries.forEach((entry, index) => {
    if (entry.resref.length > 16) {
      throw new Error(`Resource resref exceeds ERF V1.0 limit: ${entry.resref}`);
    }

    const keyOffset = index * keyEntrySize;
    const resourceOffset = index * resourceEntrySize;
    Buffer.from(entry.resref.toLowerCase(), "ascii").copy(keyTable, keyOffset);
    keyTable.writeUInt32LE(index, keyOffset + 16);
    keyTable.writeUInt16LE(entry.type, keyOffset + 20);
    keyTable.writeUInt16LE(0, keyOffset + 22);

    resourceTable.writeUInt32LE(currentOffset, resourceOffset);
    resourceTable.writeUInt32LE(entry.bytes.length, resourceOffset + 4);
    payloads.push(entry.bytes);
    currentOffset += entry.bytes.length;
  });

  return Buffer.concat([header, localizedStrings, keyTable, resourceTable, ...payloads]);
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
    fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    fieldIndicesCount: bytes.readUInt32LE(44),
    listIndicesOffset: bytes.readUInt32LE(48),
    listIndicesCount: bytes.readUInt32LE(52),
  };

  const labels = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    labels.push(
      bytes
        .subarray(header.labelOffset + index * 16, header.labelOffset + index * 16 + 16)
        .toString("ascii")
        .replace(/\0.*$/u, ""),
    );
  }

  const structEntries = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * 12;
    structEntries.push({
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8),
    });
  }

  const fieldEntries = [];
  for (let index = 0; index < header.fieldCount; index += 1) {
    const offset = header.fieldOffset + index * 12;
    fieldEntries.push({
      typeId: bytes.readUInt32LE(offset),
      label: labels[bytes.readUInt32LE(offset + 4)] ?? "",
      dataOrOffset: bytes.readUInt32LE(offset + 8),
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
        bytes.readUInt32LE(header.fieldIndicesOffset + structEntry.dataOrOffset + index * 4),
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
        const inline = Buffer.allocUnsafe(4);
        inline.writeUInt32LE(fieldEntry.dataOrOffset, 0);
        return inline.readFloatLE(0);
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
        const totalSize = bytes.readUInt32LE(offset);
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
        return { totalSize, strRef, entries };
      }
      case FIELD_TYPE.VOID: {
        const length = bytes.readUInt32LE(offset);
        return {
          bytesBase64: Buffer.from(bytes.subarray(offset + 4, offset + 4 + length)).toString(
            "base64",
          ),
        };
      }
      case FIELD_TYPE.STRUCT:
        return fieldEntry.dataOrOffset;
      case FIELD_TYPE.LIST:
        return readListIndices(fieldEntry);
      default:
        throw new Error(
          `Unsupported GFF field type ${fieldEntry.typeId} for ${fieldEntry.label} in ${sourceLabel}`,
        );
    }
  }

  const structs = structEntries.map((structEntry) => ({
    typeId: structEntry.typeId,
    fields: readStructFieldIndices(structEntry).map((fieldIndex) => {
      const fieldEntry = fieldEntries[fieldIndex];
      return {
        label: fieldEntry.label,
        typeId: fieldEntry.typeId,
        value: readFieldValue(fieldEntry),
      };
    }),
  }));

  return {
    fileType: header.fileType,
    fileVersion: header.fileVersion,
    structs,
  };
}

function buildGff(gff) {
  const labels = [];
  const labelIndexByName = new Map();
  for (const struct of gff.structs) {
    for (const field of struct.fields) {
      if (!labelIndexByName.has(field.label)) {
        const labelBytes = Buffer.from(field.label, "ascii");
        if (labelBytes.length > 16) {
          throw new Error(`GFF label exceeds 16 bytes: ${field.label}`);
        }
        labelIndexByName.set(field.label, labels.length);
        labels.push(field.label);
      }
    }
  }

  const fieldDataChunks = [];
  const listIndicesChunks = [];
  const fieldIndicesChunks = [];
  const fieldEntries = [];
  const structEntries = [];

  function pushFieldData(chunk) {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  }

  function pushListIndices(chunk) {
    const offset = listIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    listIndicesChunks.push(chunk);
    return offset;
  }

  function pushFieldIndices(indices) {
    const chunk = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, index) => chunk.writeUInt32LE(fieldIndex, index * 4));
    const offset = fieldIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldIndicesChunks.push(chunk);
    return offset;
  }

  function encodeInlineInt(value) {
    const inline = Buffer.allocUnsafe(4);
    inline.writeInt32LE(Number(value) | 0, 0);
    return inline.readUInt32LE(0);
  }

  function encodeField(field) {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Missing label index for ${field.label}`);
    }

    let dataOrOffset;
    switch (field.typeId) {
      case FIELD_TYPE.BYTE:
      case FIELD_TYPE.CHAR:
        dataOrOffset = Number(field.value) & 0xff;
        break;
      case FIELD_TYPE.WORD:
      case FIELD_TYPE.SHORT:
        dataOrOffset = Number(field.value) & 0xffff;
        break;
      case FIELD_TYPE.DWORD:
        dataOrOffset = Number(field.value) >>> 0;
        break;
      case FIELD_TYPE.INT:
        dataOrOffset = encodeInlineInt(field.value);
        break;
      case FIELD_TYPE.FLOAT: {
        const inline = Buffer.allocUnsafe(4);
        inline.writeFloatLE(Number(field.value), 0);
        dataOrOffset = inline.readUInt32LE(0);
        break;
      }
      case FIELD_TYPE.CEXOSTRING: {
        const valueBytes = Buffer.from(String(field.value ?? ""), "utf-8");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.RESREF: {
        const valueBytes = Buffer.from(String(field.value ?? ""), "ascii");
        if (valueBytes.length > 16) {
          throw new Error(`RESREF exceeds 16 bytes: ${field.value}`);
        }
        const payload = Buffer.alloc(1 + valueBytes.length);
        payload.writeUInt8(valueBytes.length, 0);
        valueBytes.copy(payload, 1);
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.CEXOLOCSTRING: {
        const loc = field.value ?? { strRef: 0xffffffff, entries: [] };
        const entries = loc.entries ?? [];
        const entryChunks = entries.map((entry) => {
          const textBytes = Buffer.from(String(entry.text ?? ""), "utf-8");
          const chunk = Buffer.alloc(8 + textBytes.length);
          chunk.writeUInt32LE(Number(entry.id ?? 0) >>> 0, 0);
          chunk.writeUInt32LE(textBytes.length, 4);
          textBytes.copy(chunk, 8);
          return chunk;
        });
        const entrySize = entryChunks.reduce((sum, entry) => sum + entry.length, 0);
        const payload = Buffer.alloc(12 + entrySize);
        payload.writeUInt32LE(8 + entrySize, 0);
        payload.writeUInt32LE(Number(loc.strRef ?? 0xffffffff) >>> 0, 4);
        payload.writeUInt32LE(entries.length, 8);
        let cursor = 12;
        for (const chunk of entryChunks) {
          chunk.copy(payload, cursor);
          cursor += chunk.length;
        }
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.VOID: {
        const valueBytes = Buffer.from(String(field.value?.bytesBase64 ?? ""), "base64");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.STRUCT:
        dataOrOffset = Number(field.value) >>> 0;
        break;
      case FIELD_TYPE.LIST: {
        const values = Array.isArray(field.value) ? field.value : [];
        const payload = Buffer.alloc(4 + values.length * 4);
        payload.writeUInt32LE(values.length, 0);
        values.forEach((structIndex, index) => {
          payload.writeUInt32LE(Number(structIndex) >>> 0, 4 + index * 4);
        });
        dataOrOffset = pushListIndices(payload);
        break;
      }
      default:
        throw new Error(`Unsupported GFF field type for write: ${field.typeId}`);
    }

    return {
      typeId: field.typeId,
      labelIndex,
      dataOrOffset,
    };
  }

  for (const struct of gff.structs) {
    const fieldIndices = [];
    for (const field of struct.fields) {
      const fieldIndex = fieldEntries.length;
      fieldEntries.push(encodeField(field));
      fieldIndices.push(fieldIndex);
    }

    let dataOrOffset = 0;
    if (fieldIndices.length === 1) {
      dataOrOffset = fieldIndices[0];
    } else if (fieldIndices.length > 1) {
      dataOrOffset = pushFieldIndices(fieldIndices);
    }

    structEntries.push({
      typeId: struct.typeId,
      dataOrOffset,
      fieldCount: fieldIndices.length,
    });
  }

  const headerSize = 56;
  const structOffset = headerSize;
  const fieldOffset = structOffset + structEntries.length * 12;
  const labelOffset = fieldOffset + fieldEntries.length * 12;
  const fieldDataOffset = labelOffset + labels.length * 16;
  const fieldData = Buffer.concat(fieldDataChunks);
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const fieldIndices = Buffer.concat(fieldIndicesChunks);
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;
  const listIndices = Buffer.concat(listIndicesChunks);

  const header = Buffer.alloc(headerSize);
  Buffer.from(gff.fileType, "ascii").copy(header, 0);
  Buffer.from(gff.fileVersion, "ascii").copy(header, 4);
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(structEntries.length, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(labels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(listIndices.length, 52);

  const structTable = Buffer.alloc(structEntries.length * 12);
  structEntries.forEach((entry, index) => {
    const offset = index * 12;
    structTable.writeUInt32LE(entry.typeId, offset);
    structTable.writeUInt32LE(entry.dataOrOffset, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount, offset + 8);
  });

  const fieldTable = Buffer.alloc(fieldEntries.length * 12);
  fieldEntries.forEach((entry, index) => {
    const offset = index * 12;
    fieldTable.writeUInt32LE(entry.typeId, offset);
    fieldTable.writeUInt32LE(entry.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset, offset + 8);
  });

  const labelTable = Buffer.alloc(labels.length * 16);
  labels.forEach((label, index) => {
    Buffer.from(label, "ascii").copy(labelTable, index * 16);
  });

  return Buffer.concat([
    header,
    structTable,
    fieldTable,
    labelTable,
    fieldData,
    fieldIndices,
    listIndices,
  ]);
}

function getField(struct, label) {
  return struct.fields.find((field) => field.label === label);
}

function setFieldValue(struct, label, value) {
  const field = getField(struct, label);
  if (!field) {
    throw new Error(`Missing GFF field ${label}.`);
  }
  field.value = value;
}

function setOrAddField(struct, label, typeId, value) {
  const field = getField(struct, label);
  if (field) {
    field.typeId = typeId;
    field.value = value;
    return { added: false };
  }
  struct.fields.push({ label, typeId, value });
  return { added: true };
}

function removeRootFields(struct, labels) {
  const toRemove = new Set(labels);
  const removed = [];
  struct.fields = struct.fields.filter((field) => {
    if (!toRemove.has(field.label)) {
      return true;
    }
    removed.push(field.label);
    return false;
  });
  return removed;
}

function setOptionalFieldValue(struct, label, value) {
  const field = getField(struct, label);
  if (!field) {
    return false;
  }
  field.value = value;
  return true;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneStructTree(sourceGff, sourceIndex, targetGff, indexMap = new Map()) {
  if (indexMap.has(sourceIndex)) {
    return indexMap.get(sourceIndex);
  }
  const sourceStruct = sourceGff.structs[sourceIndex];
  if (!sourceStruct) {
    throw new Error(`GFF struct index out of range during prune: ${sourceIndex}`);
  }
  const targetIndex = targetGff.structs.length;
  indexMap.set(sourceIndex, targetIndex);
  const cloned = {
    typeId: sourceStruct.typeId,
    fields: deepClone(sourceStruct.fields),
  };
  targetGff.structs.push(cloned);

  for (const field of cloned.fields) {
    if (field.typeId === FIELD_TYPE.STRUCT) {
      field.value = cloneStructTree(sourceGff, field.value, targetGff, indexMap);
    } else if (field.typeId === FIELD_TYPE.LIST) {
      field.value = (field.value ?? []).map((childIndex) =>
        cloneStructTree(sourceGff, childIndex, targetGff, indexMap),
      );
    }
  }

  return targetIndex;
}

function pruneGffToReachableStructs(sourceGff) {
  const targetGff = {
    fileType: sourceGff.fileType,
    fileVersion: sourceGff.fileVersion,
    structs: [],
  };
  cloneStructTree(sourceGff, 0, targetGff);
  return {
    gff: targetGff,
    removedStructCount: sourceGff.structs.length - targetGff.structs.length,
  };
}

async function compiledEntriesFromManifest(repoRoot, compileManifest) {
  const entries = [];
  const manifestEntries = [
    ...(compileManifest.drivers ?? []).map((entry) => ({ ...entry, kind: "driver" })),
    ...(compileManifest.utilityScripts ?? []).map((entry) => ({ ...entry, kind: "utility" })),
  ];
  for (const entry of manifestEntries) {
    if (!entry.compiledReady) {
      continue;
    }
    const compiledPath = toAbsolute(repoRoot, entry.compiledPath);
    if (!existsSync(compiledPath)) {
      throw new Error(`Compiled driver missing on disk: ${compiledPath}`);
    }
    if (extname(compiledPath).toLowerCase() !== ".ncs") {
      throw new Error(`Compiled driver is not .ncs: ${compiledPath}`);
    }
    const resref = parse(compiledPath).name.toLowerCase();
    if (resref.length > 16) {
      throw new Error(`Compiled driver resref exceeds ERF V1.0 limit: ${resref}`);
    }
    entries.push({
      resref,
      type: RESOURCE_TYPES.ncs,
      bytes: await readFile(compiledPath),
      kind: entry.kind,
      caseId: entry.caseId ?? null,
      title: entry.title ?? null,
      sourcePath: entry.sourcePath,
      compiledPath,
    });
  }
  if (entries.length === 0) {
    throw new Error("Compiled driver manifest contains no ready .ncs entries.");
  }
  return entries;
}

function hasResource(erf, resref, type) {
  const key = resref.toLowerCase();
  return erf.entries.some((entry) => entry.resref === key && entry.type === type);
}

function findResource(erf, resref, type) {
  const key = resref.toLowerCase();
  return erf.entries.find((entry) => entry.resref === key && entry.type === type) ?? null;
}

function patchAreaOnEnter(areBytes, areaResref, scriptResref) {
  const gff = parseGff(areBytes, `${areaResref}.are`);
  if (gff.fileType !== "ARE ") {
    throw new Error(`Expected ARE resource for ${areaResref}, got ${JSON.stringify(gff.fileType)}`);
  }
  const root = gff.structs[0];
  const previousOnEnter = getField(root, "OnEnter")?.value ?? "";
  const tilePatch = patchStageAreaTiles(gff);
  for (const label of SOURCE_AREA_EVENT_FIELDS_TO_CLEAR) {
    setOptionalFieldValue(root, label, "");
  }
  setOrAddField(root, "OnEnter", FIELD_TYPE.RESREF, scriptResref);
  const identityPatched = {
    tag: setOptionalFieldValue(root, "Tag", areaResref),
    resref: setOptionalFieldValue(root, "ResRef", areaResref),
  };
  return {
    bytes: buildGff(pruneGffToReachableStructs(gff).gff),
    previousOnEnter,
    nextOnEnter: scriptResref,
    identityPatched,
    tilePatch,
  };
}

function patchStageAreaTiles(gff) {
  const root = gff.structs[0];
  let tileList = getField(root, "Tile_List");
  let tileListCreated = false;
  if (!tileList) {
    setOrAddField(root, "Tile_List", FIELD_TYPE.LIST, []);
    tileList = getField(root, "Tile_List");
    tileListCreated = true;
  }
  if (tileList.typeId !== FIELD_TYPE.LIST) {
    tileList.typeId = FIELD_TYPE.LIST;
    tileList.value = [];
    tileListCreated = true;
  }
  const previous = (tileList.value ?? []).map((structIndex) => {
    const struct = gff.structs[structIndex];
    return {
      structIndex,
      tileId: getField(struct, "Tile_ID")?.value ?? null,
      orientation: getField(struct, "Tile_Orientation")?.value ?? null,
    };
  });
  const nextTileStructs = STOCK_STAGE_TILES.map((tile) => ({
    typeId: 1,
    fields: [
      { label: "Tile_AnimLoop2", typeId: FIELD_TYPE.BYTE, value: 1 },
      { label: "Tile_ID", typeId: FIELD_TYPE.INT, value: tile.id },
      { label: "Tile_SrcLight2", typeId: FIELD_TYPE.BYTE, value: tile.source2 },
      { label: "Tile_MainLight2", typeId: FIELD_TYPE.BYTE, value: tile.main2 },
      { label: "Tile_Height", typeId: FIELD_TYPE.INT, value: 0 },
      { label: "Tile_SrcLight1", typeId: FIELD_TYPE.BYTE, value: tile.source1 },
      { label: "Tile_AnimLoop1", typeId: FIELD_TYPE.BYTE, value: 1 },
      { label: "Tile_MainLight1", typeId: FIELD_TYPE.BYTE, value: tile.main1 },
      { label: "Tile_AnimLoop3", typeId: FIELD_TYPE.BYTE, value: 1 },
      { label: "Tile_Orientation", typeId: FIELD_TYPE.INT, value: tile.orientation },
    ],
  }));
  const firstTileStructIndex = gff.structs.length;
  for (const struct of nextTileStructs) {
    gff.structs.push(struct);
  }
  tileList.value = nextTileStructs.map((_, index) => firstTileStructIndex + index);
  setOrAddField(root, "Width", FIELD_TYPE.INT, STAGE_AREA_WIDTH);
  setOrAddField(root, "Height", FIELD_TYPE.INT, STAGE_AREA_HEIGHT);
  setOrAddField(root, "Tileset", FIELD_TYPE.RESREF, STAGE_AREA_TILESET);
  return {
    sourceTileset: STAGE_AREA_TILESET,
    stockTileset: STAGE_AREA_TILESET,
    stockTileMaxIdExclusive: 299,
    stageAreaWidth: STAGE_AREA_WIDTH,
    stageAreaHeight: STAGE_AREA_HEIGHT,
    stageTileId: STAGE_AREA_TILE_ID,
    stageTileCount: STOCK_STAGE_TILES.length,
    placementContract:
      "All scripted light sources are placed on tile centers, not seams: campfire/tile at 65,65; MDL at 75,65; PC/item/VFX starts at 65,55.",
    tileListCreated,
    previous,
    next: STOCK_STAGE_TILES,
  };
}

function pruneRuntimeAreaLists(gff, labels = RUNTIME_AREA_LIST_LABELS) {
  const root = gff.structs[0];
  const pruned = {};
  for (const label of labels) {
    const field = getField(root, label);
    if (field?.typeId !== FIELD_TYPE.LIST) {
      continue;
    }
    const previousCount = Array.isArray(field.value) ? field.value.length : 0;
    field.value = [];
    pruned[label] = {
      previousCount,
      nextCount: 0,
    };
  }
  return pruned;
}

function pruneStageGit(gitBytes, areaResref) {
  const gff = parseGff(gitBytes, `${areaResref}.git`);
  if (gff.fileType !== "GIT ") {
    throw new Error(`Expected GIT resource for ${areaResref}, got ${JSON.stringify(gff.fileType)}`);
  }
  const prunedLists = pruneRuntimeAreaLists(gff);
  const pruned = pruneGffToReachableStructs(gff);
  return {
    bytes: buildGff(pruned.gff),
    prunedLists,
    removedStructCount: pruned.removedStructCount,
  };
}

function pruneStageGic(gicBytes, areaResref) {
  const gff = parseGff(gicBytes, `${areaResref}.gic`);
  if (gff.fileType !== "GIC ") {
    throw new Error(`Expected GIC resource for ${areaResref}, got ${JSON.stringify(gff.fileType)}`);
  }
  const prunedLists = pruneRuntimeAreaLists(gff);
  const pruned = pruneGffToReachableStructs(gff);
  return {
    bytes: buildGff(pruned.gff),
    prunedLists,
    removedStructCount: pruned.removedStructCount,
  };
}

function cloneStageAreaResources(sourceErf, baseAreaResref, oracleAreaResref, scriptResref) {
  const requiredResources = [
    { extension: "are", type: RESOURCE_TYPES.are },
    { extension: "git", type: RESOURCE_TYPES.git },
    { extension: "gic", type: RESOURCE_TYPES.gic },
  ];
  const sourceResources = new Map();
  for (const resource of requiredResources) {
    const entry = findResource(sourceErf, baseAreaResref, resource.type);
    if (!entry) {
      throw new Error(`Missing ${baseAreaResref}.${resource.extension} in source module.`);
    }
    sourceResources.set(resource.extension, entry);
  }

  const areaOnEnter = patchAreaOnEnter(
    sourceResources.get("are").bytes,
    oracleAreaResref,
    scriptResref,
  );
  const nextGit = pruneStageGit(sourceResources.get("git").bytes, oracleAreaResref);
  const nextGic = pruneStageGic(sourceResources.get("gic").bytes, oracleAreaResref);

  return {
    baseAreaResref,
    oracleAreaResref,
    areaOnEnter,
    tilePatch: areaOnEnter.tilePatch,
    runtimeListsPruned: {
      git: nextGit.prunedLists,
      gic: nextGic.prunedLists,
    },
    removedStructs: {
      git: nextGit.removedStructCount,
      gic: nextGic.removedStructCount,
    },
    entries: [
      { resref: oracleAreaResref, type: RESOURCE_TYPES.are, bytes: areaOnEnter.bytes },
      {
        resref: oracleAreaResref,
        type: RESOURCE_TYPES.git,
        bytes: nextGit.bytes,
      },
      {
        resref: oracleAreaResref,
        type: RESOURCE_TYPES.gic,
        bytes: nextGic.bytes,
      },
    ],
    clonedResources: Object.fromEntries(
      requiredResources.map((resource) => [resource.extension, true]),
    ),
    sourceResourceSizes: Object.fromEntries(
      requiredResources.map((resource) => [
        resource.extension,
        sourceResources.get(resource.extension).bytes.length,
      ]),
    ),
  };
}

function copyModuleSupportResources(sourceErf) {
  const entries = [];
  const missing = [];
  for (const resource of MODULE_SUPPORT_RESOURCES) {
    const entry = findResource(sourceErf, resource.resref, resource.type);
    if (entry) {
      entries.push({
        resref: resource.resref,
        type: resource.type,
        bytes: entry.bytes,
      });
    } else {
      missing.push(resource);
    }
  }
  return { entries, missing };
}

function patchModuleStartLocation(ifoBytes, areaResref) {
  const gff = parseGff(ifoBytes, "module.ifo");
  if (gff.fileType !== "IFO ") {
    throw new Error(`Expected IFO resource, got ${JSON.stringify(gff.fileType)}`);
  }
  const root = gff.structs[0];
  const previous = {
    area: getField(root, "Mod_Entry_Area")?.value ?? "",
    x: getField(root, "Mod_Entry_X")?.value ?? null,
    y: getField(root, "Mod_Entry_Y")?.value ?? null,
    z: getField(root, "Mod_Entry_Z")?.value ?? null,
    dirX: getField(root, "Mod_Entry_Dir_X")?.value ?? null,
    dirY: getField(root, "Mod_Entry_Dir_Y")?.value ?? null,
  };
  const previousAreaList = getField(root, "Mod_Area_list");
  const previousAreaListCount =
    previousAreaList?.typeId === FIELD_TYPE.LIST && Array.isArray(previousAreaList.value)
      ? previousAreaList.value.length
      : null;
  const droppedRootFields = removeRootFields(root, SOURCE_MODULE_RUNTIME_FIELDS_TO_DROP);
  const clearedEventFields = [];
  for (const label of SOURCE_MODULE_EVENT_FIELDS_TO_CLEAR) {
    if (setOptionalFieldValue(root, label, "")) {
      clearedEventFields.push(label);
    }
  }
  const defaultBicCleared = setOptionalFieldValue(root, "Mod_DefaultBic", "");
  setOptionalFieldValue(root, "Mod_Tag", areaResref);
  const modName = getField(root, "Mod_Name");
  if (modName?.typeId === FIELD_TYPE.CEXOLOCSTRING) {
    modName.value = { strRef: 0xffffffff, entries: [{ id: 0, text: areaResref }] };
  }
  const oracleAreaStructIndex = gff.structs.length;
  gff.structs.push({
    typeId: 6,
    fields: [{ label: "Area_Name", typeId: FIELD_TYPE.RESREF, value: areaResref }],
  });
  setOrAddField(root, "Mod_Area_list", FIELD_TYPE.LIST, [oracleAreaStructIndex]);
  setOrAddField(root, "Mod_Entry_Area", FIELD_TYPE.RESREF, areaResref);
  setOrAddField(root, "Mod_Entry_X", FIELD_TYPE.FLOAT, STAGE_START_LOCATION.x);
  setOrAddField(root, "Mod_Entry_Y", FIELD_TYPE.FLOAT, STAGE_START_LOCATION.y);
  setOrAddField(root, "Mod_Entry_Z", FIELD_TYPE.FLOAT, STAGE_START_LOCATION.z);
  setOrAddField(root, "Mod_Entry_Dir_X", FIELD_TYPE.FLOAT, STAGE_START_LOCATION.dirX);
  setOrAddField(root, "Mod_Entry_Dir_Y", FIELD_TYPE.FLOAT, STAGE_START_LOCATION.dirY);
  const pruned = pruneGffToReachableStructs(gff);
  return {
    bytes: buildGff(pruned.gff),
    previous,
    next: {
      area: areaResref,
      ...STAGE_START_LOCATION,
    },
    isolation: {
      droppedRootFields,
      previousAreaListCount,
      nextAreaListCount: 1,
      oracleAreaStructIndex,
      removedStructCount: pruned.removedStructCount,
      stripsSourceHakList: droppedRootFields.includes("Mod_HakList"),
      stripsSourceCustomTlk: droppedRootFields.includes("Mod_CustomTlk"),
      clearedEventFields,
      defaultBicCleared,
    },
  };
}

function readRuntimeHookStats(erf, areaResref, expectedOnEnter = AUTORUN_SCRIPT_RESREF) {
  const areEntry = findResource(erf, areaResref, RESOURCE_TYPES.are);
  const ifoEntry = findResource(erf, "module", RESOURCE_TYPES.ifo);
  if (!areEntry || !ifoEntry) {
    return {
      areaOnEnter: null,
      moduleEntryArea: null,
      moduleEntryX: null,
      moduleEntryY: null,
      moduleEntryZ: null,
      moduleEntryDirX: null,
      moduleEntryDirY: null,
      areaOnEnterPrepared: false,
      moduleStartPrepared: false,
    };
  }
  const are = parseGff(areEntry.bytes, `${areaResref}.are`);
  const ifo = parseGff(ifoEntry.bytes, "module.ifo");
  const areRoot = are.structs[0];
  const ifoRoot = ifo.structs[0];
  const areaOnEnter = getField(areRoot, "OnEnter")?.value ?? null;
  const moduleEntryArea = getField(ifoRoot, "Mod_Entry_Area")?.value ?? null;
  const moduleEntryX = getField(ifoRoot, "Mod_Entry_X")?.value ?? null;
  const moduleEntryY = getField(ifoRoot, "Mod_Entry_Y")?.value ?? null;
  const moduleEntryZ = getField(ifoRoot, "Mod_Entry_Z")?.value ?? null;
  const moduleEntryDirX = getField(ifoRoot, "Mod_Entry_Dir_X")?.value ?? null;
  const moduleEntryDirY = getField(ifoRoot, "Mod_Entry_Dir_Y")?.value ?? null;
  return {
    areaOnEnter,
    moduleEntryArea,
    moduleEntryX,
    moduleEntryY,
    moduleEntryZ,
    moduleEntryDirX,
    moduleEntryDirY,
    areaOnEnterPrepared: areaOnEnter === expectedOnEnter,
    moduleStartPrepared: moduleEntryArea === areaResref,
  };
}

function summarizeStatus({
  missingCompiledDrivers,
  missingUtilityScripts,
  stageAreaPresent,
  runtimeHookStats,
  onEnterScriptPresent = true,
}) {
  if (
    missingCompiledDrivers.length > 0 ||
    missingUtilityScripts.length > 0 ||
    !stageAreaPresent ||
    !onEnterScriptPresent
  ) {
    return "blocked-scene-driver-module-incomplete";
  }
  if (!runtimeHookStats.areaOnEnterPrepared || !runtimeHookStats.moduleStartPrepared) {
    return "blocked-runtime-autostart-hook-incomplete";
  }
  return "runtime-scene-module-ready-runtime-capture-required";
}

async function writeOracleModuleVariant({
  sourceErf,
  sourceIfoEntry,
  compiledEntries,
  outputModulePath,
  onEnterScriptResref,
  expectedOnEnter,
  generatedAt,
}) {
  const clonedStageArea = cloneStageAreaResources(
    sourceErf,
    BASE_STAGE_AREA_RESREF,
    ORACLE_STAGE_AREA_RESREF,
    onEnterScriptResref,
  );
  const supportResources = copyModuleSupportResources(sourceErf);
  const moduleStartLocation = patchModuleStartLocation(
    sourceIfoEntry.bytes,
    ORACLE_STAGE_AREA_RESREF,
  );
  const mergedEntries = [
    { resref: "module", type: RESOURCE_TYPES.ifo, bytes: moduleStartLocation.bytes },
    ...supportResources.entries,
    ...clonedStageArea.entries,
    ...compiledEntries.map((entry) => ({
      resref: entry.resref,
      type: entry.type,
      bytes: entry.bytes,
    })),
  ];

  const backupPath = existsSync(outputModulePath)
    ? `${outputModulePath}.pre-light-shadow-drivers-${generatedAt.replace(/[:.]/g, "-")}.bak`
    : null;
  if (backupPath) {
    await copyFile(outputModulePath, backupPath);
  }

  const repacked = buildErfV10FromEntries(sourceErf.header, sourceErf.localizedStrings, mergedEntries);
  await writeFile(outputModulePath, repacked);
  const finalBytes = await readFile(outputModulePath);
  const finalErf = readErfEntries(finalBytes, outputModulePath);
  const finalKeys = new Set(finalErf.entries.map((entry) => `${entry.resref}:${entry.type}`));
  const missingCompiledDrivers = compiledEntries
    .filter((entry) => entry.kind === "driver" && !finalKeys.has(`${entry.resref}:${entry.type}`))
    .map((entry) => entry.resref);
  const missingUtilityScripts = compiledEntries
    .filter((entry) => entry.kind === "utility" && !finalKeys.has(`${entry.resref}:${entry.type}`))
    .map((entry) => entry.resref);
  const stageAreaPresent = hasResource(finalErf, ORACLE_STAGE_AREA_RESREF, RESOURCE_TYPES.are);
  const onEnterScriptPresent = hasResource(finalErf, onEnterScriptResref, RESOURCE_TYPES.ncs);
  const runtimeHookStats = readRuntimeHookStats(
    finalErf,
    ORACLE_STAGE_AREA_RESREF,
    expectedOnEnter ?? onEnterScriptResref,
  );
  runtimeHookStats.onEnterScriptPresent = onEnterScriptPresent;
  const status = summarizeStatus({
    missingCompiledDrivers,
    missingUtilityScripts,
    stageAreaPresent,
    runtimeHookStats,
    onEnterScriptPresent,
  });

  return {
    status,
    outputModulePath,
    backupPath,
    clonedStageArea,
    moduleStartLocation,
    isolatedRuntimeModule: {
      copiedSourceEntries: false,
      sourceEntryCount: sourceErf.entries.length,
      finalEntryCount: finalErf.entries.length,
      retainedEntryKinds: [
        "module.ifo",
        "repute.fac",
        "als_light_lab.are/git/gic",
        "compiled .ncs drivers",
      ],
      copiedSupportResources: supportResources.entries.map((entry) => ({
        resref: entry.resref,
        type: entry.type,
      })),
      missingSupportResources: supportResources.missing,
      sourceModuleRootFieldsDropped: moduleStartLocation.isolation.droppedRootFields,
      sourceHakListStripped: moduleStartLocation.isolation.stripsSourceHakList,
      sourceCustomTlkStripped: moduleStartLocation.isolation.stripsSourceCustomTlk,
      moduleEventFieldsCleared: moduleStartLocation.isolation.clearedEventFields,
      moduleDefaultBicCleared: moduleStartLocation.isolation.defaultBicCleared,
      stageAreaEventsCleared: SOURCE_AREA_EVENT_FIELDS_TO_CLEAR,
      stageAreaTilePatch: clonedStageArea.tilePatch,
      gitRuntimeListsPruned: clonedStageArea.runtimeListsPruned.git,
      gicRuntimeListsPruned: clonedStageArea.runtimeListsPruned.gic,
    },
    finalBytes,
    finalErf,
    finalKeys,
    missingCompiledDrivers,
    missingUtilityScripts,
    stageAreaPresent,
    runtimeHookStats,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const modulesDir = resolve(options.nwnModulesDir);
  const compileManifestPath = toAbsolute(repoRoot, options.compileManifest);
  const summaryPath = toAbsolute(repoRoot, options.summary);
  if (!existsSync(modulesDir)) {
    throw new Error(`NWN modules directory not found: ${modulesDir}`);
  }
  if (!existsSync(compileManifestPath)) {
    throw new Error(`Compile manifest not found: ${compileManifestPath}`);
  }

  const compileManifest = JSON.parse(await readFile(compileManifestPath, "utf8"));
  const compiledEntries = await compiledEntriesFromManifest(repoRoot, compileManifest);
  const sourceModulePath = await chooseSourceModule(modulesDir, options.sourceModuleFile);
  const outputModulePath = resolveModulePath(modulesDir, options.outputModuleFile);
  const moduleBytes = await readFile(sourceModulePath);
  const sourceErf = readErfEntries(moduleBytes, sourceModulePath);
  const sourceIfoEntry = findResource(sourceErf, "module", RESOURCE_TYPES.ifo);
  if (!sourceIfoEntry) {
    throw new Error(`Missing module.ifo in ${sourceModulePath}`);
  }
  const generatedAt = new Date().toISOString();
  const mainModule = await writeOracleModuleVariant({
    sourceErf,
    sourceIfoEntry,
    compiledEntries,
    outputModulePath,
    onEnterScriptResref: AUTORUN_SCRIPT_RESREF,
    expectedOnEnter: AUTORUN_SCRIPT_RESREF,
    generatedAt,
  });
  const referenceModules = [];
  if (options.writeReferenceModules) {
    for (const variant of REFERENCE_MODULE_VARIANTS) {
      const referenceOutputModulePath = resolveModulePath(modulesDir, variant.moduleFile);
      const referenceModule = await writeOracleModuleVariant({
        sourceErf,
        sourceIfoEntry,
        compiledEntries,
        outputModulePath: referenceOutputModulePath,
        onEnterScriptResref: variant.utilityScriptResref,
        expectedOnEnter: variant.utilityScriptResref,
        generatedAt,
      });
      referenceModules.push({
        ...variant,
        status: referenceModule.status,
        outputModulePath: referenceOutputModulePath,
        backupPath: referenceModule.backupPath,
        runtimeArea: ORACLE_STAGE_AREA_RESREF,
        areaOnEnter: referenceModule.runtimeHookStats.areaOnEnter,
        areaOnEnterPrepared: referenceModule.runtimeHookStats.areaOnEnterPrepared,
        moduleStartPrepared: referenceModule.runtimeHookStats.moduleStartPrepared,
        outputModuleSizeBytes: referenceModule.finalBytes.length,
        outputModuleSha256: sha256(referenceModule.finalBytes),
        safeCapture: {
          script: "backend/scripts/capture-area-lighting-retail-oracle-window.ps1",
          flags: ["-NoFocus", "-NoTopMost", "-NoEscape"],
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesForegroundWindow: false,
          usesTopmost: false,
        },
      });
    }
  }

  const summary = {
    version: "aurora-area-lighting-retail-oracle-driver-module-injection/v1",
    generatedAt,
    status: mainModule.status,
    repoRoot,
    sourceModulePath,
    outputModulePath,
    backupPath: mainModule.backupPath,
    compileManifest: {
      path: toRepoRelative(repoRoot, compileManifestPath),
      status: compileManifest.status,
      summary: compileManifest.summary,
    },
    stageArea: {
      baseAreaResref: BASE_STAGE_AREA_RESREF,
      requiredAreaResref: ORACLE_STAGE_AREA_RESREF,
      oracleAreaResref: ORACLE_STAGE_AREA_RESREF,
      present: mainModule.stageAreaPresent,
      clonedFromBaseArea: BASE_STAGE_AREA_RESREF,
      clonedResources: mainModule.clonedStageArea.clonedResources,
      sourceResourceSizes: mainModule.clonedStageArea.sourceResourceSizes,
      sourceBaseAreaPreserved: hasResource(mainModule.finalErf, BASE_STAGE_AREA_RESREF, RESOURCE_TYPES.are),
      runtimeListsPruned: mainModule.clonedStageArea.runtimeListsPruned,
    },
    runtimeAutostart: {
      scriptResref: AUTORUN_SCRIPT_RESREF,
      areaOnEnter: {
        previousOnEnter: mainModule.clonedStageArea.areaOnEnter.previousOnEnter,
        nextOnEnter: mainModule.clonedStageArea.areaOnEnter.nextOnEnter,
        identityPatched: mainModule.clonedStageArea.areaOnEnter.identityPatched,
      },
      moduleStartLocation: {
        previous: mainModule.moduleStartLocation.previous,
        next: mainModule.moduleStartLocation.next,
      },
      final: mainModule.runtimeHookStats,
      prepared:
        mainModule.runtimeHookStats.areaOnEnterPrepared && mainModule.runtimeHookStats.moduleStartPrepared,
    },
    moduleIsolation: mainModule.isolatedRuntimeModule,
    referenceModules,
    safety: {
      overwritesSourceModule: sourceModulePath === outputModulePath,
      backupWritten: Boolean(mainModule.backupPath),
      isolatedRuntimeModule: true,
      copiesFullSourceModuleEntries: false,
      sourceHakListStripped: mainModule.isolatedRuntimeModule.sourceHakListStripped,
      sourceCustomTlkStripped: mainModule.isolatedRuntimeModule.sourceCustomTlkStripped,
      referenceModuleCount: referenceModules.length,
      referenceModulesUsePerLaneOnEnter: referenceModules.every(
        (entry) => entry.areaOnEnter === entry.utilityScriptResref,
      ),
      launchesRetailProcess: false,
      capturesRuntimeArtifacts: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesForegroundWindow: false,
      usesTopmost: false,
      doesNotFabricateRetailArtifacts: true,
      canonicalParityPromoted: false,
    },
    summary: {
      compiledDriverCount: compiledEntries.filter((entry) => entry.kind === "driver").length,
      utilityScriptCount: compiledEntries.filter((entry) => entry.kind === "utility").length,
      missingCompiledDriverCount: mainModule.missingCompiledDrivers.length,
      missingUtilityScriptCount: mainModule.missingUtilityScripts.length,
      areaOnEnterPrepared: mainModule.runtimeHookStats.areaOnEnterPrepared,
      moduleStartPrepared: mainModule.runtimeHookStats.moduleStartPrepared,
      originalEntryCount: sourceErf.entries.length,
      finalEntryCount: mainModule.finalErf.entries.length,
      sourceEntriesNotCopied: sourceErf.entries.length,
      clonedStageAreaResourceCount: mainModule.clonedStageArea.entries.length,
      outputModuleSizeBytes: mainModule.finalBytes.length,
      outputModuleSha256: sha256(mainModule.finalBytes),
      referenceModuleCount: referenceModules.length,
      referenceModuleReadyCount: referenceModules.filter(
        (entry) =>
          entry.status === "runtime-scene-module-ready-runtime-capture-required" &&
          entry.areaOnEnterPrepared &&
          entry.moduleStartPrepared,
      ).length,
    },
    drivers: compiledEntries.map((entry) => ({
      caseId: entry.caseId,
      kind: entry.kind,
      resref: entry.resref,
      compiledPath: toRepoRelative(repoRoot, entry.compiledPath),
      presentInOutputModule: mainModule.finalKeys.has(`${entry.resref}:${entry.type}`),
    })),
    missingCompiledDrivers: mainModule.missingCompiledDrivers,
    missingUtilityScripts: mainModule.missingUtilityScripts,
    nextRequiredActions: [
      "Open or run the disposable oracle module in NWN/toolset.",
      "Let als_light_lab.OnEnter run als_autorun for required cases.",
      "For isolated lane-reference captures, open the generated short-name als_ref*.mod / als_rt*.mod variant matching the desired lane; no dm_runscript keyboard input is required.",
      "Rerun readiness, capture queue, blocked compare reports, and the retail oracle gate.",
    ],
    nonEvidenceNotice:
      "Injected compiled drivers and OnEnter autorun make the disposable scene module runnable. They are not retail pixels, active-slot dumps, or parity proof.",
  };

  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: summary.status,
        outputModulePath,
        summary: summary.summary,
        referenceModules: referenceModules.map((entry) => ({
          moduleFile: entry.moduleFile,
          utilityScriptResref: entry.utilityScriptResref,
          artifact: entry.artifact,
          status: entry.status,
          areaOnEnterPrepared: entry.areaOnEnterPrepared,
          moduleStartPrepared: entry.moduleStartPrepared,
        })),
        stageArea: summary.stageArea,
        runtimeAutostart: summary.runtimeAutostart.final,
      },
      null,
      2,
    ),
  );

  if (summary.status !== "runtime-scene-module-ready-runtime-capture-required") {
    process.exit(1);
  }
  if (
    options.writeReferenceModules &&
    referenceModules.some(
      (entry) =>
        entry.status !== "runtime-scene-module-ready-runtime-capture-required" ||
        !entry.areaOnEnterPrepared ||
        !entry.moduleStartPrepared,
    )
  ) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

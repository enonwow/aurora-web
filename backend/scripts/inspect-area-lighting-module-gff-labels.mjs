#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const RESOURCE_TYPES = {
  are: 2012,
  ifo: 2014,
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
  STRUCT: 14,
  LIST: 15,
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_SUMMARY =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/compiled-driver-module-injection-summary.json";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/module-gff-label-audit.json";

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    summary: DEFAULT_SUMMARY,
    output: DEFAULT_OUTPUT,
    modules: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--summary") {
      index += 1;
      options.summary = requireValue(arg, argv[index]);
    } else if (arg === "--module") {
      index += 1;
      options.modules.push(requireValue(arg, argv[index]));
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/inspect-area-lighting-module-gff-labels.mjs [options]

Options:
  --repoRoot <path>  Repository root. Defaults to aurora-web root.
  --summary <path>   Injection summary JSON. Defaults to ${DEFAULT_SUMMARY}
  --module <path>    Module to inspect. Can be passed more than once.
  --out <path>       JSON report path. Defaults to ${DEFAULT_OUTPUT}
`);
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  return {
    path: isAbsolute(path) ? path : toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(readFileSync(path)),
  };
}

function readErfEntries(bytes, sourceLabel) {
  if (bytes.length < 160) {
    throw new Error(`ERF too small: ${sourceLabel}`);
  }
  const entryCount = bytes.readUInt32LE(16);
  const keyOffset = bytes.readUInt32LE(24);
  const resourceOffset = bytes.readUInt32LE(28);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    const keyEntryOffset = keyOffset + index * 24;
    const resourceEntryOffset = resourceOffset + index * 8;
    const resref = bytes
      .subarray(keyEntryOffset, keyEntryOffset + 16)
      .toString("ascii")
      .replace(/\0.*$/s, "")
      .toLowerCase();
    const type = bytes.readUInt16LE(keyEntryOffset + 20);
    const offset = bytes.readUInt32LE(resourceEntryOffset);
    const size = bytes.readUInt32LE(resourceEntryOffset + 4);
    entries.push({
      resref,
      type,
      bytes: bytes.subarray(offset, offset + size),
    });
  }

  return entries;
}

function findResource(entries, resref, type) {
  const normalized = resref.toLowerCase();
  return entries.find((entry) => entry.resref === normalized && entry.type === type) ?? null;
}

function parseGff(bytes, sourceLabel) {
  if (bytes.length < 56) {
    throw new Error(`GFF too small: ${sourceLabel}`);
  }
  const header = {
    type: bytes.subarray(0, 4).toString("ascii").trim(),
    version: bytes.subarray(4, 8).toString("ascii").trim(),
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
        .replace(/\0.*$/s, "")
        .trim(),
    );
  }

  const fields = [];
  for (let index = 0; index < header.fieldCount; index += 1) {
    const offset = header.fieldOffset + index * 12;
    const labelIndex = bytes.readUInt32LE(offset + 4);
    fields.push({
      index,
      typeId: bytes.readUInt32LE(offset),
      labelIndex,
      label: labels[labelIndex] ?? "",
      dataOrOffset: bytes.readUInt32LE(offset + 8),
    });
  }

  const structs = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * 12;
    structs.push({
      index,
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8),
    });
  }

  const rootFields = {};
  const rootStruct = structs[0];
  if (rootStruct) {
    for (const fieldIndex of readStructFieldIndices(bytes, header, rootStruct)) {
      const field = fields[fieldIndex];
      if (field?.label) {
        rootFields[field.label] = readFieldValue(bytes, header, field);
      }
    }
  }

  const emptyLabels = labels
    .map((label, index) => ({ index, label }))
    .filter((entry) => entry.label.length === 0);
  const emptyFieldRefs = fields
    .filter((field) => !field.label)
    .map((field) => ({
      fieldIndex: field.index,
      labelIndex: field.labelIndex,
      typeId: field.typeId,
    }));

  return {
    sourceLabel,
    header,
    emptyLabelCount: emptyLabels.length,
    emptyLabels,
    emptyFieldRefCount: emptyFieldRefs.length,
    emptyFieldRefs,
    rootFields,
  };
}

function readStructFieldIndices(bytes, header, structEntry) {
  if (structEntry.fieldCount === 0) {
    return [];
  }
  if (structEntry.fieldCount === 1) {
    return [structEntry.dataOrOffset];
  }
  const indices = [];
  for (let index = 0; index < structEntry.fieldCount; index += 1) {
    indices.push(bytes.readUInt32LE(header.fieldIndicesOffset + structEntry.dataOrOffset + index * 4));
  }
  return indices;
}

function readFieldValue(bytes, header, field) {
  const offset = header.fieldDataOffset + field.dataOrOffset;
  switch (field.typeId) {
    case FIELD_TYPE.BYTE:
    case FIELD_TYPE.CHAR:
      return field.dataOrOffset & 0xff;
    case FIELD_TYPE.WORD:
    case FIELD_TYPE.SHORT:
      return field.dataOrOffset & 0xffff;
    case FIELD_TYPE.DWORD:
      return field.dataOrOffset >>> 0;
    case FIELD_TYPE.INT:
      return field.dataOrOffset | 0;
    case FIELD_TYPE.FLOAT: {
      const inline = Buffer.allocUnsafe(4);
      inline.writeUInt32LE(field.dataOrOffset, 0);
      return inline.readFloatLE(0);
    }
    case FIELD_TYPE.CEXOSTRING: {
      const length = bytes.readUInt32LE(offset);
      return bytes.subarray(offset + 4, offset + 4 + length).toString("utf8");
    }
    case FIELD_TYPE.RESREF: {
      const length = bytes.readUInt8(offset);
      return bytes.subarray(offset + 1, offset + 1 + length).toString("ascii").toLowerCase();
    }
    case FIELD_TYPE.CEXOLOCSTRING:
      return {
        strRef: bytes.readUInt32LE(offset + 4),
      };
    case FIELD_TYPE.STRUCT:
    case FIELD_TYPE.LIST:
      return field.dataOrOffset;
    default:
      return null;
  }
}

function inspectModule(repoRoot, modulePath) {
  const absolutePath = toAbsolute(repoRoot, modulePath);
  if (!existsSync(absolutePath)) {
    return {
      modulePath,
      exists: false,
      errors: [`Module file missing: ${modulePath}`],
    };
  }

  const erf = readErfEntries(readFileSync(absolutePath), absolutePath);
  const moduleIfo = findResource(erf, "module", RESOURCE_TYPES.ifo);
  const lightLabAre = findResource(erf, "als_light_lab", RESOURCE_TYPES.are);
  const ifo = moduleIfo ? parseGff(moduleIfo.bytes, "module.ifo") : null;
  const area = lightLabAre ? parseGff(lightLabAre.bytes, "als_light_lab.are") : null;
  const totalEmptyLabels = (ifo?.emptyLabelCount ?? 0) + (area?.emptyLabelCount ?? 0);
  const totalEmptyFieldRefs = (ifo?.emptyFieldRefCount ?? 0) + (area?.emptyFieldRefCount ?? 0);

  return {
    modulePath: absolutePath,
    exists: true,
    file: describeFile(repoRoot, absolutePath),
    moduleEntryArea: ifo?.rootFields?.Mod_Entry_Area ?? null,
    areaOnEnter: area?.rootFields?.OnEnter ?? null,
    hasOwnLightLabArea: Boolean(lightLabAre),
    totalEmptyLabels,
    totalEmptyFieldRefs,
    ifo: ifo
      ? {
          emptyLabelCount: ifo.emptyLabelCount,
          emptyLabels: ifo.emptyLabels,
          emptyFieldRefCount: ifo.emptyFieldRefCount,
          emptyFieldRefs: ifo.emptyFieldRefs,
          rootFields: {
            Mod_Entry_Area: ifo.rootFields.Mod_Entry_Area ?? null,
            Mod_Entry_X: ifo.rootFields.Mod_Entry_X ?? null,
            Mod_Entry_Y: ifo.rootFields.Mod_Entry_Y ?? null,
            Mod_Entry_Z: ifo.rootFields.Mod_Entry_Z ?? null,
            Mod_Entry_Dir_X: ifo.rootFields.Mod_Entry_Dir_X ?? null,
            Mod_Entry_Dir_Y: ifo.rootFields.Mod_Entry_Dir_Y ?? null,
          },
        }
      : null,
    area: area
      ? {
          emptyLabelCount: area.emptyLabelCount,
          emptyLabels: area.emptyLabels,
          emptyFieldRefCount: area.emptyFieldRefCount,
          emptyFieldRefs: area.emptyFieldRefs,
          rootFields: {
            OnEnter: area.rootFields.OnEnter ?? null,
            Tag: area.rootFields.Tag ?? null,
            ResRef: area.rootFields.ResRef ?? null,
          },
        }
      : null,
  };
}

function loadModuleTargets(repoRoot, options) {
  if (options.modules.length > 0) {
    return options.modules;
  }

  const summaryPath = toAbsolute(repoRoot, options.summary);
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  return [
    summary.outputModulePath,
    ...(summary.referenceModules ?? []).map((entry) => entry.outputModulePath),
  ].filter(Boolean);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = options.repoRoot;
  const modules = loadModuleTargets(repoRoot, options);
  const inspections = modules.map((modulePath) => inspectModule(repoRoot, modulePath));
  const modulesWithEmptyLabels = inspections.filter((entry) => entry.totalEmptyLabels > 0);
  const modulesWithEmptyFieldRefs = inspections.filter((entry) => entry.totalEmptyFieldRefs > 0);
  const report = {
    version: "aurora-area-lighting-module-gff-label-audit/v1",
    generatedAt: new Date().toISOString(),
    status:
      modulesWithEmptyLabels.length === 0 && modulesWithEmptyFieldRefs.length === 0
        ? "module-gff-labels-clean"
        : "module-gff-empty-labels-detected",
    repoRoot,
    summaryPath: options.summary,
    moduleCount: inspections.length,
    modulesWithEmptyLabels: modulesWithEmptyLabels.map((entry) => entry.modulePath),
    modulesWithEmptyFieldRefs: modulesWithEmptyFieldRefs.map((entry) => entry.modulePath),
    provesOwnLocationArea:
      inspections.length > 0 &&
      inspections.every(
        (entry) =>
          entry.exists &&
          entry.hasOwnLightLabArea &&
          entry.moduleEntryArea === "als_light_lab" &&
          entry.areaOnEnter,
      ),
    inspections,
  };

  const outputPath = toAbsolute(repoRoot, options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.status,
        output: toRepoRelative(repoRoot, outputPath),
        moduleCount: report.moduleCount,
        modulesWithEmptyLabels: report.modulesWithEmptyLabels.length,
        modulesWithEmptyFieldRefs: report.modulesWithEmptyFieldRefs.length,
        provesOwnLocationArea: report.provesOwnLocationArea,
      },
      null,
      2,
    ),
  );
}

main();

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

const RESOURCE_TYPES = {
  mdl: 2002,
  ifo: 2014
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

const repoRoot = resolve(import.meta.dirname, "..", "..");
const outputDir = join(repoRoot, ".codex-tmp", "aurora-live-evidence", "vfx-missing-resource-audit");
const mapPath = join(
  repoRoot,
  "backend",
  "docs",
  "aurora-reverse",
  "artifacts",
  "vfx-catalog-lab-map",
  "vfx-catalog-lab-map.json"
);
const clipsDir = join(repoRoot, ".codex-tmp", "aurora-live-evidence", "vfx-capture-clips", "all-v2");
const strictEmptyCsvPath = join(clipsDir, "qa-vfx-empty-strict-candidates.csv");
const lowVisibilityCsvPath = join(clipsDir, "qa-vfx-low-visibility-candidates.csv");
const visibilityCsvPath = join(clipsDir, "qa-vfx-visibility-metrics.csv");
const remapSummaryPath = join(
  repoRoot,
  ".codex-tmp",
  "aurora-live-evidence",
  "vfx-missing-resource-remap",
  "vfx-missing-resource-remap-summary.json"
);

function getNwnUserRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  return join(home, "Documents", "Neverwinter Nights");
}

function getNwnInstallRoot() {
  return "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights";
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/u, ""));
    rows.push(row);
  }
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0];
  return rows.slice(1).filter((fields) => fields.some((field) => field !== "")).map((fields) =>
    Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""]))
  );
}

async function readCsvIfExists(path) {
  if (!existsSync(path)) {
    return [];
  }
  return parseCsv(await readFile(path, "utf-8"));
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

function parseGff(bytes, sourcePath) {
  const fileType = bytes.toString("ascii", 0, 4);
  const fileVersion = bytes.toString("ascii", 4, 8);
  if (fileVersion !== "V3.2") {
    throw new Error(`Unsupported GFF version ${fileVersion} in ${sourcePath}`);
  }

  const header = {
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
        .trim()
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
      indices.push(bytes.readUInt32LE(header.fieldIndicesOffset + structEntry.dataOrOffset + index * 4));
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
      case FIELD_TYPE.INT:
        return fieldEntry.dataOrOffset;
      case FIELD_TYPE.FLOAT: {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(fieldEntry.dataOrOffset);
        return buffer.readFloatLE();
      }
      case FIELD_TYPE.CEXOSTRING: {
        const length = bytes.readUInt32LE(offset);
        return bytes.subarray(offset + 4, offset + 4 + length).toString("utf-8");
      }
      case FIELD_TYPE.RESREF: {
        const length = bytes.readUInt8(offset);
        return bytes.subarray(offset + 1, offset + 1 + length).toString("ascii");
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
    fileType,
    fileVersion,
    structs
  };
}

function getField(struct, label) {
  return struct.fields.find((field) => field.label === label);
}

async function findLabModulePath() {
  const modulesDir = join(getNwnUserRoot(), "modules");
  const names = await readdir(modulesDir);
  const preferred = names
    .filter((name) => name.toLowerCase().endsWith("vfx_catalog_lab.mod"))
    .filter((name) => name.toLowerCase() !== "tlc_vfx_catalog_lab.mod")
    .sort((left, right) => left.localeCompare(right))[0];
  const fallback = "tlc_vfx_catalog_lab.mod";
  const selected = preferred ?? fallback;
  const path = join(modulesDir, selected);
  if (!existsSync(path)) {
    throw new Error(`Lab module not found: ${path}`);
  }
  return path;
}

async function readModuleContext() {
  const modulePath = await findLabModulePath();
  const moduleBytes = await readFile(modulePath);
  const entries = readErfEntries(moduleBytes, modulePath);
  const ifoEntry = entries.find((entry) => entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo);
  if (!ifoEntry) {
    throw new Error(`Missing module.ifo in ${modulePath}`);
  }
  const ifo = parseGff(ifoEntry.bytes, "module.ifo");
  const root = ifo.structs[0];
  const hakListField = getField(root, "Mod_HakList");
  const hakList = hakListField?.typeId === FIELD_TYPE.LIST ? hakListField.value : [];
  const haks = [];
  for (const structIndex of hakList ?? []) {
    const hakStruct = ifo.structs[structIndex];
    const hakName = getField(hakStruct, "Mod_Hak")?.value;
    if (hakName) {
      haks.push(String(hakName));
    }
  }
  return {
    modulePath,
    moduleBytes,
    moduleEntries: entries,
    haks
  };
}

function addHit(index, resref, source) {
  const key = String(resref ?? "").toLowerCase();
  if (!key) {
    return;
  }
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(source);
}

async function indexErfModelResources(filePath, sourceKind, index) {
  if (!existsSync(filePath)) {
    return { filePath, sourceKind, exists: false, mdlCount: 0 };
  }
  const bytes = await readFile(filePath);
  const entries = readErfEntries(bytes, filePath);
  let mdlCount = 0;
  for (const entry of entries) {
    if (entry.type === RESOURCE_TYPES.mdl) {
      mdlCount += 1;
      addHit(index, entry.resref, {
        sourceKind,
        source: basename(filePath),
        path: filePath,
        type: entry.type,
        size: entry.size
      });
    }
  }
  return { filePath, sourceKind, exists: true, mdlCount };
}

function readKeyEntries(bytes, sourcePath) {
  if (bytes.length < 32) {
    throw new Error(`KEY file is too small: ${sourcePath}`);
  }
  const signature = bytes.toString("ascii", 0, 4);
  const version = bytes.toString("ascii", 4, 8);
  if (signature !== "KEY ") {
    throw new Error(`Unsupported KEY signature ${JSON.stringify(signature)} in ${sourcePath}`);
  }
  if (version !== "V1  " && version !== "V1.0") {
    throw new Error(`Unsupported KEY version ${JSON.stringify(version)} in ${sourcePath}`);
  }
  const keyCount = bytes.readUInt32LE(12);
  const keyOffset = bytes.readUInt32LE(20);
  const entries = [];
  for (let index = 0; index < keyCount; index += 1) {
    const offset = keyOffset + index * 22;
    const resref = bytes
      .subarray(offset, offset + 16)
      .toString("ascii")
      .replace(/\0.*$/u, "")
      .trim()
      .toLowerCase();
    const type = bytes.readUInt16LE(offset + 16);
    const resId = bytes.readUInt32LE(offset + 18);
    entries.push({ resref, type, resId });
  }
  return entries;
}

async function indexBaseKeyResources(index) {
  const dataDir = join(getNwnInstallRoot(), "data");
  const keyNames = ["nwn_base.key", "nwn_retail.key"];
  const summaries = [];
  for (const keyName of keyNames) {
    const keyPath = join(dataDir, keyName);
    if (!existsSync(keyPath)) {
      summaries.push({ keyPath, exists: false, mdlCount: 0 });
      continue;
    }
    const entries = readKeyEntries(await readFile(keyPath), keyPath);
    let mdlCount = 0;
    for (const entry of entries) {
      if (entry.type === RESOURCE_TYPES.mdl) {
        mdlCount += 1;
        addHit(index, entry.resref, {
          sourceKind: "baseKey",
          source: keyName,
          path: keyPath,
          type: entry.type,
          size: null
        });
      }
    }
    summaries.push({ keyPath, exists: true, mdlCount });
  }
  return summaries;
}

async function indexOverrideResources(index) {
  const overrideDir = join(getNwnUserRoot(), "override");
  const summaries = [];
  async function visit(dir) {
    if (!existsSync(dir)) {
      return;
    }
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (extname(entry.name).toLowerCase() === ".mdl") {
        addHit(index, basename(entry.name, extname(entry.name)), {
          sourceKind: "override",
          source: entry.name,
          path,
          type: RESOURCE_TYPES.mdl,
          size: null
        });
        summaries.push(path);
      }
    }
  }
  await visit(overrideDir);
  return { overrideDir, mdlCount: summaries.length };
}

async function buildResourceIndexes(moduleContext) {
  const runtimeIndex = new Map();
  const localHakIndex = new Map();
  const hakDir = join(getNwnUserRoot(), "hak");
  const localHakNames = (await readdir(hakDir)).filter((name) => name.toLowerCase().endsWith(".hak"));
  const localHakPaths = new Map(localHakNames.map((name) => [name.toLowerCase(), join(hakDir, name)]));

  let moduleMdlCount = 0;
  for (const entry of moduleContext.moduleEntries) {
    if (entry.type === RESOURCE_TYPES.mdl) {
      moduleMdlCount += 1;
      addHit(runtimeIndex, entry.resref, {
        sourceKind: "module",
        source: basename(moduleContext.modulePath),
        path: moduleContext.modulePath,
        type: entry.type,
        size: entry.size
      });
    }
  }

  const moduleHakSummaries = [];
  for (const hak of moduleContext.haks) {
    const fileName = hak.toLowerCase().endsWith(".hak") ? hak : `${hak}.hak`;
    const hakPath = localHakPaths.get(fileName.toLowerCase());
    moduleHakSummaries.push(await indexErfModelResources(hakPath ?? join(hakDir, fileName), "moduleHak", runtimeIndex));
  }

  const localHakSummaries = [];
  for (const fileName of localHakNames) {
    localHakSummaries.push(await indexErfModelResources(join(hakDir, fileName), "localHak", localHakIndex));
  }

  const baseKeySummaries = await indexBaseKeyResources(runtimeIndex);
  const overrideSummary = await indexOverrideResources(runtimeIndex);

  return {
    runtimeIndex,
    localHakIndex,
    sourceSummary: {
      modulePath: moduleContext.modulePath,
      moduleMdlCount,
      moduleHakCount: moduleContext.haks.length,
      moduleHakSummaries,
      localHakCount: localHakNames.length,
      localHakMdlCount: localHakSummaries.reduce((sum, item) => sum + item.mdlCount, 0),
      baseKeySummaries,
      overrideSummary
    }
  };
}

function bestRuntimeHit(hits) {
  if (!hits?.length) {
    return null;
  }
  const order = new Map([
    ["module", 0],
    ["override", 1],
    ["moduleHak", 2],
    ["baseKey", 3]
  ]);
  return [...hits].sort((left, right) => (order.get(left.sourceKind) ?? 99) - (order.get(right.sourceKind) ?? 99))[0];
}

function classifyRow(missingRuntimeRefs, availableOnlyOutsideRuntimeRefs) {
  if (missingRuntimeRefs.length === 0) {
    return "available";
  }
  if (availableOnlyOutsideRuntimeRefs.length > 0) {
    return "missing_from_runtime_haks_but_exists_in_other_local_hak";
  }
  return "missing_everywhere_indexed";
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const remapSummary = existsSync(remapSummaryPath)
    ? JSON.parse(await readFile(remapSummaryPath, "utf-8"))
    : null;
  const remaps = new Map(
    (remapSummary?.patchedCells ?? []).map((cell) => [
      String(cell.from ?? "").toLowerCase(),
      {
        to: String(cell.to ?? "").toLowerCase(),
        confidence: cell.confidence ?? "",
        reason: cell.reason ?? ""
      }
    ])
  );
  const moduleContext = await readModuleContext();
  const { runtimeIndex, localHakIndex, sourceSummary } = await buildResourceIndexes(moduleContext);
  const map = JSON.parse(await readFile(mapPath, "utf-8"));
  const strictEmptyRows = await readCsvIfExists(strictEmptyCsvPath);
  const lowVisibilityRows = await readCsvIfExists(lowVisibilityCsvPath);
  const visibilityRows = await readCsvIfExists(visibilityCsvPath);
  const strictEmptyByRowId = new Map(strictEmptyRows.map((row) => [Number(row.rowId), row]));
  const lowVisibilityByRowId = new Map(lowVisibilityRows.map((row) => [Number(row.rowId), row]));
  const visibilityByRowId = new Map(visibilityRows.map((row) => [Number(row.rowId), row]));

  const rows = [];
  const refs = [];
  for (const row of map.visualeffects ?? []) {
    const modelRefs = row.modelRefs ?? [];
    if (modelRefs.length === 0) {
      continue;
    }
    const missingRuntimeRefs = [];
    const availableRuntimeRefs = [];
    const availableOnlyOutsideRuntimeRefs = [];

    for (const ref of modelRefs) {
      const originalResref = String(ref.value ?? "").toLowerCase();
      const remap = remaps.get(originalResref);
      const resref = remap?.to || originalResref;
      const runtimeHits = runtimeIndex.get(resref) ?? [];
      const localHits = localHakIndex.get(resref) ?? [];
      const runtimeHit = bestRuntimeHit(runtimeHits);
      const inRuntime = runtimeHits.length > 0;
      const outsideOnlyHits = inRuntime
        ? []
        : localHits.filter((hit) => hit.sourceKind === "localHak");
      refs.push({
        rowId: row.rowId,
        label: row.label,
        typeFD: row.typeFD,
        column: ref.column,
        resref: originalResref,
        effectiveResref: resref,
        remappedTo: remap?.to ?? "",
        remapConfidence: remap?.confidence ?? "",
        remapReason: remap?.reason ?? "",
        inRuntime,
        runtimeSourceKind: runtimeHit?.sourceKind ?? "",
        runtimeSource: runtimeHit?.source ?? "",
        runtimePath: runtimeHit?.path ?? "",
        runtimeSize: runtimeHit?.size ?? "",
        existsInOtherLocalHak: outsideOnlyHits.length > 0,
        otherLocalHakSources: outsideOnlyHits.map((hit) => hit.source).join(";")
      });
      if (inRuntime) {
        availableRuntimeRefs.push(resref);
      } else {
        missingRuntimeRefs.push(originalResref);
        if (outsideOnlyHits.length > 0) {
          availableOnlyOutsideRuntimeRefs.push(originalResref);
        }
      }
    }

    const strictEmpty = strictEmptyByRowId.get(row.rowId);
    const lowVisibility = lowVisibilityByRowId.get(row.rowId);
    const visibility = visibilityByRowId.get(row.rowId);
    rows.push({
      rowId: row.rowId,
      label: row.label,
      typeFD: row.typeFD,
      harness: row.harness,
      captureMode: strictEmpty?.captureMode ?? lowVisibility?.captureMode ?? visibility?.captureMode ?? "",
      strictEmpty: Boolean(strictEmpty),
      lowVisibility: Boolean(lowVisibility),
      visibleInCapture: strictEmpty ? "no_strict" : lowVisibility ? "low" : visibility ? "not_flagged" : "not_captured",
      modelRefCount: modelRefs.length,
      availableRuntimeRefs: availableRuntimeRefs.join(";"),
      remappedRuntimeRefs: modelRefs
        .map((ref) => String(ref.value ?? "").toLowerCase())
        .filter((resref) => remaps.has(resref))
        .map((resref) => `${resref}->${remaps.get(resref).to}`)
        .join(";"),
      missingRuntimeRefs: [...new Set(missingRuntimeRefs)].join(";"),
      availableOnlyOutsideRuntimeRefs: [...new Set(availableOnlyOutsideRuntimeRefs)].join(";"),
      missingRuntimeRefCount: new Set(missingRuntimeRefs).size,
      status: classifyRow([...new Set(missingRuntimeRefs)], [...new Set(availableOnlyOutsideRuntimeRefs)]),
      bestMeanDelta: strictEmpty?.bestMeanDelta ?? lowVisibility?.bestMeanDelta ?? visibility?.bestMeanDelta ?? "",
      mp4: strictEmpty?.file ?? lowVisibility?.file ?? visibility?.file ?? ""
    });
  }

  const missingRows = rows.filter((row) => row.missingRuntimeRefCount > 0);
  const missingEverywhereRows = rows.filter((row) => row.status === "missing_everywhere_indexed");
  const outsideOnlyRows = rows.filter((row) => row.status === "missing_from_runtime_haks_but_exists_in_other_local_hak");
  const strictEmptyMissingRows = missingRows.filter((row) => row.strictEmpty);
  const lowVisibilityMissingRows = missingRows.filter((row) => row.lowVisibility);

  const missingRefGroups = new Map();
  for (const row of missingRows) {
    for (const resref of String(row.missingRuntimeRefs).split(";").filter(Boolean)) {
      if (!missingRefGroups.has(resref)) {
        missingRefGroups.set(resref, {
          resref,
          rowCount: 0,
          strictEmptyRowCount: 0,
          lowVisibilityRowCount: 0,
          labels: []
        });
      }
      const group = missingRefGroups.get(resref);
      group.rowCount += 1;
      if (row.strictEmpty) {
        group.strictEmptyRowCount += 1;
      }
      if (row.lowVisibility) {
        group.lowVisibilityRowCount += 1;
      }
      group.labels.push(`${row.rowId}:${row.label}`);
    }
  }

  const missingRefs = [...missingRefGroups.values()]
    .map((group) => ({
      ...group,
      labels: group.labels.join(";")
    }))
    .sort((left, right) => right.strictEmptyRowCount - left.strictEmptyRowCount || right.rowCount - left.rowCount || left.resref.localeCompare(right.resref));

  const summary = {
    version: "aurora-vfx-missing-resource-audit/v1",
    generatedAt,
    mapPath,
    clipsDir,
    sourceSummary,
    remapOverlay: remapSummary
      ? {
          source: remapSummaryPath,
          patchedCellCount: remapSummary.patchedCellCount,
          patchedDistinctRefs: remapSummary.patchedDistinctRefs,
          skippedCellCount: remapSummary.skippedCellCount
        }
      : null,
    counts: {
      visualeffectsWithModelRefs: rows.length,
      modelRefEntries: refs.length,
      rowsWithAnyMissingRuntimeRef: missingRows.length,
      rowsMissingEverywhereIndexed: missingEverywhereRows.length,
      rowsMissingRuntimeButPresentOtherLocalHak: outsideOnlyRows.length,
      strictEmptyRowsWithAnyMissingRuntimeRef: strictEmptyMissingRows.length,
      lowVisibilityRowsWithAnyMissingRuntimeRef: lowVisibilityMissingRows.length,
      distinctMissingRuntimeRefs: missingRefs.length
    },
    topMissingRefs: missingRefs.slice(0, 40)
  };

  const summaryPath = join(outputDir, "vfx-missing-resource-summary.json");
  const rowsPath = join(outputDir, "vfx-missing-resource-rows.csv");
  const refsPath = join(outputDir, "vfx-missing-resource-refs.csv");
  const missingRefsPath = join(outputDir, "vfx-missing-resource-distinct-refs.csv");
  const strictEmptyMissingPath = join(outputDir, "vfx-missing-resource-strict-empty-rows.csv");
  const missingEverywherePath = join(outputDir, "vfx-missing-resource-missing-everywhere-rows.csv");
  const outsideOnlyPath = join(outputDir, "vfx-missing-resource-outside-runtime-hak-rows.csv");
  const reportPath = join(outputDir, "vfx-missing-resource-report.md");

  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
  await writeFile(
    rowsPath,
    toCsv(missingRows, [
      "rowId",
      "label",
      "typeFD",
      "harness",
      "captureMode",
      "strictEmpty",
      "lowVisibility",
      "visibleInCapture",
      "modelRefCount",
      "availableRuntimeRefs",
      "remappedRuntimeRefs",
      "missingRuntimeRefs",
      "availableOnlyOutsideRuntimeRefs",
      "missingRuntimeRefCount",
      "status",
      "bestMeanDelta",
      "mp4"
    ]),
    "utf-8"
  );
  await writeFile(
    refsPath,
    toCsv(refs.filter((ref) => !ref.inRuntime), [
      "rowId",
      "label",
      "typeFD",
      "column",
      "resref",
      "effectiveResref",
      "remappedTo",
      "remapConfidence",
      "remapReason",
      "inRuntime",
      "runtimeSourceKind",
      "runtimeSource",
      "runtimePath",
      "runtimeSize",
      "existsInOtherLocalHak",
      "otherLocalHakSources"
    ]),
    "utf-8"
  );
  await writeFile(
    missingRefsPath,
    toCsv(missingRefs, ["resref", "rowCount", "strictEmptyRowCount", "lowVisibilityRowCount", "labels"]),
    "utf-8"
  );
  await writeFile(
    strictEmptyMissingPath,
    toCsv(strictEmptyMissingRows, [
      "rowId",
      "label",
      "typeFD",
      "captureMode",
      "missingRuntimeRefs",
      "remappedRuntimeRefs",
      "availableRuntimeRefs",
      "status",
      "bestMeanDelta",
      "mp4"
    ]),
    "utf-8"
  );
  await writeFile(
    missingEverywherePath,
    toCsv(missingEverywhereRows, [
      "rowId",
      "label",
      "typeFD",
      "captureMode",
      "strictEmpty",
      "lowVisibility",
      "missingRuntimeRefs",
      "remappedRuntimeRefs",
      "bestMeanDelta"
    ]),
    "utf-8"
  );
  await writeFile(
    outsideOnlyPath,
    toCsv(outsideOnlyRows, [
      "rowId",
      "label",
      "typeFD",
      "captureMode",
      "strictEmpty",
      "lowVisibility",
      "missingRuntimeRefs",
      "availableOnlyOutsideRuntimeRefs",
      "bestMeanDelta"
    ]),
    "utf-8"
  );
  const reportLines = [
    "# VFX Missing Resource Audit",
    "",
    `Generated: ${generatedAt}`,
    "",
    "## Scope",
    "",
    `Indexed runtime-visible model resources from the lab module, its ${sourceSummary.moduleHakCount} module HAKs, override, and NWN base KEY files. Also indexed all local HAKs to detect resources that exist locally but are not loaded by this module.`,
    "",
    "## Counts",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| VFX rows with model refs | ${summary.counts.visualeffectsWithModelRefs} |`,
    `| Model ref entries checked | ${summary.counts.modelRefEntries} |`,
    `| Rows with any missing runtime model ref | ${summary.counts.rowsWithAnyMissingRuntimeRef} |`,
    `| Rows missing everywhere indexed | ${summary.counts.rowsMissingEverywhereIndexed} |`,
    `| Rows present only in non-runtime local HAK | ${summary.counts.rowsMissingRuntimeButPresentOtherLocalHak} |`,
    `| Strict-empty rows explained by missing runtime ref | ${summary.counts.strictEmptyRowsWithAnyMissingRuntimeRef} |`,
    `| Low-visibility rows with missing runtime ref | ${summary.counts.lowVisibilityRowsWithAnyMissingRuntimeRef} |`,
    `| Distinct missing runtime resrefs | ${summary.counts.distinctMissingRuntimeRefs} |`,
    "",
    "## Remap Overlay",
    "",
    remapSummary
      ? `Applied overlay from ${remapSummary.overlayHak?.overlayHakPath ?? remapSummaryPath}; patched cells: ${remapSummary.patchedCellCount}, skipped cells: ${remapSummary.skippedCellCount}.`
      : "No remap overlay was applied.",
    "",
    "## Strict Empty Rows With Missing Runtime Resource",
    "",
    "| Row | Label | Capture mode | Missing refs | bestMeanDelta |",
    "|---:|---|---|---|---:|",
    ...strictEmptyMissingRows.slice(0, 40).map((row) =>
      `| ${row.rowId} | ${row.label} | ${row.captureMode} | ${row.missingRuntimeRefs} | ${row.bestMeanDelta} |`
    ),
    strictEmptyMissingRows.length > 40 ? `| ... | ${strictEmptyMissingRows.length - 40} more rows |  |  |  |` : "",
    "",
    "## Files",
    "",
    `- Full missing row list: ${rowsPath}`,
    `- Per missing ref entry: ${refsPath}`,
    `- Distinct missing refs: ${missingRefsPath}`,
    `- Strict-empty missing rows: ${strictEmptyMissingPath}`,
    `- JSON summary: ${summaryPath}`
  ].filter((line) => line !== "");
  await writeFile(reportPath, `${reportLines.join("\n")}\n`, "utf-8");

  console.log(JSON.stringify({
    ...summary.counts,
    summaryPath,
    rowsPath,
    refsPath,
    missingRefsPath,
    strictEmptyMissingPath,
    reportPath,
    sha256: createHash("sha256").update(JSON.stringify(summary)).digest("hex")
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

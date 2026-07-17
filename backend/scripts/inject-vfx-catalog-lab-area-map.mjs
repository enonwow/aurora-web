import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const RESOURCE_TYPES = {
  are: 2012,
  git: 2023,
  ifo: 2014,
  ncs: 2010,
  nss: 2009,
  txt: 10
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

const AREA_RESREF = "enon_test_effect";
const PLACEABLE_LIST_LABEL = "Placeable List";
const CREATURE_LIST_LABEL = "Creature List";
const BASE_LEVER_TAG = "effects";
const STAGE_TARGET_TAG = "effect_test";
const STAGE_FALLBACK_TAG = "CombatDummy";
const ASCII_ALIAS_NAME = "tlc_vfx_catalog_lab.mod";
const TARGET_MODULE_FILE = process.env.VFX_LAB_MODULE_FILE?.trim() || null;
const BLOCK_GRID_COLUMNS = 13;
const BLOCK_GRID_START_X = 1.25;
const BLOCK_GRID_START_Y = 1.25;
const BLOCK_GRID_STEP_X = 1.42;
const BLOCK_GRID_STEP_Y = 1.74;
const DEMO_SCRIPT_RESREF = "vfxlab_area";
const DEMO_REPLAY_SCRIPT_RESREF = "vfxdemo82";
const DEMO_ROW_ID = 82;
const DEMO_ROW_LABEL = "VFX_DUR_PARALYZE";
const DEMO_EFFECT_DURATION_SECONDS = 8;
const TARGET_POSITION = {
  x: 9.5,
  y: 6.8,
  z: 0,
  bearing: 3.141593
};
const TARGET_FACING_VECTOR = {
  x: 0,
  y: -1
};
const DEMO_START_X = 9.5;
const DEMO_START_Y = 3.8;
const DEMO_START_Z = 0;
const NICE_LAYOUT_VERSION = "aurora-vfx-catalog-lab-centered-capture-stage/v3";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const backendRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "vfx-catalog-lab-map"
);

function getNwnUserRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  return join(home, "Documents", "Neverwinter Nights");
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
      ? Buffer.from(
          bytes.subarray(
            localizedStringOffset,
            localizedStringOffset + localizedStringSize
          )
        )
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
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size))
    });
  }

  return {
    header: Buffer.from(bytes.subarray(0, 160)),
    localizedStrings,
    entries
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
    listIndicesCount: bytes.readUInt32LE(52)
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
            "base64"
          )
        };
      }
      case FIELD_TYPE.STRUCT:
        return fieldEntry.dataOrOffset;
      case FIELD_TYPE.LIST:
        return readListIndices(fieldEntry);
      default:
        throw new Error(
          `Unsupported GFF field type ${fieldEntry.typeId} for ${fieldEntry.label} in ${sourceLabel}`
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
      dataOrOffset
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
      fieldCount: fieldIndices.length
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
    listIndices
  ]);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getField(struct, label) {
  return struct.fields.find((field) => field.label === label);
}

function setFieldValue(struct, label, value) {
  const field = getField(struct, label);
  if (!field) {
    throw new Error(`Missing field ${label} on cloned placeable`);
  }
  field.value = value;
}

function locString(text) {
  return {
    strRef: 0xffffffff,
    entries: [{ id: 0, text }]
  };
}

function buildBlockStations(map) {
  const byScript = new Map();
  for (const row of map.visualeffects ?? []) {
    const script = row.blockScript;
    if (!script || row.blank) {
      continue;
    }
    const entry =
      byScript.get(script) ??
      {
        script,
        blockStart: row.blockStart,
        blockEnd: row.blockEnd,
        firstRow: row.rowId,
        lastRow: row.rowId,
        activeRows: 0
      };
    entry.firstRow = Math.min(entry.firstRow, row.rowId);
    entry.lastRow = Math.max(entry.lastRow, row.rowId);
    entry.activeRows += 1;
    byScript.set(script, entry);
  }

  return [...byScript.values()].sort((left, right) => left.blockStart - right.blockStart);
}

function buildGalleryStationPosition(index) {
  // U-shaped gallery around the capture stage. It keeps the center clear for video proof.
  const frontCount = 13;
  const rightCount = 10;
  const backCount = 12;
  const frontStartX = 1.15;
  const frontStepX = 1.42;
  const sideStartY = 1.85;
  const sideStepY = 0.58;
  const backStartX = 17.9;
  const backStepX = 1.42;

  if (index < frontCount) {
    return {
      x: frontStartX + index * frontStepX,
      y: 0.92,
      bearing: 0
    };
  }

  if (index < frontCount + rightCount) {
    return {
      x: 18.1,
      y: sideStartY + (index - frontCount) * sideStepY,
      bearing: 1.570796
    };
  }

  if (index < frontCount + rightCount + backCount) {
    return {
      x: backStartX - (index - frontCount - rightCount) * backStepX,
      y: 7.25,
      bearing: 3.141593
    };
  }

  return {
    x: 1.35,
    y: 6.9 - (index - frontCount - rightCount - backCount) * sideStepY,
    bearing: 4.712389
  };
}

function formatStationLocName(station) {
  const blockStartLabel = String(station.blockStart).padStart(5, "0");
  const blockEndLabel = String(station.blockEnd).padStart(5, "0");
  return `VFX ${blockStartLabel}-${blockEndLabel} (${station.activeRows} active)`;
}

function getStructTag(struct) {
  return String(getField(struct, "Tag")?.value ?? "");
}

function setOptionalFieldValue(struct, label, value) {
  const field = getField(struct, label);
  if (!field) {
    return false;
  }
  field.value = value;
  return true;
}

function isGeneratedCaptureControlTag(tag) {
  return tag === BASE_LEVER_TAG || tag === DEMO_REPLAY_SCRIPT_RESREF || tag.startsWith("vxlb");
}

function moveStageTargetToCenter(struct) {
  const movedFields = [
    setOptionalFieldValue(struct, "X", TARGET_POSITION.x),
    setOptionalFieldValue(struct, "Y", TARGET_POSITION.y),
    setOptionalFieldValue(struct, "Z", TARGET_POSITION.z),
    setOptionalFieldValue(struct, "Bearing", TARGET_POSITION.bearing),
    setOptionalFieldValue(struct, "XPosition", TARGET_POSITION.x),
    setOptionalFieldValue(struct, "YPosition", TARGET_POSITION.y),
    setOptionalFieldValue(struct, "ZPosition", TARGET_POSITION.z),
    setOptionalFieldValue(struct, "XOrientation", TARGET_FACING_VECTOR.x),
    setOptionalFieldValue(struct, "YOrientation", TARGET_FACING_VECTOR.y)
  ];
  return movedFields.filter(Boolean).length;
}

function cleanCaptureStageList(gff, root, listLabel) {
  const list = getField(root, listLabel);
  if (!list || list.typeId !== FIELD_TYPE.LIST) {
    return {
      listLabel,
      found: false,
      originalCount: 0,
      finalCount: 0,
      movedTargetCount: 0,
      movedTargetFieldCount: 0,
      removedFallbackCount: 0,
      removedGeneratedControlCount: 0
    };
  }

  const preservedIndices = [];
  let movedTargetCount = 0;
  let movedTargetFieldCount = 0;
  let removedFallbackCount = 0;
  let removedGeneratedControlCount = 0;

  for (const structIndex of list.value ?? []) {
    const struct = gff.structs[structIndex];
    const tag = getStructTag(struct);
    if (isGeneratedCaptureControlTag(tag)) {
      removedGeneratedControlCount += 1;
      continue;
    }
    if (tag === STAGE_FALLBACK_TAG) {
      removedFallbackCount += 1;
      continue;
    }
    if (tag === STAGE_TARGET_TAG) {
      movedTargetCount += 1;
      movedTargetFieldCount += moveStageTargetToCenter(struct);
    }
    preservedIndices.push(structIndex);
  }

  list.value = preservedIndices;
  return {
    listLabel,
    found: true,
    originalCount: list.value.length + removedFallbackCount + removedGeneratedControlCount,
    finalCount: list.value.length,
    movedTargetCount,
    movedTargetFieldCount,
    removedFallbackCount,
    removedGeneratedControlCount
  };
}

function compactReachableStructs(gff) {
  const originalStructCount = gff.structs.length;
  const reachable = new Set();
  function visit(structIndex) {
    if (
      reachable.has(structIndex) ||
      !Number.isInteger(structIndex) ||
      structIndex < 0 ||
      structIndex >= gff.structs.length
    ) {
      return;
    }
    reachable.add(structIndex);
    for (const field of gff.structs[structIndex].fields) {
      if (field.typeId === FIELD_TYPE.STRUCT) {
        visit(field.value);
      } else if (field.typeId === FIELD_TYPE.LIST) {
        for (const childStructIndex of field.value ?? []) {
          visit(childStructIndex);
        }
      }
    }
  }

  visit(0);
  const orderedStructIndices = [...reachable].sort((left, right) => left - right);
  const nextIndexByPreviousIndex = new Map(
    orderedStructIndices.map((previousIndex, nextIndex) => [previousIndex, nextIndex])
  );
  const compactStructs = orderedStructIndices.map((previousIndex) =>
    deepClone(gff.structs[previousIndex])
  );

  for (const struct of compactStructs) {
    for (const field of struct.fields) {
      if (field.typeId === FIELD_TYPE.STRUCT) {
        field.value = nextIndexByPreviousIndex.get(field.value);
      } else if (field.typeId === FIELD_TYPE.LIST) {
        field.value = (field.value ?? [])
          .map((previousIndex) => nextIndexByPreviousIndex.get(previousIndex))
          .filter((nextIndex) => nextIndex !== undefined);
      }
    }
  }

  gff.structs = compactStructs;
  return {
    reachableStructCount: gff.structs.length,
    removedStructCount: originalStructCount - gff.structs.length
  };
}

function injectAreaMap(gitBytes, stations) {
  const gff = parseGff(gitBytes, `${AREA_RESREF}.git`);
  if (gff.fileType !== "GIT ") {
    throw new Error(`Expected GIT resource, got ${JSON.stringify(gff.fileType)}`);
  }

  const root = gff.structs[0];
  const placeables = cleanCaptureStageList(gff, root, PLACEABLE_LIST_LABEL);
  const creatures = cleanCaptureStageList(gff, root, CREATURE_LIST_LABEL);
  const compaction = compactReachableStructs(gff);
  const totalRemovedFallbackCount =
    placeables.removedFallbackCount + creatures.removedFallbackCount;
  const totalRemovedGeneratedControlCount =
    placeables.removedGeneratedControlCount + creatures.removedGeneratedControlCount;
  const movedTargetCount = placeables.movedTargetCount + creatures.movedTargetCount;
  return {
    bytes: buildGff(gff),
    preservedPlaceableCount: placeables.finalCount,
    addedPlaceableCount: 0,
    addedBlockStationCount: 0,
    totalPlaceableCount: placeables.finalCount,
    demoReplayStationCount: 0,
    movedTargetCount,
    movedTargetFieldCount: placeables.movedTargetFieldCount + creatures.movedTargetFieldCount,
    removedFallbackCount: totalRemovedFallbackCount,
    removedGeneratedControlCount: totalRemovedGeneratedControlCount,
    cleanup: {
      placeables,
      creatures
    },
    compaction,
    firstStation: stations[0] ?? null,
    lastStation: stations.at(-1) ?? null
  };
}

function readStageListStats(gff, root, listLabel) {
  const list = getField(root, listLabel);
  if (!list || list.typeId !== FIELD_TYPE.LIST) {
    return {
      listLabel,
      found: false,
      totalCount: 0,
      blockStationCount: 0,
      demoReplayStationCount: 0,
      generatedControlCount: 0,
      fallbackCount: 0,
      targetCount: 0,
      targetPositions: []
    };
  }

  let blockStationCount = 0;
  let demoReplayStationCount = 0;
  let generatedControlCount = 0;
  let fallbackCount = 0;
  let targetCount = 0;
  const targetPositions = [];

  for (const structIndex of list.value ?? []) {
    const struct = gff.structs[structIndex];
    const tag = getStructTag(struct);
    if (tag.startsWith("vxlb")) {
      blockStationCount += 1;
    }
    if (tag === DEMO_REPLAY_SCRIPT_RESREF) {
      demoReplayStationCount += 1;
    }
    if (isGeneratedCaptureControlTag(tag)) {
      generatedControlCount += 1;
    }
    if (tag === STAGE_FALLBACK_TAG) {
      fallbackCount += 1;
    }
    if (tag === STAGE_TARGET_TAG) {
      targetCount += 1;
      targetPositions.push({
        x: getField(struct, "X")?.value ?? null,
        y: getField(struct, "Y")?.value ?? null,
        z: getField(struct, "Z")?.value ?? null,
        bearing: getField(struct, "Bearing")?.value ?? null,
        xPosition: getField(struct, "XPosition")?.value ?? null,
        yPosition: getField(struct, "YPosition")?.value ?? null,
        zPosition: getField(struct, "ZPosition")?.value ?? null,
        xOrientation: getField(struct, "XOrientation")?.value ?? null,
        yOrientation: getField(struct, "YOrientation")?.value ?? null
      });
    }
  }

  return {
    listLabel,
    found: true,
    totalCount: list.value.length,
    blockStationCount,
    demoReplayStationCount,
    generatedControlCount,
    fallbackCount,
    targetCount,
    targetPositions
  };
}

function readPlaceableListStats(gitBytes) {
  const gff = parseGff(gitBytes, `${AREA_RESREF}.git`);
  const root = gff.structs[0];
  const placeables = readStageListStats(gff, root, PLACEABLE_LIST_LABEL);
  const creatures = readStageListStats(gff, root, CREATURE_LIST_LABEL);
  return {
    totalPlaceableCount: placeables.totalCount,
    blockStationCount: placeables.blockStationCount + creatures.blockStationCount,
    demoReplayStationCount: placeables.demoReplayStationCount + creatures.demoReplayStationCount,
    generatedControlCount: placeables.generatedControlCount + creatures.generatedControlCount,
    fallbackCount: placeables.fallbackCount + creatures.fallbackCount,
    targetCount: placeables.targetCount + creatures.targetCount,
    placeables,
    creatures
  };
}

function injectAreaOnEnter(areBytes) {
  const gff = parseGff(areBytes, `${AREA_RESREF}.are`);
  if (gff.fileType !== "ARE ") {
    throw new Error(`Expected ARE resource, got ${JSON.stringify(gff.fileType)}`);
  }
  const root = gff.structs[0];
  const previousOnEnter = getField(root, "OnEnter")?.value ?? "";
  setFieldValue(root, "OnEnter", DEMO_SCRIPT_RESREF);
  return {
    bytes: buildGff(gff),
    previousOnEnter,
    nextOnEnter: DEMO_SCRIPT_RESREF
  };
}

function injectModuleStartLocation(ifoBytes) {
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
    dirY: getField(root, "Mod_Entry_Dir_Y")?.value ?? null
  };
  setFieldValue(root, "Mod_Entry_Area", AREA_RESREF);
  setFieldValue(root, "Mod_Entry_X", DEMO_START_X);
  setFieldValue(root, "Mod_Entry_Y", DEMO_START_Y);
  setFieldValue(root, "Mod_Entry_Z", DEMO_START_Z);
  setFieldValue(root, "Mod_Entry_Dir_X", 0);
  setFieldValue(root, "Mod_Entry_Dir_Y", 1);
  return {
    bytes: buildGff(gff),
    previous,
    next: {
      area: AREA_RESREF,
      x: DEMO_START_X,
      y: DEMO_START_Y,
      z: DEMO_START_Z,
      dirX: 0,
      dirY: 1
    }
  };
}

function readRuntimeDemoStats(areBytes, ifoBytes) {
  const are = parseGff(areBytes, `${AREA_RESREF}.are`);
  const ifo = parseGff(ifoBytes, "module.ifo");
  const areRoot = are.structs[0];
  const ifoRoot = ifo.structs[0];
  return {
    areaOnEnter: getField(areRoot, "OnEnter")?.value ?? null,
    moduleEntryArea: getField(ifoRoot, "Mod_Entry_Area")?.value ?? null,
    moduleEntryX: getField(ifoRoot, "Mod_Entry_X")?.value ?? null,
    moduleEntryY: getField(ifoRoot, "Mod_Entry_Y")?.value ?? null,
    moduleEntryZ: getField(ifoRoot, "Mod_Entry_Z")?.value ?? null
  };
}

async function readRuntimeDemoScriptEntries() {
  const scriptResrefs = [DEMO_SCRIPT_RESREF, DEMO_REPLAY_SCRIPT_RESREF];
  const entries = [];
  for (const scriptResref of scriptResrefs) {
    const sourcePath = join(outputRoot, "generated-scripts", `${scriptResref}.nss`);
    const compiledPath = join(outputRoot, "compiled-scripts", `${scriptResref}.ncs`);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing runtime demo source script: ${sourcePath}`);
    }
    if (!existsSync(compiledPath)) {
      throw new Error(`Missing runtime demo compiled script: ${compiledPath}`);
    }
    entries.push(
      {
        resref: scriptResref,
        type: RESOURCE_TYPES.nss,
        bytes: await readFile(sourcePath)
      },
      {
        resref: scriptResref,
        type: RESOURCE_TYPES.ncs,
        bytes: await readFile(compiledPath)
      }
    );
  }
  return entries;
}

async function findLabModulePaths(modulesDir) {
  if (TARGET_MODULE_FILE) {
    const targetName = basename(TARGET_MODULE_FILE);
    const targetPath = join(modulesDir, targetName);
    if (!existsSync(targetPath)) {
      throw new Error(`Target lab module not found: ${targetPath}`);
    }
    return {
      canonicalPath: targetPath,
      aliasPath: targetPath,
      targetModuleFile: targetName
    };
  }

  const moduleNames = await readdir(modulesDir);
  const canonicalName = moduleNames
    .filter((fileName) => fileName.toLowerCase().endsWith("vfx_catalog_lab.mod"))
    .filter((fileName) => fileName.toLowerCase() !== ASCII_ALIAS_NAME)
    .sort((left, right) => left.localeCompare(right))[0];
  const aliasPath = join(modulesDir, ASCII_ALIAS_NAME);
  const canonicalPath = canonicalName ? join(modulesDir, canonicalName) : aliasPath;
  if (!existsSync(canonicalPath)) {
    throw new Error(`Lab module not found in ${modulesDir}`);
  }
  return {
    canonicalPath,
    aliasPath,
    targetModuleFile: null
  };
}

async function mutateModule(modulePath, stations, generatedAt) {
  const moduleBytes = await readFile(modulePath);
  const erf = readErfEntries(moduleBytes, modulePath);
  const targetGitEntry = erf.entries.find(
    (entry) => entry.resref === AREA_RESREF && entry.type === RESOURCE_TYPES.git
  );
  if (!targetGitEntry) {
    throw new Error(`Missing ${AREA_RESREF}.git in ${modulePath}`);
  }
  const targetAreEntry = erf.entries.find(
    (entry) => entry.resref === AREA_RESREF && entry.type === RESOURCE_TYPES.are
  );
  if (!targetAreEntry) {
    throw new Error(`Missing ${AREA_RESREF}.are in ${modulePath}`);
  }
  const moduleIfoEntry = erf.entries.find(
    (entry) => entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo
  );
  if (!moduleIfoEntry) {
    throw new Error(`Missing module.ifo in ${modulePath}`);
  }

  const areaMap = injectAreaMap(targetGitEntry.bytes, stations);
  const areaOnEnter = injectAreaOnEnter(targetAreEntry.bytes);
  const moduleStartLocation = injectModuleStartLocation(moduleIfoEntry.bytes);
  const runtimeDemoScriptEntries = await readRuntimeDemoScriptEntries();
  const marker = {
    version: NICE_LAYOUT_VERSION,
    generatedAt,
    modulePath,
    areaResref: AREA_RESREF,
    layout: "centered-capture-stage",
    blockStationCount: areaMap.addedBlockStationCount,
    demoReplayStationCount: areaMap.demoReplayStationCount,
    totalPlaceableCount: areaMap.totalPlaceableCount,
    sourceBlockDefinitionCount: stations.length,
    targetTag: STAGE_TARGET_TAG,
    targetPosition: TARGET_POSITION,
    targetFacingVector: TARGET_FACING_VECTOR,
    movedTargetCount: areaMap.movedTargetCount,
    removedFallbackCount: areaMap.removedFallbackCount,
    removedGeneratedControlCount: areaMap.removedGeneratedControlCount,
    cleanup: areaMap.cleanup,
    compaction: areaMap.compaction,
    firstBlockScript: areaMap.firstStation?.script ?? null,
    lastBlockScript: areaMap.lastStation?.script ?? null,
    grid: null
  };
  const runtimeMarker = {
    version: "aurora-vfx-catalog-lab-runtime-demo/v1",
    generatedAt,
    modulePath,
    startLocation: moduleStartLocation.next,
    areaResref: AREA_RESREF,
    areaOnEnter: areaOnEnter.nextOnEnter,
    demoScript: DEMO_SCRIPT_RESREF,
    demoReplayScript: DEMO_REPLAY_SCRIPT_RESREF,
    demoVfx: {
      rowId: DEMO_ROW_ID,
      label: DEMO_ROW_LABEL,
      effectDurationSeconds: DEMO_EFFECT_DURATION_SECONDS
    }
  };

  const nextEntries = [
    ...erf.entries.filter(
      (entry) =>
        !(entry.resref === AREA_RESREF && entry.type === RESOURCE_TYPES.git) &&
        !(entry.resref === AREA_RESREF && entry.type === RESOURCE_TYPES.are) &&
        !(entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo) &&
        !(entry.resref === DEMO_SCRIPT_RESREF && entry.type === RESOURCE_TYPES.nss) &&
        !(entry.resref === DEMO_SCRIPT_RESREF && entry.type === RESOURCE_TYPES.ncs) &&
        !(entry.resref === DEMO_REPLAY_SCRIPT_RESREF && entry.type === RESOURCE_TYPES.nss) &&
        !(entry.resref === DEMO_REPLAY_SCRIPT_RESREF && entry.type === RESOURCE_TYPES.ncs) &&
        !(entry.resref === "vfxlabarea" && entry.type === RESOURCE_TYPES.txt) &&
        !(entry.resref === "vfxlabrun" && entry.type === RESOURCE_TYPES.txt)
    ),
    {
      resref: AREA_RESREF,
      type: RESOURCE_TYPES.git,
      bytes: areaMap.bytes
    },
    {
      resref: AREA_RESREF,
      type: RESOURCE_TYPES.are,
      bytes: areaOnEnter.bytes
    },
    {
      resref: "module",
      type: RESOURCE_TYPES.ifo,
      bytes: moduleStartLocation.bytes
    },
    ...runtimeDemoScriptEntries,
    {
      resref: "vfxlabarea",
      type: RESOURCE_TYPES.txt,
      bytes: Buffer.from(JSON.stringify(marker, null, 2), "utf-8")
    },
    {
      resref: "vfxlabrun",
      type: RESOURCE_TYPES.txt,
      bytes: Buffer.from(JSON.stringify(runtimeMarker, null, 2), "utf-8")
    }
  ];

  const backupPath = `${modulePath}.pre-vfxlab-area-${generatedAt.replace(/[:.]/g, "-")}.bak`;
  await copyFile(modulePath, backupPath);
  const repacked = buildErfV10FromEntries(erf.header, erf.localizedStrings, nextEntries);
  await writeFile(modulePath, repacked);

  const finalBytes = await readFile(modulePath);
  const finalErf = readErfEntries(finalBytes, modulePath);
  const finalGit = finalErf.entries.find(
    (entry) => entry.resref === AREA_RESREF && entry.type === RESOURCE_TYPES.git
  );
  const finalAre = finalErf.entries.find(
    (entry) => entry.resref === AREA_RESREF && entry.type === RESOURCE_TYPES.are
  );
  const finalIfo = finalErf.entries.find(
    (entry) => entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo
  );
  const verifyAreaMap = finalGit ? readPlaceableListStats(finalGit.bytes) : null;
  const verifyRuntimeDemo =
    finalAre && finalIfo ? readRuntimeDemoStats(finalAre.bytes, finalIfo.bytes) : null;
  const finalKeys = new Set(
    finalErf.entries.map((entry) => `${entry.resref.toLowerCase()}:${entry.type}`)
  );

  return {
    modulePath,
    backupPath,
    originalEntryCount: erf.entries.length,
    finalEntryCount: finalErf.entries.length,
    originalGitSize: targetGitEntry.bytes.length,
    finalGitSize: finalGit?.bytes.length ?? 0,
    blockStationCount: areaMap.addedBlockStationCount,
    demoReplayStationCount: areaMap.demoReplayStationCount,
    totalPlaceableCount: areaMap.totalPlaceableCount,
    movedTargetCount: areaMap.movedTargetCount,
    movedTargetFieldCount: areaMap.movedTargetFieldCount,
    removedFallbackCount: areaMap.removedFallbackCount,
    removedGeneratedControlCount: areaMap.removedGeneratedControlCount,
    cleanup: areaMap.cleanup,
    compaction: areaMap.compaction,
    verifiedBlockStationCount: verifyAreaMap?.blockStationCount ?? null,
    verifiedDemoReplayStationCount: verifyAreaMap?.demoReplayStationCount ?? null,
    verifiedTotalPlaceableCount: verifyAreaMap?.totalPlaceableCount ?? null,
    verifiedGeneratedControlCount: verifyAreaMap?.generatedControlCount ?? null,
    verifiedFallbackCount: verifyAreaMap?.fallbackCount ?? null,
    verifiedTargetCount: verifyAreaMap?.targetCount ?? null,
    verifiedStageLists: verifyAreaMap
      ? {
          placeables: verifyAreaMap.placeables,
          creatures: verifyAreaMap.creatures
        }
      : null,
    runtimeDemo: {
      previousAreaOnEnter: areaOnEnter.previousOnEnter,
      previousStartLocation: moduleStartLocation.previous,
      verified: verifyRuntimeDemo,
      nssInjected: finalKeys.has(`${DEMO_SCRIPT_RESREF}:${RESOURCE_TYPES.nss}`),
      ncsInjected: finalKeys.has(`${DEMO_SCRIPT_RESREF}:${RESOURCE_TYPES.ncs}`),
      replayNssInjected: finalKeys.has(`${DEMO_REPLAY_SCRIPT_RESREF}:${RESOURCE_TYPES.nss}`),
      replayNcsInjected: finalKeys.has(`${DEMO_REPLAY_SCRIPT_RESREF}:${RESOURCE_TYPES.ncs}`)
    },
    sha256: createHash("sha256").update(finalBytes).digest("hex")
  };
}

async function main() {
  const mapPath = join(outputRoot, "vfx-catalog-lab-map.json");
  if (!existsSync(mapPath)) {
    throw new Error(`Missing generated VFX map JSON: ${mapPath}`);
  }

  const map = JSON.parse(await readFile(mapPath, "utf-8"));
  const stations = buildBlockStations(map);
  if (stations.length === 0) {
    throw new Error(`No active block stations found in ${mapPath}`);
  }

  const generatedAt = new Date().toISOString();
  const modulesDir = join(getNwnUserRoot(), "modules");
  const { canonicalPath, aliasPath, targetModuleFile } = await findLabModulePaths(modulesDir);
  const canonicalResult = await mutateModule(canonicalPath, stations, generatedAt);

  let aliasResult = null;
  if (aliasPath !== canonicalPath) {
    await copyFile(canonicalPath, aliasPath);
    const aliasBytes = await readFile(aliasPath);
    aliasResult = {
      modulePath: aliasPath,
      copiedFrom: canonicalPath,
      sha256: createHash("sha256").update(aliasBytes).digest("hex")
    };
  }

  await mkdir(outputRoot, { recursive: true });
  const summary = {
    version: "aurora-vfx-catalog-lab-area-injection/v3",
    generatedAt,
    repoRoot,
    mapPath,
    targetModuleFile,
    canonical: canonicalResult,
    alias: aliasResult,
    area: {
      resref: AREA_RESREF,
      layoutVersion: NICE_LAYOUT_VERSION,
      layout: "centered-capture-stage",
      blockStationCount: canonicalResult.blockStationCount,
      demoReplayStationCount: canonicalResult.demoReplayStationCount,
      sourceBlockDefinitionCount: stations.length,
      targetTag: STAGE_TARGET_TAG,
      targetPosition: TARGET_POSITION,
      targetFacingVector: TARGET_FACING_VECTOR,
      movedTargetCount: canonicalResult.movedTargetCount,
      removedFallbackCount: canonicalResult.removedFallbackCount,
      removedGeneratedControlCount: canonicalResult.removedGeneratedControlCount,
      verifiedTargetCount: canonicalResult.verifiedTargetCount,
      verifiedFallbackCount: canonicalResult.verifiedFallbackCount,
      verifiedGeneratedControlCount: canonicalResult.verifiedGeneratedControlCount,
      firstBlockScript: stations[0]?.script ?? null,
      lastBlockScript: stations.at(-1)?.script ?? null,
      firstRow: stations[0]?.firstRow ?? null,
      lastRow: stations.at(-1)?.lastRow ?? null
    },
    runtimeDemo: {
      script: DEMO_SCRIPT_RESREF,
      replayScript: DEMO_REPLAY_SCRIPT_RESREF,
      rowId: DEMO_ROW_ID,
      label: DEMO_ROW_LABEL,
      effectDurationSeconds: DEMO_EFFECT_DURATION_SECONDS,
      startArea: AREA_RESREF
    }
  };
  await writeFile(
    join(outputRoot, "area-injection-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const RESOURCE_TYPES = {
  ifo: 2014,
  twoDa: 2017,
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

const OVERLAY_HAK = "tlc_vfx_lab_2da";

const REMAPS = {
  // Exact/truncation repairs.
  vdr_entang02: { to: "vdr_entang01", confidence: "high", reason: "same entangle family; numbered sibling exists" },
  vdr_fw_spark_blue: { to: "vdr_fw_spark_blu", confidence: "high", reason: "resref truncation to 16 chars" },
  vff_fw_flame_blue: { to: "vff_fw_flame_blu", confidence: "high", reason: "resref truncation to 16 chars" },
  vff_fw_flame_gree: { to: "vff_fw_flame_gre", confidence: "high", reason: "resref truncation to 16 chars" },
  vff_fw_flame_purp: { to: "vff_fw_flame_pur", confidence: "high", reason: "resref truncation to 16 chars" },
  vim_protevil01: { to: "vim_protevil", confidence: "high", reason: "base evil protection impact exists without numeric suffix" },
  vim_protevil02: { to: "vim_protevil_02", confidence: "high", reason: "numbered evil protection impact uses underscore" },
  vim_protgood01: { to: "vim_protgood", confidence: "high", reason: "base good protection impact exists without numeric suffix" },
  vim_protgood02: { to: "vim_protgood", confidence: "medium", reason: "no numbered good-protection impact exists; use base family model" },

  // Same-family size/color repairs.
  smp_desecrate: { to: "smp_desecrate20", confidence: "high", reason: "unqualified desecrate maps to existing 20ft model" },
  vim_ballfire2: { to: "vim_ballfire", confidence: "high", reason: "inferno variant points at existing ballfire family base" },
  vim_ballfire3: { to: "vim_ballfire", confidence: "high", reason: "inferno variant points at existing ballfire family base" },
  vdr_globemax_b: { to: "vdr_globemax", confidence: "medium", reason: "missing color-specific max globe; generic max globe exists" },
  vdr_globemax_c: { to: "vdr_globemax", confidence: "medium", reason: "missing color-specific max globe; generic max globe exists" },
  vdr_globemax_g: { to: "vdr_globemax", confidence: "medium", reason: "missing color-specific max globe; generic max globe exists" },
  vdr_globemax_o: { to: "vdr_globemax", confidence: "medium", reason: "missing color-specific max globe; generic max globe exists" },
  vdr_globemax_p: { to: "vdr_globemax", confidence: "medium", reason: "missing color-specific max globe; generic max globe exists" },
  vdr_globemax_y: { to: "vdr_globemax", confidence: "medium", reason: "missing color-specific max globe; generic max globe exists" },
  vdr_wyrmtrail_c: { to: "vdr_wyrmtrail_b", confidence: "medium", reason: "same trail family; cyan approximated by blue" },
  vdr_wyrmtrail_o: { to: "vdr_wyrmtrail_r", confidence: "medium", reason: "same trail family; orange approximated by red" },
  vdr_wyrmtrail_p: { to: "vdr_wyrmtrail_k", confidence: "medium", reason: "same trail family; purple approximated by black/dark variant" },
  vdr_wyrmtrail_y: { to: "vdr_wyrmtrail_w", confidence: "medium", reason: "same trail family; yellow approximated by bright/white variant" },

  // HGTODO line-of-sight color repairs to existing LOS size variants.
  vff_expddkg10: { to: "vff_expdgrn10", confidence: "medium", reason: "dark green approximated by green LOS size 10" },
  vff_expddkg20: { to: "vff_expdgrn20", confidence: "medium", reason: "dark green approximated by green LOS size 20" },
  vff_expddkg30: { to: "vff_expdgrn30", confidence: "medium", reason: "dark green approximated by green LOS size 30" },
  vff_expdind10: { to: "vff_expdpur10", confidence: "medium", reason: "indigo approximated by purple LOS size 10" },
  vff_expdind20: { to: "vff_expdpur20", confidence: "medium", reason: "indigo approximated by purple LOS size 20" },
  vff_expdind30: { to: "vff_expdpur30", confidence: "medium", reason: "indigo approximated by purple LOS size 30" },
  vff_expdlav10: { to: "vff_expdpur10", confidence: "medium", reason: "lavender approximated by purple LOS size 10" },
  vff_expdlav20: { to: "vff_expdpur20", confidence: "medium", reason: "lavender approximated by purple LOS size 20" },
  vff_expdlav30: { to: "vff_expdpur30", confidence: "medium", reason: "lavender approximated by purple LOS size 30" },
  vff_expdrdo10: { to: "vff_expdora10", confidence: "medium", reason: "red-orange approximated by orange LOS size 10" },
  vff_expdrdo20: { to: "vff_expdora20", confidence: "medium", reason: "red-orange approximated by orange LOS size 20" },
  vff_expdrdo30: { to: "vff_expdora30", confidence: "medium", reason: "red-orange approximated by orange LOS size 30" },
  vff_expdsky10: { to: "vff_expdcyn10", confidence: "medium", reason: "sky blue approximated by cyan LOS size 10" },
  vff_expdsky20: { to: "vff_expdcyn20", confidence: "medium", reason: "sky blue approximated by cyan LOS size 20" },
  vff_expdsky30: { to: "vff_expdcyn30", confidence: "medium", reason: "sky blue approximated by cyan LOS size 30" },
  vff_expdtea10: { to: "vff_expdcyn10", confidence: "medium", reason: "teal approximated by cyan LOS size 10" },
  vff_expdtea20: { to: "vff_expdcyn20", confidence: "medium", reason: "teal approximated by cyan LOS size 20" },
  vff_expdtea30: { to: "vff_expdcyn30", confidence: "medium", reason: "teal approximated by cyan LOS size 30" },

  // Semantic but not exact; still same visible VFX family.
  vim_negblast: { to: "vim_negative", confidence: "medium", reason: "visible impact negative-energy fallback; cessation negblast is not visible as an impact" },
  vpj_otilcold: { to: "vpr_otilcold", confidence: "medium", reason: "Otiluke cold projectile family exists under vpr prefix" },
  vdr_ioun_wood: { to: "vdr_ioun_orange", confidence: "low", reason: "wood-colored ioun approximated by orange ioun; review visually" },
  vdr_light: { to: "vdr_biglw", confidence: "low", reason: "missing generic light approximated by big white light; review visually" },
  zep_vps_wallgrey: { to: "zep_vps_foggrey", confidence: "low", reason: "grey wall missing; grey fog is nearest color-family fallback; review visually" },
  vpr_gas: { to: "vff_gassmoke", confidence: "low", reason: "generic gas model missing; smoke gas is nearest VFX gas fallback; review visually" },
  vim_tornado: { to: "vim_heal03", confidence: "low", reason: "missing tornado model approximated by visible tornado impact family used by VFX_IMP_TORNADO" },
  soe_bloodfount: { to: "vff_rainblod", confidence: "low", reason: "missing blood fountain approximated by visible bloodstorm/rain blood family" },
  vps_sssigil: { to: "vps_glyphward", confidence: "low", reason: "missing sepia snake sigil approximated by visible glyph/sigil ward family" }
};

const SKIPPED_PATTERNS = [
  /^vff_test_\d+$/u,
  /^vdr_test_\d+$/u
];

const repoRoot = resolve(import.meta.dirname, "..", "..");
const outputRoot = join(repoRoot, ".codex-tmp", "aurora-live-evidence", "vfx-missing-resource-remap");

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
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size))
    });
  }
  return { header: Buffer.from(bytes.subarray(0, 160)), localizedStrings, entries };
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
        return { bytesBase64: Buffer.from(bytes.subarray(offset + 4, offset + 4 + length)).toString("base64") };
      }
      case FIELD_TYPE.STRUCT:
        return fieldEntry.dataOrOffset;
      case FIELD_TYPE.LIST:
        return readListIndices(fieldEntry);
      default:
        throw new Error(`Unsupported GFF field type ${fieldEntry.typeId} for ${fieldEntry.label} in ${sourceLabel}`);
    }
  }

  return {
    fileType: header.fileType,
    fileVersion: header.fileVersion,
    structs: structEntries.map((structEntry) => ({
      typeId: structEntry.typeId,
      fields: readStructFieldIndices(structEntry).map((fieldIndex) => {
        const fieldEntry = fieldEntries[fieldIndex];
        return {
          label: fieldEntry.label,
          typeId: fieldEntry.typeId,
          value: readFieldValue(fieldEntry)
        };
      })
    }))
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
        values.forEach((structIndex, index) => payload.writeUInt32LE(Number(structIndex) >>> 0, 4 + index * 4));
        dataOrOffset = pushListIndices(payload);
        break;
      }
      default:
        throw new Error(`Unsupported GFF field type for write: ${field.typeId}`);
    }

    return { typeId: field.typeId, labelIndex, dataOrOffset };
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
    structEntries.push({ typeId: struct.typeId, dataOrOffset, fieldCount: fieldIndices.length });
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
  labels.forEach((label, index) => Buffer.from(label, "ascii").copy(labelTable, index * 16));

  return Buffer.concat([header, structTable, fieldTable, labelTable, fieldData, fieldIndices, listIndices]);
}

function findResource(erf, resref, type) {
  const target = resref.toLowerCase();
  return erf.entries.find((entry) => entry.resref === target && entry.type === type)?.bytes ?? null;
}

function getField(struct, label) {
  return struct.fields.find((field) => field.label === label);
}

function patchHakList(ifoBytes) {
  const gff = parseGff(ifoBytes, "module.ifo");
  const root = gff.structs[0];
  let hakListField = getField(root, "Mod_HakList");
  if (!hakListField) {
    hakListField = { label: "Mod_HakList", typeId: FIELD_TYPE.LIST, value: [] };
    root.fields.push(hakListField);
  }
  if (hakListField.typeId !== FIELD_TYPE.LIST) {
    throw new Error(`Mod_HakList has unexpected type ${hakListField.typeId}`);
  }

  const existingIndices = Array.isArray(hakListField.value) ? hakListField.value : [];
  const filteredIndices = existingIndices.filter((structIndex) => {
    const hakStruct = gff.structs[structIndex];
    const name = getField(hakStruct, "Mod_Hak")?.value;
    return String(name ?? "").toLowerCase() !== OVERLAY_HAK;
  });
  const templateStruct = filteredIndices.map((index) => gff.structs[index]).find(Boolean);
  const templateField = templateStruct ? getField(templateStruct, "Mod_Hak") : null;
  const overlayStructIndex = gff.structs.length;
  gff.structs.push({
    typeId: templateStruct?.typeId ?? 0,
    fields: [
      {
        label: "Mod_Hak",
        typeId: templateField?.typeId ?? FIELD_TYPE.CEXOSTRING,
        value: OVERLAY_HAK
      }
    ]
  });
  hakListField.value = [overlayStructIndex, ...filteredIndices];

  return {
    bytes: buildGff(gff),
    hakList: hakListField.value.map((structIndex) => String(getField(gff.structs[structIndex], "Mod_Hak")?.value ?? "")),
    addedOverlay: true,
    removedDuplicateCount: existingIndices.length - filteredIndices.length
  };
}

function parse2da(bytes) {
  const text = bytes.toString("utf-8").replace(/^\uFEFF/u, "");
  const lines = text.split(/\r?\n/u);
  let index = 0;
  while (index < lines.length && lines[index].trim().length === 0) {
    index += 1;
  }
  const header = lines[index] ?? "2DA V2.0";
  index += 1;
  while (index < lines.length && lines[index].trim().length === 0) {
    index += 1;
  }
  let defaultValue = null;
  if (lines[index]?.trim().startsWith("DEFAULT:")) {
    defaultValue = lines[index].trim().slice("DEFAULT:".length).trim();
    index += 1;
  }
  while (index < lines.length && lines[index].trim().length === 0) {
    index += 1;
  }
  const columns = lines[index].trim().split(/\s+/u);
  index += 1;
  const rows = [];
  for (; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith("//")) {
      continue;
    }
    const cells = line.match(/"[^"]*"|\S+/gu) ?? [];
    const rowId = Number.parseInt(cells[0], 10);
    if (!Number.isFinite(rowId)) {
      continue;
    }
    const row = { rowId };
    columns.forEach((column, columnIndex) => {
      let value = cells[columnIndex + 1] ?? "****";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      row[column] = value;
    });
    rows.push(row);
  }
  return { header, defaultValue, columns, rows };
}

function formatCell(value) {
  const text = value === undefined || value === null || value === "" ? "****" : String(value);
  return /\s/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function write2da(table) {
  const widths = new Map();
  widths.set("row", Math.max(4, String(table.rows.at(-1)?.rowId ?? 0).length));
  for (const column of table.columns) {
    widths.set(column, Math.max(column.length, ...table.rows.map((row) => formatCell(row[column]).length)));
  }
  const lines = [table.header || "2DA V2.0", ""];
  if (table.defaultValue) {
    lines.push(`DEFAULT: ${table.defaultValue}`, "");
  }
  lines.push(
    `${"".padEnd(widths.get("row") + 2)}${table.columns.map((column) => column.padEnd(widths.get(column) + 2)).join("").trimEnd()}`
  );
  for (const row of table.rows) {
    lines.push(
      `${String(row.rowId).padEnd(widths.get("row") + 2)}${table.columns
        .map((column) => formatCell(row[column]).padEnd(widths.get(column) + 2))
        .join("")
        .trimEnd()}`
    );
  }
  lines.push("");
  return Buffer.from(lines.join("\n"), "utf-8");
}

function applyRemaps(table) {
  const patchedCells = [];
  const skippedCells = [];
  for (const row of table.rows) {
    for (const column of table.columns) {
      const original = String(row[column] ?? "").toLowerCase();
      if (!original || original === "****") {
        continue;
      }
      const remap = REMAPS[original];
      if (remap) {
        row[column] = remap.to;
        patchedCells.push({
          rowId: row.rowId,
          label: row.Label,
          column,
          from: original,
          to: remap.to,
          confidence: remap.confidence,
          reason: remap.reason
        });
      } else if (SKIPPED_PATTERNS.some((pattern) => pattern.test(original))) {
        skippedCells.push({
          rowId: row.rowId,
          label: row.Label,
          column,
          value: original,
          reason: "test/TODO resource has no trustworthy real source model"
        });
      }
    }
  }
  return { patchedCells, skippedCells };
}

async function findLabModulePaths() {
  const modulesDir = join(getNwnUserRoot(), "modules");
  const names = await readdir(modulesDir);
  const canonicalName = names
    .filter((name) => name.toLowerCase().endsWith("vfx_catalog_lab.mod"))
    .filter((name) => name.toLowerCase() !== "tlc_vfx_catalog_lab.mod")
    .sort((left, right) => left.localeCompare(right))[0];
  const canonicalPath = canonicalName ? join(modulesDir, canonicalName) : join(modulesDir, "tlc_vfx_catalog_lab.mod");
  const aliasPath = join(modulesDir, "tlc_vfx_catalog_lab.mod");
  if (!existsSync(canonicalPath)) {
    throw new Error(`Lab module not found: ${canonicalPath}`);
  }
  return { canonicalPath, aliasPath };
}

async function patchModule(modulePath, visualeffectsBytes, markerBytes, generatedAt) {
  const moduleBytes = await readFile(modulePath);
  const erf = readErfEntries(moduleBytes, modulePath);
  const ifoEntry = erf.entries.find((entry) => entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo);
  if (!ifoEntry) {
    throw new Error(`Missing module.ifo in ${modulePath}`);
  }
  const patchedIfo = patchHakList(ifoEntry.bytes);
  const nextEntries = [
    ...erf.entries
      .filter(
        (entry) =>
          !(entry.resref === "visualeffects" && entry.type === RESOURCE_TYPES.twoDa) &&
          !(entry.resref === "vfxremap" && entry.type === RESOURCE_TYPES.txt)
      )
      .map((entry) =>
        entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo
          ? { ...entry, bytes: patchedIfo.bytes }
          : entry
      ),
    {
      resref: "vfxremap",
      type: RESOURCE_TYPES.txt,
      bytes: markerBytes
    }
  ];
  const backupPath = `${modulePath}.pre-vfx-missing-remap-${generatedAt.replace(/[:.]/g, "-")}.bak`;
  await copyFile(modulePath, backupPath);
  const repacked = buildErfV10FromEntries(erf.header, erf.localizedStrings, nextEntries);
  await writeFile(modulePath, repacked);
  const finalBytes = await readFile(modulePath);
  const finalErf = readErfEntries(finalBytes, modulePath);
  return {
    modulePath,
    backupPath,
    originalEntryCount: erf.entries.length,
    finalEntryCount: finalErf.entries.length,
    visualeffectsInjected: Boolean(findResource(finalErf, "visualeffects", RESOURCE_TYPES.twoDa)),
    markerInjected: Boolean(findResource(finalErf, "vfxremap", RESOURCE_TYPES.txt)),
    overlayHak: OVERLAY_HAK,
    moduleHakList: patchedIfo.hakList,
    removedDuplicateHakCount: patchedIfo.removedDuplicateCount,
    sha256: createHash("sha256").update(finalBytes).digest("hex")
  };
}

async function writeOverlayHak(sourceHakErf, visualeffectsBytes, markerBytes) {
  const hakDir = join(getNwnUserRoot(), "hak");
  await mkdir(hakDir, { recursive: true });
  const overlayHakPath = join(hakDir, `${OVERLAY_HAK}.hak`);
  const entries = [
    {
      resref: "visualeffects",
      type: RESOURCE_TYPES.twoDa,
      bytes: visualeffectsBytes
    },
    {
      resref: "vfxremap",
      type: RESOURCE_TYPES.txt,
      bytes: markerBytes
    }
  ];
  const backupPath = existsSync(overlayHakPath)
    ? `${overlayHakPath}.pre-vfx-missing-remap-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`
    : null;
  if (backupPath) {
    await copyFile(overlayHakPath, backupPath);
  }
  const overlayBytes = buildErfV10FromEntries(sourceHakErf.header, sourceHakErf.localizedStrings, entries);
  await writeFile(overlayHakPath, overlayBytes);
  return {
    overlayHak: OVERLAY_HAK,
    overlayHakPath,
    backupPath,
    entryCount: entries.length,
    sha256: createHash("sha256").update(overlayBytes).digest("hex")
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  await mkdir(outputRoot, { recursive: true });
  const hakPath = join(getNwnUserRoot(), "hak", "lc_2da.hak");
  const lc2da = readErfEntries(await readFile(hakPath), hakPath);
  const visualeffectsSource = findResource(lc2da, "visualeffects", RESOURCE_TYPES.twoDa);
  if (!visualeffectsSource) {
    throw new Error(`visualeffects.2da missing in ${hakPath}`);
  }
  const table = parse2da(visualeffectsSource);
  const { patchedCells, skippedCells } = applyRemaps(table);
  const patchedVisualeffectsBytes = write2da(table);
  const marker = {
    version: "aurora-vfx-lab-missing-resource-remap/v1",
    generatedAt,
    source: hakPath,
    sourceSha256: createHash("sha256").update(visualeffectsSource).digest("hex"),
    patchedSha256: createHash("sha256").update(patchedVisualeffectsBytes).digest("hex"),
    patchedCellCount: patchedCells.length,
    patchedDistinctRefs: new Set(patchedCells.map((cell) => cell.from)).size,
    skippedCellCount: skippedCells.length,
    patchedCells,
    skippedCells
  };
  const markerBytes = Buffer.from(JSON.stringify(marker, null, 2), "utf-8");
  const overlayHak = await writeOverlayHak(lc2da, patchedVisualeffectsBytes, markerBytes);
  const { canonicalPath, aliasPath } = await findLabModulePaths();
  const canonical = await patchModule(canonicalPath, patchedVisualeffectsBytes, markerBytes, generatedAt);
  let alias = null;
  if (aliasPath !== canonicalPath) {
    await copyFile(canonicalPath, aliasPath);
    const aliasBytes = await readFile(aliasPath);
    alias = {
      modulePath: aliasPath,
      copiedFrom: canonicalPath,
      sha256: createHash("sha256").update(aliasBytes).digest("hex")
    };
  }

  const summary = {
    ...marker,
    overlayHak,
    canonical,
    alias
  };
  const summaryPath = join(outputRoot, "vfx-missing-resource-remap-summary.json");
  const patched2daPath = join(outputRoot, "visualeffects.remapped.2da");
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
  await writeFile(patched2daPath, patchedVisualeffectsBytes);
  console.log(JSON.stringify({
    patchedCellCount: marker.patchedCellCount,
    patchedDistinctRefs: marker.patchedDistinctRefs,
    skippedCellCount: marker.skippedCellCount,
    summaryPath,
    patched2daPath,
    canonical: canonical.modulePath,
    overlayHak: overlayHak.overlayHakPath,
    alias: alias?.modulePath ?? null
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

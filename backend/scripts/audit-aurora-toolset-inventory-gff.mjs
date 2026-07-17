#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const modulePath = resolveRequired(options.modulePath, "--modulePath");
const outPath = resolve(
  String(options.out ?? ".codex-tmp/area-toolset-oracle-20260710/inventory-gff-audit.json"),
);
const bytes = readFileSync(modulePath);
const container = readErf(bytes);
const relevantTypes = new Map([
  [2012, "are"],
  [2023, "git"],
  [2046, "gic"],
]);
const rows = [];

for (const entry of container.entries.filter((candidate) => relevantTypes.has(candidate.resourceType))) {
  const resource = bytes.subarray(entry.fileOffset, entry.fileOffset + entry.fileSize);
  const validation = validateGff(resource);
  rows.push({
    resref: entry.resref,
    extension: relevantTypes.get(entry.resourceType),
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    fileOffset: entry.fileOffset,
    fileSize: entry.fileSize,
    ...validation,
  });
}

const byKey = new Map(rows.map((row) => [`${row.resref}|${row.extension}`, row]));
const gitRows = rows.filter((row) => row.extension === "git");
for (const row of gitRows) {
  row.hasAre = byKey.has(`${row.resref}|are`);
  row.hasGic = byKey.has(`${row.resref}|gic`);
  if (!row.hasAre) row.errors.push("missing_matching_are");
  if (!row.hasGic) row.warnings.push("missing_matching_gic");
}

const duplicateKeys = container.duplicateKeys;
const invalidRows = rows.filter((row) => row.errors.length > 0);
const orphanRows = rows
  .filter((row) => row.unreachableStructCount > 0)
  .sort((a, b) => b.unreachableStructCount - a.unreachableStructCount);
const report = {
  version: "aurora-toolset-inventory-gff-audit/v1",
  generatedAt: new Date().toISOString(),
  modulePath,
  container: {
    signature: container.signature,
    version: container.version,
    entryCount: container.entries.length,
    duplicateResourceKeyCount: duplicateKeys.length,
    duplicateResourceKeys: duplicateKeys,
  },
  summary: {
    relevantResourceCount: rows.length,
    gitCount: gitRows.length,
    areCount: rows.filter((row) => row.extension === "are").length,
    gicCount: rows.filter((row) => row.extension === "gic").length,
    invalidGffCount: invalidRows.length,
    missingAreCount: gitRows.filter((row) => !row.hasAre).length,
    missingGicCount: gitRows.filter((row) => !row.hasGic).length,
    rowsWithUnreachableStructs: orphanRows.length,
    totalUnreachableStructs: orphanRows.reduce((sum, row) => sum + row.unreachableStructCount, 0),
  },
  invalidRows,
  highestUnreachableStructCounts: orphanRows.slice(0, 40).map(compactRow),
  rows,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: invalidRows.length === 0, outPath, ...report.summary }, null, 2));

function readErf(buffer) {
  if (buffer.length < 160) throw new Error("ERF header is truncated.");
  const signature = buffer.toString("ascii", 0, 4);
  const version = buffer.toString("ascii", 4, 8);
  if (!new Set(["MOD ", "ERF ", "HAK ", "NWM "]).has(signature)) {
    throw new Error(`Unsupported ERF signature ${JSON.stringify(signature)}.`);
  }
  const resrefLength = version === "V1.1" ? 32 : 16;
  const keyEntrySize = version === "V1.1" ? 40 : 24;
  const entryCount = buffer.readUInt32LE(16);
  const keyOffset = buffer.readUInt32LE(24);
  const resourceOffset = buffer.readUInt32LE(28);
  assertRange(buffer.length, keyOffset, entryCount * keyEntrySize, "ERF key table");
  assertRange(buffer.length, resourceOffset, entryCount * 8, "ERF resource table");
  const entries = [];
  const seen = new Map();
  const duplicateKeys = [];
  for (let index = 0; index < entryCount; index += 1) {
    const offset = keyOffset + index * keyEntrySize;
    const resref = decodeResref(buffer.subarray(offset, offset + resrefLength));
    const resourceId = buffer.readUInt32LE(offset + resrefLength);
    const resourceType = buffer.readUInt16LE(offset + resrefLength + 4);
    if (resourceId >= entryCount) throw new Error(`Resource id ${resourceId} is outside the table.`);
    const tableOffset = resourceOffset + resourceId * 8;
    const fileOffset = buffer.readUInt32LE(tableOffset);
    const fileSize = buffer.readUInt32LE(tableOffset + 4);
    assertRange(buffer.length, fileOffset, fileSize, `${resref}|${resourceType}`);
    const key = `${resref}|${resourceType}`;
    if (seen.has(key)) duplicateKeys.push({ key, firstIndex: seen.get(key), duplicateIndex: index });
    else seen.set(key, index);
    entries.push({ index, resref, resourceId, resourceType, fileOffset, fileSize });
  }
  return { signature, version, entries, duplicateKeys };
}

function validateGff(buffer) {
  const errors = [];
  const warnings = [];
  if (buffer.length < 56) {
    return baseInvalid("gff_header_truncated");
  }
  const fileType = buffer.toString("ascii", 0, 4);
  const version = buffer.toString("ascii", 4, 8);
  const header = {
    structOffset: buffer.readUInt32LE(8),
    structCount: buffer.readUInt32LE(12),
    fieldOffset: buffer.readUInt32LE(16),
    fieldCount: buffer.readUInt32LE(20),
    labelOffset: buffer.readUInt32LE(24),
    labelCount: buffer.readUInt32LE(28),
    fieldDataOffset: buffer.readUInt32LE(32),
    fieldDataCount: buffer.readUInt32LE(36),
    fieldIndicesOffset: buffer.readUInt32LE(40),
    fieldIndicesCount: buffer.readUInt32LE(44),
    listIndicesOffset: buffer.readUInt32LE(48),
    listIndicesCount: buffer.readUInt32LE(52),
  };
  if (version !== "V3.2") errors.push(`unsupported_gff_version:${version}`);
  for (const [offset, length, label] of [
    [header.structOffset, header.structCount * 12, "struct_table"],
    [header.fieldOffset, header.fieldCount * 12, "field_table"],
    [header.labelOffset, header.labelCount * 16, "label_table"],
    [header.fieldDataOffset, header.fieldDataCount, "field_data"],
    [header.fieldIndicesOffset, header.fieldIndicesCount, "field_indices"],
    [header.listIndicesOffset, header.listIndicesCount, "list_indices"],
  ]) {
    if (!rangeValid(buffer.length, offset, length)) errors.push(`${label}_out_of_range`);
  }
  if (errors.length > 0) {
    return { fileType, version, ...header, rootLabels: [], rootListCounts: {}, reachableStructCount: 0, unreachableStructCount: header.structCount, errors, warnings };
  }

  const fields = [];
  for (let index = 0; index < header.fieldCount; index += 1) {
    const offset = header.fieldOffset + index * 12;
    fields.push({
      type: buffer.readUInt32LE(offset),
      labelIndex: buffer.readUInt32LE(offset + 4),
      data: buffer.readUInt32LE(offset + 8),
    });
  }
  const labels = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    labels.push(decodeResref(buffer.subarray(header.labelOffset + index * 16, header.labelOffset + (index + 1) * 16)));
  }
  const structs = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * 12;
    structs.push({ data: buffer.readUInt32LE(offset + 4), fieldCount: buffer.readUInt32LE(offset + 8) });
  }

  const structFields = (structIndex) => {
    const struct = structs[structIndex];
    if (!struct) return [];
    if (struct.fieldCount === 0) return [];
    if (struct.fieldCount === 1) return [struct.data];
    if (!rangeValid(header.fieldIndicesCount, struct.data, struct.fieldCount * 4)) {
      errors.push(`struct_${structIndex}_field_indices_out_of_range`);
      return [];
    }
    return Array.from({ length: struct.fieldCount }, (_, index) =>
      buffer.readUInt32LE(header.fieldIndicesOffset + struct.data + index * 4),
    );
  };

  const listStructs = (offset, context) => {
    if (!rangeValid(header.listIndicesCount, offset, 4)) {
      errors.push(`${context}_list_header_out_of_range`);
      return [];
    }
    const count = buffer.readUInt32LE(header.listIndicesOffset + offset);
    if (!rangeValid(header.listIndicesCount, offset + 4, count * 4)) {
      errors.push(`${context}_list_entries_out_of_range`);
      return [];
    }
    return Array.from({ length: count }, (_, index) =>
      buffer.readUInt32LE(header.listIndicesOffset + offset + 4 + index * 4),
    );
  };

  const reachable = new Set();
  const visit = (structIndex) => {
    if (reachable.has(structIndex)) return;
    if (structIndex >= structs.length) {
      errors.push(`struct_reference_out_of_range:${structIndex}`);
      return;
    }
    reachable.add(structIndex);
    for (const fieldIndex of structFields(structIndex)) {
      if (fieldIndex >= fields.length) {
        errors.push(`field_reference_out_of_range:${fieldIndex}`);
        continue;
      }
      const field = fields[fieldIndex];
      if (field.labelIndex >= labels.length) errors.push(`label_reference_out_of_range:${field.labelIndex}`);
      if (field.type === 14) visit(field.data);
      if (field.type === 15) {
        for (const child of listStructs(field.data, `field_${fieldIndex}`)) visit(child);
      }
    }
  };
  if (structs.length > 0) visit(0);

  const rootLabels = [];
  const rootListCounts = {};
  for (const fieldIndex of structFields(0)) {
    const field = fields[fieldIndex];
    if (!field) continue;
    const label = labels[field.labelIndex] ?? `#${field.labelIndex}`;
    rootLabels.push(label);
    if (field.type === 15) rootListCounts[label] = listStructs(field.data, `root_${label}`).length;
  }
  const unreachableStructCount = Math.max(0, structs.length - reachable.size);
  if (unreachableStructCount > 0) warnings.push(`unreachable_structs:${unreachableStructCount}`);
  return {
    fileType,
    version,
    ...header,
    rootLabels,
    rootListCounts,
    reachableStructCount: reachable.size,
    unreachableStructCount,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

function baseInvalid(code) {
  return { fileType: null, version: null, rootLabels: [], rootListCounts: {}, reachableStructCount: 0, unreachableStructCount: 0, errors: [code], warnings: [] };
}

function compactRow(row) {
  return {
    resref: row.resref,
    extension: row.extension,
    fileSize: row.fileSize,
    structCount: row.structCount,
    reachableStructCount: row.reachableStructCount,
    unreachableStructCount: row.unreachableStructCount,
    rootListCounts: row.rootListCounts,
    errors: row.errors,
    warnings: row.warnings,
  };
}

function decodeResref(buffer) {
  const zero = buffer.indexOf(0);
  return buffer.subarray(0, zero < 0 ? buffer.length : zero).toString("latin1").trim().toLowerCase();
}

function assertRange(total, offset, length, label) {
  if (!rangeValid(total, offset, length)) throw new Error(`${label} range ${offset}+${length} exceeds ${total}.`);
}

function rangeValid(total, offset, length) {
  return Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 0 && offset + length <= total;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument ${token}.`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) result[token.slice(2)] = true;
    else {
      result[token.slice(2)] = value;
      index += 1;
    }
  }
  return result;
}

function resolveRequired(value, name) {
  if (!value || value === true) throw new Error(`Missing ${name}.`);
  return resolve(String(value));
}


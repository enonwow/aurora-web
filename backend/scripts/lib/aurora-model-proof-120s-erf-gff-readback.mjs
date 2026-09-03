import assert from "node:assert/strict";

const FIELD_TYPE = Object.freeze({
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
});

const RESOURCE_TYPE = Object.freeze({ IFO: 2014, ARE: 2012, GIC: 2046, GIT: 2023, UTC: 2027, FAC: 2038 });

export function inspectTriControlModuleBytes(bytes) {
  const archive = parseErfArchive(bytes, "MOD ");
  const ifo = parseGff(requiredResource(archive, "module", RESOURCE_TYPE.IFO), "IFO ");
  const moduleResref = readString(requiredField(ifo.root, "Mod_Tag"));
  const areaResref = readString(requiredField(ifo.root, "Mod_Entry_Area"));
  const entryPosition = vector3(ifo.root, "Mod_Entry_X", "Mod_Entry_Y", "Mod_Entry_Z");
  const entryDirection = vector2(ifo.root, "Mod_Entry_Dir_X", "Mod_Entry_Dir_Y");
  const hakEntries = readList(requiredField(ifo.root, "Mod_HakList"), ifo);
  assert.equal(hakEntries.length, 1, "diagnostic_module_hak_count_invalid");
  const orderedHakResrefs = hakEntries.map((entry) => readString(requiredField(entry, "Mod_Hak")));

  const are = parseGff(requiredResource(archive, areaResref, RESOURCE_TYPE.ARE), "ARE ");
  const areaWidth = readInteger(requiredField(are.root, "Width"));
  const areaHeight = readInteger(requiredField(are.root, "Height"));
  const tilesetResref = readString(requiredField(are.root, "Tileset"));
  const tiles = readList(requiredField(are.root, "Tile_List"), are);
  assert.equal(tiles.length, areaWidth * areaHeight, "diagnostic_module_tile_count_invalid");
  const expectedTiles = [[12, 2], [12, 1], [12, 3], [12, 3]];
  for (const [index, tile] of tiles.entries()) {
    assert.equal(readInteger(requiredField(tile, "Tile_ID")), expectedTiles[index]?.[0], `diagnostic_module_tile_id_mismatch:${index}`);
    assert.equal(readInteger(requiredField(tile, "Tile_Orientation")), expectedTiles[index]?.[1], `diagnostic_module_tile_orientation_mismatch:${index}`);
    for (const label of ["Tile_AnimLoop1", "Tile_AnimLoop2", "Tile_AnimLoop3"]) assert.equal(readInteger(requiredField(tile, label)), 1, `diagnostic_module_tile_animation_mismatch:${index}:${label}`);
  }

  const git = parseGff(requiredResource(archive, areaResref, RESOURCE_TYPE.GIT), "GIT ");
  const creatures = readList(requiredField(git.root, "Creature List"), git);
  assert.equal(creatures.length, 3, "diagnostic_module_fixture_count_invalid");
  const fixtures = creatures.map((creature) => ({
    id: readString(requiredField(creature, "Tag")),
    templateResRef: readString(requiredField(creature, "TemplateResRef")),
    displayName: readString(requiredField(creature, "FirstName")),
    appearanceRow: readInteger(requiredField(creature, "Appearance_Type")),
    position: vector3(creature, "XPosition", "YPosition", "ZPosition"),
    orientation: vector2(creature, "XOrientation", "YOrientation"),
  }));

  const gic = parseGff(requiredResource(archive, areaResref, RESOURCE_TYPE.GIC), "GIC ");
  assert.equal(readList(requiredField(gic.root, "Creature List"), gic).length, fixtures.length, "diagnostic_module_gic_fixture_count_mismatch");
  for (const [index, fixture] of fixtures.entries()) {
    const utc = parseGff(requiredResource(archive, fixture.templateResRef, RESOURCE_TYPE.UTC), "UTC ");
    assert.equal(utc.root.typeId, 0xffffffff, `diagnostic_module_utc_root_type_invalid:${index}`);
    assert.equal(readString(requiredField(utc.root, "TemplateResRef")), fixture.templateResRef, `diagnostic_module_utc_template_mismatch:${index}`);
    assert.equal(readString(requiredField(utc.root, "Tag")), fixture.id, `diagnostic_module_utc_tag_mismatch:${index}`);
    assert.equal(readString(requiredField(utc.root, "FirstName")), fixture.displayName, `diagnostic_module_utc_name_mismatch:${index}`);
    assert.equal(readInteger(requiredField(utc.root, "Appearance_Type")), fixture.appearanceRow, `diagnostic_module_utc_appearance_mismatch:${index}`);
  }

  const expectedKeys = new Set([
    `module:${RESOURCE_TYPE.IFO}`,
    `repute:${RESOURCE_TYPE.FAC}`,
    `${areaResref}:${RESOURCE_TYPE.ARE}`,
    `${areaResref}:${RESOURCE_TYPE.GIC}`,
    `${areaResref}:${RESOURCE_TYPE.GIT}`,
    ...fixtures.map((fixture) => `${fixture.templateResRef}:${RESOURCE_TYPE.UTC}`),
  ]);
  assert.equal(archive.resources.length, expectedKeys.size, "diagnostic_module_resource_count_invalid");
  for (const resource of archive.resources) assert.ok(expectedKeys.has(`${resource.resref}:${resource.type}`), `diagnostic_module_resource_unexpected:${resource.resref}:${resource.type}`);

  return {
    schemaVersion: 1,
    moduleResref,
    areaResref,
    orderedHakResrefs,
    entryPosition,
    entryDirection,
    tilesetResref,
    areaWidth,
    areaHeight,
    tileCount: tiles.length,
    fixtures,
  };
}

export function parseErfArchive(input, expectedSignature = undefined) {
  const bytes = Buffer.from(input ?? []);
  assert.ok(bytes.length >= 160, "erf_header_truncated");
  const signature = bytes.subarray(0, 4).toString("ascii");
  const version = bytes.subarray(4, 8).toString("ascii");
  if (expectedSignature != null) assert.equal(signature, expectedSignature, "erf_signature_invalid");
  assert.ok(new Set(["V1.0", "V1.1"]).has(version), "erf_version_invalid");
  const entryCount = bytes.readUInt32LE(16);
  const keyOffset = bytes.readUInt32LE(24);
  const resourceOffset = bytes.readUInt32LE(28);
  assert.ok(entryCount > 0 && entryCount <= 65_536, "erf_entry_count_invalid");
  assert.ok(keyOffset >= 160 && keyOffset + entryCount * 24 <= bytes.length, "erf_key_table_out_of_range");
  assert.ok(resourceOffset >= keyOffset + entryCount * 24 && resourceOffset + entryCount * 8 <= bytes.length, "erf_resource_table_out_of_range");
  const resources = [];
  const keys = new Set();
  for (let index = 0; index < entryCount; index += 1) {
    const key = keyOffset + index * 24;
    const resref = bytes.subarray(key, key + 16).toString("ascii").replace(/\0.*$/u, "").toLowerCase();
    const resourceId = bytes.readUInt32LE(key + 16);
    const type = bytes.readUInt16LE(key + 20);
    assert.ok(resref.length > 0 && resourceId < entryCount, `erf_key_invalid:${index}`);
    const uniqueKey = `${resref}:${type}`;
    assert.ok(!keys.has(uniqueKey), `erf_resource_duplicate:${uniqueKey}`);
    keys.add(uniqueKey);
    const entry = resourceOffset + resourceId * 8;
    const offset = bytes.readUInt32LE(entry);
    const length = bytes.readUInt32LE(entry + 4);
    assert.ok(offset >= resourceOffset + entryCount * 8 && offset + length <= bytes.length, `erf_payload_out_of_range:${uniqueKey}`);
    resources.push({ resref, type, bytes: bytes.subarray(offset, offset + length) });
  }
  return { signature, version, resources };
}

export function parseGff(input, expectedFileType = undefined) {
  const bytes = Buffer.from(input ?? []);
  assert.ok(bytes.length >= 56, "gff_header_truncated");
  const fileType = bytes.subarray(0, 4).toString("ascii");
  const fileVersion = bytes.subarray(4, 8).toString("ascii");
  if (expectedFileType != null) assert.equal(fileType, expectedFileType, "gff_file_type_invalid");
  assert.equal(fileVersion, "V3.2", "gff_version_invalid");
  const header = {
    structOffset: bytes.readUInt32LE(8), structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16), fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24), labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32), fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40), fieldIndicesCount: bytes.readUInt32LE(44),
    listIndicesOffset: bytes.readUInt32LE(48), listIndicesCount: bytes.readUInt32LE(52),
  };
  assertRange(bytes, header.structOffset, header.structCount * 12, "gff_struct_table");
  assertRange(bytes, header.fieldOffset, header.fieldCount * 12, "gff_field_table");
  assertRange(bytes, header.labelOffset, header.labelCount * 16, "gff_label_table");
  assertRange(bytes, header.fieldDataOffset, header.fieldDataCount, "gff_field_data");
  assertRange(bytes, header.fieldIndicesOffset, header.fieldIndicesCount, "gff_field_indices");
  assertRange(bytes, header.listIndicesOffset, header.listIndicesCount, "gff_list_indices");
  const labels = Array.from({ length: header.labelCount }, (_, index) => bytes.subarray(header.labelOffset + index * 16, header.labelOffset + index * 16 + 16).toString("ascii").replace(/\0.*$/u, ""));
  const structs = Array.from({ length: header.structCount }, (_, index) => {
    const offset = header.structOffset + index * 12;
    return { typeId: bytes.readUInt32LE(offset), dataOrOffset: bytes.readUInt32LE(offset + 4), fieldCount: bytes.readUInt32LE(offset + 8) };
  });
  const fields = Array.from({ length: header.fieldCount }, (_, index) => {
    const offset = header.fieldOffset + index * 12;
    const labelIndex = bytes.readUInt32LE(offset + 4);
    assert.ok(labelIndex < labels.length, `gff_field_label_out_of_range:${index}`);
    return { typeId: bytes.readUInt32LE(offset), label: labels[labelIndex], dataOrOffset: bytes.readUInt32LE(offset + 8) };
  });
  const parsed = { fileType, fileVersion, bytes, header, structs: [] };
  parsed.structs = structs.map((entry, structIndex) => {
    const indices = entry.fieldCount === 0 ? [] : entry.fieldCount === 1
      ? [entry.dataOrOffset]
      : readIndexArray(bytes, header.fieldIndicesOffset + entry.dataOrOffset, entry.fieldCount, fields.length, `gff_struct_fields:${structIndex}`);
    for (const index of indices) assert.ok(index < fields.length, `gff_field_index_out_of_range:${structIndex}`);
    return { typeId: entry.typeId, fields: indices.map((index) => ({ ...fields[index], __context: { bytes, header } })) };
  });
  parsed.root = parsed.structs[0];
  assert.ok(parsed.root, "gff_root_missing");
  return parsed;
}

function requiredResource(archive, resref, type) {
  const matches = archive.resources.filter((resource) => resource.resref === resref.toLowerCase() && resource.type === type);
  assert.equal(matches.length, 1, `diagnostic_module_resource_missing_or_ambiguous:${resref}:${type}`);
  return matches[0].bytes;
}

function requiredField(struct, label) {
  const matches = struct?.fields?.filter((field) => field.label === label) ?? [];
  assert.equal(matches.length, 1, `gff_field_missing_or_ambiguous:${label}`);
  return matches[0];
}

function readString(field) {
  const { bytes, header } = fieldContext(field);
  const offset = header.fieldDataOffset + field.dataOrOffset;
  if (field.typeId === FIELD_TYPE.CEXOSTRING) {
    assertRange(bytes, offset, 4, `gff_string_length:${field.label}`);
    const length = bytes.readUInt32LE(offset);
    assertRange(bytes, offset + 4, length, `gff_string:${field.label}`);
    return bytes.subarray(offset + 4, offset + 4 + length).toString("utf8");
  }
  if (field.typeId === FIELD_TYPE.RESREF) {
    assertRange(bytes, offset, 1, `gff_resref_length:${field.label}`);
    const length = bytes.readUInt8(offset);
    assert.ok(length <= 16, `gff_resref_too_long:${field.label}`);
    assertRange(bytes, offset + 1, length, `gff_resref:${field.label}`);
    return bytes.subarray(offset + 1, offset + 1 + length).toString("ascii").toLowerCase();
  }
  if (field.typeId === FIELD_TYPE.CEXOLOCSTRING) {
    assertRange(bytes, offset, 12, `gff_locstring_header:${field.label}`);
    const totalLength = bytes.readUInt32LE(offset);
    const count = bytes.readUInt32LE(offset + 8);
    assertRange(bytes, offset + 4, totalLength, `gff_locstring:${field.label}`);
    let cursor = offset + 12;
    let value = "";
    for (let index = 0; index < count; index += 1) {
      assertRange(bytes, cursor, 8, `gff_locstring_entry:${field.label}`);
      const length = bytes.readUInt32LE(cursor + 4);
      assertRange(bytes, cursor + 8, length, `gff_locstring_text:${field.label}`);
      if (index === 0) value = bytes.subarray(cursor + 8, cursor + 8 + length).toString("utf8");
      cursor += 8 + length;
    }
    return value;
  }
  assert.fail(`gff_string_field_type_invalid:${field.label}:${field.typeId}`);
}

function readInteger(field) {
  if (field.typeId === FIELD_TYPE.BYTE || field.typeId === FIELD_TYPE.CHAR) return field.dataOrOffset & 0xff;
  if (field.typeId === FIELD_TYPE.WORD || field.typeId === FIELD_TYPE.SHORT) return field.dataOrOffset & 0xffff;
  if (field.typeId === FIELD_TYPE.DWORD) return field.dataOrOffset >>> 0;
  if (field.typeId === FIELD_TYPE.INT) return field.dataOrOffset | 0;
  assert.fail(`gff_integer_field_type_invalid:${field.label}:${field.typeId}`);
}

function readFloat(field) {
  assert.equal(field.typeId, FIELD_TYPE.FLOAT, `gff_float_field_type_invalid:${field.label}`);
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(field.dataOrOffset, 0);
  return buffer.readFloatLE(0);
}

function readList(field, parsed) {
  assert.equal(field.typeId, FIELD_TYPE.LIST, `gff_list_field_type_invalid:${field.label}`);
  const offset = parsed.header.listIndicesOffset + field.dataOrOffset;
  assertRange(parsed.bytes, offset, 4, `gff_list_count:${field.label}`);
  const count = parsed.bytes.readUInt32LE(offset);
  const indices = readIndexArray(parsed.bytes, offset + 4, count, parsed.structs.length, `gff_list:${field.label}`);
  return indices.map((index) => parsed.structs[index]);
}

function fieldContext(field) {
  assert.ok(field.__context, `gff_field_context_missing:${field.label}`);
  return field.__context;
}

function vector3(struct, x, y, z) {
  return { x: readFloat(requiredField(struct, x)), y: readFloat(requiredField(struct, y)), z: readFloat(requiredField(struct, z)) };
}

function vector2(struct, x, y) {
  return { x: readFloat(requiredField(struct, x)), y: readFloat(requiredField(struct, y)) };
}

function readIndexArray(bytes, offset, count, limit, name) {
  assert.ok(Number.isInteger(count) && count >= 0 && count <= limit, `${name}_count_invalid`);
  assertRange(bytes, offset, count * 4, name);
  return Array.from({ length: count }, (_, index) => bytes.readUInt32LE(offset + index * 4));
}

function assertRange(bytes, offset, length, name) {
  assert.ok(Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length >= 0 && offset + length <= bytes.length, `${name}_out_of_range`);
}

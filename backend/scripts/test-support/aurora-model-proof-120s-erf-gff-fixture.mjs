import assert from "node:assert/strict";

const TYPE = Object.freeze({ BYTE: 0, WORD: 2, INT: 5, FLOAT: 8, CEXOSTRING: 10, RESREF: 11, CEXOLOCSTRING: 12, LIST: 15 });

export function createTriControlModuleFixture({ moduleResref, areaResref, hakResref, fixtures }) {
  assert.equal(fixtures.length, 3);
  const ifo = buildGff("IFO ", struct(0, [
    field("Mod_Tag", TYPE.CEXOSTRING, moduleResref),
    field("Mod_Entry_Area", TYPE.RESREF, areaResref),
    field("Mod_Entry_X", TYPE.FLOAT, 10),
    field("Mod_Entry_Y", TYPE.FLOAT, 10),
    field("Mod_Entry_Z", TYPE.FLOAT, 0),
    field("Mod_Entry_Dir_X", TYPE.FLOAT, 0),
    field("Mod_Entry_Dir_Y", TYPE.FLOAT, 1),
    field("Mod_HakList", TYPE.LIST, [struct(0, [field("Mod_Hak", TYPE.CEXOSTRING, hakResref)])]),
  ]));
  const tiles = [[12, 2], [12, 1], [12, 3], [12, 3]].map(([id, orientation]) => struct(1, [
    field("Tile_ID", TYPE.INT, id), field("Tile_Orientation", TYPE.INT, orientation),
    field("Tile_AnimLoop1", TYPE.BYTE, 1), field("Tile_AnimLoop2", TYPE.BYTE, 1), field("Tile_AnimLoop3", TYPE.BYTE, 1),
  ]));
  const are = buildGff("ARE ", struct(0, [
    field("Width", TYPE.INT, 2), field("Height", TYPE.INT, 2), field("Tileset", TYPE.RESREF, "tms01"), field("Tile_List", TYPE.LIST, tiles),
  ]));
  const creatureStructs = fixtures.map((fixture) => struct(4, [
    field("Tag", TYPE.CEXOSTRING, fixture.id),
    field("TemplateResRef", TYPE.RESREF, fixture.templateResRef),
    field("FirstName", TYPE.CEXOLOCSTRING, fixture.displayName),
    field("Appearance_Type", TYPE.WORD, fixture.appearanceRow),
    field("XPosition", TYPE.FLOAT, fixture.position.x), field("YPosition", TYPE.FLOAT, fixture.position.y), field("ZPosition", TYPE.FLOAT, fixture.position.z),
    field("XOrientation", TYPE.FLOAT, fixture.orientation.x), field("YOrientation", TYPE.FLOAT, fixture.orientation.y),
  ]));
  const git = buildGff("GIT ", struct(0, [field("Creature List", TYPE.LIST, creatureStructs)]));
  const gic = buildGff("GIC ", struct(0, [field("Creature List", TYPE.LIST, fixtures.map(() => struct(4, [])))]));
  const fac = buildGff("FAC ", struct(0xffffffff, []));
  const utcResources = fixtures.map((fixture) => ({
    resref: fixture.templateResRef,
    type: 2027,
    bytes: buildGff("UTC ", struct(0xffffffff, [
      field("Tag", TYPE.CEXOSTRING, fixture.id),
      field("TemplateResRef", TYPE.RESREF, fixture.templateResRef),
      field("FirstName", TYPE.CEXOLOCSTRING, fixture.displayName),
      field("Appearance_Type", TYPE.WORD, fixture.appearanceRow),
    ])),
  }));
  return buildErf("MOD ", [
    { resref: "module", type: 2014, bytes: ifo },
    { resref: "repute", type: 2038, bytes: fac },
    { resref: areaResref, type: 2012, bytes: are },
    { resref: areaResref, type: 2046, bytes: gic },
    { resref: areaResref, type: 2023, bytes: git },
    ...utcResources,
  ]);
}

export function buildErf(signature, resources) {
  const keyOffset = 160;
  const resourceOffset = keyOffset + resources.length * 24;
  const dataOffset = resourceOffset + resources.length * 8;
  const header = Buffer.alloc(160);
  header.write(signature, 0, "ascii");
  header.write("V1.0", 4, "ascii");
  header.writeUInt32LE(resources.length, 16);
  header.writeUInt32LE(keyOffset, 24);
  header.writeUInt32LE(resourceOffset, 28);
  const keys = Buffer.alloc(resources.length * 24);
  const entries = Buffer.alloc(resources.length * 8);
  let cursor = dataOffset;
  resources.forEach((resource, index) => {
    assert.match(resource.resref, /^[a-z0-9_]{1,16}$/u);
    keys.write(resource.resref, index * 24, 16, "ascii");
    keys.writeUInt32LE(index, index * 24 + 16);
    keys.writeUInt16LE(resource.type, index * 24 + 20);
    entries.writeUInt32LE(cursor, index * 8);
    entries.writeUInt32LE(resource.bytes.length, index * 8 + 4);
    cursor += resource.bytes.length;
  });
  return Buffer.concat([header, keys, entries, ...resources.map((resource) => Buffer.from(resource.bytes))]);
}

export function buildGff(fileType, root) {
  const structs = [];
  const fields = [];
  function addStruct(value) {
    const index = structs.length;
    const entry = { typeId: value.typeId >>> 0, fieldIndices: [] };
    structs.push(entry);
    for (const sourceField of value.fields) {
      const fieldIndex = fields.length;
      const next = { ...sourceField };
      fields.push(next);
      if (next.typeId === TYPE.LIST) next.childIndices = next.value.map(addStruct);
      entry.fieldIndices.push(fieldIndex);
    }
    return index;
  }
  addStruct(root);
  const labels = [...new Set(fields.map((value) => value.label))];
  const labelIndex = new Map(labels.map((label, index) => [label, index]));
  const fieldDataParts = [];
  const listParts = [];
  let fieldDataLength = 0;
  let listLength = 0;
  const encodedFields = fields.map((value) => {
    let dataOrOffset;
    if (value.typeId === TYPE.FLOAT) {
      const buffer = Buffer.alloc(4); buffer.writeFloatLE(value.value, 0); dataOrOffset = buffer.readUInt32LE(0);
    } else if ([TYPE.BYTE, TYPE.WORD, TYPE.INT].includes(value.typeId)) {
      dataOrOffset = value.value >>> 0;
    } else if (value.typeId === TYPE.CEXOSTRING) {
      const text = Buffer.from(value.value, "utf8"); const buffer = Buffer.alloc(4 + text.length); buffer.writeUInt32LE(text.length, 0); text.copy(buffer, 4);
      dataOrOffset = fieldDataLength; fieldDataParts.push(buffer); fieldDataLength += buffer.length;
    } else if (value.typeId === TYPE.RESREF) {
      const text = Buffer.from(value.value, "ascii"); assert.ok(text.length <= 16); const buffer = Buffer.concat([Buffer.from([text.length]), text]);
      dataOrOffset = fieldDataLength; fieldDataParts.push(buffer); fieldDataLength += buffer.length;
    } else if (value.typeId === TYPE.CEXOLOCSTRING) {
      const text = Buffer.from(value.value, "utf8"); const buffer = Buffer.alloc(20 + text.length);
      buffer.writeUInt32LE(16 + text.length, 0); buffer.writeUInt32LE(0xffffffff, 4); buffer.writeUInt32LE(1, 8); buffer.writeUInt32LE(0, 12); buffer.writeUInt32LE(text.length, 16); text.copy(buffer, 20);
      dataOrOffset = fieldDataLength; fieldDataParts.push(buffer); fieldDataLength += buffer.length;
    } else if (value.typeId === TYPE.LIST) {
      const buffer = Buffer.alloc(4 + value.childIndices.length * 4); buffer.writeUInt32LE(value.childIndices.length, 0); value.childIndices.forEach((child, index) => buffer.writeUInt32LE(child, 4 + index * 4));
      dataOrOffset = listLength; listParts.push(buffer); listLength += buffer.length;
    } else assert.fail(`unsupported_fixture_gff_type:${value.typeId}`);
    return { typeId: value.typeId, labelIndex: labelIndex.get(value.label), dataOrOffset };
  });
  const fieldIndexParts = [];
  let fieldIndexLength = 0;
  const encodedStructs = structs.map((value) => {
    let dataOrOffset = 0;
    if (value.fieldIndices.length === 1) dataOrOffset = value.fieldIndices[0];
    else if (value.fieldIndices.length > 1) {
      const buffer = Buffer.alloc(value.fieldIndices.length * 4); value.fieldIndices.forEach((fieldIndex, index) => buffer.writeUInt32LE(fieldIndex, index * 4));
      dataOrOffset = fieldIndexLength; fieldIndexParts.push(buffer); fieldIndexLength += buffer.length;
    }
    return { typeId: value.typeId, dataOrOffset, fieldCount: value.fieldIndices.length };
  });
  const structTable = Buffer.alloc(encodedStructs.length * 12);
  encodedStructs.forEach((value, index) => { const offset = index * 12; structTable.writeUInt32LE(value.typeId, offset); structTable.writeUInt32LE(value.dataOrOffset, offset + 4); structTable.writeUInt32LE(value.fieldCount, offset + 8); });
  const fieldTable = Buffer.alloc(encodedFields.length * 12);
  encodedFields.forEach((value, index) => { const offset = index * 12; fieldTable.writeUInt32LE(value.typeId, offset); fieldTable.writeUInt32LE(value.labelIndex, offset + 4); fieldTable.writeUInt32LE(value.dataOrOffset, offset + 8); });
  const labelTable = Buffer.alloc(labels.length * 16); labels.forEach((label, index) => labelTable.write(label, index * 16, 16, "ascii"));
  const fieldData = Buffer.concat(fieldDataParts); const fieldIndices = Buffer.concat(fieldIndexParts); const listIndices = Buffer.concat(listParts);
  const header = Buffer.alloc(56); header.write(fileType, 0, "ascii"); header.write("V3.2", 4, "ascii");
  let offset = 56;
  for (const [position, block, count] of [[8, structTable, encodedStructs.length], [16, fieldTable, encodedFields.length], [24, labelTable, labels.length]]) { header.writeUInt32LE(offset, position); header.writeUInt32LE(count, position + 4); offset += block.length; }
  for (const [position, block] of [[32, fieldData], [40, fieldIndices], [48, listIndices]]) { header.writeUInt32LE(offset, position); header.writeUInt32LE(block.length, position + 4); offset += block.length; }
  return Buffer.concat([header, structTable, fieldTable, labelTable, fieldData, fieldIndices, listIndices]);
}

function struct(typeId, fields) { return { typeId, fields }; }
function field(label, typeId, value) { return { label, typeId, value }; }

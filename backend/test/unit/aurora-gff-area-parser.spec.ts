import {
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

type SupportedField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "word"; value: number }
  | { label: string; type: "short"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "int"; value: number }
  | { label: string; type: "float"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string }
  | { label: string; type: "struct"; value: number }
  | { label: string; type: "list"; value: number[] };

interface StructDef {
  typeId?: number;
  fields: SupportedField[];
}

const FIELD_TYPE = {
  BYTE: 0,
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
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;

describe("aurora-gff-area-parser", () => {
  it("parses ARE metadata fields and tile list count", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Name", type: "cexolocstring", value: "Market District" },
            { label: "Tag", type: "cexostring", value: "market_district" },
            { label: "Width", type: "dword", value: 24 },
            { label: "Height", type: "dword", value: 18 },
            { label: "Tileset", type: "resref", value: "tno01" },
            { label: "Tile_List", type: "list", value: [1, 2, 3] },
            { label: "AmbientSndDay", type: "dword", value: 41 },
            { label: "AmbientSndNight", type: "dword", value: 52 },
            { label: "MusicDay", type: "dword", value: 11 },
            { label: "MusicNight", type: "dword", value: 12 },
            { label: "MusicBattle", type: "dword", value: 13 }
          ]
        },
        { fields: [] },
        { fields: [] },
        { fields: [] }
      ],
      "ARE "
    );

    const parsed = parseAreaMetadataFromAreGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "ARE ",
      name: "Market District",
      tag: "market_district",
      width: 24,
      height: 18,
      tileSet: "tno01",
      tileCount: 3,
      soundIds: {
        ambientDay: 41,
        ambientNight: 52,
        musicDay: 11,
        musicNight: 12,
        musicBattle: 13
      }
    });
  });

  it("parses GIT lists with placeables/doors/creatures/items and position struct fallback", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Placeable List", type: "list", value: [1] },
            { label: "Door List", type: "list", value: [2] },
            { label: "Creature List", type: "list", value: [3] },
            { label: "Item List", type: "list", value: [4] }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_crate_01" },
            { label: "Tag", type: "cexostring", value: "crate_tag" },
            { label: "XPosition", type: "float", value: 12.5 },
            { label: "YPosition", type: "float", value: 6.25 },
            { label: "ZPosition", type: "float", value: 0.5 },
            { label: "Bearing", type: "float", value: 90 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "utd_city_gate_01" },
            { label: "Tag", type: "cexostring", value: "north_gate" },
            { label: "XPosition", type: "float", value: 20.0 },
            { label: "YPosition", type: "float", value: 10.0 },
            { label: "XOrientation", type: "float", value: 0 },
            { label: "YOrientation", type: "float", value: 1 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "cre_guard_01" },
            { label: "XPosition", type: "float", value: 7.75 },
            { label: "YPosition", type: "float", value: 8.5 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "itm_potion_01" },
            { label: "Position", type: "struct", value: 5 }
          ]
        },
        {
          fields: [
            { label: "X", type: "float", value: 1.5 },
            { label: "Y", type: "float", value: 2.5 },
            { label: "Z", type: "float", value: 0 }
          ]
        }
      ],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed?.placeables).toHaveLength(1);
    expect(parsed?.doors).toHaveLength(1);
    expect(parsed?.creatures).toHaveLength(1);
    expect(parsed?.items).toHaveLength(1);

    expect(parsed?.placeables[0]).toMatchObject({
      templateResRef: "plc_crate_01",
      tag: "crate_tag",
      x: 12.5,
      y: 6.25,
      z: 0.5,
      bearing: 90
    });

    expect(parsed?.doors[0]).toMatchObject({
      templateResRef: "utd_city_gate_01",
      tag: "north_gate",
      x: 20,
      y: 10,
      z: 0,
      bearing: 90
    });

    expect(parsed?.items[0]).toMatchObject({
      templateResRef: "itm_potion_01",
      x: 1.5,
      y: 2.5,
      z: 0,
      bearing: 0
    });
  });

  it("returns null when file type does not match parser expectation", () => {
    const areBytes = buildNestedGffBuffer([{ fields: [] }], "ARE ");
    const gitBytes = buildNestedGffBuffer([{ fields: [] }], "GIT ");

    expect(parseAreaObjectsFromGitGff(areBytes)).toBeNull();
    expect(parseAreaMetadataFromAreGff(gitBytes)).toBeNull();
  });
});

function buildNestedGffBuffer(structs: StructDef[], fileType: string): Buffer {
  const uniqueLabels = [
    ...new Set(structs.flatMap((struct) => struct.fields.map((field) => field.label)))
  ];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];
  const structFieldIndices: number[][] = structs.map(() => []);

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  const pushListIndicesData = (chunk: Buffer): number => {
    const offset = listIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    listIndicesChunks.push(chunk);
    return offset;
  };

  structs.forEach((struct, structIndex) => {
    struct.fields.forEach((field) => {
      const labelIndex = labelIndexByName.get(field.label);
      if (labelIndex === undefined) {
        throw new Error(`Unknown label index for ${field.label}`);
      }

      let entry: { typeId: number; labelIndex: number; dataOrOffset: number };

      if (field.type === "byte") {
        entry = {
          typeId: FIELD_TYPE.BYTE,
          labelIndex,
          dataOrOffset: field.value & 0xff
        };
      } else if (field.type === "word") {
        entry = {
          typeId: FIELD_TYPE.WORD,
          labelIndex,
          dataOrOffset: field.value & 0xffff
        };
      } else if (field.type === "short") {
        entry = {
          typeId: FIELD_TYPE.SHORT,
          labelIndex,
          dataOrOffset: field.value & 0xffff
        };
      } else if (field.type === "dword") {
        entry = {
          typeId: FIELD_TYPE.DWORD,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else if (field.type === "int") {
        entry = {
          typeId: FIELD_TYPE.INT,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else if (field.type === "float") {
        const inline = Buffer.allocUnsafe(4);
        inline.writeFloatLE(field.value, 0);
        entry = {
          typeId: FIELD_TYPE.FLOAT,
          labelIndex,
          dataOrOffset: inline.readUInt32LE(0)
        };
      } else if (field.type === "cexostring") {
        const valueBytes = Buffer.from(field.value, "utf-8");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        entry = {
          typeId: FIELD_TYPE.CEXOSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "resref") {
        const valueBytes = Buffer.from(field.value, "ascii");
        const payload = Buffer.alloc(1 + valueBytes.length);
        payload.writeUInt8(valueBytes.length, 0);
        valueBytes.copy(payload, 1);
        entry = {
          typeId: FIELD_TYPE.RESREF,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "cexolocstring") {
        const valueBytes = Buffer.from(field.value, "utf-8");
        const entryPayload = Buffer.alloc(8 + valueBytes.length);
        entryPayload.writeUInt32LE(0, 0);
        entryPayload.writeUInt32LE(valueBytes.length, 4);
        valueBytes.copy(entryPayload, 8);

        const locPayload = Buffer.alloc(12 + entryPayload.length);
        const totalSize = 8 + entryPayload.length;
        locPayload.writeUInt32LE(totalSize, 0);
        locPayload.writeUInt32LE(0, 4);
        locPayload.writeUInt32LE(1, 8);
        entryPayload.copy(locPayload, 12);

        entry = {
          typeId: FIELD_TYPE.CEXOLOCSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(locPayload)
        };
      } else if (field.type === "struct") {
        entry = {
          typeId: FIELD_TYPE.STRUCT,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else {
        const payload = Buffer.alloc(4 + field.value.length * 4);
        payload.writeUInt32LE(field.value.length, 0);
        field.value.forEach((structIndexFromList, index) => {
          payload.writeUInt32LE(structIndexFromList >>> 0, 4 + index * 4);
        });
        entry = {
          typeId: FIELD_TYPE.LIST,
          labelIndex,
          dataOrOffset: pushListIndicesData(payload)
        };
      }

      const fieldIndex = fieldEntries.length;
      fieldEntries.push(entry);
      structFieldIndices[structIndex].push(fieldIndex);
    });
  });

  const fieldData = Buffer.concat(fieldDataChunks);
  const listIndices = Buffer.concat(listIndicesChunks);

  const fieldIndicesChunks: Buffer[] = [];
  const structEntries: Array<{ typeId: number; dataOrOffset: number; fieldCount: number }> = [];

  structs.forEach((struct, index) => {
    const indices = structFieldIndices[index];
    if (indices.length === 0) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: 0,
        fieldCount: 0
      });
      return;
    }

    if (indices.length === 1) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: indices[0],
        fieldCount: 1
      });
      return;
    }

    const currentOffset = fieldIndicesChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const chunk = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, fieldPos) => {
      chunk.writeUInt32LE(fieldIndex >>> 0, fieldPos * 4);
    });
    fieldIndicesChunks.push(chunk);

    structEntries.push({
      typeId: struct.typeId ?? 1,
      dataOrOffset: currentOffset,
      fieldCount: indices.length
    });
  });

  const fieldIndices = Buffer.concat(fieldIndicesChunks);

  const structTable = Buffer.alloc(structEntries.length * STRUCT_ENTRY_SIZE);
  structEntries.forEach((entry, index) => {
    const offset = index * STRUCT_ENTRY_SIZE;
    structTable.writeUInt32LE(entry.typeId >>> 0, offset);
    structTable.writeUInt32LE(entry.dataOrOffset >>> 0, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount >>> 0, offset + 8);
  });

  const fieldTable = Buffer.alloc(fieldEntries.length * FIELD_ENTRY_SIZE);
  fieldEntries.forEach((entry, index) => {
    const offset = index * FIELD_ENTRY_SIZE;
    fieldTable.writeUInt32LE(entry.typeId, offset);
    fieldTable.writeUInt32LE(entry.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset, offset + 8);
  });

  const labels = Buffer.alloc(uniqueLabels.length * LABEL_ENTRY_SIZE);
  uniqueLabels.forEach((label, index) => {
    const offset = index * LABEL_ENTRY_SIZE;
    const bytes = Buffer.from(label.slice(0, LABEL_ENTRY_SIZE), "ascii");
    bytes.copy(labels, offset);
  });

  const structOffset = HEADER_SIZE;
  const fieldOffset = structOffset + structTable.length;
  const labelOffset = fieldOffset + fieldTable.length;
  const fieldDataOffset = labelOffset + labels.length;
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.write(fileType, 0, "ascii");
  header.write("V3.2", 4, "ascii");
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(structEntries.length, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(listIndices.length, 52);

  return Buffer.concat([
    header,
    structTable,
    fieldTable,
    labels,
    fieldData,
    fieldIndices,
    listIndices
  ]);
}

import {
  __auroraGffAreaParserInternals,
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

type SupportedField =
  | { label: string; type: "dword"; value: number }
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
  DWORD: 4,
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

describe("aurora-gff-area-parser internals", () => {
  it("normalizes labels and sanitizes strings", () => {
    expect(__auroraGffAreaParserInternals.normalizeLabel(" Ambient_Snd-Day \t")).toBe(
      "ambientsndday"
    );
    expect(__auroraGffAreaParserInternals.sanitizeAscii("\0  Hello  \0")).toBe("Hello");
    expect(__auroraGffAreaParserInternals.sanitizeUtf8("\0  Zażółć  \0")).toBe("Zażółć");
  });

  it("derives and normalizes bearing correctly", () => {
    expect(__auroraGffAreaParserInternals.deriveBearingFromOrientation(undefined, 1)).toBeUndefined();
    expect(__auroraGffAreaParserInternals.deriveBearingFromOrientation(0, 0)).toBeUndefined();
    expect(__auroraGffAreaParserInternals.deriveBearingFromOrientation(0, 1)).toBe(90);
    expect(__auroraGffAreaParserInternals.deriveBearingFromOrientation(-1, 0)).toBe(180);
    expect(__auroraGffAreaParserInternals.normalizeBearing(-90)).toBe(270);
    expect(__auroraGffAreaParserInternals.normalizeBearing(450)).toBe(90);
  });

  it("validates byte ranges defensively", () => {
    const bytes = Buffer.alloc(16, 0);
    expect(__auroraGffAreaParserInternals.isRangeWithinBuffer(bytes, 0, 16)).toBe(true);
    expect(__auroraGffAreaParserInternals.isRangeWithinBuffer(bytes, 15, 1)).toBe(true);
    expect(__auroraGffAreaParserInternals.isRangeWithinBuffer(bytes, -1, 1)).toBe(false);
    expect(__auroraGffAreaParserInternals.isRangeWithinBuffer(bytes, 1, -1)).toBe(false);
    expect(__auroraGffAreaParserInternals.isRangeWithinBuffer(bytes, 17, 0)).toBe(false);
    expect(__auroraGffAreaParserInternals.isRangeWithinBuffer(bytes, 8, 20)).toBe(false);
    expect(__auroraGffAreaParserInternals.isRangeWithinBuffer(bytes, Number.NaN, 1)).toBe(false);
  });

  it("returns null for truncated buffer and broken header ranges", () => {
    const tiny = Buffer.alloc(12, 0);
    expect(parseAreaMetadataFromAreGff(tiny)).toBeNull();

    const valid = buildNestedGffBuffer([{ fields: [{ label: "Tag", type: "cexostring", value: "ok" }] }], "ARE ");
    const brokenStructOffset = Buffer.from(valid);
    brokenStructOffset.writeUInt32LE(0xfffffff0, 8);
    expect(parseAreaMetadataFromAreGff(brokenStructOffset)).toBeNull();

    const brokenFieldIndices = Buffer.from(valid);
    brokenFieldIndices.writeUInt32LE(0xfffffff0, 40);
    expect(parseAreaMetadataFromAreGff(brokenFieldIndices)).toBeNull();

    const brokenListIndices = Buffer.from(valid);
    brokenListIndices.writeUInt32LE(0xfffffff0, 48);
    expect(parseAreaMetadataFromAreGff(brokenListIndices)).toBeNull();
  });

  it("parses metadata with fallback to regular string and trims values", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Name", type: "cexostring", value: "  Market Name  " },
            { label: "Tag", type: "cexostring", value: "  district_tag  " },
            { label: "Tileset", type: "resref", value: "  TNO01  " },
            { label: "Tile_List", type: "list", value: [1, 2, 3, 4] }
          ]
        },
        { fields: [] },
        { fields: [] },
        { fields: [] },
        { fields: [] }
      ],
      "ARE "
    );

    const parsed = parseAreaMetadataFromAreGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Market Name");
    expect(parsed?.tag).toBe("district_tag");
    expect(parsed?.tileSet).toBe("TNO01");
    expect(parsed?.tileCount).toBe(4);
  });

  it("skips invalid placement entries without X/Y coordinates", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [{ label: "Placeable List", type: "list", value: [1, 2] }]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_valid_01" },
            { label: "XPosition", type: "float", value: 2.5 },
            { label: "YPosition", type: "float", value: 3.5 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_invalid_01" },
            { label: "XPosition", type: "float", value: 7.5 }
          ]
        }
      ],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed?.placeables).toHaveLength(1);
    expect(parsed?.placeables[0]?.templateResRef).toBe("plc_valid_01");
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

      if (field.type === "dword") {
        entry = {
          typeId: FIELD_TYPE.DWORD,
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

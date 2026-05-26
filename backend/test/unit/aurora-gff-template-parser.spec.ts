import { parseTemplateBlueprintFromGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

type SupportedField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string };

const FIELD_TYPE = {
  BYTE: 0,
  DWORD: 4,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;

describe("aurora-gff-template-parser", () => {
  it("parses root-level blueprint fields for template classification", () => {
    const bytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_test_anchor" },
      { label: "LocName", type: "cexolocstring", value: "Test Anchor" },
      { label: "Tag", type: "cexostring", value: "vvx_fire_anchor" },
      { label: "Conversation", type: "resref", value: "conv_anchor" },
      { label: "Appearance", type: "dword", value: 42 },
      { label: "HasInventory", type: "byte", value: 1 },
      { label: "Static", type: "byte", value: 0 },
      { label: "ModelName", type: "resref", value: "fx_fire_pillar" },
      { label: "OnUsed", type: "resref", value: "script_use_anchor" }
    ]);

    const parsed = parseTemplateBlueprintFromGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      templateResRef: "plc_test_anchor",
      displayName: "Test Anchor",
      tag: "vvx_fire_anchor",
      conversation: "conv_anchor",
      appearanceId: 42,
      hasInventory: true,
      isStatic: false,
      modelResRef: "fx_fire_pillar"
    });
    expect(parsed?.scripts).toMatchObject({
      onused: "script_use_anchor"
    });
    expect(parsed?.dependencyRefs).toEqual(
      expect.arrayContaining([
        "fx_fire_pillar",
        "conv_anchor",
        "script_use_anchor",
        "plc_test_anchor",
        "vvx_fire_anchor"
      ])
    );
    expect(parsed?.vfxEvidence).toEqual(expect.arrayContaining(["modelResRef", "tag"]));
  });

  it("returns null for invalid payload", () => {
    expect(parseTemplateBlueprintFromGff(Buffer.from([0x01, 0x02, 0x03]))).toBeNull();
  });
});

function buildGffBuffer(fields: SupportedField[]): Buffer {
  const uniqueLabels = [...new Set(fields.map((field) => field.label))];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  for (const field of fields) {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Unknown label index for ${field.label}`);
    }

    if (field.type === "byte") {
      fieldEntries.push({
        typeId: FIELD_TYPE.BYTE,
        labelIndex,
        dataOrOffset: field.value & 0xff
      });
      continue;
    }

    if (field.type === "dword") {
      fieldEntries.push({
        typeId: FIELD_TYPE.DWORD,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
      continue;
    }

    if (field.type === "cexostring") {
      const valueBytes = Buffer.from(field.value, "utf-8");
      const payload = Buffer.alloc(4 + valueBytes.length);
      payload.writeUInt32LE(valueBytes.length, 0);
      valueBytes.copy(payload, 4);
      fieldEntries.push({
        typeId: FIELD_TYPE.CEXOSTRING,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
      continue;
    }

    if (field.type === "resref") {
      const valueBytes = Buffer.from(field.value, "ascii");
      const payload = Buffer.alloc(1 + valueBytes.length);
      payload.writeUInt8(valueBytes.length, 0);
      valueBytes.copy(payload, 1);
      fieldEntries.push({
        typeId: FIELD_TYPE.RESREF,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
      continue;
    }

    const valueBytes = Buffer.from(field.value, "utf-8");
    const entryPayload = Buffer.alloc(8 + valueBytes.length);
    entryPayload.writeUInt32LE(0, 0); // language id
    entryPayload.writeUInt32LE(valueBytes.length, 4);
    valueBytes.copy(entryPayload, 8);

    const locPayload = Buffer.alloc(12 + entryPayload.length);
    const totalSize = 8 + entryPayload.length;
    locPayload.writeUInt32LE(totalSize, 0);
    locPayload.writeUInt32LE(0, 4); // strRef
    locPayload.writeUInt32LE(1, 8); // string count
    entryPayload.copy(locPayload, 12);

    fieldEntries.push({
      typeId: FIELD_TYPE.CEXOLOCSTRING,
      labelIndex,
      dataOrOffset: pushFieldData(locPayload)
    });
  }

  const fieldData = Buffer.concat(fieldDataChunks);

  const structTable = Buffer.alloc(STRUCT_ENTRY_SIZE);
  structTable.writeUInt32LE(1, 0); // type id
  structTable.writeUInt32LE(fields.length <= 1 ? 0 : 0, 4);
  structTable.writeUInt32LE(fields.length, 8);

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

  const fieldIndices = Buffer.alloc(fields.length > 1 ? fields.length * 4 : 0);
  if (fields.length > 1) {
    for (let index = 0; index < fields.length; index += 1) {
      fieldIndices.writeUInt32LE(index, index * 4);
    }
  }

  const structOffset = HEADER_SIZE;
  const fieldOffset = structOffset + structTable.length;
  const labelOffset = fieldOffset + fieldTable.length;
  const fieldDataOffset = labelOffset + labels.length;
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.write("UTP ", 0, "ascii");
  header.write("V3.2", 4, "ascii");
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(1, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(0, 52);

  return Buffer.concat([header, structTable, fieldTable, labels, fieldData, fieldIndices]);
}

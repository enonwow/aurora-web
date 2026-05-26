import { parseTemplateBlueprintFromGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

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
  | { label: string; type: "list"; value: number }
  | { label: string; type: "unknown"; value: number };

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
  LIST: 15
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

  it("parses Aurora placeable lock/trap/runtime aliases from UTP", () => {
    const bytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_magicdoor_prop" },
      { label: "LocName", type: "cexolocstring", value: "Magic Door" },
      { label: "KeyName", type: "resref", value: "key_magicdoor" },
      { label: "AnimationState", type: "dword", value: 2 },
      { label: "BodyBag", type: "byte", value: 1 },
      { label: "AutoRemoveKey", type: "byte", value: 1 },
      { label: "CloseLockDC", type: "dword", value: 18 },
      { label: "OpenLockDC", type: "dword", value: 20 },
      { label: "Interruptable", type: "byte", value: 0 },
      { label: "Invulnerable", type: "byte", value: 1 },
      { label: "KeyRequired", type: "byte", value: 1 },
      { label: "Lockable", type: "byte", value: 1 },
      { label: "Locked", type: "byte", value: 1 },
      { label: "TrapDetectable", type: "byte", value: 1 },
      { label: "TrapDetectDC", type: "dword", value: 12 },
      { label: "TrapDisarmable", type: "byte", value: 1 },
      { label: "DisarmDC", type: "dword", value: 15 },
      { label: "TrapFlag", type: "byte", value: 1 },
      { label: "TrapOneShot", type: "byte", value: 0 },
      { label: "TrapType", type: "dword", value: 7 },
      { label: "CurrentHP", type: "dword", value: 35 },
      { label: "Hardness", type: "dword", value: 4 },
      { label: "OnLock", type: "resref", value: "script_magicdoor_lock" },
      { label: "OnMeleeAttacked", type: "resref", value: "script_magicdoor_melee" }
    ]);

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      keyName: "key_magicdoor",
      animationState: 2,
      bodyBag: true,
      autoRemoveKey: true,
      closeLockDc: 18,
      openLockDc: 20,
      interruptable: false,
      invulnerable: true,
      keyRequired: true,
      lockable: true,
      locked: true,
      trapDetectable: true,
      trapDetectDc: 12,
      trapDisarmable: true,
      disarmDc: 15,
      trapFlag: true,
      trapOneShot: false,
      trapType: 7,
      currentHitPoints: 35,
      hardness: 4
    });
    expect(parsed?.scripts).toMatchObject({
      onlock: "script_magicdoor_lock",
      onmeleeattacked: "script_magicdoor_melee"
    });
  });

  it("extracts creature runtime fields and list counters", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_city_guard_01" },
        { label: "LocName", type: "cexolocstring", value: "City Guard" },
        { label: "ScriptHeartbeat", type: "resref", value: "hb_guard" },
        { label: "ScriptOnBlocked", type: "resref", value: "block_guard" },
        { label: "Appearance_Type", type: "dword", value: 17 },
        { label: "FactionID", type: "dword", value: 3 },
        { label: "ChallengeRating", type: "dword", value: 6 },
        { label: "ClassList", type: "list", value: 2 },
        { label: "SkillList", type: "list", value: 5 },
        { label: "FeatList", type: "list", value: 4 }
      ],
      "UTC "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTC ",
      templateResRef: "cre_city_guard_01",
      appearanceId: 17,
      factionId: 3,
      challengeRating: 6,
      classListCount: 2,
      skillListCount: 5,
      featListCount: 4
    });
    expect(parsed?.scripts).toMatchObject({
      scriptheartbeat: "hb_guard",
      scriptonblocked: "block_guard"
    });
  });

  it("extracts item runtime/pricing fields from UTI", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "itm_scroll_fire_01" },
        { label: "LocName", type: "cexolocstring", value: "Scroll of Fire" },
        { label: "Description", type: "cexolocstring", value: "Unidentified description" },
        { label: "DescIdentified", type: "cexolocstring", value: "Identified description" },
        { label: "Tag", type: "cexostring", value: "itm_scroll_fire_tag" },
        { label: "BaseItem", type: "dword", value: 75 },
        { label: "AddCost", type: "dword", value: 50 },
        { label: "CostTable", type: "dword", value: 3 },
        { label: "CostValue", type: "dword", value: 11 },
        { label: "Charges", type: "dword", value: 8 },
        { label: "StackSize", type: "word", value: 5 },
        { label: "Identified", type: "byte", value: 0 },
        { label: "Stolen", type: "byte", value: 1 }
      ],
      "UTI "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTI ",
      templateResRef: "itm_scroll_fire_01",
      localizedName: "Scroll of Fire",
      displayName: "Scroll of Fire",
      description: "Unidentified description",
      identifiedDescription: "Identified description",
      tag: "itm_scroll_fire_tag",
      baseItem: 75,
      addCost: 50,
      costTable: 3,
      costValue: 11,
      charges: 8,
      stackSize: 5,
      identified: false,
      stolen: true
    });
  });

  it("extracts creature visual body/color fields and equip list count", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_drow_scout_01" },
        { label: "FirstName", type: "cexolocstring", value: "Drow" },
        { label: "LastName", type: "cexolocstring", value: "Scout" },
        { label: "Appearance_Head", type: "dword", value: 22 },
        { label: "BodyPart_RFoot", type: "dword", value: 1 },
        { label: "BodyPart_LFoot", type: "dword", value: 2 },
        { label: "BodyPart_RShin", type: "dword", value: 3 },
        { label: "BodyPart_LShin", type: "dword", value: 4 },
        { label: "BodyPart_LThigh", type: "dword", value: 5 },
        { label: "BodyPart_RThigh", type: "dword", value: 6 },
        { label: "BodyPart_Pelvis", type: "dword", value: 7 },
        { label: "BodyPart_Torso", type: "dword", value: 8 },
        { label: "BodyPart_Belt", type: "dword", value: 9 },
        { label: "BodyPart_Neck", type: "dword", value: 10 },
        { label: "BodyPart_RFArm", type: "dword", value: 11 },
        { label: "BodyPart_LFArm", type: "dword", value: 12 },
        { label: "BodyPart_RBicep", type: "dword", value: 13 },
        { label: "BodyPart_LBicep", type: "dword", value: 14 },
        { label: "BodyPart_RShoul", type: "dword", value: 15 },
        { label: "BodyPart_LShoul", type: "dword", value: 16 },
        { label: "BodyPart_RHand", type: "dword", value: 17 },
        { label: "BodyPart_LHand", type: "dword", value: 18 },
        { label: "BodyPart_Robe", type: "dword", value: 19 },
        { label: "Color_Skin", type: "dword", value: 20 },
        { label: "Color_Hair", type: "dword", value: 21 },
        { label: "Color_Tattoo1", type: "dword", value: 22 },
        { label: "Color_Tattoo2", type: "dword", value: 23 },
        { label: "Equip_ItemList", type: "list", value: 4 }
      ],
      "UTC "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      firstName: "Drow",
      lastName: "Scout",
      displayName: "Drow Scout",
      appearanceHead: 22,
      bodyPartRFoot: 1,
      bodyPartLFoot: 2,
      bodyPartRShin: 3,
      bodyPartLShin: 4,
      bodyPartLThigh: 5,
      bodyPartRThigh: 6,
      bodyPartPelvis: 7,
      bodyPartTorso: 8,
      bodyPartBelt: 9,
      bodyPartNeck: 10,
      bodyPartRFArm: 11,
      bodyPartLFArm: 12,
      bodyPartRBicep: 13,
      bodyPartLBicep: 14,
      bodyPartRShoul: 15,
      bodyPartLShoul: 16,
      bodyPartRHand: 17,
      bodyPartLHand: 18,
      bodyPartRobe: 19,
      colorSkin: 20,
      colorHair: 21,
      colorTattoo1: 22,
      colorTattoo2: 23,
      equipItemListCount: 4
    });
  });

  it("returns null for invalid payload", () => {
    expect(parseTemplateBlueprintFromGff(Buffer.from([0x01, 0x02, 0x03]))).toBeNull();
  });

  it("parses empty and single-field root structs", () => {
    const emptyBytes = buildGffBuffer([]);
    const parsedEmpty = parseTemplateBlueprintFromGff(emptyBytes);

    expect(parsedEmpty).not.toBeNull();
    expect(parsedEmpty?.dependencyFingerprint).toBe("none");
    expect(parsedEmpty?.dependencyRefs).toEqual([]);

    const singleFieldBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_single" }
    ]);
    const parsedSingle = parseTemplateBlueprintFromGff(singleFieldBytes);

    expect(parsedSingle?.templateResRef).toBe("plc_single");
  });

  it("returns null for missing structs, invalid ranges and broken field-index tables", () => {
    const base = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_base" },
      { label: "LocName", type: "cexolocstring", value: "Base Name" }
    ]);

    const noStructs = Buffer.from(base);
    noStructs.writeUInt32LE(0, 12);
    expect(parseTemplateBlueprintFromGff(noStructs)).toBeNull();

    const invalidFieldIndices = Buffer.from(base);
    invalidFieldIndices.writeUInt32LE(0xfffffff0, HEADER_SIZE + 4);
    expect(parseTemplateBlueprintFromGff(invalidFieldIndices)).toBeNull();

    const invalidHeaderRange = Buffer.from(base);
    invalidHeaderRange.writeUInt32LE(0xfffffff0, 36);
    expect(parseTemplateBlueprintFromGff(invalidHeaderRange)).toBeNull();
  });

  it("parses word/float fields and skips unsupported or empty script fields", () => {
    const bytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "vvx_dup_anchor" },
      { label: "LocName", type: "cexostring", value: "   " },
      { label: "DisplayName", type: "cexolocstring", value: "Fallback Display Name" },
      { label: "Race", type: "word", value: 65530 },
      { label: "ChallengeRating", type: "float", value: 1.5 },
      { label: "OnUsed", type: "resref", value: "" },
      { label: "ModelName", type: "resref", value: "dup_ref" },
      { label: "Conversation", type: "resref", value: "dup_ref" },
      { label: "UnknownField", type: "unknown", value: 123 },
      { label: "   ", type: "dword", value: 77 }
    ]);

    writeFieldIndex(bytes, 0, 999_999);

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed?.displayName).toBe("Fallback Display Name");
    expect(parsed?.race).toBe(65530);
    expect(parsed?.challengeRating).toBeCloseTo(1.5);
    expect(parsed?.scripts).not.toHaveProperty("onused");
    expect(parsed?.dependencyRefs.filter((value) => value === "dup_ref")).toHaveLength(1);
  });

  it("ignores malformed string, resref, locstring and list payloads", () => {
    const baseFields: SupportedField[] = [
      { label: "TemplateResRef", type: "resref", value: "plc_valid_ref" },
      { label: "Description", type: "cexostring", value: "Valid Description" },
      { label: "LocName", type: "cexolocstring", value: "Visible Name" },
      { label: "ClassList", type: "list", value: 2 }
    ];

    const outOfRangeString = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeString, 1, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeString)?.description).toBeUndefined();

    const truncatedString = buildGffBuffer(baseFields);
    const descriptionOffset = getFieldDataAbsoluteOffset(truncatedString, 1);
    truncatedString.writeUInt32LE(0xfffffff0, descriptionOffset);
    expect(parseTemplateBlueprintFromGff(truncatedString)?.description).toBeUndefined();

    const outOfRangeResref = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeResref, 0, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeResref)?.templateResRef).toBeUndefined();

    const truncatedResref = buildGffBuffer(baseFields);
    const resrefOffset = getFieldDataAbsoluteOffset(truncatedResref, 0);
    truncatedResref.writeUInt8(250, resrefOffset);
    expect(parseTemplateBlueprintFromGff(truncatedResref)?.templateResRef).toBeUndefined();

    const outOfRangeLocString = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeLocString, 2, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeLocString)?.displayName).toBeUndefined();

    const truncatedLocTotalSize = buildGffBuffer(baseFields);
    const locOffset = getFieldDataAbsoluteOffset(truncatedLocTotalSize, 2);
    truncatedLocTotalSize.writeUInt32LE(0xfffffff0, locOffset);
    expect(parseTemplateBlueprintFromGff(truncatedLocTotalSize)?.displayName).toBeUndefined();

    const brokenLocCursor = buildGffBuffer(baseFields);
    const locCursorOffset = getFieldDataAbsoluteOffset(brokenLocCursor, 2);
    brokenLocCursor.writeUInt32LE(2, locCursorOffset + 8);
    expect(parseTemplateBlueprintFromGff(brokenLocCursor)?.displayName).toBe("Visible Name");

    const brokenLocTextLength = buildGffBuffer(baseFields);
    const locTextLengthOffset = getFieldDataAbsoluteOffset(brokenLocTextLength, 2);
    brokenLocTextLength.writeUInt32LE(0xfffffff0, locTextLengthOffset + 16);
    expect(parseTemplateBlueprintFromGff(brokenLocTextLength)?.displayName).toBeUndefined();

    const outOfRangeList = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeList, 3, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeList)?.classListCount).toBeUndefined();

    const brokenListBody = buildGffBuffer(baseFields);
    const listOffset = getListDataAbsoluteOffset(brokenListBody, 3);
    brokenListBody.writeUInt32LE(0xfffffff0, listOffset);
    expect(parseTemplateBlueprintFromGff(brokenListBody)?.classListCount).toBeUndefined();
  });

  it("defensively handles non-standard buffer inputs", () => {
    const nonFiniteHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 8) {
        return Number.NaN;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(nonFiniteHeader)).toBeNull();

    const negativeLengthHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 36) {
        return -1;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(negativeLengthHeader)).toBeNull();

    const offsetBeyondBufferHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 8) {
        return HEADER_SIZE + 1;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(offsetBeyondBufferHeader)).toBeNull();

    const overflowingRangeHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 8) {
        return 50;
      }
      if (offset === 12) {
        return 1;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(overflowingRangeHeader)).toBeNull();

    const throwingReaderHeader = createFakeHeaderBuffer(() => {
      throw new Error("synthetic parser failure");
    });
    expect(parseTemplateBlueprintFromGff(throwingReaderHeader)).toBeNull();
  });

  it("detects VFX evidence from template resref and handles truncated locstring cursor scans", () => {
    const vfxTemplateBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "vvx_magic_burst" }
    ]);
    const parsedVfx = parseTemplateBlueprintFromGff(vfxTemplateBytes);
    expect(parsedVfx?.vfxEvidence).toContain("templateResRef");

    const locOnlyBytes = buildGffBuffer([
      { label: "LocName", type: "cexolocstring", value: "CursorBreak" }
    ]);
    const locOffset = getFieldDataAbsoluteOffset(locOnlyBytes, 0);
    locOnlyBytes.writeUInt32LE(2, locOffset + 8);
    const parsedLocOnly = parseTemplateBlueprintFromGff(locOnlyBytes);
    expect(parsedLocOnly?.displayName).toBe("CursorBreak");
  });
});

function buildGffBuffer(fields: SupportedField[], fileType = "UTP "): Buffer {
  const uniqueLabels = [...new Set(fields.map((field) => field.label))];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];

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

    if (field.type === "word") {
      fieldEntries.push({
        typeId: FIELD_TYPE.WORD,
        labelIndex,
        dataOrOffset: field.value & 0xffff
      });
      continue;
    }

    if (field.type === "short") {
      fieldEntries.push({
        typeId: FIELD_TYPE.SHORT,
        labelIndex,
        dataOrOffset: field.value & 0xffff
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

    if (field.type === "int") {
      fieldEntries.push({
        typeId: FIELD_TYPE.INT,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
      continue;
    }

    if (field.type === "float") {
      const inline = Buffer.allocUnsafe(4);
      inline.writeFloatLE(field.value, 0);
      fieldEntries.push({
        typeId: FIELD_TYPE.FLOAT,
        labelIndex,
        dataOrOffset: inline.readUInt32LE(0)
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

    if (field.type === "list") {
      const payload = Buffer.alloc(4 + field.value * 4);
      payload.writeUInt32LE(field.value, 0);
      fieldEntries.push({
        typeId: FIELD_TYPE.LIST,
        labelIndex,
        dataOrOffset: pushListIndicesData(payload)
      });
      continue;
    }

    if (field.type === "unknown") {
      fieldEntries.push({
        typeId: 255,
        labelIndex,
        dataOrOffset: field.value >>> 0
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
  const listIndices = Buffer.concat(listIndicesChunks);

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
  header.write(fileType, 0, "ascii");
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

function getFieldEntryOffset(fieldIndex: number): number {
  return HEADER_SIZE + STRUCT_ENTRY_SIZE + fieldIndex * FIELD_ENTRY_SIZE;
}

function writeFieldIndex(bytes: Buffer, index: number, value: number): void {
  const fieldIndicesOffset = bytes.readUInt32LE(40);
  bytes.writeUInt32LE(value >>> 0, fieldIndicesOffset + index * 4);
}

function writeFieldDataOffset(bytes: Buffer, fieldIndex: number, value: number): void {
  bytes.writeUInt32LE(value >>> 0, getFieldEntryOffset(fieldIndex) + 8);
}

function getFieldDataAbsoluteOffset(bytes: Buffer, fieldIndex: number): number {
  const fieldDataOffset = bytes.readUInt32LE(32);
  const dataOrOffset = bytes.readUInt32LE(getFieldEntryOffset(fieldIndex) + 8);
  return fieldDataOffset + dataOrOffset;
}

function getListDataAbsoluteOffset(bytes: Buffer, fieldIndex: number): number {
  const listIndicesOffset = bytes.readUInt32LE(48);
  const dataOrOffset = bytes.readUInt32LE(getFieldEntryOffset(fieldIndex) + 8);
  return listIndicesOffset + dataOrOffset;
}

function createFakeHeaderBuffer(readUInt32LE: (offset: number) => number): Buffer {
  const fake = {
    length: HEADER_SIZE,
    toString: (_encoding: string, start: number, end: number): string => {
      if (start === 0 && end === 4) {
        return "UTP ";
      }
      if (start === 4 && end === 8) {
        return "V3.2";
      }
      return "";
    },
    readUInt32LE
  };

  return fake as unknown as Buffer;
}

import {
  AREA_CREATURE_BODY_PART_FIELDS,
  maximumAreaCreatureBodyPartTarget,
  readAreaCreatureBodyPartStorage,
  readAreaCreatureBodyPartsStorage,
  readExistingAreaCreatureBodyPartMutations,
} from "../../src/modules/areas/domain/area-creature-body-parts";

describe("Area Creature body-part compatibility storage", () => {
  it("freezes the exact legacy and x-prefixed labels in native writer order", () => {
    expect(AREA_CREATURE_BODY_PART_FIELDS).toEqual([
      { key: "rightFoot", legacyLabel: "ArmorPart_RFoot", wideLabel: "xArmorPart_RFoot" },
      { key: "leftFoot", legacyLabel: "BodyPart_LFoot", wideLabel: "xBodyPart_LFoot" },
      { key: "rightShin", legacyLabel: "BodyPart_RShin", wideLabel: "xBodyPart_RShin" },
      { key: "leftShin", legacyLabel: "BodyPart_LShin", wideLabel: "xBodyPart_LShin" },
      { key: "leftThigh", legacyLabel: "BodyPart_LThigh", wideLabel: "xBodyPart_LThigh" },
      { key: "rightThigh", legacyLabel: "BodyPart_RThigh", wideLabel: "xBodyPart_RThigh" },
      { key: "pelvis", legacyLabel: "BodyPart_Pelvis", wideLabel: "xBodyPart_Pelvis" },
      { key: "torso", legacyLabel: "BodyPart_Torso", wideLabel: "xBodyPart_Torso" },
      { key: "belt", legacyLabel: "BodyPart_Belt", wideLabel: "xBodyPart_Belt" },
      { key: "neck", legacyLabel: "BodyPart_Neck", wideLabel: "xBodyPart_Neck" },
      { key: "rightForearm", legacyLabel: "BodyPart_RFArm", wideLabel: "xBodyPart_RFArm" },
      { key: "leftForearm", legacyLabel: "BodyPart_LFArm", wideLabel: "xBodyPart_LFArm" },
      { key: "rightBicep", legacyLabel: "BodyPart_RBicep", wideLabel: "xBodyPart_RBicep" },
      { key: "leftBicep", legacyLabel: "BodyPart_LBicep", wideLabel: "xBodyPart_LBicep" },
      { key: "rightShoulder", legacyLabel: "BodyPart_RShoul", wideLabel: "xBodyPart_RShoul" },
      { key: "leftShoulder", legacyLabel: "BodyPart_LShoul", wideLabel: "xBodyPart_LShoul" },
      { key: "rightHand", legacyLabel: "BodyPart_RHand", wideLabel: "xBodyPart_RHand" },
      { key: "leftHand", legacyLabel: "BodyPart_LHand", wideLabel: "xBodyPart_LHand" },
      { key: "head", legacyLabel: "Appearance_Head", wideLabel: "xAppearance_Head" },
    ]);
  });

  it("admits absent, byte-only, word-only, and canonical paired storage", () => {
    expect(readAreaCreatureBodyPartStorage({ present: false })).toEqual({ present: false });
    const byteOnly = {
      present: true,
      value: 255,
      legacyByte: { present: true, nativeType: "byte", value: 255 },
      wideWord: { present: false },
    };
    const wordOnly = {
      present: true,
      value: 65535,
      legacyByte: { present: false },
      wideWord: { present: true, nativeType: "word", value: 65535 },
    };
    const paired = {
      present: true,
      value: 512,
      legacyByte: { present: true, nativeType: "byte", value: 0 },
      wideWord: { present: true, nativeType: "word", value: 512 },
    };
    expect(readAreaCreatureBodyPartStorage(byteOnly)).toEqual(byteOnly);
    expect(readAreaCreatureBodyPartStorage(wordOnly)).toEqual(wordOnly);
    expect(readAreaCreatureBodyPartStorage(paired)).toEqual(paired);
    expect(maximumAreaCreatureBodyPartTarget(byteOnly)).toBe(255);
    expect(maximumAreaCreatureBodyPartTarget(wordOnly)).toBe(65535);
    expect(maximumAreaCreatureBodyPartTarget(paired)).toBe(65535);
  });

  it("rejects non-canonical pairs and malformed compatibility members", () => {
    expect(readAreaCreatureBodyPartStorage({
      present: true,
      value: 7,
      legacyByte: { present: true, nativeType: "byte", value: 6 },
      wideWord: { present: true, nativeType: "word", value: 7 },
    })).toBeNull();
    expect(readAreaCreatureBodyPartStorage({
      present: true,
      value: 512,
      legacyByte: { present: true, nativeType: "byte", value: 255 },
      wideWord: { present: true, nativeType: "word", value: 512 },
    })).toBeNull();
    expect(readAreaCreatureBodyPartStorage({
      present: true,
      value: 1,
      legacyByte: { present: false },
      wideWord: { present: false },
    })).toBeNull();
    expect(readAreaCreatureBodyPartStorage({
      present: true,
      value: 1,
      legacyByte: { present: true, nativeType: "word", value: 1 },
      wideWord: { present: false },
    })).toBeNull();
  });

  it("requires the complete exact 19-member provenance group", () => {
    const group = Object.fromEntries(AREA_CREATURE_BODY_PART_FIELDS.map((field, index) => [
      field.key,
      index === 0
        ? { present: true, value: 1, legacyByte: { present: true, nativeType: "byte", value: 1 }, wideWord: { present: false } }
        : { present: false },
    ]));
    expect(readAreaCreatureBodyPartsStorage(group)).toEqual(group);
    expect(readAreaCreatureBodyPartsStorage({ ...group, head: undefined })).toBeNull();
    expect(readAreaCreatureBodyPartsStorage({ ...group, extra: { present: false } })).toBeNull();
  });

  it("accepts a non-empty changed word-bounded subset and rejects malformed pairs", () => {
    expect(readExistingAreaCreatureBodyPartMutations({
      head: { expectedValue: 1, value: 9 },
      torso: { expectedValue: 512, value: 65535 },
    })).toEqual({
      head: { expectedValue: 1, value: 9 },
      torso: { expectedValue: 512, value: 65535 },
    });
    expect(readExistingAreaCreatureBodyPartMutations({})).toBeNull();
    expect(readExistingAreaCreatureBodyPartMutations({
      head: { expectedValue: 1, value: 1 },
    })).toBeNull();
    expect(readExistingAreaCreatureBodyPartMutations({
      head: { expectedValue: 1, value: 65536 },
    })).toBeNull();
    expect(readExistingAreaCreatureBodyPartMutations({
      robe: { expectedValue: 1, value: 2 },
    })).toBeNull();
  });
});

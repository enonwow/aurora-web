import {
  CREATURE_BODY_PART_FIELDS,
  maximumCreatureBodyPartTarget,
  readCreatureBodyPartStorage,
  readCreatureBodyPartsStorage,
} from "../../../../../src/modules/scene/domain/creatureBodyParts";

describe("Creature body parts", () => {
  it("keeps the exact native compatibility field order", () => {
    expect(CREATURE_BODY_PART_FIELDS.map((field) => [
      field.key,
      field.legacyLabel,
      field.wideLabel,
    ])).toEqual([
      ["rightFoot", "ArmorPart_RFoot", "xArmorPart_RFoot"],
      ["leftFoot", "BodyPart_LFoot", "xBodyPart_LFoot"],
      ["rightShin", "BodyPart_RShin", "xBodyPart_RShin"],
      ["leftShin", "BodyPart_LShin", "xBodyPart_LShin"],
      ["leftThigh", "BodyPart_LThigh", "xBodyPart_LThigh"],
      ["rightThigh", "BodyPart_RThigh", "xBodyPart_RThigh"],
      ["pelvis", "BodyPart_Pelvis", "xBodyPart_Pelvis"],
      ["torso", "BodyPart_Torso", "xBodyPart_Torso"],
      ["belt", "BodyPart_Belt", "xBodyPart_Belt"],
      ["neck", "BodyPart_Neck", "xBodyPart_Neck"],
      ["rightForearm", "BodyPart_RFArm", "xBodyPart_RFArm"],
      ["leftForearm", "BodyPart_LFArm", "xBodyPart_LFArm"],
      ["rightBicep", "BodyPart_RBicep", "xBodyPart_RBicep"],
      ["leftBicep", "BodyPart_LBicep", "xBodyPart_LBicep"],
      ["rightShoulder", "BodyPart_RShoul", "xBodyPart_RShoul"],
      ["leftShoulder", "BodyPart_LShoul", "xBodyPart_LShoul"],
      ["rightHand", "BodyPart_RHand", "xBodyPart_RHand"],
      ["leftHand", "BodyPart_LHand", "xBodyPart_LHand"],
      ["head", "Appearance_Head", "xAppearance_Head"],
    ]);
  });

  it("accepts absent, byte-only, word-only, and canonical paired storage", () => {
    expect(readCreatureBodyPartStorage({ present: false })).toEqual({ present: false });
    const byteOnly = readCreatureBodyPartStorage({
      present: true,
      value: 12,
      legacyByte: { present: true, nativeType: "byte", value: 12 },
      wideWord: { present: false },
    });
    const wordOnly = readCreatureBodyPartStorage({
      present: true,
      value: 4096,
      legacyByte: { present: false },
      wideWord: { present: true, nativeType: "word", value: 4096 },
    });
    const paired = readCreatureBodyPartStorage({
      present: true,
      value: 511,
      legacyByte: { present: true, nativeType: "byte", value: 0 },
      wideWord: { present: true, nativeType: "word", value: 511 },
    });
    expect(byteOnly).not.toBeNull();
    expect(wordOnly).not.toBeNull();
    expect(paired).not.toBeNull();
    expect(maximumCreatureBodyPartTarget(byteOnly)).toBe(255);
    expect(maximumCreatureBodyPartTarget(wordOnly)).toBe(65535);
    expect(maximumCreatureBodyPartTarget(paired)).toBe(65535);
  });

  it("rejects noncanonical compatibility pairs and incomplete groups", () => {
    expect(readCreatureBodyPartStorage({
      present: true,
      value: 511,
      legacyByte: { present: true, nativeType: "byte", value: 1 },
      wideWord: { present: true, nativeType: "word", value: 511 },
    })).toBeNull();
    const incomplete = Object.fromEntries(
      CREATURE_BODY_PART_FIELDS.slice(1).map(({ key }) => [key, { present: false }]),
    );
    expect(readCreatureBodyPartsStorage(incomplete)).toBeNull();
  });
});

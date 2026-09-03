import {
  canEditExistingCreatureBodyPart,
  materializeExistingCreatureBodyParts,
  reduceExistingCreatureBodyPart,
} from "../../../../../src/modules/layout/application/creatureBodyPartProvenance";
import type {
  SceneObjectCreatureAppearanceSettings,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";
import { CREATURE_BODY_PART_FIELDS } from
  "../../../../../src/modules/scene/domain/creatureBodyParts";

const bodyParts = Object.fromEntries(
  CREATURE_BODY_PART_FIELDS.map(({ key }) => [key, { present: false }]),
) as Record<string, any>;
bodyParts.rightFoot = {
  present: true,
  value: 12,
  legacyByte: { present: true, nativeType: "byte", value: 12 },
  wideWord: { present: false },
};
bodyParts.torso = {
  present: true,
  value: 4096,
  legacyByte: { present: true, nativeType: "byte", value: 0 },
  wideWord: { present: true, nativeType: "word", value: 4096 },
};
bodyParts.rightShoulder = {
  present: true,
  value: 1023,
  legacyByte: { present: false },
  wideWord: { present: true, nativeType: "word", value: 1023 },
};

const source: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureBodyParts: bodyParts as never,
};

const current: SceneObjectCreatureAppearanceSettings = {
  partBasedAppearance: true,
  head: "", neck: "", torso: "4096", pelvis: "", rightBicep: "", leftBicep: "",
  rightForearm: "", leftForearm: "", rightHand: "", leftHand: "", rightThigh: "",
  leftThigh: "", rightShin: "", leftShin: "", rightFoot: "12", leftFoot: "",
  wings: "", tail: "",
  sourceOnlyParts: { belt: "", robe: "77", rightShoulder: "1023", leftShoulder: "" },
};

describe("existing Creature body-part provenance", () => {
  it("activates only exact present members and exposes their native capacity", () => {
    expect(canEditExistingCreatureBodyPart(source, "rightFoot")).toBe(true);
    expect(canEditExistingCreatureBodyPart(source, "torso")).toBe(true);
    expect(canEditExistingCreatureBodyPart(source, "leftFoot")).toBe(false);
  });

  it("reduces canonical targets within the retained byte/word capacity", () => {
    expect(reduceExistingCreatureBodyPart(source, "rightFoot", "12", "13")).toBe("13");
    expect(reduceExistingCreatureBodyPart(source, "rightFoot", "12", "256")).toBe("12");
    expect(reduceExistingCreatureBodyPart(source, "torso", "4096", "5000")).toBe("5000");
    expect(reduceExistingCreatureBodyPart(source, "torso", "4096", "05000")).toBe("4096");
    expect(reduceExistingCreatureBodyPart(source, "leftFoot", "", "7")).toBe("");
  });

  it("materializes only admitted retained members and preserves robe", () => {
    expect(materializeExistingCreatureBodyParts(source, current, {
      rightFoot: "13",
      leftFoot: "9",
      torso: "5000",
    }, {
      belt: "8",
      robe: "99",
      rightShoulder: "1024",
      leftShoulder: "7",
    })).toMatchObject({
      rightFoot: "13",
      leftFoot: "",
      torso: "5000",
      sourceOnlyParts: {
        belt: "",
        robe: "77",
        rightShoulder: "1024",
        leftShoulder: "",
      },
    });
  });
});

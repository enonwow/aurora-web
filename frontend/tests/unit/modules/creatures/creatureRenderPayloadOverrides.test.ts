import { describe, expect, it } from "vitest";
import { buildCreatureAppearanceProcessOverride } from "../../../../src/modules/creatures/application/creatureRenderPayloadOverrides";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

function createCreatureObject(): SceneObject {
  return {
    id: "cre_wizard_half_orc",
    kind: "creatures",
    name: "Proof Half-Orc Variant",
    resRef: "proof_horc_part",
    tag: "PROOF_HORC_PART",
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    creatureProperties: {
      firstName: "Proof",
      lastName: "Half-Orc",
      race: "Half-Orc",
      appearance: "18",
      phenotype: "Normal",
      gender: "Male",
      description: "",
      challengeRating: 1,
      portraitResRef: "",
      conversation: "",
      noInterrupt: false,
      appearanceSettings: {
        partBasedAppearance: true,
        head: "12",
        neck: "1",
        torso: "2",
        pelvis: "1",
        rightBicep: "3",
        leftBicep: "4",
        rightForearm: "5",
        leftForearm: "6",
        rightHand: "7",
        leftHand: "8",
        rightThigh: "9",
        leftThigh: "10",
        rightShin: "11",
        leftShin: "12",
        rightFoot: "13",
        leftFoot: "14",
        wings: "0",
        tail: "0",
        colors: {
          skin: "30",
          hair: "53",
          tattoo1: "1",
          tattoo2: "2"
        },
        sourceOnlyParts: {
          belt: "15",
          robe: "16",
          rightShoulder: "17",
          leftShoulder: "18"
        }
      }
    }
  };
}

describe("creatureRenderPayloadOverrides", () => {
  it("maps wizard appearance settings into creature process overrides", () => {
    expect(buildCreatureAppearanceProcessOverride(createCreatureObject())).toEqual({
      appearanceType: 18,
      appearanceHead: 12,
      wingsNew: 0,
      tailNew: 0,
      bodyParts: {
        rFoot: 13,
        lFoot: 14,
        rShin: 11,
        lShin: 12,
        lThigh: 10,
        rThigh: 9,
        pelvis: 1,
        torso: 2,
        belt: 15,
        neck: 1,
        rFArm: 5,
        lFArm: 6,
        rBicep: 3,
        lBicep: 4,
        rShoul: 17,
        lShoul: 18,
        rHand: 7,
        lHand: 8,
        robe: 16
      },
      colors: {
        skin: 30,
        hair: 53,
        tattoo1: 1,
        tattoo2: 2
      }
    });
  });

  it("does not build overrides for non part-based creature appearances", () => {
    const object = createCreatureObject();
    object.creatureProperties!.appearanceSettings!.partBasedAppearance = false;

    expect(buildCreatureAppearanceProcessOverride(object)).toBeUndefined();
  });
});

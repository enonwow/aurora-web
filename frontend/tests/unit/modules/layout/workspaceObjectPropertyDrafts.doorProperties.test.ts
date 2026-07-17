import { describe, expect, it } from "vitest";
import { buildDoorPropertiesDraft } from "../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("buildDoorPropertiesDraft", () => {
  it("surfaces raw Aurora LinkedToFlags in the transition summary without decoding bits", () => {
    const door = createNewSceneObject("doors", 1, 2, 42);
    const draft = buildDoorPropertiesDraft({
      ...door,
      doorTransition: {
        linkedTarget: "area_market_south",
        linkedModule: "the_last_city",
        linkedTag: "south_gate",
        linkedWaypoint: "",
        loadScreen: "42",
        flags: {
          oneShot: true
        },
        extra: {
          linkedToFlags: 3,
          loadScreenId: 42
        }
      }
    });

    expect(draft.transitionFlags).toEqual({ oneShot: true });
    expect(draft.flagsSummary).toBe("linkedToFlags=3, oneShot=1");
  });
});

import { describe, expect, it } from "vitest";
import {
  areDoorPropertiesDraftsEqual,
  buildDoorPropertiesDraft,
} from "../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
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
    expect(draft.transitionStorageEditable).toBe(false);
  });

  it("surfaces the exact native Door transition trio without trimming or decoding it", () => {
    const door = createNewSceneObject("doors", 1, 2, 42);
    const sourceStorage = { linkedTo: " SOURCE DEST ", linkedToFlags: 1, loadScreenId: 0 };
    const targetStorage = { linkedTo: " TARGET DEST ", linkedToFlags: 2, loadScreenId: 7 };
    const draft = buildDoorPropertiesDraft({
      ...door,
      source: {
        type: "aurora_git",
        sourceKind: "door",
        sourceIndex: 0,
        sourceObjectId: "obj_door_0",
        doorTransitionStorage: sourceStorage,
      },
      doorTransition: {
        linkedTarget: "legacy",
        linkedModule: "",
        linkedTag: "",
        linkedWaypoint: "",
        loadScreen: "",
        flags: {},
        storage: targetStorage,
      },
    });

    expect(draft).toMatchObject({
      transitionStorageEditable: true,
      linkedTo: " TARGET DEST ",
      linkedToFlags: 2,
      loadScreenId: 7,
    });
  });

  it("includes every exact storage member in Door draft equality", () => {
    const baseline = buildDoorPropertiesDraft(createNewSceneObject("doors", 1, 2, 42));

    expect(areDoorPropertiesDraftsEqual(baseline, {
      ...baseline,
      linkedToFlags: baseline.linkedToFlags + 1,
    })).toBe(false);
    expect(areDoorPropertiesDraftsEqual(baseline, {
      ...baseline,
      loadScreenId: baseline.loadScreenId + 1,
    })).toBe(false);
    expect(areDoorPropertiesDraftsEqual(baseline, {
      ...baseline,
      linkedTo: `${baseline.linkedTo} `,
    })).toBe(false);
  });
});

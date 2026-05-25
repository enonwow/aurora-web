import { describe, expect, it } from "vitest";
import {
  createNewSceneObject,
  normalizeSceneObjectMetadata
} from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneFactory door transition preserve-only normalization", () => {
  it("normalizes door transition payload defensively for door objects only", () => {
    const door = createNewSceneObject("doors", 1.2, 0.6, 41);
    const normalized = normalizeSceneObjectMetadata({
      ...door,
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: true
      },
      soundPositioning: {
        mode: "random",
        elevation: 1,
        maxVolumeDistance: 2,
        cutoffDistance: 3,
        randomRangeWestEast: 4,
        randomRangeNorthSouth: 5
      },
      doorTransition: {
        linkedTarget: "AREA_FOREST_01",
        linkedModule: 123,
        linkedTag: null,
        linkedWaypoint: "WP_ENTRY_A",
        loadScreen: false,
        flags: {
          oneShot: true,
          unknown: "invalid",
          noReentry: false
        }
      } as unknown as NonNullable<typeof door.doorTransition>
    });

    expect(normalized.placeableProperties).toBeUndefined();
    expect(normalized.soundPositioning).toBeUndefined();
    expect(normalized.doorTransition).toEqual({
      linkedTarget: "AREA_FOREST_01",
      linkedModule: "",
      linkedTag: "",
      linkedWaypoint: "WP_ENTRY_A",
      loadScreen: "",
      flags: {
        oneShot: true,
        noReentry: false
      }
    });
  });

  it("keeps non-door objects untouched", () => {
    const creature = createNewSceneObject("creatures", 0.8, 1.3, 99);
    const enriched = {
      ...creature,
      doorTransition: {
        linkedTarget: "AREA_X",
        linkedModule: "mod_alpha",
        linkedTag: "door_tag_01",
        linkedWaypoint: "wp_spawn",
        loadScreen: "ls_forest",
        flags: {
          preserve: true
        }
      }
    };

    const normalized = normalizeSceneObjectMetadata(enriched);

    expect(normalized).toBe(enriched);
    expect(normalized.doorTransition).toEqual(enriched.doorTransition);
  });

  it("is stable across normalization roundtrip for door transition payload", () => {
    const door = createNewSceneObject("doors", 1.7, 1.9, 17);
    const noisy = {
      ...door,
      doorTransition: {
        linkedTarget: "AREA_CITY_02",
        linkedModule: "mod_city",
        linkedTag: "door_city_east",
        linkedWaypoint: 77,
        loadScreen: "ls_city",
        flags: {
          cinematic: true,
          skipFade: "nope"
        }
      } as unknown as NonNullable<typeof door.doorTransition>
    };

    const first = normalizeSceneObjectMetadata(noisy);
    const second = normalizeSceneObjectMetadata(first);

    expect(first.doorTransition).toEqual({
      linkedTarget: "AREA_CITY_02",
      linkedModule: "mod_city",
      linkedTag: "door_city_east",
      linkedWaypoint: "",
      loadScreen: "ls_city",
      flags: {
        cinematic: true
      }
    });
    expect(second).toBe(first);
  });
});


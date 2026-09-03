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
    expect(normalized.doorProperties).toEqual({
      plot: false,
      hardness: 5,
      hitPoints: 80,
      fortitudeSave: 16,
      reflexSave: 0,
      willSave: 0,
      appearanceType: "Use Generic Appearance",
      genericAppearance: "Wooden Door (Strong)"
    });
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

  it("strips door-only payload from non-door objects without mutating creature metadata", () => {
    const creature = createNewSceneObject("creatures", 0.8, 1.3, 99);
    const enriched = {
      ...creature,
      doorProperties: {
        plot: true,
        hardness: 12,
        hitPoints: 45,
        fortitudeSave: 7,
        reflexSave: 3,
        willSave: 2,
        appearanceType: "Use Generic Appearance",
        genericAppearance: "Wooden Door (Strong)"
      },
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

    expect(normalized).not.toBe(enriched);
    expect(normalized.id).toBe(creature.id);
    expect(normalized.kind).toBe("creatures");
    expect(normalized.name).toBe(creature.name);
    expect(normalized.creatureProperties).toEqual(creature.creatureProperties);
    expect(normalized.doorProperties).toBeUndefined();
    expect(normalized.doorTransition).toBeUndefined();
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

    expect(first.doorProperties).toEqual({
      plot: false,
      hardness: 5,
      hitPoints: 80,
      fortitudeSave: 16,
      reflexSave: 0,
      willSave: 0,
      appearanceType: "Use Generic Appearance",
      genericAppearance: "Wooden Door (Strong)"
    });
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

  it("preserves one complete exact Door transition storage trio across normalization", () => {
    const door = createNewSceneObject("doors", 1.7, 1.9, 17);
    const storage = { linkedTo: " DESTINATION ", linkedToFlags: 2, loadScreenId: 7 };
    const first = normalizeSceneObjectMetadata({
      ...door,
      doorTransition: {
        linkedTarget: "legacy",
        linkedModule: "",
        linkedTag: "",
        linkedWaypoint: "",
        loadScreen: "",
        flags: {},
        storage,
      },
    });

    expect(first.doorTransition?.storage).toEqual(storage);
    expect(first.doorTransition?.storage).not.toBe(storage);
    expect(normalizeSceneObjectMetadata(first)).toBe(first);
  });

  it("strips malformed Door transition storage without changing neighboring preserve-only fields", () => {
    const door = createNewSceneObject("doors", 1.7, 1.9, 17);
    const normalized = normalizeSceneObjectMetadata({
      ...door,
      doorTransition: {
        linkedTarget: "legacy",
        linkedModule: "module",
        linkedTag: "tag",
        linkedWaypoint: "waypoint",
        loadScreen: "screen",
        flags: { legacy: true },
        storage: { linkedTo: "DESTINATION", linkedToFlags: 2 } as never,
      },
    });

    expect(normalized.doorTransition).toEqual({
      linkedTarget: "legacy",
      linkedModule: "module",
      linkedTag: "tag",
      linkedWaypoint: "waypoint",
      loadScreen: "screen",
      flags: { legacy: true },
    });
  });

  it("normalizes door properties payload defensively and preserves nested door tabs", () => {
    const door = createNewSceneObject("doors", 0.4, 0.9, 55);
    const normalized = normalizeSceneObjectMetadata({
      ...door,
      doorProperties: {
        plot: true,
        hardness: "bad",
        hitPoints: 120,
        fortitudeSave: 18,
        reflexSave: "bad",
        willSave: 3,
        appearanceType: 77,
        genericAppearance: "Stone Door (Strong)",
        lockSettings: {
          locked: true,
          canRelock: true,
          autoRemoveKeyAfterUse: "bad",
          keyRequiredToUnlockOrLock: true,
          openLockDc: 21,
          closeLockDc: "bad",
          keyTag: 11
        },
        trapSettings: {
          isTrapped: true,
          trapType: "Spike Trap, Minor",
          detectionDc: 14,
          disarmDc: "bad",
          oneShot: false,
          detectable: true,
          disarmable: true,
          onDisarmScript: "door_disarm",
          onTrapTriggeredScript: 19,
          setDc: 7,
          detectDcModWhenSetByRogue: 12,
          disarmDcModWhenSetByRogue: "bad"
        },
        scriptSlots: {
          onAreaTransitionClick: "door_on_click",
          onClose: "",
          onDamaged: "",
          onDeath: "door_death",
          onFailToOpen: "",
          onHeartbeat: "",
          onLock: "",
          onPhysicalAttacked: "",
          onOpen: "door_open",
          onSpellCastAt: "",
          onUnlock: "",
          onUserDefined: 123
        },
        advancedSettings: {
          blueprintResRef: "nw_door_ttr_11",
          belongsToFaction: "Hostile",
          conversation: 42,
          noInterrupt: true,
          portraitResRef: "po_door_001",
          initialState: "Closed"
        },
        description: 12,
        comments: "door comments"
      } as unknown as NonNullable<typeof door.doorProperties>
    });

    expect(normalized.doorProperties).toEqual({
      plot: true,
      hardness: 5,
      hitPoints: 120,
      fortitudeSave: 18,
      reflexSave: 0,
      willSave: 3,
      appearanceType: "Use Generic Appearance",
      genericAppearance: "Stone Door (Strong)",
      lockSettings: {
        locked: true,
        canRelock: true,
        autoRemoveKeyAfterUse: false,
        keyRequiredToUnlockOrLock: true,
        openLockDc: 21,
        closeLockDc: 0,
        keyTag: ""
      },
      trapSettings: {
        isTrapped: true,
        trapType: "Spike Trap, Minor",
        detectionDc: 14,
        disarmDc: 15,
        oneShot: false,
        detectable: true,
        disarmable: true,
        onDisarmScript: "door_disarm",
        onTrapTriggeredScript: "",
        setDc: 7,
        detectDcModWhenSetByRogue: 12,
        disarmDcModWhenSetByRogue: 22
      },
      scriptSlots: {
        onAreaTransitionClick: "door_on_click",
        onClose: "",
        onDamaged: "",
        onDeath: "door_death",
        onFailToOpen: "",
        onHeartbeat: "",
        onLock: "",
        onPhysicalAttacked: "",
        onOpen: "door_open",
        onSpellCastAt: "",
        onUnlock: "",
        onUserDefined: ""
      },
      advancedSettings: {
        blueprintResRef: "nw_door_ttr_11",
        belongsToFaction: "Hostile",
        conversation: "",
        noInterrupt: true,
        portraitResRef: "po_door_001",
        initialState: "Closed"
      },
      description: "",
      comments: "door comments"
    });

    const roundtrip = normalizeSceneObjectMetadata(normalized);
    expect(roundtrip).toBe(normalized);
  });
});

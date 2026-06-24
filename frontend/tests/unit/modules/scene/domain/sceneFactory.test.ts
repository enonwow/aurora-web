import { describe, expect, it } from "vitest";
import {
  createBlankAreaScene,
  createNewSceneObject,
  createSeedAreaScene,
  normalizeSceneObjectMetadata,
  rescaleSceneObjectsToSize
} from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneFactory placeable preserve-only normalization", () => {
  it("creates a blank startup area without demo objects", () => {
    const scene = createBlankAreaScene(2, 2, 1700000000000);

    expect(scene.sceneId).toBe("blank_builder_v1");
    expect(scene.areaName).toBe("Untitled Area");
    expect(scene.width).toBe(2);
    expect(scene.height).toBe(2);
    expect(scene.tiles).toHaveLength(4);
    expect(scene.objects).toEqual([]);
    expect(scene.tileSource?.fallbackReason).toBe("blank-startup-scene");
    expect(scene.updatedAtUnixMs).toBe(1700000000000);
  });

  it("normalizes preserve-only script slots and disabled flags defensively", () => {
    const placeable = createNewSceneObject("placeables", 1, 1, 77);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        plot: true,
        useable: false,
        hasInventory: true,
        scriptSlots: {
          onOpen: "plc_on_open",
          onDeath: 42
        } as unknown as NonNullable<typeof placeable.placeableProperties>["scriptSlots"],
        disabledFlags: {
          plot: false,
          useable: "invalid",
          hasInventory: true
        } as unknown as NonNullable<typeof placeable.placeableProperties>["disabledFlags"]
      }
    });

    expect(normalized.placeableProperties).toEqual({
      plot: true,
      useable: false,
      hasInventory: true,
      scriptSlots: {
        onClick: "",
        onClosed: "",
        onDamaged: "",
        onDeath: "",
        onHeartbeat: "",
        onInvDisturbed: "",
        onLock: "",
        onMeleeAttacked: "",
        onOpen: "plc_on_open",
        onSpellCastAt: "",
        onUnlock: "",
        onUsed: "",
        onUserDefined: ""
      },
      disabledFlags: {
        plot: false,
        useable: true,
        hasInventory: true
      }
    });
  });

  it("keeps legacy placeable payload behavior unchanged for plot/useable/hasInventory", () => {
    const placeable = createNewSceneObject("placeables", 1.4, 0.7, 12);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: false
      }
    });

    expect(normalized.placeableProperties).toEqual({
      plot: true,
      useable: true,
      hasInventory: false
    });
    expect(normalized.placeableProperties?.scriptSlots).toBeUndefined();
    expect(normalized.placeableProperties?.disabledFlags).toBeUndefined();
  });

  it("preserves preserve-only fields across scene rescale roundtrip", () => {
    const scene = createSeedAreaScene(18, 18);
    const customized = scene.objects.map((object) => {
      if (object.id !== "plc_barrel_01") {
        return object;
      }
      return {
        ...object,
        placeableProperties: {
          plot: true,
          useable: false,
          hasInventory: true,
          scriptSlots: {
            onClick: "plc_click",
            onClosed: "",
            onDamaged: "",
            onDeath: "",
            onHeartbeat: "",
            onInvDisturbed: "",
            onLock: "plc_lock",
            onMeleeAttacked: "",
            onOpen: "",
            onSpellCastAt: "",
            onUnlock: "",
            onUsed: "plc_use",
            onUserDefined: ""
          },
          disabledFlags: {
            plot: true,
            useable: true,
            hasInventory: false
          }
        }
      };
    });

    const scaled = rescaleSceneObjectsToSize(customized, 18, 18, 2, 2);
    const placeable = scaled.find((object) => object.id === "plc_barrel_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: true,
      useable: false,
      hasInventory: true,
      scriptSlots: {
        onClick: "plc_click",
        onClosed: "",
        onDamaged: "",
        onDeath: "",
        onHeartbeat: "",
        onInvDisturbed: "",
        onLock: "plc_lock",
        onMeleeAttacked: "",
        onOpen: "",
        onSpellCastAt: "",
        onUnlock: "",
        onUsed: "plc_use",
        onUserDefined: ""
      },
      disabledFlags: {
        plot: true,
        useable: true,
        hasInventory: false
      }
    });
  });

  it("normalizes optional vfx preserve-only payload defensively", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 88);
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      vfxPayload: {
        profile: "vfx_magic_a",
        emitter: 777,
        script: "fx_heartbeat",
        sourceKind: "placeable_preview",
        sourceProfile: "catalog-placeable-vfx",
        sourceTable: "placeable-template-catalog",
        sourceRowId: 286,
        sourceLabel: "Screen Shake",
        sourceResRef: "vfx_screen_shake",
        previewMode: "derived_model_preview",
        canonicalStatus: "preview_only",
        diagnostics: [
          {
            code: "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY",
            severity: "warn",
            message: "preview only"
          },
          {
            code: "",
            severity: "bad",
            message: 12
          }
        ],
        flags: {
          billboard: true,
          castShadow: "bad"
        },
        extra: {
          intensity: 0.7,
          group: "ambient",
          enabled: true,
          nullable: null,
          nested: { invalid: true }
        }
      } as unknown as NonNullable<typeof creature.vfxPayload>
    });

    expect(normalized.vfxPayload).toEqual({
      version: "scene-object-vfx-preserve/v1",
      profile: "vfx_magic_a",
      emitter: "",
      script: "fx_heartbeat",
      sourceKind: "placeable_preview",
      sourceProfile: "catalog-placeable-vfx",
      sourceTable: "placeable-template-catalog",
      sourceRowId: 286,
      sourceLabel: "Screen Shake",
      sourceResRef: "vfx_screen_shake",
      previewMode: "derived_model_preview",
      canonicalStatus: "preview_only",
      diagnostics: [
        {
          code: "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY",
          severity: "warn",
          message: "preview only"
        }
      ],
      flags: {
        billboard: true
      },
      extra: {
        intensity: 0.7,
        group: "ambient",
        enabled: true,
        nullable: null
      }
    });

    const roundtrip = normalizeSceneObjectMetadata(normalized);
    expect(roundtrip).toBe(normalized);
  });

  it("normalizes creature properties defensively and strips non-creature payloads", () => {
    const creature = createNewSceneObject("creatures", 2.2, 1.1, 88);
    const normalized = normalizeSceneObjectMetadata({
      ...creature,
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: true
      },
      soundPositioning: {
        mode: "specific"
      } as unknown as NonNullable<typeof creature.soundPositioning>,
      doorTransition: {
        linkedTarget: "door_a"
      } as unknown as NonNullable<typeof creature.doorTransition>,
      creatureProperties: {
        firstName: "Battle Devourer",
        lastName: 11,
        race: "Aberration",
        appearance: "nw_battdevour",
        challengeRating: -4,
        statistics: {
          abilityScores: {
            strength: 15,
            dexterity: "bad"
          },
          movementRate: 77
        },
        classEntries: [{ className: "Aberration", level: 9 }, { className: 42, level: -3 }],
        scriptSlots: {
          onHeartbeat: "nw_crt_hb",
          onBlocked: 123
        },
        advancedSettings: {
          corpseDecayTimeSeconds: -10,
          plot: true
        }
      } as unknown as NonNullable<typeof creature.creatureProperties>
    });

    expect(normalized.placeableProperties).toBeUndefined();
    expect(normalized.soundPositioning).toBeUndefined();
    expect(normalized.doorTransition).toBeUndefined();
    expect(normalized.creatureProperties?.firstName).toBe("Battle Devourer");
    expect(normalized.creatureProperties?.lastName).toBe("");
    expect(normalized.creatureProperties?.challengeRating).toBe(0);
    expect(normalized.creatureProperties?.statistics?.abilityScores.strength).toBe(15);
    expect(normalized.creatureProperties?.statistics?.abilityScores.dexterity).toBe(10);
    expect(normalized.creatureProperties?.statistics?.movementRate).toBe("Default");
    expect(normalized.creatureProperties?.classEntries).toEqual([
      { className: "Aberration", level: 9 },
      { className: "Class", level: 1 }
    ]);
    expect(normalized.creatureProperties?.scriptSlots?.onHeartbeat).toBe("nw_crt_hb");
    expect(normalized.creatureProperties?.scriptSlots?.onBlocked).toBe("");
    expect(normalized.creatureProperties?.advancedSettings?.corpseDecayTimeSeconds).toBe(0);
    expect(normalized.creatureProperties?.advancedSettings?.plot).toBe(true);
  });

  it("removes creature payload from non-creature kinds", () => {
    const placeable = createNewSceneObject("placeables", 1.4, 0.7, 12);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      creatureProperties: {
        firstName: "Wrong Payload"
      } as unknown as NonNullable<typeof placeable.creatureProperties>
    });

    expect(normalized.kind).toBe("placeables");
    expect(normalized.creatureProperties).toBeUndefined();
    expect(normalized.placeableProperties).toBeDefined();
  });

  it("normalizes placeable lock/trap/advanced/description/comments payload defensively", () => {
    const placeable = createNewSceneObject("placeables", 1, 1, 77);
    const normalized = normalizeSceneObjectMetadata({
      ...placeable,
      placeableProperties: {
        plot: false,
        useable: true,
        hasInventory: false,
        lockSettings: {
          locked: true,
          canRelock: true,
          autoRemoveKeyAfterUse: "bad",
          keyRequiredToUnlockOrLock: true,
          openLockDc: 21,
          closeLockDc: "bad",
          keyTag: 55
        } as unknown as NonNullable<typeof placeable.placeableProperties>["lockSettings"],
        trapSettings: {
          isTrapped: true,
          trapType: "Spike Trap, Minor",
          detectionDc: 17,
          disarmDc: "bad",
          oneShot: false,
          detectable: true,
          disarmable: true,
          onDisarmScript: "trap_disarm",
          onTrapTriggeredScript: 42,
          setDc: 9,
          detectDcModWhenSetByRogue: 12,
          disarmDcModWhenSetByRogue: "bad"
        } as unknown as NonNullable<typeof placeable.placeableProperties>["trapSettings"],
        advancedSettings: {
          blueprintResRef: "plc_test_a",
          belongsToFaction: "Hostile",
          conversation: 77,
          noInterrupt: true,
          portraitResRef: "po_test_a",
          initialState: "Default",
          treasureModel: null
        } as unknown as NonNullable<typeof placeable.placeableProperties>["advancedSettings"],
        description: 123,
        comments: "hello"
      } as unknown as NonNullable<typeof placeable.placeableProperties>
    });

    expect(normalized.placeableProperties).toEqual({
      plot: false,
      useable: true,
      hasInventory: false,
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
        detectionDc: 17,
        disarmDc: 15,
        oneShot: false,
        detectable: true,
        disarmable: true,
        onDisarmScript: "trap_disarm",
        onTrapTriggeredScript: "",
        setDc: 9,
        detectDcModWhenSetByRogue: 12,
        disarmDcModWhenSetByRogue: 22
      },
      advancedSettings: {
        blueprintResRef: "plc_test_a",
        belongsToFaction: "Hostile",
        conversation: "",
        noInterrupt: true,
        portraitResRef: "po_test_a",
        initialState: "Default",
        treasureModel: "Default"
      },
      description: "",
      comments: "hello"
    });
  });
});

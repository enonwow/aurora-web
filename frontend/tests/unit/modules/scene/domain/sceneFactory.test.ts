import { describe, expect, it } from "vitest";
import {
  createNewSceneObject,
  createSeedAreaScene,
  normalizeSceneObjectMetadata,
  rescaleSceneObjectsToSize
} from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneFactory placeable preserve-only normalization", () => {
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
      profile: "vfx_magic_a",
      emitter: "",
      script: "fx_heartbeat",
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
});

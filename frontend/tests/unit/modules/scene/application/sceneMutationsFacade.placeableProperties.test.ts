import { describe, expect, it } from "vitest";
import { createSceneMutationsFacade } from "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade placeable preserve-only roundtrip", () => {
  it("keeps preserve-only placeable properties while updating editable basics", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects.find((object) => object.kind === "placeables");
    expect(target).toBeDefined();

    const sceneWithPreserveOnly = {
      ...scene,
      objects: scene.objects.map((object) =>
        object.id === target!.id
          ? {
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
                  onLock: "",
                  onMeleeAttacked: "",
                  onOpen: "plc_open",
                  onSpellCastAt: "",
                  onUnlock: "",
                  onUsed: "",
                  onUserDefined: "plc_ud"
                },
                disabledFlags: {
                  plot: true,
                  useable: true,
                  hasInventory: false
                },
                lockSettings: {
                  locked: true,
                  canRelock: false,
                  autoRemoveKeyAfterUse: false,
                  keyRequiredToUnlockOrLock: true,
                  openLockDc: 19,
                  closeLockDc: 4,
                  keyTag: "KEY_MAIN"
                },
                trapSettings: {
                  isTrapped: true,
                  trapType: "Spike Trap, Minor",
                  detectionDc: 12,
                  disarmDc: 17,
                  oneShot: true,
                  detectable: true,
                  disarmable: true,
                  onDisarmScript: "on_disarm",
                  onTrapTriggeredScript: "on_trigger",
                  setDc: 9,
                  detectDcModWhenSetByRogue: 10,
                  disarmDcModWhenSetByRogue: 22
                },
                advancedSettings: {
                  blueprintResRef: "plc_seed",
                  belongsToFaction: "Hostile",
                  conversation: "conv_main",
                  noInterrupt: false,
                  portraitResRef: "po_seed",
                  initialState: "Default",
                  treasureModel: "Default"
                },
                description: "desc",
                comments: "comment"
              }
            }
          : object
      )
    };

    const nextScene = facade.setPlaceablePropertiesByIds(sceneWithPreserveOnly, [target!.id], {
      name: "Edited Placeable",
      tag: "PLC_EDITED_01",
      resRef: "plc_edited_01",
      isStatic: false
    });

    const changed = nextScene.objects.find((object) => object.id === target!.id);
    expect(changed).toBeDefined();
    expect(changed?.name).toBe("Edited Placeable");
    expect(changed?.tag).toBe("PLC_EDITED_01");
    expect(changed?.resRef).toBe("plc_edited_01");
    expect(changed?.isStatic).toBe(false);
    expect(changed?.placeableProperties).toEqual({
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
        onLock: "",
        onMeleeAttacked: "",
        onOpen: "plc_open",
        onSpellCastAt: "",
        onUnlock: "",
        onUsed: "",
        onUserDefined: "plc_ud"
      },
      disabledFlags: {
        plot: true,
        useable: true,
        hasInventory: false
      },
      lockSettings: {
        locked: true,
        canRelock: false,
        autoRemoveKeyAfterUse: false,
        keyRequiredToUnlockOrLock: true,
        openLockDc: 19,
        closeLockDc: 4,
        keyTag: "KEY_MAIN"
      },
      trapSettings: {
        isTrapped: true,
        trapType: "Spike Trap, Minor",
        detectionDc: 12,
        disarmDc: 17,
        oneShot: true,
        detectable: true,
        disarmable: true,
        onDisarmScript: "on_disarm",
        onTrapTriggeredScript: "on_trigger",
        setDc: 9,
        detectDcModWhenSetByRogue: 10,
        disarmDcModWhenSetByRogue: 22
      },
      advancedSettings: {
        blueprintResRef: "plc_seed",
        belongsToFaction: "Hostile",
        conversation: "conv_main",
        noInterrupt: false,
        portraitResRef: "po_seed",
        initialState: "Default",
        treasureModel: "Default"
      },
      description: "desc",
      comments: "comment"
    });
  });
});

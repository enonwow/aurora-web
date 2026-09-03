import { describe, expect, it } from "vitest";

import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";
import {
  CREATURE_DECAY_MAX_MILLISECONDS,
  CREATURE_DECAY_MAX_SECONDS,
  CREATURE_DECAY_MIN_MILLISECONDS,
  CREATURE_DECAY_MIN_SECONDS,
  canEditExistingCreatureBodyBag,
  canEditExistingCreatureDecayTime,
  creatureDecayMillisecondsToSeconds,
  creatureDecaySecondsToMilliseconds,
  readCreatureBodyBagBinding,
  readCreatureBodyBagStorage,
  readCreatureDecayTimeBinding,
  readCreatureDecayTimeStorage,
} from "../../../../../src/modules/scene/domain/creatureDeathRemains";
import { readPlaceableBodyBagCatalog } from "../../../../../src/modules/scene/domain/placeableBodyBag";

function catalog() {
  return readPlaceableBodyBagCatalog({
    descriptor: {
      resourceName: "bodybag.2da",
      sourceObjectKey: "aurora/base/bodybag.2da",
      sourceLayer: "vanilla",
      sha256: "e".repeat(64),
      sizeBytes: 502,
      rowCount: 3,
    },
    rows: [
      { rowIndex: 0, label: "Default", nameStrRef: 1, displayName: "Default", displaySource: "label" },
      { rowIndex: 1, label: "Bag", nameStrRef: 2, displayName: "Bag", displaySource: "label" },
      { rowIndex: 2, label: "Pile", nameStrRef: 3, displayName: "Pile", displaySource: "label" },
    ],
  })!;
}

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 4,
    creatureAdvancedFlags: {
      disarmable: { present: true, value: 0 },
      plot: { present: true, value: 0 },
      immortal: { present: true, value: 0 },
      lootable: { present: true, value: 1 },
      noPermanentDeath: { present: true, value: 0 },
    },
    creatureBodyBag: {
      expectedValue: 2,
      tableSha256: "e".repeat(64),
      tableRowCount: 3,
    },
    creatureDecayTime: { expectedMilliseconds: 12_000 },
  };
}

describe("Creature death-remains domain", () => {
  it("retains exact native storage while authoring only Aurora's canonical decay range", () => {
    expect(readCreatureBodyBagStorage({ present: false })).toEqual({ present: false });
    expect(readCreatureBodyBagStorage({ present: true, nativeType: "byte", value: 2 }))
      .toEqual({ present: true, nativeType: "byte", value: 2 });
    expect(readCreatureDecayTimeStorage({
      present: true,
      nativeType: "dword",
      valueMilliseconds: 4_999,
    })).toEqual({ present: true, nativeType: "dword", valueMilliseconds: 4_999 });

    expect(CREATURE_DECAY_MIN_SECONDS).toBe(5);
    expect(CREATURE_DECAY_MAX_SECONDS).toBe(32_767);
    expect(CREATURE_DECAY_MIN_MILLISECONDS).toBe(5_000);
    expect(CREATURE_DECAY_MAX_MILLISECONDS).toBe(32_767_000);
    expect(creatureDecayMillisecondsToSeconds(12_000)).toBe(12);
    expect(creatureDecaySecondsToMilliseconds(12)).toBe(12_000);
    expect(creatureDecayMillisecondsToSeconds(12_001)).toBeUndefined();
    expect(creatureDecaySecondsToMilliseconds(4)).toBeUndefined();
  });

  it("binds BodyBag to the effective catalog and canonical DecayTime independently", () => {
    const admittedCatalog = catalog();
    expect(readCreatureBodyBagBinding(
      { present: true, nativeType: "byte", value: 2 },
      admittedCatalog,
    )).toEqual({
      expectedValue: 2,
      tableSha256: "e".repeat(64),
      tableRowCount: 3,
    });
    expect(readCreatureDecayTimeBinding({
      present: true,
      nativeType: "dword",
      valueMilliseconds: 12_000,
    })).toEqual({ expectedMilliseconds: 12_000 });

    expect(readCreatureBodyBagBinding({ present: false }, admittedCatalog)).toBeNull();
    expect(readCreatureBodyBagBinding(
      { present: true, nativeType: "byte", value: 3 },
      admittedCatalog,
    )).toBeNull();
    expect(readCreatureDecayTimeBinding({
      present: true,
      nativeType: "dword",
      valueMilliseconds: 12_001,
    })).toBeNull();
    expect(readCreatureDecayTimeBinding({ present: false })).toBeNull();
  });

  it("activates each control only with exact Creature provenance and proven current Lootable", () => {
    const source = exactSource();
    expect(canEditExistingCreatureBodyBag(source, catalog(), true)).toBe(true);
    expect(canEditExistingCreatureDecayTime(source, true)).toBe(true);
    expect(canEditExistingCreatureBodyBag(source, catalog(), false)).toBe(false);
    expect(canEditExistingCreatureDecayTime(source, false)).toBe(false);

    expect(canEditExistingCreatureBodyBag({
      ...source,
      creatureBodyBag: { ...source.creatureBodyBag!, tableSha256: "f".repeat(64) },
    }, catalog(), true)).toBe(false);
    expect(canEditExistingCreatureDecayTime({
      ...source,
      creatureDecayTime: { expectedMilliseconds: 12_001 },
    }, true)).toBe(false);
    expect(canEditExistingCreatureDecayTime({
      ...source,
      creatureAdvancedFlags: {
        ...source.creatureAdvancedFlags!,
        lootable: { present: false },
      },
    }, true)).toBe(false);
    expect(canEditExistingCreatureBodyBag({ ...source, sourceKind: "placeable" }, catalog(), true))
      .toBe(false);
  });

  it("rejects aliases, wrong native types, extra keys, and unsafe numeric values", () => {
    expect(readCreatureBodyBagStorage({ present: true, nativeType: "word", value: 2 }))
      .toBeNull();
    expect(readCreatureBodyBagStorage({ present: true, nativeType: "byte", value: 256 }))
      .toBeNull();
    expect(readCreatureBodyBagStorage({ present: false, value: 0 })).toBeNull();
    expect(readCreatureDecayTimeStorage({
      present: true,
      nativeType: "dword",
      valueMilliseconds: 1,
      alias: true,
    })).toBeNull();
    expect(readCreatureDecayTimeStorage({
      present: true,
      nativeType: "dword",
      valueMilliseconds: 0x1_0000_0000,
    })).toBeNull();
  });
});

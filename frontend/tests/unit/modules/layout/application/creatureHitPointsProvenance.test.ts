import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureHitPoints,
  materializeExistingCreatureHitPointDraft,
  readExistingCreatureHitPointState,
  reduceExistingCreatureHitPointDraft,
} from "../../../../../src/modules/layout/application/creatureHitPointsProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureHitPointState: {
    present: true,
    hitPoints: { nativeType: "short", value: 20 },
    currentHitPoints: { nativeType: "short", value: 77 },
    maxHitPoints: { nativeType: "short", value: 88 },
    constitution: { nativeType: "byte", value: 14 },
    race: { nativeType: "byte", value: 1 },
    classLevels: [3, 2],
    featRow40Present: false,
    racialTypes: {
      resourceName: "racialtypes.2da",
      sourceObjectKey: "runtime-source/module/racialtypes.2da",
      sourceLayer: "module",
      sha256: "a".repeat(64),
      sizeBytes: 400,
      rowCount: 3,
      rowIndex: 1,
      constitutionAdjust: 0,
    },
  },
};

const current = {
  constitution: 14,
  baseHitPoints: 20,
  hitPointBonuses: 10,
  currentHitPoints: 20,
  maxHitPoints: 30,
};

describe("existing Creature coupled HP provenance", () => {
  it("activates only a complete, bound retained Creature state", () => {
    expect(readExistingCreatureHitPointState(exactSource)).toEqual(
      exactSource.creatureHitPointState,
    );
    expect(canEditExistingCreatureHitPoints(exactSource)).toBe(true);
    expect(canEditExistingCreatureHitPoints({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingCreatureHitPoints({ ...exactSource, sourceKind: "placeable" }))
      .toBe(false);
    expect(canEditExistingCreatureHitPoints({
      ...exactSource,
      creatureHitPointState: {
        ...exactSource.creatureHitPointState!,
        racialTypes: undefined,
      } as never,
    })).toBe(false);
  });

  it("reduces Base HP and Constitution as one derived target", () => {
    expect(reduceExistingCreatureHitPointDraft(exactSource, current, {
      baseHitPoints: 25,
      constitution: 16,
    })).toEqual({
      constitution: 16,
      baseHitPoints: 25,
      hitPointBonuses: 15,
      currentHitPoints: 15,
      maxHitPoints: 40,
    });
  });

  it("reduces a same-roster ClassLevel change through the same HP derivation", () => {
    expect(reduceExistingCreatureHitPointDraft(exactSource, current, {
      baseHitPoints: 20,
      constitution: 14,
      classLevels: [4, 3],
    })).toEqual({
      constitution: 14,
      baseHitPoints: 20,
      hitPointBonuses: 14,
      currentHitPoints: 16,
      maxHitPoints: 34,
    });
  });

  it("reduces a feat-row-40 transition through the same HP derivation", () => {
    expect(reduceExistingCreatureHitPointDraft(exactSource, current, {
      baseHitPoints: 20,
      constitution: 14,
      featRow40Present: true,
    })).toEqual({
      constitution: 14,
      baseHitPoints: 20,
      hitPointBonuses: 15,
      currentHitPoints: 15,
      maxHitPoints: 35,
    });
  });

  it("preserves a negative Constitution bonus instead of clamping it", () => {
    expect(reduceExistingCreatureHitPointDraft(exactSource, current, {
      baseHitPoints: 20,
      constitution: 4,
    })).toEqual({
      constitution: 4,
      baseHitPoints: 20,
      hitPointBonuses: -15,
      currentHitPoints: 45,
      maxHitPoints: 5,
    });
  });

  it("rejects a target below the Aurora dynamic minimum and preserves the draft", () => {
    expect(reduceExistingCreatureHitPointDraft(exactSource, current, {
      baseHitPoints: 19,
      constitution: 4,
    })).toBe(current);
  });

  it("materializes only the self-consistent coupled target", () => {
    expect(materializeExistingCreatureHitPointDraft(exactSource, current, {
      baseHitPoints: 25,
      constitution: 16,
    })).toEqual({
      constitution: 16,
      baseHitPoints: 25,
      hitPointBonuses: 15,
      currentHitPoints: 15,
      maxHitPoints: 40,
    });
    expect(materializeExistingCreatureHitPointDraft(
      { ...exactSource, type: "seed" },
      current,
      { baseHitPoints: 25, constitution: 16 },
    )).toBe(current);
  });
});

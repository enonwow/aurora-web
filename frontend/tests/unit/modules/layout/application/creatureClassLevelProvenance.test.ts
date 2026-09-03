import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureClassLevels,
  materializeExistingCreatureClassEntries,
  readExistingCreatureClassLevelProvenance,
} from "../../../../../src/modules/layout/application/creatureClassLevelProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureClassLevelState: {
    present: true,
    nativeType: "list",
    structTypeId: 2,
    classNativeType: "int",
    levelNativeType: "short",
    entries: [
      { classId: 4, level: 3, opaqueSiblingFieldCount: 2 },
      { classId: 7, level: 2, opaqueSiblingFieldCount: 1 },
    ],
  },
  creatureHitPointState: {
    present: true,
    hitPoints: { nativeType: "short", value: 10 },
    currentHitPoints: { nativeType: "short", value: 7 },
    maxHitPoints: { nativeType: "short", value: 25 },
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
      constitutionAdjust: 2,
    },
  },
};
const current = [
  { classId: 4, className: "Fighter", level: 3 },
  { classId: 7, className: "Wizard", level: 2 },
];

describe("existing Creature same-roster ClassLevel provenance", () => {
  it("admits only an exact ClassList coupled to the same HP level vector", () => {
    expect(readExistingCreatureClassLevelProvenance(exactSource)).toEqual({
      classIds: [4, 7],
      sourceLevels: [3, 2],
      opaqueSiblingFieldCounts: [2, 1],
    });
    expect(canEditExistingCreatureClassLevels(exactSource, current)).toBe(true);
    expect(canEditExistingCreatureClassLevels(exactSource, [current[1]!, current[0]!]))
      .toBe(false);
    expect(readExistingCreatureClassLevelProvenance({
      ...exactSource,
      creatureHitPointState: {
        ...exactSource.creatureHitPointState!,
        classLevels: [4, 2],
      } as never,
    })).toBeNull();
  });

  it("materializes levels only while preserving class IDs, names, count, and order", () => {
    expect(materializeExistingCreatureClassEntries(exactSource, current, [
      { classId: 4, className: "Changed label", level: 4 },
      { classId: 7, className: "Changed label", level: 3 },
    ])).toEqual([
      { classId: 4, className: "Fighter", level: 4 },
      { classId: 7, className: "Wizard", level: 3 },
    ]);
  });

  it.each([
    [{ classId: 7, className: "Wizard", level: 3 }],
    [
      { classId: 7, className: "Wizard", level: 4 },
      { classId: 4, className: "Fighter", level: 3 },
    ],
    [
      { classId: 4, className: "Fighter", level: 61 },
      { classId: 7, className: "Wizard", level: 2 },
    ],
  ])("preserves the current vector for an inadmissible candidate %#", (candidate) => {
    expect(materializeExistingCreatureClassEntries(exactSource, current, candidate))
      .toBe(current);
  });
});

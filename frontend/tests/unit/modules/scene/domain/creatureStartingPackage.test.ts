import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureStartingPackage,
  readCreatureStartingPackageStorage,
} from "../../../../../src/modules/scene/domain/creatureStartingPackage";

const table = {
  resourceName: "packages.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
  sourceLayer: "vanilla" as const,
  sha256: "c".repeat(64),
  sizeBytes: 30_510,
  rowCount: 132,
  rowIndex: 0,
  classId: 4,
};

describe("Creature StartingPackage provenance", () => {
  it("reads one exact ClassList- and digest-bound native Byte including row zero", () => {
    const input = {
      present: true as const,
      nativeType: "byte" as const,
      value: 0,
      classIds: [4] as const,
      table,
    };
    expect(readCreatureStartingPackageStorage(input)).toEqual(input);
  });

  it.each([
    undefined,
    { present: false, value: 0 },
    { present: true, nativeType: "word", value: 0, classIds: [4], table },
    { present: true, nativeType: "byte", value: 256, classIds: [4], table },
    { present: true, nativeType: "byte", value: 0, classIds: [], table },
    { present: true, nativeType: "byte", value: 0, classIds: [4, 4], table },
    { present: true, nativeType: "byte", value: 0, classIds: [4], table: { ...table, classId: 2 } },
    { present: true, nativeType: "byte", value: 0, classIds: [4], table: { ...table, rowIndex: 1 } },
  ])("rejects malformed or non-Toolset-bound storage %#", (input) => {
    expect(readCreatureStartingPackageStorage(input)).toBeNull();
  });

  it("authorizes only exact retained Creature source, table, and ClassList provenance", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureStartingPackage: {
        present: true as const,
        nativeType: "byte" as const,
        value: 0,
        classIds: [4],
        table,
      },
    };
    expect(canEditExistingCreatureStartingPackage(source)).toBe(true);
    expect(canEditExistingCreatureStartingPackage({ ...source, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureStartingPackage({
      ...source,
      creatureStartingPackage: { present: true, nativeType: "byte", value: 0 },
    })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureGender,
  readCreatureGenderStorage,
} from "../../../../../src/modules/scene/domain/creatureGender";

const table = {
  resourceName: "gender.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
  sourceLayer: "vanilla" as const,
  sha256: "c".repeat(64),
  sizeBytes: 250,
  rowCount: 5,
  rowIndex: 4,
};

describe("Creature Gender provenance", () => {
  it("reads one exact digest-bound Gender Byte storage value", () => {
    const input = { present: true, nativeType: "byte", value: 4, table };
    const result = readCreatureGenderStorage(input);

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(result?.present && result.table).not.toBe(table);
  });

  it.each([
    undefined,
    { present: false, value: 0 },
    { present: true, nativeType: "word", value: 4, table },
    { present: true, nativeType: "byte", value: 256, table },
    { present: true, nativeType: "byte", value: 4, table: { ...table, rowIndex: 0 } },
    { present: true, nativeType: "byte", value: 4, table: { ...table, sha256: "C".repeat(64) } },
  ])("rejects malformed storage %#", (input) => {
    expect(readCreatureGenderStorage(input)).toBeNull();
  });

  it("authorizes only an exact retained Creature source bound to gender.2da", () => {
    const exact = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureGender: { present: true as const, nativeType: "byte" as const, value: 4, table },
    };

    expect(canEditExistingCreatureGender(exact)).toBe(true);
    expect(canEditExistingCreatureGender({ ...exact, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureGender({ ...exact, sourceKind: "door" })).toBe(false);
    expect(canEditExistingCreatureGender({
      ...exact,
      creatureGender: { present: true, nativeType: "byte", value: 4 },
    })).toBe(false);
  });
});

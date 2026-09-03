import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureAppearance,
  readCreatureAppearanceStorage,
} from "../../../../../src/modules/scene/domain/creatureAppearance";

const table = {
  resourceName: "appearance.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
  sourceLayer: "vanilla" as const,
  sha256: "a".repeat(64),
  sizeBytes: 200_000,
  rowCount: 1_000,
  rowIndex: 249,
};

describe("Creature Appearance provenance", () => {
  it("reads one exact digest-bound Appearance_Type Word storage value", () => {
    const input = { present: true, nativeType: "word", value: 249, table };
    const result = readCreatureAppearanceStorage(input);

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(result?.present && result.table).not.toBe(table);
  });

  it.each([
    undefined,
    { present: false, value: 0 },
    { present: true, nativeType: "dword", value: 249, table },
    { present: true, nativeType: "word", value: 65_536, table },
    { present: true, nativeType: "word", value: 249, table: { ...table, rowIndex: 52 } },
    { present: true, nativeType: "word", value: 249, table: { ...table, sha256: "A".repeat(64) } },
  ])("rejects malformed storage %#", (input) => {
    expect(readCreatureAppearanceStorage(input)).toBeNull();
  });

  it("authorizes only an exact retained Creature source bound to the table", () => {
    const exact = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureAppearance: { present: true as const, nativeType: "word" as const, value: 249, table },
    };

    expect(canEditExistingCreatureAppearance(exact)).toBe(true);
    expect(canEditExistingCreatureAppearance({ ...exact, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureAppearance({ ...exact, sourceKind: "door" })).toBe(false);
    expect(canEditExistingCreatureAppearance({
      ...exact,
      creatureAppearance: { present: true, nativeType: "word", value: 249 },
    })).toBe(false);
  });
});

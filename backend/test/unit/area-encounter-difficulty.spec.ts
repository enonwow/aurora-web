import {
  bindAreaEncounterDifficultyStorageToCatalog,
  readAreaEncounterDifficultyStorage,
  readExistingAreaEncounterDifficultyMutation,
  readExistingAreaEncounterDifficultyProvenance,
} from "../../src/modules/areas/domain/area-encounter-difficulty";
import type { EffectiveAreaEncounterDifficultyCatalog } from
  "../../src/modules/catalog/domain/effective-area-encounter-difficulty-two-da";

const SHA = "a".repeat(64);
const catalog: EffectiveAreaEncounterDifficultyCatalog = {
  schemaVersion: "area-encounter-difficulty-catalog.v1",
  descriptor: {
    resourceName: "encdifficulty.2da",
    sourceObjectKey: "module/encdifficulty.2da",
    sourceLayer: "module",
    sha256: SHA,
    sizeBytes: 80,
    rowCount: 3,
  },
  rows: [
    { rowIndex: 0, strRef: 100, value: -5, displayName: "Easy", displaySource: "strref" },
    { rowIndex: 1, strRef: 101, value: 0, displayName: "Normal", displaySource: "strref" },
    { rowIndex: 2, strRef: 102, value: 5, displayName: "Hard", displaySource: "strref" },
  ],
};

describe("Area Encounter Difficulty pair", () => {
  it("admits exact presence-sensitive native INT storage", () => {
    expect(readAreaEncounterDifficultyStorage({
      difficulty: { present: true, nativeType: "int", value: 0 },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    })).toEqual({
      difficulty: { present: true, nativeType: "int", value: 0 },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    });
    expect(readAreaEncounterDifficultyStorage({
      difficulty: { present: false },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    })).toEqual({
      difficulty: { present: false },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    });
  });

  it("binds only a coherent complete source pair to the exact catalog", () => {
    expect(bindAreaEncounterDifficultyStorageToCatalog({
      difficulty: { present: true, nativeType: "int", value: 0 },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    }, catalog)).toEqual({
      expectedValue: { difficulty: 0, difficultyIndex: 1 },
      catalogSha256: SHA,
      catalogRowCount: 3,
    });
    expect(bindAreaEncounterDifficultyStorageToCatalog({
      difficulty: { present: true, nativeType: "int", value: 5 },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    }, catalog)).toBeNull();
    expect(bindAreaEncounterDifficultyStorageToCatalog({
      difficulty: { present: false },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    }, catalog)).toBeNull();
  });

  it("validates immutable provenance and a changed complete mutation", () => {
    expect(readExistingAreaEncounterDifficultyProvenance({
      expectedValue: { difficulty: 0, difficultyIndex: 1 },
      catalogSha256: SHA,
      catalogRowCount: 3,
    })).toEqual({
      expectedValue: { difficulty: 0, difficultyIndex: 1 },
      catalogSha256: SHA,
      catalogRowCount: 3,
    });
    expect(readExistingAreaEncounterDifficultyMutation({
      expectedValue: { difficulty: 0, difficultyIndex: 1 },
      value: { difficulty: 5, difficultyIndex: 2 },
      catalogSha256: SHA,
      catalogRowCount: 3,
    })).toEqual({
      expectedValue: { difficulty: 0, difficultyIndex: 1 },
      value: { difficulty: 5, difficultyIndex: 2 },
      catalogSha256: SHA,
      catalogRowCount: 3,
    });
  });

  it.each([
    ["extra storage key", {
      difficulty: { present: false }, difficultyIndex: { present: false }, extra: true,
    }],
    ["wrong native type", {
      difficulty: { present: true, nativeType: "dword", value: 0 },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    }],
    ["non-integer", {
      difficulty: { present: true, nativeType: "int", value: 0.5 },
      difficultyIndex: { present: true, nativeType: "int", value: 1 },
    }],
  ])("rejects %s", (_label, value) => {
    expect(readAreaEncounterDifficultyStorage(value)).toBeNull();
  });

  it.each([
    ["unchanged pair", { difficulty: 0, difficultyIndex: 1 }],
    ["index outside catalog", { difficulty: 5, difficultyIndex: 3 }],
    ["difficulty below native range", { difficulty: -21, difficultyIndex: 0 }],
    ["difficulty above native range", { difficulty: 21, difficultyIndex: 2 }],
  ])("rejects mutation with %s", (_label, value) => {
    expect(readExistingAreaEncounterDifficultyMutation({
      expectedValue: { difficulty: 0, difficultyIndex: 1 },
      value,
      catalogSha256: SHA,
      catalogRowCount: 3,
    })).toBeNull();
  });
});

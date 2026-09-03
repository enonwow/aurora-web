import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureSoundSetFile,
  readCreatureSoundSetFileStorage,
} from "../../../../../src/modules/scene/domain/creatureSoundSetFile";

const table = {
  resourceName: "soundset.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
  sourceLayer: "vanilla" as const,
  sha256: "a".repeat(64),
  sizeBytes: 336_678,
  rowCount: 5_100,
  rowIndex: 0,
  resRef: "c_aasimar",
};

describe("Creature SoundSetFile provenance", () => {
  it("reads one exact digest-bound native Word including row zero", () => {
    const input = { present: true as const, nativeType: "word" as const, value: 0, table };
    expect(readCreatureSoundSetFileStorage(input)).toEqual(input);
  });

  it.each([
    undefined,
    { present: false, value: 0 },
    { present: true, nativeType: "int", value: 0, table },
    { present: true, nativeType: "word", value: -1, table },
    { present: true, nativeType: "word", value: 65_536, table },
    { present: true, nativeType: "word", value: 0, table: { ...table, rowIndex: 1 } },
    { present: true, nativeType: "word", value: 0, table: { ...table, resRef: "Bad-ResRef" } },
    { present: true, nativeType: "word", value: 0, table: { ...table, sha256: "A".repeat(64) } },
  ])("rejects malformed or non-Toolset-bound storage %#", (input) => {
    expect(readCreatureSoundSetFileStorage(input)).toBeNull();
  });

  it("authorizes only an exact retained Creature source", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureSoundSetFile: {
        present: true as const,
        nativeType: "word" as const,
        value: 0,
        table,
      },
    };
    expect(canEditExistingCreatureSoundSetFile(source)).toBe(true);
    expect(canEditExistingCreatureSoundSetFile({ ...source, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureSoundSetFile({
      ...source,
      creatureSoundSetFile: { present: true, nativeType: "word", value: 0 },
    })).toBe(false);
  });
});

import {
  bindEffectiveCreatureSkillsTwoDaToCreatureSkillList,
  readAreaCreatureSkillListStorage,
  readExistingAreaCreatureSkillListMutation,
} from "../../src/modules/areas/domain/area-creature-skill-list";
import { parseEffectiveCreatureSkillsTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-skills-two-da";

describe("Area Creature SkillList", () => {
  const table = parseEffectiveCreatureSkillsTwoDa({
    bytes: Buffer.from([
      "2DA V2.0",
      "",
      "Label Name KeyAbility",
      "0 AnimalEmpathy 100 CHA",
      "1 Hidden **** INT",
      "2 Concentration 102 CON",
      "",
    ].join("\n"), "ascii"),
    sourceObjectKey: "runtime-source/module/skills.2da",
    sourceLayer: "module",
    resolveStrRef: (strRef) => strRef === 100 ? "Animal Empathy" : undefined,
  })!;

  it("accepts exact presence-sensitive list storage including opaque sibling counts", () => {
    expect(readAreaCreatureSkillListStorage({ present: false })).toEqual({ present: false });
    expect(readAreaCreatureSkillListStorage({
      present: true,
      nativeType: "list",
      structTypeId: 0,
      rankNativeType: "byte",
      ranks: [0, 255, 7],
      opaqueSiblingFieldCounts: [0, 2, 1],
    })).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 0,
      rankNativeType: "byte",
      ranks: [0, 255, 7],
      opaqueSiblingFieldCounts: [0, 2, 1],
    });
  });

  it("binds the complete physical vector to one immutable effective skills.2da", () => {
    expect(bindEffectiveCreatureSkillsTwoDaToCreatureSkillList({
      present: true,
      nativeType: "list",
      structTypeId: 0,
      rankNativeType: "byte",
      ranks: [4],
      opaqueSiblingFieldCounts: [1],
    }, table)).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 0,
      rankNativeType: "byte",
      ranks: [4],
      opaqueSiblingFieldCounts: [1],
      table: table.descriptor,
    });
  });

  it.each([
    { present: true, nativeType: "list", structTypeId: 1, rankNativeType: "byte", ranks: [1], opaqueSiblingFieldCounts: [0] },
    { present: true, nativeType: "list", structTypeId: 0, rankNativeType: "word", ranks: [1], opaqueSiblingFieldCounts: [0] },
    { present: true, nativeType: "list", structTypeId: 0, rankNativeType: "byte", ranks: [256], opaqueSiblingFieldCounts: [0] },
    { present: true, nativeType: "list", structTypeId: 0, rankNativeType: "byte", ranks: [1], opaqueSiblingFieldCounts: [] },
    { present: true, nativeType: "list", structTypeId: 0, rankNativeType: "byte", ranks: [1], opaqueSiblingFieldCounts: [-1] },
    { present: true, nativeType: "list", structTypeId: 0, rankNativeType: "byte", ranks: [1], opaqueSiblingFieldCounts: [0], extra: true },
  ])("rejects malformed storage %#", (value) => {
    expect(readAreaCreatureSkillListStorage(value)).toBeNull();
  });

  it.each([
    {
      expectedRanks: [1, 2], ranks: [1, 3], tableSha256: "a".repeat(64), rowCount: 2,
      resizeMode: "same_length", confirmTruncation: false,
    },
    {
      expectedRanks: [1], ranks: [1, 3], tableSha256: "a".repeat(64), rowCount: 2,
      resizeMode: "expand_zero_tail", confirmTruncation: false,
    },
    {
      expectedRanks: [1, 2], ranks: [1], tableSha256: "a".repeat(64), rowCount: 1,
      resizeMode: "truncate_tail", confirmTruncation: true,
    },
  ])("accepts exact full-vector %s CAS", (value) => {
    expect(readExistingAreaCreatureSkillListMutation(value)).toEqual(value);
  });

  it.each([
    { expectedRanks: [1], ranks: [1], tableSha256: "a".repeat(64), rowCount: 1, resizeMode: "same_length", confirmTruncation: false },
    { expectedRanks: [1], ranks: [1, 2], tableSha256: "a".repeat(64), rowCount: 2, resizeMode: "same_length", confirmTruncation: false },
    { expectedRanks: [1], ranks: [1, 2], tableSha256: "a".repeat(64), rowCount: 2, resizeMode: "expand_zero_tail", confirmTruncation: true },
    { expectedRanks: [1, 2], ranks: [1], tableSha256: "a".repeat(64), rowCount: 1, resizeMode: "truncate_tail", confirmTruncation: false },
    { expectedRanks: [1], ranks: [256], tableSha256: "a".repeat(64), rowCount: 1, resizeMode: "same_length", confirmTruncation: false },
    { expectedRanks: [1], ranks: [2], tableSha256: "bad", rowCount: 1, resizeMode: "same_length", confirmTruncation: false },
  ])("rejects unsafe or no-op mutation %#", (value) => {
    expect(readExistingAreaCreatureSkillListMutation(value)).toBeNull();
  });
});

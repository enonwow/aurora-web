import {
  isExactEffectiveCreatureSkillsTwoDaTable,
  localizeEffectiveCreatureSkillsTwoDa,
  parseEffectiveCreatureSkillsTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-skills-two-da";

describe("effective Creature skills.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "Label Name KeyAbility",
    "0 AnimalEmpathy 100 CHA",
    "1 Hidden **** INT",
    "2 Concentration 102 CON",
    "3 MissingTlk 9999 WIS",
    "",
  ].join("\n");

  it("retains physical ordinals without compacting hidden or unresolved display rows", () => {
    const result = parseEffectiveCreatureSkillsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
      sourceLayer: "vanilla",
      resolveStrRef: (strRef) => strRef === 100 ? "Animal Empathy" : undefined,
    });
    expect(result).toEqual({
      descriptor: {
        resourceName: "skills.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
        sourceLayer: "vanilla",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(source, "ascii"),
        rowCount: 4,
      },
      rows: [
        { rowIndex: 0, nameStrRef: 100, displayName: "Animal Empathy", displaySource: "strref" },
        { rowIndex: 2, nameStrRef: 102, displayName: "StringRef 102", displaySource: "strref_id" },
        { rowIndex: 3, nameStrRef: 9999, displayName: "StringRef 9999", displaySource: "strref_id" },
      ],
    });
    expect(isExactEffectiveCreatureSkillsTwoDaTable(result)).toBe(true);
  });

  it("relocalizes numeric Name cells while preserving their physical ordinals", () => {
    const table = parseEffectiveCreatureSkillsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/skills.2da",
      sourceLayer: "hak",
      resolveStrRef: () => undefined,
    })!;
    expect(localizeEffectiveCreatureSkillsTwoDa(table, (value) =>
      value === 102 ? "Concentration" : undefined).rows).toEqual([
      expect.objectContaining({ rowIndex: 0, displaySource: "strref_id" }),
      expect.objectContaining({ rowIndex: 2, displayName: "Concentration", displaySource: "strref" }),
      expect.objectContaining({ rowIndex: 3, displaySource: "strref_id" }),
    ]);
  });

  it.each([
    ["wrong version", source.replace("2DA V2.0", "2DA V1.0")],
    ["missing Name", source.replace("Name ", "StringRef ")],
    ["duplicate Name", source.replace("Label Name", "Name Name")],
  ])("rejects %s", (_label, value) => {
    expect(parseEffectiveCreatureSkillsTwoDa({
      bytes: Buffer.from(value, "ascii"),
      sourceObjectKey: "x/skills.2da",
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })).toBeNull();
  });
});

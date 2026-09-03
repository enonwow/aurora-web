import {
  analyzeAreaCreatureClassListField,
  replaceAreaCreatureClassIdsAndClearSpellLists,
  resizeAreaCreatureClassListTail,
} from "../../src/modules/areas/adapters/outbound/blob/area-creature-class-list-gff";
import type { SupportedGffField } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("exact Creature ClassList GFF graph", () => {
  const field: SupportedGffField = {
    label: "ClassList",
    type: "list",
    value: [
      {
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 1 },
          { label: "ClassLevel", type: "short", value: 3 },
          {
            label: "KnownList0",
            type: "list",
            value: [{
              typeId: 3,
              fields: [
                { label: "Spell", type: "word", value: 7 },
                { label: "SpellMetaMagic", type: "byte", value: 1 },
                { label: "SpellFlags", type: "byte", value: 0 },
                { label: "OpaqueSpell", type: "int", value: 42 },
              ],
            }],
          },
          { label: "OpaqueClass", type: "cexostring", value: "keep" },
        ],
      },
      {
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 9 },
          { label: "ClassLevel", type: "short", value: 2 },
          { label: "OpaqueSecond", type: "byte", value: 1 },
        ],
      },
    ],
  };

  it("fingerprints the complete ordered graph and reports exact spell ownership", () => {
    const analysis = analyzeAreaCreatureClassListField(field);
    expect(analysis).toMatchObject({
      entries: [
        {
          classId: 1,
          level: 3,
          opaqueSiblingFieldCount: 1,
          canonicalSpellListFieldCount: 1,
          spellEntryCount: 1,
        },
        {
          classId: 9,
          level: 2,
          opaqueSiblingFieldCount: 1,
          canonicalSpellListFieldCount: 0,
          spellEntryCount: 0,
        },
      ],
    });
    expect(analysis?.classListGraphSha256).toMatch(/^[a-f0-9]{64}$/u);
    const changed = structuredClone(field) as SupportedGffField;
    if (changed.type === "list") {
      const first = changed.value[0];
      if (first) first.fields.push({ label: "AnotherOpaque", type: "byte", value: 0 });
    }
    expect(analyzeAreaCreatureClassListField(changed)?.classListGraphSha256)
      .not.toBe(analysis?.classListGraphSha256);
  });

  it("replaces changed class IDs, clears only their canonical spell lists, and preserves siblings", () => {
    const target = replaceAreaCreatureClassIdsAndClearSpellLists(
      field,
      [1, 9],
      [2, 9],
      [3, 2],
    );
    expect(target?.type).toBe("list");
    if (!target || target.type !== "list") return;
    expect(target.value[0]?.fields).toEqual([
      { label: "Class", type: "int", value: 2 },
      { label: "ClassLevel", type: "short", value: 3 },
      { label: "OpaqueClass", type: "cexostring", value: "keep" },
    ]);
    expect(target.value[1]?.fields).toEqual((field.type === "list" ? field.value[1]?.fields : []));
  });

  it("appends canonical empty-spell tail slots while preserving the retained graph", () => {
    const target = resizeAreaCreatureClassListTail(field, [1, 9], [3, 2], [1, 9, 2], [3, 2, 1]);
    expect(target?.type).toBe("list");
    if (!target || target.type !== "list" || field.type !== "list") return;
    expect(target.value.slice(0, 2)).toEqual(field.value);
    expect(target.value[2]).toEqual({
      typeId: 2,
      fields: [
        { label: "Class", type: "int", value: 2 },
        { label: "ClassLevel", type: "short", value: 1 },
      ],
    });
  });

  it("truncates only the exact tail and preserves the retained prefix", () => {
    const target = resizeAreaCreatureClassListTail(field, [1, 9], [3, 2], [1], [3]);
    expect(target).toEqual({
      label: "ClassList",
      type: "list",
      value: field.type === "list" ? [field.value[0]] : [],
    });
  });

  it.each([
    [[9], [2]],
    [[1, 9], [3, 2]],
    [[1, 2, 9], [3, 1, 2]],
    [[], []],
  ])("rejects a non-tail resize target %#", (classIds, levels) => {
    expect(resizeAreaCreatureClassListTail(field, [1, 9], [3, 2], classIds, levels))
      .toBeNull();
  });

  it.each([
    { ...field, label: "classlist" },
    { ...field, value: [{ typeId: 1, fields: [] }] },
    {
      ...field,
      value: [{ typeId: 2, fields: [
        { label: "Class", type: "int", value: 1 },
        { label: "Class", type: "int", value: 2 },
        { label: "ClassLevel", type: "short", value: 1 },
      ] }],
    },
    {
      ...field,
      value: [{ typeId: 2, fields: [
        { label: "Class", type: "int", value: 1 },
        { label: "ClassLevel", type: "short", value: 1 },
        { label: "KnownList0", type: "int", value: 0 },
      ] }],
    },
  ] as SupportedGffField[])("rejects a noncanonical graph %#", (candidate) => {
    expect(analyzeAreaCreatureClassListField(candidate)).toBeNull();
  });
});

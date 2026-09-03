import {
  isAreaCreatureTemplateResRef,
  readExistingAreaCreatureTemplateResRefMutation,
} from "../../src/modules/areas/domain/area-creature-template-resref";

describe("Existing Area Creature TemplateResRef", () => {
  it.each(["a", "nw_dwarfmerc001", "abcdefghijklmnop", "a_0"])(
    "admits the exact lowercase native ResRef profile: %s",
    (value) => expect(isAreaCreatureTemplateResRef(value)).toBe(true),
  );

  it.each([
    "",
    "NW_DWARFMERC001",
    "abcdefghijklmnopq",
    "nw-dwarf",
    "nw dwarf",
    "żuraw",
    null,
    1,
  ])("rejects an unproven native ResRef profile: %#", (value) => {
    expect(isAreaCreatureTemplateResRef(value)).toBe(false);
  });

  it("reads and freezes one exact changed pair", () => {
    const pair = readExistingAreaCreatureTemplateResRefMutation({
      expectedResRef: "nw_dwarfmerc001",
      resRef: "nw_dwarfmerc002",
    });
    expect(pair).toEqual({
      expectedResRef: "nw_dwarfmerc001",
      resRef: "nw_dwarfmerc002",
    });
    expect(Object.isFrozen(pair)).toBe(true);
  });

  it.each([
    null,
    [],
    { expectedResRef: "nw_dwarfmerc001" },
    { resRef: "nw_dwarfmerc002" },
    { expectedResRef: "nw_dwarfmerc001", resRef: "nw_dwarfmerc002", extra: true },
    { expectedResRef: "NW_DWARFMERC001", resRef: "nw_dwarfmerc002" },
    { expectedResRef: "nw_dwarfmerc001", resRef: "bad-resref" },
    { expectedResRef: "nw_dwarfmerc001", resRef: "nw_dwarfmerc001" },
  ])("rejects a malformed or unchanged pair: %#", (value) => {
    expect(readExistingAreaCreatureTemplateResRefMutation(value)).toBeUndefined();
  });
});

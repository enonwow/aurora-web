import {
  isAreaEncounterTemplateResRef,
  readAreaEncounterTemplateResRefStorage,
  readExistingAreaEncounterTemplateResRefMutation,
} from "../../src/modules/areas/domain/area-encounter-template-resref";

describe("Existing Area Encounter TemplateResRef", () => {
  it.each(["a", "x2_gnoll001", "abcdefghijklmnop", "a_0"])(
    "admits the exact lowercase native ResRef profile: %s",
    (value) => expect(isAreaEncounterTemplateResRef(value)).toBe(true),
  );

  it.each([
    "",
    "X2_GNOLL001",
    "abcdefghijklmnopq",
    "bad-resref",
    "bad resref",
    "żuraw",
    null,
    1,
  ])("rejects an unproven native ResRef profile: %#", (value) => {
    expect(isAreaEncounterTemplateResRef(value)).toBe(false);
  });

  it("reads and freezes exact absent and canonical present storage", () => {
    const absent = readAreaEncounterTemplateResRefStorage({ present: false });
    const present = readAreaEncounterTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    });

    expect(absent).toEqual({ present: false });
    expect(present).toEqual({
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: "x2_gnoll001" },
    { present: true, nativeType: "resref" },
    { present: true, nativeType: "cexostring", value: "x2_gnoll001" },
    { present: true, nativeType: "resref", value: "X2_GNOLL001" },
    { present: true, nativeType: "resref", value: "x2_gnoll001", extra: true },
    Object.assign(Object.create({}), {
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    }),
  ])("rejects malformed storage: %#", (value) => {
    expect(readAreaEncounterTemplateResRefStorage(value)).toBeNull();
  });

  it("reads and freezes one exact changed pair", () => {
    const pair = readExistingAreaEncounterTemplateResRefMutation({
      expectedResRef: "x2_gnoll001",
      resRef: "custom_encounter",
    });
    expect(pair).toEqual({
      expectedResRef: "x2_gnoll001",
      resRef: "custom_encounter",
    });
    expect(Object.isFrozen(pair)).toBe(true);
  });

  it.each([
    null,
    [],
    { expectedResRef: "x2_gnoll001" },
    { resRef: "custom_encounter" },
    { expectedResRef: "x2_gnoll001", resRef: "custom_encounter", extra: true },
    { expectedResRef: "X2_GNOLL001", resRef: "custom_encounter" },
    { expectedResRef: "x2_gnoll001", resRef: "bad-resref" },
    { expectedResRef: "x2_gnoll001", resRef: "x2_gnoll001" },
    Object.assign(Object.create({}), {
      expectedResRef: "x2_gnoll001",
      resRef: "custom_encounter",
    }),
  ])("rejects a malformed or unchanged pair: %#", (value) => {
    expect(readExistingAreaEncounterTemplateResRefMutation(value)).toBeNull();
  });
});

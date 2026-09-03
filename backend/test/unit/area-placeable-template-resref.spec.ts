import {
  isAreaPlaceableTemplateResRef,
  readExistingAreaPlaceableTemplateResRefMutation,
} from "../../src/modules/areas/domain/area-placeable-template-resref";

describe("Existing Area Placeable TemplateResRef", () => {
  it.each([
    "a",
    "plc_watertrough",
    "abcdefghijklmnop",
    "a_0",
  ])("admits the exact lowercase native ResRef profile: %s", (value) => {
    expect(isAreaPlaceableTemplateResRef(value)).toBe(true);
  });

  it.each([
    "",
    "Plc_watertrough",
    "abcdefghijklmnopq",
    "plc-water",
    "plc water",
    "żuraw",
    null,
    1,
  ])("rejects an unproven native ResRef profile: %#", (value) => {
    expect(isAreaPlaceableTemplateResRef(value)).toBe(false);
  });

  it("reads and freezes one exact changed pair", () => {
    const pair = readExistingAreaPlaceableTemplateResRefMutation({
      expectedResRef: "plc_watertrough",
      resRef: "plc_watertrou_2",
    });
    expect(pair).toEqual({
      expectedResRef: "plc_watertrough",
      resRef: "plc_watertrou_2",
    });
    expect(Object.isFrozen(pair)).toBe(true);
  });

  it.each([
    null,
    [],
    { expectedResRef: "plc_watertrough" },
    { resRef: "plc_watertrou_2" },
    { expectedResRef: "plc_watertrough", resRef: "plc_watertrou_2", extra: true },
    { expectedResRef: "Plc_watertrough", resRef: "plc_watertrou_2" },
    { expectedResRef: "plc_watertrough", resRef: "bad-resref" },
    { expectedResRef: "plc_watertrough", resRef: "plc_watertrough" },
  ])("rejects a malformed or unchanged pair: %#", (value) => {
    expect(readExistingAreaPlaceableTemplateResRefMutation(value)).toBeUndefined();
  });
});

import {
  isAreaItemTemplateResRef,
  readAreaItemTemplateResRefStorage,
  readExistingAreaItemTemplateResRefMutation,
} from "../../src/modules/areas/domain/area-item-template-resref";

describe("Existing Area ground-Item TemplateResRef domain", () => {
  it("admits exact absent and canonical present provenance", () => {
    const absent = readAreaItemTemplateResRefStorage({ present: false });
    const present = readAreaItemTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "nw_cloth022",
    });

    expect(absent).toEqual({ present: false });
    expect(present).toEqual({
      present: true,
      nativeType: "resref",
      value: "nw_cloth022",
    });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
  });

  it("admits only canonical non-empty lowercase ResRefs", () => {
    expect(isAreaItemTemplateResRef("a")).toBe(true);
    expect(isAreaItemTemplateResRef("nw_cloth022")).toBe(true);
    expect(isAreaItemTemplateResRef("a".repeat(16))).toBe(true);
    expect(isAreaItemTemplateResRef("")).toBe(false);
    expect(isAreaItemTemplateResRef("NW_CLOTH022")).toBe(false);
    expect(isAreaItemTemplateResRef("a".repeat(17))).toBe(false);
    expect(isAreaItemTemplateResRef("bad-resref")).toBe(false);
    expect(isAreaItemTemplateResRef(16)).toBe(false);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: "nw_cloth022" },
    { present: true, nativeType: "resref" },
    { present: true, nativeType: "cexostring", value: "nw_cloth022" },
    { present: true, nativeType: "resref", value: "NW_CLOTH022" },
    { present: true, nativeType: "resref", value: "nw_cloth022", extra: true },
    Object.assign(Object.create({}), {
      present: true,
      nativeType: "resref",
      value: "nw_cloth022",
    }),
  ])("rejects malformed provenance %#", (candidate) => {
    expect(readAreaItemTemplateResRefStorage(candidate)).toBeNull();
  });

  it("accepts and freezes one exact changed pair", () => {
    const mutation = readExistingAreaItemTemplateResRefMutation({
      expectedResRef: "nw_cloth022",
      resRef: "custom_cloth022",
    });

    expect(mutation).toEqual({
      expectedResRef: "nw_cloth022",
      resRef: "custom_cloth022",
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    [],
    "nw_cloth022",
    { expectedResRef: "nw_cloth022" },
    { resRef: "custom_cloth022" },
    { expectedResRef: "same", resRef: "same" },
    { expectedResRef: "NW_CLOTH022", resRef: "custom_cloth022" },
    { expectedResRef: "nw_cloth022", resRef: "CUSTOM_CLOTH022" },
    { expectedResRef: "nw_cloth022", resRef: "custom_cloth022", extra: true },
    Object.assign(Object.create({}), {
      expectedResRef: "nw_cloth022",
      resRef: "custom_cloth022",
    }),
  ])("rejects malformed or unchanged pair %#", (candidate) => {
    expect(readExistingAreaItemTemplateResRefMutation(candidate)).toBeNull();
  });
});

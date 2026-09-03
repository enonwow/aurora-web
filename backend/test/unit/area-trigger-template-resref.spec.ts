import {
  isAreaTriggerTemplateResRef,
  readAreaTriggerTemplateResRefStorage,
  readExistingAreaTriggerTemplateResRefMutation,
} from "../../src/modules/areas/domain/area-trigger-template-resref";

describe("Existing Area Trigger TemplateResRef", () => {
  it.each(["a", "newgeneric", "abcdefghijklmnop", "a_0"])(
    "admits the exact lowercase native ResRef profile: %s",
    (value) => expect(isAreaTriggerTemplateResRef(value)).toBe(true),
  );

  it.each([
    "",
    "NEWGENERIC",
    "abcdefghijklmnopq",
    "bad-resref",
    "bad resref",
    "żuraw",
    null,
    1,
  ])("rejects an unproven native ResRef profile: %#", (value) => {
    expect(isAreaTriggerTemplateResRef(value)).toBe(false);
  });

  it("reads and freezes exact absent and canonical present storage", () => {
    const absent = readAreaTriggerTemplateResRefStorage({ present: false });
    const present = readAreaTriggerTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    });

    expect(absent).toEqual({ present: false });
    expect(present).toEqual({
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: "newgeneric" },
    { present: true, nativeType: "resref" },
    { present: true, nativeType: "cexostring", value: "newgeneric" },
    { present: true, nativeType: "resref", value: "NEWGENERIC" },
    { present: true, nativeType: "resref", value: "newgeneric", extra: true },
    Object.assign(Object.create({}), {
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    }),
  ])("rejects malformed storage: %#", (value) => {
    expect(readAreaTriggerTemplateResRefStorage(value)).toBeNull();
  });

  it("reads and freezes one exact changed pair", () => {
    const pair = readExistingAreaTriggerTemplateResRefMutation({
      expectedResRef: "newgeneric",
      resRef: "custom_trigger",
    });
    expect(pair).toEqual({
      expectedResRef: "newgeneric",
      resRef: "custom_trigger",
    });
    expect(Object.isFrozen(pair)).toBe(true);
  });

  it.each([
    null,
    [],
    { expectedResRef: "newgeneric" },
    { resRef: "custom_trigger" },
    { expectedResRef: "newgeneric", resRef: "custom_trigger", extra: true },
    { expectedResRef: "NEWGENERIC", resRef: "custom_trigger" },
    { expectedResRef: "newgeneric", resRef: "bad-trigger" },
    { expectedResRef: "newgeneric", resRef: "newgeneric" },
    Object.assign(Object.create({}), {
      expectedResRef: "newgeneric",
      resRef: "custom_trigger",
    }),
  ])("rejects a malformed or unchanged pair: %#", (value) => {
    expect(readExistingAreaTriggerTemplateResRefMutation(value)).toBeNull();
  });
});

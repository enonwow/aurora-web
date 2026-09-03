import { describe, expect, it } from "vitest";
import {
  isItemTemplateResRef,
  readItemTemplateResRefStorage,
} from "../../../../../src/modules/scene/domain/itemTemplateResRef";

describe("ground-Item TemplateResRef domain", () => {
  it("admits exact absent and canonical present provenance", () => {
    expect(readItemTemplateResRefStorage({ present: false })).toEqual({ present: false });
    expect(readItemTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "nw_cloth022",
    })).toEqual({
      present: true,
      nativeType: "resref",
      value: "nw_cloth022",
    });
  });

  it("admits only canonical non-empty lowercase ResRefs", () => {
    expect(isItemTemplateResRef("a")).toBe(true);
    expect(isItemTemplateResRef("nw_cloth022")).toBe(true);
    expect(isItemTemplateResRef("a".repeat(16))).toBe(true);
    expect(isItemTemplateResRef("")).toBe(false);
    expect(isItemTemplateResRef("NW_CLOTH022")).toBe(false);
    expect(isItemTemplateResRef("a".repeat(17))).toBe(false);
    expect(isItemTemplateResRef("bad-resref")).toBe(false);
    expect(isItemTemplateResRef(16)).toBe(false);
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
    expect(readItemTemplateResRefStorage(candidate)).toBeNull();
  });
});

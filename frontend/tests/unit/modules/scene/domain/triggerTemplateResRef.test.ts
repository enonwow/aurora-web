import { describe, expect, it } from "vitest";
import {
  isTriggerTemplateResRef,
  readTriggerTemplateResRefStorage,
} from "../../../../../src/modules/scene/domain/triggerTemplateResRef";

describe("Trigger TemplateResRef domain", () => {
  it("admits exact absent and canonical present provenance", () => {
    expect(readTriggerTemplateResRefStorage({ present: false }))
      .toEqual({ present: false });
    expect(readTriggerTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    })).toEqual({
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    });
  });

  it("admits only canonical non-empty lowercase ResRefs", () => {
    expect(isTriggerTemplateResRef("a")).toBe(true);
    expect(isTriggerTemplateResRef("newgeneric")).toBe(true);
    expect(isTriggerTemplateResRef("a".repeat(16))).toBe(true);
    expect(isTriggerTemplateResRef("")).toBe(false);
    expect(isTriggerTemplateResRef("NEWGENERIC")).toBe(false);
    expect(isTriggerTemplateResRef("a".repeat(17))).toBe(false);
    expect(isTriggerTemplateResRef("bad-resref")).toBe(false);
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
  ])("rejects malformed provenance %#", (candidate) => {
    expect(readTriggerTemplateResRefStorage(candidate)).toBeNull();
  });
});

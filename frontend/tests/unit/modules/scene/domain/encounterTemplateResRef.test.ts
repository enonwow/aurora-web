import { describe, expect, it } from "vitest";
import {
  isEncounterTemplateResRef,
  readEncounterTemplateResRefStorage,
} from "../../../../../src/modules/scene/domain/encounterTemplateResRef";

describe("Encounter TemplateResRef domain", () => {
  it("admits exact absent and canonical present provenance", () => {
    expect(readEncounterTemplateResRefStorage({ present: false }))
      .toEqual({ present: false });
    expect(readEncounterTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    })).toEqual({
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    });
  });

  it("admits only canonical non-empty lowercase ResRefs", () => {
    expect(isEncounterTemplateResRef("a")).toBe(true);
    expect(isEncounterTemplateResRef("x2_gnoll001")).toBe(true);
    expect(isEncounterTemplateResRef("a".repeat(16))).toBe(true);
    expect(isEncounterTemplateResRef("")).toBe(false);
    expect(isEncounterTemplateResRef("X2_GNOLL001")).toBe(false);
    expect(isEncounterTemplateResRef("a".repeat(17))).toBe(false);
    expect(isEncounterTemplateResRef("bad-resref")).toBe(false);
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
  ])("rejects malformed provenance %#", (candidate) => {
    expect(readEncounterTemplateResRefStorage(candidate)).toBeNull();
  });
});

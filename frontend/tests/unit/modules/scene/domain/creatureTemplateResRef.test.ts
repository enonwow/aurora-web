import { describe, expect, it } from "vitest";

import {
  CREATURE_TEMPLATE_RESREF_MAX_CODE_UNITS,
  isCreatureTemplateResRef,
  readCreatureTemplateResRefStorage,
} from "../../../../../src/modules/scene/domain/creatureTemplateResRef";

describe("Creature TemplateResRef", () => {
  it.each(["a", "nw_dwarfmerc001", "abcdefghijklmnop", "a_0"])(
    "admits the exact lowercase native profile: %s",
    (value) => expect(isCreatureTemplateResRef(value)).toBe(true),
  );

  it.each(["", "NW_DWARFMERC001", "abcdefghijklmnopq", "bad-resref", "bad value", "żuraw", 1, null])(
    "rejects an unproven profile: %#",
    (value) => expect(isCreatureTemplateResRef(value)).toBe(false),
  );

  it("reads exact presence-sensitive storage without normalization", () => {
    expect(CREATURE_TEMPLATE_RESREF_MAX_CODE_UNITS).toBe(16);
    expect(readCreatureTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "nw_dwarfmerc001",
    })).toEqual({ present: true, nativeType: "resref", value: "nw_dwarfmerc001" });
    expect(readCreatureTemplateResRefStorage({ present: false })).toEqual({ present: false });
  });

  it.each([
    null,
    [],
    { present: true, nativeType: "resref" },
    { present: true, nativeType: "cexostring", value: "nw_dwarfmerc001" },
    { present: true, nativeType: "resref", value: "NW_DWARFMERC001" },
    { present: true, nativeType: "resref", value: "nw_dwarfmerc001", extra: true },
    { present: false, value: "nw_dwarfmerc001" },
  ])("rejects malformed storage %#", (value) => {
    expect(readCreatureTemplateResRefStorage(value)).toBeNull();
  });
});

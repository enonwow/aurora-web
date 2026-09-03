import { describe, expect, it } from "vitest";

import {
  CREATURE_SPECIAL_IDENTITY_STRING_MAX_CODE_UNITS,
  isCreatureSpecialIdentityString,
  readCreatureSpecialIdentityStringsProvenance,
  readCreatureSpecialIdentityStringsStorage,
} from "../../../../../src/modules/scene/domain/creatureSpecialIdentityStrings";

describe("Creature Subrace/Deity identity strings", () => {
  it.each(["", "Moon Elf", "Mystra", " ".repeat(256)])(
    "admits the bounded printable ASCII product profile %#",
    (value) => expect(isCreatureSpecialIdentityString(value)).toBe(true),
  );

  it.each(["x".repeat(257), "Moon\nElf", "Selûne", 3, null])(
    "rejects a value outside the product profile %#",
    (value) => expect(isCreatureSpecialIdentityString(value)).toBe(false),
  );

  it("reads one exact presence-sensitive native storage group", () => {
    const storage = readCreatureSpecialIdentityStringsStorage({
      subrace: { present: true, nativeType: "cexostring", value: "Moon Elf" },
      deity: { present: false },
    });
    expect(storage).toEqual({
      subrace: { present: true, nativeType: "cexostring", value: "Moon Elf" },
      deity: { present: false },
    });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(readCreatureSpecialIdentityStringsStorage({
      subrace: { present: true, nativeType: "cexolocstring", value: "Moon Elf" },
      deity: { present: false },
    })).toBeNull();
  });

  it("reads a non-empty exact provenance subset and rejects unknown keys", () => {
    const provenance = readCreatureSpecialIdentityStringsProvenance({
      subrace: { expectedValue: "Moon Elf" },
      deity: { expectedValue: "" },
    });
    expect(provenance).toEqual({
      subrace: { expectedValue: "Moon Elf" },
      deity: { expectedValue: "" },
    });
    expect(Object.isFrozen(provenance?.subrace)).toBe(true);
    expect(readCreatureSpecialIdentityStringsProvenance({})).toBeNull();
    expect(readCreatureSpecialIdentityStringsProvenance({
      subrace: { expectedValue: "Moon Elf" },
      extra: true,
    })).toBeNull();
    expect(CREATURE_SPECIAL_IDENTITY_STRING_MAX_CODE_UNITS).toBe(256);
  });
});

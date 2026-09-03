import { describe, expect, it } from "vitest";

import {
  canEditExistingCreatureSpecialIdentityString,
  materializeExistingCreatureSpecialIdentityStrings,
  reduceExistingCreatureSpecialIdentityString,
} from "../../../../../src/modules/layout/application/creatureSpecialIdentityStringsProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  sourceObjectId: "obj_cre_guard",
  creatureSpecialIdentityStrings: {
    subrace: { expectedValue: "Moon Elf" },
    deity: { expectedValue: "" },
  },
};

describe("existing Creature Subrace/Deity provenance", () => {
  it("authorizes each field only through its own exact ordinal-bound provenance", () => {
    expect(canEditExistingCreatureSpecialIdentityString(exactSource, "subrace")).toBe(true);
    expect(canEditExistingCreatureSpecialIdentityString(exactSource, "deity")).toBe(true);
    expect(canEditExistingCreatureSpecialIdentityString({
      ...exactSource,
      creatureSpecialIdentityStrings: { subrace: { expectedValue: "Moon Elf" } },
    }, "deity")).toBe(false);
    expect(canEditExistingCreatureSpecialIdentityString({ ...exactSource, sourceIndex: undefined }, "subrace"))
      .toBe(false);
    expect(canEditExistingCreatureSpecialIdentityString({ ...exactSource, sourceKind: "placeable" }, "subrace"))
      .toBe(false);
  });

  it("reduces only admitted values for the authorized member", () => {
    expect(reduceExistingCreatureSpecialIdentityString(exactSource, "subrace", "Moon Elf", "Sun Elf"))
      .toBe("Sun Elf");
    expect(reduceExistingCreatureSpecialIdentityString(exactSource, "subrace", "Moon Elf", "Sun\nElf"))
      .toBe("Moon Elf");
    expect(reduceExistingCreatureSpecialIdentityString({
      ...exactSource,
      creatureSpecialIdentityStrings: { deity: { expectedValue: "" } },
    }, "subrace", "Moon Elf", "Sun Elf")).toBe("Moon Elf");
  });

  it("materializes only authorized members and preserves unrelated Advanced settings", () => {
    const current = { factionId: 1, subrace: "Moon Elf", deity: "" };
    expect(materializeExistingCreatureSpecialIdentityStrings(
      exactSource,
      current,
      { subrace: "Sun Elf", deity: "Mystra" },
    )).toEqual({ factionId: 1, subrace: "Sun Elf", deity: "Mystra" });
    expect(materializeExistingCreatureSpecialIdentityStrings(
      { ...exactSource, creatureSpecialIdentityStrings: { deity: { expectedValue: "" } } },
      current,
      { subrace: "must stay ignored", deity: "Selune" },
    )).toEqual({ factionId: 1, subrace: "Moon Elf", deity: "Selune" });
    expect(materializeExistingCreatureSpecialIdentityStrings(exactSource, undefined, {
      subrace: "Sun Elf",
      deity: "Mystra",
    })).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import {
  canEditExistingEncounterLocalizedName,
  materializeExistingEncounterLocalizedName,
  readExistingEncounterLocalizedName,
  reduceExistingEncounterLocalizedName,
} from "../../../../../src/modules/layout/application/encounterLocalizedNameProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "encounter",
    sourceIndex: 0,
    encounterLocalizedNameStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
    },
  };
}

describe("existing Encounter LocalizedName provenance", () => {
  it("admits only exact retained inline ASCII storage", () => {
    expect(readExistingEncounterLocalizedName(exactSource())).toBe("Gnoll Ambush");
    expect(canEditExistingEncounterLocalizedName(exactSource())).toBe(true);
    expect(canEditExistingEncounterLocalizedName({
      ...exactSource(),
      encounterLocalizedNameStorage: {
        present: true,
        strRef: 91345,
        entries: [],
      },
    })).toBe(false);
  });

  it("reduces and materializes verbatim bounded ASCII while preserving unsupported input", () => {
    expect(reduceExistingEncounterLocalizedName(
      exactSource(),
      "Gnoll Ambush",
      " Night Ambush ",
    )).toBe(" Night Ambush ");
    expect(reduceExistingEncounterLocalizedName(
      exactSource(),
      "Gnoll Ambush",
      "Żółć",
    )).toBe("Gnoll Ambush");
    expect(materializeExistingEncounterLocalizedName(
      exactSource(),
      "Gnoll Ambush",
      "Night Ambush",
    )).toBe("Night Ambush");
    expect(materializeExistingEncounterLocalizedName(
      { ...exactSource(), sourceKind: "trigger" },
      "Gnoll Ambush",
      "Night Ambush",
    )).toBe("Gnoll Ambush");
  });
});

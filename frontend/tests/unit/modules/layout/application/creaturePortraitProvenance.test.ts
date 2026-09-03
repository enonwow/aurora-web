import { describe, expect, it } from "vitest";
import {
  materializeExistingCreaturePortrait,
  readExistingCreaturePortraitProvenance,
} from "../../../../../src/modules/layout/application/creaturePortraitProvenance";

const descriptor = {
  resourceName: "portraits.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
  sourceLayer: "vanilla" as const,
  sha256: "a".repeat(64),
  sizeBytes: 100_000,
  rowCount: 16_001,
};

const catalog = {
  descriptor,
  rows: [
    { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 as const },
    { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 as const },
    { rowIndex: 12, baseResRef: "po_hf_guard", sex: 1, race: 6, plot: 0 as const },
  ],
};

const source = {
  type: "aurora_git" as const,
  sourceKind: "creature" as const,
  sourceIndex: 0,
  creaturePortrait: {
    present: true as const,
    nativeType: "word" as const,
    value: 10,
    selectorContext: { genderValue: 0, raceValue: 4 },
    table: { ...descriptor, rowIndex: 10, baseResRef: "po_hm_guard" },
  },
};

describe("Creature PortraitId draft provenance", () => {
  it("materializes row identity and display ResRef together", () => {
    expect(materializeExistingCreaturePortrait(
      source,
      { portraitId: 10, portraitResRef: "po_hm_guard", untouched: true },
      11,
      catalog,
    )).toEqual({ portraitId: 11, portraitResRef: "po_em_guard", untouched: true });
  });

  it("keeps the draft unchanged for an unadmitted or stale candidate", () => {
    const current = { portraitId: 10, portraitResRef: "po_hm_guard" };
    expect(materializeExistingCreaturePortrait(source, current, 12, catalog)).toBe(current);
    expect(materializeExistingCreaturePortrait(source, current, 11, {
      ...catalog,
      descriptor: { ...descriptor, sha256: "b".repeat(64) },
    })).toBe(current);
  });

  it("retains exact CAS and selector-context provenance", () => {
    expect(readExistingCreaturePortraitProvenance(source)).toEqual({
      expectedValue: 10,
      sourceBaseResRef: "po_hm_guard",
      tableSha256: "a".repeat(64),
      tableRowCount: 16_001,
      genderExpectedValue: 0,
      raceExpectedValue: 4,
    });
  });
});

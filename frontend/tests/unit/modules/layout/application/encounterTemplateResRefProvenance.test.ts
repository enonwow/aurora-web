import { describe, expect, it } from "vitest";
import {
  canEditExistingEncounterTemplateResRef,
  materializeExistingEncounterTemplateResRef,
  reduceExistingEncounterTemplateResRef,
} from "../../../../../src/modules/layout/application/encounterTemplateResRefProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

const exactSource = {
  type: "aurora_git",
  sourceKind: "encounter",
  sourceIndex: 0,
  encounterTemplateResRef: {
    present: true,
    nativeType: "resref",
    value: "x2_gnoll001",
  },
} as unknown as SceneObjectSourceMetadata;

describe("existing Encounter TemplateResRef provenance", () => {
  it("activates only exact present native Encounter provenance", () => {
    expect(canEditExistingEncounterTemplateResRef(exactSource)).toBe(true);
    expect(canEditExistingEncounterTemplateResRef({
      ...exactSource,
      encounterTemplateResRef: { present: false },
    } as SceneObjectSourceMetadata)).toBe(false);
    expect(canEditExistingEncounterTemplateResRef({
      ...exactSource,
      sourceKind: "creature",
    })).toBe(false);
    expect(canEditExistingEncounterTemplateResRef({
      ...exactSource,
      sourceIndex: undefined,
    })).toBe(false);
  });

  it("reduces and materializes only admitted canonical targets", () => {
    expect(reduceExistingEncounterTemplateResRef(
      exactSource,
      "x2_gnoll001",
      "custom_encounter",
    )).toBe("custom_encounter");
    expect(reduceExistingEncounterTemplateResRef(
      exactSource,
      "x2_gnoll001",
      "CUSTOM_ENCOUNTER",
    )).toBe("x2_gnoll001");
    expect(materializeExistingEncounterTemplateResRef(
      { ...exactSource, encounterTemplateResRef: { present: false } } as SceneObjectSourceMetadata,
      "x2_gnoll001",
      "custom_encounter",
    )).toBe("x2_gnoll001");
  });
});

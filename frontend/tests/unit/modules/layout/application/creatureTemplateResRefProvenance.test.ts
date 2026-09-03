import { describe, expect, it } from "vitest";

import {
  canEditExistingCreatureTemplateResRef,
  materializeExistingCreatureTemplateResRef,
  reduceExistingCreatureTemplateResRef,
} from "../../../../../src/modules/layout/application/creatureTemplateResRefProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureTemplateResRef: { expectedResRef: "nw_dwarfmerc001" },
};

describe("existing Creature TemplateResRef provenance", () => {
  it("activates only exact retained Creature provenance", () => {
    expect(canEditExistingCreatureTemplateResRef(exactSource)).toBe(true);
    expect(canEditExistingCreatureTemplateResRef({ ...exactSource, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingCreatureTemplateResRef({ ...exactSource, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureTemplateResRef({
      ...exactSource,
      creatureTemplateResRef: { expectedResRef: "NW_DWARFMERC001" },
    })).toBe(false);
    expect(canEditExistingCreatureTemplateResRef(undefined)).toBe(false);
  });

  it("reduces only admitted targets verbatim", () => {
    expect(reduceExistingCreatureTemplateResRef(
      exactSource,
      "nw_dwarfmerc001",
      "nw_dwarfmerc002",
    )).toBe("nw_dwarfmerc002");
    expect(reduceExistingCreatureTemplateResRef(
      exactSource,
      "nw_dwarfmerc001",
      "NW_DWARFMERC002",
    )).toBe("nw_dwarfmerc001");
  });

  it("materializes only blueprintResRef and preserves every sibling", () => {
    const current = { blueprintResRef: "nw_dwarfmerc001", faction: "Hostile", factionId: 1 };
    expect(materializeExistingCreatureTemplateResRef(
      exactSource,
      current,
      "nw_dwarfmerc002",
    )).toEqual({ ...current, blueprintResRef: "nw_dwarfmerc002" });
    expect(materializeExistingCreatureTemplateResRef(exactSource, current, "bad-resref")).toBe(current);
    expect(materializeExistingCreatureTemplateResRef(
      { ...exactSource, type: "seed" },
      current,
      "nw_dwarfmerc002",
    )).toBe(current);
    expect(materializeExistingCreatureTemplateResRef(
      exactSource,
      undefined,
      "nw_dwarfmerc002",
    )).toBeUndefined();
  });
});

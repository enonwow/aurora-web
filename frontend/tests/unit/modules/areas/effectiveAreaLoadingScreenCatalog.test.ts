import { describe, expect, it } from "vitest";
import {
  cloneEffectiveAreaLoadingScreenCatalog,
  isEffectiveAreaLoadingScreenCatalog,
  resolveEffectiveAreaLoadingScreenOptions,
} from "../../../../src/modules/areas/domain/effectiveAreaLoadingScreenCatalog";
import { effectiveAreaLoadingScreenCatalog } from "./areaLoadingScreenCatalogFixture";

describe("effective Area loading-screen catalog", () => {
  it("admits, deeply clones, and freezes one exact bounded physical-row catalog", () => {
    const source = effectiveAreaLoadingScreenCatalog();
    expect(isEffectiveAreaLoadingScreenCatalog(source)).toBe(true);

    const clone = cloneEffectiveAreaLoadingScreenCatalog(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.rows).not.toBe(source.rows);
    expect(clone.rows[0]?.imageAsset).not.toBe(source.rows[0]?.imageAsset);
    expect(Object.isFrozen(clone.rows[0]?.imageAsset)).toBe(true);
  });

  it.each([
    ["unknown root key", { extra: true }],
    ["nonphysical row index", { rows: [{ rowIndex: 4 }] }],
    ["mismatched image identity", { rows: [{ rowIndex: 1, imageAsset: { resourceName: "wrong.tga" } }] }],
    ["missing asset on selectable row", { rows: [{ rowIndex: 1, toolsetSelectable: true, imageAsset: undefined }] }],
  ])("rejects %s", (_label, mutation) => {
    const source = effectiveAreaLoadingScreenCatalog();
    const candidate: Record<string, unknown> = structuredClone(source) as unknown as Record<string, unknown>;
    if ("extra" in mutation) candidate.extra = true;
    if ("rows" in mutation) {
      const rowMutation = mutation.rows?.[0];
      candidate.rows = (candidate.rows as Array<Record<string, unknown>>).map((row, rowIndex) =>
        rowIndex === 1 ? { ...row, ...rowMutation } : row);
    }
    expect(isEffectiveAreaLoadingScreenCatalog(candidate)).toBe(false);
  });

  it("builds default and Toolset-selectable options and retains the unresolved current Word", () => {
    const catalog = effectiveAreaLoadingScreenCatalog();
    expect(resolveEffectiveAreaLoadingScreenOptions(catalog, 2)).toEqual([
      expect.objectContaining({ value: 0, state: "selectable", displayName: "Default" }),
      expect.objectContaining({ value: 1, state: "selectable", displayName: "City gates" }),
      expect.objectContaining({ value: 2, state: "retained", displayName: "Missing image" }),
    ]);
    const unresolved = resolveEffectiveAreaLoadingScreenOptions(catalog, 65_535);
    expect(unresolved).toEqual([
      expect.objectContaining({ value: 0, state: "selectable" }),
      expect.objectContaining({ value: 1, state: "selectable" }),
      expect.objectContaining({
        value: 65_535,
        state: "retained",
        displayName: "Row 65535",
      }),
    ]);
    expect(unresolved[2]).not.toHaveProperty("row");
  });
});

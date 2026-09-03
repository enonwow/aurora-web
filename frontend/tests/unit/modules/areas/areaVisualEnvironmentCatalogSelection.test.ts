import { describe, expect, it } from "vitest";
import {
  areaVisualEnvironmentCatalogSelectionsEqual,
  cloneAreaVisualEnvironmentCatalogSelection,
  isAreaVisualEnvironmentCatalogSelection,
} from "../../../../src/modules/areas/domain/areaVisualEnvironmentCatalogSelection";

describe("Area visual-environment catalog selection", () => {
  it.each([
    { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
    { lightingSchemeRowIndex: 255, skyBoxRowIndex: 255 },
  ])("admits exact native Byte pair %#", (value) => {
    expect(isAreaVisualEnvironmentCatalogSelection(value)).toBe(true);
  });

  it.each([
    null,
    { lightingSchemeRowIndex: 0 },
    { lightingSchemeRowIndex: -1, skyBoxRowIndex: 0 },
    { lightingSchemeRowIndex: 0, skyBoxRowIndex: 256 },
    { lightingSchemeRowIndex: 0.5, skyBoxRowIndex: 0 },
    { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0, guessed: true },
  ])("rejects malformed pair %#", (value) => {
    expect(isAreaVisualEnvironmentCatalogSelection(value)).toBe(false);
  });

  it("clones and compares the complete pair", () => {
    const source = { lightingSchemeRowIndex: 2, skyBoxRowIndex: 1 };
    const clone = cloneAreaVisualEnvironmentCatalogSelection(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(areaVisualEnvironmentCatalogSelectionsEqual(source, clone)).toBe(true);
    expect(areaVisualEnvironmentCatalogSelectionsEqual(source, {
      ...clone,
      skyBoxRowIndex: 2,
    })).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createCreatureAppearancePaletteFacade } from "../../../../src/modules/creatures/application/creatureAppearancePaletteFacade";
import type { CreatureAppearancePalettePort } from "../../../../src/modules/creatures/ports/creatureAppearancePalettePort";

describe("createCreatureAppearancePaletteFacade", () => {
  it("exposes immutable palette queries and delegates exact Aurora indices", async () => {
    const ensureLoaded = vi.fn(async () => true);
    const resolveRgba = vi.fn(() => [12, 34, 56, 255] as const);
    const port: CreatureAppearancePalettePort = {
      rowMax: 175,
      ensureLoaded,
      resolveRgba,
    };

    const facade = createCreatureAppearancePaletteFacade(port);

    await expect(facade.queries.ensureLoaded()).resolves.toBe(true);
    expect(facade.queries.resolveRgba(8, 44, 192)).toEqual([
      12,
      34,
      56,
      255,
    ]);
    expect(ensureLoaded).toHaveBeenCalledTimes(1);
    expect(resolveRgba).toHaveBeenCalledWith(8, 44, 192);
    expect(facade.rowMax).toBe(175);
    expect(Object.isFrozen(facade)).toBe(true);
    expect(Object.isFrozen(facade.queries)).toBe(true);
  });

  it("fails fast when a palette adapter exposes an invalid row maximum", () => {
    const port: CreatureAppearancePalettePort = {
      rowMax: -1,
      ensureLoaded: vi.fn(async () => false),
      resolveRgba: vi.fn(() => null),
    };

    expect(() => createCreatureAppearancePaletteFacade(port)).toThrow(
      "Creature appearance palette rowMax must be a non-negative integer.",
    );
  });
});

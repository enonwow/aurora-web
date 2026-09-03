import type {
  CreatureAppearancePalettePort,
  CreatureAppearancePaletteRgba,
} from "../ports/creatureAppearancePalettePort";

export interface CreatureAppearancePaletteQueries {
  ensureLoaded(): Promise<boolean>;
  resolveRgba(
    layerIndex: number,
    row: number,
    colorIndex: number,
  ): CreatureAppearancePaletteRgba | null;
}

export interface CreatureAppearancePaletteFacade {
  readonly rowMax: number;
  readonly queries: CreatureAppearancePaletteQueries;
}

export function createCreatureAppearancePaletteFacade(
  port: CreatureAppearancePalettePort,
): CreatureAppearancePaletteFacade {
  if (!Number.isInteger(port.rowMax) || port.rowMax < 0) {
    throw new Error("Creature appearance palette rowMax must be a non-negative integer.");
  }

  const queries = Object.freeze<CreatureAppearancePaletteQueries>({
    ensureLoaded: () => port.ensureLoaded(),
    resolveRgba: (layerIndex, row, colorIndex) =>
      port.resolveRgba(layerIndex, row, colorIndex),
  });

  return Object.freeze({
    rowMax: port.rowMax,
    queries,
  });
}

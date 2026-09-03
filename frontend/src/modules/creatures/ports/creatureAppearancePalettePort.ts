export type CreatureAppearancePaletteRgba = readonly [
  red: number,
  green: number,
  blue: number,
  alpha: number,
];

export interface CreatureAppearancePalettePort {
  readonly rowMax: number;
  ensureLoaded(): Promise<boolean>;
  resolveRgba(
    layerIndex: number,
    row: number,
    colorIndex: number,
  ): CreatureAppearancePaletteRgba | null;
}

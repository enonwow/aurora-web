import {
  AURORA_PLT_PALETTE_ROW_MAX,
  ensureAuroraPltPaletteDataLoaded,
  resolveAuroraPltPaletteRgbaSync,
} from "../../placeables/adapters/aurora/auroraPltPalette";
import { createCreatureAppearancePaletteFacade } from "../application/creatureAppearancePaletteFacade";
import type { CreatureAppearancePalettePort } from "../ports/creatureAppearancePalettePort";

const browserCreatureAppearancePalettePort = Object.freeze<CreatureAppearancePalettePort>({
  rowMax: AURORA_PLT_PALETTE_ROW_MAX,
  ensureLoaded: ensureAuroraPltPaletteDataLoaded,
  resolveRgba: resolveAuroraPltPaletteRgbaSync,
});

export function createBrowserCreatureAppearancePaletteFacade() {
  return createCreatureAppearancePaletteFacade(
    browserCreatureAppearancePalettePort,
  );
}

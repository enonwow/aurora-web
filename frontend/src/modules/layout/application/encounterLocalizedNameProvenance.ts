import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  isEncounterLocalizedNameInlineAsciiText,
  readExistingEncounterLocalizedNameSourceValue,
} from "../../scene/domain/encounterLocalizedName";

export function readExistingEncounterLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return readExistingEncounterLocalizedNameSourceValue(source);
}

export function canEditExistingEncounterLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingEncounterLocalizedName(source) !== undefined;
}

export function reduceExistingEncounterLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingEncounterLocalizedName(source) &&
    isEncounterLocalizedNameInlineAsciiText(candidate)
    ? candidate
    : current;
}

export function materializeExistingEncounterLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
  candidate: unknown,
): string | undefined {
  return canEditExistingEncounterLocalizedName(source) &&
    isEncounterLocalizedNameInlineAsciiText(candidate)
    ? candidate
    : current;
}

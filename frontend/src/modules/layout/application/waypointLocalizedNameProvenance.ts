import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingWaypointLocalizedName as canEditExactWaypointLocalizedName,
  isWaypointLocalizedNameInlineAsciiText,
  readExistingWaypointLocalizedNameSourceValue,
} from "../../scene/domain/waypointLocalizedName";

export function readExistingWaypointLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return readExistingWaypointLocalizedNameSourceValue(source);
}

export function canEditExistingWaypointLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return canEditExactWaypointLocalizedName(source);
}

export function reduceExistingWaypointLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingWaypointLocalizedName(source) &&
    isWaypointLocalizedNameInlineAsciiText(candidate)
    ? candidate
    : current;
}

export function materializeExistingWaypointLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
  candidate: unknown,
): string | undefined {
  return canEditExistingWaypointLocalizedName(source) &&
    isWaypointLocalizedNameInlineAsciiText(candidate)
    ? candidate
    : current;
}

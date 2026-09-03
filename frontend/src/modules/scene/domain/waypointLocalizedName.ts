import type {
  SceneObjectNativeLocalizedStringStorage,
  SceneObjectSourceMetadata,
} from "../contracts";
import {
  cloneNativeLocalizedStringStorage,
  isNativeInlineAsciiText,
  readNativeInlineAsciiStorage,
  readNativeLocalizedStringStorage,
} from "./nativeLocalizedStringStorage";

export const MAX_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES = 256;

export function readWaypointLocalizedNameStorage(
  value: unknown,
): SceneObjectNativeLocalizedStringStorage | undefined {
  return readNativeLocalizedStringStorage(value);
}

export function cloneWaypointLocalizedNameStorage(
  value: SceneObjectNativeLocalizedStringStorage,
): SceneObjectNativeLocalizedStringStorage {
  return cloneNativeLocalizedStringStorage(value);
}

export function readWaypointLocalizedNameInlineAsciiStorage(
  value: unknown,
): string | undefined {
  return readNativeInlineAsciiStorage(
    value,
    MAX_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function isWaypointLocalizedNameInlineAsciiText(
  value: unknown,
): value is string {
  return isNativeInlineAsciiText(
    value,
    MAX_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function readExistingWaypointLocalizedNameSourceValue(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return source?.type === "aurora_git" &&
    source.sourceKind === "waypoint" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0
    ? readWaypointLocalizedNameInlineAsciiStorage(
        source.waypointLocalizedNameStorage,
      )
    : undefined;
}

export function canEditExistingWaypointLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingWaypointLocalizedNameSourceValue(source) !== undefined;
}

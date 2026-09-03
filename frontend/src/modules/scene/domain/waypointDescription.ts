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

export const MAX_WAYPOINT_DESCRIPTION_ASCII_BYTES = 4096;

export function readWaypointDescriptionStorage(
  value: unknown,
): SceneObjectNativeLocalizedStringStorage | undefined {
  return readNativeLocalizedStringStorage(value);
}

export function cloneWaypointDescriptionStorage(
  value: SceneObjectNativeLocalizedStringStorage,
): SceneObjectNativeLocalizedStringStorage {
  return cloneNativeLocalizedStringStorage(value);
}

export function readWaypointDescriptionInlineAsciiStorage(
  value: unknown,
): string | undefined {
  return readNativeInlineAsciiStorage(
    value,
    MAX_WAYPOINT_DESCRIPTION_ASCII_BYTES,
  );
}

export function isWaypointDescriptionInlineAsciiText(
  value: unknown,
): value is string {
  return isNativeInlineAsciiText(
    value,
    MAX_WAYPOINT_DESCRIPTION_ASCII_BYTES,
  );
}

export function readExistingWaypointDescriptionSourceValue(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return source?.type === "aurora_git" &&
    source.sourceKind === "waypoint" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0
    ? readWaypointDescriptionInlineAsciiStorage(
        source.waypointDescriptionStorage,
      )
    : undefined;
}

export function canEditExistingWaypointDescription(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingWaypointDescriptionSourceValue(source) !== undefined;
}

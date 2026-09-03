import {
  buildAreaInlineAsciiStorage,
  isAreaInlineAsciiText,
  readAreaInlineAsciiStorage,
} from "./area-inline-ascii-localized-string-mutation";
import {
  cloneAreaLocalizedStringStorage,
  readAreaLocalizedStringStorage,
  type AreaLocalizedStringStorage,
} from "./area-localized-string-storage";

export const MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES = 256;

export type AreaWaypointLocalizedNameStorage = AreaLocalizedStringStorage;

export interface ExistingAreaWaypointLocalizedNameMutation {
  readonly expectedValue: string;
  readonly value: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => (
    Object.prototype.hasOwnProperty.call(value, key)
  ));
}

export function readAreaWaypointLocalizedNameStorage(
  value: unknown,
): AreaWaypointLocalizedNameStorage | undefined {
  return readAreaLocalizedStringStorage(value);
}

export function cloneAreaWaypointLocalizedNameStorage(
  value: AreaWaypointLocalizedNameStorage,
): AreaWaypointLocalizedNameStorage {
  return cloneAreaLocalizedStringStorage(value);
}

export function readAreaWaypointLocalizedNameInlineAsciiStorage(
  value: unknown,
): string | undefined {
  return readAreaInlineAsciiStorage(
    value,
    MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function buildAreaWaypointLocalizedNameInlineAsciiStorage(
  value: unknown,
): AreaWaypointLocalizedNameStorage | undefined {
  return buildAreaInlineAsciiStorage(
    value,
    MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function isAreaWaypointLocalizedNameInlineAsciiText(
  value: unknown,
): value is string {
  return isAreaInlineAsciiText(
    value,
    MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function readExistingAreaWaypointLocalizedNameMutation(
  value: unknown,
): ExistingAreaWaypointLocalizedNameMutation | null {
  if (!isRecord(value) || !hasExactKeys(value, ["expectedValue", "value"])) {
    return null;
  }
  if (
    !isAreaInlineAsciiText(
      value.expectedValue,
      MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
    )
    || !isAreaInlineAsciiText(
      value.value,
      MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
    )
    || value.expectedValue === value.value
  ) {
    return null;
  }
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
  });
}

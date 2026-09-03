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

export const MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES = 4096;

export interface AreaWaypointMapNoteStorage {
  readonly hasMapNoteByte: 0 | 1;
  readonly mapNoteStorage: AreaLocalizedStringStorage;
  readonly mapNoteEnabledByte: 0 | 1;
}

export interface AreaWaypointMapNoteValue {
  readonly hasMapNote: boolean;
  readonly mapNoteText: string;
  readonly mapNoteEnabled: boolean;
}

export interface ExistingAreaWaypointMapNoteMutation {
  readonly expectedValue: AreaWaypointMapNoteValue;
  readonly value: AreaWaypointMapNoteValue;
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

function isBinaryByte(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

export function readAreaWaypointMapNoteStorage(
  value: unknown,
): AreaWaypointMapNoteStorage | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    "hasMapNoteByte",
    "mapNoteStorage",
    "mapNoteEnabledByte",
  ])) return undefined;
  const mapNoteStorage = readAreaLocalizedStringStorage(value.mapNoteStorage);
  if (
    !isBinaryByte(value.hasMapNoteByte)
    || !mapNoteStorage
    || !isBinaryByte(value.mapNoteEnabledByte)
  ) return undefined;
  return Object.freeze({
    hasMapNoteByte: value.hasMapNoteByte,
    mapNoteStorage: cloneAreaLocalizedStringStorage(mapNoteStorage),
    mapNoteEnabledByte: value.mapNoteEnabledByte,
  });
}

export function cloneAreaWaypointMapNoteStorage(
  value: AreaWaypointMapNoteStorage,
): AreaWaypointMapNoteStorage {
  return Object.freeze({
    hasMapNoteByte: value.hasMapNoteByte,
    mapNoteStorage: cloneAreaLocalizedStringStorage(value.mapNoteStorage),
    mapNoteEnabledByte: value.mapNoteEnabledByte,
  });
}

export function readAreaWaypointMapNoteInlineAsciiValue(
  value: unknown,
): AreaWaypointMapNoteValue | undefined {
  const storage = readAreaWaypointMapNoteStorage(value);
  if (!storage) return undefined;
  const mapNoteText = readAreaInlineAsciiStorage(
    storage.mapNoteStorage,
    MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES,
  );
  if (mapNoteText === undefined) return undefined;
  return Object.freeze({
    hasMapNote: storage.hasMapNoteByte === 1,
    mapNoteText,
    mapNoteEnabled: storage.mapNoteEnabledByte === 1,
  });
}

export function buildAreaWaypointMapNoteInlineAsciiStorage(
  value: unknown,
): AreaWaypointMapNoteStorage | undefined {
  const parsed = readAreaWaypointMapNoteValue(value);
  if (!parsed) return undefined;
  const mapNoteStorage = buildAreaInlineAsciiStorage(
    parsed.mapNoteText,
    MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES,
  );
  if (!mapNoteStorage) return undefined;
  return Object.freeze({
    hasMapNoteByte: parsed.hasMapNote ? 1 : 0,
    mapNoteStorage,
    mapNoteEnabledByte: parsed.mapNoteEnabled ? 1 : 0,
  });
}

export function readAreaWaypointMapNoteValue(
  value: unknown,
): AreaWaypointMapNoteValue | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    "hasMapNote",
    "mapNoteText",
    "mapNoteEnabled",
  ])) return undefined;
  if (
    typeof value.hasMapNote !== "boolean"
    || !isAreaInlineAsciiText(value.mapNoteText, MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES)
    || typeof value.mapNoteEnabled !== "boolean"
  ) return undefined;
  return Object.freeze({
    hasMapNote: value.hasMapNote,
    mapNoteText: value.mapNoteText,
    mapNoteEnabled: value.mapNoteEnabled,
  });
}

export function readExistingAreaWaypointMapNoteMutation(
  value: unknown,
): ExistingAreaWaypointMapNoteMutation | null {
  if (!isRecord(value) || !hasExactKeys(value, ["expectedValue", "value"])) return null;
  const expectedValue = readAreaWaypointMapNoteValue(value.expectedValue);
  const targetValue = readAreaWaypointMapNoteValue(value.value);
  if (!expectedValue || !targetValue || mapNoteValuesEqual(expectedValue, targetValue)) {
    return null;
  }
  return Object.freeze({ expectedValue, value: targetValue });
}

export function mapNoteValuesEqual(
  left: AreaWaypointMapNoteValue,
  right: AreaWaypointMapNoteValue,
): boolean {
  return left.hasMapNote === right.hasMapNote
    && left.mapNoteText === right.mapNoteText
    && left.mapNoteEnabled === right.mapNoteEnabled;
}

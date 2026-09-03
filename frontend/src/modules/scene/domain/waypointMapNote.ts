import type {
  SceneObjectSourceMetadata,
  SceneObjectWaypointMapNoteStorage,
  SceneObjectWaypointMapNoteValue,
} from "../contracts";
import {
  cloneNativeLocalizedStringStorage,
  isNativeInlineAsciiText,
  readNativeInlineAsciiStorage,
  readNativeLocalizedStringStorage,
} from "./nativeLocalizedStringStorage";

export const MAX_WAYPOINT_MAP_NOTE_ASCII_BYTES = 4096;

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

export function readWaypointMapNoteStorage(
  value: unknown,
): SceneObjectWaypointMapNoteStorage | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    "hasMapNoteByte",
    "mapNoteStorage",
    "mapNoteEnabledByte",
  ])) return undefined;
  const mapNoteStorage = readNativeLocalizedStringStorage(value.mapNoteStorage);
  if (
    !isBinaryByte(value.hasMapNoteByte) ||
    !mapNoteStorage ||
    !isBinaryByte(value.mapNoteEnabledByte)
  ) return undefined;
  return Object.freeze({
    hasMapNoteByte: value.hasMapNoteByte,
    mapNoteStorage: cloneNativeLocalizedStringStorage(mapNoteStorage),
    mapNoteEnabledByte: value.mapNoteEnabledByte,
  });
}

export function cloneWaypointMapNoteStorage(
  value: SceneObjectWaypointMapNoteStorage,
): SceneObjectWaypointMapNoteStorage {
  return Object.freeze({
    hasMapNoteByte: value.hasMapNoteByte,
    mapNoteStorage: cloneNativeLocalizedStringStorage(value.mapNoteStorage),
    mapNoteEnabledByte: value.mapNoteEnabledByte,
  });
}

export function readWaypointMapNoteValue(
  value: unknown,
): SceneObjectWaypointMapNoteValue | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    "hasMapNote",
    "mapNoteText",
    "mapNoteEnabled",
  ])) return undefined;
  if (
    typeof value.hasMapNote !== "boolean" ||
    !isNativeInlineAsciiText(value.mapNoteText, MAX_WAYPOINT_MAP_NOTE_ASCII_BYTES) ||
    typeof value.mapNoteEnabled !== "boolean"
  ) return undefined;
  return Object.freeze({
    hasMapNote: value.hasMapNote,
    mapNoteText: value.mapNoteText,
    mapNoteEnabled: value.mapNoteEnabled,
  });
}

export function readWaypointMapNoteInlineAsciiValue(
  value: unknown,
): SceneObjectWaypointMapNoteValue | undefined {
  const storage = readWaypointMapNoteStorage(value);
  if (!storage) return undefined;
  const mapNoteText = readNativeInlineAsciiStorage(
    storage.mapNoteStorage,
    MAX_WAYPOINT_MAP_NOTE_ASCII_BYTES,
  );
  if (mapNoteText === undefined) return undefined;
  return Object.freeze({
    hasMapNote: storage.hasMapNoteByte === 1,
    mapNoteText,
    mapNoteEnabled: storage.mapNoteEnabledByte === 1,
  });
}

export function cloneWaypointMapNoteValue(
  value: SceneObjectWaypointMapNoteValue,
): SceneObjectWaypointMapNoteValue {
  return Object.freeze({ ...value });
}

export function waypointMapNoteValuesEqual(
  left: SceneObjectWaypointMapNoteValue,
  right: SceneObjectWaypointMapNoteValue,
): boolean {
  return left.hasMapNote === right.hasMapNote &&
    left.mapNoteText === right.mapNoteText &&
    left.mapNoteEnabled === right.mapNoteEnabled;
}

export function readExistingWaypointMapNoteSourceValue(
  source: SceneObjectSourceMetadata | undefined,
): SceneObjectWaypointMapNoteValue | undefined {
  return source?.type === "aurora_git" &&
    source.sourceKind === "waypoint" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0
    ? readWaypointMapNoteInlineAsciiValue(source.waypointMapNoteStorage)
    : undefined;
}

export function canEditExistingWaypointMapNote(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingWaypointMapNoteSourceValue(source) !== undefined;
}

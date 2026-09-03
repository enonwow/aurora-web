import type { SceneObjectCreatureClassLevelState } from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_OPAQUE_SIBLING_FIELDS = 65_535;
const STORAGE_KEYS = [
  "present", "nativeType", "structTypeId", "classNativeType", "levelNativeType",
  "entries",
] as const;
const ENTRY_KEYS = ["classId", "level", "opaqueSiblingFieldCount"] as const;

export function readCreatureClassLevelState(
  value: unknown,
): SceneObjectCreatureClassLevelState | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactRecordKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  if (!hasExactRecordKeys(value, STORAGE_KEYS) || value.present !== true ||
    value.nativeType !== "list" || value.structTypeId !== 2 ||
    value.classNativeType !== "int" || value.levelNativeType !== "short" ||
    !Array.isArray(value.entries) || value.entries.length < 1 ||
    value.entries.length > MAX_CLASS_SLOTS) return null;

  const entries: Array<{
    classId: number;
    level: number;
    opaqueSiblingFieldCount: number;
  }> = [];
  for (const entry of value.entries) {
    if (!isPlainRecord(entry) || !hasExactRecordKeys(entry, ENTRY_KEYS) ||
      !Number.isSafeInteger(entry.classId) || Number(entry.classId) < 0 ||
      Number(entry.classId) > INT_MAX || !Number.isSafeInteger(entry.level) ||
      Number(entry.level) < 1 || Number(entry.level) > MAX_CLASS_LEVEL ||
      !Number.isSafeInteger(entry.opaqueSiblingFieldCount) ||
      Number(entry.opaqueSiblingFieldCount) < 0 ||
      Number(entry.opaqueSiblingFieldCount) > MAX_OPAQUE_SIBLING_FIELDS) return null;
    entries.push(Object.freeze({
      classId: Number(entry.classId),
      level: Number(entry.level),
      opaqueSiblingFieldCount: Number(entry.opaqueSiblingFieldCount),
    }));
  }
  if (new Set(entries.map((entry) => entry.classId)).size !== entries.length ||
    entries.reduce((sum, entry) => sum + entry.level, 0) > MAX_TOTAL_LEVEL) return null;
  return Object.freeze({
    present: true,
    nativeType: "list",
    structTypeId: 2,
    classNativeType: "int",
    levelNativeType: "short",
    entries: Object.freeze(entries),
  });
}

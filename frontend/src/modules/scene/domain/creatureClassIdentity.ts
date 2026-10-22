import type {
  SceneObjectCreatureClassIdentityEntry,
  SceneObjectCreatureClassIdentityState,
  SceneObjectCreatureClassesTable,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const INT_MAX = 0x7fff_ffff;
const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_FIELDS = 65_535;
const MAX_SPELL_ENTRIES = 65_535;
const MAX_DETAILED_SPELL_ENTRIES = 256;
const BASE_KEYS = [
  "present", "nativeType", "structTypeId", "classNativeType", "levelNativeType",
  "classListGraphSha256", "entries",
] as const;
const ENTRY_KEYS = [
  "classId", "level", "opaqueSiblingFieldCount", "canonicalSpellListFieldCount",
  "spellEntryCount",
] as const;
const DETAILED_ENTRY_KEYS = [...ENTRY_KEYS, "spellLists"] as const;
const SPELL_LIST_KEYS = ["listKind", "spellLevel", "entries"] as const;
const SPELL_ENTRY_KEYS = [
  "spellId", "spellMetaMagic", "spellFlags", "opaqueSiblingFieldCount",
] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;

export function readCreatureClassIdentityState(
  value: unknown,
): SceneObjectCreatureClassIdentityState | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactRecordKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(value, BASE_KEYS);
  const bound = hasExactRecordKeys(value, [...BASE_KEYS, "classesTable"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 2 || value.classNativeType !== "int" ||
    value.levelNativeType !== "short" || !isSha256(value.classListGraphSha256) ||
    !Array.isArray(value.entries) || value.entries.length < 1 ||
    value.entries.length > MAX_CLASS_SLOTS) return null;

  const entries: SceneObjectCreatureClassIdentityEntry[] = [];
  let detailed = true;
  let detailedEntryCount = 0;
  for (const rawEntry of value.entries) {
    if (!isPlainRecord(rawEntry) ||
      (!hasExactRecordKeys(rawEntry, ENTRY_KEYS) &&
        !hasExactRecordKeys(rawEntry, DETAILED_ENTRY_KEYS)) ||
      !isInteger(rawEntry.classId, 0, INT_MAX) ||
      !isInteger(rawEntry.level, 1, MAX_CLASS_LEVEL) ||
      !isInteger(rawEntry.opaqueSiblingFieldCount, 0, MAX_FIELDS) ||
      !isInteger(rawEntry.canonicalSpellListFieldCount, 0, 28) ||
      !isInteger(rawEntry.spellEntryCount, 0, MAX_SPELL_ENTRIES)) return null;
    const hasSpellLists = Object.prototype.hasOwnProperty.call(rawEntry, "spellLists");
    detailed = detailed && hasSpellLists;
    const spellLists = hasSpellLists ? readSpellLists(rawEntry.spellLists) : null;
    if (hasSpellLists && !spellLists) return null;
    if (spellLists && (spellLists.length !== Number(rawEntry.canonicalSpellListFieldCount) ||
      spellLists.reduce((sum, list) => sum + list.entries.length, 0) !==
        Number(rawEntry.spellEntryCount))) return null;
    detailedEntryCount += spellLists?.reduce((sum, list) => sum + list.entries.length, 0) ?? 0;
    entries.push(Object.freeze({
      classId: Number(rawEntry.classId),
      level: Number(rawEntry.level),
      opaqueSiblingFieldCount: Number(rawEntry.opaqueSiblingFieldCount),
      canonicalSpellListFieldCount: Number(rawEntry.canonicalSpellListFieldCount),
      spellEntryCount: Number(rawEntry.spellEntryCount),
      ...(spellLists ? { spellLists } : {}),
    }));
  }
  if (entries.some((entry) => Boolean(entry.spellLists) !== detailed) ||
    detailedEntryCount > MAX_DETAILED_SPELL_ENTRIES ||
    new Set(entries.map((entry) => entry.classId)).size !== entries.length ||
    entries.reduce((sum, entry) => sum + entry.level, 0) > MAX_TOTAL_LEVEL) return null;

  const base = Object.freeze({
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 2 as const,
    classNativeType: "int" as const,
    levelNativeType: "short" as const,
    classListGraphSha256: value.classListGraphSha256,
    entries: Object.freeze(entries),
  });
  if (!bound) return base;
  const classesTable = readClassesTable(value.classesTable);
  if (!classesTable || entries.some((entry) => entry.classId >= classesTable.rowCount)) {
    return null;
  }
  return Object.freeze({ ...base, classesTable });
}

function readSpellLists(
  value: unknown,
): readonly import("../contracts").SceneObjectCreatureClassSpellListState[] | null {
  if (!Array.isArray(value) || value.length > 28) return null;
  const lists: import("../contracts").SceneObjectCreatureClassSpellListState[] = [];
  let previousOrder = -1;
  let totalEntries = 0;
  for (const candidate of value) {
    if (!isPlainRecord(candidate) || !hasExactRecordKeys(candidate, SPELL_LIST_KEYS) ||
      (candidate.listKind !== "known" && candidate.listKind !== "memorized") ||
      !isInteger(candidate.spellLevel, 0, 13) || !Array.isArray(candidate.entries)) return null;
    const order = (candidate.listKind === "known" ? 0 : 14) + Number(candidate.spellLevel);
    if (order <= previousOrder) return null;
    previousOrder = order;
    const entries = [];
    for (const rawEntry of candidate.entries) {
      if (!isPlainRecord(rawEntry) || !hasExactRecordKeys(rawEntry, SPELL_ENTRY_KEYS) ||
        !isInteger(rawEntry.spellId, 0, 0xffff) ||
        !isInteger(rawEntry.spellMetaMagic, 0, 0xff) ||
        !isInteger(rawEntry.spellFlags, 0, 0xff) ||
        !isInteger(rawEntry.opaqueSiblingFieldCount, 0, MAX_FIELDS)) return null;
      entries.push(Object.freeze({
        spellId: Number(rawEntry.spellId),
        spellMetaMagic: Number(rawEntry.spellMetaMagic),
        spellFlags: Number(rawEntry.spellFlags),
        opaqueSiblingFieldCount: Number(rawEntry.opaqueSiblingFieldCount),
      }));
    }
    totalEntries += entries.length;
    if (totalEntries > MAX_DETAILED_SPELL_ENTRIES) return null;
    lists.push(Object.freeze({
      listKind: candidate.listKind,
      spellLevel: Number(candidate.spellLevel),
      entries: Object.freeze(entries),
    }));
  }
  return Object.freeze(lists);
}

function readClassesTable(value: unknown): SceneObjectCreatureClassesTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS) ||
    value.resourceName !== "classes.2da" || typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 || value.sourceObjectKey.length > 2048 ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || !isSha256(value.sha256) ||
    !isInteger(value.sizeBytes, 1, 16 * 1024 * 1024) ||
    !isInteger(value.rowCount, 1, 65_536)) return null;
  return Object.freeze({
    resourceName: "classes.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  });
}

function isInteger(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

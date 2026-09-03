import type {
  SceneObjectCreatureSpecialAbilityListStorage,
  SceneObjectCreatureSpecialAbilityListTable,
  SceneObjectCreatureSpecialAbilityPhysicalEntry,
  SceneObjectSourceMetadata,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const MAX_ROWS = 65_536;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const STORAGE_KEYS = ["present", "nativeType", "structTypeId", "entries"] as const;
const ENTRY_KEYS = [
  "spellId", "spellFlags", "casterLevel", "opaqueSiblingFieldCount",
] as const;

export interface SceneObjectCreatureSpecialAbilityProfileEntry {
  readonly spellId: number;
  readonly uses: number;
  readonly casterLevel: number;
}

function readTable(value: unknown): SceneObjectCreatureSpecialAbilityListTable | null {
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, TABLE_KEYS) ||
    value.resourceName !== "spells.2da" || typeof value.sourceObjectKey !== "string" ||
    value.sourceObjectKey.length < 1 || value.sourceObjectKey.length > 2_048 ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") || typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) ||
    Number(value.sizeBytes) < 1 || Number(value.sizeBytes) > 64 * 1024 * 1024 ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS) return null;
  return Object.freeze({
    resourceName: "spells.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
  });
}

function readEntries(
  value: unknown,
): readonly SceneObjectCreatureSpecialAbilityPhysicalEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_ROWS) return null;
  const entries: SceneObjectCreatureSpecialAbilityPhysicalEntry[] = [];
  for (const candidate of value) {
    if (!isPlainRecord(candidate) || !hasExactRecordKeys(candidate, ENTRY_KEYS) ||
      !Number.isSafeInteger(candidate.spellId) || Number(candidate.spellId) < 0 ||
      Number(candidate.spellId) > 0xffff || !Number.isSafeInteger(candidate.spellFlags) ||
      Number(candidate.spellFlags) < 0 || Number(candidate.spellFlags) > 0xff ||
      !Number.isSafeInteger(candidate.casterLevel) || Number(candidate.casterLevel) < 0 ||
      Number(candidate.casterLevel) > 0xff ||
      !Number.isSafeInteger(candidate.opaqueSiblingFieldCount) ||
      Number(candidate.opaqueSiblingFieldCount) < 0 ||
      Number(candidate.opaqueSiblingFieldCount) > 0xffff) return null;
    entries.push(Object.freeze({
      spellId: Number(candidate.spellId),
      spellFlags: Number(candidate.spellFlags),
      casterLevel: Number(candidate.casterLevel),
      opaqueSiblingFieldCount: Number(candidate.opaqueSiblingFieldCount),
    }));
  }
  return Object.freeze(entries);
}

export function readCreatureSpecialAbilityListStorage(
  value: unknown,
): SceneObjectCreatureSpecialAbilityListStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactRecordKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactRecordKeys(value, STORAGE_KEYS);
  const bound = hasExactRecordKeys(value, [...STORAGE_KEYS, "table"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 4) return null;
  const entries = readEntries(value.entries);
  if (!entries) return null;
  const base = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 4 as const,
    entries,
  };
  if (unbound) return Object.freeze(base);
  const table = readTable(value.table);
  return table ? Object.freeze({ ...base, table }) : null;
}

export function groupCanonicalCreatureSpecialAbilityEntries(
  entries: readonly SceneObjectCreatureSpecialAbilityPhysicalEntry[],
): readonly SceneObjectCreatureSpecialAbilityProfileEntry[] | null {
  const profile: SceneObjectCreatureSpecialAbilityProfileEntry[] = [];
  let previousSpellId: number | null = null;
  for (const entry of entries) {
    if (entry.spellFlags !== 1 || entry.casterLevel > 15 ||
      entry.opaqueSiblingFieldCount !== 0) return null;
    if (entry.spellId === previousSpellId) {
      const current = profile[profile.length - 1]!;
      if (current.casterLevel !== entry.casterLevel || current.uses >= 0xff) return null;
      profile[profile.length - 1] = Object.freeze({ ...current, uses: current.uses + 1 });
      continue;
    }
    if (profile.some((candidate) => candidate.spellId === entry.spellId)) return null;
    profile.push(Object.freeze({
      spellId: entry.spellId,
      uses: 1,
      casterLevel: entry.casterLevel,
    }));
    previousSpellId = entry.spellId;
  }
  return Object.freeze(profile);
}

export function canEditExistingCreatureSpecialAbilityList(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const storage = readCreatureSpecialAbilityListStorage(source?.creatureSpecialAbilityList);
  return source?.type === "aurora_git" && source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) && Number(source.sourceIndex) >= 0 &&
    storage?.present === true && storage.table !== undefined &&
    groupCanonicalCreatureSpecialAbilityEntries(storage.entries) !== null;
}

import {
  isExactEffectiveCreatureSpecialAbilitiesTwoDaTable,
  MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_ROWS,
  type EffectiveCreatureSpecialAbilitiesTwoDaDescriptor,
} from "../../catalog/domain/effective-creature-special-abilities-two-da";

const WORD_MAX = 0xffff;
const BYTE_MAX = 0xff;
const MAX_OPAQUE_SIBLING_FIELDS = 65_535;
const STORAGE_KEYS = ["present", "nativeType", "structTypeId", "entries"] as const;
const BOUND_STORAGE_KEYS = [...STORAGE_KEYS, "table"] as const;
const ENTRY_KEYS = [
  "spellId", "spellFlags", "casterLevel", "opaqueSiblingFieldCount",
] as const;
const TABLE_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const MUTATION_KEYS = ["expectedEntries", "entries", "tableSha256", "rowCount"] as const;
const PROFILE_ENTRY_KEYS = ["spellId", "uses", "casterLevel"] as const;

export type AreaCreatureSpecialAbilityListTable =
  EffectiveCreatureSpecialAbilitiesTwoDaDescriptor;

export interface AreaCreatureSpecialAbilityPhysicalEntry {
  readonly spellId: number;
  readonly spellFlags: number;
  readonly casterLevel: number;
  readonly opaqueSiblingFieldCount: number;
}

export type AreaCreatureSpecialAbilityListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 4;
      entries: readonly AreaCreatureSpecialAbilityPhysicalEntry[];
      table?: AreaCreatureSpecialAbilityListTable;
    }>;

export interface AreaCreatureSpecialAbilityProfileEntry {
  readonly spellId: number;
  readonly uses: number;
  readonly casterLevel: number;
}

export interface ExistingAreaCreatureSpecialAbilityListMutation {
  readonly expectedEntries: readonly AreaCreatureSpecialAbilityProfileEntry[];
  readonly entries: readonly AreaCreatureSpecialAbilityProfileEntry[];
  readonly tableSha256: string;
  readonly rowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readPhysicalEntries(
  value: unknown,
): readonly AreaCreatureSpecialAbilityPhysicalEntry[] | null {
  if (!Array.isArray(value) ||
    value.length > MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_ROWS) return null;
  const entries: AreaCreatureSpecialAbilityPhysicalEntry[] = [];
  for (const candidate of value) {
    if (!isPlainRecord(candidate) || !hasExactKeys(candidate, ENTRY_KEYS) ||
      !Number.isSafeInteger(candidate.spellId) || Number(candidate.spellId) < 0 ||
      Number(candidate.spellId) > WORD_MAX ||
      !Number.isSafeInteger(candidate.spellFlags) || Number(candidate.spellFlags) < 0 ||
      Number(candidate.spellFlags) > BYTE_MAX ||
      !Number.isSafeInteger(candidate.casterLevel) || Number(candidate.casterLevel) < 0 ||
      Number(candidate.casterLevel) > BYTE_MAX ||
      !Number.isSafeInteger(candidate.opaqueSiblingFieldCount) ||
      Number(candidate.opaqueSiblingFieldCount) < 0 ||
      Number(candidate.opaqueSiblingFieldCount) > MAX_OPAQUE_SIBLING_FIELDS) return null;
    entries.push(Object.freeze({
      spellId: Number(candidate.spellId),
      spellFlags: Number(candidate.spellFlags),
      casterLevel: Number(candidate.casterLevel),
      opaqueSiblingFieldCount: Number(candidate.opaqueSiblingFieldCount),
    }));
  }
  return Object.freeze(entries);
}

function readTable(value: unknown): AreaCreatureSpecialAbilityListTable | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  const candidate = { descriptor: value, rows: [] };
  if (!isExactEffectiveCreatureSpecialAbilitiesTwoDaTable(candidate)) return null;
  return Object.freeze({ ...candidate.descriptor });
}

export function readAreaCreatureSpecialAbilityListStorage(
  value: unknown,
): AreaCreatureSpecialAbilityListStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = hasExactKeys(value, STORAGE_KEYS);
  const bound = hasExactKeys(value, BOUND_STORAGE_KEYS);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "list" ||
    value.structTypeId !== 4) return null;
  const entries = readPhysicalEntries(value.entries);
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

export function bindEffectiveCreatureSpecialAbilitiesTwoDaToList(
  storageInput: unknown,
  tableInput: unknown,
): AreaCreatureSpecialAbilityListStorage {
  const storage = readAreaCreatureSpecialAbilityListStorage(storageInput);
  if (!storage) throw new TypeError("Creature SpecAbilityList storage is invalid.");
  if (!storage.present ||
    !isExactEffectiveCreatureSpecialAbilitiesTwoDaTable(tableInput)) return storage;
  return Object.freeze({
    ...storage,
    entries: Object.freeze(storage.entries.map((entry) => Object.freeze({ ...entry }))),
    table: Object.freeze({ ...tableInput.descriptor }),
  });
}

function readProfile(
  value: unknown,
  rowCount: number,
): readonly AreaCreatureSpecialAbilityProfileEntry[] | null {
  if (!Array.isArray(value) || value.length > rowCount) return null;
  const seen = new Set<number>();
  const entries: AreaCreatureSpecialAbilityProfileEntry[] = [];
  for (const candidate of value) {
    if (!isPlainRecord(candidate) || !hasExactKeys(candidate, PROFILE_ENTRY_KEYS) ||
      !Number.isSafeInteger(candidate.spellId) || Number(candidate.spellId) < 0 ||
      Number(candidate.spellId) >= rowCount || Number(candidate.spellId) > WORD_MAX ||
      seen.has(Number(candidate.spellId)) || !Number.isSafeInteger(candidate.uses) ||
      Number(candidate.uses) < 1 || Number(candidate.uses) > BYTE_MAX ||
      !Number.isSafeInteger(candidate.casterLevel) || Number(candidate.casterLevel) < 0 ||
      Number(candidate.casterLevel) > 15) return null;
    seen.add(Number(candidate.spellId));
    entries.push(Object.freeze({
      spellId: Number(candidate.spellId),
      uses: Number(candidate.uses),
      casterLevel: Number(candidate.casterLevel),
    }));
  }
  return Object.freeze(entries);
}

function profilesEqual(
  left: readonly AreaCreatureSpecialAbilityProfileEntry[],
  right: readonly AreaCreatureSpecialAbilityProfileEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) =>
    entry.spellId === right[index]?.spellId && entry.uses === right[index]?.uses &&
    entry.casterLevel === right[index]?.casterLevel);
}

export function readExistingAreaCreatureSpecialAbilityListMutation(
  value: unknown,
): ExistingAreaCreatureSpecialAbilityListMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_EFFECTIVE_CREATURE_SPECIAL_ABILITIES_TWO_DA_ROWS) return null;
  const expectedEntries = readProfile(value.expectedEntries, Number(value.rowCount));
  const entries = readProfile(value.entries, Number(value.rowCount));
  if (!expectedEntries || !entries || profilesEqual(expectedEntries, entries)) return null;
  return Object.freeze({
    expectedEntries,
    entries,
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
  });
}

export function groupCanonicalCreatureSpecialAbilityEntries(
  entries: readonly AreaCreatureSpecialAbilityPhysicalEntry[],
): readonly AreaCreatureSpecialAbilityProfileEntry[] | null {
  const profile: AreaCreatureSpecialAbilityProfileEntry[] = [];
  let previousSpellId: number | null = null;
  for (const entry of entries) {
    if (entry.spellFlags !== 1 || entry.casterLevel > 15 ||
      entry.opaqueSiblingFieldCount !== 0) return null;
    if (entry.spellId === previousSpellId) {
      const current = profile[profile.length - 1]!;
      if (current.casterLevel !== entry.casterLevel || current.uses >= BYTE_MAX) return null;
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

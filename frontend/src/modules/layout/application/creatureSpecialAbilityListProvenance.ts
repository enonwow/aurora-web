import type { CreatureSpecialAbilityCatalogFacade } from
  "../../creatures/application/creatureSpecialAbilityCatalogFacade";
import type {
  CreatureApiSpecialAbilityRow,
  CreatureApiSpecialAbilityRowsResult,
} from "../../creatures/contracts";
import type {
  SceneObjectCreatureSpecialAbilityEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  groupCanonicalCreatureSpecialAbilityEntries,
  readCreatureSpecialAbilityListStorage,
  type SceneObjectCreatureSpecialAbilityProfileEntry,
} from "../../scene/domain/creatureSpecialAbilityList";

const PAGE_LIMIT = 256;
const MAX_DISPLAY_CODE_UNITS = 1_024;

export interface ExistingCreatureSpecialAbilityListProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceEntries: readonly SceneObjectCreatureSpecialAbilityProfileEntry[];
}

export interface ExistingCreatureSpecialAbilityCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly items: readonly CreatureApiSpecialAbilityRow[];
}

export class CreatureSpecialAbilityCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreatureSpecialAbilityCatalogError";
  }
}

export function readExistingCreatureSpecialAbilityListProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureSpecialAbilityListProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const storage = readCreatureSpecialAbilityListStorage(source.creatureSpecialAbilityList);
  const sourceEntries = storage?.present
    ? groupCanonicalCreatureSpecialAbilityEntries(storage.entries)
    : null;
  if (!storage?.present || !storage.table || !sourceEntries) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceEntries: Object.freeze(sourceEntries.map((entry) => Object.freeze({ ...entry }))),
  });
}

export function isExistingCreatureSpecialAbilityCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureSpecialAbilityCatalog | null | undefined,
): catalog is ExistingCreatureSpecialAbilityCatalog {
  const provenance = readExistingCreatureSpecialAbilityListProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance)) return false;
  const rows = new Map(catalog.items.map((row) => [row.rowIndex, row]));
  return provenance.sourceEntries.every((entry) => {
    const row = rows.get(entry.spellId);
    return row !== undefined && isCasterProfileAdmitted(row.userType, entry.uses, entry.casterLevel);
  });
}

export async function loadExistingCreatureSpecialAbilityCatalog(
  facade: CreatureSpecialAbilityCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
): Promise<ExistingCreatureSpecialAbilityCatalog> {
  const provenance = readExistingCreatureSpecialAbilityListProvenance(source);
  if (!provenance) throw new CreatureSpecialAbilityCatalogError(
    "CREATURE_SPECIAL_ABILITY_PROVENANCE_INVALID",
    "Exact existing Creature SpecAbilityList and spells.2da provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureSpecialAbilityCatalogError(
    "CREATURE_SPECIAL_ABILITY_CATALOG_UNAVAILABLE",
    "The authoritative spells.2da special-ability catalog is unavailable.",
  );

  const items: CreatureApiSpecialAbilityRow[] = [];
  const seen = new Set<number>();
  let offset = 0;
  let expectedTotal: number | null = null;
  while (expectedTotal === null || offset < expectedTotal) {
    const result = await loadPage(facade, accessToken, provenance, offset);
    const page = readPage(result, provenance, offset, expectedTotal);
    if (expectedTotal === null) expectedTotal = result.total;
    for (const row of page) {
      if (seen.has(row.rowIndex) ||
        (items.length > 0 && row.rowIndex <= items[items.length - 1]!.rowIndex)) {
        throw new CreatureSpecialAbilityCatalogError(
          "CREATURE_SPECIAL_ABILITY_CATALOG_INVALID",
          "The returned spells.2da rows are duplicated or out of physical order.",
        );
      }
      seen.add(row.rowIndex);
      items.push(Object.freeze({ ...row }));
    }
    offset += page.length;
  }
  const catalog = Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    items: Object.freeze(items),
  });
  if (!isExistingCreatureSpecialAbilityCatalogAdmitted(source, catalog)) {
    throw new CreatureSpecialAbilityCatalogError(
      "CREATURE_SPECIAL_ABILITY_CATALOG_INCOMPLETE",
      "The authoritative spells.2da catalog does not admit every retained special ability.",
    );
  }
  return catalog;
}

export function materializeExistingCreatureSpecialAbilities(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureSpecialAbilityEntry[],
  candidate: readonly SceneObjectCreatureSpecialAbilityEntry[],
  catalog: ExistingCreatureSpecialAbilityCatalog | null | undefined,
): readonly SceneObjectCreatureSpecialAbilityEntry[] {
  const provenance = readExistingCreatureSpecialAbilityListProvenance(source);
  const currentProfile = readTargetProfile(current, provenance?.rowCount);
  const candidateProfile = readTargetProfile(candidate, provenance?.rowCount);
  if (!provenance || !currentProfile || !candidateProfile ||
    !profilesEqual(currentProfile, provenance.sourceEntries) ||
    !isExistingCreatureSpecialAbilityCatalogAdmitted(source, catalog)) {
    return cloneEntries(current);
  }
  const catalogRows = new Map(catalog.items.map((row) => [row.rowIndex, row]));
  if (candidateProfile.some((entry) => {
    const row = catalogRows.get(entry.spellId);
    return !row || !isCasterProfileAdmitted(row.userType, entry.uses, entry.casterLevel);
  })) return cloneEntries(current);
  const candidateById = new Map(candidateProfile.map((entry) => [entry.spellId, entry]));
  return Object.freeze(catalog.items.map((row) => {
    const selected = candidateById.get(row.rowIndex);
    return Object.freeze({
      spellId: row.rowIndex,
      name: row.displayName,
      type: row.userType === 1 ? "Spells" : "Monster Abilities",
      casterLevel: selected?.casterLevel ?? (row.userType === 1 ? 1 : 0),
      uses: selected?.uses ?? 0,
    });
  }));
}

export function reduceCreatureSpecialAbilityEntry(
  entry: SceneObjectCreatureSpecialAbilityEntry,
  field: "uses" | "casterLevel",
  value: number,
): SceneObjectCreatureSpecialAbilityEntry {
  if (!Number.isFinite(value)) return { ...entry };
  if (field === "uses") {
    const uses = Math.max(0, Math.min(0xff, Math.trunc(value)));
    return {
      ...entry,
      uses,
      casterLevel: uses === 0
        ? 0
        : entry.type === "Spells" ? Math.max(1, Math.min(15, entry.casterLevel)) : 0,
    };
  }
  if (entry.type === "Monster Abilities") return { ...entry, casterLevel: 0 };
  let casterLevel = Math.max(0, Math.min(15, Math.trunc(value)));
  let uses = entry.uses;
  if (casterLevel > 0 && uses === 0) uses = 1;
  if (uses > 0 && casterLevel === 0) casterLevel = 1;
  return { ...entry, casterLevel, uses };
}

async function loadPage(
  facade: CreatureSpecialAbilityCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureSpecialAbilityListProvenance,
  offset: number,
): Promise<CreatureApiSpecialAbilityRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      limit: PAGE_LIMIT,
      offset,
    });
  } catch (error) {
    const stale = isRecord(error) &&
      (error.code === "CREATURE_SPECIAL_ABILITIES_TABLE_STALE" ||
        error.code === "CREATURE_SPECIAL_ABILITY_TABLE_STALE");
    throw new CreatureSpecialAbilityCatalogError(
      stale ? "CREATURE_SPECIAL_ABILITY_CATALOG_STALE" :
        "CREATURE_SPECIAL_ABILITY_CATALOG_UNAVAILABLE",
      stale ? "The authoritative spells.2da identity changed." :
        "The authoritative spells.2da special-ability catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiSpecialAbilityRowsResult,
  provenance: ExistingCreatureSpecialAbilityListProvenance,
  expectedOffset: number,
  expectedTotal: number | null,
): readonly CreatureApiSpecialAbilityRow[] {
  if (result.resourceName !== "spells.2da" || result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount) throw new CreatureSpecialAbilityCatalogError(
    "CREATURE_SPECIAL_ABILITY_CATALOG_STALE",
    "The returned spells.2da identity differs from retained provenance.",
  );
  const totalValid = Number.isSafeInteger(result.total) && result.total >= 0 &&
    result.total <= provenance.rowCount &&
    (expectedTotal === null || result.total === expectedTotal);
  const expectedLength = totalValid
    ? Math.min(PAGE_LIMIT, Math.max(0, result.total - expectedOffset))
    : -1;
  if (result.limit !== PAGE_LIMIT || result.offset !== expectedOffset || !totalValid ||
    !Array.isArray(result.items) || result.items.length !== expectedLength) {
    throw new CreatureSpecialAbilityCatalogError(
      "CREATURE_SPECIAL_ABILITY_CATALOG_INVALID",
      "The returned spells.2da page metadata is inconsistent.",
    );
  }
  let previous = -1;
  return result.items.map((row) => {
    if (!isSpecialAbilityRow(row, provenance.rowCount) || row.rowIndex <= previous) {
      throw new CreatureSpecialAbilityCatalogError(
        "CREATURE_SPECIAL_ABILITY_CATALOG_INVALID",
        "The returned spells.2da row is invalid or out of physical order.",
      );
    }
    previous = row.rowIndex;
    return row;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureSpecialAbilityCatalog | null | undefined,
  provenance: ExistingCreatureSpecialAbilityListProvenance,
): catalog is ExistingCreatureSpecialAbilityCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount || !Array.isArray(catalog.items)) return false;
  let previous = -1;
  return catalog.items.every((row) => {
    if (!isSpecialAbilityRow(row, provenance.rowCount) || row.rowIndex <= previous) return false;
    previous = row.rowIndex;
    return true;
  });
}

function isSpecialAbilityRow(
  value: unknown,
  rowCount: number,
): value is CreatureApiSpecialAbilityRow {
  if (!isRecord(value)) return false;
  const hasDescription = Object.prototype.hasOwnProperty.call(value, "spellDescStrRef");
  const keys = [
    "rowIndex", "nameStrRef", ...(hasDescription ? ["spellDescStrRef"] : []),
    "userType", "displayName",
  ];
  return Object.keys(value).length === keys.length && keys.every((key) => key in value) &&
    Number.isSafeInteger(value.rowIndex) && Number(value.rowIndex) >= 0 &&
    Number(value.rowIndex) < rowCount && Number.isSafeInteger(value.nameStrRef) &&
    Number(value.nameStrRef) >= 1 && Number(value.nameStrRef) < 0xffff_ffff &&
    (!hasDescription || Number.isSafeInteger(value.spellDescStrRef) &&
      Number(value.spellDescStrRef) >= 1 && Number(value.spellDescStrRef) < 0xffff_ffff) &&
    (value.userType === 1 || value.userType === 2) &&
    typeof value.displayName === "string" && value.displayName.length >= 1 &&
    value.displayName.length <= MAX_DISPLAY_CODE_UNITS && !value.displayName.includes("\0");
}

function readTargetProfile(
  value: readonly SceneObjectCreatureSpecialAbilityEntry[],
  rowCount: number | undefined,
): readonly SceneObjectCreatureSpecialAbilityProfileEntry[] | null {
  if (!Number.isSafeInteger(rowCount) || rowCount === undefined || rowCount < 1 ||
    !Array.isArray(value) || value.length > rowCount) return null;
  const seen = new Set<number>();
  const profile: SceneObjectCreatureSpecialAbilityProfileEntry[] = [];
  for (const entry of value) {
    if (!Number.isSafeInteger(entry.spellId) || Number(entry.spellId) < 0 ||
      Number(entry.spellId) >= rowCount || seen.has(Number(entry.spellId)) ||
      !Number.isSafeInteger(entry.uses) || entry.uses < 0 || entry.uses > 0xff ||
      !Number.isSafeInteger(entry.casterLevel) || entry.casterLevel < 0 ||
      entry.casterLevel > 15) return null;
    seen.add(Number(entry.spellId));
    if (entry.uses > 0) profile.push(Object.freeze({
      spellId: Number(entry.spellId),
      uses: entry.uses,
      casterLevel: entry.casterLevel,
    }));
  }
  return Object.freeze(profile);
}

function profilesEqual(
  left: readonly SceneObjectCreatureSpecialAbilityProfileEntry[],
  right: readonly SceneObjectCreatureSpecialAbilityProfileEntry[],
): boolean {
  if (left.length !== right.length) return false;
  const rightById = new Map(right.map((entry) => [entry.spellId, entry]));
  return left.every((entry) => {
    const expected = rightById.get(entry.spellId);
    return expected?.uses === entry.uses && expected.casterLevel === entry.casterLevel;
  });
}

function isCasterProfileAdmitted(userType: 1 | 2, uses: number, casterLevel: number): boolean {
  return uses >= 1 && uses <= 0xff &&
    (userType === 1 ? casterLevel >= 1 && casterLevel <= 15 : casterLevel === 0);
}

function cloneEntries(
  value: readonly SceneObjectCreatureSpecialAbilityEntry[],
): readonly SceneObjectCreatureSpecialAbilityEntry[] {
  return Object.freeze(value.map((entry) => Object.freeze({ ...entry })));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

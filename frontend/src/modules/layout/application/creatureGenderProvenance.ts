import type { CreatureGenderCatalogFacade } from "../../creatures/application/creatureGenderCatalogFacade";
import type {
  CreatureApiGenderRow,
  CreatureApiGenderRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { readCreatureGenderStorage } from "../../scene/domain/creatureGender";

const BYTE_MAX = 0xff;
const PAGE_LIMIT = 256;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;
const MAX_TOKEN_CODE_UNITS = 64;
const MAX_CONSTANT_CODE_UNITS = 256;

export interface ExistingCreatureGenderProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
}

export interface ExistingCreatureGenderCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly CreatureApiGenderRow[];
}

export type CreatureGenderCatalogErrorCode =
  | "CREATURE_GENDER_PROVENANCE_INVALID"
  | "CREATURE_GENDER_CATALOG_UNAVAILABLE"
  | "CREATURE_GENDER_CATALOG_STALE"
  | "CREATURE_GENDER_CATALOG_INVALID";

export class CreatureGenderCatalogError extends Error {
  constructor(readonly code: CreatureGenderCatalogErrorCode, message: string) {
    super(message);
    this.name = "CreatureGenderCatalogError";
  }
}

export function readExistingCreatureGenderProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureGenderProvenance | null {
  if (
    source?.type !== "aurora_git" ||
    source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) ||
    Number(source.sourceIndex) < 0
  ) return null;
  const storage = readCreatureGenderStorage(source.creatureGender);
  if (!storage?.present || !storage.table) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceRowIndex: storage.value,
  });
}

export function canEditExistingCreatureGender(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingCreatureGenderProvenance(source) !== null;
}

export function isExistingCreatureGenderCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureGenderCatalog | null | undefined,
): catalog is ExistingCreatureGenderCatalog {
  const provenance = readExistingCreatureGenderProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreatureGenderCatalog(
  facade: CreatureGenderCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreatureGenderCatalog> {
  const provenance = readExistingCreatureGenderProvenance(source);
  if (!provenance) {
    throw new CreatureGenderCatalogError(
      "CREATURE_GENDER_PROVENANCE_INVALID",
      "Exact existing Creature Gender provenance is required.",
    );
  }
  if (!facade?.queries?.listRows || !accessToken) {
    throw new CreatureGenderCatalogError(
      "CREATURE_GENDER_CATALOG_UNAVAILABLE",
      "The authoritative gender.2da row catalog is unavailable.",
    );
  }
  const query = normalizeQuery(rawQuery);
  if (selectedRowIndex !== undefined && !isByteRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreatureGenderCatalogError(
      "CREATURE_GENDER_CATALOG_INVALID",
      "The selected Creature Gender row is outside the retained table.",
    );
  }
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}),
    limit: PAGE_LIMIT,
    offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadExactRow = async (rowIndex: number): Promise<CreatureApiGenderRow> => {
    const fromPage = pageItems.find((item) => item.rowIndex === rowIndex);
    if (fromPage) return fromPage;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex,
      limit: 1,
      offset: 0,
    });
    const items = readPage(exact, provenance, 1, 0, true);
    if (items.length !== 1 || items[0]!.rowIndex !== rowIndex) {
      throw new CreatureGenderCatalogError(
        "CREATURE_GENDER_CATALOG_STALE",
        "The retained Creature Gender row is not Toolset-admitted by the current table.",
      );
    }
    return items[0]!;
  };
  const current = await loadExactRow(provenance.sourceRowIndex);
  const selected = selectedRowIndex === undefined || selectedRowIndex === provenance.sourceRowIndex
    ? undefined
    : await loadExactRow(selectedRowIndex);
  const seen = new Set<number>();
  const items = [current, selected, ...pageItems]
    .filter((item): item is CreatureApiGenderRow => item !== undefined)
    .filter((item) => !seen.has(item.rowIndex) && Boolean(seen.add(item.rowIndex)))
    .map((item) => Object.freeze({ ...item }));
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    query,
    items: Object.freeze(items),
  });
}

export function reduceExistingCreatureGender(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreatureGenderCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreatureGenderProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance)) return currentValue;
  if (!isByteRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((item) => item.rowIndex === candidateValue)
    ? candidateValue
    : currentValue;
}

export const materializeExistingCreatureGender = reduceExistingCreatureGender;

export function resolveCreatureGenderDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreatureGenderCatalog | null | undefined,
  fallback: string,
): string {
  if (rowIndex === undefined || !catalog) return fallback;
  return catalog.items.find((item) => item.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadPage(
  facade: CreatureGenderCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureGenderProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiGenderRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_GENDER_TABLE_STALE";
    throw new CreatureGenderCatalogError(
      stale ? "CREATURE_GENDER_CATALOG_STALE" : "CREATURE_GENDER_CATALOG_UNAVAILABLE",
      stale
        ? "The authoritative gender.2da identity changed."
        : "The authoritative gender.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiGenderRowsResult,
  provenance: ExistingCreatureGenderProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiGenderRow[] {
  if (
    result.resourceName !== "gender.2da" ||
    result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount
  ) {
    throw new CreatureGenderCatalogError(
      "CREATURE_GENDER_CATALOG_STALE",
      "The returned gender.2da identity differs from retained provenance.",
    );
  }
  if (
    result.limit !== expectedLimit ||
    result.offset !== expectedOffset ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0 ||
    result.total > provenance.rowCount ||
    (exact && result.total > 1) ||
    !Array.isArray(result.items) ||
    result.items.length > expectedLimit
  ) {
    throw new CreatureGenderCatalogError(
      "CREATURE_GENDER_CATALOG_INVALID",
      "The returned gender.2da page metadata is inconsistent.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((item) => {
    if (!isGenderRow(item, provenance.rowCount) || seen.has(item.rowIndex)) {
      throw new CreatureGenderCatalogError(
        "CREATURE_GENDER_CATALOG_INVALID",
        "The returned Creature Gender option is invalid or duplicated.",
      );
    }
    seen.add(item.rowIndex);
    return item;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureGenderCatalog | null | undefined,
  provenance: ExistingCreatureGenderProvenance,
): catalog is ExistingCreatureGenderCatalog {
  if (
    !catalog ||
    catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount ||
    typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS ||
    !Array.isArray(catalog.items)
  ) return false;
  const seen = new Set<number>();
  const valid = catalog.items.every((item) => {
    if (!isGenderRow(item, provenance.rowCount) || seen.has(item.rowIndex)) return false;
    seen.add(item.rowIndex);
    return true;
  });
  return valid && seen.has(provenance.sourceRowIndex);
}

function isGenderRow(value: unknown, rowCount: number): value is CreatureApiGenderRow {
  if (!isRecord(value) || !isByteRow(value.rowIndex, rowCount)) return false;
  if (
    typeof value.displayName !== "string" ||
    value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS ||
    value.displayName.includes("\0") ||
    !Number.isSafeInteger(value.nameStrRef) ||
    Number(value.nameStrRef) < 1 ||
    Number(value.nameStrRef) >= 0xffff_ffff ||
    !isBoundedText(value.genderToken, MAX_TOKEN_CODE_UNITS) ||
    (value.constant !== undefined && !isBoundedText(value.constant, MAX_CONSTANT_CODE_UNITS))
  ) return false;
  const keys = Object.keys(value);
  if (keys.some((key) => ![
    "rowIndex", "displayName", "displaySource", "nameStrRef", "genderToken", "constant",
  ].includes(key))) return false;
  if (value.displaySource === "strref") return true;
  return value.displaySource === "strref_id" &&
    value.displayName === `StringRef ${value.nameStrRef}`;
}

function isByteRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) &&
    Number(value) >= 0 &&
    Number(value) <= BYTE_MAX &&
    Number(value) < rowCount;
}

function isBoundedText(value: unknown, maxCodeUnits: number): value is string {
  return typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maxCodeUnits &&
    !value.includes("\0");
}

function normalizeQuery(value: string): string {
  return value.trim().slice(0, MAX_QUERY_CODE_UNITS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

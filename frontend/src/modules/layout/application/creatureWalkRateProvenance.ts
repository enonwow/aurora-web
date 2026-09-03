import type { CreatureWalkRateCatalogFacade } from
  "../../creatures/application/creatureWalkRateCatalogFacade";
import type {
  CreatureApiWalkRateRow,
  CreatureApiWalkRateRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { readCreatureWalkRateStorage } from "../../scene/domain/creatureWalkRate";

const PAGE_LIMIT = 100;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;
const MAX_TWO_DA_NAME_CODE_UNITS = 128;

export interface ExistingCreatureWalkRateProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
}

export interface ExistingCreatureWalkRateCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly CreatureApiWalkRateRow[];
}

export class CreatureWalkRateCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreatureWalkRateCatalogError";
  }
}

export function readExistingCreatureWalkRateProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureWalkRateProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const storage = readCreatureWalkRateStorage(source.creatureWalkRate);
  if (!storage?.present || !storage.table || storage.value < 1 ||
    storage.value >= storage.table.rowCount) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceRowIndex: storage.value,
  });
}

export function isExistingCreatureWalkRateCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureWalkRateCatalog | null | undefined,
): catalog is ExistingCreatureWalkRateCatalog {
  const provenance = readExistingCreatureWalkRateProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreatureWalkRateCatalog(
  facade: CreatureWalkRateCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreatureWalkRateCatalog> {
  const provenance = readExistingCreatureWalkRateProvenance(source);
  if (!provenance) throw new CreatureWalkRateCatalogError(
    "CREATURE_WALK_RATE_PROVENANCE_INVALID",
    "Exact existing Creature WalkRate provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureWalkRateCatalogError(
    "CREATURE_WALK_RATE_CATALOG_UNAVAILABLE",
    "The authoritative creaturespeed.2da row catalog is unavailable.",
  );
  if (selectedRowIndex !== undefined && !isAdmittedRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreatureWalkRateCatalogError(
      "CREATURE_WALK_RATE_CATALOG_INVALID",
      "The selected WalkRate row is not Toolset-admitted.",
    );
  }
  const query = rawQuery.trim().slice(0, MAX_QUERY_CODE_UNITS);
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}), limit: PAGE_LIMIT, offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadExactRow = async (rowIndex: number): Promise<CreatureApiWalkRateRow> => {
    const fromPage = pageItems.find((row) => row.rowIndex === rowIndex);
    if (fromPage) return fromPage;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex, limit: 1, offset: 0,
    });
    const exactItems = readPage(exact, provenance, 1, 0, true);
    if (exactItems.length !== 1 || exactItems[0]!.rowIndex !== rowIndex) {
      throw new CreatureWalkRateCatalogError(
        "CREATURE_WALK_RATE_CATALOG_STALE",
        "The retained WalkRate row is absent from the current Toolset catalog.",
      );
    }
    return exactItems[0]!;
  };
  const current = await loadExactRow(provenance.sourceRowIndex);
  const selected = selectedRowIndex === undefined || selectedRowIndex === provenance.sourceRowIndex
    ? undefined : await loadExactRow(selectedRowIndex);
  const seen = new Set<number>();
  const items = [current, selected, ...pageItems]
    .filter((row): row is CreatureApiWalkRateRow => row !== undefined)
    .filter((row) => !seen.has(row.rowIndex) && Boolean(seen.add(row.rowIndex)))
    .map((row) => Object.freeze({ ...row }));
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    query,
    items: Object.freeze(items),
  });
}

export function reduceExistingCreatureWalkRate(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreatureWalkRateCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreatureWalkRateProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance) ||
    !isAdmittedRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((row) => row.rowIndex === candidateValue)
    ? candidateValue : currentValue;
}

export const materializeExistingCreatureWalkRate = reduceExistingCreatureWalkRate;

export function resolveCreatureWalkRateDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreatureWalkRateCatalog | null | undefined,
  fallback: string,
): string {
  return catalog?.items.find((row) => row.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadPage(
  facade: CreatureWalkRateCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureWalkRateProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiWalkRateRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_WALK_RATE_TABLE_STALE";
    throw new CreatureWalkRateCatalogError(
      stale ? "CREATURE_WALK_RATE_CATALOG_STALE" : "CREATURE_WALK_RATE_CATALOG_UNAVAILABLE",
      stale ? "The authoritative creaturespeed.2da identity changed." :
        "The authoritative creaturespeed.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiWalkRateRowsResult,
  provenance: ExistingCreatureWalkRateProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiWalkRateRow[] {
  if (result.resourceName !== "creaturespeed.2da" ||
    result.sha256 !== provenance.tableSha256 || result.rowCount !== provenance.rowCount) {
    throw new CreatureWalkRateCatalogError(
      "CREATURE_WALK_RATE_CATALOG_STALE",
      "The returned creaturespeed.2da identity differs from retained provenance.",
    );
  }
  if (result.limit !== expectedLimit || result.offset !== expectedOffset ||
    !Number.isSafeInteger(result.total) || result.total < 0 ||
    result.total > provenance.rowCount - 1 || (exact && result.total > 1) ||
    !Array.isArray(result.items) || result.items.length > expectedLimit) {
    throw new CreatureWalkRateCatalogError(
      "CREATURE_WALK_RATE_CATALOG_INVALID",
      "The returned creaturespeed.2da page metadata is inconsistent.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((row) => {
    if (!isWalkRateRow(row, provenance.rowCount) || seen.has(row.rowIndex)) {
      throw new CreatureWalkRateCatalogError(
        "CREATURE_WALK_RATE_CATALOG_INVALID",
        "The returned WalkRate option is invalid or duplicated.",
      );
    }
    seen.add(row.rowIndex);
    return row;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureWalkRateCatalog | null | undefined,
  provenance: ExistingCreatureWalkRateProvenance,
): catalog is ExistingCreatureWalkRateCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount || typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS || !Array.isArray(catalog.items)) return false;
  const seen = new Set<number>();
  const valid = catalog.items.every((row) => {
    if (!isWalkRateRow(row, provenance.rowCount) || seen.has(row.rowIndex)) return false;
    seen.add(row.rowIndex);
    return true;
  });
  return valid && seen.has(provenance.sourceRowIndex);
}

function isWalkRateRow(value: unknown, rowCount: number): value is CreatureApiWalkRateRow {
  if (!isRecord(value) || !isAdmittedRow(value.rowIndex, rowCount) ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS || value.displayName.includes("\0") ||
    !Number.isSafeInteger(value.nameStrRef) || Number(value.nameStrRef) < 1 ||
    Number(value.nameStrRef) >= 0xffff_ffff || typeof value.twoDaName !== "string" ||
    value.twoDaName.length < 1 || value.twoDaName.length > MAX_TWO_DA_NAME_CODE_UNITS ||
    value.twoDaName === "****" || value.twoDaName.includes("\0")) return false;
  if (Object.keys(value).some((key) => ![
    "rowIndex", "displayName", "displaySource", "nameStrRef", "twoDaName",
  ].includes(key))) return false;
  return value.displaySource === "strref" ||
    (value.displaySource === "strref_id" && value.displayName === `StringRef ${value.nameStrRef}`);
}

function isAdmittedRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) < rowCount;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

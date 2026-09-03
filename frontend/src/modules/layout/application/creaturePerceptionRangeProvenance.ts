import type { CreaturePerceptionRangeCatalogFacade } from
  "../../creatures/application/creaturePerceptionRangeCatalogFacade";
import type {
  CreatureApiPerceptionRangeRow,
  CreatureApiPerceptionRangeRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  isCreaturePerceptionRangeRow,
  readCreaturePerceptionRangeStorage,
} from "../../scene/domain/creaturePerceptionRange";

const PAGE_LIMIT = 16;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;

export interface ExistingCreaturePerceptionRangeProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: 8 | 9 | 10 | 11;
}

export interface ExistingCreaturePerceptionRangeCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly CreatureApiPerceptionRangeRow[];
}

export class CreaturePerceptionRangeCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreaturePerceptionRangeCatalogError";
  }
}

export function readExistingCreaturePerceptionRangeProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreaturePerceptionRangeProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const storage = readCreaturePerceptionRangeStorage(source.creaturePerceptionRange);
  if (!storage?.present || !storage.table || !isCreaturePerceptionRangeRow(storage.value)) {
    return null;
  }
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceRowIndex: storage.value,
  });
}

export function isExistingCreaturePerceptionRangeCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreaturePerceptionRangeCatalog | null | undefined,
): catalog is ExistingCreaturePerceptionRangeCatalog {
  const provenance = readExistingCreaturePerceptionRangeProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreaturePerceptionRangeCatalog(
  facade: CreaturePerceptionRangeCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreaturePerceptionRangeCatalog> {
  const provenance = readExistingCreaturePerceptionRangeProvenance(source);
  if (!provenance) throw new CreaturePerceptionRangeCatalogError(
    "CREATURE_PERCEPTION_RANGE_PROVENANCE_INVALID",
    "Exact existing Creature PerceptionRange provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreaturePerceptionRangeCatalogError(
    "CREATURE_PERCEPTION_RANGE_CATALOG_UNAVAILABLE",
    "The authoritative ranges.2da row catalog is unavailable.",
  );
  if (selectedRowIndex !== undefined && !isAdmittedRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreaturePerceptionRangeCatalogError(
      "CREATURE_PERCEPTION_RANGE_CATALOG_INVALID",
      "The selected PerceptionRange row is not Toolset-admitted.",
    );
  }
  const query = rawQuery.trim().slice(0, MAX_QUERY_CODE_UNITS);
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}),
    limit: PAGE_LIMIT,
    offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadExactRow = async (
    rowIndex: 8 | 9 | 10 | 11,
  ): Promise<CreatureApiPerceptionRangeRow> => {
    const fromPage = pageItems.find((row) => row.rowIndex === rowIndex);
    if (fromPage) return fromPage;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex,
      limit: 1,
      offset: 0,
    });
    const exactItems = readPage(exact, provenance, 1, 0, true);
    if (exactItems.length !== 1 || exactItems[0]!.rowIndex !== rowIndex) {
      throw new CreaturePerceptionRangeCatalogError(
        "CREATURE_PERCEPTION_RANGE_CATALOG_STALE",
        "The retained PerceptionRange row is absent from the current Toolset catalog.",
      );
    }
    return exactItems[0]!;
  };
  const current = await loadExactRow(provenance.sourceRowIndex);
  const selected = selectedRowIndex === undefined ||
    selectedRowIndex === provenance.sourceRowIndex
    ? undefined
    : await loadExactRow(selectedRowIndex);
  const seen = new Set<number>();
  const items = [current, selected, ...pageItems]
    .filter((row): row is CreatureApiPerceptionRangeRow => row !== undefined)
    .filter((row) => !seen.has(row.rowIndex) && Boolean(seen.add(row.rowIndex)))
    .map((row) => Object.freeze({ ...row }));
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    query,
    items: Object.freeze(items),
  });
}

export function reduceExistingCreaturePerceptionRange(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreaturePerceptionRangeCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreaturePerceptionRangeProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance) ||
    !isAdmittedRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((row) => row.rowIndex === candidateValue)
    ? candidateValue
    : currentValue;
}

export const materializeExistingCreaturePerceptionRange =
  reduceExistingCreaturePerceptionRange;

export function resolveCreaturePerceptionRangeDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreaturePerceptionRangeCatalog | null | undefined,
  fallback: string,
): string {
  return catalog?.items.find((row) => row.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadPage(
  facade: CreaturePerceptionRangeCatalogFacade,
  accessToken: string,
  provenance: ExistingCreaturePerceptionRangeProvenance,
  query: {
    rowIndex?: 8 | 9 | 10 | 11;
    query?: string;
    limit: number;
    offset: number;
  },
): Promise<CreatureApiPerceptionRangeRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_PERCEPTION_RANGE_TABLE_STALE";
    throw new CreaturePerceptionRangeCatalogError(
      stale ? "CREATURE_PERCEPTION_RANGE_CATALOG_STALE" :
        "CREATURE_PERCEPTION_RANGE_CATALOG_UNAVAILABLE",
      stale ? "The authoritative ranges.2da identity changed." :
        "The authoritative ranges.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiPerceptionRangeRowsResult,
  provenance: ExistingCreaturePerceptionRangeProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiPerceptionRangeRow[] {
  if (result.resourceName !== "ranges.2da" || result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount) throw new CreaturePerceptionRangeCatalogError(
      "CREATURE_PERCEPTION_RANGE_CATALOG_STALE",
      "The returned ranges.2da identity differs from retained provenance.",
    );
  if (result.limit !== expectedLimit || result.offset !== expectedOffset ||
    !Number.isSafeInteger(result.total) || result.total < 0 || result.total > 4 ||
    (exact && result.total > 1) || !Array.isArray(result.items) ||
    result.items.length > expectedLimit) {
    throw new CreaturePerceptionRangeCatalogError(
      "CREATURE_PERCEPTION_RANGE_CATALOG_INVALID",
      "The returned ranges.2da page metadata is inconsistent.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((row) => {
    if (!isPerceptionRangeRow(row, provenance.rowCount) || seen.has(row.rowIndex)) {
      throw new CreaturePerceptionRangeCatalogError(
        "CREATURE_PERCEPTION_RANGE_CATALOG_INVALID",
        "The returned PerceptionRange option is invalid or duplicated.",
      );
    }
    seen.add(row.rowIndex);
    return row;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreaturePerceptionRangeCatalog | null | undefined,
  provenance: ExistingCreaturePerceptionRangeProvenance,
): catalog is ExistingCreaturePerceptionRangeCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount || typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS || !Array.isArray(catalog.items)) return false;
  const seen = new Set<number>();
  const valid = catalog.items.every((row) => {
    if (!isPerceptionRangeRow(row, provenance.rowCount) || seen.has(row.rowIndex)) return false;
    seen.add(row.rowIndex);
    return true;
  });
  return valid && seen.has(provenance.sourceRowIndex);
}

function isPerceptionRangeRow(
  value: unknown,
  rowCount: number,
): value is CreatureApiPerceptionRangeRow {
  if (!isRecord(value) || !isAdmittedRow(value.rowIndex, rowCount) ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS || value.displayName.includes("\0") ||
    !Number.isSafeInteger(value.nameStrRef) || Number(value.nameStrRef) < 1 ||
    Number(value.nameStrRef) >= 0xffff_ffff) return false;
  if (Object.keys(value).some((key) => ![
    "rowIndex", "displayName", "displaySource", "nameStrRef",
  ].includes(key))) return false;
  return value.displaySource === "strref" ||
    (value.displaySource === "strref_id" &&
      value.displayName === `StringRef ${value.nameStrRef}`);
}

function isAdmittedRow(value: unknown, rowCount: number): value is 8 | 9 | 10 | 11 {
  return isCreaturePerceptionRangeRow(value) && Number(value) < rowCount;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import type { CreatureStartingPackageCatalogFacade } from
  "../../creatures/application/creatureStartingPackageCatalogFacade";
import type {
  CreatureApiStartingPackageRow,
  CreatureApiStartingPackageRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { readCreatureStartingPackageStorage } from
  "../../scene/domain/creatureStartingPackage";

const PAGE_LIMIT = 100;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;
const BYTE_MAX = 0xff;

export interface ExistingCreatureStartingPackageProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
  readonly classIds: readonly number[];
}

export interface ExistingCreatureStartingPackageCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly classIds: readonly number[];
  readonly query: string;
  readonly items: readonly CreatureApiStartingPackageRow[];
}

export class CreatureStartingPackageCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreatureStartingPackageCatalogError";
  }
}

export function readExistingCreatureStartingPackageProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureStartingPackageProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const storage = readCreatureStartingPackageStorage(source.creatureStartingPackage);
  if (!storage?.present || !storage.classIds || !storage.table ||
    !isAdmittedRow(storage.value, storage.table.rowCount)) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceRowIndex: storage.value,
    classIds: Object.freeze([...storage.classIds]),
  });
}

export function isExistingCreatureStartingPackageCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureStartingPackageCatalog | null | undefined,
): catalog is ExistingCreatureStartingPackageCatalog {
  const provenance = readExistingCreatureStartingPackageProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreatureStartingPackageCatalog(
  facade: CreatureStartingPackageCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreatureStartingPackageCatalog> {
  const provenance = readExistingCreatureStartingPackageProvenance(source);
  if (!provenance) throw new CreatureStartingPackageCatalogError(
    "CREATURE_STARTING_PACKAGE_PROVENANCE_INVALID",
    "Exact existing Creature StartingPackage and ClassList provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureStartingPackageCatalogError(
    "CREATURE_STARTING_PACKAGE_CATALOG_UNAVAILABLE",
    "The authoritative packages.2da row catalog is unavailable.",
  );
  if (selectedRowIndex !== undefined && !isAdmittedRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreatureStartingPackageCatalogError(
      "CREATURE_STARTING_PACKAGE_CATALOG_INVALID",
      "The selected StartingPackage row is outside the native Byte/table range.",
    );
  }
  const query = rawQuery.trim().slice(0, MAX_QUERY_CODE_UNITS);
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}), limit: PAGE_LIMIT, offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadExactRow = async (rowIndex: number): Promise<CreatureApiStartingPackageRow> => {
    const fromPage = pageItems.find((row) => row.rowIndex === rowIndex);
    if (fromPage) return fromPage;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex, limit: 1, offset: 0,
    });
    const exactItems = readPage(exact, provenance, 1, 0, true);
    if (exactItems.length !== 1 || exactItems[0]!.rowIndex !== rowIndex) {
      throw new CreatureStartingPackageCatalogError(
        "CREATURE_STARTING_PACKAGE_CATALOG_STALE",
        "The retained StartingPackage row is absent from the current Toolset catalog.",
      );
    }
    return exactItems[0]!;
  };
  const current = await loadExactRow(provenance.sourceRowIndex);
  const selected = selectedRowIndex === undefined || selectedRowIndex === provenance.sourceRowIndex
    ? undefined : await loadExactRow(selectedRowIndex);
  const seen = new Set<number>();
  const items = [current, selected, ...pageItems]
    .filter((row): row is CreatureApiStartingPackageRow => row !== undefined)
    .filter((row) => !seen.has(row.rowIndex) && Boolean(seen.add(row.rowIndex)))
    .map((row) => Object.freeze({ ...row }));
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    classIds: Object.freeze([...provenance.classIds]),
    query,
    items: Object.freeze(items),
  });
}

export function reduceExistingCreatureStartingPackageId(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreatureStartingPackageCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreatureStartingPackageProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance) ||
    !isAdmittedRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((row) => row.rowIndex === candidateValue)
    ? candidateValue : currentValue;
}

export const materializeExistingCreatureStartingPackageId =
  reduceExistingCreatureStartingPackageId;

export function resolveCreatureStartingPackageDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreatureStartingPackageCatalog | null | undefined,
  fallback: string,
): string {
  return catalog?.items.find((row) => row.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadPage(
  facade: CreatureStartingPackageCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureStartingPackageProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiStartingPackageRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      classIds: provenance.classIds,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_STARTING_PACKAGE_TABLE_STALE";
    throw new CreatureStartingPackageCatalogError(
      stale ? "CREATURE_STARTING_PACKAGE_CATALOG_STALE" :
        "CREATURE_STARTING_PACKAGE_CATALOG_UNAVAILABLE",
      stale ? "The authoritative packages.2da identity or ClassList changed." :
        "The authoritative packages.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiStartingPackageRowsResult,
  provenance: ExistingCreatureStartingPackageProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiStartingPackageRow[] {
  if (result.resourceName !== "packages.2da" || result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount || !sameNumbers(result.classIds, provenance.classIds)) {
    throw new CreatureStartingPackageCatalogError(
      "CREATURE_STARTING_PACKAGE_CATALOG_STALE",
      "The returned packages.2da identity or ClassList differs from retained provenance.",
    );
  }
  if (result.limit !== expectedLimit || result.offset !== expectedOffset ||
    !Number.isSafeInteger(result.total) || result.total < 0 || result.total > provenance.rowCount ||
    (exact && result.total > 1) || !Array.isArray(result.items) ||
    result.items.length > expectedLimit) {
    throw new CreatureStartingPackageCatalogError(
      "CREATURE_STARTING_PACKAGE_CATALOG_INVALID",
      "The returned packages.2da page metadata is inconsistent.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((row) => {
    if (!isStartingPackageRow(row, provenance) || seen.has(row.rowIndex)) {
      throw new CreatureStartingPackageCatalogError(
        "CREATURE_STARTING_PACKAGE_CATALOG_INVALID",
        "The returned StartingPackage option is invalid or duplicated.",
      );
    }
    seen.add(row.rowIndex);
    return row;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureStartingPackageCatalog | null | undefined,
  provenance: ExistingCreatureStartingPackageProvenance,
): catalog is ExistingCreatureStartingPackageCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount ||
    !sameNumbers(catalog.classIds, provenance.classIds) || typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS || !Array.isArray(catalog.items)) return false;
  const seen = new Set<number>();
  const valid = catalog.items.every((row) => {
    if (!isStartingPackageRow(row, provenance) || seen.has(row.rowIndex)) return false;
    seen.add(row.rowIndex);
    return true;
  });
  return valid && seen.has(provenance.sourceRowIndex);
}

function isStartingPackageRow(
  value: unknown,
  provenance: ExistingCreatureStartingPackageProvenance,
): value is CreatureApiStartingPackageRow {
  if (!isRecord(value) || !isAdmittedRow(value.rowIndex, provenance.rowCount) ||
    !Number.isSafeInteger(value.classId) || !provenance.classIds.includes(Number(value.classId)) ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS || value.displayName.includes("\0") ||
    Object.keys(value).some((key) => ![
      "rowIndex", "classId", "displayName", "displaySource", "nameStrRef",
    ].includes(key))) return false;
  if (value.displaySource === "label") return value.nameStrRef === null;
  if (!Number.isSafeInteger(value.nameStrRef) || Number(value.nameStrRef) < 0 ||
    Number(value.nameStrRef) > 0xffff_ffff) return false;
  return value.displaySource === "strref" ||
    (value.displaySource === "strref_id" &&
      value.displayName === `StringRef ${value.nameStrRef}`);
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isAdmittedRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX &&
    Number(value) < rowCount;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

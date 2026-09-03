import type { CreatureAppendageCatalogFacade } from
  "../../creatures/application/creatureAppendageCatalogFacade";
import type {
  CreatureApiAppendageRow,
  CreatureApiAppendageRowsResult,
} from "../../creatures/contracts";
import type {
  SceneObjectCreatureAppendageKey,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { readCreatureAppendagesStorage } from "../../scene/domain/creatureAppendages";

const DWORD_MAX = 0xffff_ffff;
const PAGE_LIMIT = 256;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;

export interface ExistingCreatureAppendageProvenance {
  readonly kind: SceneObjectCreatureAppendageKey;
  readonly resourceName: "wingmodel.2da" | "tailmodel.2da";
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
}

export interface ExistingCreatureAppendageCatalog {
  readonly kind: SceneObjectCreatureAppendageKey;
  readonly resourceName: "wingmodel.2da" | "tailmodel.2da";
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly CreatureApiAppendageRow[];
}

export type CreatureAppendageCatalogErrorCode =
  | "CREATURE_APPENDAGE_PROVENANCE_INVALID"
  | "CREATURE_APPENDAGE_CATALOG_UNAVAILABLE"
  | "CREATURE_APPENDAGE_CATALOG_STALE"
  | "CREATURE_APPENDAGE_CATALOG_INVALID";

export class CreatureAppendageCatalogError extends Error {
  constructor(readonly code: CreatureAppendageCatalogErrorCode, message: string) {
    super(message);
    this.name = "CreatureAppendageCatalogError";
  }
}

export function readExistingCreatureAppendageProvenance(
  source: SceneObjectSourceMetadata | undefined,
  kind: SceneObjectCreatureAppendageKey,
): ExistingCreatureAppendageProvenance | null {
  if (
    source?.type !== "aurora_git" ||
    source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) ||
    Number(source.sourceIndex) < 0
  ) return null;
  const storage = readCreatureAppendagesStorage(source.creatureAppendages)?.[kind];
  if (!storage?.present || !storage.modernDword.present || !storage.modernDword.table) return null;
  const table = storage.modernDword.table;
  return Object.freeze({
    kind,
    resourceName: table.resourceName,
    tableSha256: table.sha256,
    rowCount: table.rowCount,
    sourceRowIndex: storage.modernDword.value,
  });
}

export function canEditExistingCreatureAppendage(
  source: SceneObjectSourceMetadata | undefined,
  kind: SceneObjectCreatureAppendageKey,
): boolean {
  return readExistingCreatureAppendageProvenance(source, kind) !== null;
}

export function isExistingCreatureAppendageCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  kind: SceneObjectCreatureAppendageKey,
  catalog: ExistingCreatureAppendageCatalog | null | undefined,
): catalog is ExistingCreatureAppendageCatalog {
  const provenance = readExistingCreatureAppendageProvenance(source, kind);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreatureAppendageCatalog(
  facade: CreatureAppendageCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  kind: SceneObjectCreatureAppendageKey,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreatureAppendageCatalog> {
  const provenance = readExistingCreatureAppendageProvenance(source, kind);
  if (!provenance) {
    throw new CreatureAppendageCatalogError(
      "CREATURE_APPENDAGE_PROVENANCE_INVALID",
      `Exact existing Creature ${kind} provenance is required.`,
    );
  }
  if (!facade?.queries?.listRows || !accessToken) {
    throw new CreatureAppendageCatalogError(
      "CREATURE_APPENDAGE_CATALOG_UNAVAILABLE",
      `The authoritative ${provenance.resourceName} row catalog is unavailable.`,
    );
  }
  const query = normalizeQuery(rawQuery);
  if (selectedRowIndex !== undefined && !isDwordRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreatureAppendageCatalogError(
      "CREATURE_APPENDAGE_CATALOG_INVALID",
      `The selected Creature ${kind} row is outside the retained table.`,
    );
  }
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}), limit: PAGE_LIMIT, offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadExactRow = async (rowIndex: number): Promise<CreatureApiAppendageRow> => {
    const fromPage = pageItems.find((item) => item.rowIndex === rowIndex);
    if (fromPage) return fromPage;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex, limit: 1, offset: 0,
    });
    const items = readPage(exact, provenance, 1, 0, true);
    if (items.length !== 1 || items[0]!.rowIndex !== rowIndex) {
      throw new CreatureAppendageCatalogError(
        "CREATURE_APPENDAGE_CATALOG_STALE",
        `The retained Creature ${kind} row is not Toolset-admitted by the current table.`,
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
    .filter((item): item is CreatureApiAppendageRow => item !== undefined)
    .filter((item) => !seen.has(item.rowIndex) && Boolean(seen.add(item.rowIndex)))
    .map((item) => Object.freeze({ ...item }));
  return Object.freeze({
    kind,
    resourceName: provenance.resourceName,
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    query,
    items: Object.freeze(items),
  });
}

export function reduceExistingCreatureAppendage(
  source: SceneObjectSourceMetadata | undefined,
  kind: SceneObjectCreatureAppendageKey,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreatureAppendageCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreatureAppendageProvenance(source, kind);
  if (!provenance || !isAdmittedCatalog(catalog, provenance)) return currentValue;
  if (!isDwordRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((item) => item.rowIndex === candidateValue)
    ? candidateValue
    : currentValue;
}

export const materializeExistingCreatureAppendage = reduceExistingCreatureAppendage;

export function resolveCreatureAppendageDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreatureAppendageCatalog | null | undefined,
  fallback: string,
): string {
  if (rowIndex === undefined || !catalog) return fallback;
  return catalog.items.find((item) => item.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadPage(
  facade: CreatureAppendageCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureAppendageProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiAppendageRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      kind: provenance.kind,
      tableSha256: provenance.tableSha256,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && (
      error.code === "CREATURE_APPENDAGE_TABLE_STALE" ||
      error.code === "CREATURE_APPENDAGE_TABLE_MISMATCH"
    );
    throw new CreatureAppendageCatalogError(
      stale ? "CREATURE_APPENDAGE_CATALOG_STALE" : "CREATURE_APPENDAGE_CATALOG_UNAVAILABLE",
      stale
        ? `The authoritative ${provenance.resourceName} identity changed.`
        : `The authoritative ${provenance.resourceName} row catalog could not be loaded.`,
    );
  }
}

function readPage(
  result: CreatureApiAppendageRowsResult,
  provenance: ExistingCreatureAppendageProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiAppendageRow[] {
  if (
    result.resourceName !== provenance.resourceName ||
    result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount
  ) {
    throw new CreatureAppendageCatalogError(
      "CREATURE_APPENDAGE_CATALOG_STALE",
      `The returned ${provenance.resourceName} identity differs from retained provenance.`,
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
    throw new CreatureAppendageCatalogError(
      "CREATURE_APPENDAGE_CATALOG_INVALID",
      `The returned ${provenance.resourceName} page metadata is inconsistent.`,
    );
  }
  const seen = new Set<number>();
  return result.items.map((item) => {
    if (!isAppendageRow(item, provenance.rowCount) || seen.has(item.rowIndex)) {
      throw new CreatureAppendageCatalogError(
        "CREATURE_APPENDAGE_CATALOG_INVALID",
        `The returned Creature ${provenance.kind} option is invalid or duplicated.`,
      );
    }
    seen.add(item.rowIndex);
    return item;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureAppendageCatalog | null | undefined,
  provenance: ExistingCreatureAppendageProvenance,
): catalog is ExistingCreatureAppendageCatalog {
  if (
    !catalog ||
    catalog.kind !== provenance.kind ||
    catalog.resourceName !== provenance.resourceName ||
    catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount ||
    typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS ||
    !Array.isArray(catalog.items)
  ) return false;
  const seen = new Set<number>();
  const valid = catalog.items.every((item) => {
    if (!isAppendageRow(item, provenance.rowCount) || seen.has(item.rowIndex)) return false;
    seen.add(item.rowIndex);
    return true;
  });
  return valid && seen.has(provenance.sourceRowIndex);
}

function isAppendageRow(value: unknown, rowCount: number): value is CreatureApiAppendageRow {
  return isRecord(value) &&
    Object.keys(value).every((key) => key === "rowIndex" || key === "displayName") &&
    isDwordRow(value.rowIndex, rowCount) &&
    typeof value.displayName === "string" &&
    value.displayName.length >= 1 &&
    value.displayName.length <= MAX_DISPLAY_CODE_UNITS &&
    !value.displayName.includes("\0");
}

function isDwordRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) &&
    Number(value) >= 0 &&
    Number(value) <= DWORD_MAX &&
    Number(value) < rowCount;
}

function normalizeQuery(value: string): string {
  return value.trim().slice(0, MAX_QUERY_CODE_UNITS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

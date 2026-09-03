import type { CreatureAppearanceCatalogFacade } from "../../creatures/application/creatureAppearanceCatalogFacade";
import type {
  CreatureApiAppearanceRow,
  CreatureApiAppearanceRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { readCreatureAppearanceStorage } from "../../scene/domain/creatureAppearance";

const WORD_MAX = 0xffff;
const PAGE_LIMIT = 256;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;
const MAX_LABEL_CODE_UNITS = 256;

export interface ExistingCreatureAppearanceProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
}

export interface ExistingCreatureAppearanceCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly CreatureApiAppearanceRow[];
}

export type CreatureAppearanceCatalogErrorCode =
  | "CREATURE_APPEARANCE_PROVENANCE_INVALID"
  | "CREATURE_APPEARANCE_CATALOG_UNAVAILABLE"
  | "CREATURE_APPEARANCE_CATALOG_STALE"
  | "CREATURE_APPEARANCE_CATALOG_INVALID";

export class CreatureAppearanceCatalogError extends Error {
  constructor(readonly code: CreatureAppearanceCatalogErrorCode, message: string) {
    super(message);
    this.name = "CreatureAppearanceCatalogError";
  }
}

export function readExistingCreatureAppearanceProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureAppearanceProvenance | null {
  if (
    source?.type !== "aurora_git" ||
    source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) ||
    Number(source.sourceIndex) < 0
  ) return null;
  const storage = readCreatureAppearanceStorage(source.creatureAppearance);
  if (!storage?.present || !storage.table) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceRowIndex: storage.value,
  });
}

export function canEditExistingCreatureAppearance(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingCreatureAppearanceProvenance(source) !== null;
}

export function isExistingCreatureAppearanceCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureAppearanceCatalog | null | undefined,
): catalog is ExistingCreatureAppearanceCatalog {
  const provenance = readExistingCreatureAppearanceProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreatureAppearanceCatalog(
  facade: CreatureAppearanceCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreatureAppearanceCatalog> {
  const provenance = readExistingCreatureAppearanceProvenance(source);
  if (!provenance) {
    throw new CreatureAppearanceCatalogError(
      "CREATURE_APPEARANCE_PROVENANCE_INVALID",
      "Exact existing Creature Appearance provenance is required.",
    );
  }
  if (!facade?.queries?.listRows || !accessToken) {
    throw new CreatureAppearanceCatalogError(
      "CREATURE_APPEARANCE_CATALOG_UNAVAILABLE",
      "The authoritative appearance.2da row catalog is unavailable.",
    );
  }
  const query = normalizeQuery(rawQuery);
  if (selectedRowIndex !== undefined && !isWordRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreatureAppearanceCatalogError(
      "CREATURE_APPEARANCE_CATALOG_INVALID",
      "The selected Creature Appearance row is outside the retained table.",
    );
  }
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}),
    limit: PAGE_LIMIT,
    offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadExactRow = async (rowIndex: number): Promise<CreatureApiAppearanceRow> => {
    const fromPage = pageItems.find((item) => item.rowIndex === rowIndex);
    if (fromPage) return fromPage;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex,
      limit: 1,
      offset: 0,
    });
    const items = readPage(exact, provenance, 1, 0, true);
    if (items.length !== 1 || items[0]!.rowIndex !== rowIndex) {
      throw new CreatureAppearanceCatalogError(
        "CREATURE_APPEARANCE_CATALOG_STALE",
        "The retained Creature Appearance row is not Toolset-admitted by the current table.",
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
    .filter((item): item is CreatureApiAppearanceRow => item !== undefined)
    .filter((item) => !seen.has(item.rowIndex) && Boolean(seen.add(item.rowIndex)))
    .map((item) => Object.freeze({ ...item }));
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    query,
    items: Object.freeze(items),
  });
}

export function reduceExistingCreatureAppearance(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreatureAppearanceCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreatureAppearanceProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance)) return currentValue;
  if (!isWordRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((item) => item.rowIndex === candidateValue)
    ? candidateValue
    : currentValue;
}

export const materializeExistingCreatureAppearance = reduceExistingCreatureAppearance;

async function loadPage(
  facade: CreatureAppearanceCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureAppearanceProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiAppearanceRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_APPEARANCE_TABLE_STALE";
    throw new CreatureAppearanceCatalogError(
      stale ? "CREATURE_APPEARANCE_CATALOG_STALE" : "CREATURE_APPEARANCE_CATALOG_UNAVAILABLE",
      stale
        ? "The authoritative appearance.2da identity changed."
        : "The authoritative appearance.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiAppearanceRowsResult,
  provenance: ExistingCreatureAppearanceProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiAppearanceRow[] {
  if (
    result.resourceName !== "appearance.2da" ||
    result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount
  ) {
    throw new CreatureAppearanceCatalogError(
      "CREATURE_APPEARANCE_CATALOG_STALE",
      "The returned appearance.2da identity differs from retained provenance.",
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
    throw new CreatureAppearanceCatalogError(
      "CREATURE_APPEARANCE_CATALOG_INVALID",
      "The returned appearance.2da page metadata is inconsistent.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((item) => {
    if (!isAppearanceRow(item, provenance.rowCount) || seen.has(item.rowIndex)) {
      throw new CreatureAppearanceCatalogError(
        "CREATURE_APPEARANCE_CATALOG_INVALID",
        "The returned Creature Appearance option is invalid or duplicated.",
      );
    }
    seen.add(item.rowIndex);
    return item;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureAppearanceCatalog | null | undefined,
  provenance: ExistingCreatureAppearanceProvenance,
): catalog is ExistingCreatureAppearanceCatalog {
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
    if (!isAppearanceRow(item, provenance.rowCount) || seen.has(item.rowIndex)) return false;
    seen.add(item.rowIndex);
    return true;
  });
  return valid && seen.has(provenance.sourceRowIndex);
}

function isAppearanceRow(value: unknown, rowCount: number): value is CreatureApiAppearanceRow {
  if (!isRecord(value) || !isWordRow(value.rowIndex, rowCount)) return false;
  if (
    typeof value.displayName !== "string" ||
    value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS ||
    value.displayName.includes("\0")
  ) return false;
  const keys = Object.keys(value);
  if (keys.some((key) => !["rowIndex", "displayName", "displaySource", "strRef", "label"].includes(key))) return false;
  const validLabel = value.label === undefined || (
    typeof value.label === "string" &&
    value.label.length >= 1 &&
    value.label.length <= MAX_LABEL_CODE_UNITS &&
    !value.label.includes("\0")
  );
  if (!validLabel) return false;
  if (value.displaySource === "label") {
    return keys.length === 4 && value.label === value.displayName && value.strRef === undefined;
  }
  if (
    (value.displaySource !== "strref" && value.displaySource !== "strref_id") ||
    !Number.isSafeInteger(value.strRef) ||
    Number(value.strRef) < 1 ||
    Number(value.strRef) > 0xffff_fffe
  ) return false;
  return value.displaySource !== "strref_id" || value.displayName === `StringRef ${value.strRef}`;
}

function isWordRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= WORD_MAX && Number(value) < rowCount;
}

function normalizeQuery(value: string): string {
  const normalized = value.trim();
  if (normalized.length > MAX_QUERY_CODE_UNITS || normalized.includes("\0")) {
    throw new CreatureAppearanceCatalogError(
      "CREATURE_APPEARANCE_CATALOG_INVALID",
      "The Creature Appearance query is invalid.",
    );
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

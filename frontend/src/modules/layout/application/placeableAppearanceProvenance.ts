import type {
  PlaceableApiAppearanceRow,
  PlaceableApiAppearanceRowsResult
} from "../../placeables/contracts";
import type { PlaceableApiPort } from "../../placeables/ports/placeableApiPort";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";

const MAX_DWORD = 0xffff_ffff;
const MAX_ROW_COUNT = 1_000_000;
const MAX_TABLE_BYTES = 64 * 1024 * 1024;
const MAX_SOURCE_OBJECT_KEY_CODE_UNITS = 2048;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;
const MAX_LABEL_CODE_UNITS = 256;
const PAGE_LIMIT = 256;

export interface ExistingPlaceableAppearanceProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
}

export interface ExistingPlaceableAppearanceCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly PlaceableApiAppearanceRow[];
}

export type PlaceableAppearanceCatalogErrorCode =
  | "PLACEABLE_APPEARANCE_PROVENANCE_INVALID"
  | "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE"
  | "PLACEABLE_APPEARANCE_CATALOG_STALE"
  | "PLACEABLE_APPEARANCE_CATALOG_INVALID";

export class PlaceableAppearanceCatalogError extends Error {
  constructor(
    readonly code: PlaceableAppearanceCatalogErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PlaceableAppearanceCatalogError";
  }
}

export function readExistingPlaceableAppearanceProvenance(
  source: SceneObjectSourceMetadata | undefined
): ExistingPlaceableAppearanceProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") {
    return null;
  }
  const identity = source.placeableBasicIdentity;
  const appearance = identity?.appearance;
  if (!isRecord(appearance) || !hasExactKeys(appearance, [
    "present",
    "nativeType",
    "value",
    "table"
  ])) {
    return null;
  }
  if (appearance.present !== true || appearance.nativeType !== "dword") {
    return null;
  }
  const tableInput: unknown = appearance.table;
  if (!isRecord(tableInput) || !hasExactKeys(tableInput, [
    "resourceName",
    "sourceObjectKey",
    "sourceLayer",
    "sha256",
    "sizeBytes",
    "rowCount",
    "rowIndex"
  ])) {
    return null;
  }
  const table = tableInput;
  if (
    table.resourceName !== "placeables.2da" ||
    typeof table.sourceObjectKey !== "string" ||
    table.sourceObjectKey.length < 1 ||
    table.sourceObjectKey.length > MAX_SOURCE_OBJECT_KEY_CODE_UNITS ||
    (table.sourceLayer !== "module" && table.sourceLayer !== "hak" && table.sourceLayer !== "vanilla") ||
    typeof table.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(table.sha256) ||
    !isIntegerBetween(table.sizeBytes, 1, MAX_TABLE_BYTES) ||
    !isIntegerBetween(table.rowCount, 1, MAX_ROW_COUNT) ||
    !isIntegerBetween(appearance.value, 0, MAX_DWORD) ||
    !isIntegerBetween(table.rowIndex, 0, MAX_DWORD) ||
    appearance.value !== table.rowIndex ||
    table.rowIndex >= table.rowCount
  ) {
    return null;
  }
  return Object.freeze({
    tableSha256: table.sha256,
    rowCount: table.rowCount,
    sourceRowIndex: table.rowIndex
  });
}

export function canEditExistingPlaceableAppearance(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return readExistingPlaceableAppearanceProvenance(source) !== null;
}

export function isExistingPlaceableAppearanceCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingPlaceableAppearanceCatalog | null | undefined
): catalog is ExistingPlaceableAppearanceCatalog {
  const provenance = readExistingPlaceableAppearanceProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingPlaceableAppearanceCatalog(
  port: Pick<PlaceableApiPort, "listPlaceableAppearanceRows">,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number
): Promise<ExistingPlaceableAppearanceCatalog> {
  const provenance = readExistingPlaceableAppearanceProvenance(source);
  if (!provenance) {
    throw new PlaceableAppearanceCatalogError(
      "PLACEABLE_APPEARANCE_PROVENANCE_INVALID",
      "Exact existing Placeable Appearance provenance is required."
    );
  }
  const listRows = port.listPlaceableAppearanceRows;
  if (!listRows || typeof accessToken !== "string" || accessToken.length < 1) {
    throw new PlaceableAppearanceCatalogError(
      "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE",
      "The authoritative placeables.2da row catalog is unavailable."
    );
  }
  const query = normalizeQuery(rawQuery);
  if (selectedRowIndex !== undefined &&
    (!isIntegerBetween(selectedRowIndex, 0, MAX_DWORD) || selectedRowIndex >= provenance.rowCount)) {
    throw new PlaceableAppearanceCatalogError(
      "PLACEABLE_APPEARANCE_CATALOG_INVALID",
      "The selected Placeable Appearance row is outside the retained table."
    );
  }
  let page: PlaceableApiAppearanceRowsResult;
  try {
    page = await listRows.call(port, accessToken, {
      tableSha256: provenance.tableSha256,
      ...(query ? { query } : {}),
      limit: PAGE_LIMIT,
      offset: 0
    });
  } catch (error) {
    if (error instanceof PlaceableAppearanceCatalogError) throw error;
    throw new PlaceableAppearanceCatalogError(
      "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE",
      `The authoritative placeables.2da row page could not be loaded: ${errorMessage(error)}`
    );
  }
  const pageItems = readExactPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadRequiredRow = async (
    rowIndex: number,
    description: "native" | "selected"
  ): Promise<PlaceableApiAppearanceRow> => {
    const pageItem = pageItems.find((item) => item.rowIndex === rowIndex);
    if (pageItem) return pageItem;
    let retainedPage: PlaceableApiAppearanceRowsResult;
    try {
      retainedPage = await listRows.call(port, accessToken, {
        tableSha256: provenance.tableSha256,
        limit: 1,
        offset: rowIndex
      });
    } catch (error) {
      throw new PlaceableAppearanceCatalogError(
        "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE",
        `The ${description} physical placeables.2da row could not be loaded: ${errorMessage(error)}`
      );
    }
    const retainedItems = readExactPage(
      retainedPage,
      provenance,
      1,
      rowIndex,
      true
    );
    const retainedItem = retainedItems[0];
    if (!retainedItem || retainedItem.rowIndex !== rowIndex) {
      throw new PlaceableAppearanceCatalogError(
        "PLACEABLE_APPEARANCE_CATALOG_STALE",
        `The retained ${description} Placeable Appearance row is absent from the current table.`
      );
    }
    return retainedItem;
  };
  const currentItem = await loadRequiredRow(provenance.sourceRowIndex, "native");
  const selectedItem = selectedRowIndex === undefined || selectedRowIndex === provenance.sourceRowIndex
    ? undefined
    : await loadRequiredRow(selectedRowIndex, "selected");
  const seen = new Set<number>();
  const combined = [currentItem, selectedItem, ...pageItems]
    .filter((item): item is PlaceableApiAppearanceRow => item !== undefined)
    .filter((item) => {
      if (seen.has(item.rowIndex)) return false;
      seen.add(item.rowIndex);
      return true;
    })
    .map((item) => Object.freeze({ ...item }));
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    query,
    items: Object.freeze(combined)
  });
}

export function reduceExistingPlaceableAppearance(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingPlaceableAppearanceCatalog | null | undefined
): number | undefined {
  const provenance = readExistingPlaceableAppearanceProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance)) {
    return currentValue;
  }
  if (!isIntegerBetween(candidateValue, 0, MAX_DWORD) || candidateValue >= provenance.rowCount) {
    return currentValue;
  }
  return catalog.items.some((item) => item.rowIndex === candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingPlaceableAppearance(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  draftValue: unknown,
  catalog: ExistingPlaceableAppearanceCatalog | null | undefined
): number | undefined {
  return reduceExistingPlaceableAppearance(source, currentValue, draftValue, catalog);
}

function readExactPage(
  result: PlaceableApiAppearanceRowsResult,
  provenance: ExistingPlaceableAppearanceProvenance,
  expectedLimit: number,
  expectedOffset: number,
  requireUnfilteredTotal: boolean
): readonly PlaceableApiAppearanceRow[] {
  if (
    result.resourceName !== "placeables.2da" ||
    result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount
  ) {
    throw new PlaceableAppearanceCatalogError(
      "PLACEABLE_APPEARANCE_CATALOG_STALE",
      "The returned placeables.2da identity differs from retained provenance."
    );
  }
  if (
    result.limit !== expectedLimit ||
    result.offset !== expectedOffset ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0 ||
    (requireUnfilteredTotal && result.total !== provenance.rowCount) ||
    !Array.isArray(result.items) ||
    result.items.length > expectedLimit
  ) {
    throw new PlaceableAppearanceCatalogError(
      "PLACEABLE_APPEARANCE_CATALOG_INVALID",
      "The returned placeables.2da row page metadata is inconsistent."
    );
  }
  const seen = new Set<number>();
  const items = result.items.map((item) => {
    if (!isAppearanceRow(item, provenance.rowCount) || seen.has(item.rowIndex)) {
      throw new PlaceableAppearanceCatalogError(
        "PLACEABLE_APPEARANCE_CATALOG_INVALID",
        "The returned placeables.2da row option is invalid or duplicated."
      );
    }
    seen.add(item.rowIndex);
    return item;
  });
  return items;
}

function isAdmittedCatalog(
  catalog: ExistingPlaceableAppearanceCatalog | null | undefined,
  provenance: ExistingPlaceableAppearanceProvenance
): catalog is ExistingPlaceableAppearanceCatalog {
  if (!catalog ||
    catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount ||
    typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS ||
    !Array.isArray(catalog.items)) {
    return false;
  }
  const seen = new Set<number>();
  return catalog.items.every((item) => {
    if (!isAppearanceRow(item, provenance.rowCount) || seen.has(item.rowIndex)) return false;
    seen.add(item.rowIndex);
    return true;
  });
}

function isAppearanceRow(value: unknown, rowCount: number): value is PlaceableApiAppearanceRow {
  if (!isRecord(value)) return false;
  const allowedKeys = ["rowIndex", "displayName", "displaySource", "strRef", "label"];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key)) ||
    !isIntegerBetween(value.rowIndex, 0, MAX_DWORD) ||
    value.rowIndex >= rowCount ||
    typeof value.displayName !== "string" ||
    value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS ||
    value.displayName.includes("\0") ||
    (value.displaySource !== "strref" && value.displaySource !== "label" && value.displaySource !== "row_index")) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(value, "strRef") &&
    !isIntegerBetween(value.strRef, 0, MAX_DWORD)) {
    return false;
  }
  return !Object.prototype.hasOwnProperty.call(value, "label") ||
    (typeof value.label === "string" &&
      value.label.length >= 1 &&
      value.label.length <= MAX_LABEL_CODE_UNITS &&
      !value.label.includes("\0"));
}

function normalizeQuery(value: string): string {
  const query = typeof value === "string" ? value.trim() : undefined;
  if (query === undefined || query.length > MAX_QUERY_CODE_UNITS || query.includes("\0")) {
    throw new PlaceableAppearanceCatalogError(
      "PLACEABLE_APPEARANCE_CATALOG_INVALID",
      "The Appearance search query is invalid."
    );
  }
  return query;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

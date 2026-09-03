import type {
  WaypointApiAppearanceRow,
  WaypointApiAppearanceRowsResult,
} from "../../waypoints/contracts";
import type { WaypointApiPort } from "../../waypoints/ports/waypointApiPort";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";

const MAX_SOURCE_KEY = 2048;
const MAX_TABLE_BYTES = 1024 * 1024;
const MAX_ROWS = 256;

export interface ExistingWaypointAppearanceProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
}

export interface ExistingWaypointAppearanceCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly items: readonly WaypointApiAppearanceRow[];
}

export class WaypointAppearanceCatalogError extends Error {
  constructor(
    readonly code:
      | "WAYPOINT_APPEARANCE_PROVENANCE_INVALID"
      | "WAYPOINT_APPEARANCE_CATALOG_UNAVAILABLE"
      | "WAYPOINT_APPEARANCE_CATALOG_STALE"
      | "WAYPOINT_APPEARANCE_CATALOG_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "WaypointAppearanceCatalogError";
  }
}

export function readExistingWaypointAppearanceProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingWaypointAppearanceProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "waypoint") return null;
  const value = source.waypointAppearance;
  if (!isRecord(value) || !hasExactKeys(value, ["present", "nativeType", "value", "table"]) ||
    value.present !== true || value.nativeType !== "byte" || !isByte(value.value) ||
    !isRecord(value.table) || !hasExactKeys(value.table, [
      "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
      "rowCount", "rowIndex",
    ])) return null;
  const table = value.table;
  if (table.resourceName !== "waypoint.2da" ||
    typeof table.sourceObjectKey !== "string" || table.sourceObjectKey.length < 1 ||
    table.sourceObjectKey.length > MAX_SOURCE_KEY ||
    (table.sourceLayer !== "module" && table.sourceLayer !== "hak" &&
      table.sourceLayer !== "vanilla") ||
    typeof table.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(table.sha256) ||
    !isIntegerBetween(table.sizeBytes, 1, MAX_TABLE_BYTES) ||
    !isIntegerBetween(table.rowCount, 1, MAX_ROWS) ||
    !isByte(table.rowIndex) || table.rowIndex >= table.rowCount ||
    value.value !== table.rowIndex) return null;
  return Object.freeze({
    tableSha256: table.sha256,
    rowCount: table.rowCount,
    sourceRowIndex: table.rowIndex,
  });
}

export function canEditExistingWaypointAppearance(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingWaypointAppearanceProvenance(source) !== null;
}

export async function loadExistingWaypointAppearanceCatalog(
  port: Pick<WaypointApiPort, "listWaypointAppearanceRows">,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
): Promise<ExistingWaypointAppearanceCatalog> {
  const provenance = readExistingWaypointAppearanceProvenance(source);
  if (!provenance) throw new WaypointAppearanceCatalogError(
    "WAYPOINT_APPEARANCE_PROVENANCE_INVALID",
    "Exact existing Waypoint Appearance provenance is required.",
  );
  const listRows = port.listWaypointAppearanceRows;
  if (!listRows || typeof accessToken !== "string" || accessToken.length < 1) {
    throw new WaypointAppearanceCatalogError(
      "WAYPOINT_APPEARANCE_CATALOG_UNAVAILABLE",
      "The authoritative waypoint.2da catalog is unavailable.",
    );
  }
  let result: WaypointApiAppearanceRowsResult;
  try {
    result = await listRows.call(port, accessToken, {
      tableSha256: provenance.tableSha256,
      limit: MAX_ROWS,
      offset: 0,
    });
  } catch (error) {
    throw new WaypointAppearanceCatalogError(
      "WAYPOINT_APPEARANCE_CATALOG_UNAVAILABLE",
      `The authoritative waypoint.2da catalog could not be loaded: ${errorMessage(error)}`,
    );
  }
  const items = readCatalog(result, provenance);
  if (!items.some((row) => row.rowIndex === provenance.sourceRowIndex)) {
    throw new WaypointAppearanceCatalogError(
      "WAYPOINT_APPEARANCE_CATALOG_STALE",
      "The retained Waypoint Appearance row is not selectable in the current table.",
    );
  }
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    items: Object.freeze(items.map((row) => Object.freeze({ ...row }))),
  });
}

export function isExistingWaypointAppearanceCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingWaypointAppearanceCatalog | null | undefined,
): catalog is ExistingWaypointAppearanceCatalog {
  const provenance = readExistingWaypointAppearanceProvenance(source);
  return provenance !== null && catalog?.tableSha256 === provenance.tableSha256 &&
    catalog.rowCount === provenance.rowCount && Array.isArray(catalog.items) &&
    catalog.items.some((row) => row.rowIndex === provenance.sourceRowIndex) &&
    catalog.items.every((row) => isRow(row, provenance.rowCount));
}

export function reduceExistingWaypointAppearance(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingWaypointAppearanceCatalog | null | undefined,
): number | undefined {
  if (!isExistingWaypointAppearanceCatalogAdmitted(source, catalog) ||
    !isByte(candidateValue)) return currentValue;
  return catalog.items.some((row) => row.rowIndex === candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingWaypointAppearance(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  draftValue: unknown,
  catalog: ExistingWaypointAppearanceCatalog | null | undefined,
): number | undefined {
  return reduceExistingWaypointAppearance(source, currentValue, draftValue, catalog);
}

function readCatalog(
  result: WaypointApiAppearanceRowsResult,
  provenance: ExistingWaypointAppearanceProvenance,
): readonly WaypointApiAppearanceRow[] {
  if (result.resourceName !== "waypoint.2da" ||
    result.sha256 !== provenance.tableSha256 || result.rowCount !== provenance.rowCount) {
    throw new WaypointAppearanceCatalogError(
      "WAYPOINT_APPEARANCE_CATALOG_STALE",
      "The returned waypoint.2da identity differs from retained provenance.",
    );
  }
  if (result.limit !== MAX_ROWS || result.offset !== 0 ||
    result.total !== result.items.length || result.items.length > provenance.rowCount) {
    throw new WaypointAppearanceCatalogError(
      "WAYPOINT_APPEARANCE_CATALOG_INVALID",
      "The returned waypoint.2da page metadata is inconsistent.",
    );
  }
  const seen = new Set<number>();
  for (const row of result.items) {
    if (!isRow(row, provenance.rowCount) || seen.has(row.rowIndex)) {
      throw new WaypointAppearanceCatalogError(
        "WAYPOINT_APPEARANCE_CATALOG_INVALID",
        "The returned waypoint.2da row is invalid or duplicated.",
      );
    }
    seen.add(row.rowIndex);
  }
  return result.items;
}

function isRow(value: unknown, rowCount: number): value is WaypointApiAppearanceRow {
  if (!isRecord(value) || !isIntegerBetween(value.rowIndex, 0, 0xff) ||
    value.rowIndex >= rowCount || typeof value.modelResRef !== "string" ||
    !/^[A-Za-z0-9_]{1,16}$/u.test(value.modelResRef) ||
    !isIntegerBetween(value.strRef, 0, 0xffff_ffff) ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > 1024 || value.displayName.includes("\0") ||
    (value.displaySource !== "strref" && value.displaySource !== "label" &&
      value.displaySource !== "model_resref")) return false;
  return value.label === undefined ||
    (typeof value.label === "string" && value.label.length >= 1 &&
      value.label.length <= 256 && !value.label.includes("\0"));
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

function isByte(value: unknown): value is number {
  return isIntegerBetween(value, 0, 0xff);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

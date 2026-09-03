import type { CreatureFeatCatalogFacade } from
  "../../creatures/application/creatureFeatCatalogFacade";
import type {
  CreatureApiFeatRow,
  CreatureApiFeatRowsResult,
} from "../../creatures/contracts";
import type {
  SceneObjectCreatureFeatEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { readCreatureFeatListStorage } from "../../scene/domain/creatureFeatList";

const PAGE_LIMIT = 128;
const MAX_DISPLAY_CODE_UNITS = 1_024;

export interface ExistingCreatureFeatListProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceFeatIds: readonly number[];
  readonly opaqueSiblingFieldCounts: readonly number[];
}

export interface ExistingCreatureFeatCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly items: readonly CreatureApiFeatRow[];
}

export class CreatureFeatCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreatureFeatCatalogError";
  }
}

export function readExistingCreatureFeatListProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureFeatListProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const storage = readCreatureFeatListStorage(source.creatureFeatList);
  if (!storage?.present || !storage.table ||
    new Set(storage.featIds).size !== storage.featIds.length ||
    storage.opaqueSiblingFieldCounts.some((count) => count !== 0)) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceFeatIds: Object.freeze([...storage.featIds]),
    opaqueSiblingFieldCounts: Object.freeze([...storage.opaqueSiblingFieldCounts]),
  });
}

export function isExistingCreatureFeatCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureFeatCatalog | null | undefined,
): catalog is ExistingCreatureFeatCatalog {
  const provenance = readExistingCreatureFeatListProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance) &&
    provenance.sourceFeatIds.every((featId) =>
      catalog.items.some((row) => row.rowIndex === featId));
}

export async function loadExistingCreatureFeatCatalog(
  facade: CreatureFeatCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
): Promise<ExistingCreatureFeatCatalog> {
  const provenance = readExistingCreatureFeatListProvenance(source);
  if (!provenance) throw new CreatureFeatCatalogError(
    "CREATURE_FEAT_PROVENANCE_INVALID",
    "Exact existing Creature FeatList and feat.2da provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureFeatCatalogError(
    "CREATURE_FEAT_CATALOG_UNAVAILABLE",
    "The authoritative feat.2da row catalog is unavailable.",
  );

  const items: CreatureApiFeatRow[] = [];
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
        throw new CreatureFeatCatalogError(
          "CREATURE_FEAT_CATALOG_INVALID",
          "The returned feat.2da rows are duplicated or out of physical order.",
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
  if (!isExistingCreatureFeatCatalogAdmitted(source, catalog)) {
    throw new CreatureFeatCatalogError(
      "CREATURE_FEAT_CATALOG_INCOMPLETE",
      "The authoritative feat.2da catalog does not contain every retained feat row.",
    );
  }
  return catalog;
}

export function materializeExistingCreatureFeats(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureFeatEntry[],
  candidate: readonly SceneObjectCreatureFeatEntry[],
  catalog: ExistingCreatureFeatCatalog | null | undefined,
): readonly SceneObjectCreatureFeatEntry[] {
  const provenance = readExistingCreatureFeatListProvenance(source);
  const currentSelection = readFeatSelection(current, provenance?.rowCount);
  const candidateSelection = readFeatSelection(candidate, provenance?.rowCount);
  if (!provenance || !currentSelection || !candidateSelection ||
    !sameMembership(currentSelection, new Set(provenance.sourceFeatIds)) ||
    !isExistingCreatureFeatCatalogAdmitted(source, catalog)) return cloneFeatEntries(current);
  const catalogIds = new Set(catalog.items.map((row) => row.rowIndex));
  if ([...candidateSelection].some((featId) => !catalogIds.has(featId))) {
    return cloneFeatEntries(current);
  }
  return Object.freeze(catalog.items.map((row) => Object.freeze({
    featId: row.rowIndex,
    name: row.displayName,
    type: `ToolsCategory ${row.toolsCategory}`,
    assigned: candidateSelection.has(row.rowIndex),
  })));
}

async function loadPage(
  facade: CreatureFeatCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureFeatListProvenance,
  offset: number,
): Promise<CreatureApiFeatRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      limit: PAGE_LIMIT,
      offset,
    });
  } catch (error) {
    const stale = isRecord(error) && (error.code === "CREATURE_FEATS_TABLE_STALE" ||
      error.code === "CREATURE_FEAT_TABLE_STALE");
    throw new CreatureFeatCatalogError(
      stale ? "CREATURE_FEAT_CATALOG_STALE" : "CREATURE_FEAT_CATALOG_UNAVAILABLE",
      stale ? "The authoritative feat.2da identity changed." :
        "The authoritative feat.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiFeatRowsResult,
  provenance: ExistingCreatureFeatListProvenance,
  expectedOffset: number,
  expectedTotal: number | null,
): readonly CreatureApiFeatRow[] {
  if (result.resourceName !== "feat.2da" || result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount) throw new CreatureFeatCatalogError(
    "CREATURE_FEAT_CATALOG_STALE",
    "The returned feat.2da identity differs from retained provenance.",
  );
  const totalValid = Number.isSafeInteger(result.total) && result.total >= 0 &&
    result.total <= provenance.rowCount &&
    (expectedTotal === null || result.total === expectedTotal);
  const expectedLength = totalValid
    ? Math.min(PAGE_LIMIT, Math.max(0, result.total - expectedOffset))
    : -1;
  if (result.limit !== PAGE_LIMIT || result.offset !== expectedOffset || !totalValid ||
    !Array.isArray(result.items) || result.items.length !== expectedLength) {
    throw new CreatureFeatCatalogError(
      "CREATURE_FEAT_CATALOG_INVALID",
      "The returned feat.2da page metadata is inconsistent.",
    );
  }
  let previous = -1;
  return result.items.map((row) => {
    if (!isFeatRow(row, provenance.rowCount) || row.rowIndex <= previous) {
      throw new CreatureFeatCatalogError(
        "CREATURE_FEAT_CATALOG_INVALID",
        "The returned feat.2da row is invalid or out of physical order.",
      );
    }
    previous = row.rowIndex;
    return row;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureFeatCatalog | null | undefined,
  provenance: ExistingCreatureFeatListProvenance,
): catalog is ExistingCreatureFeatCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount || !Array.isArray(catalog.items)) return false;
  let previous = -1;
  return catalog.items.every((row) => {
    if (!isFeatRow(row, provenance.rowCount) || row.rowIndex <= previous) return false;
    previous = row.rowIndex;
    return true;
  });
}

function isFeatRow(value: unknown, rowCount: number): value is CreatureApiFeatRow {
  if (!isRecord(value)) return false;
  const hasDescription = Object.prototype.hasOwnProperty.call(value, "descriptionStrRef");
  const keys = [
    "rowIndex", "featNameStrRef", ...(hasDescription ? ["descriptionStrRef"] : []),
    "toolsCategory", "displayName",
  ];
  if (Object.keys(value).length !== keys.length || keys.some((key) => !(key in value)) ||
    !Number.isSafeInteger(value.rowIndex) || Number(value.rowIndex) < 0 ||
    Number(value.rowIndex) >= rowCount || !Number.isSafeInteger(value.featNameStrRef) ||
    Number(value.featNameStrRef) < 1 || Number(value.featNameStrRef) >= 0xffff_ffff ||
    hasDescription && (!Number.isSafeInteger(value.descriptionStrRef) ||
      Number(value.descriptionStrRef) < 1 || Number(value.descriptionStrRef) >= 0xffff_ffff) ||
    !Number.isSafeInteger(value.toolsCategory) || Number(value.toolsCategory) < 0 ||
    Number(value.toolsCategory) > 0xff || typeof value.displayName !== "string" ||
    value.displayName.length < 1 || value.displayName.length > MAX_DISPLAY_CODE_UNITS ||
    value.displayName.includes("\0")) return false;
  return true;
}

function readFeatSelection(
  value: readonly SceneObjectCreatureFeatEntry[],
  rowCount: number | undefined,
): ReadonlySet<number> | null {
  if (!Number.isSafeInteger(rowCount) || rowCount === undefined || rowCount < 1 ||
    !Array.isArray(value)) return null;
  const seen = new Set<number>();
  const selected = new Set<number>();
  for (const entry of value) {
    if (!Number.isSafeInteger(entry.featId) || Number(entry.featId) < 0 ||
      Number(entry.featId) >= rowCount || seen.has(Number(entry.featId)) ||
      typeof entry.assigned !== "boolean") return null;
    seen.add(Number(entry.featId));
    if (entry.assigned) selected.add(Number(entry.featId));
  }
  return selected;
}

function sameMembership(left: ReadonlySet<number>, right: ReadonlySet<number>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function cloneFeatEntries(
  value: readonly SceneObjectCreatureFeatEntry[],
): readonly SceneObjectCreatureFeatEntry[] {
  return Object.freeze(value.map((entry) => Object.freeze({ ...entry })));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import type {
  AuroraAreaTilesetDefinition,
  AuroraAreaTilesetTile,
} from "../../scene/domain/auroraAreaEditing";
import type { TileCertificationRow } from "../domain/tileCertificationPolicy";

export const AREA_TILE_CATALOG_CATEGORIES = [
  "all",
  "terrain",
  "feature-crosser",
  "group",
  "individual",
] as const;

export const AREA_TILE_CATALOG_CAPABILITIES = [
  "all",
  "replaceable",
  "group-managed",
  "model-referenced",
  "model-reference-missing",
] as const;

export const AREA_TILE_CATALOG_CERTIFICATION_STATES = [
  "all",
  "verified",
  "failed",
  "missing",
  "excluded",
] as const;

export type AreaTileCatalogCategory =
  Exclude<(typeof AREA_TILE_CATALOG_CATEGORIES)[number], "all">;
export type AreaTileCatalogCategoryFilter =
  (typeof AREA_TILE_CATALOG_CATEGORIES)[number];
export type AreaTileCatalogCapability =
  Exclude<(typeof AREA_TILE_CATALOG_CAPABILITIES)[number], "all">;
export type AreaTileCatalogCapabilityFilter =
  (typeof AREA_TILE_CATALOG_CAPABILITIES)[number];
export type AreaTileCatalogCertification =
  Exclude<(typeof AREA_TILE_CATALOG_CERTIFICATION_STATES)[number], "all">;
export type AreaTileCatalogCertificationFilter =
  (typeof AREA_TILE_CATALOG_CERTIFICATION_STATES)[number];

export type AreaTileCatalogCertificationIndex = ReadonlyMap<
  string,
  TileCertificationRow
>;

export interface AreaTileCatalogItem {
  readonly tile: AuroraAreaTilesetTile;
  readonly categories: readonly AreaTileCatalogCategory[];
  readonly capabilities: readonly AreaTileCatalogCapability[];
  readonly certification: AreaTileCatalogCertification;
  readonly certificationRowId?: string;
  readonly groupIds: readonly string[];
  readonly groupNames: readonly string[];
  readonly searchText: string;
}

export interface AreaTileCatalogDiagnostics {
  readonly total: number;
  readonly matched: number;
  readonly verified: number;
  readonly failed: number;
  readonly missing: number;
  readonly excluded: number;
}

export interface AreaTileCatalogFilterResult {
  readonly normalizedQuery: string;
  readonly items: readonly AreaTileCatalogItem[];
  readonly diagnostics: AreaTileCatalogDiagnostics;
}

export interface AreaTileCatalogFilterInput {
  readonly definition: AuroraAreaTilesetDefinition;
  readonly query?: string;
  readonly category?: AreaTileCatalogCategoryFilter;
  readonly capability?: AreaTileCatalogCapabilityFilter;
  readonly certification?: AreaTileCatalogCertificationFilter;
  readonly certificationIndex?: AreaTileCatalogCertificationIndex;
}

export function buildAreaTileCatalogCertificationKey(
  tilesetResRef: string,
  tileId: number,
): string {
  return `${tilesetResRef.trim().toLowerCase()}\u0000${tileId}`;
}

export function filterAreaTileCatalog(
  input: AreaTileCatalogFilterInput,
): AreaTileCatalogFilterResult {
  const normalizedQuery = normalizeSearchText(input.query ?? "");
  const queryTokens = normalizedQuery ? normalizedQuery.split(" ") : [];
  const category = input.category ?? "all";
  const capability = input.capability ?? "all";
  const certification = input.certification ?? "all";
  const multiCellGroupsByTileId = indexMultiCellGroups(input.definition);

  const allItems = [...input.definition.tiles]
    .sort((left, right) => left.tileId - right.tileId)
    .map((tile) => buildCatalogItem(
      input.definition,
      tile,
      multiCellGroupsByTileId.get(tile.tileId) ?? [],
      input.certificationIndex,
    ));
  const items = allItems.filter((item) =>
    queryTokens.every((token) => item.searchText.includes(token)) &&
    (category === "all" || item.categories.includes(category)) &&
    (capability === "all" || item.capabilities.includes(capability)) &&
    (certification === "all" || item.certification === certification)
  );

  return {
    normalizedQuery,
    items,
    diagnostics: {
      total: allItems.length,
      matched: items.length,
      verified: countCertification(items, "verified"),
      failed: countCertification(items, "failed"),
      missing: countCertification(items, "missing"),
      excluded: countCertification(items, "excluded"),
    },
  };
}

function buildCatalogItem(
  definition: AuroraAreaTilesetDefinition,
  tile: AuroraAreaTilesetTile,
  multiCellGroups: readonly Readonly<{ id: string; name: string }>[],
  certificationIndex: AreaTileCatalogCertificationIndex | undefined,
): AreaTileCatalogItem {
  const terrainIds = uniqueNonBlank(Object.values(tile.terrain));
  const crosserIds = uniqueNonBlank(Object.values(tile.crossers));
  const explicitGroupIds = uniqueNonBlank([
    ...(tile.groupIds ?? []),
    tile.groupId,
    ...multiCellGroups.map((group) => group.id),
  ]);
  const groupNames = uniqueNonBlank(
    definition.groups
      .filter((group) => explicitGroupIds.includes(group.id))
      .map((group) => group.name),
  );
  const groupManaged = multiCellGroups.length > 0;
  const categories: AreaTileCatalogCategory[] = [
    ...(terrainIds.length > 0 ? ["terrain" as const] : []),
    ...(crosserIds.length > 0 ? ["feature-crosser" as const] : []),
    ...(explicitGroupIds.length > 0 ? ["group" as const] : []),
    ...(!groupManaged ? ["individual" as const] : []),
  ];
  const modelReferenced = Boolean(tile.modelResRef?.trim());
  const capabilities: AreaTileCatalogCapability[] = [
    groupManaged ? "group-managed" : "replaceable",
    modelReferenced ? "model-referenced" : "model-reference-missing",
  ];
  const certificationRow = certificationIndex?.get(
    buildAreaTileCatalogCertificationKey(definition.tilesetResRef, tile.tileId),
  );
  const tileCertification = resolveTileCertification(certificationRow);
  const searchText = normalizeSearchText([
    definition.tilesetResRef,
    `tile_id ${tile.tileId}`,
    String(tile.tileId),
    tile.modelResRef,
    ...terrainIds,
    ...crosserIds,
    ...explicitGroupIds,
    ...groupNames,
    ...categories,
    ...capabilities,
    tileCertification,
  ].filter((value): value is string => typeof value === "string").join(" "));

  return {
    tile,
    categories,
    capabilities,
    certification: tileCertification,
    ...(certificationRow ? { certificationRowId: certificationRow.rowId } : {}),
    groupIds: explicitGroupIds,
    groupNames,
    searchText,
  };
}

function indexMultiCellGroups(
  definition: AuroraAreaTilesetDefinition,
): Map<number, Array<Readonly<{ id: string; name: string }>>> {
  const index = new Map<number, Array<Readonly<{ id: string; name: string }>>>();
  for (const group of definition.groups) {
    const tileIds = group.tileIds.filter((tileId): tileId is number => tileId !== null);
    if (tileIds.length <= 1) continue;
    for (const tileId of tileIds) {
      const entries = index.get(tileId) ?? [];
      entries.push({ id: group.id, name: group.name });
      index.set(tileId, entries);
    }
  }
  return index;
}

function resolveTileCertification(
  row: TileCertificationRow | undefined,
): AreaTileCatalogCertification {
  if (!row) return "missing";
  if (row.eligibility.status === "excluded") return "excluded";
  const proofStates = Object.values(row.proofs);
  if (proofStates.includes("failed")) return "failed";
  if (proofStates.includes("missing")) return "missing";
  return "verified";
}

function countCertification(
  items: readonly AreaTileCatalogItem[],
  certification: AreaTileCatalogCertification,
): number {
  return items.filter((item) => item.certification === certification).length;
}

function uniqueNonBlank(
  values: readonly (string | null | undefined)[],
): string[] {
  return [...new Set(values.flatMap((value) => {
    const normalized = value?.trim();
    return normalized ? [normalized] : [];
  }))];
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}

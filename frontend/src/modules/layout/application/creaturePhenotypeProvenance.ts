import type { CreaturePhenotypeCatalogFacade } from
  "../../creatures/application/creaturePhenotypeCatalogFacade";
import type {
  CreatureApiPhenotypeRow,
  CreatureApiPhenotypeRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { readCreatureAppearanceStorage } from "../../scene/domain/creatureAppearance";
import { readCreaturePhenotypeStorage } from "../../scene/domain/creaturePhenotype";

const PAGE_LIMIT = 256;
const MAX_QUERY = 128;
const BYTE_MAX = 0xff;

export interface ExistingCreaturePhenotypeProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
  readonly appearanceTableSha256: string;
  readonly appearanceRowCount: number;
  readonly appearanceType: number;
}

export interface ExistingCreaturePhenotypeCatalog
  extends ExistingCreaturePhenotypeProvenance {
  readonly query: string;
  readonly items: readonly CreatureApiPhenotypeRow[];
}

export type CreaturePhenotypeCatalogErrorCode =
  | "CREATURE_PHENOTYPE_PROVENANCE_INVALID"
  | "CREATURE_PHENOTYPE_CATALOG_UNAVAILABLE"
  | "CREATURE_PHENOTYPE_CATALOG_STALE"
  | "CREATURE_PHENOTYPE_CATALOG_INVALID";

export class CreaturePhenotypeCatalogError extends Error {
  constructor(readonly code: CreaturePhenotypeCatalogErrorCode, message: string) {
    super(message);
    this.name = "CreaturePhenotypeCatalogError";
  }
}

export function readExistingCreaturePhenotypeProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreaturePhenotypeProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const phenotype = readCreaturePhenotypeStorage(source.creaturePhenotype);
  const appearance = readCreatureAppearanceStorage(source.creatureAppearance);
  if (!phenotype?.present || !phenotype.table || phenotype.value === 1 ||
    !appearance?.present || !appearance.table) return null;
  return Object.freeze({
    tableSha256: phenotype.table.sha256,
    rowCount: phenotype.table.rowCount,
    sourceRowIndex: phenotype.value,
    appearanceTableSha256: appearance.table.sha256,
    appearanceRowCount: appearance.table.rowCount,
    appearanceType: appearance.value,
  });
}

export async function loadExistingCreaturePhenotypeCatalog(
  facade: CreaturePhenotypeCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreaturePhenotypeCatalog> {
  const provenance = readExistingCreaturePhenotypeProvenance(source);
  if (!provenance) throw new CreaturePhenotypeCatalogError(
    "CREATURE_PHENOTYPE_PROVENANCE_INVALID",
    "Exact existing Creature Phenotype and Appearance provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreaturePhenotypeCatalogError(
    "CREATURE_PHENOTYPE_CATALOG_UNAVAILABLE",
    "The authoritative phenotype.2da row catalog is unavailable.",
  );
  const query = rawQuery.trim().slice(0, MAX_QUERY);
  if (selectedRowIndex !== undefined && !isPhenotypeRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreaturePhenotypeCatalogError(
      "CREATURE_PHENOTYPE_CATALOG_INVALID",
      "The selected Creature Phenotype row is not round-trippable.",
    );
  }
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}), limit: PAGE_LIMIT, offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const exactRow = async (rowIndex: number): Promise<CreatureApiPhenotypeRow> => {
    const present = pageItems.find((item) => item.rowIndex === rowIndex);
    if (present) return present;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex, limit: 1, offset: 0,
    });
    const items = readPage(exact, provenance, 1, 0, true);
    if (items.length !== 1 || items[0]!.rowIndex !== rowIndex) {
      throw new CreaturePhenotypeCatalogError(
        "CREATURE_PHENOTYPE_CATALOG_STALE",
        "The retained Creature Phenotype row is not Toolset-admitted.",
      );
    }
    return items[0]!;
  };
  const current = await exactRow(provenance.sourceRowIndex);
  const selected = selectedRowIndex === undefined || selectedRowIndex === provenance.sourceRowIndex
    ? undefined : await exactRow(selectedRowIndex);
  const seen = new Set<number>();
  return Object.freeze({
    ...provenance,
    query,
    items: Object.freeze([current, selected, ...pageItems]
      .filter((item): item is CreatureApiPhenotypeRow => item !== undefined)
      .filter((item) => !seen.has(item.rowIndex) && Boolean(seen.add(item.rowIndex)))
      .map((item) => Object.freeze({ ...item }))),
  });
}

export function isExistingCreaturePhenotypeCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreaturePhenotypeCatalog | null | undefined,
): catalog is ExistingCreaturePhenotypeCatalog {
  const provenance = readExistingCreaturePhenotypeProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export function reduceExistingCreaturePhenotype(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreaturePhenotypeCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreaturePhenotypeProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance) ||
    !isPhenotypeRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((item) => item.rowIndex === candidateValue)
    ? Number(candidateValue) : currentValue;
}

export const materializeExistingCreaturePhenotype = reduceExistingCreaturePhenotype;

export function resolveCreaturePhenotypeDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreaturePhenotypeCatalog | null | undefined,
  fallback: string,
): string {
  if (rowIndex === undefined || !catalog) return fallback;
  return catalog.items.find((item) => item.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadPage(
  facade: CreaturePhenotypeCatalogFacade,
  accessToken: string,
  provenance: ExistingCreaturePhenotypeProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiPhenotypeRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      appearanceTableSha256: provenance.appearanceTableSha256,
      appearanceRowCount: provenance.appearanceRowCount,
      appearanceType: provenance.appearanceType,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && typeof error.code === "string" &&
      error.code.includes("STALE");
    throw new CreaturePhenotypeCatalogError(
      stale ? "CREATURE_PHENOTYPE_CATALOG_STALE" : "CREATURE_PHENOTYPE_CATALOG_UNAVAILABLE",
      stale ? "The authoritative phenotype or appearance table identity changed."
        : "The authoritative Creature Phenotype catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiPhenotypeRowsResult,
  provenance: ExistingCreaturePhenotypeProvenance,
  limit: number,
  offset: number,
  exact: boolean,
): readonly CreatureApiPhenotypeRow[] {
  if (result.resourceName !== "phenotype.2da" || result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount) throw new CreaturePhenotypeCatalogError(
      "CREATURE_PHENOTYPE_CATALOG_STALE",
      "The returned phenotype.2da identity differs from retained provenance.",
    );
  if (result.limit !== limit || result.offset !== offset || !Number.isSafeInteger(result.total) ||
    result.total < 0 || result.total > provenance.rowCount || (exact && result.total > 1) ||
    !Array.isArray(result.items) || result.items.length > limit) {
    throw new CreaturePhenotypeCatalogError(
      "CREATURE_PHENOTYPE_CATALOG_INVALID", "Creature Phenotype page metadata is invalid.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((item) => {
    if (!isPhenotypeOption(item, provenance.rowCount) || seen.has(item.rowIndex)) {
      throw new CreaturePhenotypeCatalogError(
        "CREATURE_PHENOTYPE_CATALOG_INVALID", "Creature Phenotype option is invalid.",
      );
    }
    seen.add(item.rowIndex);
    return item;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreaturePhenotypeCatalog | null | undefined,
  provenance: ExistingCreaturePhenotypeProvenance,
): catalog is ExistingCreaturePhenotypeCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount ||
    catalog.appearanceTableSha256 !== provenance.appearanceTableSha256 ||
    catalog.appearanceRowCount !== provenance.appearanceRowCount ||
    catalog.appearanceType !== provenance.appearanceType || !Array.isArray(catalog.items)) return false;
  const seen = new Set<number>();
  return catalog.items.every((item) => isPhenotypeOption(item, provenance.rowCount) &&
    !seen.has(item.rowIndex) && Boolean(seen.add(item.rowIndex))) &&
    seen.has(provenance.sourceRowIndex);
}

function isPhenotypeOption(value: unknown, rowCount: number): value is CreatureApiPhenotypeRow {
  if (!isRecord(value) || !isPhenotypeRow(value.rowIndex, rowCount) ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > 1024 || value.displayName.includes("\0") ||
    !Number.isSafeInteger(value.nameStrRef) || Number(value.nameStrRef) < 1 ||
    Number(value.nameStrRef) >= 0xffff_ffff ||
    (value.label !== undefined && (typeof value.label !== "string" ||
      value.label.length < 1 || value.label.length > 256 || value.label.includes("\0")))) return false;
  if (value.displaySource === "strref") return true;
  return value.displaySource === "strref_id" &&
    value.displayName === `StringRef ${value.nameStrRef}`;
}

function isPhenotypeRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX &&
    Number(value) !== 1 && Number(value) < rowCount;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

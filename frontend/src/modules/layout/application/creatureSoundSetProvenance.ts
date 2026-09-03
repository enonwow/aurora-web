import type { CreatureSoundSetCatalogFacade } from
  "../../creatures/application/creatureSoundSetCatalogFacade";
import type {
  CreatureApiSoundSetRow,
  CreatureApiSoundSetRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { readCreatureSoundSetFileStorage } from "../../scene/domain/creatureSoundSetFile";

const PAGE_LIMIT = 100;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;
const WORD_MAX = 0xffff;

export interface ExistingCreatureSoundSetProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRowIndex: number;
}

export interface ExistingCreatureSoundSetCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly CreatureApiSoundSetRow[];
}

export class CreatureSoundSetCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreatureSoundSetCatalogError";
  }
}

export function readExistingCreatureSoundSetProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureSoundSetProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const storage = readCreatureSoundSetFileStorage(source.creatureSoundSetFile);
  if (!storage?.present || !storage.table ||
    !isAdmittedRow(storage.value, storage.table.rowCount)) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceRowIndex: storage.value,
  });
}

export function isExistingCreatureSoundSetCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureSoundSetCatalog | null | undefined,
): catalog is ExistingCreatureSoundSetCatalog {
  const provenance = readExistingCreatureSoundSetProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreatureSoundSetCatalog(
  facade: CreatureSoundSetCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreatureSoundSetCatalog> {
  const provenance = readExistingCreatureSoundSetProvenance(source);
  if (!provenance) throw new CreatureSoundSetCatalogError(
    "CREATURE_SOUND_SET_PROVENANCE_INVALID",
    "Exact existing Creature SoundSetFile provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureSoundSetCatalogError(
    "CREATURE_SOUND_SET_CATALOG_UNAVAILABLE",
    "The authoritative soundset.2da row catalog is unavailable.",
  );
  if (selectedRowIndex !== undefined && !isAdmittedRow(selectedRowIndex, provenance.rowCount)) {
    throw new CreatureSoundSetCatalogError(
      "CREATURE_SOUND_SET_CATALOG_INVALID",
      "The selected SoundSetFile row is outside the native Word/table range.",
    );
  }
  const query = rawQuery.trim().slice(0, MAX_QUERY_CODE_UNITS);
  const page = await loadPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}), limit: PAGE_LIMIT, offset: 0,
  });
  const pageItems = readPage(page, provenance, PAGE_LIMIT, 0, false);
  const loadExactRow = async (rowIndex: number): Promise<CreatureApiSoundSetRow> => {
    const fromPage = pageItems.find((row) => row.rowIndex === rowIndex);
    if (fromPage) return fromPage;
    const exact = await loadPage(facade, accessToken, provenance, {
      rowIndex, limit: 1, offset: 0,
    });
    const exactItems = readPage(exact, provenance, 1, 0, true);
    if (exactItems.length !== 1 || exactItems[0]!.rowIndex !== rowIndex) {
      throw new CreatureSoundSetCatalogError(
        "CREATURE_SOUND_SET_CATALOG_STALE",
        "The retained SoundSetFile row is absent from the current Toolset catalog.",
      );
    }
    return exactItems[0]!;
  };
  const current = await loadExactRow(provenance.sourceRowIndex);
  const selected = selectedRowIndex === undefined || selectedRowIndex === provenance.sourceRowIndex
    ? undefined : await loadExactRow(selectedRowIndex);
  const seen = new Set<number>();
  const items = [current, selected, ...pageItems]
    .filter((row): row is CreatureApiSoundSetRow => row !== undefined)
    .filter((row) => !seen.has(row.rowIndex) && Boolean(seen.add(row.rowIndex)))
    .map((row) => Object.freeze({ ...row }));
  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    query,
    items: Object.freeze(items),
  });
}

export function reduceExistingCreatureSoundSetFile(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  catalog: ExistingCreatureSoundSetCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreatureSoundSetProvenance(source);
  if (!provenance || !isAdmittedCatalog(catalog, provenance) ||
    !isAdmittedRow(candidateValue, provenance.rowCount)) return currentValue;
  return catalog.items.some((row) => row.rowIndex === candidateValue)
    ? candidateValue : currentValue;
}

export const materializeExistingCreatureSoundSetFile = reduceExistingCreatureSoundSetFile;

export function resolveCreatureSoundSetDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreatureSoundSetCatalog | null | undefined,
  fallback: string,
): string {
  return catalog?.items.find((row) => row.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadPage(
  facade: CreatureSoundSetCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureSoundSetProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiSoundSetRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_SOUND_SET_TABLE_STALE";
    throw new CreatureSoundSetCatalogError(
      stale ? "CREATURE_SOUND_SET_CATALOG_STALE" : "CREATURE_SOUND_SET_CATALOG_UNAVAILABLE",
      stale ? "The authoritative soundset.2da identity changed." :
        "The authoritative soundset.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiSoundSetRowsResult,
  provenance: ExistingCreatureSoundSetProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiSoundSetRow[] {
  if (result.resourceName !== "soundset.2da" ||
    result.sha256 !== provenance.tableSha256 || result.rowCount !== provenance.rowCount) {
    throw new CreatureSoundSetCatalogError(
      "CREATURE_SOUND_SET_CATALOG_STALE",
      "The returned soundset.2da identity differs from retained provenance.",
    );
  }
  if (result.limit !== expectedLimit || result.offset !== expectedOffset ||
    !Number.isSafeInteger(result.total) || result.total < 0 ||
    result.total > Math.min(provenance.rowCount, WORD_MAX + 1) ||
    (exact && result.total > 1) || !Array.isArray(result.items) ||
    result.items.length > expectedLimit) {
    throw new CreatureSoundSetCatalogError(
      "CREATURE_SOUND_SET_CATALOG_INVALID",
      "The returned soundset.2da page metadata is inconsistent.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((row) => {
    if (!isSoundSetRow(row, provenance.rowCount) || seen.has(row.rowIndex)) {
      throw new CreatureSoundSetCatalogError(
        "CREATURE_SOUND_SET_CATALOG_INVALID",
        "The returned SoundSetFile option is invalid or duplicated.",
      );
    }
    seen.add(row.rowIndex);
    return row;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureSoundSetCatalog | null | undefined,
  provenance: ExistingCreatureSoundSetProvenance,
): catalog is ExistingCreatureSoundSetCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount || typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS || !Array.isArray(catalog.items)) return false;
  const seen = new Set<number>();
  const valid = catalog.items.every((row) => {
    if (!isSoundSetRow(row, provenance.rowCount) || seen.has(row.rowIndex)) return false;
    seen.add(row.rowIndex);
    return true;
  });
  return valid && seen.has(provenance.sourceRowIndex);
}

function isSoundSetRow(value: unknown, rowCount: number): value is CreatureApiSoundSetRow {
  if (!isRecord(value) || !isAdmittedRow(value.rowIndex, rowCount) ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS || value.displayName.includes("\0") ||
    typeof value.resRef !== "string" || !/^[a-z0-9_]{1,16}$/u.test(value.resRef) ||
    Object.keys(value).some((key) => ![
      "rowIndex", "displayName", "displaySource", "nameStrRef", "resRef",
    ].includes(key))) return false;
  if (value.displaySource === "label") return value.nameStrRef === null;
  if (!Number.isSafeInteger(value.nameStrRef) || Number(value.nameStrRef) < 1 ||
    Number(value.nameStrRef) >= 0xffff_ffff) return false;
  return value.displaySource === "strref" ||
    (value.displaySource === "strref_id" &&
      value.displayName === `StringRef ${value.nameStrRef}`);
}

function isAdmittedRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= WORD_MAX &&
    Number(value) < rowCount;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

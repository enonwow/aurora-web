import type { CreatureSkillCatalogFacade } from
  "../../creatures/application/creatureSkillCatalogFacade";
import type {
  CreatureApiSkillRow,
  CreatureApiSkillRowsResult,
} from "../../creatures/contracts";
import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import type { SceneObjectCreatureSkillEntry } from "../../scene/contracts";
import { readCreatureSkillListStorage } from "../../scene/domain/creatureSkillList";

const PAGE_LIMIT = 128;
const MAX_DISPLAY_CODE_UNITS = 1_024;

export interface ExistingCreatureSkillListProvenance {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly sourceRanks: readonly number[];
}

export interface ExistingCreatureSkillCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly items: readonly CreatureApiSkillRow[];
}

export class CreatureSkillCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreatureSkillCatalogError";
  }
}

export function readExistingCreatureSkillListProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureSkillListProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const storage = readCreatureSkillListStorage(source.creatureSkillList);
  if (!storage?.present || !storage.table) return null;
  return Object.freeze({
    tableSha256: storage.table.sha256,
    rowCount: storage.table.rowCount,
    sourceRanks: Object.freeze([...storage.ranks]),
  });
}

export function isExistingCreatureSkillCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureSkillCatalog | null | undefined,
): catalog is ExistingCreatureSkillCatalog {
  const provenance = readExistingCreatureSkillListProvenance(source);
  return provenance !== null && isAdmittedCatalog(catalog, provenance);
}

export async function loadExistingCreatureSkillCatalog(
  facade: CreatureSkillCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
): Promise<ExistingCreatureSkillCatalog> {
  const provenance = readExistingCreatureSkillListProvenance(source);
  if (!provenance) throw new CreatureSkillCatalogError(
    "CREATURE_SKILL_PROVENANCE_INVALID",
    "Exact existing Creature SkillList and skills.2da provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureSkillCatalogError(
    "CREATURE_SKILL_CATALOG_UNAVAILABLE",
    "The authoritative skills.2da row catalog is unavailable.",
  );

  const items: CreatureApiSkillRow[] = [];
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
        throw new CreatureSkillCatalogError(
          "CREATURE_SKILL_CATALOG_INVALID",
          "The returned skills.2da rows are duplicated or out of physical order.",
        );
      }
      seen.add(row.rowIndex);
      items.push(Object.freeze({ ...row }));
    }
    offset += page.length;
  }

  return Object.freeze({
    tableSha256: provenance.tableSha256,
    rowCount: provenance.rowCount,
    items: Object.freeze(items),
  });
}

export function resolveCreatureSkillDisplayName(
  skillId: number,
  catalog: ExistingCreatureSkillCatalog | null | undefined,
  fallback: string,
): string {
  return catalog?.items.find((row) => row.rowIndex === skillId)?.displayName ?? fallback;
}

export function materializeExistingCreatureSkills(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureSkillEntry[],
  candidate: readonly SceneObjectCreatureSkillEntry[],
  catalog: ExistingCreatureSkillCatalog | null | undefined,
): readonly SceneObjectCreatureSkillEntry[] {
  const provenance = readExistingCreatureSkillListProvenance(source);
  const currentById = readFullSkillVector(current, provenance?.rowCount);
  const candidateById = readFullSkillVector(candidate, provenance?.rowCount);
  if (!provenance || !currentById || !candidateById ||
    !isAdmittedCatalog(catalog, provenance)) return cloneSkillEntries(current);
  const visibleById = new Map(catalog.items.map((row) => [row.rowIndex, row] as const));
  return Object.freeze(Array.from({ length: provenance.rowCount }, (_, skillId) => {
    const currentEntry = currentById.get(skillId)!;
    const candidateEntry = candidateById.get(skillId)!;
    const visibleRow = visibleById.get(skillId);
    return Object.freeze(visibleRow
      ? { skillId, skill: visibleRow.displayName, rank: candidateEntry.rank }
      : { ...currentEntry, skillId });
  }));
}

async function loadPage(
  facade: CreatureSkillCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureSkillListProvenance,
  offset: number,
): Promise<CreatureApiSkillRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.tableSha256,
      limit: PAGE_LIMIT,
      offset,
    });
  } catch (error) {
    const stale = isRecord(error) && (error.code === "CREATURE_SKILLS_TABLE_STALE" ||
      error.code === "CREATURE_SKILL_TABLE_STALE");
    throw new CreatureSkillCatalogError(
      stale ? "CREATURE_SKILL_CATALOG_STALE" : "CREATURE_SKILL_CATALOG_UNAVAILABLE",
      stale ? "The authoritative skills.2da identity changed." :
        "The authoritative skills.2da row catalog could not be loaded.",
    );
  }
}

function readPage(
  result: CreatureApiSkillRowsResult,
  provenance: ExistingCreatureSkillListProvenance,
  expectedOffset: number,
  expectedTotal: number | null,
): readonly CreatureApiSkillRow[] {
  if (result.resourceName !== "skills.2da" || result.sha256 !== provenance.tableSha256 ||
    result.rowCount !== provenance.rowCount) throw new CreatureSkillCatalogError(
    "CREATURE_SKILL_CATALOG_STALE",
    "The returned skills.2da identity differs from retained provenance.",
  );
  const totalValid = Number.isSafeInteger(result.total) && result.total >= 0 &&
    result.total <= provenance.rowCount &&
    (expectedTotal === null || result.total === expectedTotal);
  const expectedLength = totalValid
    ? Math.min(PAGE_LIMIT, Math.max(0, result.total - expectedOffset))
    : -1;
  if (result.limit !== PAGE_LIMIT || result.offset !== expectedOffset || !totalValid ||
    !Array.isArray(result.items) || result.items.length !== expectedLength) {
    throw new CreatureSkillCatalogError(
      "CREATURE_SKILL_CATALOG_INVALID",
      "The returned skills.2da page metadata is inconsistent.",
    );
  }
  let previous = -1;
  return result.items.map((row) => {
    if (!isSkillRow(row, provenance.rowCount) || row.rowIndex <= previous) {
      throw new CreatureSkillCatalogError(
        "CREATURE_SKILL_CATALOG_INVALID",
        "The returned skills.2da row is invalid or out of physical order.",
      );
    }
    previous = row.rowIndex;
    return row;
  });
}

function isAdmittedCatalog(
  catalog: ExistingCreatureSkillCatalog | null | undefined,
  provenance: ExistingCreatureSkillListProvenance,
): catalog is ExistingCreatureSkillCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.tableSha256 ||
    catalog.rowCount !== provenance.rowCount || !Array.isArray(catalog.items)) return false;
  let previous = -1;
  return catalog.items.every((row) => {
    if (!isSkillRow(row, provenance.rowCount) || row.rowIndex <= previous) return false;
    previous = row.rowIndex;
    return true;
  });
}

function isSkillRow(value: unknown, rowCount: number): value is CreatureApiSkillRow {
  if (!isRecord(value) || Object.keys(value).length !== 3 ||
    !["rowIndex", "nameStrRef", "displayName"].every((key) => key in value) ||
    !Number.isSafeInteger(value.rowIndex) || Number(value.rowIndex) < 0 ||
    Number(value.rowIndex) >= rowCount || !Number.isSafeInteger(value.nameStrRef) ||
    Number(value.nameStrRef) < 1 || Number(value.nameStrRef) >= 0xffff_ffff ||
    typeof value.displayName !== "string" || value.displayName.length < 1 ||
    value.displayName.length > MAX_DISPLAY_CODE_UNITS || value.displayName.includes("\0")) {
    return false;
  }
  return true;
}

function readFullSkillVector(
  value: readonly SceneObjectCreatureSkillEntry[],
  rowCount: number | undefined,
): ReadonlyMap<number, SceneObjectCreatureSkillEntry> | null {
  if (!Number.isSafeInteger(rowCount) || rowCount === undefined || rowCount < 1 ||
    !Array.isArray(value) || value.length !== rowCount) return null;
  const result = new Map<number, SceneObjectCreatureSkillEntry>();
  for (const entry of value) {
    if (!Number.isSafeInteger(entry.skillId) || Number(entry.skillId) < 0 ||
      Number(entry.skillId) >= rowCount || result.has(Number(entry.skillId)) ||
      typeof entry.skill !== "string" || entry.skill.length < 1 ||
      !Number.isSafeInteger(entry.rank) || entry.rank < 0 || entry.rank > 0xff) return null;
    result.set(Number(entry.skillId), entry);
  }
  return result.size === rowCount ? result : null;
}

function cloneSkillEntries(
  value: readonly SceneObjectCreatureSkillEntry[],
): readonly SceneObjectCreatureSkillEntry[] {
  return Object.freeze(value.map((entry) => Object.freeze({ ...entry })));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import type { CreatureClassCatalogFacade } from
  "../../creatures/application/creatureClassCatalogFacade";
import type { CreatureStartingPackageCatalogFacade } from
  "../../creatures/application/creatureStartingPackageCatalogFacade";
import type {
  CreatureApiClassRow,
  CreatureApiClassRowsResult,
  CreatureApiStartingPackageRow,
  CreatureApiStartingPackageRowsResult,
} from "../../creatures/contracts";
import type {
  SceneObjectCreatureClassEntry,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import { readCreatureClassIdentityState } from "../../scene/domain/creatureClassIdentity";
import { readCreatureStartingPackageStorage } from
  "../../scene/domain/creatureStartingPackage";
import type { ExistingCreatureStartingPackageCatalog } from
  "./creatureStartingPackageProvenance";

const PAGE_LIMIT = 100;
const MAX_QUERY_CODE_UNITS = 128;
const MAX_DISPLAY_CODE_UNITS = 1024;

export interface ExistingCreatureClassIdentityProvenance {
  readonly classListGraphSha256: string;
  readonly sourceClassIds: readonly number[];
  readonly sourceLevels: readonly number[];
  readonly classesTableSha256: string;
  readonly classesRowCount: number;
  readonly sourceStartingPackage: number;
  readonly packagesTableSha256: string;
  readonly packagesRowCount: number;
}

export interface ExistingCreatureClassCatalog {
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly query: string;
  readonly items: readonly CreatureApiClassRow[];
}

export interface MaterializedCreatureClassIdentity {
  readonly classEntries: readonly SceneObjectCreatureClassEntry[];
  readonly startingPackageId: number;
  readonly destructiveSpellClearConfirmed: true;
}

export interface MaterializedCreatureClassSlotResize {
  readonly classEntries: readonly SceneObjectCreatureClassEntry[];
  readonly startingPackageId: number;
  readonly destructiveRemovedSlotsConfirmed: boolean;
}

export class CreatureClassIdentityCatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "CreatureClassIdentityCatalogError";
  }
}

export function readExistingCreatureClassIdentityProvenance(
  source: SceneObjectSourceMetadata | undefined,
): ExistingCreatureClassIdentityProvenance | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const identity = readCreatureClassIdentityState(source.creatureClassIdentityState);
  const startingPackage = readCreatureStartingPackageStorage(source.creatureStartingPackage);
  if (!identity?.present || !identity.classesTable || !startingPackage?.present ||
    !startingPackage.classIds || !startingPackage.table) return null;
  const sourceClassIds = identity.entries.map((entry) => entry.classId);
  if (!sameNumbers(sourceClassIds, startingPackage.classIds) ||
    startingPackage.table.rowIndex !== startingPackage.value ||
    !sourceClassIds.includes(startingPackage.table.classId)) return null;
  return Object.freeze({
    classListGraphSha256: identity.classListGraphSha256,
    sourceClassIds: Object.freeze(sourceClassIds),
    sourceLevels: Object.freeze(identity.entries.map((entry) => entry.level)),
    classesTableSha256: identity.classesTable.sha256,
    classesRowCount: identity.classesTable.rowCount,
    sourceStartingPackage: startingPackage.value,
    packagesTableSha256: startingPackage.table.sha256,
    packagesRowCount: startingPackage.table.rowCount,
  });
}

export function isExistingCreatureClassCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ExistingCreatureClassCatalog | null | undefined,
): catalog is ExistingCreatureClassCatalog {
  const provenance = readExistingCreatureClassIdentityProvenance(source);
  return provenance !== null && isClassCatalog(catalog, provenance);
}

export function isExistingCreatureClassIdentityPackageCatalogAdmitted(
  source: SceneObjectSourceMetadata | undefined,
  targetClassIds: readonly number[],
  catalog: ExistingCreatureStartingPackageCatalog | null | undefined,
): catalog is ExistingCreatureStartingPackageCatalog {
  const provenance = readExistingCreatureClassIdentityProvenance(source);
  return provenance !== null && catalog !== null && catalog !== undefined &&
    catalog.tableSha256 === provenance.packagesTableSha256 &&
    catalog.rowCount === provenance.packagesRowCount &&
    sameNumbers(catalog.classIds, targetClassIds) && catalog.items.every((row) =>
      isPackageRow(row, provenance.packagesRowCount, targetClassIds));
}

export async function loadExistingCreatureClassCatalog(
  facade: CreatureClassCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  rawQuery: string,
  selectedRowIndices: readonly number[] = [],
): Promise<ExistingCreatureClassCatalog> {
  const provenance = readExistingCreatureClassIdentityProvenance(source);
  if (!provenance) throw new CreatureClassIdentityCatalogError(
    "CREATURE_CLASS_IDENTITY_PROVENANCE_INVALID",
    "Exact ClassList graph and class/package table provenance is required.",
  );
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureClassIdentityCatalogError(
    "CREATURE_CLASS_CATALOG_UNAVAILABLE",
    "The authoritative classes.2da row catalog is unavailable.",
  );
  const query = rawQuery.trim().slice(0, MAX_QUERY_CODE_UNITS);
  const page = await loadClassPage(facade, accessToken, provenance, {
    ...(query ? { query } : {}), limit: PAGE_LIMIT, offset: 0,
  });
  const pageItems = readClassPage(page, provenance, PAGE_LIMIT, 0, false);
  if (selectedRowIndices.some((rowIndex) => !Number.isSafeInteger(rowIndex) || rowIndex < 0 ||
    rowIndex >= provenance.classesRowCount)) throw new CreatureClassIdentityCatalogError(
    "CREATURE_CLASS_CATALOG_INVALID",
    "A selected class row is outside the retained classes.2da table.",
  );
  const requiredRows = [...new Set([...provenance.sourceClassIds, ...selectedRowIndices])];
  const sourceRows: CreatureApiClassRow[] = [];
  for (const rowIndex of requiredRows) {
    const fromPage = pageItems.find((row) => row.rowIndex === rowIndex);
    if (fromPage) {
      sourceRows.push(fromPage);
      continue;
    }
    const exact = await loadClassPage(facade, accessToken, provenance, {
      rowIndex, limit: 1, offset: 0,
    });
    const exactItems = readClassPage(exact, provenance, 1, 0, true);
    if (exactItems.length !== 1 || exactItems[0]!.rowIndex !== rowIndex) {
      throw new CreatureClassIdentityCatalogError(
        "CREATURE_CLASS_CATALOG_STALE",
        "A retained ClassList row is absent from the current Toolset catalog.",
      );
    }
    sourceRows.push(exactItems[0]!);
  }
  const seen = new Set<number>();
  const items = [...sourceRows, ...pageItems]
    .filter((row) => !seen.has(row.rowIndex) && Boolean(seen.add(row.rowIndex)))
    .map((row) => Object.freeze({ ...row }));
  return Object.freeze({
    tableSha256: provenance.classesTableSha256,
    rowCount: provenance.classesRowCount,
    query,
    items: Object.freeze(items),
  });
}

export async function loadCreatureClassIdentityStartingPackageCatalog(
  facade: CreatureStartingPackageCatalogFacade,
  accessToken: string,
  source: SceneObjectSourceMetadata | undefined,
  classCatalog: ExistingCreatureClassCatalog | null | undefined,
  targetClassIds: readonly number[],
  rawQuery: string,
  selectedRowIndex?: number,
): Promise<ExistingCreatureStartingPackageCatalog> {
  const provenance = readExistingCreatureClassIdentityProvenance(source);
  if (!provenance || !isClassCatalog(classCatalog, provenance) ||
    !isTargetClassVector(targetClassIds, provenance, classCatalog)) {
    throw new CreatureClassIdentityCatalogError(
      "CREATURE_CLASS_IDENTITY_PROVENANCE_INVALID",
      "An admitted same-roster target ClassList is required before loading packages.",
    );
  }
  if (!facade?.queries?.listRows || !accessToken) throw new CreatureClassIdentityCatalogError(
    "CREATURE_CLASS_PACKAGE_CATALOG_UNAVAILABLE",
    "The authoritative packages.2da row catalog is unavailable.",
  );
  const query = rawQuery.trim().slice(0, MAX_QUERY_CODE_UNITS);
  const page = await loadPackagePage(facade, accessToken, provenance, targetClassIds, {
    ...(query ? { query } : {}), limit: PAGE_LIMIT, offset: 0,
  });
  const pageItems = readPackagePage(page, provenance, targetClassIds, PAGE_LIMIT, 0, false);
  let selected: CreatureApiStartingPackageRow | undefined;
  if (selectedRowIndex !== undefined && isPackageRowIndex(
    selectedRowIndex,
    provenance.packagesRowCount,
  )) {
    selected = pageItems.find((row) => row.rowIndex === selectedRowIndex);
    if (!selected) {
      const exact = await loadPackagePage(facade, accessToken, provenance, targetClassIds, {
        rowIndex: selectedRowIndex, limit: 1, offset: 0,
      });
      selected = readPackagePage(exact, provenance, targetClassIds, 1, 0, true)[0];
    }
  }
  const seen = new Set<number>();
  const items = [selected, ...pageItems]
    .filter((row): row is CreatureApiStartingPackageRow => row !== undefined)
    .filter((row) => !seen.has(row.rowIndex) && Boolean(seen.add(row.rowIndex)))
    .map((row) => Object.freeze({ ...row }));
  if (items.length === 0) throw new CreatureClassIdentityCatalogError(
    "CREATURE_CLASS_PACKAGE_CATALOG_INVALID",
    "No StartingPackage row is admitted for the target ClassList.",
  );
  return Object.freeze({
    tableSha256: provenance.packagesTableSha256,
    rowCount: provenance.packagesRowCount,
    classIds: Object.freeze([...targetClassIds]),
    query,
    items: Object.freeze(items),
  });
}

export function materializeExistingCreatureClassIdentity(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureClassEntry[],
  candidate: readonly SceneObjectCreatureClassEntry[],
  startingPackageId: unknown,
  destructiveSpellClearConfirmed: unknown,
  classCatalog: ExistingCreatureClassCatalog | null | undefined,
  packageCatalog: ExistingCreatureStartingPackageCatalog | null | undefined,
): MaterializedCreatureClassIdentity | null {
  const provenance = readExistingCreatureClassIdentityProvenance(source);
  if (!provenance || destructiveSpellClearConfirmed !== true ||
    !isClassCatalog(classCatalog, provenance) || current.length !== provenance.sourceClassIds.length ||
    candidate.length !== provenance.sourceClassIds.length ||
    !isPackageRowIndex(startingPackageId, provenance.packagesRowCount)) return null;
  const targetIds: number[] = [];
  let targetTotalLevel = 0;
  for (let index = 0; index < provenance.sourceClassIds.length; index += 1) {
    const currentEntry = current[index];
    const candidateEntry = candidate[index];
    if (!currentEntry || !candidateEntry ||
      currentEntry.classId !== provenance.sourceClassIds[index] ||
      currentEntry.level !== provenance.sourceLevels[index] ||
      !Number.isSafeInteger(candidateEntry.level) || candidateEntry.level < 1 ||
      candidateEntry.level > 60 ||
      !Number.isSafeInteger(candidateEntry.classId) || Number(candidateEntry.classId) < 0 ||
      Number(candidateEntry.classId) >= provenance.classesRowCount) return null;
    targetIds.push(Number(candidateEntry.classId));
    targetTotalLevel += candidateEntry.level;
  }
  if (targetTotalLevel > 180 || new Set(targetIds).size !== targetIds.length ||
    sameNumbers(targetIds, provenance.sourceClassIds) ||
    !isTargetClassVector(targetIds, provenance, classCatalog) || !packageCatalog ||
    packageCatalog.tableSha256 !== provenance.packagesTableSha256 ||
    packageCatalog.rowCount !== provenance.packagesRowCount ||
    !sameNumbers(packageCatalog.classIds, targetIds) ||
    !packageCatalog.items.some((row) => row.rowIndex === startingPackageId &&
      targetIds.includes(row.classId))) return null;
  const classRows = new Map(classCatalog.items.map((row) => [row.rowIndex, row] as const));
  return Object.freeze({
    classEntries: Object.freeze(candidate.map((entry, index) => Object.freeze({
      classId: targetIds[index]!,
      className: classRows.get(targetIds[index]!)!.displayName,
      level: entry.level,
    }))),
    startingPackageId,
    destructiveSpellClearConfirmed: true,
  });
}

export function materializeExistingCreatureClassSlotResize(
  source: SceneObjectSourceMetadata | undefined,
  current: readonly SceneObjectCreatureClassEntry[],
  candidate: readonly SceneObjectCreatureClassEntry[],
  startingPackageId: unknown,
  destructiveRemovedSlotsConfirmed: unknown,
  classCatalog: ExistingCreatureClassCatalog | null | undefined,
  packageCatalog: ExistingCreatureStartingPackageCatalog | null | undefined,
): MaterializedCreatureClassSlotResize | null {
  const provenance = readExistingCreatureClassIdentityProvenance(source);
  if (!provenance || !isClassCatalog(classCatalog, provenance) ||
    current.length !== provenance.sourceClassIds.length || candidate.length < 1 ||
    candidate.length > 8 || candidate.length === provenance.sourceClassIds.length ||
    !isPackageRowIndex(startingPackageId, provenance.packagesRowCount)) return null;

  for (let index = 0; index < current.length; index += 1) {
    if (current[index]?.classId !== provenance.sourceClassIds[index] ||
      current[index]?.level !== provenance.sourceLevels[index]) return null;
  }
  const targetIds: number[] = [];
  const targetLevels: number[] = [];
  for (const entry of candidate) {
    if (!Number.isSafeInteger(entry.classId) || Number(entry.classId) < 0 ||
      Number(entry.classId) >= provenance.classesRowCount ||
      !Number.isSafeInteger(entry.level) || entry.level < 1 || entry.level > 60) return null;
    targetIds.push(Number(entry.classId));
    targetLevels.push(entry.level);
  }
  const retainedCount = Math.min(candidate.length, provenance.sourceClassIds.length);
  for (let index = 0; index < retainedCount; index += 1) {
    if (targetIds[index] !== provenance.sourceClassIds[index] ||
      targetLevels[index] !== provenance.sourceLevels[index]) return null;
  }
  const truncating = candidate.length < provenance.sourceClassIds.length;
  if (truncating !== (destructiveRemovedSlotsConfirmed === true) ||
    targetLevels.reduce((sum, level) => sum + level, 0) > 180 ||
    new Set(targetIds).size !== targetIds.length ||
    !isTargetClassVector(targetIds, provenance, classCatalog) || !packageCatalog ||
    packageCatalog.tableSha256 !== provenance.packagesTableSha256 ||
    packageCatalog.rowCount !== provenance.packagesRowCount ||
    !sameNumbers(packageCatalog.classIds, targetIds) ||
    !packageCatalog.items.some((row) => row.rowIndex === startingPackageId &&
      targetIds.includes(row.classId))) return null;

  const classRows = new Map(classCatalog.items.map((row) => [row.rowIndex, row] as const));
  return Object.freeze({
    classEntries: Object.freeze(candidate.map((entry, index) => Object.freeze({
      classId: targetIds[index]!,
      className: classRows.get(targetIds[index]!)!.displayName,
      level: entry.level,
    }))),
    startingPackageId,
    destructiveRemovedSlotsConfirmed: truncating,
  });
}

export function reduceExistingCreatureClassIdentityStartingPackageId(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: number | undefined,
  candidateValue: unknown,
  targetClassIds: readonly number[],
  packageCatalog: ExistingCreatureStartingPackageCatalog | null | undefined,
): number | undefined {
  const provenance = readExistingCreatureClassIdentityProvenance(source);
  if (!provenance || !packageCatalog ||
    packageCatalog.tableSha256 !== provenance.packagesTableSha256 ||
    packageCatalog.rowCount !== provenance.packagesRowCount ||
    !sameNumbers(packageCatalog.classIds, targetClassIds) ||
    !isPackageRowIndex(candidateValue, provenance.packagesRowCount)) return currentValue;
  return packageCatalog.items.some((row) => row.rowIndex === candidateValue &&
    targetClassIds.includes(row.classId)) ? candidateValue : currentValue;
}

export function resolveCreatureClassDisplayName(
  rowIndex: number | undefined,
  catalog: ExistingCreatureClassCatalog | null | undefined,
  fallback: string,
): string {
  return catalog?.items.find((row) => row.rowIndex === rowIndex)?.displayName ?? fallback;
}

async function loadClassPage(
  facade: CreatureClassCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureClassIdentityProvenance,
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiClassRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.classesTableSha256,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_CLASSES_TABLE_STALE";
    throw new CreatureClassIdentityCatalogError(
      stale ? "CREATURE_CLASS_CATALOG_STALE" : "CREATURE_CLASS_CATALOG_UNAVAILABLE",
      stale ? "The authoritative classes.2da identity changed." :
        "The authoritative classes.2da catalog could not be loaded.",
    );
  }
}

function readClassPage(
  result: CreatureApiClassRowsResult,
  provenance: ExistingCreatureClassIdentityProvenance,
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiClassRow[] {
  if (result.resourceName !== "classes.2da" ||
    result.sha256 !== provenance.classesTableSha256 ||
    result.rowCount !== provenance.classesRowCount || result.limit !== expectedLimit ||
    result.offset !== expectedOffset || !Number.isSafeInteger(result.total) ||
    result.total < 0 || result.total > provenance.classesRowCount ||
    (exact && result.total > 1) || !Array.isArray(result.items) ||
    result.items.length > expectedLimit) throw new CreatureClassIdentityCatalogError(
      "CREATURE_CLASS_CATALOG_STALE",
      "The returned classes.2da page differs from retained provenance.",
    );
  const seen = new Set<number>();
  return result.items.map((row) => {
    if (!isClassRow(row, provenance.classesRowCount) || seen.has(row.rowIndex)) {
      throw new CreatureClassIdentityCatalogError(
        "CREATURE_CLASS_CATALOG_INVALID",
        "The returned class option is invalid or duplicated.",
      );
    }
    seen.add(row.rowIndex);
    return row;
  });
}

async function loadPackagePage(
  facade: CreatureStartingPackageCatalogFacade,
  accessToken: string,
  provenance: ExistingCreatureClassIdentityProvenance,
  classIds: readonly number[],
  query: { rowIndex?: number; query?: string; limit: number; offset: number },
): Promise<CreatureApiStartingPackageRowsResult> {
  try {
    return await facade.queries.listRows(accessToken, {
      tableSha256: provenance.packagesTableSha256,
      classIds,
      ...query,
    });
  } catch (error) {
    const stale = isRecord(error) && error.code === "CREATURE_STARTING_PACKAGE_TABLE_STALE";
    throw new CreatureClassIdentityCatalogError(
      stale ? "CREATURE_CLASS_PACKAGE_CATALOG_STALE" :
        "CREATURE_CLASS_PACKAGE_CATALOG_UNAVAILABLE",
      stale ? "The authoritative packages.2da identity or target ClassList changed." :
        "The authoritative packages.2da catalog could not be loaded.",
    );
  }
}

function readPackagePage(
  result: CreatureApiStartingPackageRowsResult,
  provenance: ExistingCreatureClassIdentityProvenance,
  classIds: readonly number[],
  expectedLimit: number,
  expectedOffset: number,
  exact: boolean,
): readonly CreatureApiStartingPackageRow[] {
  if (result.resourceName !== "packages.2da" ||
    result.sha256 !== provenance.packagesTableSha256 ||
    result.rowCount !== provenance.packagesRowCount || !sameNumbers(result.classIds, classIds) ||
    result.limit !== expectedLimit || result.offset !== expectedOffset ||
    !Number.isSafeInteger(result.total) || result.total < 0 ||
    result.total > provenance.packagesRowCount || (exact && result.total > 1) ||
    !Array.isArray(result.items) || result.items.length > expectedLimit) {
    throw new CreatureClassIdentityCatalogError(
      "CREATURE_CLASS_PACKAGE_CATALOG_STALE",
      "The returned packages.2da page differs from target ClassList provenance.",
    );
  }
  const seen = new Set<number>();
  return result.items.map((row) => {
    if (!isPackageRow(row, provenance.packagesRowCount, classIds) ||
      seen.has(row.rowIndex)) throw new CreatureClassIdentityCatalogError(
      "CREATURE_CLASS_PACKAGE_CATALOG_INVALID",
      "The returned StartingPackage option is invalid or duplicated.",
    );
    seen.add(row.rowIndex);
    return row;
  });
}

function isClassCatalog(
  catalog: ExistingCreatureClassCatalog | null | undefined,
  provenance: ExistingCreatureClassIdentityProvenance,
): catalog is ExistingCreatureClassCatalog {
  if (!catalog || catalog.tableSha256 !== provenance.classesTableSha256 ||
    catalog.rowCount !== provenance.classesRowCount || typeof catalog.query !== "string" ||
    catalog.query.length > MAX_QUERY_CODE_UNITS || !Array.isArray(catalog.items)) return false;
  const seen = new Set<number>();
  const valid = catalog.items.every((row) => {
    if (!isClassRow(row, provenance.classesRowCount) || seen.has(row.rowIndex)) return false;
    seen.add(row.rowIndex);
    return true;
  });
  return valid && provenance.sourceClassIds.every((rowIndex) => seen.has(rowIndex));
}

function isTargetClassVector(
  classIds: readonly number[],
  provenance: ExistingCreatureClassIdentityProvenance,
  catalog: ExistingCreatureClassCatalog,
): boolean {
  return classIds.length >= 1 && classIds.length <= 8 &&
    new Set(classIds).size === classIds.length && classIds.every((classId) =>
      Number.isSafeInteger(classId) && classId >= 0 && classId < provenance.classesRowCount &&
      catalog.items.some((row) => row.rowIndex === classId));
}

function isClassRow(value: unknown, rowCount: number): value is CreatureApiClassRow {
  if (!isRecord(value) || !Number.isSafeInteger(value.rowIndex) || Number(value.rowIndex) < 0 ||
    Number(value.rowIndex) >= rowCount || typeof value.displayName !== "string" ||
    value.displayName.length < 1 || value.displayName.length > MAX_DISPLAY_CODE_UNITS ||
    value.displayName.includes("\0") || !Number.isSafeInteger(value.nameStrRef) ||
    Number(value.nameStrRef) < 0 || Number(value.nameStrRef) > 0xffff_ffff ||
    (value.displaySource !== "strref" && value.displaySource !== "strref_id") ||
    Object.keys(value).some((key) => ![
      "rowIndex", "displayName", "displaySource", "nameStrRef",
    ].includes(key))) return false;
  return value.displaySource === "strref" ||
    value.displayName === `StringRef ${value.nameStrRef}`;
}

function isPackageRow(
  value: unknown,
  rowCount: number,
  classIds: readonly number[],
): value is CreatureApiStartingPackageRow {
  return isRecord(value) && isPackageRowIndex(value.rowIndex, rowCount) &&
    Number.isSafeInteger(value.classId) && classIds.includes(Number(value.classId)) &&
    typeof value.displayName === "string" && value.displayName.length >= 1 &&
    value.displayName.length <= MAX_DISPLAY_CODE_UNITS && !value.displayName.includes("\0") &&
    (value.displaySource === "label" && value.nameStrRef === null ||
      (value.displaySource === "strref" || value.displaySource === "strref_id") &&
      Number.isSafeInteger(value.nameStrRef) && Number(value.nameStrRef) >= 0 &&
      Number(value.nameStrRef) <= 0xffff_ffff &&
      (value.displaySource === "strref" ||
        value.displayName === `StringRef ${value.nameStrRef}`));
}

function isPackageRowIndex(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xff &&
    Number(value) < rowCount;
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

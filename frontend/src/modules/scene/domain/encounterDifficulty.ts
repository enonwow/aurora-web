import type {
  SceneEncounterDifficultyCatalog,
  SceneEncounterDifficultyPair,
  SceneObjectEncounterDifficultyProvenance,
  SceneObjectSourceMetadata,
} from "../contracts";

const MAX_ROWS = 256;

export function readEncounterDifficultyCatalog(
  value: unknown,
): SceneEncounterDifficultyCatalog | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schemaVersion", "descriptor", "rows",
  ]) || value.schemaVersion !== "area-encounter-difficulty-catalog.v1" ||
      !isRecord(value.descriptor) || !hasExactKeys(value.descriptor, [
        "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
      ]) || value.descriptor.resourceName !== "encdifficulty.2da" ||
      !isBoundedString(value.descriptor.sourceObjectKey, 2048) ||
      !isSourceLayer(value.descriptor.sourceLayer) ||
      !isSha256(value.descriptor.sha256) ||
      !isIntegerBetween(value.descriptor.sizeBytes, 1, 16 * 1024 * 1024) ||
      !isIntegerBetween(value.descriptor.rowCount, 1, MAX_ROWS) ||
      !Array.isArray(value.rows) || value.rows.length !== value.descriptor.rowCount) return null;
  const rows = value.rows.map((row, rowIndex) => readRow(row, rowIndex));
  if (rows.some((row) => row === null)) return null;
  return Object.freeze({
    schemaVersion: "area-encounter-difficulty-catalog.v1" as const,
    descriptor: Object.freeze({
      resourceName: "encdifficulty.2da" as const,
      sourceObjectKey: value.descriptor.sourceObjectKey,
      sourceLayer: value.descriptor.sourceLayer,
      sha256: value.descriptor.sha256,
      sizeBytes: Number(value.descriptor.sizeBytes),
      rowCount: Number(value.descriptor.rowCount),
    }),
    rows: Object.freeze(rows as SceneEncounterDifficultyCatalog["rows"]),
  });
}

export function readEncounterDifficultyProvenance(
  value: unknown,
): SceneObjectEncounterDifficultyProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedValue", "catalogSha256", "catalogRowCount",
  ]) || !isSha256(value.catalogSha256) ||
      !isIntegerBetween(value.catalogRowCount, 1, MAX_ROWS)) return null;
  const expectedValue = readPair(value.expectedValue, Number(value.catalogRowCount));
  if (!expectedValue) return null;
  return Object.freeze({
    expectedValue,
    catalogSha256: value.catalogSha256,
    catalogRowCount: Number(value.catalogRowCount),
  });
}

export function readEncounterDifficultyBinding(
  storage: unknown,
  catalog: SceneEncounterDifficultyCatalog | null | undefined,
): SceneObjectEncounterDifficultyProvenance | null {
  const exactCatalog = readEncounterDifficultyCatalog(catalog);
  if (!exactCatalog || !isRecord(storage) || !hasExactKeys(storage, [
    "difficulty", "difficultyIndex",
  ])) return null;
  const difficulty = readPresentInt(storage.difficulty);
  const difficultyIndex = readPresentInt(storage.difficultyIndex);
  if (difficulty === null || difficultyIndex === null) return null;
  const row = exactCatalog.rows[difficultyIndex];
  if (!row || row.value !== difficulty) return null;
  return readEncounterDifficultyProvenance({
    expectedValue: { difficulty, difficultyIndex },
    catalogSha256: exactCatalog.descriptor.sha256,
    catalogRowCount: exactCatalog.descriptor.rowCount,
  });
}

export function readEncounterDifficultyCatalogBinding(
  source: SceneObjectSourceMetadata | undefined,
  catalog: SceneEncounterDifficultyCatalog | null | undefined,
): Readonly<{
  provenance: SceneObjectEncounterDifficultyProvenance;
  catalog: SceneEncounterDifficultyCatalog;
}> | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "encounter" ||
      !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const provenance = readEncounterDifficultyProvenance(source.encounterDifficulty);
  const exactCatalog = readEncounterDifficultyCatalog(catalog);
  if (!provenance || !exactCatalog ||
      provenance.catalogSha256 !== exactCatalog.descriptor.sha256 ||
      provenance.catalogRowCount !== exactCatalog.descriptor.rowCount) return null;
  const row = exactCatalog.rows[provenance.expectedValue.difficultyIndex];
  if (!row || row.value !== provenance.expectedValue.difficulty) return null;
  return Object.freeze({ provenance, catalog: exactCatalog });
}

export function readEncounterDifficultyTarget(
  value: unknown,
  catalog: SceneEncounterDifficultyCatalog | null | undefined,
): SceneEncounterDifficultyPair | null {
  const exactCatalog = readEncounterDifficultyCatalog(catalog);
  if (!exactCatalog) return null;
  const pair = readPair(value, exactCatalog.descriptor.rowCount);
  if (!pair) return null;
  const row = exactCatalog.rows[pair.difficultyIndex];
  return row?.value === pair.difficulty ? pair : null;
}

export function encounterDifficultyPairsEqual(
  left: SceneEncounterDifficultyPair | null | undefined,
  right: SceneEncounterDifficultyPair | null | undefined,
): boolean {
  return !!left && !!right && left.difficulty === right.difficulty &&
    left.difficultyIndex === right.difficultyIndex;
}

function readRow(value: unknown, expectedIndex: number) {
  if (!isRecord(value) || !hasExactKeys(value, [
    "rowIndex", "strRef", "value", "displayName", "displaySource",
  ]) || value.rowIndex !== expectedIndex ||
      !isIntegerBetween(value.strRef, 0, 0xffff_ffff) ||
      !isIntegerBetween(value.value, -20, 20) ||
      !isBoundedString(value.displayName, 1024) ||
      (value.displaySource !== "strref" && value.displaySource !== "row_index")) return null;
  return Object.freeze({
    rowIndex: expectedIndex,
    strRef: Number(value.strRef),
    value: Number(value.value),
    displayName: value.displayName,
    displaySource: value.displaySource,
  });
}

function readPair(value: unknown, rowCount: number) {
  if (!isRecord(value) || !hasExactKeys(value, ["difficulty", "difficultyIndex"]) ||
      !isIntegerBetween(value.difficulty, -20, 20) ||
      !isIntegerBetween(value.difficultyIndex, 0, rowCount - 1)) return null;
  return Object.freeze({
    difficulty: Number(value.difficulty),
    difficultyIndex: Number(value.difficultyIndex),
  });
}

function readPresentInt(value: unknown): number | null {
  return isRecord(value) && hasExactKeys(value, ["present", "nativeType", "value"]) &&
    value.present === true && value.nativeType === "int" &&
    isIntegerBetween(value.value, -0x8000_0000, 0x7fff_ffff)
    ? Number(value.value)
    : null;
}

function isSourceLayer(value: unknown): value is "module" | "hak" | "vanilla" {
  return value === "module" || value === "hak" || value === "vanilla";
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum &&
    !value.includes("\0");
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

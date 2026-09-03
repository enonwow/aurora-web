import type {
  SceneCreaturePortraitCatalog,
  SceneCreaturePortraitRow,
  SceneObjectCreaturePortraitStorage,
  SceneObjectCreaturePortraitTable,
  SceneObjectSourceMetadata,
} from "../contracts";

const MAX_ROWS = 65_536;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function integer(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function baseResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

function readDescriptor(value: unknown) {
  if (!isRecord(value) || !exactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || value.resourceName !== "portraits.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > 2048 ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !integer(value.sizeBytes, 1, 16 * 1024 * 1024) ||
    !integer(value.rowCount, 1, MAX_ROWS)) return null;
  return Object.freeze({
    resourceName: "portraits.2da" as const,
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: value.sizeBytes,
    rowCount: value.rowCount,
  });
}

export function readCreaturePortraitCatalog(value: unknown): SceneCreaturePortraitCatalog | null {
  if (!isRecord(value) || !exactKeys(value, ["descriptor", "rows"]) ||
    !Array.isArray(value.rows)) return null;
  const descriptor = readDescriptor(value.descriptor);
  if (!descriptor || value.rows.length < 1 || value.rows.length > descriptor.rowCount) return null;
  let previous = -1;
  const rows: SceneCreaturePortraitRow[] = [];
  for (const candidate of value.rows) {
    if (!isRecord(candidate) || !exactKeys(candidate, [
      "rowIndex", "baseResRef", "sex", "race", "plot",
    ]) || !integer(candidate.rowIndex, 0, descriptor.rowCount - 1) ||
      candidate.rowIndex <= previous || !baseResRef(candidate.baseResRef) ||
      !integer(candidate.sex, 0, 0xff) || !integer(candidate.race, 0, 0xff) ||
      candidate.plot !== 0) return null;
    previous = candidate.rowIndex;
    rows.push(Object.freeze({
      rowIndex: candidate.rowIndex,
      baseResRef: candidate.baseResRef,
      sex: candidate.sex,
      race: candidate.race,
      plot: 0,
    }));
  }
  return Object.freeze({ descriptor, rows: Object.freeze(rows) });
}

function readTable(value: unknown): SceneObjectCreaturePortraitTable | null {
  if (!isRecord(value) || !exactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
    "rowIndex", "baseResRef",
  ])) return null;
  const descriptor = readDescriptor(Object.fromEntries([
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ].map((key) => [key, value[key]])));
  if (!descriptor || !integer(value.rowIndex, 0, descriptor.rowCount - 1) ||
    !integer(value.rowIndex, 0, 0xffff) || !baseResRef(value.baseResRef)) return null;
  return Object.freeze({
    ...descriptor,
    rowIndex: value.rowIndex,
    baseResRef: value.baseResRef,
  });
}

export function readCreaturePortraitStorage(
  value: unknown,
): SceneObjectCreaturePortraitStorage | null {
  if (!isRecord(value)) return null;
  if (exactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const hasContext = Object.prototype.hasOwnProperty.call(value, "selectorContext");
  const hasTable = Object.prototype.hasOwnProperty.call(value, "table");
  if (!exactKeys(value, [
    "present", "nativeType", "value",
    ...(hasContext ? ["selectorContext"] : []),
    ...(hasTable ? ["table"] : []),
  ]) || value.present !== true || value.nativeType !== "word" ||
    !integer(value.value, 0, 0xffff) || hasTable && !hasContext) return null;
  const context = value.selectorContext;
  if (hasContext && (!isRecord(context) || !exactKeys(context, ["genderValue", "raceValue"]) ||
    !integer(context.genderValue, 0, 0xff) || !integer(context.raceValue, 0, 0xff))) return null;
  const table = hasTable ? readTable(value.table) : undefined;
  if (hasTable && (!table || table.rowIndex !== value.value)) return null;
  return Object.freeze({
    present: true,
    nativeType: "word",
    value: value.value,
    ...(hasContext && isRecord(context)
      ? { selectorContext: Object.freeze({
          genderValue: Number(context.genderValue),
          raceValue: Number(context.raceValue),
        }) }
      : {}),
    ...(table ? { table } : {}),
  });
}

export function isCreaturePortraitRowAdmitted(
  row: SceneCreaturePortraitRow,
  genderValue: number,
  raceValue: number,
): boolean {
  // Aurora's Portrait dialog uses Sex row 4 for non-player races above row 6.
  return row.plot === 0 && row.sex === (raceValue > 6 ? 4 : genderValue) &&
    (raceValue === 4 ? row.race === 6 || row.race === 1 : row.race === raceValue);
}

export function admittedCreaturePortraitRows(
  source: SceneObjectSourceMetadata | undefined,
  catalog: SceneCreaturePortraitCatalog | null | undefined,
): readonly SceneCreaturePortraitRow[] {
  const storage = readCreaturePortraitStorage(source?.creaturePortrait);
  const exactCatalog = readCreaturePortraitCatalog(catalog);
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0 ||
    !storage?.present || !storage.selectorContext || !storage.table || !exactCatalog ||
    storage.table.sha256 !== exactCatalog.descriptor.sha256 ||
    storage.table.rowCount !== exactCatalog.descriptor.rowCount) return [];
  const rows = exactCatalog.rows.filter((row) => isCreaturePortraitRowAdmitted(
    row,
    storage.selectorContext!.genderValue,
    storage.selectorContext!.raceValue,
  ));
  return rows.some((row) => row.rowIndex === storage.value) ? rows : [];
}

export function canEditExistingCreaturePortrait(
  source: SceneObjectSourceMetadata | undefined,
  catalog: SceneCreaturePortraitCatalog | null | undefined,
): boolean {
  return admittedCreaturePortraitRows(source, catalog).length > 0;
}

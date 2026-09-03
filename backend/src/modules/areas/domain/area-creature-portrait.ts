import {
  isEffectiveCreaturePortraitRowAdmitted,
  isExactEffectiveCreaturePortraitsTwoDaTable,
  type EffectiveCreaturePortraitsTwoDaDescriptor,
  type EffectiveCreaturePortraitsTwoDaTable,
} from "../../catalog/domain/effective-creature-portraits-two-da";

const WORD_MAX = 0xffff;
const BYTE_MAX = 0xff;
const MUTATION_KEYS = [
  "expectedValue",
  "value",
  "tableSha256",
  "rowCount",
  "genderExpectedValue",
  "raceExpectedValue",
] as const;
const DESCRIPTOR_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
] as const;
const TABLE_KEYS = [...DESCRIPTOR_KEYS, "rowIndex", "baseResRef"] as const;

export interface AreaCreaturePortraitSelectorContext {
  readonly genderValue: number;
  readonly raceValue: number;
}

export interface AreaCreaturePortraitTable extends EffectiveCreaturePortraitsTwoDaDescriptor {
  readonly rowIndex: number;
  readonly baseResRef: string;
}

export type AreaCreaturePortraitStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      selectorContext?: AreaCreaturePortraitSelectorContext;
      table?: AreaCreaturePortraitTable;
    }>;

export interface ExistingAreaCreaturePortraitMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly rowCount: number;
  readonly genderExpectedValue: number;
  readonly raceExpectedValue: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isByte(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX;
}

function isWord(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= WORD_MAX;
}

function readSelectorContext(value: unknown): AreaCreaturePortraitSelectorContext | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["genderValue", "raceValue"]) ||
    !isByte(value.genderValue) || !isByte(value.raceValue)) return null;
  return Object.freeze({
    genderValue: Number(value.genderValue),
    raceValue: Number(value.raceValue),
  });
}

function readTable(value: unknown): AreaCreaturePortraitTable | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, TABLE_KEYS)) return null;
  const synthetic = {
    descriptor: Object.fromEntries(DESCRIPTOR_KEYS.map((key) => [key, value[key]])),
    rows: [{
      rowIndex: value.rowIndex,
      baseResRef: value.baseResRef,
      sex: 0,
      race: 0,
      plot: 0,
    }],
  };
  if (!isExactEffectiveCreaturePortraitsTwoDaTable(synthetic) ||
    !isWord(value.rowIndex)) return null;
  return Object.freeze({
    ...(synthetic.descriptor as unknown as EffectiveCreaturePortraitsTwoDaDescriptor),
    rowIndex: Number(value.rowIndex),
    baseResRef: String(value.baseResRef),
  });
}

export function readAreaCreaturePortraitStorage(
  value: unknown,
): AreaCreaturePortraitStorage | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const hasContext = Object.prototype.hasOwnProperty.call(value, "selectorContext");
  const hasTable = Object.prototype.hasOwnProperty.call(value, "table");
  const expectedKeys = [
    "present", "nativeType", "value",
    ...(hasContext ? ["selectorContext"] : []),
    ...(hasTable ? ["table"] : []),
  ];
  if (!hasExactKeys(value, expectedKeys) || value.present !== true ||
    value.nativeType !== "word" || !isWord(value.value) || hasTable && !hasContext) return null;
  const selectorContext = hasContext ? readSelectorContext(value.selectorContext) : undefined;
  if (hasContext && !selectorContext) return null;
  const table = hasTable ? readTable(value.table) : undefined;
  if (hasTable && (!table || table.rowIndex !== Number(value.value))) return null;
  return Object.freeze({
    present: true,
    nativeType: "word",
    value: Number(value.value),
    ...(selectorContext ? { selectorContext } : {}),
    ...(table ? { table } : {}),
  });
}

export function bindEffectiveCreaturePortraitsTwoDaToCreaturePortrait(
  storage: AreaCreaturePortraitStorage,
  table: unknown,
): AreaCreaturePortraitStorage {
  if (!storage.present || !storage.selectorContext ||
    !isExactEffectiveCreaturePortraitsTwoDaTable(table)) return storage;
  const row = table.rows.find((candidate) => candidate.rowIndex === storage.value);
  if (!row || !isEffectiveCreaturePortraitRowAdmitted(
    row,
    storage.selectorContext.genderValue,
    storage.selectorContext.raceValue,
  )) return storage;
  return Object.freeze({
    ...storage,
    table: Object.freeze({
      ...table.descriptor,
      rowIndex: row.rowIndex,
      baseResRef: row.baseResRef,
    }),
  });
}

export function readExistingAreaCreaturePortraitMutation(
  value: unknown,
): ExistingAreaCreaturePortraitMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS) ||
    !isWord(value.expectedValue) || !isWord(value.value) || value.expectedValue === value.value ||
    typeof value.tableSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > 65_536 || Number(value.expectedValue) >= Number(value.rowCount) ||
    Number(value.value) >= Number(value.rowCount) ||
    !isByte(value.genderExpectedValue) || !isByte(value.raceExpectedValue)) return null;
  return Object.freeze({
    expectedValue: Number(value.expectedValue),
    value: Number(value.value),
    tableSha256: value.tableSha256,
    rowCount: Number(value.rowCount),
    genderExpectedValue: Number(value.genderExpectedValue),
    raceExpectedValue: Number(value.raceExpectedValue),
  });
}

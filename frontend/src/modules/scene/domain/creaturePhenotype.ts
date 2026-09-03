import type {
  SceneObjectCreaturePhenotypeStorage,
  SceneObjectCreaturePhenotypeTable,
  SceneObjectSourceMetadata,
} from "../contracts";
import { readCreatureAppearanceStorage } from "./creatureAppearance";

const INT_MIN = -0x8000_0000;
const INT_MAX = 0x7fff_ffff;
const BYTE_MAX = 0xff;
const MAX_ROWS = 1_000_000;
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_KEY = 2048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function readTable(value: unknown): SceneObjectCreaturePhenotypeTable | null {
  if (!isRecord(value) || !exactKeys(value, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
    "rowIndex",
  ])) return null;
  if (
    value.resourceName !== "phenotype.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > MAX_KEY ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) || Number(value.sizeBytes) < 1 ||
    Number(value.sizeBytes) > MAX_BYTES ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS ||
    !Number.isSafeInteger(value.rowIndex) || Number(value.rowIndex) < 0 ||
    Number(value.rowIndex) > BYTE_MAX || Number(value.rowIndex) === 1 ||
    Number(value.rowIndex) >= Number(value.rowCount)
  ) return null;
  return Object.freeze({
    resourceName: "phenotype.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
    rowIndex: Number(value.rowIndex),
  });
}

export function readCreaturePhenotypeStorage(
  value: unknown,
): SceneObjectCreaturePhenotypeStorage | null {
  if (!isRecord(value)) return null;
  if (exactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const unbound = exactKeys(value, ["present", "nativeType", "value"]);
  const bound = exactKeys(value, ["present", "nativeType", "value", "table"]);
  if ((!unbound && !bound) || value.present !== true || value.nativeType !== "int" ||
    !Number.isSafeInteger(value.value) || Number(value.value) < INT_MIN ||
    Number(value.value) > INT_MAX) return null;
  const base = Object.freeze({
    present: true as const,
    nativeType: "int" as const,
    value: Number(value.value),
  });
  if (!bound) return base;
  const table = readTable(value.table);
  if (!table || table.rowIndex !== base.value) return null;
  return Object.freeze({ ...base, table });
}

export function canEditExistingCreaturePhenotype(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  if (
    source?.type !== "aurora_git" ||
    source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) ||
    Number(source.sourceIndex) < 0
  ) return false;
  const phenotype = readCreaturePhenotypeStorage(source.creaturePhenotype);
  const appearance = readCreatureAppearanceStorage(source.creatureAppearance);
  return phenotype?.present === true && phenotype.table !== undefined &&
    phenotype.value !== 1 && phenotype.value >= 0 && phenotype.value <= BYTE_MAX &&
    appearance?.present === true && appearance.table !== undefined;
}

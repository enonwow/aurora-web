import {
  readExistingAreaPlaceableFactionMutation,
  readExistingAreaPlaceableFactionProvenance,
  type ExistingAreaPlaceableFactionMutation,
  type ExistingAreaPlaceableFactionProvenance,
} from "./area-placeable-faction";

export type AreaCreatureFactionStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "word"; value: number }>;

export type ExistingAreaCreatureFactionProvenance =
  ExistingAreaPlaceableFactionProvenance;
export type ExistingAreaCreatureFactionMutation =
  ExistingAreaPlaceableFactionMutation;

export function readAreaCreatureFactionStorage(
  input: unknown,
): AreaCreatureFactionStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "word" &&
    Number.isSafeInteger(input.value) &&
    Number(input.value) >= 0 &&
    Number(input.value) <= 0xffff
  ) {
    return Object.freeze({
      present: true,
      nativeType: "word",
      value: Number(input.value),
    });
  }
  return null;
}

export function readExistingAreaCreatureFactionProvenance(
  input: unknown,
): Readonly<ExistingAreaCreatureFactionProvenance> | null {
  return readExistingAreaPlaceableFactionProvenance(input);
}

export function readExistingAreaCreatureFactionMutation(
  input: unknown,
): Readonly<ExistingAreaCreatureFactionMutation> | null {
  return readExistingAreaPlaceableFactionMutation(input);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

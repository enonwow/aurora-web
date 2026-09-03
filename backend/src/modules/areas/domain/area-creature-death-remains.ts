import {
  readExistingAreaPlaceableBodyBagMutation,
  readExistingAreaPlaceableBodyBagProvenance,
  type ExistingAreaPlaceableBodyBagMutation,
  type ExistingAreaPlaceableBodyBagProvenance,
} from "./area-placeable-body-bag";

export const AREA_CREATURE_DECAY_MIN_SECONDS = 5;
export const AREA_CREATURE_DECAY_MAX_SECONDS = 0x7fff;
export const AREA_CREATURE_DECAY_MILLISECONDS_PER_SECOND = 1000;
export const AREA_CREATURE_DECAY_MIN_MILLISECONDS =
  AREA_CREATURE_DECAY_MIN_SECONDS * AREA_CREATURE_DECAY_MILLISECONDS_PER_SECOND;
export const AREA_CREATURE_DECAY_MAX_MILLISECONDS =
  AREA_CREATURE_DECAY_MAX_SECONDS * AREA_CREATURE_DECAY_MILLISECONDS_PER_SECOND;

export type AreaCreatureBodyBagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaCreatureDecayTimeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "dword";
      valueMilliseconds: number;
    }>;

export type ExistingAreaCreatureBodyBagMutation = ExistingAreaPlaceableBodyBagMutation;
export type ExistingAreaCreatureBodyBagProvenance = ExistingAreaPlaceableBodyBagProvenance;

export interface ExistingAreaCreatureDecayTimeProvenance {
  readonly expectedMilliseconds: number;
}

export interface ExistingAreaCreatureDecayTimeMutation {
  readonly expectedMilliseconds: number;
  readonly valueMilliseconds: number;
}

export function readAreaCreatureBodyBagStorage(
  input: unknown,
): AreaCreatureBodyBagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    isIntegerBetween(input.value, 0, 0xff)
  ) {
    return Object.freeze({ present: true, nativeType: "byte", value: input.value });
  }
  return null;
}

export function readAreaCreatureDecayTimeStorage(
  input: unknown,
): AreaCreatureDecayTimeStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "valueMilliseconds"]) &&
    input.present === true &&
    input.nativeType === "dword" &&
    isIntegerBetween(input.valueMilliseconds, 0, 0xffff_ffff)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "dword",
      valueMilliseconds: input.valueMilliseconds,
    });
  }
  return null;
}

export function isCanonicalAreaCreatureDecayTimeMilliseconds(
  value: unknown,
): value is number {
  return isIntegerBetween(
    value,
    AREA_CREATURE_DECAY_MIN_MILLISECONDS,
    AREA_CREATURE_DECAY_MAX_MILLISECONDS,
  ) && Number(value) % AREA_CREATURE_DECAY_MILLISECONDS_PER_SECOND === 0;
}

export function readExistingAreaCreatureBodyBagMutation(
  input: unknown,
): ExistingAreaCreatureBodyBagMutation | null {
  return readExistingAreaPlaceableBodyBagMutation(input);
}

export function readExistingAreaCreatureBodyBagProvenance(
  input: unknown,
): ExistingAreaCreatureBodyBagProvenance | null {
  return readExistingAreaPlaceableBodyBagProvenance(input);
}

export function readExistingAreaCreatureDecayTimeProvenance(
  input: unknown,
): ExistingAreaCreatureDecayTimeProvenance | null {
  if (
    !isPlainRecord(input) ||
    !hasExactKeys(input, ["expectedMilliseconds"]) ||
    !isCanonicalAreaCreatureDecayTimeMilliseconds(input.expectedMilliseconds)
  ) {
    return null;
  }
  return Object.freeze({ expectedMilliseconds: input.expectedMilliseconds });
}

export function readExistingAreaCreatureDecayTimeMutation(
  input: unknown,
): ExistingAreaCreatureDecayTimeMutation | null {
  if (
    !isPlainRecord(input) ||
    !hasExactKeys(input, ["expectedMilliseconds", "valueMilliseconds"]) ||
    !isCanonicalAreaCreatureDecayTimeMilliseconds(input.expectedMilliseconds) ||
    !isCanonicalAreaCreatureDecayTimeMilliseconds(input.valueMilliseconds) ||
    input.expectedMilliseconds === input.valueMilliseconds
  ) {
    return null;
  }
  return Object.freeze({
    expectedMilliseconds: input.expectedMilliseconds,
    valueMilliseconds: input.valueMilliseconds,
  });
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

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

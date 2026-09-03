import type {
  SceneObjectCreatureBodyBagProvenance,
  SceneObjectCreatureDecayTimeProvenance,
  SceneObjectSourceMetadata,
  ScenePlaceableBodyBagCatalog,
} from "../contracts";
import { canEditExistingCreatureAdvancedFlag } from "./creatureAdvancedFlags";
import {
  readPlaceableBodyBagBinding,
  readPlaceableBodyBagProvenance,
} from "./placeableBodyBag";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_DECAY_MIN_SECONDS = 5;
export const CREATURE_DECAY_MAX_SECONDS = 0x7fff;
export const CREATURE_DECAY_MILLISECONDS_PER_SECOND = 1000;
export const CREATURE_DECAY_MIN_MILLISECONDS =
  CREATURE_DECAY_MIN_SECONDS * CREATURE_DECAY_MILLISECONDS_PER_SECOND;
export const CREATURE_DECAY_MAX_MILLISECONDS =
  CREATURE_DECAY_MAX_SECONDS * CREATURE_DECAY_MILLISECONDS_PER_SECOND;

export type CreatureBodyBagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type CreatureDecayTimeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "dword";
      valueMilliseconds: number;
    }>;

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

export function readCreatureBodyBagStorage(input: unknown): CreatureBodyBagStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    isIntegerBetween(input.value, 0, 0xff)
  ) {
    return Object.freeze({ present: true, nativeType: "byte", value: input.value });
  }
  return null;
}

export function readCreatureDecayTimeStorage(
  input: unknown,
): CreatureDecayTimeStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "valueMilliseconds"]) &&
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

export function creatureDecayMillisecondsToSeconds(value: unknown): number | undefined {
  if (
    !isIntegerBetween(
      value,
      CREATURE_DECAY_MIN_MILLISECONDS,
      CREATURE_DECAY_MAX_MILLISECONDS,
    ) ||
    Number(value) % CREATURE_DECAY_MILLISECONDS_PER_SECOND !== 0
  ) {
    return undefined;
  }
  return Number(value) / CREATURE_DECAY_MILLISECONDS_PER_SECOND;
}

export function creatureDecaySecondsToMilliseconds(value: unknown): number | undefined {
  if (!isIntegerBetween(value, CREATURE_DECAY_MIN_SECONDS, CREATURE_DECAY_MAX_SECONDS)) {
    return undefined;
  }
  return Number(value) * CREATURE_DECAY_MILLISECONDS_PER_SECOND;
}

export function readCreatureBodyBagBinding(
  storage: unknown,
  catalog: ScenePlaceableBodyBagCatalog | null | undefined,
): SceneObjectCreatureBodyBagProvenance | null {
  return readPlaceableBodyBagBinding(storage, catalog);
}

export function readCreatureBodyBagProvenance(
  input: unknown,
): SceneObjectCreatureBodyBagProvenance | null {
  return readPlaceableBodyBagProvenance(input);
}

export function readCreatureDecayTimeBinding(
  storage: unknown,
): SceneObjectCreatureDecayTimeProvenance | null {
  const exactStorage = readCreatureDecayTimeStorage(storage);
  if (exactStorage?.present !== true ||
    creatureDecayMillisecondsToSeconds(exactStorage.valueMilliseconds) === undefined) {
    return null;
  }
  return Object.freeze({ expectedMilliseconds: exactStorage.valueMilliseconds });
}

export function readCreatureDecayTimeProvenance(
  input: unknown,
): SceneObjectCreatureDecayTimeProvenance | null {
  if (
    !isPlainRecord(input) ||
    !hasExactRecordKeys(input, ["expectedMilliseconds"]) ||
    creatureDecayMillisecondsToSeconds(input.expectedMilliseconds) === undefined
  ) {
    return null;
  }
  return Object.freeze({ expectedMilliseconds: input.expectedMilliseconds as number });
}

function hasExactExistingCreatureIdentity(
  source: SceneObjectSourceMetadata | undefined,
): source is SceneObjectSourceMetadata & { sourceIndex: number } {
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0;
}

export function canEditExistingCreatureBodyBag(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableBodyBagCatalog | null | undefined,
  currentLootable: boolean,
): boolean {
  if (!hasExactExistingCreatureIdentity(source) ||
    !currentLootable ||
    !canEditExistingCreatureAdvancedFlag(source, "lootable")) {
    return false;
  }
  const provenance = readCreatureBodyBagProvenance(source.creatureBodyBag);
  return provenance !== null &&
    catalog !== null &&
    catalog !== undefined &&
    provenance.tableSha256 === catalog.descriptor.sha256 &&
    provenance.tableRowCount === catalog.descriptor.rowCount &&
    catalog.rows[provenance.expectedValue]?.rowIndex === provenance.expectedValue;
}

export function canEditExistingCreatureDecayTime(
  source: SceneObjectSourceMetadata | undefined,
  currentLootable: boolean,
): boolean {
  return hasExactExistingCreatureIdentity(source) &&
    currentLootable &&
    canEditExistingCreatureAdvancedFlag(source, "lootable") &&
    readCreatureDecayTimeProvenance(source.creatureDecayTime) !== null;
}

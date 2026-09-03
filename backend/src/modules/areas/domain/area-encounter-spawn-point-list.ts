export const MAX_AREA_ENCOUNTER_SPAWN_POINT_ENTRIES = 1024;

const SOURCE_ENTRY_KEYS = Object.freeze([
  "sourceIndex",
  "nativeX",
  "nativeY",
  "nativeZ",
  "orientation",
]);
const TARGET_ENTRY_KEYS = Object.freeze([
  "nativeX",
  "nativeY",
  "nativeZ",
  "orientation",
]);

export interface AreaEncounterSpawnPointSourceEntry {
  readonly sourceIndex: number;
  readonly nativeX: number;
  readonly nativeY: number;
  readonly nativeZ: number;
  readonly orientation: number;
}

export interface AreaEncounterSpawnPointTargetEntry {
  readonly nativeX: number;
  readonly nativeY: number;
  readonly nativeZ: number;
  readonly orientation: number;
}

export interface AreaEncounterSpawnPointListProvenance {
  readonly expectedEntries: readonly AreaEncounterSpawnPointSourceEntry[];
}

export interface ExistingAreaEncounterSpawnPointListMutation {
  readonly expectedEntries: readonly AreaEncounterSpawnPointSourceEntry[];
  readonly entries: readonly AreaEncounterSpawnPointTargetEntry[];
}

export class AreaEncounterSpawnPointListValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AreaEncounterSpawnPointListValidationError";
  }
}

export function parseAreaEncounterSpawnPointListProvenance(
  value: unknown,
): AreaEncounterSpawnPointListProvenance {
  if (!isExactRecord(value, ["expectedEntries"])) {
    invalid("Encounter SpawnPointList provenance must contain only expectedEntries.");
  }
  return Object.freeze({ expectedEntries: parseSourceEntries(value.expectedEntries) });
}

export function parseAreaEncounterSpawnPointTargetEntries(
  value: unknown,
): readonly AreaEncounterSpawnPointTargetEntry[] {
  if (!Array.isArray(value) || value.length > MAX_AREA_ENCOUNTER_SPAWN_POINT_ENTRIES) {
    invalid("Encounter SpawnPointList target entry count is invalid.");
  }
  return Object.freeze(value.map((entry, index) => parseTargetEntry(entry, index)));
}

export function projectAreaEncounterSpawnPointSourceEntries(
  entries: readonly AreaEncounterSpawnPointSourceEntry[],
): readonly AreaEncounterSpawnPointTargetEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({
    nativeX: entry.nativeX,
    nativeY: entry.nativeY,
    nativeZ: entry.nativeZ,
    orientation: entry.orientation,
  })));
}

export function projectAreaEncounterSpawnPointListMutation(
  provenanceInput: unknown,
  targetInput: unknown,
): ExistingAreaEncounterSpawnPointListMutation | undefined {
  const provenance = parseAreaEncounterSpawnPointListProvenance(provenanceInput);
  const entries = parseAreaEncounterSpawnPointTargetEntries(targetInput);
  if (areaEncounterSpawnPointTargetEntriesEqual(
    projectAreaEncounterSpawnPointSourceEntries(provenance.expectedEntries),
    entries,
  )) return undefined;
  return Object.freeze({ expectedEntries: provenance.expectedEntries, entries });
}

export function parseAreaEncounterSpawnPointListMutation(
  value: unknown,
): ExistingAreaEncounterSpawnPointListMutation {
  if (!isExactRecord(value, ["expectedEntries", "entries"])) {
    invalid("Encounter SpawnPointList mutation must contain one complete CAS pair.");
  }
  const expectedEntries = parseSourceEntries(value.expectedEntries);
  const entries = parseAreaEncounterSpawnPointTargetEntries(value.entries);
  if (areaEncounterSpawnPointTargetEntriesEqual(
    projectAreaEncounterSpawnPointSourceEntries(expectedEntries),
    entries,
  )) invalid("Encounter SpawnPointList mutation is unchanged.");
  return Object.freeze({ expectedEntries, entries });
}

export function areaEncounterSpawnPointSourceEntriesEqual(
  left: readonly AreaEncounterSpawnPointSourceEntry[],
  right: readonly AreaEncounterSpawnPointSourceEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined
      && entry.sourceIndex === candidate.sourceIndex
      && valuesEqual(entry, candidate);
  });
}

export function areaEncounterSpawnPointTargetEntriesEqual(
  left: readonly AreaEncounterSpawnPointTargetEntry[],
  right: readonly AreaEncounterSpawnPointTargetEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined && valuesEqual(entry, candidate);
  });
}

function parseSourceEntries(value: unknown): readonly AreaEncounterSpawnPointSourceEntry[] {
  if (!Array.isArray(value) || value.length > MAX_AREA_ENCOUNTER_SPAWN_POINT_ENTRIES) {
    invalid("Encounter SpawnPointList source entry count is invalid.");
  }
  return Object.freeze(value.map((entry, sourceIndex) => {
    if (!isExactRecord(entry, SOURCE_ENTRY_KEYS) || entry.sourceIndex !== sourceIndex) {
      invalid(`Encounter SpawnPointList source entry ${sourceIndex} is invalid.`);
    }
    const target = parseCoordinates(entry, sourceIndex);
    return Object.freeze({ sourceIndex, ...target });
  }));
}

function parseTargetEntry(
  value: unknown,
  index: number,
): AreaEncounterSpawnPointTargetEntry {
  if (!isExactRecord(value, TARGET_ENTRY_KEYS)) {
    invalid(`Encounter SpawnPointList target entry ${index} is invalid.`);
  }
  return Object.freeze(parseCoordinates(value, index));
}

function parseCoordinates(
  value: Record<string, unknown>,
  index: number,
): AreaEncounterSpawnPointTargetEntry {
  if (
    !isExactFloat32(value.nativeX)
    || !isExactFloat32(value.nativeY)
    || !isExactFloat32(value.nativeZ)
    || !isExactFloat32(value.orientation)
  ) invalid(`Encounter SpawnPointList entry ${index} contains an invalid native float.`);
  return {
    nativeX: Number(value.nativeX),
    nativeY: Number(value.nativeY),
    nativeZ: Number(value.nativeZ),
    orientation: Number(value.orientation),
  };
}

function valuesEqual(
  left: AreaEncounterSpawnPointTargetEntry,
  right: AreaEncounterSpawnPointTargetEntry,
): boolean {
  return Object.is(left.nativeX, right.nativeX)
    && Object.is(left.nativeY, right.nativeY)
    && Object.is(left.nativeZ, right.nativeZ)
    && Object.is(left.orientation, right.orientation);
}

function isExactFloat32(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Object.is(Math.fround(value), value);
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function invalid(message: string): never {
  throw new AreaEncounterSpawnPointListValidationError(message);
}

import type {
  SceneObjectEncounterSpawnPointListProvenance,
  SceneObjectEncounterSpawnPointSourceEntry,
  SceneObjectEncounterSpawnPointTargetEntry,
} from "../contracts";

export const MAX_ENCOUNTER_SPAWN_POINT_ENTRIES = 1024;

const SOURCE_KEYS = Object.freeze([
  "sourceIndex",
  "nativeX",
  "nativeY",
  "nativeZ",
  "orientation",
]);
const TARGET_KEYS = Object.freeze([
  "nativeX",
  "nativeY",
  "nativeZ",
  "orientation",
]);

export function readEncounterSpawnPointListProvenance(
  value: unknown,
): SceneObjectEncounterSpawnPointListProvenance | null {
  if (!isExactRecord(value, ["expectedEntries"]) || !Array.isArray(value.expectedEntries)) {
    return null;
  }
  if (value.expectedEntries.length > MAX_ENCOUNTER_SPAWN_POINT_ENTRIES) return null;
  const expectedEntries: SceneObjectEncounterSpawnPointSourceEntry[] = [];
  for (let sourceIndex = 0; sourceIndex < value.expectedEntries.length; sourceIndex += 1) {
    const candidate = value.expectedEntries[sourceIndex];
    if (
      !isExactRecord(candidate, SOURCE_KEYS)
      || candidate.sourceIndex !== sourceIndex
      || !hasExactCoordinates(candidate)
    ) return null;
    expectedEntries.push(Object.freeze({
      sourceIndex,
      nativeX: Number(candidate.nativeX),
      nativeY: Number(candidate.nativeY),
      nativeZ: Number(candidate.nativeZ),
      orientation: Number(candidate.orientation),
    }));
  }
  return Object.freeze({ expectedEntries: Object.freeze(expectedEntries) });
}

export function readEncounterSpawnPointTargetEntries(
  value: unknown,
): readonly SceneObjectEncounterSpawnPointTargetEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_ENCOUNTER_SPAWN_POINT_ENTRIES) return null;
  const entries: SceneObjectEncounterSpawnPointTargetEntry[] = [];
  for (const candidate of value) {
    if (!isExactRecord(candidate, TARGET_KEYS) || !hasExactCoordinates(candidate)) return null;
    entries.push(Object.freeze({
      nativeX: Number(candidate.nativeX),
      nativeY: Number(candidate.nativeY),
      nativeZ: Number(candidate.nativeZ),
      orientation: Number(candidate.orientation),
    }));
  }
  return Object.freeze(entries);
}

export function sourceEncounterSpawnPointsToTarget(
  source: readonly SceneObjectEncounterSpawnPointSourceEntry[],
): readonly SceneObjectEncounterSpawnPointTargetEntry[] {
  return Object.freeze(source.map((entry) => Object.freeze({
    nativeX: entry.nativeX,
    nativeY: entry.nativeY,
    nativeZ: entry.nativeZ,
    orientation: entry.orientation,
  })));
}

export function encounterSpawnPointTargetEntriesEqual(
  left: unknown,
  right: readonly SceneObjectEncounterSpawnPointTargetEntry[],
): boolean {
  const admitted = readEncounterSpawnPointTargetEntries(left);
  return admitted !== null
    && admitted.length === right.length
    && admitted.every((entry, index) => {
      const candidate = right[index];
      return candidate !== undefined
        && Object.is(entry.nativeX, candidate.nativeX)
        && Object.is(entry.nativeY, candidate.nativeY)
        && Object.is(entry.nativeZ, candidate.nativeZ)
        && Object.is(entry.orientation, candidate.orientation);
    });
}

function hasExactCoordinates(value: Record<string, unknown>): boolean {
  return isExactFloat32(value.nativeX)
    && isExactFloat32(value.nativeY)
    && isExactFloat32(value.nativeZ)
    && isExactFloat32(value.orientation);
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

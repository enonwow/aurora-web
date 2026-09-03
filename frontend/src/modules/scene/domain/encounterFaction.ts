import type {
  SceneObjectEncounterFactionProvenance,
  SceneObjectSourceMetadata,
  ScenePlaceableFactionCatalog,
} from "../contracts";
import { readPlaceableFactionCatalog } from "./placeableFaction";

const MAX_FACTIONS = 1024;

export function readEncounterFactionProvenance(
  value: unknown,
): SceneObjectEncounterFactionProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedValue", "catalogSha256", "catalogFactionCount",
  ]) || !isIntegerBetween(value.catalogFactionCount, 2, MAX_FACTIONS)
    || !isIntegerBetween(value.expectedValue, 1, Number(value.catalogFactionCount) - 1)
    || typeof value.catalogSha256 !== "string"
    || !/^[a-f0-9]{64}$/u.test(value.catalogSha256)) return null;
  return Object.freeze({
    expectedValue: Number(value.expectedValue),
    catalogSha256: value.catalogSha256,
    catalogFactionCount: Number(value.catalogFactionCount),
  });
}

export function readEncounterFactionBinding(
  storage: unknown,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): SceneObjectEncounterFactionProvenance | null {
  const exactCatalog = readPlaceableFactionCatalog(catalog);
  if (!exactCatalog || exactCatalog.descriptor.factionCount < 2
    || !isRecord(storage)
    || !hasExactKeys(storage, ["present", "nativeType", "value"])
    || storage.present !== true
    || storage.nativeType !== "dword"
    || !isIntegerBetween(storage.value, 1, exactCatalog.descriptor.factionCount - 1)
    || !exactCatalog.rows.some((row) => row.factionId === storage.value)) return null;
  return readEncounterFactionProvenance({
    expectedValue: storage.value,
    catalogSha256: exactCatalog.descriptor.sha256,
    catalogFactionCount: exactCatalog.descriptor.factionCount,
  });
}

export function readEncounterFactionCatalogBinding(
  source: SceneObjectSourceMetadata | undefined,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): Readonly<{
  provenance: SceneObjectEncounterFactionProvenance;
  catalog: ScenePlaceableFactionCatalog;
}> | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "encounter"
    || !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) {
    return null;
  }
  const provenance = readEncounterFactionProvenance(source.encounterFaction);
  const exactCatalog = readPlaceableFactionCatalog(catalog);
  if (!provenance || !exactCatalog
    || exactCatalog.descriptor.sha256 !== provenance.catalogSha256
    || exactCatalog.descriptor.factionCount !== provenance.catalogFactionCount
    || !exactCatalog.rows.some((row) => row.factionId === provenance.expectedValue)) {
    return null;
  }
  return Object.freeze({ provenance, catalog: exactCatalog });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

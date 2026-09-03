import type {
  SceneObjectPlaceableFactionProvenance,
  ScenePlaceableFactionCatalog,
  ScenePlaceableFactionRow,
} from "../contracts";

const MAX_FACTIONS = 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isFactionName(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 256 &&
    !value.includes("\0");
}

export function readPlaceableFactionCatalog(value: unknown): ScenePlaceableFactionCatalog | null {
  if (!isRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isRecord(value.descriptor) || !Array.isArray(value.rows)) return null;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sha256", "sizeBytes", "factionCount",
  ]) || descriptor.resourceName !== "repute.fac" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > 2048 ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !isIntegerBetween(descriptor.sizeBytes, 1, 16 * 1024 * 1024) ||
    !isIntegerBetween(descriptor.factionCount, 1, MAX_FACTIONS) ||
    value.rows.length !== descriptor.factionCount) return null;

  const rows: ScenePlaceableFactionRow[] = [];
  for (let factionId = 0; factionId < value.rows.length; factionId += 1) {
    const candidate = value.rows[factionId];
    if (!isRecord(candidate) || !hasExactKeys(candidate, [
      "factionId", "name", "parentFactionId", "isGlobal",
    ]) || candidate.factionId !== factionId || !isFactionName(candidate.name) ||
      !(candidate.parentFactionId === 0xffffffff ||
        isIntegerBetween(candidate.parentFactionId, 0, descriptor.factionCount - 1)) ||
      typeof candidate.isGlobal !== "boolean") return null;
    rows.push(Object.freeze({
      factionId,
      name: candidate.name,
      parentFactionId: candidate.parentFactionId,
      isGlobal: candidate.isGlobal,
    }));
  }
  return Object.freeze({
    descriptor: Object.freeze({
      resourceName: "repute.fac",
      sourceObjectKey: descriptor.sourceObjectKey,
      sha256: descriptor.sha256,
      sizeBytes: descriptor.sizeBytes,
      factionCount: descriptor.factionCount,
    }),
    rows: Object.freeze(rows),
  });
}

export function readPlaceableFactionProvenance(
  value: unknown,
): SceneObjectPlaceableFactionProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedValue", "catalogSha256", "catalogFactionCount",
  ]) || !isIntegerBetween(value.catalogFactionCount, 1, MAX_FACTIONS) ||
    !isIntegerBetween(value.expectedValue, 0, value.catalogFactionCount - 1) ||
    typeof value.catalogSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.catalogSha256)) return null;
  return Object.freeze({
    expectedValue: value.expectedValue,
    catalogSha256: value.catalogSha256,
    catalogFactionCount: value.catalogFactionCount,
  });
}

export function readPlaceableFactionBinding(
  storage: unknown,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): SceneObjectPlaceableFactionProvenance | null {
  if (!catalog || !isRecord(storage) ||
    !hasExactKeys(storage, ["present", "nativeType", "value"]) ||
    storage.present !== true || storage.nativeType !== "dword" ||
    !isIntegerBetween(storage.value, 0, catalog.descriptor.factionCount - 1) ||
    !catalog.rows.some((row) => row.factionId === storage.value)) return null;
  return readPlaceableFactionProvenance({
    expectedValue: storage.value,
    catalogSha256: catalog.descriptor.sha256,
    catalogFactionCount: catalog.descriptor.factionCount,
  });
}

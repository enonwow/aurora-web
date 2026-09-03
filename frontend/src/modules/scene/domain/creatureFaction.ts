import type {
  SceneObjectCreatureFactionProvenance,
  ScenePlaceableFactionCatalog,
} from "../contracts";
import { readPlaceableFactionProvenance } from "./placeableFaction";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function readCreatureFactionProvenance(
  value: unknown,
): SceneObjectCreatureFactionProvenance | null {
  return readPlaceableFactionProvenance(value);
}

export function readCreatureFactionBinding(
  storage: unknown,
  catalog: ScenePlaceableFactionCatalog | null | undefined,
): SceneObjectCreatureFactionProvenance | null {
  if (!catalog || !isRecord(storage) ||
    !hasExactKeys(storage, ["present", "nativeType", "value"]) ||
    storage.present !== true || storage.nativeType !== "word" ||
    !Number.isSafeInteger(storage.value) || Number(storage.value) < 0 ||
    Number(storage.value) > 0xffff ||
    Number(storage.value) >= catalog.descriptor.factionCount ||
    !catalog.rows.some((row) => row.factionId === storage.value)) return null;
  return readCreatureFactionProvenance({
    expectedValue: storage.value,
    catalogSha256: catalog.descriptor.sha256,
    catalogFactionCount: catalog.descriptor.factionCount,
  });
}

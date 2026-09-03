import { AREA_ITEM_CONSTRUCTION_PROFILE } from "./area-item-construction-profile";

export const MAX_AREA_PLACEABLE_INVENTORY_ENTRIES_PER_MUTATION = 1024;

export interface AreaPlaceableInventorySourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
}

export interface AreaPlaceableInventoryBlueprintEntry {
  readonly resRef: string;
  readonly itemResRef: string;
  readonly itemSourceObjectKey: string;
  readonly itemSourceFingerprint: string;
  readonly x: number;
  readonly y: number;
}

export type AreaPlaceableInventoryTargetEntry =
  | AreaPlaceableInventorySourceEntry
  | AreaPlaceableInventoryBlueprintEntry;

export interface AreaPlaceableInventoryMutation {
  readonly expectedEntries: readonly AreaPlaceableInventorySourceEntry[];
  readonly entries: readonly AreaPlaceableInventoryTargetEntry[];
}

export class AreaPlaceableInventoryValidationError extends Error {
  constructor(message: string, readonly path: string) {
    super(message);
    this.name = "AreaPlaceableInventoryValidationError";
  }
}

export function parseAreaPlaceableInventorySourceEntries(
  input: unknown,
  path: string,
): readonly AreaPlaceableInventorySourceEntry[] {
  if (!Array.isArray(input)) {
    fail("Expected a Placeable inventory source array.", path);
  }
  if (input.length > MAX_AREA_PLACEABLE_INVENTORY_ENTRIES_PER_MUTATION) {
    fail("Placeable inventory exceeds the bounded entry budget.", path);
  }
  const entries = input.map((rawEntry, index) => {
    const entryPath = `${path}.${index}`;
    const entry = exactRecord(
      rawEntry,
      ["sourceIndex", "resRef", "x", "y"],
      entryPath,
    );
    const sourceIndex = safeInteger(entry.sourceIndex, 0, Number.MAX_SAFE_INTEGER, `${entryPath}.sourceIndex`);
    if (sourceIndex !== index) {
      fail("Placeable inventory source indices must be zero-based native ordinals.", `${entryPath}.sourceIndex`);
    }
    return Object.freeze({
      sourceIndex,
      resRef: inventoryResRef(entry.resRef, `${entryPath}.resRef`),
      x: repositoryCoordinate(entry.x, `${entryPath}.x`),
      y: repositoryCoordinate(entry.y, `${entryPath}.y`),
    });
  });
  return Object.freeze(entries);
}

export function parseAreaPlaceableInventoryTargetEntries(
  input: unknown,
  sourceEntries: readonly AreaPlaceableInventorySourceEntry[],
  path: string,
): readonly AreaPlaceableInventoryTargetEntry[] {
  if (!Array.isArray(input)) {
    fail("Expected a Placeable inventory target array.", path);
  }
  if (input.length > MAX_AREA_PLACEABLE_INVENTORY_ENTRIES_PER_MUTATION) {
    fail("Placeable inventory exceeds the bounded entry budget.", path);
  }
  const usedSourceIndices = new Set<number>();
  const entries = input.map((rawEntry, index) => {
    const entryPath = `${path}.${index}`;
    const probe = objectRecord(rawEntry, entryPath);
    if (Object.prototype.hasOwnProperty.call(probe, "sourceIndex")) {
      const entry = exactRecord(
        probe,
        ["sourceIndex", "resRef", "x", "y"],
        entryPath,
      );
      const sourceIndex = safeInteger(
        entry.sourceIndex,
        0,
        Number.MAX_SAFE_INTEGER,
        `${entryPath}.sourceIndex`,
      );
      if (usedSourceIndices.has(sourceIndex)) {
        fail("A retained Placeable inventory source ordinal may be used only once.", `${entryPath}.sourceIndex`);
      }
      usedSourceIndices.add(sourceIndex);
      const sourceEntry = sourceEntries[sourceIndex];
      if (!sourceEntry) {
        fail("The retained Placeable inventory source ordinal does not exist.", `${entryPath}.sourceIndex`);
      }
      const resRef = inventoryResRef(entry.resRef, `${entryPath}.resRef`);
      if (resRef !== sourceEntry.resRef) {
        fail("A retained Placeable inventory item identity cannot change.", `${entryPath}.resRef`);
      }
      return Object.freeze({
        sourceIndex,
        resRef,
        x: repositoryCoordinate(entry.x, `${entryPath}.x`),
        y: repositoryCoordinate(entry.y, `${entryPath}.y`),
      });
    }

    const entry = exactRecord(
      probe,
      [
        "resRef",
        "itemResRef",
        "itemSourceObjectKey",
        "itemSourceFingerprint",
        "x",
        "y",
      ],
      entryPath,
    );
    const resRef = inventoryResRef(entry.resRef, `${entryPath}.resRef`);
    const itemResRef = inventoryResRef(entry.itemResRef, `${entryPath}.itemResRef`);
    if (resRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef) {
      fail("The Placeable inventory item ResRef is not admitted.", `${entryPath}.resRef`);
    }
    if (itemResRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef || itemResRef !== resRef) {
      fail("The Placeable inventory blueprint identity is not admitted.", `${entryPath}.itemResRef`);
    }
    if (entry.itemSourceObjectKey !== AREA_ITEM_CONSTRUCTION_PROFILE.id) {
      fail("The Placeable inventory blueprint profile is not admitted.", `${entryPath}.itemSourceObjectKey`);
    }
    if (entry.itemSourceFingerprint !== AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256) {
      fail("The Placeable inventory blueprint fingerprint is not admitted.", `${entryPath}.itemSourceFingerprint`);
    }
    return Object.freeze({
      resRef,
      itemResRef,
      itemSourceObjectKey: AREA_ITEM_CONSTRUCTION_PROFILE.id,
      itemSourceFingerprint: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
      x: repositoryCoordinate(entry.x, `${entryPath}.x`),
      y: repositoryCoordinate(entry.y, `${entryPath}.y`),
    });
  });
  return Object.freeze(entries);
}

export function parseAreaPlaceableInventoryMutation(
  input: unknown,
  path: string,
): AreaPlaceableInventoryMutation {
  const pair = exactRecord(input, ["expectedEntries", "entries"], path);
  const expectedEntries = parseAreaPlaceableInventorySourceEntries(
    pair.expectedEntries,
    `${path}.expectedEntries`,
  );
  const entries = parseAreaPlaceableInventoryTargetEntries(
    pair.entries,
    expectedEntries,
    `${path}.entries`,
  );
  return Object.freeze({ expectedEntries, entries });
}

export function areaPlaceableInventoryEntriesEqual(
  left: readonly AreaPlaceableInventoryTargetEntry[],
  right: readonly AreaPlaceableInventoryTargetEntry[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const candidate = right[index];
    if (!candidate) return false;
    const entrySourceIndex = "sourceIndex" in entry ? entry.sourceIndex : undefined;
    const candidateSourceIndex = "sourceIndex" in candidate ? candidate.sourceIndex : undefined;
    const entryBlueprint = "itemSourceObjectKey" in entry
      ? `${entry.itemResRef}\0${entry.itemSourceObjectKey}\0${entry.itemSourceFingerprint}`
      : undefined;
    const candidateBlueprint = "itemSourceObjectKey" in candidate
      ? `${candidate.itemResRef}\0${candidate.itemSourceObjectKey}\0${candidate.itemSourceFingerprint}`
      : undefined;
    return entrySourceIndex === candidateSourceIndex &&
      entryBlueprint === candidateBlueprint &&
      entry.resRef === candidate.resRef &&
      entry.x === candidate.x &&
      entry.y === candidate.y;
  });
}

function exactRecord(
  input: unknown,
  keys: readonly string[],
  path: string,
): Readonly<Record<string, unknown>> {
  const value = objectRecord(input, path);
  const allowed = new Set(keys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    fail(`Unexpected Placeable inventory field '${unexpected}'.`, `${path}.${unexpected}`);
  }
  const missing = keys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing !== undefined) {
    fail(`Missing Placeable inventory field '${missing}'.`, `${path}.${missing}`);
  }
  return value;
}

function objectRecord(input: unknown, path: string): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("Expected a Placeable inventory object.", path);
  }
  return input as Readonly<Record<string, unknown>>;
}

function inventoryResRef(input: unknown, path: string): string {
  if (typeof input !== "string" || !/^[A-Za-z0-9_]{1,16}$/u.test(input)) {
    fail("Expected a non-empty 1..16 character Aurora inventory ResRef.", path);
  }
  return input;
}

function repositoryCoordinate(input: unknown, path: string): number {
  return safeInteger(input, 0, 0xffff, path);
}

function safeInteger(input: unknown, min: number, max: number, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) < min || Number(input) > max) {
    fail(`Expected a safe integer in ${min}..${max}.`, path);
  }
  return Number(input);
}

function fail(message: string, path: string): never {
  throw new AreaPlaceableInventoryValidationError(message, path);
}

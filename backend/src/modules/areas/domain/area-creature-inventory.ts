import { AREA_ITEM_CONSTRUCTION_PROFILE } from "./area-item-construction-profile";

export const MAX_AREA_CREATURE_INVENTORY_ENTRIES_PER_MUTATION = 1024;

export interface AreaCreatureInventorySourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
  readonly dropable: boolean;
  readonly pickpocketable: boolean;
}

export interface AreaCreatureInventoryBlueprintEntry {
  readonly resRef: string;
  readonly itemResRef: string;
  readonly itemSourceObjectKey: string;
  readonly itemSourceFingerprint: string;
  readonly x: number;
  readonly y: number;
  readonly dropable: boolean;
  readonly pickpocketable: boolean;
}

export type AreaCreatureInventoryTargetEntry =
  | AreaCreatureInventorySourceEntry
  | AreaCreatureInventoryBlueprintEntry;

export interface AreaCreatureInventoryMutation {
  readonly expectedEntries: readonly AreaCreatureInventorySourceEntry[];
  readonly entries: readonly AreaCreatureInventoryTargetEntry[];
}

export class AreaCreatureInventoryValidationError extends Error {
  constructor(message: string, readonly path: string) {
    super(message);
    this.name = "AreaCreatureInventoryValidationError";
  }
}

export function parseAreaCreatureInventorySourceEntries(
  input: unknown,
  path: string,
): readonly AreaCreatureInventorySourceEntry[] {
  if (!Array.isArray(input)) {
    fail("Expected a Creature inventory source array.", path);
  }
  enforceBudget(input, path);
  return Object.freeze(input.map((rawEntry, index) => {
    const entryPath = `${path}.${index}`;
    const entry = exactRecord(
      rawEntry,
      ["sourceIndex", "resRef", "x", "y", "dropable", "pickpocketable"],
      entryPath,
    );
    const sourceIndex = safeInteger(
      entry.sourceIndex,
      0,
      Number.MAX_SAFE_INTEGER,
      `${entryPath}.sourceIndex`,
    );
    if (sourceIndex !== index) {
      fail(
        "Creature inventory source indices must be zero-based native ordinals.",
        `${entryPath}.sourceIndex`,
      );
    }
    return Object.freeze({
      sourceIndex,
      resRef: inventoryResRef(entry.resRef, `${entryPath}.resRef`),
      x: repositoryCoordinate(entry.x, `${entryPath}.x`),
      y: repositoryCoordinate(entry.y, `${entryPath}.y`),
      dropable: booleanFlag(entry.dropable, `${entryPath}.dropable`),
      pickpocketable: booleanFlag(
        entry.pickpocketable,
        `${entryPath}.pickpocketable`,
      ),
    });
  }));
}

export function parseAreaCreatureInventoryTargetEntries(
  input: unknown,
  sourceEntries: readonly AreaCreatureInventorySourceEntry[],
  path: string,
): readonly AreaCreatureInventoryTargetEntry[] {
  if (!Array.isArray(input)) {
    fail("Expected a Creature inventory target array.", path);
  }
  enforceBudget(input, path);
  const usedSourceIndices = new Set<number>();
  return Object.freeze(input.map((rawEntry, index) => {
    const entryPath = `${path}.${index}`;
    const probe = objectRecord(rawEntry, entryPath);
    if (Object.prototype.hasOwnProperty.call(probe, "sourceIndex")) {
      const entry = exactRecord(
        probe,
        ["sourceIndex", "resRef", "x", "y", "dropable", "pickpocketable"],
        entryPath,
      );
      const sourceIndex = safeInteger(
        entry.sourceIndex,
        0,
        Number.MAX_SAFE_INTEGER,
        `${entryPath}.sourceIndex`,
      );
      if (usedSourceIndices.has(sourceIndex)) {
        fail(
          "A retained Creature inventory source ordinal may be used only once.",
          `${entryPath}.sourceIndex`,
        );
      }
      usedSourceIndices.add(sourceIndex);
      const sourceEntry = sourceEntries[sourceIndex];
      if (!sourceEntry) {
        fail(
          "The retained Creature inventory source ordinal does not exist.",
          `${entryPath}.sourceIndex`,
        );
      }
      const resRef = inventoryResRef(entry.resRef, `${entryPath}.resRef`);
      if (resRef !== sourceEntry.resRef) {
        fail(
          "A retained Creature inventory item identity cannot change.",
          `${entryPath}.resRef`,
        );
      }
      return Object.freeze({
        sourceIndex,
        resRef,
        x: repositoryCoordinate(entry.x, `${entryPath}.x`),
        y: repositoryCoordinate(entry.y, `${entryPath}.y`),
        dropable: booleanFlag(entry.dropable, `${entryPath}.dropable`),
        pickpocketable: booleanFlag(
          entry.pickpocketable,
          `${entryPath}.pickpocketable`,
        ),
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
        "dropable",
        "pickpocketable",
      ],
      entryPath,
    );
    const resRef = inventoryResRef(entry.resRef, `${entryPath}.resRef`);
    const itemResRef = inventoryResRef(entry.itemResRef, `${entryPath}.itemResRef`);
    if (resRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef) {
      fail("The Creature inventory item ResRef is not admitted.", `${entryPath}.resRef`);
    }
    if (itemResRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef || itemResRef !== resRef) {
      fail(
        "The Creature inventory blueprint identity is not admitted.",
        `${entryPath}.itemResRef`,
      );
    }
    if (entry.itemSourceObjectKey !== AREA_ITEM_CONSTRUCTION_PROFILE.id) {
      fail(
        "The Creature inventory blueprint profile is not admitted.",
        `${entryPath}.itemSourceObjectKey`,
      );
    }
    if (entry.itemSourceFingerprint !== AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256) {
      fail(
        "The Creature inventory blueprint fingerprint is not admitted.",
        `${entryPath}.itemSourceFingerprint`,
      );
    }
    return Object.freeze({
      resRef,
      itemResRef,
      itemSourceObjectKey: AREA_ITEM_CONSTRUCTION_PROFILE.id,
      itemSourceFingerprint: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
      x: repositoryCoordinate(entry.x, `${entryPath}.x`),
      y: repositoryCoordinate(entry.y, `${entryPath}.y`),
      dropable: booleanFlag(entry.dropable, `${entryPath}.dropable`),
      pickpocketable: booleanFlag(
        entry.pickpocketable,
        `${entryPath}.pickpocketable`,
      ),
    });
  }));
}

export function parseAreaCreatureInventoryMutation(
  input: unknown,
  path: string,
): AreaCreatureInventoryMutation {
  const pair = exactRecord(input, ["expectedEntries", "entries"], path);
  const expectedEntries = parseAreaCreatureInventorySourceEntries(
    pair.expectedEntries,
    `${path}.expectedEntries`,
  );
  const entries = parseAreaCreatureInventoryTargetEntries(
    pair.entries,
    expectedEntries,
    `${path}.entries`,
  );
  return Object.freeze({ expectedEntries, entries });
}

export function areaCreatureInventoryEntriesEqual(
  left: readonly AreaCreatureInventoryTargetEntry[],
  right: readonly AreaCreatureInventoryTargetEntry[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const candidate = right[index];
    if (!candidate) return false;
    const entrySourceIndex = "sourceIndex" in entry ? entry.sourceIndex : undefined;
    const candidateSourceIndex = "sourceIndex" in candidate
      ? candidate.sourceIndex
      : undefined;
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
      entry.y === candidate.y &&
      entry.dropable === candidate.dropable &&
      entry.pickpocketable === candidate.pickpocketable;
  });
}

function enforceBudget(input: readonly unknown[], path: string): void {
  if (input.length > MAX_AREA_CREATURE_INVENTORY_ENTRIES_PER_MUTATION) {
    fail("Creature inventory exceeds the bounded entry budget.", path);
  }
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
    fail(`Unexpected Creature inventory field '${unexpected}'.`, `${path}.${unexpected}`);
  }
  const missing = keys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing !== undefined) {
    fail(`Missing Creature inventory field '${missing}'.`, `${path}.${missing}`);
  }
  return value;
}

function objectRecord(input: unknown, path: string): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("Expected a Creature inventory object.", path);
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

function booleanFlag(input: unknown, path: string): boolean {
  if (typeof input !== "boolean") {
    fail("Expected a Creature inventory mode-0 boolean flag.", path);
  }
  return input;
}

function safeInteger(input: unknown, min: number, max: number, path: string): number {
  if (!Number.isSafeInteger(input) || Number(input) < min || Number(input) > max) {
    fail(`Expected a safe integer in ${min}..${max}.`, path);
  }
  return Number(input);
}

function fail(message: string, path: string): never {
  throw new AreaCreatureInventoryValidationError(message, path);
}

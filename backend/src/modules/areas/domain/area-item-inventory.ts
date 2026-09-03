import { AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE } from "./area-item-construction-profile";

export const MAX_AREA_ITEM_INVENTORY_ENTRIES_PER_MUTATION = 1024;

export interface AreaItemInventorySourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
}

export interface AreaItemInventoryBlueprintEntry {
  readonly resRef: string;
  readonly itemTemplateId: string;
  readonly itemResRef: string;
  readonly itemSourceProfileId: string;
  readonly itemSourceObjectKey: string;
  readonly itemSourceSizeBytes: number;
  readonly itemSourceFingerprint: string;
  readonly itemTag: string;
  readonly x: number;
  readonly y: number;
}

export type AreaItemInventoryTargetEntry =
  | AreaItemInventorySourceEntry
  | AreaItemInventoryBlueprintEntry;

export interface AreaItemInventoryMutation {
  readonly expectedEntries: readonly AreaItemInventorySourceEntry[];
  readonly entries: readonly AreaItemInventoryTargetEntry[];
}

export class AreaItemInventoryValidationError extends Error {
  constructor(message: string, readonly path: string) {
    super(message);
    this.name = "AreaItemInventoryValidationError";
  }
}

export function parseAreaItemInventorySourceEntries(
  input: unknown,
  path: string,
): readonly AreaItemInventorySourceEntry[] {
  const entries = inventoryArray(input, path);
  return Object.freeze(entries.map((rawEntry, sourceIndex) => {
    const entryPath = `${path}.${sourceIndex}`;
    const entry = exactRetainedEntry(rawEntry, entryPath);
    const parsedSourceIndex = safeInteger(
      entry.sourceIndex,
      0,
      Number.MAX_SAFE_INTEGER,
      `${entryPath}.sourceIndex`,
    );
    if (parsedSourceIndex !== sourceIndex) {
      fail(
        "Item inventory source indices must be zero-based physical ordinals.",
        `${entryPath}.sourceIndex`,
      );
    }
    return Object.freeze({
      sourceIndex: parsedSourceIndex,
      resRef: itemResRef(entry.resRef, `${entryPath}.resRef`),
      x: repositoryCoordinate(entry.x, `${entryPath}.x`),
      y: repositoryCoordinate(entry.y, `${entryPath}.y`),
    });
  }));
}

export function parseAreaItemInventoryTargetEntries(
  input: unknown,
  sourceEntries: readonly AreaItemInventorySourceEntry[],
  path: string,
): readonly AreaItemInventoryTargetEntry[] {
  const exactSource = parseAreaItemInventorySourceEntries(
    sourceEntries,
    `${path}.source`,
  );
  const entries = inventoryArray(input, path);
  const usedSourceIndices = new Set<number>();
  return Object.freeze(entries.map((rawEntry, targetIndex) => {
    const entryPath = `${path}.${targetIndex}`;
    const entryRecord = inventoryRecord(rawEntry, entryPath);
    if (!Object.prototype.hasOwnProperty.call(entryRecord, "sourceIndex")) {
      return parseBlueprintEntry(entryRecord, entryPath);
    }
    const entry = exactRetainedEntry(entryRecord, entryPath);
    const sourceIndex = safeInteger(
      entry.sourceIndex,
      0,
      Number.MAX_SAFE_INTEGER,
      `${entryPath}.sourceIndex`,
    );
    if (usedSourceIndices.has(sourceIndex)) {
      fail(
        "A retained Item inventory source ordinal may be used only once.",
        `${entryPath}.sourceIndex`,
      );
    }
    const source = exactSource[sourceIndex];
    if (!source) {
      fail(
        "The retained Item inventory source ordinal does not exist.",
        `${entryPath}.sourceIndex`,
      );
    }
    const resRef = itemResRef(entry.resRef, `${entryPath}.resRef`);
    if (resRef !== source.resRef) {
      fail(
        "A retained Item inventory identity cannot change.",
        `${entryPath}.resRef`,
      );
    }
    usedSourceIndices.add(sourceIndex);
    return Object.freeze({
      sourceIndex,
      resRef,
      x: repositoryCoordinate(entry.x, `${entryPath}.x`),
      y: repositoryCoordinate(entry.y, `${entryPath}.y`),
    });
  }));
}

export function parseAreaItemInventoryMutation(
  input: unknown,
  path: string,
): AreaItemInventoryMutation {
  const pair = exactRecord(input, ["expectedEntries", "entries"], path);
  const expectedEntries = parseAreaItemInventorySourceEntries(
    pair.expectedEntries,
    `${path}.expectedEntries`,
  );
  const entries = parseAreaItemInventoryTargetEntries(
    pair.entries,
    expectedEntries,
    `${path}.entries`,
  );
  return Object.freeze({ expectedEntries, entries });
}

export function areaItemInventoryEntriesEqual(
  left: readonly AreaItemInventoryTargetEntry[],
  right: readonly AreaItemInventoryTargetEntry[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const candidate = right[index];
    if (!candidate || ("sourceIndex" in entry) !== ("sourceIndex" in candidate)) {
      return false;
    }
    if ("sourceIndex" in entry && "sourceIndex" in candidate) {
      return entry.sourceIndex === candidate.sourceIndex
        && entry.resRef === candidate.resRef
        && entry.x === candidate.x
        && entry.y === candidate.y;
    }
    if ("sourceIndex" in entry || "sourceIndex" in candidate) return false;
    return entry.resRef === candidate.resRef
      && entry.itemTemplateId === candidate.itemTemplateId
      && entry.itemResRef === candidate.itemResRef
      && entry.itemSourceProfileId === candidate.itemSourceProfileId
      && entry.itemSourceObjectKey === candidate.itemSourceObjectKey
      && entry.itemSourceSizeBytes === candidate.itemSourceSizeBytes
      && entry.itemSourceFingerprint === candidate.itemSourceFingerprint
      && entry.itemTag === candidate.itemTag
      && entry.x === candidate.x
      && entry.y === candidate.y;
  });
}

function inventoryArray(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) {
    fail("Expected an Item inventory array.", path);
  }
  if (input.length > MAX_AREA_ITEM_INVENTORY_ENTRIES_PER_MUTATION) {
    fail("Item inventory exceeds the 1024-entry budget.", path);
  }
  return input;
}

function exactRetainedEntry(
  input: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  return exactRecord(input, ["sourceIndex", "resRef", "x", "y"], path);
}

function parseBlueprintEntry(
  input: unknown,
  path: string,
): AreaItemInventoryBlueprintEntry {
  const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
  const entry = exactRecord(input, [
    "resRef",
    "itemTemplateId",
    "itemResRef",
    "itemSourceProfileId",
    "itemSourceObjectKey",
    "itemSourceSizeBytes",
    "itemSourceFingerprint",
    "itemTag",
    "x",
    "y",
  ], path);
  const resRef = canonicalBlueprintResRef(entry.resRef, `${path}.resRef`);
  const itemResRef = canonicalBlueprintResRef(entry.itemResRef, `${path}.itemResRef`);
  if (resRef !== itemResRef) {
    fail("A dynamic Item inventory ResRef must match its immutable UTI ResRef.", `${path}.itemResRef`);
  }
  const itemTemplateId = boundedString(
    entry.itemTemplateId,
    /^[A-Za-z0-9_-]{1,80}$/u,
    `${path}.itemTemplateId`,
    "Expected a canonical Item catalog template ID.",
  );
  if (entry.itemSourceProfileId !== profile.id) {
    fail("Expected the effective-catalog dynamic Item profile.", `${path}.itemSourceProfileId`);
  }
  const itemSourceObjectKey = boundedText(
    entry.itemSourceObjectKey,
    1,
    profile.maxSourceObjectKeyCodeUnits,
    `${path}.itemSourceObjectKey`,
    true,
  );
  const itemSourceSizeBytes = safeInteger(
    entry.itemSourceSizeBytes,
    1,
    profile.maxSourceBytes,
    `${path}.itemSourceSizeBytes`,
  );
  const itemSourceFingerprint = boundedString(
    entry.itemSourceFingerprint,
    /^[a-f0-9]{64}$/u,
    `${path}.itemSourceFingerprint`,
    "Expected a lowercase SHA-256 Item source fingerprint.",
  );
  const itemTag = boundedText(entry.itemTag, 1, 256, `${path}.itemTag`, false);
  return Object.freeze({
    resRef,
    itemTemplateId,
    itemResRef,
    itemSourceProfileId: profile.id,
    itemSourceObjectKey,
    itemSourceSizeBytes,
    itemSourceFingerprint,
    itemTag,
    x: repositoryCoordinate(entry.x, `${path}.x`),
    y: repositoryCoordinate(entry.y, `${path}.y`),
  });
}

function inventoryRecord(
  input: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("Expected an Item inventory object.", path);
  }
  return input as Readonly<Record<string, unknown>>;
}

function exactRecord(
  input: unknown,
  keys: readonly string[],
  path: string,
): Readonly<Record<string, unknown>> {
  const value = inventoryRecord(input, path);
  const allowed = new Set(keys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    fail(`Unexpected Item inventory field '${unexpected}'.`, `${path}.${unexpected}`);
  }
  const missing = keys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing !== undefined) {
    fail(`Missing Item inventory field '${missing}'.`, `${path}.${missing}`);
  }
  return value;
}

function itemResRef(input: unknown, path: string): string {
  if (typeof input !== "string" || !/^[A-Za-z0-9_]{1,16}$/u.test(input)) {
    fail("Expected a non-empty 1..16 character Aurora Item ResRef.", path);
  }
  return input;
}

function canonicalBlueprintResRef(input: unknown, path: string): string {
  return boundedString(
    input,
    /^[a-z0-9_]{1,16}$/u,
    path,
    "Expected a canonical lowercase Aurora Item ResRef.",
  );
}

function boundedString(
  input: unknown,
  pattern: RegExp,
  path: string,
  message: string,
): string {
  if (typeof input !== "string" || !pattern.test(input)) fail(message, path);
  return input;
}

function boundedText(
  input: unknown,
  minLength: number,
  maxLength: number,
  path: string,
  rejectWhitespaceOnly: boolean,
): string {
  if (typeof input !== "string" || input.length < minLength || input.length > maxLength ||
    input.includes("\0") || (rejectWhitespaceOnly && input.trim().length < 1)) {
    fail(`Expected bounded NUL-free Item inventory text (${minLength}..${maxLength}).`, path);
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
  throw new AreaItemInventoryValidationError(message, path);
}

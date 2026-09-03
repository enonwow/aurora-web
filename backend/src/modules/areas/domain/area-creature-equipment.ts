export const AREA_CREATURE_EQUIPMENT_SLOT_MASKS = Object.freeze([
  0x1,
  0x2,
  0x4,
  0x8,
  0x10,
  0x20,
  0x40,
  0x80,
  0x100,
  0x200,
  0x400,
  0x800,
  0x1000,
  0x2000,
  0x4000,
  0x8000,
  0x10000,
  0x20000,
] as const);

export const MAX_AREA_CREATURE_EQUIPMENT_ENTRIES_PER_MUTATION =
  AREA_CREATURE_EQUIPMENT_SLOT_MASKS.length;

const SLOT_MASKS = new Set<number>(AREA_CREATURE_EQUIPMENT_SLOT_MASKS);

export interface AreaCreatureEquipmentSourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly slotMask: number;
  readonly dropable: boolean;
  readonly pickpocketable: boolean;
}

export type AreaCreatureEquipmentTargetEntry = AreaCreatureEquipmentSourceEntry;

export interface AreaCreatureEquipmentMutation {
  readonly expectedEntries: readonly AreaCreatureEquipmentSourceEntry[];
  readonly entries: readonly AreaCreatureEquipmentTargetEntry[];
}

export class AreaCreatureEquipmentValidationError extends Error {
  constructor(message: string, readonly path: string) {
    super(message);
    this.name = "AreaCreatureEquipmentValidationError";
  }
}

export function parseAreaCreatureEquipmentSourceEntries(
  input: unknown,
  path: string,
): readonly AreaCreatureEquipmentSourceEntry[] {
  const entries = equipmentArray(input, path);
  const usedSlotMasks = new Set<number>();
  return Object.freeze(entries.map((rawEntry, sourceIndex) => {
    const entryPath = `${path}.${sourceIndex}`;
    const entry = exactEquipmentEntry(rawEntry, entryPath);
    const parsedSourceIndex = safeInteger(
      entry.sourceIndex,
      0,
      Number.MAX_SAFE_INTEGER,
      `${entryPath}.sourceIndex`,
    );
    if (parsedSourceIndex !== sourceIndex) {
      fail(
        "Creature equipment source indices must be zero-based physical ordinals.",
        `${entryPath}.sourceIndex`,
      );
    }
    const slotMask = equipmentSlotMask(entry.slotMask, `${entryPath}.slotMask`);
    if (usedSlotMasks.has(slotMask)) {
      fail(
        "Creature equipment source slot masks must be unique.",
        `${entryPath}.slotMask`,
      );
    }
    usedSlotMasks.add(slotMask);
    return Object.freeze({
      sourceIndex: parsedSourceIndex,
      resRef: equipmentResRef(entry.resRef, `${entryPath}.resRef`),
      slotMask,
      dropable: booleanFlag(entry.dropable, `${entryPath}.dropable`),
      pickpocketable: booleanFlag(
        entry.pickpocketable,
        `${entryPath}.pickpocketable`,
      ),
    });
  }));
}

export function parseAreaCreatureEquipmentTargetEntries(
  input: unknown,
  sourceEntries: readonly AreaCreatureEquipmentSourceEntry[],
  path: string,
): readonly AreaCreatureEquipmentTargetEntry[] {
  const exactSource = parseAreaCreatureEquipmentSourceEntries(sourceEntries, `${path}.source`);
  const entries = equipmentArray(input, path);
  const usedSourceIndices = new Set<number>();
  let previousSlotMask = 0;
  return Object.freeze(entries.map((rawEntry, targetIndex) => {
    const entryPath = `${path}.${targetIndex}`;
    const entry = exactEquipmentEntry(rawEntry, entryPath);
    const sourceIndex = safeInteger(
      entry.sourceIndex,
      0,
      Number.MAX_SAFE_INTEGER,
      `${entryPath}.sourceIndex`,
    );
    if (usedSourceIndices.has(sourceIndex)) {
      fail(
        "A retained Creature equipment source ordinal may be used only once.",
        `${entryPath}.sourceIndex`,
      );
    }
    const source = exactSource[sourceIndex];
    if (!source) {
      fail(
        "The retained Creature equipment source ordinal does not exist.",
        `${entryPath}.sourceIndex`,
      );
    }
    const resRef = equipmentResRef(entry.resRef, `${entryPath}.resRef`);
    const slotMask = equipmentSlotMask(entry.slotMask, `${entryPath}.slotMask`);
    if (resRef !== source.resRef) {
      fail(
        "A retained Creature equipment item identity cannot change.",
        `${entryPath}.resRef`,
      );
    }
    if (slotMask !== source.slotMask) {
      fail(
        "A retained Creature equipment slot cannot change.",
        `${entryPath}.slotMask`,
      );
    }
    if (slotMask <= previousSlotMask) {
      fail(
        "Creature equipment targets must use strictly ascending slot masks.",
        `${entryPath}.slotMask`,
      );
    }
    usedSourceIndices.add(sourceIndex);
    previousSlotMask = slotMask;
    return Object.freeze({
      sourceIndex,
      resRef,
      slotMask,
      dropable: booleanFlag(entry.dropable, `${entryPath}.dropable`),
      pickpocketable: booleanFlag(
        entry.pickpocketable,
        `${entryPath}.pickpocketable`,
      ),
    });
  }));
}

export function parseAreaCreatureEquipmentMutation(
  input: unknown,
  path: string,
): AreaCreatureEquipmentMutation {
  const pair = exactRecord(input, ["expectedEntries", "entries"], path);
  const expectedEntries = parseAreaCreatureEquipmentSourceEntries(
    pair.expectedEntries,
    `${path}.expectedEntries`,
  );
  const entries = parseAreaCreatureEquipmentTargetEntries(
    pair.entries,
    expectedEntries,
    `${path}.entries`,
  );
  return Object.freeze({ expectedEntries, entries });
}

export function areaCreatureEquipmentEntriesEqual(
  left: readonly AreaCreatureEquipmentSourceEntry[],
  right: readonly AreaCreatureEquipmentSourceEntry[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined
      && entry.sourceIndex === candidate.sourceIndex
      && entry.resRef === candidate.resRef
      && entry.slotMask === candidate.slotMask
      && entry.dropable === candidate.dropable
      && entry.pickpocketable === candidate.pickpocketable;
  });
}

function equipmentArray(input: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(input)) {
    fail("Expected a Creature equipment array.", path);
  }
  if (input.length > MAX_AREA_CREATURE_EQUIPMENT_ENTRIES_PER_MUTATION) {
    fail("Creature equipment exceeds the 18-slot entry budget.", path);
  }
  return input;
}

function exactEquipmentEntry(
  input: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  return exactRecord(
    input,
    ["sourceIndex", "resRef", "slotMask", "dropable", "pickpocketable"],
    path,
  );
}

function exactRecord(
  input: unknown,
  keys: readonly string[],
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("Expected a Creature equipment object.", path);
  }
  const value = input as Readonly<Record<string, unknown>>;
  const allowed = new Set(keys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    fail(`Unexpected Creature equipment field '${unexpected}'.`, `${path}.${unexpected}`);
  }
  const missing = keys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing !== undefined) {
    fail(`Missing Creature equipment field '${missing}'.`, `${path}.${missing}`);
  }
  return value;
}

function equipmentResRef(input: unknown, path: string): string {
  if (typeof input !== "string" || !/^[A-Za-z0-9_]{1,16}$/u.test(input)) {
    fail("Expected a non-empty 1..16 character Aurora equipment ResRef.", path);
  }
  return input;
}

function equipmentSlotMask(input: unknown, path: string): number {
  const value = safeInteger(input, 1, 0x20000, path);
  if (!SLOT_MASKS.has(value)) {
    fail("Expected one of the 18 recovered Creature equipment slot masks.", path);
  }
  return value;
}

function booleanFlag(input: unknown, path: string): boolean {
  if (typeof input !== "boolean") {
    fail("Expected a Creature equipment mode-0 boolean flag.", path);
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
  throw new AreaCreatureEquipmentValidationError(message, path);
}

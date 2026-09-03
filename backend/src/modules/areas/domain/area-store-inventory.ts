import {
  isExactEffectiveItemBaseItemsTwoDaTable,
  MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_ROWS,
  type EffectiveItemBaseItemsTwoDaTable,
} from "../../catalog/domain/effective-item-base-items-two-da";

export const AREA_STORE_INVENTORY_BUCKET_TYPE_IDS = Object.freeze([
  0, 4, 2, 3, 1,
] as const);
export const MAX_AREA_STORE_INVENTORY_ENTRIES = 1_024;
export const AREA_STORE_INVENTORY_GRID_WIDTH = 10;
export const AREA_STORE_INVENTORY_GRID_HEIGHT = 10;
export const AREA_STORE_INVENTORY_MAX_PAGES = 255;

const MAX_REPOSITORY_Y =
  AREA_STORE_INVENTORY_GRID_HEIGHT * AREA_STORE_INVENTORY_MAX_PAGES - 1;
const INT32_MAX = 0x7fff_ffff;

export type AreaStoreInventoryBucketTypeId =
  typeof AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[number];

export interface AreaStoreInventoryRawEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly baseItemId: number;
  readonly x: number;
  readonly y: number;
  readonly infinite: boolean;
}

export interface AreaStoreInventoryRawBucket {
  readonly bucketTypeId: AreaStoreInventoryBucketTypeId;
  readonly entries: readonly AreaStoreInventoryRawEntry[];
}

export interface AreaStoreInventoryRawStorage {
  readonly buckets: readonly AreaStoreInventoryRawBucket[];
}

export interface AreaStoreInventoryExpectedEntry extends AreaStoreInventoryRawEntry {
  readonly slotWidth: number;
  readonly slotHeight: number;
}

export interface AreaStoreInventoryExpectedBucket {
  readonly bucketTypeId: AreaStoreInventoryBucketTypeId;
  readonly entries: readonly AreaStoreInventoryExpectedEntry[];
}

export interface ExistingAreaStoreInventoryProvenance {
  readonly expectedBuckets: readonly AreaStoreInventoryExpectedBucket[];
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface AreaStoreInventoryTargetEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly baseItemId: number;
  readonly infinite: boolean;
}

export interface AreaStoreInventoryTargetBucket {
  readonly bucketTypeId: AreaStoreInventoryBucketTypeId;
  readonly entries: readonly AreaStoreInventoryTargetEntry[];
}

export interface ExistingAreaStoreInventoryMutation
  extends ExistingAreaStoreInventoryProvenance {
  readonly buckets: readonly AreaStoreInventoryTargetBucket[];
}

export interface AreaStoreInventoryPackedEntry extends AreaStoreInventoryTargetEntry {
  readonly x: number;
  readonly y: number;
}

export interface AreaStoreInventoryPackedBucket {
  readonly bucketTypeId: AreaStoreInventoryBucketTypeId;
  readonly entries: readonly AreaStoreInventoryPackedEntry[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSafeInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function readResRef(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value)
    ? value
    : null;
}

function readRawEntry(value: unknown, sourceIndex: number): AreaStoreInventoryRawEntry | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "sourceIndex", "resRef", "baseItemId", "x", "y", "infinite",
  ]) || value.sourceIndex !== sourceIndex ||
    !isSafeInteger(value.baseItemId, 0, INT32_MAX) ||
    !isSafeInteger(value.x, 0, AREA_STORE_INVENTORY_GRID_WIDTH - 1) ||
    !isSafeInteger(value.y, 0, MAX_REPOSITORY_Y) ||
    typeof value.infinite !== "boolean") return null;
  const resRef = readResRef(value.resRef);
  return resRef === null ? null : Object.freeze({
    sourceIndex,
    resRef,
    baseItemId: value.baseItemId,
    x: value.x,
    y: value.y,
    infinite: value.infinite,
  });
}

export function readAreaStoreInventoryRawStorage(
  value: unknown,
): AreaStoreInventoryRawStorage | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["buckets"]) ||
    !Array.isArray(value.buckets) ||
    value.buckets.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length) return null;
  let total = 0;
  const buckets: AreaStoreInventoryRawBucket[] = [];
  for (const [bucketIndex, rawBucket] of value.buckets.entries()) {
    const bucketTypeId = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[bucketIndex];
    if (!isPlainRecord(rawBucket) || !hasExactKeys(rawBucket, ["bucketTypeId", "entries"]) ||
      rawBucket.bucketTypeId !== bucketTypeId || !Array.isArray(rawBucket.entries)) return null;
    total += rawBucket.entries.length;
    if (total > MAX_AREA_STORE_INVENTORY_ENTRIES) return null;
    const entries: AreaStoreInventoryRawEntry[] = [];
    for (const [sourceIndex, rawEntry] of rawBucket.entries.entries()) {
      const entry = readRawEntry(rawEntry, sourceIndex);
      if (!entry) return null;
      entries.push(entry);
    }
    buckets.push(Object.freeze({ bucketTypeId, entries: Object.freeze(entries) }));
  }
  return Object.freeze({ buckets: Object.freeze(buckets) });
}

function readExpectedEntry(value: unknown, sourceIndex: number): AreaStoreInventoryExpectedEntry | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "sourceIndex", "resRef", "baseItemId", "slotWidth", "slotHeight", "x", "y", "infinite",
  ]) || !isSafeInteger(value.slotWidth, 1, AREA_STORE_INVENTORY_GRID_WIDTH) ||
    !isSafeInteger(value.slotHeight, 1, AREA_STORE_INVENTORY_GRID_HEIGHT)) return null;
  const raw = readRawEntry({
    sourceIndex: value.sourceIndex,
    resRef: value.resRef,
    baseItemId: value.baseItemId,
    x: value.x,
    y: value.y,
    infinite: value.infinite,
  }, sourceIndex);
  return raw ? Object.freeze({
    ...raw,
    slotWidth: value.slotWidth,
    slotHeight: value.slotHeight,
  }) : null;
}

function readExpectedBuckets(value: unknown): readonly AreaStoreInventoryExpectedBucket[] | null {
  if (!Array.isArray(value) || value.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length) {
    return null;
  }
  let total = 0;
  const buckets: AreaStoreInventoryExpectedBucket[] = [];
  for (const [bucketIndex, rawBucket] of value.entries()) {
    const bucketTypeId = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[bucketIndex];
    if (!isPlainRecord(rawBucket) || !hasExactKeys(rawBucket, ["bucketTypeId", "entries"]) ||
      rawBucket.bucketTypeId !== bucketTypeId || !Array.isArray(rawBucket.entries)) return null;
    total += rawBucket.entries.length;
    if (total > MAX_AREA_STORE_INVENTORY_ENTRIES) return null;
    const entries: AreaStoreInventoryExpectedEntry[] = [];
    for (const [sourceIndex, rawEntry] of rawBucket.entries.entries()) {
      const entry = readExpectedEntry(rawEntry, sourceIndex);
      if (!entry) return null;
      entries.push(entry);
    }
    buckets.push(Object.freeze({ bucketTypeId, entries: Object.freeze(entries) }));
  }
  return Object.freeze(buckets);
}

export function readExistingAreaStoreInventoryProvenance(
  value: unknown,
): ExistingAreaStoreInventoryProvenance | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedBuckets", "tableSha256", "tableRowCount",
  ]) || typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !isSafeInteger(value.tableRowCount, 1, MAX_EFFECTIVE_ITEM_BASE_ITEMS_TWO_DA_ROWS)) {
    return null;
  }
  const expectedBuckets = readExpectedBuckets(value.expectedBuckets);
  if (!expectedBuckets || expectedBuckets.some((bucket) => bucket.entries.some(
    (entry) => entry.baseItemId >= Number(value.tableRowCount),
  ))) return null;
  return Object.freeze({
    expectedBuckets,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}

export function cloneAreaStoreInventoryProvenance(
  value: ExistingAreaStoreInventoryProvenance,
): ExistingAreaStoreInventoryProvenance {
  return Object.freeze({
    expectedBuckets: Object.freeze(value.expectedBuckets.map((bucket) => Object.freeze({
      bucketTypeId: bucket.bucketTypeId,
      entries: Object.freeze(bucket.entries.map((entry) => Object.freeze({ ...entry }))),
    }))),
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}

export function readAreaStoreInventoryTargetBuckets(
  value: unknown,
  expectedBuckets: readonly AreaStoreInventoryExpectedBucket[],
): readonly AreaStoreInventoryTargetBucket[] | null {
  if (!Array.isArray(value) || value.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length) {
    return null;
  }
  let total = 0;
  const buckets: AreaStoreInventoryTargetBucket[] = [];
  for (const [bucketIndex, rawBucket] of value.entries()) {
    const bucketTypeId = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[bucketIndex];
    const sourceBucket = expectedBuckets[bucketIndex];
    if (!sourceBucket || !isPlainRecord(rawBucket) ||
      !hasExactKeys(rawBucket, ["bucketTypeId", "entries"]) ||
      rawBucket.bucketTypeId !== bucketTypeId || !Array.isArray(rawBucket.entries)) return null;
    total += rawBucket.entries.length;
    if (total > MAX_AREA_STORE_INVENTORY_ENTRIES) return null;
    const used = new Set<number>();
    const entries: AreaStoreInventoryTargetEntry[] = [];
    for (const rawEntry of rawBucket.entries) {
      if (!isPlainRecord(rawEntry) || !hasExactKeys(rawEntry, [
        "sourceIndex", "resRef", "baseItemId", "infinite",
      ]) || !isSafeInteger(rawEntry.sourceIndex, 0, Number.MAX_SAFE_INTEGER) ||
        used.has(rawEntry.sourceIndex) || typeof rawEntry.infinite !== "boolean") return null;
      const source = sourceBucket.entries[rawEntry.sourceIndex];
      const resRef = readResRef(rawEntry.resRef);
      if (!source || resRef === null || resRef !== source.resRef ||
        rawEntry.baseItemId !== source.baseItemId) return null;
      used.add(rawEntry.sourceIndex);
      entries.push(Object.freeze({
        sourceIndex: rawEntry.sourceIndex,
        resRef,
        baseItemId: source.baseItemId,
        infinite: rawEntry.infinite,
      }));
    }
    buckets.push(Object.freeze({ bucketTypeId, entries: Object.freeze(entries) }));
  }
  return Object.freeze(buckets);
}

export function areaStoreInventoryExpectedTargetBuckets(
  expectedBuckets: readonly AreaStoreInventoryExpectedBucket[],
): readonly AreaStoreInventoryTargetBucket[] {
  return Object.freeze(expectedBuckets.map((bucket) => Object.freeze({
    bucketTypeId: bucket.bucketTypeId,
    entries: Object.freeze(bucket.entries.map((entry) => Object.freeze({
      sourceIndex: entry.sourceIndex,
      resRef: entry.resRef,
      baseItemId: entry.baseItemId,
      infinite: entry.infinite,
    }))),
  })));
}

export function areaStoreInventoryTargetBucketsEqual(
  left: readonly AreaStoreInventoryTargetBucket[],
  right: readonly AreaStoreInventoryTargetBucket[],
): boolean {
  return left.length === right.length && left.every((bucket, bucketIndex) => {
    const candidate = right[bucketIndex];
    return candidate?.bucketTypeId === bucket.bucketTypeId &&
      candidate.entries.length === bucket.entries.length &&
      bucket.entries.every((entry, entryIndex) => {
        const other = candidate.entries[entryIndex];
        return other?.sourceIndex === entry.sourceIndex && other.resRef === entry.resRef &&
          other.baseItemId === entry.baseItemId && other.infinite === entry.infinite;
      });
  });
}

export function readExistingAreaStoreInventoryMutation(
  value: unknown,
): ExistingAreaStoreInventoryMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedBuckets", "buckets", "tableSha256", "tableRowCount",
  ])) return null;
  const provenance = readExistingAreaStoreInventoryProvenance({
    expectedBuckets: value.expectedBuckets,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
  if (!provenance) return null;
  const buckets = readAreaStoreInventoryTargetBuckets(value.buckets, provenance.expectedBuckets);
  if (!buckets || areaStoreInventoryTargetBucketsEqual(
    buckets,
    areaStoreInventoryExpectedTargetBuckets(
      provenance.expectedBuckets,
    ),
  )) return null;
  return Object.freeze({ ...provenance, buckets });
}

export function packAreaStoreInventoryBuckets(
  expectedInput: unknown,
  targetInput: unknown,
): readonly AreaStoreInventoryPackedBucket[] | null {
  const expectedBuckets = readExpectedBuckets(expectedInput);
  if (!expectedBuckets) return null;
  const targetBuckets = readAreaStoreInventoryTargetBuckets(targetInput, expectedBuckets);
  if (!targetBuckets) return null;
  const packed: AreaStoreInventoryPackedBucket[] = [];
  for (const [bucketIndex, targetBucket] of targetBuckets.entries()) {
    const sourceBucket = expectedBuckets[bucketIndex]!;
    const pages: boolean[][][] = [];
    const entries: AreaStoreInventoryPackedEntry[] = [];
    for (const targetEntry of targetBucket.entries) {
      const source = sourceBucket.entries[targetEntry.sourceIndex]!;
      const position = firstAvailablePosition(pages, source.slotWidth, source.slotHeight);
      if (!position) return null;
      entries.push(Object.freeze({
        ...targetEntry,
        x: position.x,
        y: position.page * AREA_STORE_INVENTORY_GRID_HEIGHT + position.y,
      }));
    }
    packed.push(Object.freeze({
      bucketTypeId: targetBucket.bucketTypeId,
      entries: Object.freeze(entries),
    }));
  }
  return Object.freeze(packed);
}

function firstAvailablePosition(
  pages: boolean[][][],
  width: number,
  height: number,
): Readonly<{ page: number; x: number; y: number }> | null {
  for (let page = 0; page < AREA_STORE_INVENTORY_MAX_PAGES; page += 1) {
    const grid = pages[page] ?? createGrid();
    pages[page] = grid;
    for (let y = 0; y <= AREA_STORE_INVENTORY_GRID_HEIGHT - height; y += 1) {
      for (let x = 0; x <= AREA_STORE_INVENTORY_GRID_WIDTH - width; x += 1) {
        if (!rectangleIsFree(grid, x, y, width, height)) continue;
        occupyRectangle(grid, x, y, width, height);
        return Object.freeze({ page, x, y });
      }
    }
  }
  return null;
}

function createGrid(): boolean[][] {
  return Array.from({ length: AREA_STORE_INVENTORY_GRID_HEIGHT }, () =>
    Array<boolean>(AREA_STORE_INVENTORY_GRID_WIDTH).fill(false));
}

function rectangleIsFree(
  grid: readonly (readonly boolean[])[],
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      if (grid[row]?.[column]) return false;
    }
  }
  return true;
}

function occupyRectangle(
  grid: boolean[][],
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      grid[row]![column] = true;
    }
  }
}

export function bindEffectiveBaseItemsTwoDaToStoreInventory(
  rawInput: unknown,
  tableInput: unknown,
): ExistingAreaStoreInventoryProvenance | null {
  const raw = readAreaStoreInventoryRawStorage(rawInput);
  if (!raw || !isExactEffectiveItemBaseItemsTwoDaTable(tableInput)) return null;
  const table: EffectiveItemBaseItemsTwoDaTable = tableInput;
  const expectedBuckets: AreaStoreInventoryExpectedBucket[] = [];
  for (const bucket of raw.buckets) {
    const entries: AreaStoreInventoryExpectedEntry[] = [];
    for (const entry of bucket.entries) {
      const row = table.rows[entry.baseItemId];
      if (row?.rowIndex !== entry.baseItemId ||
        !isSafeInteger(row.invSlotWidth, 1, AREA_STORE_INVENTORY_GRID_WIDTH) ||
        !isSafeInteger(row.invSlotHeight, 1, AREA_STORE_INVENTORY_GRID_HEIGHT)) return null;
      entries.push(Object.freeze({
        ...entry,
        slotWidth: row.invSlotWidth,
        slotHeight: row.invSlotHeight,
      }));
    }
    expectedBuckets.push(Object.freeze({
      bucketTypeId: bucket.bucketTypeId,
      entries: Object.freeze(entries),
    }));
  }
  const target = areaStoreInventoryExpectedTargetBuckets(expectedBuckets);
  const packed = packAreaStoreInventoryBuckets(expectedBuckets, target);
  if (!packed || !packed.every((bucket, bucketIndex) => bucket.entries.every(
    (entry, entryIndex) => {
      const source = raw.buckets[bucketIndex]?.entries[entryIndex];
      return source?.x === entry.x && source.y === entry.y;
    },
  ))) return null;
  return Object.freeze({
    expectedBuckets: Object.freeze(expectedBuckets),
    tableSha256: table.descriptor.sha256,
    tableRowCount: table.descriptor.rowCount,
  });
}

export function areaStoreInventoryRawMatchesExpected(
  rawInput: unknown,
  expectedInput: unknown,
): boolean {
  const raw = readAreaStoreInventoryRawStorage(rawInput);
  const expected = readExpectedBuckets(expectedInput);
  return raw !== null && expected !== null && raw.buckets.length === expected.length &&
    raw.buckets.every((bucket, bucketIndex) => {
      const candidate = expected[bucketIndex];
      return candidate?.bucketTypeId === bucket.bucketTypeId &&
        candidate.entries.length === bucket.entries.length &&
        bucket.entries.every((entry, entryIndex) => {
          const other = candidate.entries[entryIndex];
          return other?.sourceIndex === entry.sourceIndex && other.resRef === entry.resRef &&
            other.baseItemId === entry.baseItemId && other.x === entry.x && other.y === entry.y &&
            other.infinite === entry.infinite;
        });
    });
}

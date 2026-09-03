import type { SceneItemBaseItemCatalog } from "../contracts";
import { readItemBaseItemCatalog } from "./itemBaseAppearance";

export const AREA_STORE_INVENTORY_BUCKET_TYPE_IDS = Object.freeze([
  0, 4, 2, 3, 1,
] as const);
export const MAX_AREA_STORE_INVENTORY_ENTRIES = 1_024;

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;
const MAX_PAGES = 255;
const MAX_REPOSITORY_Y = GRID_HEIGHT * MAX_PAGES - 1;
const MAX_CATALOG_ROWS = 4_096;

export type AreaStoreInventoryBucketTypeId =
  typeof AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[number];

export interface AreaStoreInventoryExpectedEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly baseItemId: number;
  readonly slotWidth: number;
  readonly slotHeight: number;
  readonly x: number;
  readonly y: number;
  readonly infinite: boolean;
}

export interface AreaStoreInventoryExpectedBucket {
  readonly bucketTypeId: AreaStoreInventoryBucketTypeId;
  readonly entries: readonly AreaStoreInventoryExpectedEntry[];
}

export interface AreaStoreInventoryProvenance {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function readResRef(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value)
    ? value
    : null;
}

function readExpectedBuckets(
  value: unknown,
  tableRowCount: number,
): readonly AreaStoreInventoryExpectedBucket[] | null {
  if (!Array.isArray(value) || value.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length) {
    return null;
  }
  let total = 0;
  const buckets: AreaStoreInventoryExpectedBucket[] = [];
  for (const [bucketIndex, inputBucket] of value.entries()) {
    const bucketTypeId = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[bucketIndex];
    if (!isRecord(inputBucket) || !hasExactKeys(inputBucket, ["bucketTypeId", "entries"]) ||
      inputBucket.bucketTypeId !== bucketTypeId || !Array.isArray(inputBucket.entries)) return null;
    total += inputBucket.entries.length;
    if (total > MAX_AREA_STORE_INVENTORY_ENTRIES) return null;
    const entries: AreaStoreInventoryExpectedEntry[] = [];
    for (const [sourceIndex, inputEntry] of inputBucket.entries.entries()) {
      if (!isRecord(inputEntry) || !hasExactKeys(inputEntry, [
        "sourceIndex", "resRef", "baseItemId", "slotWidth", "slotHeight", "x", "y",
        "infinite",
      ]) || inputEntry.sourceIndex !== sourceIndex ||
        !isIntegerBetween(inputEntry.baseItemId, 0, tableRowCount - 1) ||
        !isIntegerBetween(inputEntry.slotWidth, 1, GRID_WIDTH) ||
        !isIntegerBetween(inputEntry.slotHeight, 1, GRID_HEIGHT) ||
        !isIntegerBetween(inputEntry.x, 0, GRID_WIDTH - 1) ||
        !isIntegerBetween(inputEntry.y, 0, MAX_REPOSITORY_Y) ||
        typeof inputEntry.infinite !== "boolean") return null;
      const resRef = readResRef(inputEntry.resRef);
      if (!resRef) return null;
      entries.push(Object.freeze({
        sourceIndex,
        resRef,
        baseItemId: inputEntry.baseItemId,
        slotWidth: inputEntry.slotWidth,
        slotHeight: inputEntry.slotHeight,
        x: inputEntry.x,
        y: inputEntry.y,
        infinite: inputEntry.infinite,
      }));
    }
    buckets.push(Object.freeze({ bucketTypeId, entries: Object.freeze(entries) }));
  }
  return Object.freeze(buckets);
}

export function readStoreInventoryProvenance(
  value: unknown,
): AreaStoreInventoryProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedBuckets", "tableSha256", "tableRowCount",
  ]) || typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !isIntegerBetween(value.tableRowCount, 1, MAX_CATALOG_ROWS)) return null;
  const expectedBuckets = readExpectedBuckets(value.expectedBuckets, value.tableRowCount);
  return expectedBuckets ? Object.freeze({
    expectedBuckets,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  }) : null;
}

function packedPositions(
  entries: readonly AreaStoreInventoryExpectedEntry[],
): readonly Readonly<{ x: number; y: number }>[] | null {
  const occupied = new Uint8Array(GRID_WIDTH * GRID_HEIGHT * MAX_PAGES);
  const positions: Array<Readonly<{ x: number; y: number }>> = [];
  for (const entry of entries) {
    let placed = false;
    for (let page = 0; page < MAX_PAGES && !placed; page += 1) {
      for (let row = 0; row <= GRID_HEIGHT - entry.slotHeight && !placed; row += 1) {
        for (let col = 0; col <= GRID_WIDTH - entry.slotWidth && !placed; col += 1) {
          let free = true;
          for (let dy = 0; dy < entry.slotHeight && free; dy += 1) {
            for (let dx = 0; dx < entry.slotWidth; dx += 1) {
              const index = (page * GRID_HEIGHT + row + dy) * GRID_WIDTH + col + dx;
              if (occupied[index] !== 0) {
                free = false;
                break;
              }
            }
          }
          if (!free) continue;
          for (let dy = 0; dy < entry.slotHeight; dy += 1) {
            for (let dx = 0; dx < entry.slotWidth; dx += 1) {
              occupied[(page * GRID_HEIGHT + row + dy) * GRID_WIDTH + col + dx] = 1;
            }
          }
          positions.push(Object.freeze({ x: col, y: page * GRID_HEIGHT + row }));
          placed = true;
        }
      }
    }
    if (!placed) return null;
  }
  return Object.freeze(positions);
}

export function bindStoreInventoryProvenanceToCatalog(
  provenanceInput: unknown,
  catalogInput: unknown,
): AreaStoreInventoryProvenance | null {
  const provenance = readStoreInventoryProvenance(provenanceInput);
  const catalog: SceneItemBaseItemCatalog | null = readItemBaseItemCatalog(catalogInput);
  if (!provenance || !catalog || catalog.descriptor.sha256 !== provenance.tableSha256 ||
    catalog.descriptor.rowCount !== provenance.tableRowCount) return null;
  for (const bucket of provenance.expectedBuckets) {
    for (const entry of bucket.entries) {
      const row = catalog.rows[entry.baseItemId];
      if (row?.rowIndex !== entry.baseItemId || row.invSlotWidth !== entry.slotWidth ||
        row.invSlotHeight !== entry.slotHeight) return null;
    }
    const positions = packedPositions(bucket.entries);
    if (!positions || positions.some((position, index) =>
      position.x !== bucket.entries[index]?.x || position.y !== bucket.entries[index]?.y)) {
      return null;
    }
  }
  return provenance;
}

export function readStoreInventoryTargetBuckets(
  value: unknown,
  expectedBuckets: readonly AreaStoreInventoryExpectedBucket[],
): readonly AreaStoreInventoryTargetBucket[] | null {
  if (!Array.isArray(value) || value.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length ||
    expectedBuckets.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length) return null;
  let total = 0;
  const buckets: AreaStoreInventoryTargetBucket[] = [];
  for (const [bucketIndex, inputBucket] of value.entries()) {
    const bucketTypeId = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[bucketIndex];
    const expectedBucket = expectedBuckets[bucketIndex];
    if (!expectedBucket || expectedBucket.bucketTypeId !== bucketTypeId || !isRecord(inputBucket) ||
      !hasExactKeys(inputBucket, ["bucketTypeId", "entries"]) ||
      inputBucket.bucketTypeId !== bucketTypeId || !Array.isArray(inputBucket.entries)) return null;
    total += inputBucket.entries.length;
    if (total > MAX_AREA_STORE_INVENTORY_ENTRIES) return null;
    const seen = new Set<number>();
    const entries: AreaStoreInventoryTargetEntry[] = [];
    for (const inputEntry of inputBucket.entries) {
      if (!isRecord(inputEntry) || !hasExactKeys(inputEntry, [
        "sourceIndex", "resRef", "baseItemId", "infinite",
      ]) || !isIntegerBetween(inputEntry.sourceIndex, 0, expectedBucket.entries.length - 1) ||
        seen.has(inputEntry.sourceIndex) || typeof inputEntry.infinite !== "boolean") return null;
      const source = expectedBucket.entries[inputEntry.sourceIndex];
      if (!source || inputEntry.resRef !== source.resRef ||
        inputEntry.baseItemId !== source.baseItemId) return null;
      seen.add(inputEntry.sourceIndex);
      entries.push(Object.freeze({
        sourceIndex: inputEntry.sourceIndex,
        resRef: source.resRef,
        baseItemId: source.baseItemId,
        infinite: inputEntry.infinite,
      }));
    }
    buckets.push(Object.freeze({ bucketTypeId, entries: Object.freeze(entries) }));
  }
  return Object.freeze(buckets);
}

export function storeInventoryTargetFromProvenance(
  provenance: AreaStoreInventoryProvenance,
): readonly AreaStoreInventoryTargetBucket[] {
  return Object.freeze(provenance.expectedBuckets.map((bucket) => Object.freeze({
    bucketTypeId: bucket.bucketTypeId,
    entries: Object.freeze(bucket.entries.map((entry) => Object.freeze({
      sourceIndex: entry.sourceIndex,
      resRef: entry.resRef,
      baseItemId: entry.baseItemId,
      infinite: entry.infinite,
    }))),
  })));
}

export function cloneStoreInventoryProvenance(
  value: AreaStoreInventoryProvenance,
): AreaStoreInventoryProvenance {
  return readStoreInventoryProvenance(value)!;
}

export function cloneStoreInventoryTargetBuckets(
  value: readonly AreaStoreInventoryTargetBucket[],
  expectedBuckets: readonly AreaStoreInventoryExpectedBucket[],
): readonly AreaStoreInventoryTargetBucket[] {
  return readStoreInventoryTargetBuckets(value, expectedBuckets)!;
}

export function areaStoreInventoryTargetsEqual(
  left: readonly AreaStoreInventoryTargetBucket[],
  right: readonly AreaStoreInventoryTargetBucket[],
): boolean {
  return left.length === right.length && left.every((bucket, bucketIndex) => {
    const other = right[bucketIndex];
    return other?.bucketTypeId === bucket.bucketTypeId &&
      other.entries.length === bucket.entries.length && bucket.entries.every((entry, index) => {
        const candidate = other.entries[index];
        return candidate?.sourceIndex === entry.sourceIndex && candidate.resRef === entry.resRef &&
          candidate.baseItemId === entry.baseItemId && candidate.infinite === entry.infinite;
      });
  });
}

export function countChangedStoreInventoryEntries(
  left: readonly AreaStoreInventoryTargetBucket[],
  right: readonly AreaStoreInventoryTargetBucket[],
): number {
  return left.reduce((count, bucket, bucketIndex) => {
    const other = right[bucketIndex];
    if (!other || other.bucketTypeId !== bucket.bucketTypeId) {
      return count + Math.max(bucket.entries.length, other?.entries.length ?? 0);
    }
    let unchanged = 0;
    for (let index = 0; index < Math.min(bucket.entries.length, other.entries.length); index += 1) {
      const source = bucket.entries[index];
      const target = other.entries[index];
      if (source?.sourceIndex === target?.sourceIndex && source.resRef === target.resRef &&
        source.baseItemId === target.baseItemId && source.infinite === target.infinite) unchanged += 1;
    }
    return count + Math.max(bucket.entries.length, other.entries.length) - unchanged;
  }, 0);
}

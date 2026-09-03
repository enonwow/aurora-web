import type { SceneObject, SceneObjectVisualTransform } from "../contracts";

export const ITEM_VISUAL_TRANSFORM_KEYS = Object.freeze([
  "scaleX",
  "scaleY",
  "scaleZ",
  "rotateX",
  "rotateY",
  "rotateZ",
  "translateX",
  "translateY",
  "translateZ",
] as const);

export type ItemVisualTransformKey = typeof ITEM_VISUAL_TRANSFORM_KEYS[number];

export interface ItemVisualTransformValue {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
  readonly rotateX: number;
  readonly rotateY: number;
  readonly rotateZ: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly translateZ: number;
}

export type ItemVisualTransformStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: ItemVisualTransformValue }>;

export const DEFAULT_ITEM_VISUAL_TRANSFORM_VALUE: ItemVisualTransformValue =
  Object.freeze({
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
  });

const SCALE_KEYS = new Set<ItemVisualTransformKey>(["scaleX", "scaleY", "scaleZ"]);
const ROTATION_KEYS = new Set<ItemVisualTransformKey>([
  "rotateX",
  "rotateY",
  "rotateZ",
]);

export function readItemVisualTransformStorage(
  input: unknown,
): ItemVisualTransformStorage | null {
  if (!isExactRecord(input, ["present", "value"], true)) return null;
  if (typeof input.present !== "boolean") return null;
  if (!input.present) {
    return Object.prototype.hasOwnProperty.call(input, "value")
      ? null
      : Object.freeze({ present: false });
  }
  if (!Object.prototype.hasOwnProperty.call(input, "value")) return null;
  const value = readItemVisualTransformValue(input.value);
  if (!value || itemVisualTransformValueEqual(value, DEFAULT_ITEM_VISUAL_TRANSFORM_VALUE)) {
    return null;
  }
  return Object.freeze({ present: true, value });
}

export function cloneItemVisualTransformStorage(
  storage: ItemVisualTransformStorage,
): ItemVisualTransformStorage {
  return storage.present
    ? { present: true, value: { ...storage.value } }
    : { present: false };
}

export function sceneVisualTransformToItemStorage(
  transform: SceneObjectVisualTransform,
): ItemVisualTransformStorage | null {
  const scaleX = transform.scaleX ?? transform.scale;
  const scaleY = transform.scaleY ?? transform.scale;
  const scaleZ = transform.scaleZ ?? transform.scale;
  const candidate: ItemVisualTransformValue = {
    scaleX: Math.fround(scaleX),
    scaleY: Math.fround(scaleY),
    scaleZ: Math.fround(scaleZ),
    rotateX: Math.fround(radiansToDegrees(transform.pitch)),
    rotateY: Math.fround(radiansToDegrees(transform.roll)),
    rotateZ: Math.fround(radiansToDegrees(transform.yaw)),
    translateX: Math.fround(transform.offsetX * 10),
    translateY: Math.fround(transform.offsetY * 10),
    translateZ: Math.fround(transform.offsetZ * 10),
  };
  const value = readItemVisualTransformValue(candidate);
  if (!value) return null;
  if (itemVisualTransformValueEqual(value, DEFAULT_ITEM_VISUAL_TRANSFORM_VALUE)) {
    return Object.freeze({ present: false });
  }
  return Object.freeze({ present: true, value });
}

export function itemVisualTransformStorageEqual(
  left: ItemVisualTransformStorage,
  right: ItemVisualTransformStorage,
): boolean {
  if (left.present !== right.present) return false;
  if (!left.present || !right.present) return true;
  return itemVisualTransformValueEqual(left.value, right.value);
}

export function canEditRetainedItemVisualTransform(object: SceneObject): boolean {
  return object.kind === "items"
    && object.source?.type === "aurora_git"
    && object.source.sourceKind === "item"
    && Number.isSafeInteger(object.source.sourceIndex)
    && (object.source.sourceIndex ?? -1) >= 0
    && readItemVisualTransformStorage(object.source.itemVisualTransform) !== null
    && readItemVisualTransformStorage(object.itemProperties?.visualTransform) !== null;
}

function readItemVisualTransformValue(input: unknown): ItemVisualTransformValue | null {
  if (!isExactRecord(input, ITEM_VISUAL_TRANSFORM_KEYS, false)) return null;
  const output = {} as Record<ItemVisualTransformKey, number>;
  for (const key of ITEM_VISUAL_TRANSFORM_KEYS) {
    const value = input[key];
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || Math.fround(value) !== value
    ) {
      return null;
    }
    if (SCALE_KEYS.has(key) && (value < 0.01 || value > 1000)) return null;
    if (ROTATION_KEYS.has(key) && Math.abs(value) > 360_000) return null;
    if (!SCALE_KEYS.has(key) && !ROTATION_KEYS.has(key) && Math.abs(value) > 1_000_000) {
      return null;
    }
    output[key] = value;
  }
  return Object.freeze(output) as unknown as ItemVisualTransformValue;
}

function itemVisualTransformValueEqual(
  left: ItemVisualTransformValue,
  right: ItemVisualTransformValue,
): boolean {
  return ITEM_VISUAL_TRANSFORM_KEYS.every((key) => left[key] === right[key]);
}

function isExactRecord(
  input: unknown,
  allowedKeys: readonly string[],
  optionalValue: boolean,
): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  const allowed = new Set(allowedKeys);
  if (Object.keys(record).some((key) => !allowed.has(key))) return false;
  return allowedKeys.every((key) =>
    optionalValue && key === "value"
      ? true
      : Object.prototype.hasOwnProperty.call(record, key)
  );
}

function radiansToDegrees(value: number): number {
  return value * 180 / Math.PI;
}

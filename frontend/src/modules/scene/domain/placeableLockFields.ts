export const PLACEABLE_LOCK_FIELD_MAPPINGS = Object.freeze([
  Object.freeze({ slot: "locked", metadataKey: "locked", valueKind: "boolean" }),
  Object.freeze({ slot: "canRelock", metadataKey: "lockable", valueKind: "boolean" }),
  Object.freeze({
    slot: "autoRemoveKeyAfterUse",
    metadataKey: "autoRemoveKey",
    valueKind: "boolean"
  }),
  Object.freeze({
    slot: "keyRequiredToUnlockOrLock",
    metadataKey: "keyRequired",
    valueKind: "boolean"
  }),
  Object.freeze({ slot: "openLockDc", metadataKey: "openLockDc", valueKind: "byte" }),
  Object.freeze({ slot: "closeLockDc", metadataKey: "closeLockDc", valueKind: "byte" })
] as const);

export type PlaceableLockByteField =
  (typeof PLACEABLE_LOCK_FIELD_MAPPINGS)[number]["slot"];

export function isPlaceableLockFieldValue(
  valueKind: "boolean" | "byte",
  value: unknown
): value is boolean | number {
  return valueKind === "boolean"
    ? typeof value === "boolean"
    : Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 255;
}

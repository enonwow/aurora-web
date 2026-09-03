export const AREA_PLACEABLE_LOCK_FIELD_MAPPINGS = Object.freeze([
  Object.freeze({
    slot: "locked",
    metadataKey: "locked",
    field: "Locked",
    valueKind: "boolean",
  }),
  Object.freeze({
    slot: "canRelock",
    metadataKey: "lockable",
    field: "Lockable",
    valueKind: "boolean",
  }),
  Object.freeze({
    slot: "autoRemoveKeyAfterUse",
    metadataKey: "autoRemoveKey",
    field: "AutoRemoveKey",
    valueKind: "boolean",
  }),
  Object.freeze({
    slot: "keyRequiredToUnlockOrLock",
    metadataKey: "keyRequired",
    field: "KeyRequired",
    valueKind: "boolean",
  }),
  Object.freeze({
    slot: "openLockDc",
    metadataKey: "openLockDc",
    field: "OpenLockDC",
    valueKind: "byte",
  }),
  Object.freeze({
    slot: "closeLockDc",
    metadataKey: "closeLockDc",
    field: "CloseLockDC",
    valueKind: "byte",
  }),
] as const);

export type ExistingAreaPlaceableLockField =
  (typeof AREA_PLACEABLE_LOCK_FIELD_MAPPINGS)[number]["field"];
export type ExistingAreaPlaceableLockSlot =
  (typeof AREA_PLACEABLE_LOCK_FIELD_MAPPINGS)[number]["slot"];
export type ExistingAreaPlaceableLockValue = boolean | number;
export type AreaPlaceableLockFieldMapping =
  (typeof AREA_PLACEABLE_LOCK_FIELD_MAPPINGS)[number];

export function findAreaPlaceableLockFieldMapping(
  field: unknown,
): AreaPlaceableLockFieldMapping | undefined {
  return AREA_PLACEABLE_LOCK_FIELD_MAPPINGS.find((mapping) => mapping.field === field);
}

export function isAreaPlaceableLockFieldValue(
  mapping: AreaPlaceableLockFieldMapping,
  value: unknown,
): value is ExistingAreaPlaceableLockValue {
  return mapping.valueKind === "boolean"
    ? typeof value === "boolean"
    : Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 255;
}

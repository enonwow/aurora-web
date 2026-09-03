export const AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS = Object.freeze([
  Object.freeze({
    field: "TrapFlag",
    slot: "isTrapped",
    metadataKey: "trapFlag",
    valueKind: "flag",
  }),
  Object.freeze({
    field: "TrapDetectable",
    slot: "detectable",
    metadataKey: "trapDetectable",
    valueKind: "flag",
  }),
  Object.freeze({
    field: "TrapDisarmable",
    slot: "disarmable",
    metadataKey: "trapDisarmable",
    valueKind: "flag",
  }),
  Object.freeze({
    field: "TrapOneShot",
    slot: "oneShot",
    metadataKey: "trapOneShot",
    valueKind: "flag",
  }),
  Object.freeze({
    field: "TrapDetectDC",
    slot: "detectionDc",
    metadataKey: "detectDc",
    valueKind: "byte",
  }),
  Object.freeze({
    field: "DisarmDC",
    slot: "disarmDc",
    metadataKey: "disarmDc",
    valueKind: "byte",
  }),
] as const);

export type ExistingAreaPlaceableTrapByteField =
  (typeof AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS)[number]["field"];

export interface ExistingAreaPlaceableTrapByteMutation {
  readonly field: ExistingAreaPlaceableTrapByteField;
  readonly expectedValue: number;
  readonly value: number;
}

export function findAreaPlaceableTrapByteFieldMapping(field: unknown):
  (typeof AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS)[number] | undefined {
  return AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS.find((entry) => entry.field === field);
}

export function isAreaPlaceableTrapByteMutationValue(
  mapping: (typeof AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS)[number],
  value: unknown,
): value is number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= (mapping.valueKind === "flag" ? 1 : 0xff);
}

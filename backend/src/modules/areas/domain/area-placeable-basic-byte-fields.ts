export const AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS = Object.freeze([
  Object.freeze({
    field: "Hardness",
    slot: "hardness",
    metadataKey: "hardness",
  }),
  Object.freeze({
    field: "Fort",
    slot: "fortitudeSave",
    metadataKey: "fortitudeSave",
  }),
  Object.freeze({
    field: "Ref",
    slot: "reflexSave",
    metadataKey: "reflexSave",
  }),
  Object.freeze({
    field: "Will",
    slot: "willSave",
    metadataKey: "willSave",
  }),
] as const);

export type ExistingAreaPlaceableBasicByteField =
  (typeof AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS)[number]["field"];

export interface ExistingAreaPlaceableBasicByteMutation {
  readonly field: ExistingAreaPlaceableBasicByteField;
  readonly expectedValue: number;
  readonly value: number;
}

export function findAreaPlaceableBasicByteFieldMapping(field: unknown):
  (typeof AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS)[number] | undefined {
  return AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS.find((entry) => entry.field === field);
}

export function isAreaPlaceableByteValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xff;
}

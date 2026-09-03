import type {
  SceneObjectPlaceableTrapByteSettings,
  SceneObjectPlaceableTrapSettings
} from "../contracts";

export type PlaceableTrapByteField = keyof SceneObjectPlaceableTrapByteSettings;
export type PlaceableTrapByteValueKind = "flag" | "byte";

export const PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS = Object.freeze([
  Object.freeze({ metadataKey: "trapFlag", slot: "isTrapped", valueKind: "flag" }),
  Object.freeze({ metadataKey: "trapDetectable", slot: "detectable", valueKind: "flag" }),
  Object.freeze({ metadataKey: "trapDisarmable", slot: "disarmable", valueKind: "flag" }),
  Object.freeze({ metadataKey: "trapOneShot", slot: "oneShot", valueKind: "flag" }),
  Object.freeze({ metadataKey: "detectDc", slot: "detectionDc", valueKind: "byte" }),
  Object.freeze({ metadataKey: "disarmDc", slot: "disarmDc", valueKind: "byte" })
] as const);

export function isPlaceableTrapByteField(value: unknown): value is PlaceableTrapByteField {
  return PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS.some((mapping) => mapping.slot === value);
}

export function isPlaceableTrapByteFieldValue(
  valueKind: PlaceableTrapByteValueKind,
  value: unknown
): value is number {
  if (!Number.isInteger(value)) return false;
  const integerValue = value as number;
  return integerValue >= 0 && integerValue <= (valueKind === "flag" ? 1 : 0xff);
}

export function isPlaceableTrapTargetValue(
  field: PlaceableTrapByteField,
  value: unknown
): value is boolean | number {
  const mapping = PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS.find((entry) => entry.slot === field);
  if (!mapping) return false;
  return mapping.valueKind === "flag"
    ? typeof value === "boolean"
    : isPlaceableTrapByteFieldValue("byte", value);
}

export function readPlaceableTrapByteSettings(
  metadata: Readonly<Record<string, unknown>> | undefined
): SceneObjectPlaceableTrapByteSettings | undefined {
  if (!metadata) return undefined;
  const result: Partial<SceneObjectPlaceableTrapSettings> = {};
  for (const mapping of PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS) {
    const value = metadata[mapping.metadataKey];
    if (!isPlaceableTrapByteFieldValue(mapping.valueKind, value)) continue;
    result[mapping.slot] = (mapping.valueKind === "flag" ? value === 1 : value) as never;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

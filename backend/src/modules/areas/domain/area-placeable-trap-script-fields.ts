export const AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS = Object.freeze([
  Object.freeze({
    slot: "onDisarmScript",
    metadataKey: "script.onDisarm",
    field: "OnDisarm",
  }),
  Object.freeze({
    slot: "onTrapTriggeredScript",
    metadataKey: "script.onTrapTriggered",
    field: "OnTrapTriggered",
  }),
] as const);

export type ExistingAreaPlaceableTrapScriptSlot =
  (typeof AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS)[number]["slot"];

export type ExistingAreaPlaceableTrapScriptMetadataKey =
  (typeof AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS)[number]["metadataKey"];

export type ExistingAreaPlaceableTrapScriptField =
  (typeof AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS)[number]["field"];

export function findAreaPlaceableTrapScriptFieldMapping(
  field: unknown,
): (typeof AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS)[number] | undefined {
  return AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS.find((entry) => entry.field === field);
}

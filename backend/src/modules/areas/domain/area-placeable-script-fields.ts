export const AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS = Object.freeze([
  Object.freeze({ slot: "onClick", metadataKey: "script.onClick", field: "OnClick" }),
  Object.freeze({ slot: "onClosed", metadataKey: "script.onClosed", field: "OnClosed" }),
  Object.freeze({ slot: "onDamaged", metadataKey: "script.onDamaged", field: "OnDamaged" }),
  Object.freeze({ slot: "onDeath", metadataKey: "script.onDeath", field: "OnDeath" }),
  Object.freeze({ slot: "onHeartbeat", metadataKey: "script.onHeartbeat", field: "OnHeartbeat" }),
  Object.freeze({ slot: "onInvDisturbed", metadataKey: "script.onInventoryDisturbed", field: "OnInvDisturbed" }),
  Object.freeze({ slot: "onLock", metadataKey: "script.onLock", field: "OnLock" }),
  Object.freeze({ slot: "onMeleeAttacked", metadataKey: "script.onMeleeAttacked", field: "OnMeleeAttacked" }),
  Object.freeze({ slot: "onOpen", metadataKey: "script.onOpen", field: "OnOpen" }),
  Object.freeze({ slot: "onSpellCastAt", metadataKey: "script.onSpellCastAt", field: "OnSpellCastAt" }),
  Object.freeze({ slot: "onUnlock", metadataKey: "script.onUnlock", field: "OnUnlock" }),
  Object.freeze({ slot: "onUserDefined", metadataKey: "script.onUserDefined", field: "OnUserDefined" }),
] as const);

export type ExistingAreaPlaceableScriptSlot =
  (typeof AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS)[number]["slot"];

export type ExistingAreaPlaceableScriptMetadataKey =
  (typeof AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS)[number]["metadataKey"];

export type ExistingAreaPlaceableScriptField =
  (typeof AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS)[number]["field"];

export function findAreaPlaceableScriptFieldMapping(
  field: unknown,
): (typeof AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS)[number] | undefined {
  return AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS.find((entry) => entry.field === field);
}

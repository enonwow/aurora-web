import type {
  SceneObjectPlaceableScriptSlots,
  SceneObjectSourceMetadata
} from "../../scene/contracts";

export type ExistingPlaceableScriptSlot = keyof SceneObjectPlaceableScriptSlots;

export const EXISTING_PLACEABLE_SCRIPT_SLOTS = Object.freeze([
  "onClick",
  "onClosed",
  "onDamaged",
  "onDeath",
  "onHeartbeat",
  "onInvDisturbed",
  "onLock",
  "onMeleeAttacked",
  "onOpen",
  "onSpellCastAt",
  "onUnlock",
  "onUsed",
  "onUserDefined"
] as const satisfies readonly ExistingPlaceableScriptSlot[]);

export function canEditExistingPlaceableScriptSlot(
  source: SceneObjectSourceMetadata | undefined,
  slot: ExistingPlaceableScriptSlot
): boolean {
  if (source?.type !== "aurora_git" || source.sourceKind !== "placeable") return false;
  return slot === "onUsed"
    ? source.placeableOnUsed !== undefined
    : source.placeableScriptResRefs?.[slot] !== undefined;
}

export function materializeExistingPlaceableScriptSlots(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableScriptSlots | undefined,
  draft: SceneObjectPlaceableScriptSlots,
  enabled: boolean
): SceneObjectPlaceableScriptSlots | undefined {
  const isExistingPlaceable = source?.type === "aurora_git" && source.sourceKind === "placeable";
  if (!enabled) return isExistingPlaceable && current ? { ...current } : undefined;
  if (!current) return undefined;

  const result = { ...current };
  for (const slot of EXISTING_PLACEABLE_SCRIPT_SLOTS) {
    if (canEditExistingPlaceableScriptSlot(source, slot)) result[slot] = draft[slot];
  }
  return result;
}

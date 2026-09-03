import type {
  SceneObjectPlaceableTrapSettings,
  SceneObjectSourceMetadata
} from "../../scene/contracts";

export type ExistingPlaceableTrapScriptField =
  | "onDisarmScript"
  | "onTrapTriggeredScript";

export function canEditExistingPlaceableTrapScript(
  source: SceneObjectSourceMetadata | undefined,
  field: ExistingPlaceableTrapScriptField
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "placeable" &&
    source.placeableTrapScriptResRefs?.[field] !== undefined;
}

export function materializeExistingPlaceableTrapSettings(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectPlaceableTrapSettings | undefined,
  draft: SceneObjectPlaceableTrapSettings
): SceneObjectPlaceableTrapSettings | undefined {
  if (!current) return undefined;
  const result = { ...current };
  if (canEditExistingPlaceableTrapScript(source, "onDisarmScript")) {
    result.onDisarmScript = draft.onDisarmScript;
  }
  if (canEditExistingPlaceableTrapScript(source, "onTrapTriggeredScript")) {
    result.onTrapTriggeredScript = draft.onTrapTriggeredScript;
  }
  return result;
}

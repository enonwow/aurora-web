import type { SceneObject } from "../../scene/contracts";
import type { WorkspaceModeId } from "../workspaceModes";

export type ItemPropertiesApplyPersistenceRoute =
  | Readonly<{ kind: "blueprint"; reason: "items_mode_wizard_template" }>
  | Readonly<{
      kind: "scene_only";
      reason: "area_workspace" | "not_wizard_template";
    }>
  | Readonly<{ kind: "ignore"; reason: "object_family_mismatch" }>;

export function isItemWizardBlueprintEditorObject(
  object: Pick<SceneObject, "id" | "kind">,
): boolean {
  return object.kind === "items" && object.id.startsWith("itm_wizard_");
}

export function resolveItemPropertiesApplyPersistenceRoute(
  workspaceMode: WorkspaceModeId,
  updatedObject: SceneObject,
  previousObject: SceneObject,
): ItemPropertiesApplyPersistenceRoute {
  if (updatedObject.kind !== "items" || previousObject.kind !== "items") {
    return { kind: "ignore", reason: "object_family_mismatch" };
  }
  if (workspaceMode !== "items_mode") {
    return { kind: "scene_only", reason: "area_workspace" };
  }
  if (!isItemWizardBlueprintEditorObject(updatedObject)) {
    return { kind: "scene_only", reason: "not_wizard_template" };
  }
  return { kind: "blueprint", reason: "items_mode_wizard_template" };
}

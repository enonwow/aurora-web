import type { SceneObjectCatalogType } from "./application/sceneObjectCatalogQueryFacade";

export type WorkspaceModeId = "areas_mode" | "placeables_mode";

export interface WorkspaceModeDefinition {
  id: WorkspaceModeId;
  label: string;
  description: string;
  allowedCatalogTypes: readonly SceneObjectCatalogType[];
  defaultAddType: SceneObjectCatalogType;
  defaultListType: SceneObjectCatalogType;
  showAreaSelectionPanel: boolean;
  showSceneObjectAddPanel: boolean;
  showSceneObjectListPanel: boolean;
}

export const DEFAULT_WORKSPACE_MODE_ID: WorkspaceModeId = "areas_mode";

const AREAS_MODE_ALLOWED_CATALOG_TYPES: readonly SceneObjectCatalogType[] = [
  "all",
  "placeables",
  "creatures",
  "doors",
  "items",
  "sounds",
  "vfx",
  "encounters",
  "triggers",
  "waypoints",
  "stores",
  "ground_items"
];

const PLACEABLES_MODE_ALLOWED_CATALOG_TYPES: readonly SceneObjectCatalogType[] = ["placeables"];

const WORKSPACE_MODES: Record<WorkspaceModeId, WorkspaceModeDefinition> = {
  areas_mode: {
    id: "areas_mode",
    label: "Areas Mode",
    description: "Area-focused workspace mode with area loading and full object catalog access.",
    allowedCatalogTypes: AREAS_MODE_ALLOWED_CATALOG_TYPES,
    defaultAddType: "placeables",
    defaultListType: "all",
    showAreaSelectionPanel: true,
    showSceneObjectAddPanel: true,
    showSceneObjectListPanel: true
  },
  placeables_mode: {
    id: "placeables_mode",
    label: "Placeables Mode",
    description: "Focused workspace mode for placeables authoring only.",
    allowedCatalogTypes: PLACEABLES_MODE_ALLOWED_CATALOG_TYPES,
    defaultAddType: "placeables",
    defaultListType: "placeables",
    showAreaSelectionPanel: false,
    showSceneObjectAddPanel: true,
    showSceneObjectListPanel: true
  }
};

const WORKSPACE_MODE_ORDER: readonly WorkspaceModeId[] = ["areas_mode", "placeables_mode"];

export function listWorkspaceModes(): readonly WorkspaceModeDefinition[] {
  return WORKSPACE_MODE_ORDER.map((modeId) => WORKSPACE_MODES[modeId]);
}

export function getDefaultWorkspaceModeId(): WorkspaceModeId {
  return DEFAULT_WORKSPACE_MODE_ID;
}

export function getDefaultWorkspaceMode(): WorkspaceModeDefinition {
  return WORKSPACE_MODES[DEFAULT_WORKSPACE_MODE_ID];
}

export function isWorkspaceModeId(value: unknown): value is WorkspaceModeId {
  return value === "areas_mode" || value === "placeables_mode";
}

export function resolveWorkspaceModeId(value: unknown): WorkspaceModeId {
  if (isWorkspaceModeId(value)) {
    return value;
  }
  return DEFAULT_WORKSPACE_MODE_ID;
}

export function getWorkspaceModeById(modeId: WorkspaceModeId): WorkspaceModeDefinition {
  return WORKSPACE_MODES[modeId];
}

export function resolveWorkspaceMode(value: unknown): WorkspaceModeDefinition {
  return getWorkspaceModeById(resolveWorkspaceModeId(value));
}

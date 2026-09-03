import type { SceneObject } from "../../scene/contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";
import { readDynamicAreaWaypointConstructionDefaults } from
  "../../scene/domain/areaWaypointDynamicConstructionProfile";
import type { WaypointApiListItem } from "../contracts";

const WAYPOINT_TEMPLATE_X = 0.5;
const WAYPOINT_TEMPLATE_Y = 0.5;

function sanitizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return normalized.length > 0 ? normalized : fallback;
}

function readString(
  metadata: WaypointApiListItem["metadata"],
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function mapWaypointApiListItemToSceneObject(
  waypoint: WaypointApiListItem,
  sequence = 1,
): SceneObject {
  const constructionDefaults = readDynamicAreaWaypointConstructionDefaults(waypoint);
  const object = createNewSceneObject(
    "waypoints",
    WAYPOINT_TEMPLATE_X,
    WAYPOINT_TEMPLATE_Y,
    sequence,
  );
  const normalizedTemplateId = sanitizeIdentifier(waypoint.templateId, `waypoint_${sequence}`);
  const templateResRef = constructionDefaults?.resRef ??
    readString(waypoint.metadata, "templateResRef") ?? waypoint.resref;
  const tag = constructionDefaults?.tag ?? readString(waypoint.metadata, "tag") ?? waypoint.resref;
  const localizedName = readString(waypoint.metadata, "localizedName") ??
    readString(waypoint.metadata, "displayName");
  return {
    ...object,
    id: `wpt_template_${normalizedTemplateId}`,
    name: localizedName ?? waypoint.name,
    resRef: templateResRef,
    tag,
    previewImageUrl: waypoint.previewImageUrl.trim() || undefined,
    source: constructionDefaults?.source ?? {
      type: "aurora_git",
      sourceObjectId: waypoint.templateId,
      sourceKind: "waypoint",
      templateId: waypoint.templateId,
    },
  };
}

import type { AreaScene, SceneObject, SceneObjectKind } from "../../scene/contracts";
import {
  createSeedAreaScene,
  normalizeSceneObjectMetadata
} from "../../scene/domain/sceneFactory";
import type { AreaApiDetail, AreaApiObjectKind } from "../contracts";

const BACKEND_KIND_TO_SCENE_KIND: Record<AreaApiObjectKind, SceneObjectKind> = {
  placeable: "placeables",
  creature: "creatures",
  item: "items"
};

function toSceneObject(
  areaId: string,
  entry: AreaApiDetail["objects"][number]
): SceneObject {
  const sceneKind = BACKEND_KIND_TO_SCENE_KIND[entry.kind];
  return normalizeSceneObjectMetadata({
    id: `${areaId}:${entry.objectId}`,
    kind: sceneKind,
    name: entry.templateId,
    resRef: entry.templateId,
    tag: entry.templateId.toUpperCase(),
    isStatic: sceneKind === "placeables",
    x: entry.x,
    y: entry.y,
    z: entry.z,
    bearing: entry.bearing,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  });
}

export function mapBackendAreaToScene(
  area: AreaApiDetail,
  now: () => number = () => Date.now()
): AreaScene {
  const seed = createSeedAreaScene(area.width, area.height);
  return {
    ...seed,
    sceneId: area.areaId,
    areaName: area.name,
    width: area.width,
    height: area.height,
    objects: area.objects.map((entry) => toSceneObject(area.areaId, entry)),
    updatedAtUnixMs: now(),
    source: "seed"
  };
}

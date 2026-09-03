import type { SceneObject } from "../../scene/contracts";
import {
  cloneAreaObjectPolygonGeometry,
  isAreaObjectPolygonGeometry,
  nativeLocalPolygonPointToSceneOffset,
} from "../../areas/domain/areaObjectPolygonGeometry";

export interface AreaObjectPolygonRenderOffset {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function resolveAreaObjectPolygonRenderOffsets(
  object: SceneObject,
): readonly AreaObjectPolygonRenderOffset[] | null {
  if (object.kind !== "triggers" && object.kind !== "encounters") return null;
  const expectedSourceKind = object.kind === "triggers" ? "trigger" : "encounter";
  if (
    object.source?.type !== "aurora_git"
    || object.source.sourceKind !== expectedSourceKind
    || !Number.isSafeInteger(object.source.sourceIndex)
    || Number(object.source.sourceIndex) < 0
    || !isAreaObjectPolygonGeometry(object.source.polygonGeometry)
  ) {
    return null;
  }
  const hasTarget = Object.prototype.hasOwnProperty.call(object, "polygonGeometry");
  if (hasTarget && !isAreaObjectPolygonGeometry(object.polygonGeometry)) return null;
  const geometry = hasTarget
    ? cloneAreaObjectPolygonGeometry(object.polygonGeometry)
    : cloneAreaObjectPolygonGeometry(object.source.polygonGeometry);
  const offsets = geometry.points.map((point) => {
    const scene = nativeLocalPolygonPointToSceneOffset(point);
    return Object.freeze({
      x: scene.x,
      y: scene.z,
      z: -scene.y,
    });
  });
  const first = offsets[0];
  if (!first) return null;
  return Object.freeze([...offsets, Object.freeze({ ...first })]);
}

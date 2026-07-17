import * as THREE from "three";
import type { AreaScene } from "../../contracts";
import { findTileAtWorld } from "../../application/workspaceSceneInteraction";
import { intersectionOnGround } from "./workspaceViewportProjection";
import type { RuntimeState } from "./workspaceThreeRuntime";

export function resolveCanvasObjectAddPlacement(
  runtime: RuntimeState,
  scene: AreaScene,
  clientX: number,
  clientY: number
): { x: number; y: number; tileId: string | null } | null {
  const rect = runtime.renderer.domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const boundedClientX = Math.min(rect.right, Math.max(rect.left, clientX));
  const boundedClientY = Math.min(rect.bottom, Math.max(rect.top, clientY));
  const ndc = new THREE.Vector2(
    ((boundedClientX - rect.left) / rect.width) * 2 - 1,
    -((boundedClientY - rect.top) / rect.height) * 2 + 1
  );
  const groundHit = intersectionOnGround(runtime, ndc);
  if (!groundHit) {
    return null;
  }

  const placementX = groundHit.x;
  const placementY = groundHit.z;
  const tile = findTileAtWorld(scene, placementX, placementY);
  return {
    x: placementX,
    y: placementY,
    tileId: tile?.id ?? null
  };
}

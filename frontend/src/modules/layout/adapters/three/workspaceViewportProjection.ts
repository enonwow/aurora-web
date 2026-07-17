import * as THREE from "three";
import type { RuntimeState } from "./workspaceThreeRuntime";
import {
  CONTEXT_MENU_FALLBACK_HEIGHT_PX,
  CONTEXT_MENU_FALLBACK_WIDTH_PX,
  clampContextMenuPosition
} from "../../workspaceAnchoredOverlay";

const WORLD_OBJECT_Y = 0.2;

interface PointerLike {
  clientX: number;
  clientY: number;
}

export function pointerToNdc(runtime: RuntimeState, event: PointerLike): THREE.Vector2 {
  const rect = runtime.renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return new THREE.Vector2(x, y);
}

export function pointerToLocal(
  runtime: RuntimeState,
  event: PointerLike
): { x: number; y: number } {
  const rect = runtime.renderer.domElement.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function worldToScreen(
  runtime: RuntimeState,
  worldX: number,
  worldY: number
): { x: number; y: number } {
  const projected = new THREE.Vector3(worldX, WORLD_OBJECT_Y, worldY);
  return worldVectorToScreen(runtime, projected);
}

export function worldVectorToScreen(
  runtime: RuntimeState,
  worldPosition: THREE.Vector3
): { x: number; y: number } {
  const width = runtime.renderer.domElement.clientWidth;
  const height = runtime.renderer.domElement.clientHeight;
  const projected = worldPosition.clone().project(runtime.camera);
  return {
    x: ((projected.x + 1) * 0.5) * width,
    y: ((-projected.y + 1) * 0.5) * height
  };
}

export function resolveContextMenuAnchorScreen(
  runtime: RuntimeState,
  object: { x: number; y: number },
  objectId?: string
): { x: number; y: number } {
  if (objectId) {
    const objectMesh = runtime.objectMeshById.get(objectId);
    if (objectMesh) {
      const meshWorldPosition = new THREE.Vector3();
      objectMesh.getWorldPosition(meshWorldPosition);
      return worldVectorToScreen(runtime, meshWorldPosition);
    }
  }
  return worldToScreen(runtime, object.x, object.y);
}

export function resolveAnchoredContextMenuPosition(
  runtime: RuntimeState,
  object: { x: number; y: number },
  objectId: string | undefined,
  anchorOffsetX: number,
  anchorOffsetY: number,
  menuWidth = CONTEXT_MENU_FALLBACK_WIDTH_PX,
  menuHeight = CONTEXT_MENU_FALLBACK_HEIGHT_PX
): { x: number; y: number } {
  const anchorScreen = resolveContextMenuAnchorScreen(runtime, object, objectId);
  const preferredX = anchorScreen.x + anchorOffsetX;
  const preferredY = anchorScreen.y + anchorOffsetY;
  const viewportWidth = runtime.renderer.domElement.clientWidth;
  const viewportHeight = runtime.renderer.domElement.clientHeight;
  return clampContextMenuPosition(
    preferredX,
    preferredY,
    viewportWidth,
    viewportHeight,
    menuWidth,
    menuHeight
  );
}

export function intersectionOnGround(
  runtime: RuntimeState,
  ndc: THREE.Vector2
): THREE.Vector3 | null {
  runtime.raycaster.setFromCamera(ndc, runtime.camera);
  const intersection = new THREE.Vector3();
  const hit = runtime.raycaster.ray.intersectPlane(runtime.groundPlane, intersection);
  return hit ?? null;
}

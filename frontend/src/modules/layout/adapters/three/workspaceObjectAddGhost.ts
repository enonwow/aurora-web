import * as THREE from "three";
import type { ObjectAddDragPayload } from "../../application/objectAddDragPayload";
import { resolveObjectAddPayloadKey } from "../../application/workspaceSceneInteraction";
import { OBJECT_COLORS } from "./workspaceObjectMeshLayer";
import type { RuntimeState } from "./workspaceThreeRuntime";

export interface ObjectAddGhostState {
  payloadKey: string;
  mesh: THREE.Mesh;
  sceneScale: number;
}

export interface ObjectAddGhostRef {
  current: ObjectAddGhostState | null;
}

export function clearObjectAddGhostMesh(ghostRef: ObjectAddGhostRef): void {
  const current = ghostRef.current;
  if (!current) {
    return;
  }
  current.mesh.removeFromParent();
  current.mesh.geometry.dispose();
  const materials = Array.isArray(current.mesh.material)
    ? current.mesh.material
    : [current.mesh.material];
  materials.forEach((material) => material.dispose());
  ghostRef.current = null;
}

export function syncObjectAddGhostMesh(args: {
  runtime: RuntimeState;
  ghostRef: ObjectAddGhostRef;
  payload: ObjectAddDragPayload;
  placementX: number;
  placementY: number;
  objectRenderScale: number;
  wireframe: boolean;
  isInsideCanvasArea: boolean;
}): void {
  const {
    runtime,
    ghostRef,
    payload,
    placementX,
    placementY,
    objectRenderScale,
    wireframe,
    isInsideCanvasArea
  } = args;
  const payloadKey = resolveObjectAddPayloadKey(payload);
  const markerRadius = 0.24 * objectRenderScale;
  const sphereRadius = payload.kind === "sounds" ? markerRadius * 0.82 : markerRadius;
  const existingGhost = ghostRef.current;
  const shouldRecreateGhost =
    !existingGhost ||
    existingGhost.payloadKey !== payloadKey ||
    Math.abs(existingGhost.sceneScale - objectRenderScale) > 1e-6;

  if (shouldRecreateGhost) {
    clearObjectAddGhostMesh(ghostRef);
    const ghostMesh = new THREE.Mesh(
      new THREE.SphereGeometry(
        sphereRadius,
        payload.kind === "sounds" ? 18 : 22,
        payload.kind === "sounds" ? 18 : 22
      ),
      new THREE.MeshLambertMaterial({
        color: new THREE.Color(OBJECT_COLORS[payload.kind]),
        transparent: true,
        opacity: 0.7,
        wireframe,
        depthWrite: false
      })
    );
    ghostMesh.renderOrder = 30;
    ghostMesh.raycast = () => undefined;
    runtime.gizmoLayer.add(ghostMesh);
    ghostRef.current = {
      payloadKey,
      mesh: ghostMesh,
      sceneScale: objectRenderScale
    };
  }

  const activeGhost = ghostRef.current?.mesh;
  if (!activeGhost) {
    return;
  }
  const activeGhostMaterial = activeGhost.material as THREE.MeshLambertMaterial;
  activeGhostMaterial.color.set(isInsideCanvasArea ? OBJECT_COLORS[payload.kind] : "#ff5e73");
  activeGhostMaterial.opacity = isInsideCanvasArea ? 0.7 : 0.42;
  activeGhostMaterial.needsUpdate = true;
  activeGhost.position.set(placementX, markerRadius + 0.012, placementY);
}

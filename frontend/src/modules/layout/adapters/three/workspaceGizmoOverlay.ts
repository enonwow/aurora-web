import * as THREE from "three";
import type { SceneObject } from "../../contracts";
import {
  MOVE_ALLOWED_KINDS,
  isKindLocked,
  type DebugState
} from "../../application/workspaceSceneInteraction";
import type { RuntimeState } from "./workspaceThreeRuntime";

export function rebuildGizmoOverlay(
  runtime: RuntimeState,
  selectedObjectIds: string[],
  objectById: Map<string, SceneObject>,
  debugState: DebugState,
  sceneScale: number
): void {
  runtime.gizmoLayer.children.forEach((child) => {
    if ("geometry" in child && (child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
    if ("material" in child && (child as THREE.Mesh).material) {
      const material = (child as THREE.Mesh).material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    }
  });
  runtime.gizmoLayer.clear();

  if (selectedObjectIds.length === 0) {
    return;
  }

  const selectedEntries = selectedObjectIds
    .map((id) => {
      const object = objectById.get(id);
      const mesh = runtime.objectMeshById.get(id);
      if (!object || !mesh) {
        return null;
      }
      return { object, mesh };
    })
    .filter((entry): entry is { object: SceneObject; mesh: THREE.Object3D } => Boolean(entry));

  if (selectedEntries.length === 0) {
    return;
  }

  // Aurora parity: doors are anchor-bound and block generic move gizmos.
  if (selectedEntries.some((entry) => entry.object.kind === "doors")) {
    return;
  }

  const movableEntries = selectedEntries.filter(
    (entry) =>
      MOVE_ALLOWED_KINDS.has(entry.object.kind) &&
      !isKindLocked(debugState, entry.object.kind)
  );
  if (movableEntries.length === 0) {
    return;
  }

  const usesInteractiveTransformControls =
    runtime.transformControls.enabled &&
    Boolean(runtime.transformControls.object);
  if (usesInteractiveTransformControls) {
    return;
  }

  // For multi-selection we keep only the interactive gizmo, no legacy overlay.
  if (selectedEntries.length > 1) {
    return;
  }

  const anchorPosition = new THREE.Vector3();
  movableEntries.forEach((entry) => {
    anchorPosition.add(entry.mesh.position);
  });
  anchorPosition.divideScalar(movableEntries.length);

  const gizmoScale = Math.max(0.08, sceneScale);
  if (debugState.gizmoMode === "translate") {
    const gizmoAxes = new THREE.AxesHelper(1.4 * gizmoScale);
    gizmoAxes.position.copy(anchorPosition);
    runtime.gizmoLayer.add(gizmoAxes);
    return;
  }

  if (debugState.gizmoMode === "rotate") {
    const ringGeometry = new THREE.TorusGeometry(
      0.58 * gizmoScale,
      Math.max(0.008, 0.02 * gizmoScale),
      12,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#8dbdff"),
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(anchorPosition);
    ring.rotation.x = Math.PI / 2;
    runtime.gizmoLayer.add(ring);
    return;
  }

  const scaleGeometry = new THREE.BoxGeometry(
    0.95 * gizmoScale,
    0.95 * gizmoScale,
    0.95 * gizmoScale
  );
  const scaleMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#98efad"),
    wireframe: true
  });
  const scaleBox = new THREE.Mesh(scaleGeometry, scaleMaterial);
  scaleBox.position.copy(anchorPosition);
  runtime.gizmoLayer.add(scaleBox);
}

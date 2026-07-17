import * as THREE from "three";
import type {
  WorkspaceAnchoredOverlayRuntimePort,
  WorkspaceCameraRuntimePort,
  WorkspaceObjectAddRuntimePort,
  WorkspacePointerRuntimePort,
  WorkspaceSoundListenerRuntimePort,
  WorkspaceTransformRuntimePort
} from "../../ports/workspaceRenderRuntimePort";
import {
  applyOrbitPointerBindings,
  centerCameraForScene,
  type RuntimeState
} from "./workspaceThreeRuntime";
import {
  intersectionOnGround,
  pointerToLocal,
  pointerToNdc,
  resolveAnchoredContextMenuPosition,
  resolveContextMenuAnchorScreen,
  worldToScreen
} from "./workspaceViewportProjection";
import {
  clearObjectAddGhostMesh,
  syncObjectAddGhostMesh,
  type ObjectAddGhostState
} from "./workspaceObjectAddGhost";
import { resolveCanvasObjectAddPlacement } from "./workspaceObjectAddPlacement";
import { applyTransformControlsPalette } from "./workspaceTransformControls";

export interface ThreeCameraBookmark {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export const workspaceThreeCameraRuntimePort: WorkspaceCameraRuntimePort<
  RuntimeState,
  ThreeCameraBookmark
> = {
  centerCameraForScene,
  createCameraBookmark(runtime) {
    return {
      position: runtime.camera.position.clone(),
      target: runtime.controls.target.clone()
    };
  },
  restoreCameraBookmark(runtime, bookmark) {
    runtime.camera.position.copy(bookmark.position);
    runtime.controls.target.copy(bookmark.target);
    runtime.controls.update();
  }
};

export const workspaceThreeSoundListenerRuntimePort: WorkspaceSoundListenerRuntimePort<RuntimeState> =
  {
    getListenerPosition(runtime) {
      return {
        x: runtime.camera.position.x,
        y: runtime.camera.position.y,
        z: runtime.camera.position.z
      };
    }
  };

export const workspaceThreeAnchoredOverlayRuntimePort: WorkspaceAnchoredOverlayRuntimePort<RuntimeState> =
  {
    resolveAnchoredObjectPosition(
      runtime,
      object,
      objectId,
      anchorOffsetX,
      anchorOffsetY,
      overlayWidthPx,
      overlayHeightPx
    ) {
      return resolveAnchoredContextMenuPosition(
        runtime,
        object,
        objectId,
        anchorOffsetX,
        anchorOffsetY,
        overlayWidthPx,
        overlayHeightPx
      );
    },
    addCameraChangeListener(runtime, listener) {
      runtime.controls.addEventListener("change", listener);
      return () => runtime.controls.removeEventListener("change", listener);
    }
  };

export const workspaceThreePointerRuntimePort: WorkspacePointerRuntimePort<
  RuntimeState,
  THREE.Vector2
> = {
  setOrbitPointerBindings(runtime, options) {
    applyOrbitPointerBindings(runtime.controls, options);
  },
  setControlsEnabled(runtime, enabled) {
    runtime.controls.enabled = enabled;
  },
  isTransformInteractionActive(runtime) {
    return (
      runtime.transformControls.enabled &&
      (runtime.transformControls.dragging || runtime.transformControls.axis !== null)
    );
  },
  isTransformDragging(runtime) {
    return runtime.transformControls.dragging;
  },
  pointerToLocal,
  pointerToRay: pointerToNdc,
  intersectionOnGround(runtime, pointerRay) {
    const hit = intersectionOnGround(runtime, pointerRay);
    return hit ? { x: hit.x, y: hit.z } : null;
  },
  worldToScreen,
  resolveContextMenuAnchorScreen,
  findFirstObjectHitId(runtime, pointerRay, objectIds) {
    const meshCandidatesByUuid = new Map<string, THREE.Object3D>();
    objectIds.forEach((objectId) => {
      const objectMesh = runtime.objectMeshById.get(objectId);
      if (!objectMesh) {
        return;
      }
      const instancedRenderMesh = objectMesh.userData?.auroraInstancedFallbackMesh;
      const candidate =
        instancedRenderMesh instanceof THREE.Object3D ? instancedRenderMesh : objectMesh;
      meshCandidatesByUuid.set(candidate.uuid, candidate);
    });
    const meshCandidates = Array.from(meshCandidatesByUuid.values());

    runtime.raycaster.setFromCamera(pointerRay, runtime.camera);
    const intersections = runtime.raycaster.intersectObjects(meshCandidates, true);
    const firstHit = intersections[0];
    if (
      typeof firstHit?.instanceId === "number" &&
      Array.isArray(firstHit.object.userData?.objectIds)
    ) {
      return firstHit.object.userData.objectIds[firstHit.instanceId] ?? null;
    }
    return (firstHit?.object.userData.objectId as string | undefined) ?? null;
  }
};

export const workspaceThreeTransformRuntimePort: WorkspaceTransformRuntimePort<RuntimeState> = {
  applyTransformControlsPalette(runtime, gizmoMode) {
    applyTransformControlsPalette(runtime.transformControls, gizmoMode);
  },
  addTransformControlEventListener(runtime, type, listener) {
    runtime.transformControls.addEventListener(type, listener as never);
    return () => runtime.transformControls.removeEventListener(type, listener as never);
  }
};

export const workspaceThreeObjectAddRuntimePort: WorkspaceObjectAddRuntimePort<
  RuntimeState,
  ObjectAddGhostState
> = {
  clearObjectAddGhost: clearObjectAddGhostMesh,
  syncObjectAddGhost: syncObjectAddGhostMesh,
  resolveCanvasObjectAddPlacement
};

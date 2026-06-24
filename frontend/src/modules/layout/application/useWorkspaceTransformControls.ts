import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as THREE from "three";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { AreaScene, SceneHistoryState, SceneObject } from "../contracts";
import { resolveTransformControlAxisVisibility } from "../transformControlAxisVisibility";
import {
  canUseVisualTransformGizmoForObject,
  isVisualTransformGizmoMode,
  resolveGizmoTranslationDeltas,
  resolveTransformControlsMode,
  resolveVisualTransformSelectionBlockedReason,
  resolveVtScaleFactorFromAnchor
} from "../visualTransformGizmoRules";
import type {
  WorkspaceRuntimeRef,
  WorkspaceTransformRuntime,
  WorkspaceTransformRuntimePort
} from "../ports/workspaceRenderRuntimePort";
import type { WorkspaceToolbarState } from "./workspaceChromeFacade";
import { cloneSceneObject } from "./workspaceSceneObjectClone";
import {
  MOVE_ALLOWED_KINDS,
  clampHeightDeltaToSurface,
  clampTranslationDeltaToSceneBounds,
  isKindLocked,
  resolveVisibleSelectedObjects
} from "./workspaceSceneInteraction";

interface TransformGestureState {
  active: boolean;
  mode: "translate" | "rotate" | "scale" | null;
  applyVisualTransform: boolean;
  axis: string | null;
  objectIds: string[];
  startAnchorPosition: THREE.Vector3;
  startAnchorRotationY: number;
  startAnchorEuler: THREE.Euler;
  startAnchorQuaternion: THREE.Quaternion;
  startAnchorScale: THREE.Vector3;
  sourceObjects: SceneObject[];
  sourceMeshPositions: Map<string, THREE.Vector3>;
  sourceMeshRotations: Map<string, THREE.Euler>;
  sourceMeshScales: Map<string, THREE.Vector3>;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaBearingRad: number;
  deltaPitchRad: number;
  deltaYawRad: number;
  deltaRollRad: number;
  deltaScaleFactor: number;
}

function createIdleTransformGestureState(): TransformGestureState {
  return {
    active: false,
    mode: null,
    applyVisualTransform: false,
    axis: null,
    objectIds: [],
    startAnchorPosition: new THREE.Vector3(),
    startAnchorRotationY: 0,
    startAnchorEuler: new THREE.Euler(),
    startAnchorQuaternion: new THREE.Quaternion(),
    startAnchorScale: new THREE.Vector3(1, 1, 1),
    sourceObjects: [],
    sourceMeshPositions: new Map<string, THREE.Vector3>(),
    sourceMeshRotations: new Map<string, THREE.Euler>(),
    sourceMeshScales: new Map<string, THREE.Vector3>(),
    deltaX: 0,
    deltaY: 0,
    deltaZ: 0,
    deltaBearingRad: 0,
    deltaPitchRad: 0,
    deltaYawRad: 0,
    deltaRollRad: 0,
    deltaScaleFactor: 1
  };
}

interface UseWorkspaceTransformControlsArgs<TRuntime extends WorkspaceTransformRuntime> {
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  transformRuntimePort: WorkspaceTransformRuntimePort<TRuntime>;
  scene: AreaScene;
  sceneViewportPort: SceneViewportPort;
  selectedObjectIds: string[];
  objectById: Map<string, SceneObject>;
  visibleObjects: SceneObject[];
  toolbarState: WorkspaceToolbarState;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  trackTelemetry: (name: string, payload?: TelemetryPayload) => void;
  userId: string;
}

export function useWorkspaceTransformControls<TRuntime extends WorkspaceTransformRuntime>({
  runtimeRef,
  transformRuntimePort,
  scene,
  sceneViewportPort,
  selectedObjectIds,
  objectById,
  visibleObjects,
  toolbarState,
  setSceneHistory,
  setSelectedTileId,
  trackTelemetry,
  userId
}: UseWorkspaceTransformControlsArgs<TRuntime>) {
  const transformGestureRef = useRef<TransformGestureState>(createIdleTransformGestureState());

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const transformControls = runtime.transformControls;
    const gizmoMode = toolbarState.canvasDebug.gizmoMode;
    const isVisualTranslateMode = gizmoMode === "vt_translate";
    const transformControlsMode = resolveTransformControlsMode(gizmoMode);
    const visualTransformMode = isVisualTransformGizmoMode(gizmoMode);

    if (transformControls.dragging && transformGestureRef.current.active) {
      return;
    }

    if (!transformControlsMode) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const selectedObjects = resolveVisibleSelectedObjects({
      selectedObjectIds,
      objects: visibleObjects
    });
    if (selectedObjects.length === 0) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    let transformableObjects: SceneObject[] = [];
    if (visualTransformMode) {
      const blockedReason = resolveVisualTransformSelectionBlockedReason(
        selectedObjects,
        toolbarState.canvasDebug
      );
      if (blockedReason) {
        transformGestureRef.current = createIdleTransformGestureState();
        transformControls.detach();
        transformControls.enabled = false;
        return;
      }
      transformableObjects = selectedObjects.filter(
        (object) =>
          canUseVisualTransformGizmoForObject(object) &&
          !isKindLocked(toolbarState.canvasDebug, object.kind) &&
          (!isVisualTranslateMode || object.kind !== "placeables")
      );
    } else {
      if (selectedObjects.some((object) => object.kind === "doors")) {
        transformGestureRef.current = createIdleTransformGestureState();
        transformControls.detach();
        transformControls.enabled = false;
        return;
      }

      transformableObjects = selectedObjects.filter(
        (object) =>
          MOVE_ALLOWED_KINDS.has(object.kind) &&
          !isKindLocked(toolbarState.canvasDebug, object.kind)
      );
    }

    if (transformableObjects.length === 0) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const movableIdsSet = new Set(transformableObjects.map((object) => object.id));
    const movableMeshes = selectedObjectIds
      .filter((id) => movableIdsSet.has(id))
      .map((id) => runtime.objectMeshById.get(id))
      .filter((mesh): mesh is THREE.Object3D => Boolean(mesh));
    if (movableMeshes.length === 0) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const center = new THREE.Vector3();
    movableMeshes.forEach((mesh) => {
      center.add(mesh.position);
    });
    center.divideScalar(movableMeshes.length);
    runtime.transformAnchor.position.copy(center);
    runtime.transformAnchor.rotation.set(0, 0, 0);
    runtime.transformAnchor.scale.set(1, 1, 1);
    runtime.transformAnchor.updateMatrixWorld();

    transformControls.enabled = true;
    transformControls.setSpace("world");
    transformControls.setMode(transformControlsMode);
    transformRuntimePort.applyTransformControlsPalette(runtime, gizmoMode);
    const axisVisibility = resolveTransformControlAxisVisibility(gizmoMode);
    transformControls.showX = axisVisibility.showX;
    transformControls.showY = axisVisibility.showY;
    transformControls.showZ = axisVisibility.showZ;
    // Keep gizmo interaction continuous/predictable; keyboard nudges still use snap rules.
    transformControls.setTranslationSnap(null);
    transformControls.setRotationSnap(null);
    transformControls.attach(runtime.transformAnchor);
  }, [
    runtimeRef,
    selectedObjectIds,
    toolbarState.canvasDebug,
    transformRuntimePort,
    visibleObjects
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const transformControls = runtime.transformControls;
    const epsilon = 1e-5;

    const handleDraggingChanged = (event: { value?: unknown }) => {
      const isDragging = Boolean(event.value);
      runtime.controls.enabled = !isDragging;
    };

    const startTransformGesture = () => {
      const mode = transformControls.getMode() as "translate" | "rotate" | "scale";
      const applyVisualTransform = isVisualTransformGizmoMode(toolbarState.canvasDebug.gizmoMode);
      const selectedObjects = resolveVisibleSelectedObjects({
        selectedObjectIds,
        objects: visibleObjects
      });
      if (selectedObjects.length === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (applyVisualTransform) {
        const blockedReason = resolveVisualTransformSelectionBlockedReason(
          selectedObjects,
          toolbarState.canvasDebug
        );
        if (blockedReason) {
          transformGestureRef.current = createIdleTransformGestureState();
          return;
        }
      }

      const objectIds = selectedObjects
        .filter((object) => {
          if (applyVisualTransform) {
            return (
              canUseVisualTransformGizmoForObject(object) &&
              !isKindLocked(toolbarState.canvasDebug, object.kind) &&
              (mode !== "translate" || object.kind !== "placeables")
            );
          }
          return (
            MOVE_ALLOWED_KINDS.has(object.kind) &&
            !isKindLocked(toolbarState.canvasDebug, object.kind)
          );
        })
        .map((object) => object.id);
      if (objectIds.length === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      const sourceObjects = objectIds
        .map((id) => objectById.get(id))
        .filter((object): object is SceneObject => Boolean(object))
        .map(cloneSceneObject);
      if (sourceObjects.length === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      const sourceMeshPositions = new Map<string, THREE.Vector3>();
      const sourceMeshRotations = new Map<string, THREE.Euler>();
      const sourceMeshScales = new Map<string, THREE.Vector3>();
      objectIds.forEach((id) => {
        const mesh = runtime.objectMeshById.get(id);
        if (!mesh) {
          return;
        }
        sourceMeshPositions.set(id, mesh.position.clone());
        sourceMeshRotations.set(id, mesh.rotation.clone());
        sourceMeshScales.set(id, mesh.scale.clone());
      });

      if (sourceMeshPositions.size === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      transformGestureRef.current = {
        active: true,
        mode,
        applyVisualTransform,
        axis: transformControls.axis,
        objectIds,
        startAnchorPosition: runtime.transformAnchor.position.clone(),
        startAnchorRotationY: runtime.transformAnchor.rotation.y,
        startAnchorEuler: runtime.transformAnchor.rotation.clone(),
        startAnchorQuaternion: runtime.transformAnchor.quaternion.clone(),
        startAnchorScale: runtime.transformAnchor.scale.clone(),
        sourceObjects,
        sourceMeshPositions,
        sourceMeshRotations,
        sourceMeshScales,
        deltaX: 0,
        deltaY: 0,
        deltaZ: 0,
        deltaBearingRad: 0,
        deltaPitchRad: 0,
        deltaYawRad: 0,
        deltaRollRad: 0,
        deltaScaleFactor: 1
      };
    };

    const handleMouseDown = () => {
      startTransformGesture();
    };

    const handleMouseUp = () => {
      const resetTransformAnchor = () => {
        runtime.transformAnchor.scale.set(1, 1, 1);
        runtime.transformAnchor.updateMatrixWorld();
      };
      const gesture = transformGestureRef.current;
      if (!gesture.active || gesture.objectIds.length === 0) {
        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (gesture.mode === "translate") {
        const deltaX = gesture.deltaX;
        const deltaY = gesture.deltaY;
        const deltaZ = gesture.deltaZ;
        const hasMoveDelta =
          Math.abs(deltaX) > epsilon || Math.abs(deltaY) > epsilon || Math.abs(deltaZ) > epsilon;

        if (hasMoveDelta) {
          if (gesture.applyVisualTransform) {
            const sourceById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
            setSceneHistory((current) => {
              let nextScene = current.present;
              gesture.objectIds.forEach((id) => {
                const sourceObject = sourceById.get(id);
                if (!sourceObject) {
                  return;
                }
                nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, [id], {
                  scale: sourceObject.visualTransform.scale,
                  offsetX: sourceObject.visualTransform.offsetX + deltaX,
                  offsetY: sourceObject.visualTransform.offsetY + deltaY,
                  offsetZ: sourceObject.visualTransform.offsetZ + deltaZ,
                  pitch: sourceObject.visualTransform.pitch,
                  yaw: sourceObject.visualTransform.yaw,
                  roll: sourceObject.visualTransform.roll
                });
              });
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.vt_translate", {
              userId,
              source: "gizmo_vt_translate",
              movedCount: gesture.objectIds.length,
              deltaX,
              deltaY,
              deltaZ
            });
          } else {
            setSceneHistory((current) => {
              let nextScene = current.present;
              if (Math.abs(deltaX) > epsilon || Math.abs(deltaY) > epsilon) {
                nextScene = sceneViewportPort.translateObjectsByIds(nextScene, gesture.objectIds, {
                  x: deltaX,
                  y: deltaY
                });
              }
              if (Math.abs(deltaZ) > epsilon) {
                nextScene = sceneViewportPort.adjustObjectsHeightByIds(
                  nextScene,
                  gesture.objectIds,
                  deltaZ
                );
              }
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.move", {
              userId,
              source: "gizmo_translate",
              movedCount: gesture.objectIds.length,
              deltaX,
              deltaY,
              deltaZ
            });
          }
        }

        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (gesture.mode === "rotate") {
        if (gesture.applyVisualTransform) {
          const deltaPitchRad = gesture.deltaPitchRad;
          const deltaYawRad = gesture.deltaYawRad;
          const deltaRollRad = gesture.deltaRollRad;
          const hasRotationDelta =
            Math.abs(deltaPitchRad) > epsilon ||
            Math.abs(deltaYawRad) > epsilon ||
            Math.abs(deltaRollRad) > epsilon;
          if (hasRotationDelta) {
            const sourceById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
            setSceneHistory((current) => {
              let nextScene = current.present;
              gesture.objectIds.forEach((id) => {
                const sourceObject = sourceById.get(id);
                if (!sourceObject) {
                  return;
                }
                nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, [id], {
                  scale: sourceObject.visualTransform.scale,
                  offsetX: sourceObject.visualTransform.offsetX,
                  offsetY: sourceObject.visualTransform.offsetY,
                  offsetZ: sourceObject.visualTransform.offsetZ,
                  pitch: sourceObject.visualTransform.pitch + deltaPitchRad,
                  yaw: sourceObject.visualTransform.yaw + deltaYawRad,
                  roll: sourceObject.visualTransform.roll + deltaRollRad
                });
              });
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.vt_rotate", {
              userId,
              source: "gizmo_vt_rotate",
              rotatedCount: gesture.objectIds.length,
              deltaPitchRad,
              deltaYawRad,
              deltaRollRad
            });
          }
        } else {
          const deltaBearingRad = gesture.deltaBearingRad;
          const hasRotationDelta = Math.abs(deltaBearingRad) > epsilon;
          if (hasRotationDelta) {
            setSceneHistory((current) => {
              const nextScene = sceneViewportPort.rotateObjectsBearingByIds(
                current.present,
                gesture.objectIds,
                deltaBearingRad
              );
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.rotate_bearing", {
              userId,
              source: "gizmo_rotate_bearing_y",
              rotatedCount: gesture.objectIds.length,
              deltaBearingRad
            });
          }
        }

        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (gesture.mode === "scale") {
        const scaleFactor = gesture.deltaScaleFactor;
        const hasScaleDelta = Math.abs(scaleFactor - 1) > epsilon;
        if (hasScaleDelta && gesture.applyVisualTransform) {
          const sourceById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
          setSceneHistory((current) => {
            let nextScene = current.present;
            gesture.objectIds.forEach((id) => {
              const sourceObject = sourceById.get(id);
              if (!sourceObject) {
                return;
              }
              nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, [id], {
                scale: sourceObject.visualTransform.scale * scaleFactor,
                offsetX: sourceObject.visualTransform.offsetX,
                offsetY: sourceObject.visualTransform.offsetY,
                offsetZ: sourceObject.visualTransform.offsetZ,
                pitch: sourceObject.visualTransform.pitch,
                yaw: sourceObject.visualTransform.yaw,
                roll: sourceObject.visualTransform.roll
              });
            });
            if (nextScene === current.present) {
              return current;
            }
            return sceneViewportPort.commitHistory(current, nextScene);
          });
          setSelectedTileId(null);
          trackTelemetry("scene.objects.vt_scale", {
            userId,
            source: "gizmo_vt_scale",
            scaledCount: gesture.objectIds.length,
            scaleFactor
          });
        }

        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      resetTransformAnchor();
      transformGestureRef.current = createIdleTransformGestureState();
    };

    const handleObjectChange = () => {
      let gesture = transformGestureRef.current;
      if ((!gesture.active || gesture.objectIds.length === 0) && transformControls.dragging) {
        startTransformGesture();
        gesture = transformGestureRef.current;
      }
      if (!gesture.active || gesture.objectIds.length === 0) {
        return;
      }

      if (gesture.mode === "translate") {
        if (transformControls.axis) {
          gesture.axis = transformControls.axis;
        }
        const axis = transformControls.axis ?? gesture.axis ?? "";
        const deltas = resolveGizmoTranslationDeltas(
          gesture.startAnchorPosition,
          runtime.transformAnchor.position,
          axis,
          { vtMode: gesture.applyVisualTransform }
        );
        const deltaX = Math.abs(deltas.deltaX) > epsilon ? deltas.deltaX : 0;
        const deltaY = Math.abs(deltas.deltaY) > epsilon ? deltas.deltaY : 0;
        const deltaZ = Math.abs(deltas.deltaZ) > epsilon ? deltas.deltaZ : 0;

        const boundedDelta = gesture.applyVisualTransform
          ? { x: deltaX, y: deltaY }
          : clampTranslationDeltaToSceneBounds(scene, gesture.sourceObjects, {
              x: deltaX,
              y: deltaY
            });
        const boundedDeltaZ = clampHeightDeltaToSurface(gesture.sourceObjects, deltaZ);

        gesture.deltaX = boundedDelta.x;
        gesture.deltaY = boundedDelta.y;
        gesture.deltaZ = boundedDeltaZ;

        const sourceObjectById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
        gesture.objectIds.forEach((id) => {
          const mesh = runtime.objectMeshById.get(id);
          const sourcePosition = gesture.sourceMeshPositions.get(id);
          if (!mesh || !sourcePosition) {
            return;
          }
          const sourceObject = sourceObjectById.get(id);
          const freezeVisualXY =
            gesture.applyVisualTransform &&
            sourceObject?.kind === "placeables" &&
            (sourceObject.isStatic ?? true);
          const previewDeltaX = freezeVisualXY ? 0 : boundedDelta.x;
          const previewDeltaY = freezeVisualXY ? 0 : boundedDelta.y;
          mesh.position.set(
            sourcePosition.x + previewDeltaX,
            sourcePosition.y + boundedDeltaZ,
            sourcePosition.z + previewDeltaY
          );
        });

        const expectedAnchorX = gesture.startAnchorPosition.x + boundedDelta.x;
        const expectedAnchorY = gesture.startAnchorPosition.y + boundedDeltaZ;
        const expectedAnchorZ = gesture.startAnchorPosition.z + boundedDelta.y;
        if (
          Math.abs(runtime.transformAnchor.position.x - expectedAnchorX) > epsilon ||
          Math.abs(runtime.transformAnchor.position.y - expectedAnchorY) > epsilon ||
          Math.abs(runtime.transformAnchor.position.z - expectedAnchorZ) > epsilon
        ) {
          runtime.transformAnchor.position.set(expectedAnchorX, expectedAnchorY, expectedAnchorZ);
          runtime.transformAnchor.updateMatrixWorld();
        }
        return;
      }

      if (gesture.mode === "rotate") {
        if (transformControls.axis) {
          gesture.axis = transformControls.axis;
        }
        const axis = (transformControls.axis ?? gesture.axis ?? "").toUpperCase();
        if (gesture.applyVisualTransform) {
          const applyAllAxes = axis.length === 0 || axis === "XYZE" || axis === "E";
          const deltaPitchRadRaw = runtime.transformAnchor.rotation.x - gesture.startAnchorEuler.x;
          const deltaYawRadRaw = runtime.transformAnchor.rotation.y - gesture.startAnchorEuler.y;
          const deltaRollRadRaw = runtime.transformAnchor.rotation.z - gesture.startAnchorEuler.z;
          const deltaPitchRad =
            (applyAllAxes || axis.includes("X")) && Math.abs(deltaPitchRadRaw) > epsilon
              ? deltaPitchRadRaw
              : 0;
          const deltaYawRad =
            (applyAllAxes || axis.includes("Y")) && Math.abs(deltaYawRadRaw) > epsilon
              ? deltaYawRadRaw
              : 0;
          const deltaRollRad =
            (applyAllAxes || axis.includes("Z")) && Math.abs(deltaRollRadRaw) > epsilon
              ? deltaRollRadRaw
              : 0;
          gesture.deltaPitchRad = deltaPitchRad;
          gesture.deltaYawRad = deltaYawRad;
          gesture.deltaRollRad = deltaRollRad;

          const sourceObjectById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
          gesture.objectIds.forEach((id) => {
            const mesh = runtime.objectMeshById.get(id);
            const sourceRotation = gesture.sourceMeshRotations.get(id);
            if (!mesh || !sourceRotation) {
              return;
            }
            const sourceObject = sourceObjectById.get(id);
            const freezeVisualRotation =
              sourceObject?.kind === "placeables" && (sourceObject.isStatic ?? true);
            const previewDeltaPitch = freezeVisualRotation ? 0 : deltaPitchRad;
            const previewDeltaYaw = freezeVisualRotation ? 0 : deltaYawRad;
            const previewDeltaRoll = freezeVisualRotation ? 0 : deltaRollRad;
            mesh.rotation.set(
              sourceRotation.x + previewDeltaPitch,
              sourceRotation.y + previewDeltaYaw,
              sourceRotation.z + previewDeltaRoll
            );
          });
          return;
        }

        const supportsBearingDelta =
          axis.length === 0 || axis.includes("Y") || axis === "E" || axis === "XYZE";
        let deltaBearingRad = 0;
        if (supportsBearingDelta) {
          const up = new THREE.Vector3(0, 1, 0);
          const forward = new THREE.Vector3(0, 0, 1);
          const startForward = forward.applyQuaternion(gesture.startAnchorQuaternion);
          const currentForward = new THREE.Vector3(0, 0, 1).applyQuaternion(
            runtime.transformAnchor.quaternion
          );
          startForward.y = 0;
          currentForward.y = 0;
          if (startForward.lengthSq() > epsilon && currentForward.lengthSq() > epsilon) {
            startForward.normalize();
            currentForward.normalize();
            const cross = new THREE.Vector3().crossVectors(startForward, currentForward);
            const dot = THREE.MathUtils.clamp(startForward.dot(currentForward), -1, 1);
            deltaBearingRad = Math.atan2(cross.dot(up), dot);
          } else {
            deltaBearingRad = runtime.transformAnchor.rotation.y - gesture.startAnchorRotationY;
          }
          if (Math.abs(deltaBearingRad) <= epsilon) {
            deltaBearingRad = 0;
          }
        }
        gesture.deltaBearingRad = deltaBearingRad;

        gesture.objectIds.forEach((id) => {
          const mesh = runtime.objectMeshById.get(id);
          const sourceRotation = gesture.sourceMeshRotations.get(id);
          if (!mesh || !sourceRotation) {
            return;
          }
          mesh.rotation.set(
            sourceRotation.x,
            sourceRotation.y + deltaBearingRad,
            sourceRotation.z
          );
        });
        return;
      }

      if (gesture.mode === "scale") {
        if (!gesture.applyVisualTransform) {
          return;
        }
        if (transformControls.axis) {
          gesture.axis = transformControls.axis;
        }

        const axis = (transformControls.axis ?? gesture.axis ?? "").toUpperCase();
        const clampedScaleFactor = resolveVtScaleFactorFromAnchor(
          gesture.startAnchorScale,
          runtime.transformAnchor.scale,
          axis
        );
        gesture.deltaScaleFactor = clampedScaleFactor;

        const sourceObjectById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
        gesture.objectIds.forEach((id) => {
          const mesh = runtime.objectMeshById.get(id);
          const sourceScaleForMesh = gesture.sourceMeshScales.get(id);
          if (!mesh || !sourceScaleForMesh) {
            return;
          }
          const sourceObject = sourceObjectById.get(id);
          const freezeVisualScale =
            sourceObject?.kind === "placeables" && (sourceObject.isStatic ?? true);
          const previewScaleFactor = freezeVisualScale ? 1 : clampedScaleFactor;
          mesh.scale.set(
            sourceScaleForMesh.x * previewScaleFactor,
            sourceScaleForMesh.y * previewScaleFactor,
            sourceScaleForMesh.z * previewScaleFactor
          );
        });
      }
    };

    const removeDraggingChangedListener = transformRuntimePort.addTransformControlEventListener(
      runtime,
      "dragging-changed",
      handleDraggingChanged
    );
    const removeMouseDownListener = transformRuntimePort.addTransformControlEventListener(
      runtime,
      "mouseDown",
      handleMouseDown
    );
    const removeMouseUpListener = transformRuntimePort.addTransformControlEventListener(
      runtime,
      "mouseUp",
      handleMouseUp
    );
    const removeObjectChangeListener = transformRuntimePort.addTransformControlEventListener(
      runtime,
      "objectChange",
      handleObjectChange
    );

    return () => {
      removeDraggingChangedListener();
      removeMouseDownListener();
      removeMouseUpListener();
      removeObjectChangeListener();
    };
  }, [
    objectById,
    runtimeRef,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    setSceneHistory,
    setSelectedTileId,
    toolbarState.canvasDebug,
    trackTelemetry,
    transformRuntimePort,
    userId,
    visibleObjects
  ]);
}

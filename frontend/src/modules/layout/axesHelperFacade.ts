import * as THREE from "three";

export const BASE_AXES_HELPER_SIZE = 4.2;
const MIN_AXES_HELPER_SIZE = 0.34;
const AXES_HELPER_Y_OFFSET = 0.02;

export interface AxesHelperTransform {
  positionX: number;
  positionY: number;
  positionZ: number;
  scale: number;
}

export function resolveAxesHelperTransform(
  sceneWidth: number,
  sceneHeight: number,
  sceneScale: number
): AxesHelperTransform {
  const axesSize = THREE.MathUtils.clamp(
    BASE_AXES_HELPER_SIZE * sceneScale,
    MIN_AXES_HELPER_SIZE,
    BASE_AXES_HELPER_SIZE
  );
  return {
    // Keep XYZ helper centered for editor UX; world coordinates still use 0,0 at corner.
    positionX: sceneWidth / 2,
    positionY: AXES_HELPER_Y_OFFSET,
    positionZ: sceneHeight / 2,
    scale: axesSize / BASE_AXES_HELPER_SIZE
  };
}

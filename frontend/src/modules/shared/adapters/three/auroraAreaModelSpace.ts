import * as THREE from "three";

export const AURORA_AREA_MODEL_UNITS_TO_WORLD = 0.1;

const SCALE_METADATA_KEY = "auroraAreaModelSpaceScale";

/**
 * Maps one complete Aurora model-space subtree into the Area renderer's world
 * units. Object3D scale transforms positions and geometry, but Three.js light
 * ranges are scalar properties, so finite PointLight ranges must be converted
 * explicitly through the same source-unit scale.
 */
export function applyAuroraAreaModelSpaceScale(
  root: THREE.Object3D,
  sourceUnitScale = AURORA_AREA_MODEL_UNITS_TO_WORLD
): THREE.Object3D {
  if (!Number.isFinite(sourceUnitScale) || sourceUnitScale <= 0) {
    throw new Error("Aurora Area model-space scale must be finite and positive.");
  }

  const previousScale = Number(root.userData[SCALE_METADATA_KEY]);
  const previousScaleIsValid = Number.isFinite(previousScale) && previousScale > 0;
  const scaleRatio = sourceUnitScale / (previousScaleIsValid ? previousScale : 1);
  if (Math.abs(scaleRatio - 1) <= Number.EPSILON) {
    return root;
  }

  root.scale.multiplyScalar(scaleRatio);
  root.traverse((node) => {
    if (!(node instanceof THREE.PointLight) || node.distance <= 0) {
      return;
    }
    node.distance *= scaleRatio;
    node.userData = {
      ...node.userData,
      auroraAreaModelSpaceLightRangeScale: sourceUnitScale,
      auroraAreaModelSpaceLightRangeStatus:
        "source-light-range-mapped-to-area-world-units"
    };
  });
  root.userData = {
    ...root.userData,
    [SCALE_METADATA_KEY]: sourceUnitScale,
    auroraAreaModelSpaceScaleStatus:
      "aurora-model-units-mapped-to-area-world-units"
  };
  return root;
}

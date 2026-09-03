import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyTerrainTileVoidMaskVisibilityForTests } from "../../src/modules/layout/adapters/three/workspaceTerrainMesh";
import { resolveAreaTileRenderProfile } from "../../src/modules/tiles/domain/areaTileRenderProfile";

function createVerticalBlackMask(modelResRef: string): {
  root: THREE.Group;
  mask: THREE.Mesh;
} {
  const mask = new THREE.Mesh(
    new THREE.BoxGeometry(3, 4, 0.2),
    new THREE.MeshBasicMaterial({ name: "Aurora material black" })
  );
  mask.name = "source_black_mask";
  mask.userData = {
    aurora: { sourceMesh: "source_black_mask", textureReference: "black" }
  };
  const root = new THREE.Group();
  root.userData.auroraTerrainTileModelResRef = modelResRef;
  root.add(mask);
  return { root, mask };
}

describe("Area tile render profile regression", () => {
  it("keeps behavior source-hash-bound across a model rename and fails generic for an unknown hash", () => {
    const calibrated = resolveAreaTileRenderProfile(
      "0e6ca4c04b1548bcf71111cf3ddb1e9d7c3255aaf15816940852278588cca731"
    );
    const renamed = createVerticalBlackMask("arbitrary_renamed_model");

    expect(
      applyTerrainTileVoidMaskVisibilityForTests(renamed.root, calibrated)
        .hiddenCount
    ).toBe(1);
    expect(renamed.mask.visible).toBe(false);

    const unknown = createVerticalBlackMask("same_name_cannot_select_behavior");
    const generic = resolveAreaTileRenderProfile("f".repeat(64));

    expect(
      applyTerrainTileVoidMaskVisibilityForTests(unknown.root, generic).hiddenCount
    ).toBe(0);
    expect(unknown.mask.visible).toBe(true);
  });
});

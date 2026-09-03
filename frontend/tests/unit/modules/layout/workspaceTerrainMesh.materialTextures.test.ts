import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { isTerrainTileMaterialTextureBindingNotApplicable } from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";

describe("workspaceTerrainMesh material texture applicability", () => {
  it("does not report a texture failure for an Aurora tile model with no drawable mesh", () => {
    expect(isTerrainTileMaterialTextureBindingNotApplicable(new THREE.Group())).toBe(true);
  });

  it("keeps the existing hidden-mesh exception but requires textures for visible geometry", () => {
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    hidden.visible = false;
    expect(isTerrainTileMaterialTextureBindingNotApplicable(hidden)).toBe(true);

    const visible = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    expect(isTerrainTileMaterialTextureBindingNotApplicable(visible)).toBe(false);
  });
});

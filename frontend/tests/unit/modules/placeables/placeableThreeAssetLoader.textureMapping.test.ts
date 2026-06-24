import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { applyPlaceableTexturesToModel } from "../../../../src/modules/placeables/adapters/three/placeableThreeAssetLoader";

function createMeshWithMaterial(material: THREE.MeshStandardMaterial): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
}

describe("applyPlaceableTexturesToModel", () => {
  it("does not map global aurora texture list onto default material without explicit reference", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReferences: ["black", "stone"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const blackTexture = new THREE.Texture();
    const stoneTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["black", blackTexture],
      ["stone", stoneTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBeNull();
  });

  it("maps explicit aurora texture reference", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "stone",
        textureReferences: ["black", "stone"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const blackTexture = new THREE.Texture();
    const stoneTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["black", blackTexture],
      ["stone", stoneTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBe(stoneTexture);
  });

  it("enables alpha cutout when mapped texture uses alpha format", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "alpha_tex"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const alphaTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 0]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["alpha_tex", alphaTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.transparent).toBe(true);
    expect(material.alphaTest).toBe(0.01);
  });
});

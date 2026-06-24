import * as THREE from "three";
import {
  PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG,
  PLACEABLE_SHARED_MODEL_MATERIAL_FLAG
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import type { RuntimeState } from "./workspaceThreeRuntime";

export function clearObjectLayer(runtime: RuntimeState): void {
  const disposedPreviewTextures = new Set<THREE.Texture>();
  const disposeGeneratedPreviewTextures = (material: THREE.Material): void => {
    if (material.userData?.auroraVfxGeneratedMaterial !== true) {
      return;
    }
    const texturedMaterial = material as THREE.Material & {
      map?: THREE.Texture | null;
      alphaMap?: THREE.Texture | null;
    };
    [texturedMaterial.map, texturedMaterial.alphaMap].forEach((texture) => {
      if (
        texture &&
        material.userData?.auroraSharedTexture !== true &&
        !disposedPreviewTextures.has(texture)
      ) {
        disposedPreviewTextures.add(texture);
        texture.dispose();
      }
    });
  };
  runtime.objectLayer.children.forEach((child) => {
    child.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        if (node.geometry.userData?.[PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG] !== true) {
          node.geometry.dispose();
        }
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
          if (material.userData?.[PLACEABLE_SHARED_MODEL_MATERIAL_FLAG] === true) {
            return;
          }
          disposeGeneratedPreviewTextures(material);
          material.dispose();
        });
      }
      if (node instanceof THREE.Line) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
      if (node instanceof THREE.Sprite) {
        const spriteMaterial = node.material;
        [spriteMaterial.map, spriteMaterial.alphaMap].forEach((texture) => {
          if (
            texture &&
            spriteMaterial.userData?.auroraSharedTexture !== true &&
            !disposedPreviewTextures.has(texture)
          ) {
            disposedPreviewTextures.add(texture);
            texture.dispose();
          }
        });
        spriteMaterial.dispose();
      }
    });
  });
  runtime.objectLayer.clear();
  runtime.objectMeshById.clear();
  runtime.boundsHelpers.forEach((helper) => {
    helper.geometry.dispose();
  });
  runtime.boundsHelpers = [];
  runtime.boundsLayer.clear();
}

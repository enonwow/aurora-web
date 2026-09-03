import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyAuroraTerrainReceiverMaterialProfile } from "../../../../src/modules/layout/adapters/three/auroraTerrainReceiverMaterial";

function createSourceLitMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    name: "Aurora material sic11_floor03",
    color: new THREE.Color(0.8, 0.7, 0.6),
    transparent: true,
    opacity: 0.75,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    vertexColors: true
  });
  material.userData = {
    aurora: {
      material: {
        format: "aurora-mdl-material",
        ambient: [0.2, 0.3, 0.4],
        diffuse: [0.8, 0.6, 0.5]
      }
    }
  };
  return material;
}

describe("Aurora terrain receiver material profile", () => {
  it("preserves a source-backed lit material and installs the shared MDL lighting adapter when Area lighting is enabled", () => {
    const material = createSourceLitMaterial();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    const root = new THREE.Group();
    root.add(mesh);

    const result = applyAuroraTerrainReceiverMaterialProfile(root, {
      useAreaLighting: true
    });

    expect(mesh.material).toBe(material);
    expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(material.userData.auroraMdlMaterialLightingInstalled).toBe(true);
    expect(material.userData.auroraPlaceableLightingProofReactsToLocalPointLight).toBe(
      true
    );
    expect(result).toMatchObject({
      mode: "source_lit_use_area_lighting_enabled",
      status: "ready_source_backed_lit_receiver",
      inspectedMaterialCount: 1,
      convertedMaterialCount: 0,
      reactiveMaterialCount: 1,
      unlitReceiverMaterialCount: 0,
      sourceMaterialLightingInstalledCount: 1
    });
  });

  it("keeps the proven Toolset unlit profile only when Area lighting is disabled", () => {
    const texture = new THREE.Texture();
    const alphaMap = new THREE.Texture();
    const material = createSourceLitMaterial();
    material.map = texture;
    material.alphaMap = alphaMap;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    const root = new THREE.Group();
    root.add(mesh);

    const result = applyAuroraTerrainReceiverMaterialProfile(root, {
      useAreaLighting: false
    });

    expect(mesh.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    const basic = mesh.material as THREE.MeshBasicMaterial;
    expect(basic.map).toBe(texture);
    expect(basic.alphaMap).toBe(alphaMap);
    expect(basic.transparent).toBe(true);
    expect(basic.opacity).toBeCloseTo(0.75);
    expect(basic.alphaTest).toBeCloseTo(0.25);
    expect(basic.side).toBe(THREE.DoubleSide);
    expect(basic.depthWrite).toBe(false);
    expect(basic.depthTest).toBe(true);
    expect(basic.vertexColors).toBe(true);
    expect(result).toMatchObject({
      mode: "texture_color_unlit_use_area_lighting_disabled",
      status: "ready_explicit_unlit_profile",
      inspectedMaterialCount: 1,
      convertedMaterialCount: 1,
      reactiveMaterialCount: 0,
      unlitReceiverMaterialCount: 1
    });
  });

  it("fails closed when Area lighting is enabled but a visible receiver is already unlit", () => {
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    const root = new THREE.Group();
    root.add(mesh);

    const result = applyAuroraTerrainReceiverMaterialProfile(root, {
      useAreaLighting: true
    });

    expect(mesh.material).toBe(material);
    expect(result.status).toBe("blocked_unlit_receiver_material");
    expect(result.unlitReceiverMaterialCount).toBe(1);
    expect(material.userData.auroraPlaceableLightingProofReactsToLocalPointLight).toBe(
      false
    );
  });

  it("keeps source crop masks unlit without counting them as Area light receivers", () => {
    const receiverMaterial = createSourceLitMaterial();
    const receiver = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      receiverMaterial
    );
    const maskMaterial = createSourceLitMaterial();
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), maskMaterial);
    mask.userData.auroraTerrainVoidMaskRenderContract = "source_crop_mask";
    const root = new THREE.Group();
    root.add(receiver, mask);

    const result = applyAuroraTerrainReceiverMaterialProfile(root, {
      useAreaLighting: true
    });

    expect(receiver.material).toBe(receiverMaterial);
    expect(mask.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(result).toMatchObject({
      status: "ready_source_backed_lit_receiver",
      reactiveMaterialCount: 1,
      unlitReceiverMaterialCount: 0,
      excludedNonReceiverMaterialCount: 1
    });
  });
});

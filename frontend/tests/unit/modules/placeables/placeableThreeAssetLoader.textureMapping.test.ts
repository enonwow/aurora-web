import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPlaceableTexturesToModel,
  clearPlaceableTextureLoadQueue,
  ensurePlaceableTexture,
  ensurePlaceableTexturesByReference,
  getPlaceableMissingTextureFallbackTexture,
  PLACEABLE_TEXTURE_ANISOTROPY_CAP,
  PLACEABLE_TEXTURE_LOAD_CONCURRENCY_LIMIT,
  type PlaceableTextureRuntimeCache
} from "../../../../src/modules/placeables/adapters/three/placeableThreeAssetLoader";

afterEach(() => {
  vi.useRealTimers();
});

function createMeshWithMaterial(material: THREE.MeshStandardMaterial): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
}

function createTextureRuntime(
  texture: THREE.Texture,
  maxAnisotropy: number
): PlaceableTextureRuntimeCache {
  const loader = {
    load: (_url: string, onLoad: (loadedTexture: THREE.Texture) => void) => {
      onLoad(texture);
      return undefined;
    }
  };

  return {
    placeableTextureLoader: loader,
    placeableDdsTextureLoader: loader,
    placeableTgaTextureLoader: loader,
    placeableTextureMaxAnisotropy: maxAnisotropy,
    placeableTextureCacheByUrl: new Map(),
    placeableTexturePendingByUrl: new Map()
  };
}

function buildPltTextureFixture(): ArrayBuffer {
  const width = 2;
  const height = 2;
  const bytes = new Uint8Array(24 + width * height * 2);
  "PLT V1  ".split("").forEach((character, index) => {
    bytes[index] = character.charCodeAt(0);
  });
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 10, true);
  view.setUint32(12, 0, true);
  view.setUint32(16, width, true);
  view.setUint32(20, height, true);
  bytes.set(
    [
      10, 0,
      20, 1,
      30, 8,
      40, 9
    ],
    24
  );
  return bytes.buffer;
}

function writeSolidDxt1Block(view: DataView, offset: number, color: number): void {
  view.setUint16(offset, color, true);
  view.setUint16(offset + 2, 0, true);
  view.setUint32(offset + 4, 0, true);
}

function buildVerticalTpcDxt1Fixture(): ArrayBuffer {
  const width = 4;
  const height = 8;
  const bytes = new ArrayBuffer(20 + 16);
  const view = new DataView(bytes);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setUint32(8, 3, true);
  view.setUint32(12, 16, true);
  view.setFloat32(16, 1, true);
  writeSolidDxt1Block(view, 20, 0xf800);
  writeSolidDxt1Block(view, 28, 0x07e0);
  return bytes;
}

function buildVerticalStandardDdsDxt1Fixture(): ArrayBuffer {
  const width = 4;
  const height = 8;
  const bytes = new Uint8Array(128 + 16);
  const view = new DataView(bytes.buffer);
  writeFourCc(bytes, 0, "DDS ");
  view.setUint32(4, 124, true);
  view.setUint32(12, height, true);
  view.setUint32(16, width, true);
  view.setUint32(76, 32, true);
  view.setUint32(80, 4, true);
  writeFourCc(bytes, 84, "DXT1");
  writeSolidDxt1Block(view, 128, 0xf800);
  writeSolidDxt1Block(view, 136, 0x07e0);
  return bytes.buffer;
}

function buildSoftAlphaTpcDxt5Fixture(): ArrayBuffer {
  const width = 4;
  const height = 4;
  const bytes = new ArrayBuffer(20 + 16);
  const view = new DataView(bytes);
  view.setUint32(0, width, true);
  view.setUint32(4, height, true);
  view.setUint32(8, 4, true);
  view.setUint32(12, 16, true);
  view.setFloat32(16, 1, true);
  view.setUint8(20, 255);
  view.setUint8(21, 0);
  view.setUint8(22, 2);
  view.setUint8(23, 0);
  view.setUint8(24, 0);
  view.setUint8(25, 0);
  view.setUint8(26, 0);
  view.setUint8(27, 0);
  view.setUint16(28, 0xf800, true);
  view.setUint16(30, 0x07e0, true);
  view.setUint32(32, 0, true);
  return bytes;
}

function writeFourCc(bytes: Uint8Array, offset: number, fourCc: string): void {
  fourCc.split("").forEach((character, index) => {
    bytes[offset + index] = character.charCodeAt(0);
  });
}

function buildStandardDdsAti2Fixture(): ArrayBuffer {
  const width = 4;
  const height = 4;
  const bytes = new Uint8Array(128 + 16);
  const view = new DataView(bytes.buffer);
  writeFourCc(bytes, 0, "DDS ");
  view.setUint32(4, 124, true);
  view.setUint32(12, height, true);
  view.setUint32(16, width, true);
  view.setUint32(76, 32, true);
  view.setUint32(80, 4, true);
  writeFourCc(bytes, 84, "ATI2");
  bytes[128] = 128;
  bytes[129] = 0;
  bytes[136] = 128;
  bytes[137] = 0;
  return bytes.buffer;
}

function buildStandardDdsDxt3Fixture(): ArrayBuffer {
  const width = 4;
  const height = 4;
  const bytes = new Uint8Array(128 + 16);
  const view = new DataView(bytes.buffer);
  writeFourCc(bytes, 0, "DDS ");
  view.setUint32(4, 124, true);
  view.setUint32(12, height, true);
  view.setUint32(16, width, true);
  view.setUint32(76, 32, true);
  view.setUint32(80, 4, true);
  writeFourCc(bytes, 84, "DXT3");
  bytes[128] = 0xf8;
  for (let index = 129; index < 136; index += 1) {
    bytes[index] = 0xff;
  }
  view.setUint16(136, 0xf800, true);
  view.setUint16(138, 0x07e0, true);
  view.setUint32(140, 0, true);
  return bytes.buffer;
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

  it("maps imported primary material texture references from MDL user data", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      auroraPrimaryTextureReference: "w_greatsword"
    };
    const mesh = createMeshWithMaterial(material);
    const greatswordTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["w_greatsword", greatswordTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBe(greatswordTexture);
    expect(material.userData.auroraSelectedTextureReference).toBe("w_greatsword");
  });

  it("falls back to imported primary material references when material slots have no diffuse texture", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      auroraPrimaryTextureReference: "w_greatsword",
      aurora: {
        textureSlots: [
          { slot: 1, role: "normal", reference: "w_greatsword_n" }
        ]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const greatswordTexture = new THREE.Texture();
    const normalTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["w_greatsword", greatswordTexture],
      ["w_greatsword_n", normalTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBe(greatswordTexture);
    expect(material.normalMap).toBe(normalTexture);
    expect(material.userData.auroraSelectedTextureReference).toBe("w_greatsword");
    expect(material.userData.auroraMaterialTextureSlotRoles).toEqual(["normal"]);
  });

  it("honors skipMesh while applying placeable textures", () => {
    const skippedMaterial = new THREE.MeshStandardMaterial();
    skippedMaterial.userData = {
      auroraPrimaryTextureReference: "w_greatsword"
    };
    const appliedMaterial = new THREE.MeshStandardMaterial();
    appliedMaterial.userData = {
      auroraPrimaryTextureReference: "w_greatsword"
    };
    const skippedMesh = createMeshWithMaterial(skippedMaterial);
    skippedMesh.name = "skip-me";
    const appliedMesh = createMeshWithMaterial(appliedMaterial);
    appliedMesh.name = "apply-me";
    const model = new THREE.Group();
    model.add(skippedMesh, appliedMesh);
    const greatswordTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["w_greatsword", greatswordTexture]
    ]);

    applyPlaceableTexturesToModel(model, textures, undefined, {
      skipMesh: (mesh) => mesh.name === "skip-me"
    });

    expect(skippedMaterial.map).toBeNull();
    expect(appliedMaterial.map).toBe(greatswordTexture);
  });

  it("uses the diffuse texture as the emissive map for MDL selfillumcolor materials", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "vdr_globemin",
        material: {
          selfIllumColor: [0.1, 0.25, 0.9]
        }
      }
    };
    const mesh = createMeshWithMaterial(material);
    const globeTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([["vdr_globemin", globeTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBe(globeTexture);
    expect(material.emissiveMap).toBe(globeTexture);
    expect(material.emissive.r).toBeCloseTo(0.1);
    expect(material.emissive.g).toBeCloseTo(0.25);
    expect(material.emissive.b).toBeCloseTo(0.9);
    expect(material.emissiveIntensity).toBe(1);
    expect(material.userData.auroraSelfIllumTextureApplied).toBe(true);
    expect(material.userData.auroraSelfIllumTextureMode).toBe(
      "webviewer-diffuse-emissive-map"
    );
    expect(material.userData.auroraSelfIllumColor).toEqual([0.1, 0.25, 0.9]);
  });

  it("uses backend MTR material contract to map the source texture list for material references", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "tti01_iceclear",
        textureReferences: ["fxpa_cloud02", "fxpa_smoke01", "tti01_iceclear"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const smokeTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([["fxpa_smoke01", smokeTexture]]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_tti01_iceclear",
            materialFileName: "tti01_iceclear.mtr",
            materialObjectKey: "modules/current/materials/tti01_iceclear.mtr",
            state: {
              customShaderVS: "vslit_sm",
              customShaderFS: "fslit_sm"
            }
          }
        ],
        diagnostics: []
      }
    });

    expect(material.map).toBe(smokeTexture);
    expect(material.userData.auroraMaterialContractSource).toBe("tti01_iceclear.mtr");
    expect(material.userData.auroraMaterialCustomShaderVS).toBe("vslit_sm");
    expect(material.userData.auroraMaterialCustomShaderFS).toBe("fslit_sm");
    expect(material.userData.auroraMaterialClearCustomShader).toBe(true);
    expect(material.opacity).toBe(0);
    expect(material.depthWrite).toBe(false);
  });

  it("uses backend MTR texture0 slot as the diffuse texture", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "mtr_panel",
        textureReferences: ["panel_n", "panel_d"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const diffuseTexture = new THREE.Texture();
    const normalTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["panel_n", normalTexture],
      ["panel_d", diffuseTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_panel",
            materialFileName: "mtr_panel.mtr",
            materialObjectKey: "modules/current/materials/mtr_panel.mtr",
            state: {
              textureSlots: [
                { slot: 0, role: "diffuse", reference: "panel_d" },
                { slot: 1, role: "normal", reference: "panel_n" }
              ]
            }
          }
        ],
        diagnostics: []
      }
    });

    expect(material.map).toBe(diffuseTexture);
    expect(material.normalMap).toBe(normalTexture);
    expect(material.userData.auroraMaterialTextureSlotRoles).toEqual(["normal"]);
    expect(material.userData.auroraMaterialTextureSlotReferences).toEqual(["panel_n"]);
  });

  it("does not use normal or specular texture slots as diffuse fallback", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "mtr_panel",
        textureReferences: ["panel_n", "panel_s"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const normalTexture = new THREE.Texture();
    const specularTexture = new THREE.DataTexture(
      new Uint8Array([10, 100, 240, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([
      ["panel_n", normalTexture],
      ["panel_s", specularTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_panel",
            materialFileName: "mtr_panel.mtr",
            materialObjectKey: "modules/current/materials/mtr_panel.mtr",
            state: {
              textureSlots: [
                { slot: 1, role: "normal", reference: "panel_n" },
                { slot: 2, role: "specular", reference: "panel_s" }
              ]
            }
          }
        ],
        diagnostics: []
      }
    });

    expect(material.map).toBeNull();
    expect(material.normalMap).toBe(normalTexture);
    expect(material.roughnessMap).toBeInstanceOf(THREE.DataTexture);
    expect(material.roughnessMap).not.toBe(specularTexture);
    expect(material.roughness).toBe(1);
    expect(material.metalness).toBe(0);
    expect(material.userData.auroraMaterialTextureSlotRoles).toEqual(["normal", "specular"]);
    expect(material.userData.auroraMaterialSpecularRoughnessMode).toBe(
      "webviewer-inverted-specular"
    );
    expect(material.userData.auroraMaterialSpecularRoughnessReferences).toEqual(["panel_s"]);
    const roughnessImage = material.roughnessMap?.image as { data: Uint8Array };
    expect(Array.from(roughnessImage.data)).toEqual([245, 155, 15, 255]);
  });

  it("does not use secondary material aliases as diffuse when the exact base map is missing", () => {
    const material = new THREE.MeshStandardMaterial();
    material.name = "Aurora material d_hp019";
    material.userData = {
      aurora: {
        textureReference: "d_hp019"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const normalTexture = new THREE.Texture();
    const roughnessTexture = new THREE.Texture();
    const specularTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["d_hp019_n", normalTexture],
      ["d_hp019_r", roughnessTexture],
      ["d_hp019_s", specularTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBeNull();
  });

  it("applies backend MTR roughness, height, and emissive texture slots", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "mtr_panel"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const roughnessTexture = new THREE.Texture();
    const heightTexture = new THREE.Texture();
    const emissiveTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["panel_r", roughnessTexture],
      ["panel_h", heightTexture],
      ["panel_e", emissiveTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_panel",
            materialFileName: "mtr_panel.mtr",
            materialObjectKey: "modules/current/materials/mtr_panel.mtr",
            state: {
              textureSlots: [
                { slot: 3, role: "roughness", reference: "panel_r" },
                { slot: 4, role: "height", reference: "panel_h" },
                { slot: 5, role: "emissive", reference: "panel_e" }
              ]
            }
          }
        ],
        diagnostics: []
      }
    });

    expect(material.map).toBeNull();
    expect(material.roughnessMap).toBe(roughnessTexture);
    expect(material.bumpMap).toBe(heightTexture);
    expect(material.emissiveMap).toBe(emissiveTexture);
    expect(material.roughness).toBe(1);
    expect(material.bumpScale).toBe(0.05);
    expect(material.emissiveIntensity).toBe(1);
    expect(material.userData.auroraMaterialTextureSlotRoles).toEqual([
      "roughness",
      "height",
      "emissive"
    ]);
  });

  it("applies backend MTR material transparency and twosided source state", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "fx_panel"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const texture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([["fx_panel", texture]]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_fx_panel",
            materialFileName: "fx_panel.mtr",
            materialObjectKey: "modules/current/materials/fx_panel.mtr",
            state: {
              transparency: true,
              twoSided: true,
              renderHint: "NormalAndSpecMapped",
              roughness: 0.62,
              specularity: 0.45
            }
          }
        ],
        diagnostics: []
      }
    });

    expect(material.transparent).toBe(true);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.roughness).toBe(0.62);
    expect(material.metalness).toBeCloseTo(0.09);
    expect(material.userData.auroraMaterialTransparency).toBe(true);
    expect(material.userData.auroraMaterialTwoSided).toBe(true);
    expect(material.userData.auroraMaterialRenderHint).toBe("NormalAndSpecMapped");
    expect(material.userData.auroraMaterialRoughness).toBe(0.62);
    expect(material.userData.auroraMaterialSpecularity).toBe(0.45);
    expect(material.userData.auroraMaterialSpecularityMetalness).toBeCloseTo(0.09);
  });

  it("uses backend MTR punchthrough as a hard alpha cutout", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "fx_punch"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const texture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([["fx_punch", texture]]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_fx_punch",
            materialFileName: "fx_punch.mtr",
            materialObjectKey: "modules/current/materials/fx_punch.mtr",
            state: {
              blending: "punchthrough"
            }
          }
        ],
        diagnostics: []
      }
    });

    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.5);
    expect(material.depthWrite).toBe(true);
    expect(material.userData.auroraMaterialBlending).toBe("punchthrough");
  });

  it("applies backend TXI texture state from texture bindings", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "phod_fx_pntgrm"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const texture = new THREE.Texture();
    const bumpTexture = new THREE.Texture();
    const envTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([
      ["phod_fx_pntgrm", texture],
      ["phod_fx_pntgrm_b", bumpTexture],
      ["phod_fx_pntgrm_e", envTexture]
    ]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      textureBindings: [
        {
          reference: "phod_fx_pntgrm",
          assetId: "tex_pentagram",
          fileName: "phod_fx_pntgrm.tga",
          objectKey: "modules/current/textures/phod_fx_pntgrm.tga",
          deliveryUrl: "/cache/phod_fx_pntgrm.tga",
          txi: {
            decal: true,
            clamp: 3,
            blending: "additive",
            mipmap: false,
            filter: false,
            bumpmaptexture: "phod_fx_pntgrm_b",
            envmaptexture: "phod_fx_pntgrm_e",
            proceduretype: "cycle",
            numx: 4,
            numy: 2,
            fps: 8
          }
        }
      ]
    });

    expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.generateMipmaps).toBe(false);
    expect(texture.minFilter).toBe(THREE.NearestFilter);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.repeat.x).toBeCloseTo(0.25);
    expect(texture.repeat.y).toBeCloseTo(0.5);
    expect(texture.offset.x).toBeCloseTo(0);
    expect(texture.offset.y).toBeCloseTo(0.5);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.alphaTest).toBe(0);
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.bumpMap).toBe(bumpTexture);
    expect(material.bumpScale).toBeCloseTo(0.05);
    expect(material.envMap).toBe(envTexture);
    expect(material.envMapIntensity).toBeCloseTo(0.5);
    expect(material.userData.auroraTextureTxiReference).toBe("phod_fx_pntgrm");
    expect(material.userData.auroraTextureTxiClamp).toBe(3);
    expect(material.userData.auroraTextureTxiBumpMapTexture).toBe("phod_fx_pntgrm_b");
    expect(material.userData.auroraTextureTxiBumpMapApplied).toBe(true);
    expect(material.userData.auroraTextureTxiEnvMapTexture).toBe("phod_fx_pntgrm_e");
    expect(material.userData.auroraTextureTxiEnvMapApplied).toBe(true);
    expect(material.userData.auroraTextureTxiProcedureType).toBe("cycle");
    expect(material.userData.auroraTextureTxiCycleActive).toBe(true);
    expect(material.userData.auroraTextureTxiCycleFrameCount).toBe(8);
  });

  it("does not apply fallback texture to unresolved explicit Aurora material references", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "wit2_0004_b",
        textureReferences: ["wit2_0004b_b", "wit2_0004_b"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const smokeTexture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([["fxpa_smoke01", smokeTexture]]);

    applyPlaceableTexturesToModel(mesh, textures, smokeTexture);

    expect(material.map).toBeNull();
  });

  it("removes generated GLB fallback tint when applying Aurora textures", () => {
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x9bb0d8) });
    material.userData = {
      aurora: {
        textureReference: "waterstain"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const texture = new THREE.Texture();
    const textures = new Map<string, THREE.Texture>([["waterstain", texture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBe(texture);
    expect(material.color.getHex()).toBe(0xffffff);
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

    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.5);
    expect(material.depthWrite).toBe(true);
    expect(material.userData.auroraTextureUsesAlpha).toBe(true);
    expect(material.userData.auroraTextureUsesSoftAlpha).toBe(false);
    expect(material.userData.auroraTextureAlphaMode).toBe("cutout");
    expect(alphaTexture.userData.auroraTextureAlphaProfile).toEqual({
      usesAlpha: true,
      usesSoftAlpha: false
    });
  });

  it("disables depth writes for soft-alpha Aurora decal textures", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "waterstain"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const softAlphaTexture = new THREE.DataTexture(
      new Uint8Array([80, 120, 200, 128]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["waterstain", softAlphaTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.transparent).toBe(true);
    expect(material.alphaTest).toBe(0);
    expect(material.depthWrite).toBe(false);
    expect(material.userData.auroraTextureUsesAlpha).toBe(true);
    expect(material.userData.auroraTextureUsesSoftAlpha).toBe(true);
    expect(material.userData.auroraTextureAlphaMode).toBe("blend");
    expect(material.userData.auroraSoftAlphaDecalMaterial).toBe(true);
    expect(material.blending).toBe(THREE.MultiplyBlending);
    expect(material.premultipliedAlpha).toBe(true);
    expect(material.polygonOffset).toBe(true);
  });

  it("uses the selected MTR texture reference for soft-alpha effect decals", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "tti01_iceclear",
        textureReferences: ["fxpa_cloud02", "fxpa_smoke01", "tti01_iceclear"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const smokeTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 128]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["fxpa_smoke01", smokeTexture]]);

    applyPlaceableTexturesToModel(mesh, textures, undefined, {
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "mat_tti01_iceclear",
            materialFileName: "tti01_iceclear.mtr",
            materialObjectKey: "modules/current/materials/tti01_iceclear.mtr",
            state: {
              customShaderVS: "vslit_sm",
              customShaderFS: "fslit_sm"
            }
          }
        ],
        diagnostics: []
      }
    });

    expect(material.map).toBe(smokeTexture);
    expect(material.userData.auroraPrimaryTextureReference).toBe("tti01_iceclear");
    expect(material.userData.auroraSelectedTextureReference).toBe("fxpa_smoke01");
    expect(material.userData.auroraTextureUsesAlpha).toBe(true);
    expect(material.userData.auroraTextureUsesSoftAlpha).toBe(true);
    expect(material.userData.auroraTextureAlphaMode).toBe("blend");
    expect(material.userData.auroraSoftAlphaDecalMaterial).toBe(true);
  });

  it("keeps non-decal soft-alpha diffuse textures opaque", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "soft_alpha_cloth"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const softAlphaTexture = new THREE.DataTexture(
      new Uint8Array([80, 120, 200, 128]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["soft_alpha_cloth", softAlphaTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0);
    expect(material.depthWrite).toBe(true);
    expect(material.userData.auroraTextureUsesAlpha).toBe(true);
    expect(material.userData.auroraTextureUsesSoftAlpha).toBe(true);
    expect(material.userData.auroraTextureAlphaMode).toBe("opaque");
    expect(material.userData.auroraSoftAlphaDecalMaterial).toBe(false);
    expect(material.blending).toBe(THREE.NormalBlending);
    expect(material.polygonOffset).toBe(false);
  });

  it("alpha-blends selected non-decal transparent layers from broad Aurora reference lists without decal multiply blending", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "wit2_0004b_b",
        textureReferences: ["fxpa_cloud02", "fxpa_smoke01", "wit2_0004b_b"]
      }
    };
    const mesh = createMeshWithMaterial(material);
    const rugBorderTexture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 0, 160, 120, 100, 128]),
      2,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["wit2_0004b_b", rugBorderTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.map).toBe(rugBorderTexture);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.userData.auroraTextureAlphaMode).toBe("blend");
    expect(material.userData.auroraSoftAlphaLayerMaterial).toBe(true);
    expect(material.userData.auroraSoftAlphaDecalMaterial).toBe(false);
    expect(material.blending).toBe(THREE.NormalBlending);
  });

  it("applies Aurora magenta-key cutout for plant textures with soft alpha", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "ob_plantmag_03"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const magentaTexture = new THREE.DataTexture(
      new Uint8Array([255, 0, 255, 128]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["ob_plantmag_03", magentaTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.75);
    expect(material.depthWrite).toBe(true);
    expect(material.userData.auroraTextureAlphaMode).toBe("cutout");
    expect(material.userData.auroraMagentaKeyMaterial).toBe(true);

    const shader = {
      fragmentShader: "#include <alphatest_fragment>",
      uniforms: {}
    };
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);

    expect(shader.fragmentShader).toContain("auroraMagentaKeyColor");
    expect(shader.fragmentShader).toContain("discard");
  });

  it("applies Aurora magenta-key cutout for plant textures without alpha", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "ob_plantmag_03"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const magentaTexture = new THREE.DataTexture(
      new Uint8Array([255, 0, 255, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["ob_plantmag_03", magentaTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.5);
    expect(material.depthWrite).toBe(true);
    expect(material.userData.auroraTextureAlphaMode).toBe("cutout");
    expect(material.userData.auroraMagentaKeyMaterial).toBe(true);

    const shader = {
      fragmentShader: "#include <alphatest_fragment>",
      uniforms: {}
    };
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);

    expect(shader.fragmentShader).toContain("auroraMagentaKeyColor");
    expect(shader.fragmentShader).toContain("discard");
  });

  it("applies Aurora transparencyhint black color-key cutout for opaque textures", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "c_robe_cutout",
        material: {
          transparencyHint: 1
        }
      }
    };
    const mesh = createMeshWithMaterial(material);
    const colorKeyTexture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255, 180, 180, 180, 255]),
      2,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["c_robe_cutout", colorKeyTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.1);
    expect(material.depthWrite).toBe(true);
    expect(material.userData.auroraTextureUsesAlpha).toBe(false);
    expect(material.userData.auroraTextureAlphaMode).toBe("cutout");
    expect(material.userData.auroraTransparencyHint).toBe(1);
    expect(material.userData.auroraTransparencyHintColorKeyMaterial).toBe(true);
    expect(material.userData.auroraTransparencyHintColorKeyShaderApplied).toBe(true);

    const shader = {
      fragmentShader: "#include <alphatest_fragment>",
      uniforms: {}
    };
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);

    expect(shader.fragmentShader).toContain("auroraTransparencyHintLuminance");
    expect(shader.fragmentShader).toContain("discard");
  });

  it("applies black-key cutout for single-piece item shield texture atlases", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        textureReference: "ashto_095t"
      }
    };
    const mesh = createMeshWithMaterial(material);
    const shieldTexture = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255, 180, 180, 180, 255]),
      2,
      1,
      THREE.RGBAFormat
    );
    const textures = new Map<string, THREE.Texture>([["ashto_095t", shieldTexture]]);

    applyPlaceableTexturesToModel(mesh, textures);

    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.01);
    expect(material.depthWrite).toBe(true);
    expect(material.userData.auroraTextureAlphaMode).toBe("cutout");
    expect(material.userData.auroraItemShieldBlackKeyMaterial).toBe(true);
    expect(material.userData.auroraItemShieldBlackKeyShaderApplied).toBe(true);

    const shader = {
      fragmentShader: "#include <alphatest_fragment>",
      uniforms: {}
    };
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);

    expect(shader.fragmentShader).toContain("auroraItemShieldBlackKeyMax");
    expect(shader.fragmentShader).toContain("discard");

    const backers = mesh.children.filter(
      (child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && child.userData.auroraItemShieldBlackKeyBacker === true
    );
    expect(backers).toHaveLength(1);
    expect(backers[0].geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(backers[0].position.length()).toBeGreaterThan(0);
    expect(backers[0].material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect((backers[0].material as THREE.MeshBasicMaterial).side).toBe(THREE.DoubleSide);
    expect(
      (backers[0].material as THREE.MeshBasicMaterial).userData
        .auroraItemShieldBlackKeyBackerSourceTexture
    ).toBe("ashto_095t");

    applyPlaceableTexturesToModel(mesh, textures);

    expect(
      mesh.children.filter((child) => child.userData.auroraItemShieldBlackKeyBacker === true)
    ).toHaveLength(1);
  });

  it("configures loaded textures with capped anisotropy and mipmap-friendly filters", async () => {
    const texture = new THREE.DataTexture(new Uint8Array(4 * 4 * 4), 4, 4, THREE.RGBAFormat);
    const runtime = createTextureRuntime(texture, 16);

    const result = await ensurePlaceableTexture(runtime, "/assets/stone.tga");

    expect(result).toBe(texture);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.flipY).toBe(false);
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.anisotropy).toBe(PLACEABLE_TEXTURE_ANISOTROPY_CAP);
  });

  it("clears hung texture loader requests instead of leaving area captures pending forever", async () => {
    vi.useFakeTimers();
    const hungLoader = {
      load: () => undefined
    };
    const runtime: PlaceableTextureRuntimeCache = {
      placeableTextureLoader: hungLoader,
      placeableDdsTextureLoader: hungLoader,
      placeableTgaTextureLoader: hungLoader,
      placeableTextureMaxAnisotropy: 16,
      placeableTextureCacheByUrl: new Map(),
      placeableTexturePendingByUrl: new Map()
    };

    const request = ensurePlaceableTexture(runtime, "/assets/hung.dds");

    await vi.advanceTimersByTimeAsync(180_001);

    await expect(request).resolves.toBeNull();
    expect(runtime.placeableTexturePendingByUrl.size).toBe(0);
  });

  it("resets texture load queue diagnostics when auth headers change", async () => {
    vi.useFakeTimers();
    const hungLoader = {
      load: () => undefined
    };
    const runtime: PlaceableTextureRuntimeCache = {
      placeableTextureLoader: hungLoader,
      placeableDdsTextureLoader: hungLoader,
      placeableTgaTextureLoader: hungLoader,
      placeableTextureMaxAnisotropy: 16,
      placeableTextureCacheByUrl: new Map(),
      placeableTexturePendingByUrl: new Map(),
      container: { dataset: {} }
    };

    const request = ensurePlaceableTexture(runtime, "/assets/pre-token.dds");

    expect(runtime.container?.dataset?.placeableTextureLoadQueueActiveCount).toBe("1");

    clearPlaceableTextureLoadQueue(runtime);

    expect(runtime.container?.dataset?.placeableTextureLoadQueueActiveCount).toBe("0");
    expect(runtime.container?.dataset?.placeableTextureLoadQueuePendingCount).toBe("0");
    expect(runtime.container?.dataset?.placeableTextureLoadQueueActiveLabels).toBe("");

    await vi.advanceTimersByTimeAsync(90_001);
    await expect(request).resolves.toBeNull();
  });

  it("clears hung fetched texture bodies instead of leaving area captures pending forever", async () => {
    vi.useFakeTimers();
    const failingLoader = {
      load: (
        _url: string,
        _onLoad: (loadedTexture: THREE.Texture) => void,
        _onProgress?: (event: ProgressEvent) => void,
        onError?: (event: unknown) => void
      ) => {
        onError?.(new Error("missing texture"));
        return undefined;
      }
    };
    const runtime: PlaceableTextureRuntimeCache = {
      placeableTextureLoader: failingLoader,
      placeableDdsTextureLoader: failingLoader,
      placeableTgaTextureLoader: failingLoader,
      placeableTextureMaxAnisotropy: 16,
      placeableTextureFetch: async () => ({
        ok: true,
        arrayBuffer: () => new Promise<ArrayBuffer>(() => undefined)
      }),
      placeableTextureCacheByUrl: new Map(),
      placeableTexturePendingByUrl: new Map()
    };

    const request = ensurePlaceableTexture(runtime, "/assets/hung-body.dds");

    await vi.advanceTimersByTimeAsync(120_001);

    await expect(request).resolves.toBeNull();
    expect(runtime.placeableTexturePendingByUrl.size).toBe(0);
  });

  it("decodes Aurora PLT V1 textures through the shared texture cache", async () => {
    const fallbackLoaderTexture = new THREE.Texture();
    const runtime = createTextureRuntime(fallbackLoaderTexture, 16);
    runtime.placeableTextureFetch = async () => ({
      ok: true,
      arrayBuffer: async () => buildPltTextureFixture()
    });

    const texture = await ensurePlaceableTexture(
      runtime,
      "/api/v1/catalog/placeables/cache/creature/assets/pfh2_rfoot004.plt"
    );

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture).not.toBe(fallbackLoaderTexture);
    const image = texture?.image as { data: Uint8Array; width: number; height: number };
    expect(image.width).toBe(2);
    expect(image.height).toBe(2);
    expect(Array.from(image.data.slice(0, 16))).toEqual([
      30, 30, 30, 255,
      40, 40, 40, 255,
      10, 10, 10, 255,
      20, 20, 20, 255
    ]);
    expect(texture?.userData.auroraSourceFormat).toBe("plt-grayscale");
    expect(texture?.userData.isPLT).toBe(true);
    expect(texture?.userData.auroraIsPlt).toBe(true);
    expect(texture?.userData.pltWidth).toBe(2);
    expect(texture?.userData.pltHeight).toBe(2);
    expect(texture?.userData.numLayers).toBe(10);
    expect(texture?.userData.auroraPltUsedLayerIndices).toEqual([0, 1, 8, 9]);
    expect(texture?.userData.usedLayers).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true
    ]);
  });

  it("stores decoded Aurora TPC rows bottom-first for flipY=false placeable UVs", async () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);
    runtime.placeableTextureFetch = async () => ({
      ok: true,
      arrayBuffer: async () => buildVerticalTpcDxt1Fixture()
    });

    const texture = await ensurePlaceableTexture(runtime, "/assets/ccc_otrn15.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    const image = texture?.image as { data: Uint8Array; width: number; height: number };
    expect(image.width).toBe(4);
    expect(image.height).toBe(8);
    expect(Array.from(image.data.slice(0, 4))).toEqual([0, 255, 0, 255]);
    const finalRowStart = (image.height - 1) * image.width * 4;
    expect(Array.from(image.data.slice(finalRowStart, image.height * image.width * 4))).toEqual(
      [
        255,
        0,
        0,
        255,
        255,
        0,
        0,
        255,
        255,
        0,
        0,
        255,
        255,
        0,
        0,
        255
      ]
    );
    expect(texture?.flipY).toBe(false);
    expect(texture?.userData.auroraSourceFormat).toBe("tpc-dxt1");
    expect(texture?.userData.hasAlpha).toBe(false);
    expect(texture?.userData.isBimodal).toBe(true);
    expect(texture?.userData.auroraTextureHasAlpha).toBe(false);
    expect(texture?.userData.auroraTextureIsBimodal).toBe(true);
    expect(texture?.userData.auroraTextureSoftAlphaPixelRatio).toBe(0);
  });

  it("retries Aurora TPC fetch-decode once before falling back to texture loaders", async () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);
    const textureFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4)
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => buildVerticalTpcDxt1Fixture()
      });
    runtime.placeableTextureFetch = textureFetch;

    const texture = await ensurePlaceableTexture(runtime, "/assets/retry_tpc.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.userData.auroraSourceFormat).toBe("tpc-dxt1");
    expect(textureFetch).toHaveBeenCalledTimes(2);
  });

  it("deduplicates equivalent placeable cache asset URLs across object cache keys", async () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);
    const textureFetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => buildVerticalStandardDdsDxt1Fixture()
    }));
    runtime.placeableTextureFetch = textureFetch;
    const firstUrl =
      "/api/v1/catalog/placeables/cache/object_a/assets/de74a2ce3e9b5cdc9f197ff7.dds";
    const secondUrl =
      "/api/v1/catalog/placeables/cache/object_b/assets/de74a2ce3e9b5cdc9f197ff7.dds";

    const [firstTexture, secondTexture] = await Promise.all([
      ensurePlaceableTexture(runtime, firstUrl),
      ensurePlaceableTexture(runtime, secondUrl)
    ]);

    expect(firstTexture).toBeInstanceOf(THREE.DataTexture);
    expect(secondTexture).toBe(firstTexture);
    expect(textureFetch).toHaveBeenCalledTimes(1);
    expect(textureFetch).toHaveBeenCalledWith(
      firstUrl,
      expect.objectContaining({
        headers: {}
      })
    );
    expect(runtime.placeableTextureCacheByUrl.get(firstUrl)).toBe(firstTexture);
    expect(runtime.placeableTextureCacheByUrl.get(secondUrl)).toBe(firstTexture);
  });

  it("stores decoded standard DDS rows bottom-first for flipY=false atlas UVs", async () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);
    runtime.placeableTextureFetch = async () => ({
      ok: true,
      arrayBuffer: async () => buildVerticalStandardDdsDxt1Fixture()
    });

    const texture = await ensurePlaceableTexture(runtime, "/assets/wit2_0004_b.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    const image = texture?.image as { data: Uint8Array; width: number; height: number };
    expect(image.width).toBe(4);
    expect(image.height).toBe(8);
    expect(Array.from(image.data.slice(0, 4))).toEqual([0, 255, 0, 255]);
    const finalRowStart = (image.height - 1) * image.width * 4;
    expect(Array.from(image.data.slice(finalRowStart, finalRowStart + 4))).toEqual([
      255,
      0,
      0,
      255
    ]);
    expect(texture?.flipY).toBe(false);
    expect(texture?.userData.auroraSourceFormat).toBe("dds-dxt1");
  });

  it("stores webviewer-style alpha profile metadata for decoded Aurora TPC DXT5 textures", async () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);
    runtime.placeableTextureFetch = async () => ({
      ok: true,
      arrayBuffer: async () => buildSoftAlphaTpcDxt5Fixture()
    });

    const texture = await ensurePlaceableTexture(runtime, "/assets/creature_wing.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.userData.auroraSourceFormat).toBe("tpc-dxt5");
    expect(texture?.userData.hasAlpha).toBe(true);
    expect(texture?.userData.isBimodal).toBe(false);
    expect(texture?.userData.auroraTextureHasAlpha).toBe(true);
    expect(texture?.userData.auroraTextureIsBimodal).toBe(false);
    expect(texture?.userData.auroraTextureSoftAlphaPixelRatio).toBeCloseTo(1 / 16);
  });

  it("decodes standard DDS ATI2 normal maps through the shared texture cache", async () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);
    runtime.placeableTextureFetch = async () => ({
      ok: true,
      arrayBuffer: async () => buildStandardDdsAti2Fixture()
    });

    const texture = await ensurePlaceableTexture(runtime, "/assets/creature_normal.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.colorSpace).toBe(THREE.LinearSRGBColorSpace);
    expect(texture?.userData.auroraSourceFormat).toBe("dds-bc5");
    expect(texture?.userData.auroraTextureIsNormalMap).toBe(true);
    const image = texture?.image as { data: Uint8Array; width: number; height: number };
    expect(image.width).toBe(4);
    expect(image.height).toBe(4);
    expect(Array.from(image.data.slice(0, 4))).toEqual([128, 128, 255, 255]);
  });

  it("decodes standard DDS DXT3 alpha textures through the shared texture cache", async () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);
    runtime.placeableTextureFetch = async () => ({
      ok: true,
      arrayBuffer: async () => buildStandardDdsDxt3Fixture()
    });

    const texture = await ensurePlaceableTexture(runtime, "/assets/creature_cloak_alpha.dds");

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.userData.auroraSourceFormat).toBe("dds-dxt3");
    expect(texture?.userData.hasAlpha).toBe(true);
    expect(texture?.userData.isBimodal).toBe(false);
    expect(texture?.userData.auroraTextureHasAlpha).toBe(true);
    expect(texture?.userData.auroraTextureIsBimodal).toBe(false);
    expect(texture?.userData.auroraTextureSoftAlphaPixelRatio).toBeCloseTo(1 / 16);
    expect(texture?.userData.auroraTextureIsNormalMap).toBe(false);
    const image = texture?.image as { data: Uint8Array; width: number; height: number };
    expect(image.width).toBe(4);
    expect(image.height).toBe(4);
    expect(Array.from(image.data.slice(0, 4))).toEqual([255, 0, 0, 255]);
    const finalRowOffset = (image.height - 1) * image.width * 4;
    expect(Array.from(image.data.slice(finalRowOffset, finalRowOffset + 4))).toEqual([
      255,
      0,
      0,
      136
    ]);
  });

  it("creates a configured diagnostic fallback texture for missing source textures", () => {
    const runtime = createTextureRuntime(new THREE.Texture(), 16);

    const texture = getPlaceableMissingTextureFallbackTexture(runtime);

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.flipY).toBe(false);
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    expect(texture.userData.auroraSourceFormat).toBe("missing-texture-fallback");
    expect(texture.userData.auroraMissingTextureFallback).toBe(true);
  });
});

describe("ensurePlaceableTexturesByReference", () => {
  it("limits parallel texture fetches so late armor PLT parts do not time out in the browser queue", async () => {
    const textureCount = PLACEABLE_TEXTURE_LOAD_CONCURRENCY_LIMIT * 3 + 2;
    let activeLoads = 0;
    let maxActiveLoads = 0;
    const requestedUrls: string[] = [];
    const loader = {
      load: (url: string, onLoad: (loadedTexture: THREE.Texture) => void) => {
        activeLoads += 1;
        maxActiveLoads = Math.max(maxActiveLoads, activeLoads);
        requestedUrls.push(url);
        setTimeout(() => {
          const texture = new THREE.Texture();
          texture.name = url;
          activeLoads -= 1;
          onLoad(texture);
        }, 1);
        return undefined;
      }
    };
    const runtime: PlaceableTextureRuntimeCache = {
      placeableTextureLoader: loader,
      placeableDdsTextureLoader: loader,
      placeableTgaTextureLoader: loader,
      placeableTextureMaxAnisotropy: 1,
      placeableTextureCacheByUrl: new Map(),
      placeableTexturePendingByUrl: new Map()
    };
    const textureUrlsByReference = new Map(
      Array.from({ length: textureCount }, (_entry, index) => [
        `pmh0_test${String(index).padStart(3, "0")}`,
        `http://127.0.0.1/assets/pmh0_test${String(index).padStart(3, "0")}.plt`
      ])
    );

    const textures = await ensurePlaceableTexturesByReference(runtime, textureUrlsByReference);

    expect(textures.size).toBe(textureCount);
    expect(requestedUrls).toHaveLength(textureCount);
    expect(maxActiveLoads).toBeLessThanOrEqual(PLACEABLE_TEXTURE_LOAD_CONCURRENCY_LIMIT);
    expect(runtime.placeableTexturePendingByUrl.size).toBe(0);
  });
});

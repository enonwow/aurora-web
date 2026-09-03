import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  AURORA_MDL_SOURCE_MATERIAL_DIFFUSE_NORMALIZATION_SHADER_MARKER,
  AURORA_MDL_SOURCE_MATERIAL_LIGHTING_SHADER_MARKER,
  AURORA_MDL_SOURCE_MATERIAL_RETAIL_PROFILE,
  AURORA_TXI_ADDITIVE_DECAL_RAW_GAMMA_SHADER_MARKER,
  AURORA_TXI_DECAL_UNLIT_WHITE_SHADER_MARKER,
  installAuroraTxiAdditiveDecalRawGammaOutput,
  installAuroraTxiDecalUnlitWhite,
  installAuroraMdlSourceMaterialLighting
} from "../../../../src/modules/shared/adapters/three/auroraMdlSourceMaterialLighting";

describe("auroraMdlSourceMaterialLighting", () => {
  it("installs the source-TXI decal unlit-white lane without changing source culling", () => {
    const material = new THREE.MeshStandardMaterial({ color: 0x336699 });
    material.side = THREE.FrontSide;
    const previousOnBeforeCompile = vi.fn();
    const previousProgramCacheKey = vi.fn(() => "base-program");
    material.onBeforeCompile = previousOnBeforeCompile;
    material.customProgramCacheKey = previousProgramCacheKey;

    expect(installAuroraTxiDecalUnlitWhite(material)).toEqual({
      status: "installed"
    });

    const shader = {
      uniforms: {},
      fragmentShader: THREE.ShaderLib.standard.fragmentShader
    };
    material.onBeforeCompile(shader as never, {} as THREE.WebGLRenderer);

    expect(previousOnBeforeCompile).toHaveBeenCalledOnce();
    expect(shader.fragmentShader).toContain(
      AURORA_TXI_DECAL_UNLIT_WHITE_SHADER_MARKER
    );
    expect(shader.fragmentShader).toContain("outgoingLight = diffuseColor.rgb;");
    expect(material.customProgramCacheKey()).toBe(
      "base-program|aurora-txi-decal-unlit-white-v1"
    );
    expect(material.color.getHex()).toBe(0xffffff);
    expect(material.side).toBe(THREE.FrontSide);
    expect(material.userData).toMatchObject({
      auroraTxiDecalLightingInstalled: true,
      auroraTxiDecalLightingStatus: "source-txi-decal-unlit-white",
      auroraTxiDecalLightingPatchStatus: "applied"
    });
  });

  it("keeps an already-unlit material on the same TXI decal lane idempotently", () => {
    const material = new THREE.MeshBasicMaterial({ color: 0x224466 });
    material.side = THREE.BackSide;
    const compileHook = material.onBeforeCompile;

    expect(installAuroraTxiDecalUnlitWhite(material)).toEqual({
      status: "already-unlit"
    });
    expect(installAuroraTxiDecalUnlitWhite(material)).toEqual({
      status: "already-unlit"
    });

    expect(material.color.getHex()).toBe(0xffffff);
    expect(material.side).toBe(THREE.BackSide);
    expect(material.onBeforeCompile).toBe(compileHook);
    expect(material.userData).toMatchObject({
      auroraTxiDecalLightingInstalled: true,
      auroraTxiDecalLightingStatus: "source-txi-decal-unlit-white",
      auroraTxiDecalLightingPatchStatus: "not-required-already-unlit"
    });
  });

  it("re-encodes additive TXI decal output into the retail gamma framebuffer domain", () => {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const previousOnBeforeCompile = vi.fn();
    const previousProgramCacheKey = vi.fn(() => "base-program");
    material.onBeforeCompile = previousOnBeforeCompile;
    material.customProgramCacheKey = previousProgramCacheKey;

    expect(installAuroraTxiAdditiveDecalRawGammaOutput(material)).toEqual({
      status: "installed"
    });

    const shader = {
      uniforms: {},
      fragmentShader: THREE.ShaderLib.standard.fragmentShader
    };
    material.onBeforeCompile(shader as never, {} as THREE.WebGLRenderer);

    expect(previousOnBeforeCompile).toHaveBeenCalledOnce();
    expect(shader.fragmentShader).toContain(
      AURORA_TXI_ADDITIVE_DECAL_RAW_GAMMA_SHADER_MARKER
    );
    expect(shader.fragmentShader).toContain(
      "pow(abs(gl_FragColor.rgb), vec3(0.45454545))"
    );
    expect(material.customProgramCacheKey()).toBe(
      "base-program|aurora-txi-additive-decal-raw-gamma-v1"
    );
    expect(material.toneMapped).toBe(false);
    expect(material.userData).toMatchObject({
      auroraTxiAdditiveDecalRawGammaInstalled: true,
      auroraTxiAdditiveDecalRawGammaPatchStatus: "applied",
      auroraCanonicalColorAccumulationLane:
        "aurora_raw_gamma_additive_before_retail_bloom"
    });
  });

  it("keeps source-MDL ambient and diffuse material channels separate", () => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.9921875 });
    material.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.4, 0.6],
          diffuse: [0.8, 0.5, 0.75],
          specular: [0, 0, 0]
        }
      }
    };
    const previousOnBeforeCompile = vi.fn();
    const previousProgramCacheKey = vi.fn(() => "base-program");
    material.onBeforeCompile = previousOnBeforeCompile;
    material.customProgramCacheKey = previousProgramCacheKey;

    expect(installAuroraMdlSourceMaterialLighting(material)).toEqual({
      status: "installed",
      ambientToDiffuse: [0.047366, 0.612066, 0.612066]
    });

    const shader = {
      uniforms: {},
      fragmentShader: THREE.ShaderLib.standard.fragmentShader
    };
    material.onBeforeCompile(shader as never, {} as THREE.WebGLRenderer);

    expect(previousOnBeforeCompile).toHaveBeenCalledOnce();
    expect(
      (
        shader.uniforms as {
          auroraMdlMaterialAmbientToDiffuse: { value: THREE.Vector3 };
        }
    ).auroraMdlMaterialAmbientToDiffuse.value.toArray()
    ).toEqual([0.047366, 0.612066, 0.612066]);
    expect(shader.fragmentShader).toContain(
      AURORA_MDL_SOURCE_MATERIAL_LIGHTING_SHADER_MARKER
    );
    expect(shader.fragmentShader).toContain(
      AURORA_MDL_SOURCE_MATERIAL_DIFFUSE_NORMALIZATION_SHADER_MARKER
    );
    expect(shader.fragmentShader).toContain("return diffuseColor;");
    expect(shader.fragmentShader).not.toContain(
      "return RECIPROCAL_PI * diffuseColor;"
    );
    expect(shader.fragmentShader).toContain(
      "irradiance *= auroraMdlMaterialAmbientToDiffuse"
    );
    expect(shader.fragmentShader).toContain(
      "uniform vec3 auroraMdlMaterialAmbientToDiffuse"
    );
    expect(shader.fragmentShader).not.toContain("auroraMdlMaterialSourceDiffuse");
    expect(shader.fragmentShader).not.toContain("auroraGammaZeroLight");
    expect(shader.fragmentShader).not.toContain("#include <lights_fragment_begin>");
    expect(material.customProgramCacheKey()).toBe(
      "base-program|aurora-mdl-material-lighting-v5-enhanced-performance-linear-color:0.047366,0.612066,0.612066"
    );
    expect(material.color.r).toBeCloseTo(Math.pow(0.8, 2.2), 12);
    expect(material.color.g).toBeCloseTo(Math.pow(0.5, 2.2), 12);
    expect(material.color.b).toBeCloseTo(Math.pow(0.75, 2.2), 12);
    expect(material.roughness).toBe(0.65);
    expect(material.metalness).toBe(0);
    expect(material.userData.auroraMdlMaterialLightingStatus).toBe(
      "source-mdl-ambient-diffuse-separated"
    );
    expect(material.userData.auroraMdlMaterialLightingSource).toContain(
      "AmbientLight * materialFrontAmbient"
    );
    expect(material.userData.auroraMdlMaterialLightingSource).toContain(
      "DiffuseLight * materialFrontDiffuse"
    );
    expect(material.userData.auroraMdlMaterialLightingPatchStatus).toBe("applied");
    expect(material.userData.auroraMdlMaterialRetailProfile).toBe(
      AURORA_MDL_SOURCE_MATERIAL_RETAIL_PROFILE
    );
    expect(material.userData.auroraMdlMaterialSourceDiffuseGamma).toEqual([
      0.8,
      0.5,
      0.75
    ]);
    expect(material.userData.auroraMdlMaterialRenderedDiffuseLinear).toEqual([
      Math.pow(0.8, 2.2),
      Math.pow(0.5, 2.2),
      Math.pow(0.75, 2.2)
    ]);
    expect(material.userData.auroraMdlMaterialEnhancedSpecularBaselineStatus).toBe(
      "source-backed-performance-default-specularity"
    );
    expect(material.userData.auroraMdlMaterialGammaZeroDiffuseStatus).toBeUndefined();
  });

  it("does not overwrite source-backed MTR/specular-map material inputs", () => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.37, metalness: 0 });
    material.roughnessMap = new THREE.Texture();
    material.userData = {
      auroraMaterialRoughness: 0.37,
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [1, 1, 1],
          diffuse: [1, 1, 1],
          specular: [0, 0, 0]
        }
      }
    };

    expect(installAuroraMdlSourceMaterialLighting(material).status).toBe("installed");
    expect(material.roughness).toBe(0.37);
    expect(material.roughnessMap).toBeTruthy();
    expect(material.userData.auroraMdlMaterialEnhancedSpecularBaselineStatus).toBe(
      "preserved-explicit-roughness-input"
    );
  });

  it("preserves nonzero legacy MDL specular until its enhanced binding is proven", () => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.41, metalness: 0.2 });
    material.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [1, 1, 1],
          diffuse: [1, 1, 1],
          specular: [0.2, 0.1, 0.05]
        }
      }
    };

    expect(installAuroraMdlSourceMaterialLighting(material).status).toBe("installed");
    expect(material.roughness).toBe(0.41);
    expect(material.metalness).toBe(0.2);
    expect(material.userData.auroraMdlMaterialEnhancedSpecularBaselineStatus).toBe(
      "preserved-nonzero-source-specular-binding-pending"
    );
  });

  it("is idempotent and leaves materials without valid source-MDL channels unchanged", () => {
    const installedMaterial = new THREE.MeshStandardMaterial();
    installedMaterial.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.1, 0.2, 0.3],
          diffuse: [0.5, 0.5, 0.5]
        }
      }
    };

    expect(installAuroraMdlSourceMaterialLighting(installedMaterial).status).toBe(
      "installed"
    );
    const installedCompileHook = installedMaterial.onBeforeCompile;
    expect(installAuroraMdlSourceMaterialLighting(installedMaterial)).toEqual({
      status: "already-installed",
      ambientToDiffuse: [0.028991, 0.133209, 0.325037]
    });
    expect(installedMaterial.onBeforeCompile).toBe(installedCompileHook);

    const untouchedMaterial = new THREE.MeshStandardMaterial();
    const untouchedCompileHook = untouchedMaterial.onBeforeCompile;
    expect(installAuroraMdlSourceMaterialLighting(untouchedMaterial)).toEqual({
      status: "source-material-unavailable",
      ambientToDiffuse: null
    });
    expect(untouchedMaterial.onBeforeCompile).toBe(untouchedCompileHook);
    expect(untouchedMaterial.userData.auroraMdlMaterialLightingInstalled).toBeUndefined();
  });

  it("reinstalls the shader hook on a Three material clone", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.2, 0.2],
          diffuse: [0.8, 0.8, 0.8]
        }
      }
    };
    expect(installAuroraMdlSourceMaterialLighting(material).status).toBe("installed");

    const clone = material.clone();
    expect(clone.onBeforeCompile).not.toBe(material.onBeforeCompile);
    expect(installAuroraMdlSourceMaterialLighting(clone).status).toBe("installed");

    const shader = {
      uniforms: {},
      fragmentShader: THREE.ShaderLib.standard.fragmentShader
    };
    clone.onBeforeCompile(shader as never, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader.match(/AURORA_WEB_MDL_MATERIAL_AMBIENT/gu)).toHaveLength(1);
  });

  it("fails closed when a nonzero ambient channel has zero diffuse", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.4, 0.6],
          diffuse: [0.8, 0.5, 0]
        }
      }
    };

    expect(installAuroraMdlSourceMaterialLighting(material)).toEqual({
      status: "unsupported-zero-diffuse-channel",
      ambientToDiffuse: null
    });
    expect(material.userData.auroraMdlMaterialLightingInstalled).toBeUndefined();
  });

  it("requires converter-backed Aurora MDL material provenance", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        material: {
          ambient: [0.2, 0.2, 0.2],
          diffuse: [0.8, 0.8, 0.8]
        }
      }
    };

    expect(installAuroraMdlSourceMaterialLighting(material)).toEqual({
      status: "unsupported-source-provenance",
      ambientToDiffuse: null
    });
  });

  it.each([
    ["MeshBasicMaterial", () => new THREE.MeshBasicMaterial()],
    ["ShaderMaterial", () => new THREE.ShaderMaterial()],
    ["RawShaderMaterial", () => new THREE.RawShaderMaterial()]
  ])("leaves the unlit %s lane untouched", (_name, createMaterial) => {
    const material = createMaterial();
    material.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.2, 0.2],
          diffuse: [0.8, 0.8, 0.8]
        }
      }
    };
    const originalCompileHook = material.onBeforeCompile;
    const originalProgramCacheKey = material.customProgramCacheKey;

    expect(installAuroraMdlSourceMaterialLighting(material)).toEqual({
      status: "unsupported-material",
      ambientToDiffuse: null
    });
    expect(material.onBeforeCompile).toBe(originalCompileHook);
    expect(material.customProgramCacheKey).toBe(originalProgramCacheKey);
    expect(material.userData.auroraMdlMaterialLightingInstalled).toBeUndefined();
    expect(material.needsUpdate).toBeUndefined();
  });

  it("fails fast when Three's lit-material shader shape is not recognized", () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData = {
      aurora: {
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.2, 0.2],
          diffuse: [0.8, 0.8, 0.8]
        }
      }
    };
    installAuroraMdlSourceMaterialLighting(material);

    expect(() =>
      material.onBeforeCompile(
        { uniforms: {}, fragmentShader: "void main() {}" } as never,
        {} as THREE.WebGLRenderer
      )
    ).toThrow(/expected one common include, got 0/);
  });
});

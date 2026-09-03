import * as THREE from "three";
import {
  AURORA_ENHANCED_COLOR_SPACE_SOURCE,
  convertAuroraEnhancedGammaTripletToLinear
} from "./auroraEnhancedColorSpace";

export const AURORA_MDL_SOURCE_MATERIAL_LIGHTING_SHADER_MARKER =
  "AURORA_WEB_MDL_MATERIAL_AMBIENT";

export const AURORA_TXI_DECAL_UNLIT_WHITE_SHADER_MARKER =
  "AURORA_WEB_TXI_DECAL_UNLIT_WHITE";

export const AURORA_TXI_ADDITIVE_DECAL_RAW_GAMMA_SHADER_MARKER =
  "AURORA_WEB_TXI_ADDITIVE_DECAL_RAW_GAMMA";

export const AURORA_TXI_DECAL_UNLIT_WHITE_SOURCE =
  "Aurora nwtoolset.exe decompiled_all.c FUN_00a5f73c lines 887889-887934: material field +0x50 (TXI decal) selects glColor(1,1,1,meshAlpha) and skips the lit ambient/diffuse/specular color submission; culling remains owned by source mesh/render state, not the TXI decal field.";

export const AURORA_TXI_ADDITIVE_DECAL_RAW_GAMMA_SOURCE =
  "Active retail inc_standard.shd applies texture color space and then RevertColorSpace(pow 1/2.2) before the source-model draw reaches the framebuffer; decompiled_all.c FUN_00a471d0 selects GL_SRC_ALPHA/GL_ONE for TXI additive, so additive accumulation occurs in that gamma framebuffer before retail bloom.";

export const AURORA_MDL_SOURCE_MATERIAL_DIFFUSE_NORMALIZATION_SHADER_MARKER =
  "AURORA_WEB_MDL_DIFFUSE_NO_RECIPROCAL_PI";

export const AURORA_MDL_SOURCE_MATERIAL_RETAIL_PROFILE =
  "nwn-ee-enhanced-performance";

export const AURORA_MDL_SOURCE_MATERIAL_LIGHTING_SOURCE =
  `Active-retail inc_lighting.shd sha256 8548ea59d662829521e0618edb1511fc2a88a3ecf7108ead86829b8f3d200bf8 computes AmbientLight * materialFrontAmbient separately from DiffuseLight * materialFrontDiffuse and applies 1/PI only for LIGHT_FORCE_INDIRECTIONAL==1. Local NWN settings.tml binds graphics.lighting.enhanced=true and graphics.general.shader-quality=Performance; nwmain.exe 0x1400b4339..0x1400b44c4 emits GAMMA_CORRECTION, FRAGMENT_LIGHTING, and SHADER_QUALITY_MODE into the active shader header. ${AURORA_ENHANCED_COLOR_SPACE_SOURCE} Active retail inc_material.shd uses fSpecularityMin=0.04 and Performance fGeneratedRoughnessMax=0.65 when no explicit specular/roughness input is bound; decompiled_all.c:885322-885344 parses distinct MDL diffuse/ambient/specular lanes.`;

export type AuroraMdlSourceMaterialLightingInstallResult =
  | {
      status: "installed" | "already-installed";
      ambientToDiffuse: [number, number, number];
    }
  | {
      status:
        | "source-material-unavailable"
        | "unsupported-source-provenance"
        | "unsupported-zero-diffuse-channel"
        | "unsupported-material";
      ambientToDiffuse: null;
    };

export type AuroraTxiDecalUnlitWhiteInstallResult = {
  status: "installed" | "already-installed" | "already-unlit" | "unsupported-material";
};

export type AuroraTxiAdditiveDecalRawGammaInstallResult = {
  status: "installed" | "already-installed" | "unsupported-material";
};

const installedLightingByMaterial = new WeakMap<
  THREE.Material,
  { ambientToDiffuse: [number, number, number] }
>();

const installedTxiDecalUnlitWhiteMaterials = new WeakSet<THREE.Material>();
const installedTxiAdditiveDecalRawGammaMaterials = new WeakSet<THREE.Material>();

const AMBIENT_IRRADIANCE =
  "\tvec3 irradiance = getAmbientLightIrradiance( ambientLightColor );";
const LOCALIZED_AMBIENT_IRRADIANCE =
  `${AMBIENT_IRRADIANCE}\n\tirradiance += auroraLocalizedAmbientIrradiance;`;
const LIGHTS_FRAGMENT_INCLUDE = "#include <lights_fragment_begin>";
const COMMON_INCLUDE = "#include <common>";
const OPAQUE_FRAGMENT_INCLUDE = "#include <opaque_fragment>";
const COLORSPACE_FRAGMENT_INCLUDE = "#include <colorspace_fragment>";
const AMBIENT_TO_DIFFUSE_UNIFORM =
  "uniform vec3 auroraMdlMaterialAmbientToDiffuse;";
const THREE_LAMBERT_BRDF_PATTERN =
  /vec3 BRDF_Lambert\( const in vec3 diffuseColor \) \{\s*return RECIPROCAL_PI \* diffuseColor;\s*\}/gu;

export function installAuroraTxiDecalUnlitWhite(
  material: THREE.Material
): AuroraTxiDecalUnlitWhiteInstallResult {
  if (!("color" in material) || !(material.color instanceof THREE.Color)) {
    return { status: "unsupported-material" };
  }

  material.color.set(0xffffff);
  if (material instanceof THREE.MeshBasicMaterial) {
    material.userData = {
      ...material.userData,
      auroraTxiDecalLightingInstalled: true,
      auroraTxiDecalLightingStatus: "source-txi-decal-unlit-white",
      auroraTxiDecalLightingPatchStatus: "not-required-already-unlit",
      auroraTxiDecalLightingSource: AURORA_TXI_DECAL_UNLIT_WHITE_SOURCE
    };
    material.needsUpdate = true;
    return { status: "already-unlit" };
  }
  if (!isSupportedLitMaterial(material)) {
    return { status: "unsupported-material" };
  }
  if (installedTxiDecalUnlitWhiteMaterials.has(material)) {
    return { status: "already-installed" };
  }

  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    shader.fragmentShader = patchTxiDecalUnlitWhiteShader(shader.fragmentShader);
    material.userData.auroraTxiDecalLightingPatchStatus = "applied";
  };
  material.customProgramCacheKey = () =>
    `${previousProgramCacheKey()}|aurora-txi-decal-unlit-white-v1`;
  material.userData = {
    ...material.userData,
    auroraTxiDecalLightingInstalled: true,
    auroraTxiDecalLightingStatus: "source-txi-decal-unlit-white",
    auroraTxiDecalLightingPatchStatus: "installed-awaiting-compile",
    auroraTxiDecalLightingSource: AURORA_TXI_DECAL_UNLIT_WHITE_SOURCE
  };
  installedTxiDecalUnlitWhiteMaterials.add(material);
  material.needsUpdate = true;
  return { status: "installed" };
}

export function installAuroraTxiAdditiveDecalRawGammaOutput(
  material: THREE.Material
): AuroraTxiAdditiveDecalRawGammaInstallResult {
  if (
    !(material instanceof THREE.MeshBasicMaterial) &&
    !isSupportedLitMaterial(material)
  ) {
    return { status: "unsupported-material" };
  }
  if (installedTxiAdditiveDecalRawGammaMaterials.has(material)) {
    return { status: "already-installed" };
  }

  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    shader.fragmentShader = patchTxiAdditiveDecalRawGammaShader(
      shader.fragmentShader
    );
    material.userData.auroraTxiAdditiveDecalRawGammaPatchStatus = "applied";
  };
  material.customProgramCacheKey = () =>
    `${previousProgramCacheKey()}|aurora-txi-additive-decal-raw-gamma-v1`;
  material.toneMapped = false;
  material.userData = {
    ...material.userData,
    auroraTxiAdditiveDecalRawGammaInstalled: true,
    auroraTxiAdditiveDecalRawGammaPatchStatus: "installed-awaiting-compile",
    auroraTxiAdditiveDecalRawGammaSource:
      AURORA_TXI_ADDITIVE_DECAL_RAW_GAMMA_SOURCE,
    auroraCanonicalColorAccumulationLane:
      "aurora_raw_gamma_additive_before_retail_bloom"
  };
  installedTxiAdditiveDecalRawGammaMaterials.add(material);
  material.needsUpdate = true;
  return { status: "installed" };
}

export function installAuroraMdlSourceMaterialLighting(
  material: THREE.Material
): AuroraMdlSourceMaterialLightingInstallResult {
  if (!isSupportedLitMaterial(material)) {
    return { status: "unsupported-material", ambientToDiffuse: null };
  }

  const installedLighting = installedLightingByMaterial.get(material);
  if (installedLighting) {
    return {
      status: "already-installed",
      ambientToDiffuse: [...installedLighting.ambientToDiffuse]
    };
  }

  const aurora = isRecord(material.userData.aurora)
    ? material.userData.aurora
    : undefined;
  const sourceMaterial = isRecord(aurora?.material) ? aurora.material : undefined;
  if (!sourceMaterial) {
    return { status: "source-material-unavailable", ambientToDiffuse: null };
  }
  if (sourceMaterial?.format !== "aurora-mdl-material") {
    return { status: "unsupported-source-provenance", ambientToDiffuse: null };
  }
  const ambient = readVector3Tuple(sourceMaterial?.ambient);
  const diffuse = readVector3Tuple(sourceMaterial?.diffuse);
  if (!ambient || !diffuse) {
    return { status: "source-material-unavailable", ambientToDiffuse: null };
  }
  if (
    diffuse.some(
      (component, index) =>
        Math.abs(component) <= 1e-8 && Math.abs(ambient[index] ?? 0) > 1e-8
    )
  ) {
    return { status: "unsupported-zero-diffuse-channel", ambientToDiffuse: null };
  }

  const ambientLinear = convertAuroraEnhancedGammaTripletToLinear(ambient);
  const diffuseLinear = convertAuroraEnhancedGammaTripletToLinear(diffuse);

  const ambientToDiffuse: [number, number, number] = [
    round(resolveAmbientToDiffuseRatio(ambientLinear[0], diffuseLinear[0])),
    round(resolveAmbientToDiffuseRatio(ambientLinear[1], diffuseLinear[1])),
    round(resolveAmbientToDiffuseRatio(ambientLinear[2], diffuseLinear[2]))
  ];
  const ambientToDiffuseUniform = new THREE.Vector3(...ambientToDiffuse);
  const litMaterial = material as THREE.Material & { color: THREE.Color };
  litMaterial.color.setRGB(diffuseLinear[0], diffuseLinear[1], diffuseLinear[2]);
  const enhancedSpecularBaselineStatus =
    applyEnhancedPerformanceSpecularBaseline(material, sourceMaterial);
  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    shader.uniforms.auroraMdlMaterialAmbientToDiffuse = {
      value: ambientToDiffuseUniform
    };
    shader.fragmentShader = patchAmbientMaterialShader(shader.fragmentShader);
    material.userData.auroraMdlMaterialLightingPatchStatus = "applied";
  };
  material.customProgramCacheKey = () =>
    `${previousProgramCacheKey()}|aurora-mdl-material-lighting-v5-enhanced-performance-linear-color:${ambientToDiffuse
      .map(round)
      .join(",")}`;
  material.userData = {
    ...material.userData,
    auroraMdlMaterialLightingInstalled: true,
    auroraMdlMaterialSourceAmbient: [...ambient],
    auroraMdlMaterialSourceDiffuse: [...diffuse],
    auroraMdlMaterialSourceAmbientGamma: [...ambient],
    auroraMdlMaterialSourceDiffuseGamma: [...diffuse],
    auroraMdlMaterialRenderedAmbientLinear: [...ambientLinear],
    auroraMdlMaterialRenderedDiffuseLinear: [...diffuseLinear],
    auroraMdlMaterialColorSpaceStatus: "active-retail-gamma-to-linear-applied",
    auroraMdlMaterialColorSpaceSource: AURORA_ENHANCED_COLOR_SPACE_SOURCE,
    auroraMdlMaterialAmbientToDiffuse: [...ambientToDiffuse],
    auroraMdlMaterialLightingStatus: "source-mdl-ambient-diffuse-separated",
    auroraMdlMaterialLightingPatchStatus: "installed-awaiting-compile",
    auroraMdlMaterialRetailProfile: AURORA_MDL_SOURCE_MATERIAL_RETAIL_PROFILE,
    auroraMdlMaterialEnhancedSpecularBaselineStatus: enhancedSpecularBaselineStatus,
    auroraMdlMaterialLightingSource: AURORA_MDL_SOURCE_MATERIAL_LIGHTING_SOURCE
  };
  installedLightingByMaterial.set(material, { ambientToDiffuse });
  material.needsUpdate = true;
  return { status: "installed", ambientToDiffuse };
}

function patchAmbientMaterialShader(fragmentShader: string): string {
  const commonIncludeCount = fragmentShader.split(COMMON_INCLUDE).length - 1;
  if (commonIncludeCount !== 1) {
    throw new Error(
      `Aurora MDL material ambient shader patch expected one common include, got ${commonIncludeCount}.`
    );
  }

  const lightsIncludeCount = fragmentShader.split(LIGHTS_FRAGMENT_INCLUDE).length - 1;
  if (lightsIncludeCount !== 1) {
    throw new Error(
      `Aurora MDL material ambient shader patch expected one lights fragment include, got ${lightsIncludeCount}.`
    );
  }
  const lightsFragmentChunk = THREE.ShaderChunk.lights_fragment_begin;
  if (!lightsFragmentChunk) {
    throw new Error(
      "Aurora MDL material ambient shader patch could not read lights_fragment_begin."
    );
  }
  const localizedAnchorCount =
    lightsFragmentChunk.split(LOCALIZED_AMBIENT_IRRADIANCE).length - 1;
  const anchor =
    localizedAnchorCount > 0
      ? LOCALIZED_AMBIENT_IRRADIANCE
      : AMBIENT_IRRADIANCE;
  const anchorCount =
    localizedAnchorCount > 0
      ? localizedAnchorCount
      : lightsFragmentChunk.split(AMBIENT_IRRADIANCE).length - 1;
  if (anchorCount !== 1) {
    throw new Error(
      `Aurora MDL material ambient shader patch expected one ambient anchor, got ${anchorCount}.`
    );
  }
  const patchedLightsFragmentChunk = lightsFragmentChunk.replace(
    anchor,
    `${anchor}
	// ${AURORA_MDL_SOURCE_MATERIAL_LIGHTING_SHADER_MARKER}
	irradiance *= auroraMdlMaterialAmbientToDiffuse;`
  );
  const commonChunk = THREE.ShaderChunk.common;
  if (!commonChunk) {
    throw new Error(
      "Aurora MDL material diffuse shader patch could not read common."
    );
  }
  const lambertBrdfMatches = commonChunk.match(THREE_LAMBERT_BRDF_PATTERN);
  if (lambertBrdfMatches?.length !== 1) {
    throw new Error(
      `Aurora MDL material diffuse shader patch expected one Lambert BRDF anchor, got ${lambertBrdfMatches?.length ?? 0}.`
    );
  }
  const patchedCommonChunk = commonChunk.replace(
    THREE_LAMBERT_BRDF_PATTERN,
    `vec3 BRDF_Lambert( const in vec3 diffuseColor ) {

	// ${AURORA_MDL_SOURCE_MATERIAL_DIFFUSE_NORMALIZATION_SHADER_MARKER}
	return diffuseColor;

}`
  );
  return fragmentShader
    .replace(
      COMMON_INCLUDE,
      `${patchedCommonChunk}
${AMBIENT_TO_DIFFUSE_UNIFORM}`
    )
    .replace(LIGHTS_FRAGMENT_INCLUDE, patchedLightsFragmentChunk);
}

function patchTxiDecalUnlitWhiteShader(fragmentShader: string): string {
  const opaqueIncludeCount =
    fragmentShader.split(OPAQUE_FRAGMENT_INCLUDE).length - 1;
  if (opaqueIncludeCount !== 1) {
    throw new Error(
      `Aurora TXI decal shader patch expected one opaque fragment include, got ${opaqueIncludeCount}.`
    );
  }
  return fragmentShader.replace(
    OPAQUE_FRAGMENT_INCLUDE,
    `// ${AURORA_TXI_DECAL_UNLIT_WHITE_SHADER_MARKER}\n\toutgoingLight = diffuseColor.rgb;\n${OPAQUE_FRAGMENT_INCLUDE}`
  );
}

function patchTxiAdditiveDecalRawGammaShader(fragmentShader: string): string {
  const colorspaceIncludeCount =
    fragmentShader.split(COLORSPACE_FRAGMENT_INCLUDE).length - 1;
  if (colorspaceIncludeCount !== 1) {
    throw new Error(
      `Aurora TXI additive decal raw-gamma shader patch expected one colorspace fragment include, got ${colorspaceIncludeCount}.`
    );
  }
  return fragmentShader.replace(
    COLORSPACE_FRAGMENT_INCLUDE,
    `// ${AURORA_TXI_ADDITIVE_DECAL_RAW_GAMMA_SHADER_MARKER}\n\tgl_FragColor.rgb = sign(gl_FragColor.rgb) * pow(abs(gl_FragColor.rgb), vec3(0.45454545));\n${COLORSPACE_FRAGMENT_INCLUDE}`
  );
}

function applyEnhancedPerformanceSpecularBaseline(
  material: THREE.Material,
  sourceMaterial: Record<string, unknown>
): string {
  if (!(material instanceof THREE.MeshStandardMaterial)) {
    return "not-applicable-non-standard-material";
  }
  const aurora = isRecord(material.userData.aurora)
    ? material.userData.aurora
    : undefined;
  const textureSlots = Array.isArray(aurora?.textureSlots)
    ? aurora.textureSlots
    : [];
  const hasAuthoredSpecularTextureSlot = textureSlots.some((slot) => {
    if (!isRecord(slot)) return false;
    return slot.role === "specular" || slot.role === "roughness";
  });
  const hasExplicitRoughnessInput =
    material.roughnessMap !== null ||
    hasAuthoredSpecularTextureSlot ||
    typeof material.userData.auroraMaterialRoughness === "number" ||
    typeof material.userData.auroraMaterialSpecularity === "number";
  if (hasExplicitRoughnessInput) {
    return "preserved-explicit-roughness-input";
  }
  const sourceSpecular = readVector3Tuple(sourceMaterial.specular);
  if (!sourceSpecular) {
    return "preserved-source-specular-unavailable";
  }
  if (sourceSpecular.some((component) => Math.abs(component) > 1e-8)) {
    return "preserved-nonzero-source-specular-binding-pending";
  }
  material.roughness = 0.65;
  material.metalness = 0;
  return "source-backed-performance-default-specularity";
}

function resolveAmbientToDiffuseRatio(ambient: number, diffuse: number): number {
  return Math.abs(diffuse) > 1e-8 ? ambient / diffuse : 0;
}

function isSupportedLitMaterial(material: THREE.Material): boolean {
  return (
    material instanceof THREE.MeshLambertMaterial ||
    material instanceof THREE.MeshPhongMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshToonMaterial
  );
}

function readVector3Tuple(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const [x, y, z] = value;
  return [x, y, z].every((component) =>
    typeof component === "number" && Number.isFinite(component)
  )
    ? [x as number, y as number, z as number]
    : undefined;
}

function round(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

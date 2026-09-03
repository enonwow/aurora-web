import * as THREE from "three";
import type {
  PlaceableRenderPackageAuroraMaterialShaderParameter,
  PlaceableRenderPackageAuroraMaterialState,
  PlaceableRenderPackageAuroraShaderProgram,
  PlaceableRenderPackageAuroraTextureSlot
} from "../../contracts";

const AURORA_MTR_SHADER_INCLUDE_PATTERN =
  /^\s*#include\s+["<]([^">]+)[">]\s*$/gimu;
const AURORA_MTR_SHADER_RESOURCE_EXTENSION_PATTERN = /\.shd$/iu;
const AURORA_MTR_MAX_LIGHTS = 32;
const AURORA_MTR_MAX_BONES = 64;
const AURORA_MTR_PUNCH_ALPHA_DISCARD_VALUE = 0.2;

export const AURORA_MTR_CUSTOM_SHADER_PROFILE = {
  version: "aurora-mtr-custom-shader-profile/v1",
  buildVersion: 8193,
  buildRevision: 37,
  maxNumLights: AURORA_MTR_MAX_LIGHTS,
  maxNumBones: AURORA_MTR_MAX_BONES,
  gammaCorrection: 0,
  fragmentLighting: 0,
  postprocessingTypesEnabled: 0,
  shaderQualityMode: 0,
  keyholingEnabled: 0,
  shaderDebugMode: 0,
  source:
    "nwtoolset.exe FUN_00a71a6c shader header and zero-initialized mutable profile state"
} as const;

export interface AuroraMtrCustomShaderState {
  customShaderVS?: string;
  customShaderFS?: string;
  customShaderGS?: string;
  customShaderProgram?: PlaceableRenderPackageAuroraShaderProgram;
  parameters?: PlaceableRenderPackageAuroraMaterialShaderParameter[];
  blending?: "additive" | "punchthrough";
  sampleFramebuffer?: number;
  volumetric?: boolean;
  textureSlots?: PlaceableRenderPackageAuroraTextureSlot[];
}

export interface AuroraMtrCustomShaderSources {
  vertexShader: string;
  fragmentShader: string;
  vertexRoot: string;
  fragmentRoot: string;
  noDiscard: 0 | 1;
  reachableSourceCount: number;
  requiresEnvironmentMap: boolean;
}

export type AuroraMtrCustomShaderInstallResult =
  | {
      status: "not-requested";
      reason: "no-custom-shader-reference";
    }
  | {
      status: "refused";
      reason:
        | "geometry-shader-unsupported"
        | "source-graph-incomplete"
        | "stage-root-missing"
        | "environment-map-binding-required"
        | "skinned-mesh-binding-unavailable";
    }
  | {
      status: "installed";
      reason: "retail-source-graph-and-named-bindings-installed";
      sources: AuroraMtrCustomShaderSources;
      material: THREE.RawShaderMaterial;
    };

interface AuroraMtrTextureMaterial extends THREE.Material {
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  bumpMap?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  envMap?: THREE.Texture | null;
  color?: THREE.Color;
  emissive?: THREE.Color;
}

type AuroraMtrUniforms = Record<string, THREE.IUniform>;

export type AuroraMtrFramebufferRuntimeLane = 5 | 6;

interface AuroraMtrFramebufferBinding {
  lane: AuroraMtrFramebufferRuntimeLane;
  uniforms: AuroraMtrUniforms;
}

export function buildAuroraMtrCustomShaderSources(
  state: AuroraMtrCustomShaderState
): AuroraMtrCustomShaderSources | null {
  const program = state.customShaderProgram;
  if (program?.status !== "complete") return null;
  const vertexRoot = normalizeShaderResref(program.stageRoots.vertex ?? state.customShaderVS);
  const fragmentRoot = normalizeShaderResref(
    program.stageRoots.fragment ?? state.customShaderFS
  );
  if (!vertexRoot || !fragmentRoot || program.stageRoots.geometry || state.customShaderGS) {
    return null;
  }
  const sourcesByResref = new Map(
    program.sources.map((source) => [normalizeShaderResref(source.resref), source.source])
  );
  if (!sourcesByResref.has(vertexRoot) || !sourcesByResref.has(fragmentRoot)) {
    return null;
  }
  const noDiscard: 0 | 1 = state.blending === "punchthrough" ? 0 : 1;
  const requiresEnvironmentMap = [vertexRoot, fragmentRoot].some((root) =>
    /^\s*#define\s+ENVIRONMENT_MAP\s+1(?:\s|$)/imu.test(sourcesByResref.get(root) ?? "")
  );
  const vertexShader = `${buildAuroraShaderProfileHeader(noDiscard, "vertex")}\n${adaptAuroraShaderSourceForWebgl(
    expandAuroraShaderSource(vertexRoot, sourcesByResref, [])
  )}`;
  const fragmentShader = `${buildAuroraShaderProfileHeader(noDiscard, "fragment")}\n${adaptAuroraShaderSourceForWebgl(
    expandAuroraShaderSource(fragmentRoot, sourcesByResref, [])
  )}`;
  return {
    vertexShader,
    fragmentShader,
    vertexRoot,
    fragmentRoot,
    noDiscard,
    reachableSourceCount: program.sources.length,
    requiresEnvironmentMap
  };
}

export function installAuroraMtrCustomShaderProgram(input: {
  mesh: THREE.Mesh;
  material: THREE.Material;
  state: AuroraMtrCustomShaderState;
  texturesBySlot?: ReadonlyMap<number, THREE.Texture>;
}): AuroraMtrCustomShaderInstallResult {
  const { mesh, material, state } = input;
  if (!hasCustomShaderReference(state)) {
    return { status: "not-requested", reason: "no-custom-shader-reference" };
  }
  if (state.customShaderGS || state.customShaderProgram?.stageRoots.geometry) {
    return { status: "refused", reason: "geometry-shader-unsupported" };
  }
  if (state.customShaderProgram?.status !== "complete") {
    return { status: "refused", reason: "source-graph-incomplete" };
  }
  if (mesh instanceof THREE.SkinnedMesh) {
    return { status: "refused", reason: "skinned-mesh-binding-unavailable" };
  }
  const sources = buildAuroraMtrCustomShaderSources(state);
  if (!sources) {
    return { status: "refused", reason: "stage-root-missing" };
  }
  if (sources.requiresEnvironmentMap && !(material as AuroraMtrTextureMaterial).envMap) {
    return { status: "refused", reason: "environment-map-binding-required" };
  }

  ensureAuroraMtrShaderGeometryAttributes(mesh.geometry);
  const texturesBySlot = new Map(input.texturesBySlot ?? []);
  const uniforms = createAuroraMtrUniforms(
    material,
    state.parameters,
    sources.noDiscard,
    texturesBySlot
  );
  const executionMaterial = createAuroraMtrRawShaderMaterial(material, sources, uniforms);
  const framebufferRuntimeLane = resolveAuroraMtrFramebufferRuntimeLane(state);
  replaceMeshMaterial(mesh, material, executionMaterial);
  const previousOnBeforeRender = mesh.onBeforeRender.bind(mesh);
  mesh.onBeforeRender = (renderer, scene, camera, geometry, renderedMaterial, group) => {
    previousOnBeforeRender(renderer, scene, camera, geometry, renderedMaterial, group);
    updateAuroraMtrUniforms(
      renderer,
      scene,
      camera,
      mesh,
      material,
      uniforms,
      texturesBySlot
    );
  };
  const executionMetadata = {
    ...executionMaterial.userData,
    auroraMaterialCustomShaderCompileStatus: "webgl-program-source-installed",
    auroraMaterialCustomShaderVertexSourceBytes: sources.vertexShader.length,
    auroraMaterialCustomShaderFragmentSourceBytes: sources.fragmentShader.length,
    auroraMaterialCustomShaderExecutionStatus:
      "installed-retail-source-graph-bindings-parity-proof-pending",
    auroraMaterialCustomShaderProfile: AURORA_MTR_CUSTOM_SHADER_PROFILE.version,
    auroraMaterialCustomShaderProfileSource: AURORA_MTR_CUSTOM_SHADER_PROFILE.source,
    auroraMaterialCustomShaderVertexRoot: sources.vertexRoot,
    auroraMaterialCustomShaderFragmentRoot: sources.fragmentRoot,
    auroraMaterialCustomShaderNoDiscard: sources.noDiscard,
    auroraMaterialCustomShaderReachableSourceCount: sources.reachableSourceCount,
    auroraMaterialCustomShaderEnvironmentMapRequired: sources.requiresEnvironmentMap,
    auroraMaterialCustomShaderBoundTextureSlots: [...texturesBySlot.keys()].sort(
      (left, right) => left - right
    ),
    auroraMaterialCustomShaderParameterUploadOrder: state.parameters?.map(
      (parameter) => parameter.name
    ) ?? [],
    auroraMaterialFramebufferRuntimeLane: framebufferRuntimeLane,
    auroraMaterialFramebufferExecutionStatus: framebufferRuntimeLane
      ? "source-backed-pass-awaiting-frame-capture-binding"
      : "not-applicable-default-lane",
    auroraMaterialFramebufferCaptureDestinationSlot:
      framebufferRuntimeLane === 5 ? 1 : framebufferRuntimeLane === 6 ? 6 : undefined,
    auroraMaterialFramebufferColorTextureUnit: framebufferRuntimeLane ? 11 : undefined,
    auroraMaterialFramebufferDepthTextureUnit: framebufferRuntimeLane ? 12 : undefined,
    auroraMaterialWorldtimerTimeOfDayUpload:
      "source-backed-module-ifo-cworldtimer-int32-scene-delta",
    auroraMaterialCustomShaderRetailParityProof: false
  };
  executionMaterial.userData = executionMetadata;
  material.userData = { ...material.userData, ...executionMetadata };
  if (framebufferRuntimeLane) {
    mesh.userData = {
      ...mesh.userData,
      auroraMtrFramebufferBinding: {
        lane: framebufferRuntimeLane,
        uniforms
      } satisfies AuroraMtrFramebufferBinding,
      auroraMaterialFramebufferRuntimeLane: framebufferRuntimeLane
    };
  }
  executionMaterial.needsUpdate = true;
  return {
    status: "installed",
    reason: "retail-source-graph-and-named-bindings-installed",
    sources,
    material: executionMaterial
  };
}

export function resolveAuroraMtrFramebufferRuntimeLane(
  state: Pick<AuroraMtrCustomShaderState, "sampleFramebuffer" | "volumetric">
): AuroraMtrFramebufferRuntimeLane | null {
  if (state.sampleFramebuffer === 2) return 6;
  if (state.sampleFramebuffer === 1 || state.volumetric === true) return 5;
  return null;
}

export function readAuroraMtrFramebufferRuntimeLane(
  object: THREE.Object3D
): AuroraMtrFramebufferRuntimeLane | null {
  const direct = readFramebufferRuntimeLane(object.userData.auroraMaterialFramebufferRuntimeLane);
  if (direct) return direct;
  if (!(object instanceof THREE.Mesh)) return null;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    const lane = readFramebufferRuntimeLane(
      material.userData.auroraMaterialFramebufferRuntimeLane
    );
    if (lane) return lane;
  }
  return null;
}

export function bindAuroraMtrFramebufferTextures(
  object: THREE.Object3D,
  colorTexture: THREE.Texture,
  depthTexture: THREE.Texture
): boolean {
  const binding = readAuroraMtrFramebufferBinding(object.userData.auroraMtrFramebufferBinding);
  if (!binding) return false;
  binding.uniforms.texFBColor.value = colorTexture;
  binding.uniforms.texFBDepth.value = depthTexture;
  if (object instanceof THREE.Mesh) {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.userData = {
        ...material.userData,
        auroraMaterialFramebufferExecutionStatus: "source-backed-frame-capture-bound",
        auroraMaterialFramebufferColorBound: true,
        auroraMaterialFramebufferDepthBound: true
      };
    });
  }
  return true;
}

export function toAuroraMtrCustomShaderState(
  value: unknown,
  blending?: "additive" | "punchthrough"
): AuroraMtrCustomShaderState {
  if (!isRecord(value)) return {};
  const customShaderProgram = readShaderProgram(value.customShaderProgram);
  const parameters = readShaderParameters(value.parameters);
  const textureSlots = readTextureSlots(value.textureSlots);
  return {
    ...(readString(value.customShaderVS) ? { customShaderVS: readString(value.customShaderVS) } : {}),
    ...(readString(value.customShaderFS) ? { customShaderFS: readString(value.customShaderFS) } : {}),
    ...(readString(value.customShaderGS) ? { customShaderGS: readString(value.customShaderGS) } : {}),
    ...(customShaderProgram ? { customShaderProgram } : {}),
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(textureSlots.length > 0 ? { textureSlots } : {}),
    ...(blending ? { blending } : {}),
    ...(typeof value.sampleFramebuffer === "number"
      ? { sampleFramebuffer: value.sampleFramebuffer }
      : {}),
    ...(typeof value.volumetric === "boolean" ? { volumetric: value.volumetric } : {})
  };
}

function buildAuroraShaderProfileHeader(
  noDiscard: 0 | 1,
  stage: "vertex" | "fragment"
): string {
  return [
    "// Aurora Toolset 89.8193.37 custom material shader profile.",
    "// GLSL ES 3 portability declarations; native Aurora profile values follow unchanged.",
    "precision highp float;",
    "precision highp int;",
    "#define attribute in",
    `#define varying ${stage === "vertex" ? "out" : "in"}`,
    "#define texture2D texture",
    "#define textureCube texture",
    ...(stage === "fragment"
      ? [
          "layout(location = 0) out highp vec4 auroraFragmentColor;",
          "#define gl_FragColor auroraFragmentColor"
        ]
      : []),
    "#define MAX_NUM_LIGHTS 32",
    "#define MAX_NUM_BONES 64",
    "#define GAMMA_CORRECTION 0",
    "#define FRAGMENT_LIGHTING 0",
    "#define SHADER_QUALITY_MODE 0",
    "#define KEYHOLING_ENABLED 0",
    "#define SHADER_DEBUG_MODE 0",
    "#define BUILD_VERSION 8193",
    "#define BUILD_REVISION 37",
    `#define NO_DISCARD ${noDiscard}`,
    "#define POSTPROCESSING_TYPES_ENABLED 0"
  ].join("\n");
}

function adaptAuroraShaderSourceForWebgl(source: string): string {
  // Three reserves SHADER_TYPE for its material class, even for RawShaderMaterial.
  return source.replace(/\bSHADER_TYPE\b/gu, "AURORA_SHADER_TYPE");
}

function createAuroraMtrRawShaderMaterial(
  sourceMaterial: THREE.Material,
  sources: AuroraMtrCustomShaderSources,
  uniforms: AuroraMtrUniforms
): THREE.RawShaderMaterial {
  const material = new THREE.RawShaderMaterial({
    name: sourceMaterial.name,
    vertexShader: sources.vertexShader,
    fragmentShader: sources.fragmentShader,
    uniforms,
    glslVersion: THREE.GLSL3,
    transparent: sourceMaterial.transparent,
    depthTest: sourceMaterial.depthTest,
    depthWrite: sourceMaterial.depthWrite,
    colorWrite: sourceMaterial.colorWrite,
    side: sourceMaterial.side,
    blending: sourceMaterial.blending,
    blendSrc: sourceMaterial.blendSrc,
    blendDst: sourceMaterial.blendDst,
    blendEquation: sourceMaterial.blendEquation,
    premultipliedAlpha: sourceMaterial.premultipliedAlpha,
    polygonOffset: sourceMaterial.polygonOffset,
    polygonOffsetFactor: sourceMaterial.polygonOffsetFactor,
    polygonOffsetUnits: sourceMaterial.polygonOffsetUnits,
    toneMapped: false
  });
  material.userData = { ...sourceMaterial.userData };
  const cacheHash = hashShaderSources(sources.vertexShader, sources.fragmentShader);
  material.customProgramCacheKey = () => `aurora-mtr-custom-shader/${cacheHash}`;
  return material;
}

function replaceMeshMaterial(
  mesh: THREE.Mesh,
  source: THREE.Material,
  replacement: THREE.RawShaderMaterial
): void {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((entry) => (entry === source ? replacement : entry));
    return;
  }
  if (mesh.material === source) {
    mesh.material = replacement;
  }
}

function expandAuroraShaderSource(
  resref: string,
  sourcesByResref: ReadonlyMap<string, string>,
  stack: string[]
): string {
  const normalized = normalizeShaderResref(resref);
  if (stack.includes(normalized)) {
    return `// Aurora include cycle suppressed: ${[...stack, normalized].join(" -> ")}`;
  }
  const source = sourcesByResref.get(normalized);
  if (typeof source !== "string") {
    throw new Error(`Missing Aurora SHD source: ${normalized}`);
  }
  const nextStack = [...stack, normalized];
  return source
    .replace(/^\s*#version\s+[^\r\n]+$/gimu, "")
    .replace(AURORA_MTR_SHADER_INCLUDE_PATTERN, (_match, includeRef: string) => {
      const includeResref = normalizeShaderResref(includeRef);
      return [
        `// Aurora include begin: ${includeResref}`,
        expandAuroraShaderSource(includeResref, sourcesByResref, nextStack),
        `// Aurora include end: ${includeResref}`
      ].join("\n");
    });
}

function ensureAuroraMtrShaderGeometryAttributes(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute("position");
  if (!position) return;
  const count = position.count;
  const uv = geometry.getAttribute("uv");
  const normal = geometry.getAttribute("normal");
  const color = geometry.getAttribute("color");
  const alpha = geometry.getAttribute("auroraAlpha");
  const positions = new Float32Array(count * 4);
  const textureCoordinates = new Float32Array(count * 2);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  for (let index = 0; index < count; index += 1) {
    positions[index * 4] = position.getX(index);
    positions[index * 4 + 1] = position.getY(index);
    positions[index * 4 + 2] = position.getZ(index);
    positions[index * 4 + 3] = 1;
    textureCoordinates[index * 2] = uv?.getX(index) ?? 0;
    textureCoordinates[index * 2 + 1] = uv?.getY(index) ?? 0;
    normals[index * 3] = normal?.getX(index) ?? 0;
    normals[index * 3 + 1] = normal?.getY(index) ?? 0;
    normals[index * 3 + 2] = normal?.getZ(index) ?? 1;
    colors[index * 4] = color?.getX(index) ?? 1;
    colors[index * 4 + 1] = color?.getY(index) ?? 1;
    colors[index * 4 + 2] = color?.getZ(index) ?? 1;
    colors[index * 4 + 3] = alpha?.getX(index) ?? color?.getW(index) ?? 1;
  }
  geometry.setAttribute("vPos", new THREE.BufferAttribute(positions, 4));
  geometry.setAttribute("vTcIn", new THREE.BufferAttribute(textureCoordinates, 2));
  geometry.setAttribute("vNormal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("vColor", new THREE.BufferAttribute(colors, 4));
  geometry.setAttribute("vIndex", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  geometry.setAttribute("vWeight", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  geometry.userData = {
    ...geometry.userData,
    auroraMtrCustomShaderAttributeLayout: {
      vPos: 0,
      vTcIn: 1,
      vColor: 2,
      vNormal: 7,
      vIndex: 8,
      vWeight: 9
    },
    auroraMtrCustomShaderAttributeLayoutSource:
      "nwtoolset.exe FUN_00a707a8 attribute binding disassembly"
  };
}

function createAuroraMtrUniforms(
  material: THREE.Material,
  parameters: PlaceableRenderPackageAuroraMaterialShaderParameter[] | undefined,
  noDiscard: 0 | 1,
  texturesBySlot: ReadonlyMap<number, THREE.Texture>
): AuroraMtrUniforms {
  const textureMaterial = material as AuroraMtrTextureMaterial;
  const identity = new THREE.Matrix4();
  const zeroTexture = null;
  const uniforms: AuroraMtrUniforms = {
    m_mv: { value: new THREE.Matrix4() },
    m_mvp: { value: new THREE.Matrix4() },
    m_m: { value: new THREE.Matrix4() },
    m_normal: { value: new THREE.Matrix3() },
    m_texture: { value: identity.clone() },
    m_view: { value: new THREE.Matrix4() },
    m_proj: { value: new THREE.Matrix4() },
    m_vp: { value: new THREE.Matrix4() },
    m_view_inv: { value: new THREE.Matrix4() },
    m_proj_inv: { value: new THREE.Matrix4() },
    m_vp_inv: { value: new THREE.Matrix4() },
    m_bones: {
      value: Array.from({ length: AURORA_MTR_MAX_BONES }, () => new THREE.Matrix4())
    },
    m_bonePositions: {
      value: Array.from({ length: AURORA_MTR_MAX_BONES }, () => new THREE.Vector4())
    },
    m_boneRotations: {
      value: Array.from({ length: AURORA_MTR_MAX_BONES }, () => new THREE.Vector4(0, 0, 0, 1))
    },
    skinmesh: { value: 0 },
    sceneCurrentFrame: { value: 0 },
    worldtimerTimeOfDay: { value: 0 },
    cameraPosition: { value: new THREE.Vector3() },
    playerPosition: { value: new THREE.Vector3() },
    playerCameraDist: { value: 0 },
    playerInCutscene: { value: 0 },
    cameraPitch: { value: 0 },
    cameraYaw: { value: 0 },
    cameraFocus: { value: new THREE.Vector3() },
    cameraViewAngle: { value: Math.PI / 4 },
    cameraDialogState: { value: 0 },
    screenParams: { value: new THREE.Vector2(1, 1) },
    pixelParams: { value: new THREE.Vector3(1, 1, 1) },
    clipParams: { value: new THREE.Vector3(0.1, 1000, 0.9999) },
    userinputMousePosition: { value: new THREE.Vector2() },
    fogParams: { value: new THREE.Vector4() },
    fogColor: { value: new THREE.Vector4() },
    materialFrontAmbient: { value: readMaterialColor(material, "ambient", 1) },
    materialFrontDiffuse: { value: readMaterialColor(material, "diffuse", 1) },
    materialFrontEmissive: { value: readMaterialColor(material, "emissive", 0) },
    frontLightModelProductSceneColor: { value: new THREE.Vector4() },
    lightAreaAmbient: { value: new THREE.Vector3() },
    lightAreaDiffuse: { value: new THREE.Vector3() },
    lightAreaDiffuseDirection: { value: new THREE.Vector3(0, 0, 1) },
    lightAmbient: {
      value: Array.from({ length: AURORA_MTR_MAX_LIGHTS }, () => new THREE.Vector4())
    },
    lightDiffuse: {
      value: Array.from({ length: AURORA_MTR_MAX_LIGHTS }, () => new THREE.Vector4())
    },
    lightColor: {
      value: Array.from({ length: AURORA_MTR_MAX_LIGHTS }, () => new THREE.Vector4())
    },
    lightPosition: {
      value: Array.from({ length: AURORA_MTR_MAX_LIGHTS }, () => new THREE.Vector4())
    },
    lightQuadraticAtten: {
      value: Array.from({ length: AURORA_MTR_MAX_LIGHTS }, () => 0)
    },
    numLights: { value: 0 },
    staticLighting: { value: 0 },
    lightMaxIntensityInv: { value: 1 },
    lightFalloffFactor: { value: 1 },
    texUnitEnv: {
      value: textureMaterial.envMap && !isCubeTexture(textureMaterial.envMap)
        ? textureMaterial.envMap
        : zeroTexture
    },
    texUnitEnvCube: {
      value: isCubeTexture(textureMaterial.envMap) ? textureMaterial.envMap : zeroTexture
    },
    texEnvBound: {
      value: textureMaterial.envMap && !isCubeTexture(textureMaterial.envMap) ? 1 : 0
    },
    texEnvCubeBound: { value: isCubeTexture(textureMaterial.envMap) ? 1 : 0 },
    envMapCube: { value: isCubeTexture(textureMaterial.envMap) ? 1 : 0 },
    texFBColor: { value: zeroTexture },
    texFBDepth: { value: zeroTexture },
    texUnitNoise: { value: zeroTexture },
    texNoiseBound: { value: 0 },
    fAlphaDiscardValue: {
      value: noDiscard === 0 ? AURORA_MTR_PUNCH_ALPHA_DISCARD_VALUE : -1
    },
    DisplacementOffset: { value: 0 },
    Specularity: { value: 0 },
    Roughness: { value: 0 },
    Metallicness: { value: 0 },
    CustomSpecularColor: { value: new THREE.Vector4() },
    globalColor: { value: new THREE.Vector4(1, 1, 1, 1) },
    keyholeCanDissolve: { value: 0 },
    keyholeDiameterMax: { value: 0 },
    keyholeDiameterMin: { value: 0 }
  };
  for (let slot = 0; slot < 16; slot += 1) {
    const texture = resolveAuroraMtrTextureSlot(textureMaterial, texturesBySlot, slot);
    uniforms[`texUnit${slot}`] = { value: texture ?? zeroTexture };
    uniforms[`texture${slot}Bound`] = { value: texture ? 1 : 0 };
  }
  for (const parameter of parameters ?? []) {
    uniforms[parameter.name] = { value: toUniformValue(parameter) };
  }
  return uniforms;
}

function updateAuroraMtrUniforms(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  mesh: THREE.Mesh,
  material: THREE.Material,
  uniforms: AuroraMtrUniforms,
  texturesBySlot: ReadonlyMap<number, THREE.Texture>
): void {
  const textureMaterial = material as AuroraMtrTextureMaterial;
  const projection = camera.projectionMatrix;
  const projectionInverse = camera.projectionMatrixInverse;
  const view = camera.matrixWorldInverse;
  const viewInverse = camera.matrixWorld;
  const modelView = new THREE.Matrix4().multiplyMatrices(view, mesh.matrixWorld);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(modelView);
  copyMatrix4(uniforms.m_mv, modelView);
  copyMatrix4(uniforms.m_m, mesh.matrixWorld);
  copyMatrix3(uniforms.m_normal, normalMatrix);
  copyMatrix4(uniforms.m_proj, projection);
  copyMatrix4(uniforms.m_view, view);
  copyMatrix4(uniforms.m_view_inv, viewInverse);
  copyMatrix4(uniforms.m_proj_inv, projectionInverse);
  copyMatrix4(uniforms.m_mvp, new THREE.Matrix4().multiplyMatrices(projection, modelView));
  copyMatrix4(uniforms.m_vp, new THREE.Matrix4().multiplyMatrices(projection, view));
  copyMatrix4(uniforms.m_vp_inv, new THREE.Matrix4().multiplyMatrices(viewInverse, projectionInverse));
  (uniforms.cameraPosition.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
  (uniforms.playerPosition.value as THREE.Vector3).copy(
    uniforms.cameraPosition.value as THREE.Vector3
  );
  const drawingBufferSize = renderer.getDrawingBufferSize(new THREE.Vector2());
  (uniforms.screenParams.value as THREE.Vector2).copy(drawingBufferSize);
  (uniforms.pixelParams.value as THREE.Vector3).set(
    1 / Math.max(1, drawingBufferSize.x),
    1 / Math.max(1, drawingBufferSize.y),
    drawingBufferSize.x / Math.max(1, drawingBufferSize.y)
  );
  const near = readFiniteCameraPlane(camera, "near", 0.1);
  const far = readFiniteCameraPlane(camera, "far", 1000);
  (uniforms.clipParams.value as THREE.Vector3).set(near, far, 1 - near / far);
  const explicitSceneCurrentFrame = scene.userData.auroraMtrSceneCurrentFrame;
  uniforms.sceneCurrentFrame.value =
    typeof explicitSceneCurrentFrame === "number" && Number.isFinite(explicitSceneCurrentFrame)
      ? Math.trunc(explicitSceneCurrentFrame)
      : renderer.info.render.frame;
  const worldtimerTimeOfDay = scene.userData.auroraWorldtimerTimeOfDay;
  if (typeof worldtimerTimeOfDay === "number" && Number.isFinite(worldtimerTimeOfDay)) {
    uniforms.worldtimerTimeOfDay.value = Math.trunc(worldtimerTimeOfDay);
  }
  updateTextureUniforms(textureMaterial, uniforms, texturesBySlot);
  updateFogUniforms(scene, uniforms);
  updateLightUniforms(scene, camera, uniforms);
}

function updateTextureUniforms(
  material: AuroraMtrTextureMaterial,
  uniforms: AuroraMtrUniforms,
  texturesBySlot: ReadonlyMap<number, THREE.Texture>
): void {
  for (let slot = 0; slot < 16; slot += 1) {
    const texture = resolveAuroraMtrTextureSlot(material, texturesBySlot, slot);
    uniforms[`texUnit${slot}`].value = texture ?? null;
    uniforms[`texture${slot}Bound`].value = texture ? 1 : 0;
  }
  uniforms.texUnitEnv.value = material.envMap && !isCubeTexture(material.envMap)
    ? material.envMap
    : null;
  uniforms.texUnitEnvCube.value = isCubeTexture(material.envMap) ? material.envMap : null;
  uniforms.texEnvBound.value = material.envMap && !isCubeTexture(material.envMap) ? 1 : 0;
  uniforms.texEnvCubeBound.value = isCubeTexture(material.envMap) ? 1 : 0;
  uniforms.envMapCube.value = isCubeTexture(material.envMap) ? 1 : 0;
}

function resolveAuroraMtrTextureSlot(
  material: AuroraMtrTextureMaterial,
  texturesBySlot: ReadonlyMap<number, THREE.Texture>,
  slot: number
): THREE.Texture | null | undefined {
  const exactTexture = texturesBySlot.get(slot);
  if (exactTexture) return exactTexture;
  if (slot === 0) return material.map;
  if (slot === 1) return material.normalMap;
  if (slot === 2 || slot === 3) return material.roughnessMap;
  if (slot === 4) return material.bumpMap;
  if (slot === 5) return material.emissiveMap;
  return null;
}

function updateFogUniforms(scene: THREE.Scene, uniforms: AuroraMtrUniforms): void {
  const fog = scene.fog;
  const fogParams = uniforms.fogParams.value as THREE.Vector4;
  const fogColor = uniforms.fogColor.value as THREE.Vector4;
  if (fog instanceof THREE.Fog) {
    const inverseRange = 1 / Math.max(0.0001, fog.far - fog.near);
    fogParams.set(1, fog.near, fog.far, inverseRange);
    fogColor.set(fog.color.r, fog.color.g, fog.color.b, 1);
  } else {
    fogParams.set(0, 0, 1, 1);
    fogColor.set(0, 0, 0, 1);
  }
}

function updateLightUniforms(
  scene: THREE.Scene,
  camera: THREE.Camera,
  uniforms: AuroraMtrUniforms
): void {
  const areaAmbient = uniforms.lightAreaAmbient.value as THREE.Vector3;
  const areaDiffuse = uniforms.lightAreaDiffuse.value as THREE.Vector3;
  const areaDiffuseDirection = uniforms.lightAreaDiffuseDirection.value as THREE.Vector3;
  const ambientLights: THREE.AmbientLight[] = [];
  const directionalLights: THREE.DirectionalLight[] = [];
  const pointLights: THREE.PointLight[] = [];
  scene.traverseVisible((object) => {
    if (object instanceof THREE.AmbientLight) ambientLights.push(object);
    else if (object instanceof THREE.DirectionalLight) directionalLights.push(object);
    else if (object instanceof THREE.PointLight && pointLights.length < AURORA_MTR_MAX_LIGHTS) {
      pointLights.push(object);
    }
  });
  areaAmbient.set(0, 0, 0);
  for (const light of ambientLights) {
    areaAmbient.x += light.color.r * light.intensity;
    areaAmbient.y += light.color.g * light.intensity;
    areaAmbient.z += light.color.b * light.intensity;
  }
  areaDiffuse.set(0, 0, 0);
  areaDiffuseDirection.set(0, 0, 1);
  const directional = directionalLights[0];
  if (directional) {
    areaDiffuse
      .set(directional.color.r, directional.color.g, directional.color.b)
      .multiplyScalar(directional.intensity);
    directional.getWorldPosition(areaDiffuseDirection);
    areaDiffuseDirection
      .sub(directional.target.getWorldPosition(new THREE.Vector3()))
      .transformDirection(camera.matrixWorldInverse)
      .normalize();
  }
  const lightAmbient = uniforms.lightAmbient.value as THREE.Vector4[];
  const lightDiffuse = uniforms.lightDiffuse.value as THREE.Vector4[];
  const lightPosition = uniforms.lightPosition.value as THREE.Vector4[];
  const lightQuadraticAtten = uniforms.lightQuadraticAtten.value as number[];
  for (let index = 0; index < AURORA_MTR_MAX_LIGHTS; index += 1) {
    lightAmbient[index].set(0, 0, 0, 1);
    lightDiffuse[index].set(0, 0, 0, 1);
    lightPosition[index].set(0, 0, 0, 1);
    lightQuadraticAtten[index] = 0;
  }
  pointLights.forEach((light, index) => {
    const position = light.getWorldPosition(new THREE.Vector3()).applyMatrix4(
      camera.matrixWorldInverse
    );
    lightPosition[index].set(position.x, position.y, position.z, 1);
    lightDiffuse[index].set(
      light.color.r * light.intensity,
      light.color.g * light.intensity,
      light.color.b * light.intensity,
      1
    );
    const radius = Math.max(0.1, light.distance || 0.1);
    lightQuadraticAtten[index] = 9 / (radius * radius * 2);
  });
  uniforms.numLights.value = pointLights.length;
  (uniforms.frontLightModelProductSceneColor.value as THREE.Vector4).set(
    areaAmbient.x,
    areaAmbient.y,
    areaAmbient.z,
    1
  );
}

function readMaterialColor(
  material: THREE.Material,
  sourceKey: "ambient" | "diffuse" | "emissive",
  fallback: number
): THREE.Vector4 {
  const aurora = isRecord(material.userData.aurora) ? material.userData.aurora : undefined;
  const sourceMaterial = isRecord(aurora?.material) ? aurora.material : undefined;
  const source = sourceMaterial?.[`${sourceKey}Color`];
  if (Array.isArray(source) && source.length >= 3) {
    return new THREE.Vector4(
      readFiniteNumber(source[0], fallback),
      readFiniteNumber(source[1], fallback),
      readFiniteNumber(source[2], fallback),
      sourceKey === "diffuse"
        ? readFiniteNumber((material as AuroraMtrTextureMaterial).opacity, 1)
        : 1
    );
  }
  const textureMaterial = material as AuroraMtrTextureMaterial;
  const color = sourceKey === "emissive" ? textureMaterial.emissive : textureMaterial.color;
  return new THREE.Vector4(
    color?.r ?? fallback,
    color?.g ?? fallback,
    color?.b ?? fallback,
    sourceKey === "diffuse" ? textureMaterial.opacity ?? 1 : 1
  );
}

function toUniformValue(
  parameter: PlaceableRenderPackageAuroraMaterialShaderParameter
): number | THREE.Vector2 | THREE.Vector3 | THREE.Vector4 {
  if (parameter.kind === "int" || parameter.arity === 1) return parameter.values[0] ?? 0;
  if (parameter.arity === 2) return new THREE.Vector2(parameter.values[0], parameter.values[1]);
  if (parameter.arity === 3) {
    return new THREE.Vector3(parameter.values[0], parameter.values[1], parameter.values[2]);
  }
  return new THREE.Vector4(
    parameter.values[0],
    parameter.values[1],
    parameter.values[2],
    parameter.values[3]
  );
}

function copyMatrix4(uniform: THREE.IUniform, value: THREE.Matrix4): void {
  (uniform.value as THREE.Matrix4).copy(value);
}

function copyMatrix3(uniform: THREE.IUniform, value: THREE.Matrix3): void {
  (uniform.value as THREE.Matrix3).copy(value);
}

function readFiniteCameraPlane(
  camera: THREE.Camera,
  key: "near" | "far",
  fallback: number
): number {
  return readFiniteNumber((camera as THREE.Camera & { near?: number; far?: number })[key], fallback);
}

function isCubeTexture(texture: THREE.Texture | null | undefined): texture is THREE.CubeTexture {
  return texture instanceof THREE.CubeTexture;
}

function hasCustomShaderReference(state: AuroraMtrCustomShaderState): boolean {
  return Boolean(
    state.customShaderVS?.trim() ||
      state.customShaderFS?.trim() ||
      state.customShaderGS?.trim() ||
      state.customShaderProgram
  );
}

function normalizeShaderResref(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .pop()!
    .replace(AURORA_MTR_SHADER_RESOURCE_EXTENSION_PATTERN, "")
    .toLowerCase();
}

function hashShaderSources(vertexShader: string, fragmentShader: string): string {
  let hash = 0x811c9dc5;
  for (const character of `${vertexShader}\0${fragmentShader}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function readShaderProgram(value: unknown): PlaceableRenderPackageAuroraShaderProgram | undefined {
  if (!isRecord(value) || value.version !== "aurora-shader-program-source/v1") {
    return undefined;
  }
  if (value.status !== "complete" && value.status !== "incomplete") return undefined;
  const stageRoots = isRecord(value.stageRoots) ? value.stageRoots : {};
  const sources = Array.isArray(value.sources)
    ? value.sources.flatMap((source) => {
        if (!isRecord(source) || !readString(source.resref) || !readString(source.source)) {
          return [];
        }
        return [{
          resref: readString(source.resref),
          source: readString(source.source),
          includeRefs: Array.isArray(source.includeRefs)
            ? source.includeRefs.map(readString).filter(Boolean)
            : []
        }];
      })
    : [];
  return {
    version: "aurora-shader-program-source/v1",
    status: value.status,
    stageRoots: {
      ...(readString(stageRoots.vertex) ? { vertex: readString(stageRoots.vertex) } : {}),
      ...(readString(stageRoots.fragment) ? { fragment: readString(stageRoots.fragment) } : {}),
      ...(readString(stageRoots.geometry) ? { geometry: readString(stageRoots.geometry) } : {})
    },
    sources,
    unresolvedRefs: Array.isArray(value.unresolvedRefs)
      ? value.unresolvedRefs.map(readString).filter(Boolean)
      : []
  };
}

function readShaderParameters(
  value: unknown
): PlaceableRenderPackageAuroraMaterialShaderParameter[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((parameter) => {
    if (!isRecord(parameter)) return [];
    const name = readString(parameter.name);
    const kind = parameter.kind;
    const values = Array.isArray(parameter.values)
      ? parameter.values.filter(
          (entry): entry is number => typeof entry === "number" && Number.isFinite(entry)
        )
      : [];
    if (
      !name ||
      (kind !== "float" && kind !== "int") ||
      values.length < 1 ||
      values.length > 4 ||
      parameter.arity !== values.length ||
      (kind === "int" && (values.length !== 1 || !Number.isInteger(values[0])))
    ) {
      return [];
    }
    return [{
      name,
      kind,
      values,
      arity: values.length as 1 | 2 | 3 | 4
    }];
  });
}

function readTextureSlots(value: unknown): PlaceableRenderPackageAuroraTextureSlot[] {
  if (!Array.isArray(value)) return [];
  const validRoles: PlaceableRenderPackageAuroraTextureSlot["role"][] = [
    "diffuse",
    "normal",
    "specular",
    "roughness",
    "height",
    "emissive",
    "unknown"
  ];
  return value.flatMap((slot) => {
    if (!isRecord(slot)) return [];
    const slotIndex = slot.slot;
    const reference = readString(slot.reference);
    const rawRole = readString(slot.role);
    if (
      typeof slotIndex !== "number" ||
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex > 15 ||
      !reference
    ) {
      return [];
    }
    const role = validRoles.includes(rawRole as PlaceableRenderPackageAuroraTextureSlot["role"])
      ? (rawRole as PlaceableRenderPackageAuroraTextureSlot["role"])
      : "unknown";
    return [{ slot: slotIndex, role, reference }];
  });
}

function readFramebufferRuntimeLane(
  value: unknown
): AuroraMtrFramebufferRuntimeLane | null {
  return value === 5 || value === 6 ? value : null;
}

function readAuroraMtrFramebufferBinding(
  value: unknown
): AuroraMtrFramebufferBinding | null {
  if (!isRecord(value)) return null;
  const lane = readFramebufferRuntimeLane(value.lane);
  const uniforms = value.uniforms;
  if (
    !lane ||
    !isRecord(uniforms) ||
    !isRecord(uniforms.texFBColor) ||
    !isRecord(uniforms.texFBDepth)
  ) {
    return null;
  }
  return { lane, uniforms: uniforms as AuroraMtrUniforms };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toPlaceableAuroraMtrCustomShaderState(
  state: PlaceableRenderPackageAuroraMaterialState
): AuroraMtrCustomShaderState {
  return state;
}

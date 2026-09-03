import * as THREE from "three";
import type {
  AuroraVfxJsonValue,
  AuroraVfxPayload,
  SceneObjectVfxDiagnostic
} from "../../../scene/contracts";
import {
  AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FORMULA,
  AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_PROOF_STATUS,
  AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_SOURCE,
  AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS,
  AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE,
  installAuroraLinearLightFalloffShaderChunk,
  resolveAuroraEnhancedPerformancePointLightProjection
} from "./auroraThreeLightFalloff";
import {
  installAuroraMtrCustomShaderProgram,
  toAuroraMtrCustomShaderState
} from "../../../placeables/adapters/three/auroraMtrCustomShaderProgram";
import {
  applyPlaceableTexturesToModel,
  createAuroraTextureCycleRuntime,
  type AuroraTextureCycleRuntime
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import type {
  PlaceableRenderPackageAuroraMaterial,
  PlaceableRenderPackageTextureBinding,
  PlaceableRenderPackageTextureTxiState
} from "../../../placeables/contracts";
import { installAuroraMdlSourceMaterialLighting } from "../../../shared/adapters/three/auroraMdlSourceMaterialLighting";
import { attachAuroraVfxDrawQueueRecord } from "./auroraVfxRenderQueue";
import { resolveAuroraVfxClaimState } from "../../../scene/domain/auroraVfxClaimState";

interface AuroraRawGammaParticleTextureCacheEntry {
  texture: THREE.Texture;
  referenceCount: number;
}

const auroraRawGammaParticleTextureCache = new WeakMap<
  THREE.Texture,
  AuroraRawGammaParticleTextureCacheEntry
>();
const auroraCanonicalCameraBillboardUpdaters = new WeakMap<
  THREE.Mesh,
  (camera: THREE.Camera) => void
>();
interface AuroraVfxCanonicalParticleShaderBinding {
  softDepthState: AuroraVfxCanonicalParticleSoftDepthState;
  fogBranch: AuroraVfxCanonicalParticleFogBranch;
  uniforms: {
    auroraSceneDepthTexture: THREE.IUniform;
    auroraSceneDepthBound: THREE.IUniform;
    auroraParticlePixelSize: THREE.IUniform;
    auroraNearClip: THREE.IUniform;
    auroraFarClip: THREE.IUniform;
    auroraPerspectiveDepth: THREE.IUniform;
    auroraParticleSoftness: THREE.IUniform;
    auroraFogEnabled: THREE.IUniform;
    auroraFogStart: THREE.IUniform;
    auroraFogInvRange: THREE.IUniform;
    auroraFogColorGamma: THREE.IUniform;
    auroraFogAdditive: THREE.IUniform;
  };
}
const auroraCanonicalParticleShaderBindings = new WeakMap<
  THREE.MeshBasicMaterial,
  AuroraVfxCanonicalParticleShaderBinding
>();
const auroraLazyRuntimePlaybackStates = new WeakMap<
  THREE.Object3D,
  {
    runtimeFrames: Array<{ timeSeconds: number; payload: AuroraVfxPayload }>;
    renderOptions: AuroraVfxCanonicalRenderOptions;
    currentFrameIndex: number;
    currentFrame: THREE.Group;
  }
>();
const auroraCanonicalTextureCycleRuntimes = new WeakMap<
  THREE.Object3D,
  AuroraTextureCycleRuntime
>();

export interface AuroraVfxCanonicalRenderOptions {
  particleTexturesByReference?: ReadonlyMap<string, THREE.Texture>;
  particleTextureSamplerStatesByReference?: ReadonlyMap<
    string,
    AuroraVfxCanonicalTextureSamplerState
  >;
  chunkModelsByResourceKey?: ReadonlyMap<string, THREE.Object3D>;
  chunkModelDeliveryUrlsByResourceKey?: ReadonlyMap<string, string>;
  /** Source-MDL material textures keyed by the resref preserved in GLB extras. */
  chunkModelTexturesByReference?: ReadonlyMap<string, THREE.Texture>;
  /** Resolved MTR/SHD package used by source materials inside Chunk models. */
  chunkModelAuroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  /** TXI sidecars associated with source textures inside Chunk models. */
  chunkModelTextureBindings?: PlaceableRenderPackageTextureBinding[] | null;
  /** Parsed source-MDL VFX programs instantiated once for every active Chunk particle. */
  chunkModelRuntimePayloadsByResourceKey?: ReadonlyMap<
    string,
    AuroraVfxCanonicalChunkModelRuntimePayload
  >;
  /** Converted source-MDL geometry whose node names are bound to the canonical model graph. */
  sourceModel?: THREE.Object3D;
  /** Source-MDL material textures keyed by the resref preserved in GLB extras. */
  sourceModelTexturesByReference?: ReadonlyMap<string, THREE.Texture>;
  /** Exact TXI sidecars associated with source textures inside the owning model. */
  sourceModelTextureBindings?: PlaceableRenderPackageTextureBinding[] | null;
  modelGraph?: AuroraVfxCanonicalModelGraph;
  modelGraphTimeSeconds?: number;
  objectRadius?: number;
  /** Scene-instance identity used by Aurora's contextual renderorder tie-break. */
  referencedObjectContextKey?: string;
  sourceCoordinateSpace?: "three-y-up" | "aurora-z-up";
  /** Internal ancestry guard for source-MDL chunk dependencies. */
  chunkModelRuntimeResolutionStack?: ReadonlySet<string>;
  /** Internal per-playback motion history used by nested Chunk runtimes. */
  chunkParticleMotionHistory?: ReadonlyMap<
    string,
    readonly AuroraVfxCanonicalChunkMotionSample[]
  >;
  /** Internal source-space correction applied before particle geometry is built. */
  drawRecordTransform?: (
    record: AuroraParticleDrawRecordLike
  ) => AuroraParticleDrawRecordLike;
  /** Materialize only the selected frame for large deterministic proof payloads. */
  runtimeFrameMaterialization?: "eager" | "lazy";
  /**
   * Immutable native-oracle calibration for additive particle radiance. The
   * scale is applied after Aurora byte normalization, so source draw records
   * remain untouched.
   */
  additiveParticleRadianceCalibration?: {
    scale: number;
    sourceEvidence: string;
  };
}

export interface AuroraVfxCanonicalTextureSamplerState
  extends PlaceableRenderPackageTextureTxiState {
  mipmap?: boolean;
  filter?: boolean;
  clamp?: 0 | 1 | 2 | 3;
  downsampleMin?: number;
  downsampleMax?: number;
  source?: string;
}

export interface AuroraVfxCanonicalChunkModelRuntimePayload {
  payload: AuroraVfxPayload;
  modelGraph?: AuroraVfxCanonicalModelGraph;
  sourceModelObjectKey?: string;
}

interface AuroraVfxCanonicalChildModelRuntimeFrame {
  version: "aurora-vfx-child-model-runtime-frame/v1";
  modelInstanceRef: string;
  sourceModelObjectKey?: string;
  localClockSeconds: number;
  rngLineage: {
    algorithm: "nwn-ee-msvc-rand15";
    initialSeed: number;
    finalSeed: number;
  };
  runtimeEmitters: Array<Record<string, AuroraVfxJsonValue>>;
}

/** Source-MDL tree data supplied by the placeable transport; values are local Aurora transforms. */
export interface AuroraVfxCanonicalModelGraph {
  nodes: AuroraVfxCanonicalModelGraphNode[];
}

export interface AuroraVfxCanonicalModelGraphNode {
  nodeKind: "transform" | "static-geometry" | "emitter" | "light" | "reference" | "shadowblob";
  nodeName: string;
  parentNodeName?: string;
  transform?: AuroraVfxCanonicalModelGraphTransform;
  animationTracks?: Array<{
    animationName: string;
    lengthSeconds?: number;
    transitionSeconds?: number;
    transform: AuroraVfxCanonicalModelGraphTransform;
  }>;
  meshMaterialState?: AuroraVfxCanonicalMeshMaterialState;
  meshMaterialAnimationTracks?: Array<{
    animationName: string;
    lengthSeconds?: number;
    transitionSeconds?: number;
    state: AuroraVfxCanonicalMeshMaterialState;
  }>;
}

export interface AuroraVfxCanonicalNumberKeyframe {
  time: number;
  value: number;
  interpolation?: "bezier";
  bezierIncomingTangent?: number;
  bezierOutgoingTangent?: number;
}

export interface AuroraVfxCanonicalMeshMaterialState {
  alpha?: number;
  alphaTimeline?: AuroraVfxCanonicalNumberKeyframe[];
}

export interface AuroraVfxCanonicalModelGraphTransform {
  position?: [number, number, number];
  orientation?: { axis: [number, number, number]; angleRadians: number };
  scale?: number;
  positionTimeline?: Array<{
    time: number;
    value: [number, number, number];
    interpolation?: "bezier";
    bezierIncomingTangent?: [number, number, number];
    bezierOutgoingTangent?: [number, number, number];
  }>;
  orientationTimeline?: Array<{
    time: number;
    value: { axis: [number, number, number]; angleRadians: number };
    interpolation?: "bezier";
    bezierIncomingTangent?: [number, number, number, number];
    bezierOutgoingTangent?: [number, number, number, number];
  }>;
  scaleTimeline?: AuroraVfxCanonicalNumberKeyframe[];
}

export function updateAuroraVfxCanonicalCameraBillboards(
  root: THREE.Object3D,
  camera: THREE.Camera
): number {
  let updatedMeshCount = 0;
  root.traverseVisible((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const update = auroraCanonicalCameraBillboardUpdaters.get(node);
    if (!update) return;
    update(camera);
    updatedMeshCount += 1;
  });
  return updatedMeshCount;
}

export type AuroraVfxCanonicalParticleSoftDepthDisableReason =
  | "splat"
  | "billboard_to_local_z"
  | "billboard_to_world_z"
  | "non_positive_max_half_extent";

export interface AuroraVfxCanonicalParticleSoftDepthState {
  status: "enabled" | "disabled";
  sourceMaxHalfExtent: number;
  worldScale: number;
  maxHalfExtent: number;
  particleSoftness: number;
  sizeSpace: "source-model-space" | "three-view-space";
  disableReason: AuroraVfxCanonicalParticleSoftDepthDisableReason | null;
  source: "nwn-retail-fsparticle-particleSoftness-plus-nwmain-PartEmitter-draw-gate";
}

export type AuroraVfxCanonicalParticleFogBranch =
  | "normal_rgb_mix"
  | "additive_alpha_attenuation";

export function resolveAuroraVfxCanonicalParticleSoftDepthState(input: {
  renderMode?: string;
  drawRecords: ReadonlyArray<{
    splat?: boolean;
    size: { x: number; y: number };
  }>;
}): AuroraVfxCanonicalParticleSoftDepthState {
  const maxHalfExtent = input.drawRecords.reduce(
    (maximum, record) =>
      Math.max(
        maximum,
        Math.max(0, record.size.x) * 0.5,
        Math.max(0, record.size.y) * 0.5
      ),
    0
  );
  const normalizedRenderMode = normalizeRenderModeToken(input.renderMode);
  let disableReason: AuroraVfxCanonicalParticleSoftDepthDisableReason | null = null;
  if (input.drawRecords.some((record) => record.splat === true)) {
    disableReason = "splat";
  } else if (normalizedRenderMode === "billboard_to_local_z") {
    disableReason = "billboard_to_local_z";
  } else if (normalizedRenderMode === "billboard_to_world_z") {
    disableReason = "billboard_to_world_z";
  } else if (maxHalfExtent <= 0) {
    disableReason = "non_positive_max_half_extent";
  }
  return {
    status: disableReason === null ? "enabled" : "disabled",
    sourceMaxHalfExtent: maxHalfExtent,
    worldScale: 1,
    maxHalfExtent,
    particleSoftness:
      disableReason === null
        ? 1 / Math.min(maxHalfExtent * 0.2, 0.2)
        : 0,
    sizeSpace: "source-model-space",
    disableReason,
    source:
      "nwn-retail-fsparticle-particleSoftness-plus-nwmain-PartEmitter-draw-gate"
  };
}

export function resolveAuroraVfxCanonicalParticleFogBranch(
  blendMode: string | undefined
): AuroraVfxCanonicalParticleFogBranch {
  const normalizedBlendMode = normalizeRenderModeToken(blendMode);
  return normalizedBlendMode === "additive" || normalizedBlendMode === "lighten"
    ? "additive_alpha_attenuation"
    : "normal_rgb_mix";
}

export function evaluateAuroraVfxCanonicalParticleFog(input: {
  branch: AuroraVfxCanonicalParticleFogBranch;
  colorGamma: readonly [number, number, number];
  alpha: number;
  fogColorGamma: readonly [number, number, number];
  fogAmount: number;
}): {
  colorGamma: [number, number, number];
  alpha: number;
} {
  const fogAmount = clamp(input.fogAmount, 0, 1);
  if (input.branch === "additive_alpha_attenuation") {
    return {
      colorGamma: [...input.colorGamma],
      alpha: input.alpha * (1 - fogAmount)
    };
  }
  return {
    colorGamma: input.colorGamma.map(
      (channel, index) =>
        channel * (1 - fogAmount) +
        (input.fogColorGamma[index] ?? 0) * fogAmount
    ) as [number, number, number],
    alpha: input.alpha
  };
}

export interface AuroraVfxCanonicalParticleFrameUniformInput {
  depthTexture: THREE.DepthTexture | null;
  depthSource: string | null;
  depthMatchesSceneTarget: boolean;
  viewportWidth: number;
  viewportHeight: number;
  camera: THREE.Camera;
  fog: {
    enabled: boolean;
    start: number;
    end: number;
    colorGamma: readonly [number, number, number];
  };
}

export function updateAuroraVfxCanonicalParticleFrameUniforms(
  meshes: readonly THREE.Mesh[],
  input: AuroraVfxCanonicalParticleFrameUniformInput
): number {
  const perspectiveCamera = input.camera as THREE.PerspectiveCamera;
  const projectionCamera = input.camera as
    | THREE.PerspectiveCamera
    | THREE.OrthographicCamera;
  const hasProjectionRange =
    (perspectiveCamera.isPerspectiveCamera ||
      (projectionCamera as THREE.OrthographicCamera).isOrthographicCamera) &&
    Number.isFinite(projectionCamera.near) &&
    Number.isFinite(projectionCamera.far) &&
    projectionCamera.near > 0 &&
    projectionCamera.far > projectionCamera.near;
  const perspectiveDepth = perspectiveCamera.isPerspectiveCamera === true;
  const orthographicDepth =
    (projectionCamera as THREE.OrthographicCamera).isOrthographicCamera === true;
  const depthBound =
    input.depthTexture !== null &&
    hasProjectionRange &&
    (perspectiveDepth || orthographicDepth) &&
    input.depthMatchesSceneTarget;
  const viewportWidth = Math.max(1, Math.floor(input.viewportWidth));
  const viewportHeight = Math.max(1, Math.floor(input.viewportHeight));
  const fogEnabled =
    input.fog.enabled &&
    Number.isFinite(input.fog.start) &&
    Number.isFinite(input.fog.end) &&
    input.fog.end > input.fog.start;
  let updatedMaterialCount = 0;

  meshes.forEach((mesh) => {
    mesh.updateWorldMatrix(true, false);
    const measuredWorldScale = mesh.matrixWorld.getMaxScaleOnAxis();
    const worldScale = Number.isFinite(measuredWorldScale)
      ? Math.max(0, measuredWorldScale)
      : 0;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    materials.forEach((candidate) => {
      if (!(candidate instanceof THREE.MeshBasicMaterial)) return;
      const binding = auroraCanonicalParticleShaderBindings.get(candidate);
      if (!binding) return;
      const sourceMaxHalfExtent = binding.softDepthState.sourceMaxHalfExtent;
      const maxHalfExtent = sourceMaxHalfExtent * worldScale;
      const runtimeDisableReason =
        binding.softDepthState.disableReason ??
        (maxHalfExtent > 0 ? null : "non_positive_max_half_extent");
      const runtimeSoftDepthState: AuroraVfxCanonicalParticleSoftDepthState = {
        ...binding.softDepthState,
        status: runtimeDisableReason === null ? "enabled" : "disabled",
        sourceMaxHalfExtent,
        worldScale,
        maxHalfExtent,
        particleSoftness:
          runtimeDisableReason === null
            ? 1 / Math.min(maxHalfExtent * 0.2, 0.2)
            : 0,
        sizeSpace: "three-view-space",
        disableReason: runtimeDisableReason
      };
      binding.uniforms.auroraSceneDepthTexture.value = input.depthTexture;
      binding.uniforms.auroraSceneDepthBound.value = depthBound ? 1 : 0;
      binding.uniforms.auroraParticleSoftness.value =
        runtimeSoftDepthState.particleSoftness;
      (
        binding.uniforms.auroraParticlePixelSize.value as THREE.Vector2
      ).set(1 / viewportWidth, 1 / viewportHeight);
      binding.uniforms.auroraNearClip.value = hasProjectionRange
        ? projectionCamera.near
        : 0.1;
      binding.uniforms.auroraFarClip.value = hasProjectionRange
        ? projectionCamera.far
        : 100;
      binding.uniforms.auroraPerspectiveDepth.value = perspectiveDepth ? 1 : 0;
      binding.uniforms.auroraFogEnabled.value = fogEnabled ? 1 : 0;
      binding.uniforms.auroraFogStart.value = fogEnabled ? input.fog.start : 0;
      binding.uniforms.auroraFogInvRange.value = fogEnabled
        ? 1 / (input.fog.end - input.fog.start)
        : 0;
      (
        binding.uniforms.auroraFogColorGamma.value as THREE.Color
      ).setRGB(
        input.fog.colorGamma[0],
        input.fog.colorGamma[1],
        input.fog.colorGamma[2],
        THREE.LinearSRGBColorSpace
      );
      const depthInput = {
        status: depthBound ? "bound" : "unbound",
        textureUuid: input.depthTexture?.uuid ?? null,
        source: input.depthSource,
        matchesSceneTarget: input.depthMatchesSceneTarget,
        viewportWidth,
        viewportHeight,
        nearClip: hasProjectionRange ? projectionCamera.near : null,
        farClip: hasProjectionRange ? projectionCamera.far : null,
        perspectiveDepth,
        projectionMode: perspectiveDepth
          ? "perspective"
          : orthographicDepth
            ? "orthographic"
            : "unsupported"
      };
      const fogState = {
        enabled: fogEnabled,
        start: input.fog.start,
        end: input.fog.end,
        colorGamma: [...input.fog.colorGamma],
        branch: binding.fogBranch
      };
      candidate.userData.auroraVfxCanonicalParticleDepthInput = depthInput;
      candidate.userData.auroraVfxCanonicalParticleFogState = fogState;
      candidate.userData.auroraVfxCanonicalParticleSoftDepthState =
        runtimeSoftDepthState;
      mesh.userData.auroraVfxCanonicalParticleDepthInput = depthInput;
      mesh.userData.auroraVfxCanonicalParticleFogState = fogState;
      mesh.userData.auroraVfxCanonicalParticleSoftDepthState =
        runtimeSoftDepthState;
      updatedMaterialCount += 1;
    });
  });
  return updatedMaterialCount;
}

const AURORA_PROGFX_TYPE4_POINT_LIGHT_PREVIEW_STATUS =
  "source-backed-fx-light-clr-pointlight-preview-scheduler-parity-blocked";
const AURORA_PROGFX_TYPE4_POINT_LIGHT_PREVIEW_SOURCE =
  "ProgFX Type 4 light request uses fx_light_clr.mdl AuroraLight01 source color/radius from render contract; local PointLight preview is active while retail priority/proximity/vision scheduler parity remains blocked";
const AURORA_PROGFX_TYPE4_POINT_LIGHT_FALLOFF_FORMULA =
  "1/(1+4.5*(distance/radius)^2)";
const AURORA_PROGFX_TYPE4_POINT_LIGHT_DECAY = 1;
const AURORA_PROGFX_TYPE4_POINT_LIGHT_INTENSITY_SOURCE =
  "fx_light_clr.mdl source-MDL RGB is split into normalized Three.Color and max RGB channel in Three.PointLight.intensity so color*intensity preserves the source vector; scheduler parity remains blocked";
const AURORA_PROGFX_TYPE4_POINT_LIGHT_INTENSITY_PROOF_STATUS =
  "source-family-backed-fx_light_clr-mdl-rgb-vector-preserved-through-three-color-intensity";
const AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_STATUS =
  "blocked-runtime-oracle-multi-request-no-pointlight-until-retail-scheduler-parity";
const AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_SOURCE =
  "Retail ProgFX Type 4 priority capture observes a visible warm-yellow Type 4 pixel signal after simultaneous Blackout/Blue/Yellow/Darkvision requests, while exact winner, equal-priority tie policy, proximity threshold, attach-to-scene restore timing, and local-vs-retail parity remain blocked";
const AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_BLOCKER =
  "Aurora Web only promotes a ProgFX Type 4 request to THREE.PointLight when the render contract contains a single light request; multi-request contracts stay metadata-only until retail scheduler parity is isolated";
const AURORA_PARTICLE_TEXTURE_BINDING = "exact-texUnit0-rgba";
const AURORA_PARTICLE_ALPHA_SOURCE = "texUnit0-alpha-times-particle-alpha";
const AURORA_PARTICLE_TEXTURE_BINDING_SOURCE_SHA256 =
  "acdea921e80243549205d86ffde2119af97a697443f27dcf6ee5e8798deb2816";

interface AuroraVfxRuntimeRenderContractRecord {
  version: "aurora-vfx-runtime-render-contract/v1";
  emitterNodeName?: string;
  activeParticleCount: number;
  drawParticleCount: number;
  verticesPerDrawParticle: 0 | 6;
  drawVertexCount: number;
  drawLane: "textured_quad" | "linked_textured_quad" | "chunk_model";
  renderMode: {
    enum?: string;
    rawToken?: string;
  };
  blendMode: AuroraVfxModeRecord;
  materialState?: Record<string, unknown>;
  renderState?: Record<string, unknown>;
  renderOrder: {
    value: number;
    rawValue?: number;
  };
  chunkLane?: AuroraVfxChunkParticleLaneRecord;
  chunkLanes?: AuroraVfxChunkParticleLaneRecord[];
  drawRecords: AuroraParticleDrawRecordLike[];
  diagnostics: SceneObjectVfxDiagnostic[];
  progFxType4Light?: AuroraVfxProgFxType4LightRecord;
  progFxType4Requests?: AuroraVfxProgFxType4LightRecord[];
  pltRenderContext?: AuroraVfxPltRenderContextRecord;
}

interface AuroraVfxPltRenderContextRecord {
  status: "ready" | "missing_target_context";
  requestedTextureRef: string;
  selectedResourceKey?: string;
  targetRef?: string;
  paletteRowsByLayer?: Record<string, number>;
  profile?: string;
  provenance?: string;
  shaderLane: {
    vertexShader: "vs_pltgen";
    fragmentShader: "fs_pltgen";
    schemeUniformPattern: "PLTscheme[%d]";
    schemeUniformCount: 15;
  };
  proofStatus: "source-backed-contract-retail-visual-unverified";
}

export type AuroraVfxCanonicalPltPaletteResolution =
  | { status: "not-applicable" }
  | { status: "missing-target-context" }
  | { status: "conflicting-context" }
  | {
      status: "ready";
      paletteRowsByLayer: Readonly<Record<number, number | undefined>>;
    };

interface AuroraVfxModeRecord {
  enum?: string;
  rawToken?: string;
  modeNumber?: number;
  exactGlBlendFactors?: {
    status?: string;
    sourceFactor?: string;
    sourceFactorGlEnum?: number;
    destinationFactor?: string;
    destinationFactorGlEnum?: number;
    blendTableIndices?: [number, number];
    source?: string;
    binarySha256?: string;
  };
}

interface AuroraVfxChunkParticleLaneRecord {
  lane: "chunk_model";
  chunkName?: string;
  modelAnimation?: AuroraVfxChunkModelAnimationRecord;
  activeParticleCount: number;
  particleInstances: Array<{
    particleId: number;
    position: { x: number; y: number; z: number };
    rotationRadians?: number;
    rotationAxis?: { x: number; y: number; z: number };
    particleOrientation?: {
      axis: [number, number, number];
      angleRadians: number;
    };
    landed: boolean;
    contactNormal?: { x: number; y: number; z: number };
    scale?: { x: number; y: number };
    ageSeconds?: number;
    lifetimeSeconds?: number;
    modelInstanceRef?: string;
    modelRuntimeStatus?: "active" | "released";
    modelRuntimeFrame?: AuroraVfxCanonicalChildModelRuntimeFrame;
  }>;
  texturedQuadCanonical: false;
  collapseAttempted: boolean;
  resourceResolveStatus: "resolved" | "unresolved";
  resolvedResource?: AuroraVfxChunkModelResolvedResourceRecord;
}

interface AuroraVfxCanonicalChunkMotionSample {
  ageSeconds: number;
  position: THREE.Vector3;
  dynamicQuaternion: THREE.Quaternion;
}

interface AuroraVfxChunkModelAnimationRecord {
  animationName: "impact";
  playbackRate: 1;
  startPolicy: "once_on_particle_activation";
  rawArguments: {
    argumentAfterRate: 1;
    finalArgument: 0;
  };
  source: "nwtoolset-1.5.0.5-chunk-particle-init-disassembly";
  binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
}

interface AuroraVfxChunkModelResolvedResourceRecord {
  requestedRef: string;
  resourceKey: string;
  sourceLayer: string;
  sourcePath?: string;
  hakName?: string;
  sourceHash?: string;
  resourceHash?: string;
  candidateId?: string;
  precedenceRank?: number;
  resolutionSource: string;
}

interface AuroraVfxProgFxType4LightRecord {
  rowId: number;
  label: string;
  animationRaw: string;
  animation: string;
  animationParameterStatus: string;
  animationKind: string;
  visionMode: string;
  visionParameterStatus: string;
  symbolicColor: string;
  tokenRadiusMeters: number | null;
  tokenRadiusProofStatus: string;
  radiusMeters: number | null;
  radiusProofStatus: string;
  sourceMdlNodeName: string;
  sourceMdlAnimation: string;
  sourceMdlColor: AuroraColorLike | null;
  sourceMdlColorSource: string;
  sourceMdlColorProofStatus: string;
  sourceMdlRadiusMeters: number | null;
  sourceMdlRadiusFrames: [number, number] | null;
  sourceMdlRadiusSource: string;
  sourceMdlRadiusProofStatus: string;
  animationSpeedRaw: string;
  animationSpeed: number | null;
  animationSpeedParameterStatus: string;
  castShadowsRaw: string;
  castShadows: boolean | null;
  castShadowParameterStatus: string;
  priorityRaw: string;
  priority: number | null;
  priorityParameterStatus: string;
  proximitySuppressionRaw: string;
  proximitySuppression: boolean | null;
  proximitySuppressionParameterStatus: string;
  attachToSceneRaw: string;
  attachToScene: boolean | null;
  sceneAttachmentParameterStatus: string;
  modelRaw: string;
  modelRef: string;
  modelParameterStatus: string;
  unusedParam8Raw: string;
  color: AuroraColorLike;
  proofStatus: string;
  notPlaceableTwoDaLight: boolean;
  notMdlLightNode: boolean;
  parameterSource: string;
  parameterPreservationProofSource: string;
  parameterPreservationProofStatus: string;
  runtimeSchedulingStatus: string;
  runtimeSchedulingProofSource: string;
  runtimeSchedulingBlocker: string;
  sceneAttachmentPolicyStatus: string;
  proximitySuppressionPolicyStatus: string;
  visionMutationPolicyStatus: string;
  shadowPolicyStatus: string;
  visualPreviewStatus: string;
  ownerVisualEffectRowId: number | null;
  ownerVisualEffectLabel: string;
  ownerPhase: string;
  ownerProgFxRef: string;
  ownerEffectConstructorKind: string;
  ownerDurationType: string;
}

interface AuroraVfxRenderedBounds {
  width: number;
  height: number;
  depth: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

interface AuroraVfxRenderedMaterialState {
  transparent: boolean;
  depthWrite: boolean;
  depthTest: boolean;
  alphaTest: number;
  alphaTestSource: string;
  opacity: number;
  colorHex: string;
  blending: "normal" | "custom";
  blendSrc: string;
  blendDst: string;
  blendEquation: string;
  mapBound: boolean;
  mapReference: string;
  vertexColors: boolean;
  side: string;
  status: string;
}

interface AuroraParticleDrawRecordLike {
  recordKind: "aurora-particle-draw-record";
  drawRecordId: string;
  emitterNodeName?: string;
  lane: "textured_quad" | "linked_textured_quad";
  particleId: number;
  particleIndex: number;
  ageSeconds: number;
  lifetimeSeconds: number;
  linkedNextParticleId?: number;
  linkedNextPosition?: AuroraVector3Like;
  verticesPerParticle: 6;
  vertexCount: 6;
  position: AuroraVector3Like;
  previousPosition?: AuroraVector3Like;
  velocity: AuroraVector3Like;
  direction?: AuroraVector3Like;
  landed: boolean;
  contactNormal?: AuroraVector3Like;
  splat: boolean;
  inheritedVelocityMagnitude?: number;
  inheritedVelocityDirection?: AuroraVector3Like;
  inheritPart?: boolean;
  rotationRadians: number;
  particleOrientation?: {
    axis: [number, number, number];
    angleRadians: number;
  };
  color: AuroraColorLike;
  alpha: number;
  size: {
    x: number;
    y: number;
  };
  atlasUv: AuroraAtlasUvLike;
  renderMode?: {
    enum?: string;
    rawToken?: string;
  };
  blendMode?: AuroraVfxModeRecord;
  renderOrder?: {
    value: number;
    rawValue?: number;
  };
  emitterOrientation?: {
    axis: [number, number, number];
    angleRadians: number;
  };
  pltLayer?: string;
  pltLayerColorSource?: string;
  diagnostics?: SceneObjectVfxDiagnostic[];
}

type AuroraVfxCanonicalRenderModeBasisMode =
  | "camera_xy_billboard"
  | "world_z_vertical_billboard"
  | "world_z_aligned_camera_billboard"
  | "local_z_vertical_billboard"
  | "particle_orientation_aligned"
  | "motion_blur_velocity_aligned"
  | "landed_splat_contact_plane"
  | "linked_segment_strip";

interface AuroraVfxCanonicalParticleBasis {
  mode: AuroraVfxCanonicalRenderModeBasisMode;
  source: string;
  right: THREE.Vector3;
  up: THREE.Vector3;
  heightScale: number;
  reverseWinding?: boolean;
}

interface AuroraVfxCanonicalCameraBillboardBasis {
  right: THREE.Vector3;
  up: THREE.Vector3;
  reverseWinding?: boolean;
}

interface AuroraVector3Like {
  x: number;
  y: number;
  z: number;
}

interface AuroraColorLike {
  r: number;
  g: number;
  b: number;
}

interface AuroraAtlasUvLike {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  frameIndex: number;
  rawFrameIndex: number;
  mapping: string;
}

const CANONICAL_TEXTURE_MISSING_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_TEXTURE_RESOURCE_MISSING",
  severity: "warn",
  message:
    "Canonical VFX draw records require a resolved texture; frontend kept a diagnostic placeholder and skipped particle draw geometry."
};

const CANONICAL_PUNCH_THROUGH_ALPHA_DISCARD_MISSING_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_PUNCH_THROUGH_ALPHA_DISCARD_REQUIRED",
  severity: "warn",
  message:
    "Canonical Punch-Through rendering requires the source-backed fAlphaDiscardValue=0.2 contract; frontend skipped particle draw geometry because that exact contract was absent."
};

const CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTION_MISSING_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTION_REQUIRED",
  severity: "warn",
  message:
    "Canonical MTR framebuffer/custom-shader rendering requires the resolved Aurora program, include graph, uniforms, and mainscene color/depth capture; frontend skipped the generic material draw instead of inventing execution."
};

const CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTED_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTED",
  severity: "info",
  message:
    "Canonical VFX draw installed the complete Aurora SHD source graph, Toolset compile profile, named uniforms, authored MTR parameters, and recovered attribute layout; retail visual parity remains a separate proof gate."
};

const CANONICAL_CHUNK_LANE_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_CHUNK_LANE_RENDERER_PENDING",
  severity: "warn",
  message:
    "Canonical VFX chunk lane is preserved separately from textured quad particles; frontend chunk model rendering is not implemented in this slice."
};

const CANONICAL_CHUNK_MODEL_PREVIEW_DIAGNOSTIC: SceneObjectVfxDiagnostic = {
  code: "VFX_CANONICAL_CHUNK_MODEL_PREVIEW_RETAIL_PROOF_PENDING",
  severity: "warn",
  message:
    "Canonical VFX chunk lane rendered a resolved local model preview; Aurora/NWN retail timing, transforms, and pixel parity remain unproven."
};

export function isCanonicalAuroraVfxRenderablePayload(
  payload: AuroraVfxPayload | undefined
): boolean {
  return isSourceBackedAuroraVfxRenderablePayload(payload);
}

export function isSourceBackedAuroraVfxRenderablePayload(
  payload: AuroraVfxPayload | undefined
): boolean {
  if (!payload) {
    return false;
  }
  const { rendererEligibility } = resolveAuroraVfxClaimState(payload);
  return (
    rendererEligibility === "source_backed" &&
    payload.contracts.runtimeEmittersDeferred !== true &&
    readAuroraVfxRuntimeRenderContracts(payload).length > 0
  );
}

function registerCanonicalTextureCycleRuntime<T extends THREE.Object3D>(root: T): T {
  const textureCycleRuntime = createAuroraTextureCycleRuntime(root);
  if (!textureCycleRuntime) {
    auroraCanonicalTextureCycleRuntimes.delete(root);
    return root;
  }
  auroraCanonicalTextureCycleRuntimes.set(root, textureCycleRuntime);
  writeCanonicalTextureCycleRuntimeUserData(root, textureCycleRuntime);
  return root;
}

function writeCanonicalTextureCycleRuntimeUserData(
  root: THREE.Object3D,
  textureCycleRuntime: AuroraTextureCycleRuntime
): void {
  const snapshots = textureCycleRuntime.snapshots();
  root.userData = {
    ...root.userData,
    auroraVfxCanonicalTextureCycleStatus: "active",
    auroraVfxCanonicalTextureCycleMode: "aurora-global-resource-frame-clock",
    auroraVfxCanonicalTextureCycleMaterialCount: textureCycleRuntime.materialCount,
    auroraVfxCanonicalTextureCycleTextureCount: textureCycleRuntime.textureCount,
    auroraVfxCanonicalTextureCycleReferences: textureCycleRuntime.references,
    auroraVfxCanonicalTextureCycleSnapshots: snapshots,
    auroraVfxCanonicalTextureCycleFrameIndices: snapshots.map(
      (snapshot) => snapshot.frameIndex
    ),
    auroraVfxCanonicalTextureCycleAccumulators: snapshots.map(
      (snapshot) => snapshot.accumulatorSeconds
    ),
    auroraVfxCanonicalTextureCycleLastRendererFrameSerials: snapshots.map(
      (snapshot) => snapshot.lastRendererFrameSerial
    ),
    auroraVfxCanonicalTextureCycleFrameAdvanceCounts: snapshots.map(
      (snapshot) => snapshot.frameAdvanceCount
    )
  };
}

export function createAuroraVfxCanonicalRenderGroup(
  payload: AuroraVfxPayload,
  options: AuroraVfxCanonicalRenderOptions = {}
): THREE.Group {
  const runtimeFrames = buildCanonicalRuntimeFramePayloads(payload);
  const renderOptions: AuroraVfxCanonicalRenderOptions = {
    ...options,
    chunkParticleMotionHistory: buildCanonicalChunkParticleMotionHistory(
      runtimeFrames,
      options.sourceCoordinateSpace ?? "three-y-up"
    )
  };
  if (runtimeFrames.length > 1) {
    const playbackRoot = new THREE.Group();
    playbackRoot.name = "aurora_vfx_canonical_runtime_playback";
    const referencedObjectContextKey =
      options.referencedObjectContextKey?.trim() || playbackRoot.uuid;
    const createFrame = (frameIndex: number) =>
      createAuroraVfxCanonicalRuntimeFrameGroup(
        runtimeFrames[frameIndex]!,
        frameIndex,
        {
          ...renderOptions,
          referencedObjectContextKey
        }
      );
    if (options.runtimeFrameMaterialization === "lazy") {
      const firstFrame = createFrame(0);
      playbackRoot.add(firstFrame);
      auroraLazyRuntimePlaybackStates.set(playbackRoot, {
        runtimeFrames,
        renderOptions: {
          ...renderOptions,
          referencedObjectContextKey
        },
        currentFrameIndex: 0,
        currentFrame: firstFrame
      });
    } else {
      runtimeFrames.forEach((_, frameIndex) => playbackRoot.add(createFrame(frameIndex)));
    }
    const firstFrameUserData = { ...(playbackRoot.children[0]?.userData ?? {}) };
    delete firstFrameUserData.auroraVfxCanonicalRuntimeFrame;
    delete firstFrameUserData.auroraVfxCanonicalRuntimeFrameIndex;
    delete firstFrameUserData.auroraVfxCanonicalRuntimeFrameTimeSeconds;
    playbackRoot.userData = {
      ...firstFrameUserData,
      auroraVfxRenderer: "canonical",
      auroraVfxCanonicalRenderer: true,
      auroraVfxPreviewRenderer: false,
      auroraVfxCanonicalRuntimePlayback: true,
      auroraVfxCanonicalRuntimePlaybackElapsedSeconds: 0,
      auroraVfxCanonicalRuntimePlaybackDurationSeconds:
        runtimeFrames.at(-1)?.timeSeconds ?? 0,
      auroraVfxCanonicalRuntimePlaybackFrameIndex: 0,
      auroraVfxCanonicalRuntimePlaybackFrameCount: runtimeFrames.length,
      auroraVfxCanonicalRuntimePlaybackFrameTimes: runtimeFrames.map(
        (frame) => frame.timeSeconds
      ),
      auroraVfxCanonicalRuntimePlaybackOneTrigger: true,
      auroraVfxCanonicalRuntimePlaybackLoop: false,
      auroraVfxCanonicalRuntimePlaybackMaterialization:
        options.runtimeFrameMaterialization ?? "eager",
      auroraVfxCanonicalRuntimePlaybackTerminalFrameFrozen: false,
      auroraVfxCanonicalRuntimePlaybackPostDurationHidden: false
    };
    return registerCanonicalTextureCycleRuntime(playbackRoot);
  }
  return registerCanonicalTextureCycleRuntime(
    createAuroraVfxCanonicalSingleFrameGroup(payload, renderOptions)
  );
}

function createAuroraVfxCanonicalRuntimeFrameGroup(
  frame: { timeSeconds: number; payload: AuroraVfxPayload },
  frameIndex: number,
  options: AuroraVfxCanonicalRenderOptions
): THREE.Group {
  const frameGroup = createAuroraVfxCanonicalSingleFrameGroup(frame.payload, {
    ...options,
    modelGraphTimeSeconds: frame.timeSeconds
  });
  const frameContracts = readAuroraVfxRuntimeRenderContracts(frame.payload);
  if (
    frameContracts.length > 0 &&
    frameContracts.every(
      (contract) =>
        contract.drawParticleCount === 0 &&
        (contract.chunkLanes ?? (contract.chunkLane ? [contract.chunkLane] : [])).every(
          (lane) => lane.particleInstances.length === 0
        )
    )
  ) {
    frameGroup.children
      .filter((child) => child.userData.auroraVfxCanonicalDiagnosticPlaceholder === true)
      .forEach((child) => frameGroup.remove(child));
  }
  frameGroup.name = `aurora_vfx_canonical_runtime_frame:${frameIndex}`;
  frameGroup.visible = frameIndex === 0;
  frameGroup.userData = {
    ...frameGroup.userData,
    auroraVfxCanonicalRuntimeFrame: true,
    auroraVfxCanonicalRuntimeFrameIndex: frameIndex,
    auroraVfxCanonicalRuntimeFrameTimeSeconds: frame.timeSeconds,
    ...buildCanonicalAoeVisualOwnerUserData(frame.payload),
    ...buildCanonicalObjectDurationVisualOwnerUserData(frame.payload)
  };
  return frameGroup;
}

function buildCanonicalAoeVisualOwnerUserData(
  payload: AuroraVfxPayload
): Record<string, unknown> {
  const ownersById = new Map<string, Record<string, AuroraVfxJsonValue>>();
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) return {};
  runtimeEmitters.forEach((entry) => {
    if (!isRecord(entry) || !isRecord(entry.aoeVisualOwner)) return;
    const ownerId = readString(entry.aoeVisualOwner.ownerId);
    if (!ownerId) return;
    ownersById.set(
      ownerId,
      entry.aoeVisualOwner as Record<string, AuroraVfxJsonValue>
    );
  });
  if (ownersById.size === 0) return {};
  const owners = [...ownersById.values()];
  const phaseCounts = owners.reduce<Record<string, number>>((counts, owner) => {
    const phase = readString(owner.phase) || "unknown";
    counts[phase] = (counts[phase] ?? 0) + 1;
    return counts;
  }, {});
  return {
    auroraVfxCanonicalAoeVisualOwnerCount: owners.length,
    auroraVfxCanonicalAoePhaseCounts: phaseCounts,
    auroraVfxCanonicalAoeVisualOwners: owners
  };
}

function buildCanonicalObjectDurationVisualOwnerUserData(
  payload: AuroraVfxPayload
): Record<string, unknown> {
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) return {};
  const owner = runtimeEmitters.find(
    (entry) => isRecord(entry) && isRecord(entry.objectDurationVisualOwner)
  );
  if (!isRecord(owner) || !isRecord(owner.objectDurationVisualOwner)) return {};
  const snapshot = owner.objectDurationVisualOwner;
  return {
    auroraVfxCanonicalObjectDurationVisualOwnerVersion:
      readString(snapshot.version),
    auroraVfxCanonicalObjectDurationVisualOwnerPhase:
      readString(snapshot.phase),
    auroraVfxCanonicalObjectDurationVisualOwnerActive:
      snapshot.active !== false,
    auroraVfxCanonicalObjectDurationVisualOwnerEffectRemovalStarted:
      snapshot.effectRemovalStarted === true,
    auroraVfxCanonicalObjectDurationVisualOwnerReleaseComplete:
      snapshot.releaseComplete === true,
    auroraVfxCanonicalObjectDurationVisualOwnerSampledAtMilliseconds:
      readFiniteNumber(snapshot.sampledAtMilliseconds, 0),
    auroraVfxCanonicalObjectDurationVisualOwnerUpdateStepMilliseconds:
      readFiniteNumber(snapshot.updateStepMilliseconds, 0),
    auroraVfxCanonicalObjectDurationVisualOwnerLastUpdateAtMilliseconds:
      readFiniteNumber(snapshot.lastUpdateAtMilliseconds, 0),
    auroraVfxCanonicalObjectDurationVisualOwnerTimerRemainingMilliseconds:
      readFiniteNumber(snapshot.ownerTimerRemainingMilliseconds, 0),
    auroraVfxCanonicalObjectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds:
      readFiniteNumber(snapshot.postRemovalTimerRemainingMilliseconds, 0),
    auroraVfxCanonicalObjectDurationVisualOwnerRemovalProcessedAtMilliseconds:
      readFiniteNumber(snapshot.removalProcessedAtMilliseconds, 0)
  };
}

function createAuroraVfxCanonicalSingleFrameGroup(
  payload: AuroraVfxPayload,
  options: AuroraVfxCanonicalRenderOptions = {}
): THREE.Group {
  const contracts = readAuroraVfxRuntimeRenderContracts(payload);
  const contract = buildAggregateRuntimeRenderContract(contracts);
  const group = new THREE.Group();
  const referencedObjectContextKey =
    options.referencedObjectContextKey?.trim() || group.uuid;
  const modelGraphTimeSeconds =
    options.modelGraphTimeSeconds ?? readCanonicalModelGraphTimeSeconds(payload);
  const selectedModelGraphAnimation = readCanonicalModelGraphAnimation(payload);
  const modelGraphHierarchy = createCanonicalModelGraphHierarchy(
    options.modelGraph,
    group,
    modelGraphTimeSeconds,
    selectedModelGraphAnimation,
    options.sourceCoordinateSpace ?? "three-y-up"
  );
  if ((options.modelGraph?.nodes.length ?? 0) > 0) {
    group.add(modelGraphHierarchy.root);
  }
  attachCanonicalSourceModelGeometry(
    modelGraphHierarchy,
    options.sourceModel,
    options,
    modelGraphTimeSeconds,
    selectedModelGraphAnimation
  );
  const sourceOwnerActive = readCanonicalSourceOwnerActive(payload);
  if (sourceOwnerActive !== false) {
    appendCanonicalSourceMdlLights(
      payload,
      group,
      modelGraphHierarchy,
      options.sourceCoordinateSpace ?? "three-y-up"
    );
  }
  if (!contract) {
    group.userData = buildCanonicalRootUserData(payload, null, {
      diagnostics: [
        {
          code: "VFX_CANONICAL_RENDER_CONTRACT_REQUIRED",
          severity: "error",
          message:
            "Canonical VFX payload did not contain a renderer-agnostic runtime render contract."
        }
      ],
      renderedDrawParticleCount: 0,
      renderedVertexCount: 0,
      textureStatus: "missing-render-contract",
      materialState: null
    });
    group.add(createDiagnosticPlaceholder(options.objectRadius, group.userData.auroraVfxDiagnosticCodes));
    return group;
  }
  if (sourceOwnerActive === false) {
    group.userData = {
      ...buildCanonicalRootUserData(payload, contract, {
        diagnostics: mergeDiagnostics([
          ...collectPayloadDiagnostics(payload),
          ...payload.diagnostics.renderContract,
          ...contracts.flatMap((entry) => entry.diagnostics)
        ]),
        renderedDrawParticleCount: 0,
        renderedVertexCount: 0,
        renderedChunkModelCount: 0,
        renderedBounds: null,
        textureStatus: "owner-released",
        materialState: null
      }),
      auroraVfxCanonicalSourceOwnerActive: false,
      ...buildCanonicalObjectDurationVisualOwnerUserData(payload)
    };
    return group;
  }

  const chunkLaneModelEntries = contracts.flatMap((entry) =>
    createCanonicalChunkLaneModelGroups(
      entry,
      options,
      referencedObjectContextKey
    ).map((group) => ({
      emitterNodeName: entry.emitterNodeName,
      group
    }))
  );
  const chunkLaneModels = chunkLaneModelEntries.map((entry) => entry.group);
  const texturedContracts = contracts.filter((entry) => entry.drawLane !== "chunk_model");
  if (texturedContracts.length === 0) {
    const diagnostics = mergeDiagnostics([
      ...collectPayloadDiagnostics(payload),
      ...payload.diagnostics.renderContract,
      ...contracts.flatMap((entry) => entry.diagnostics),
      ...buildCanonicalChunkLaneDiagnostics(contract, chunkLaneModels)
    ]);
    const renderedChunkModelCount = countCanonicalChunkLaneModelInstances(chunkLaneModels);
    const renderedChunkBounds = mergeObjectBounds(chunkLaneModels);
    group.userData = buildCanonicalRootUserData(payload, contract, {
      diagnostics,
      renderedDrawParticleCount: 0,
      renderedVertexCount: 0,
      renderedChunkModelCount,
      renderedBounds: renderedChunkBounds,
      textureStatus: "chunk-lane-preserved",
      materialState: null
    });
    if (chunkLaneModels.length > 0) {
      if (options.sourceCoordinateSpace === "aurora-z-up") {
        chunkLaneModelEntries.forEach((entry) => group.add(entry.group));
      } else {
        attachCanonicalChunkLaneModelGroups(modelGraphHierarchy, chunkLaneModelEntries);
      }
    } else {
      const placeholder = createDiagnosticPlaceholder(
        options.objectRadius,
        diagnostics.map((diagnostic) => diagnostic.code)
      );
      placeholder.userData = {
        ...placeholder.userData,
        auroraVfxCanonicalChunkLanePlaceholder: true,
        auroraVfxCanonicalTexturedQuadLane: false
      };
      group.add(placeholder);
    }
    return group;
  }

  const missingTextureDiagnostics: SceneObjectVfxDiagnostic[] = [];
  const unresolvedMaterialDiagnostics: SceneObjectVfxDiagnostic[] = [];
  const customProgramDiagnostics: SceneObjectVfxDiagnostic[] = [];
  let renderedDrawParticleCount = 0;
  let renderedVertexCount = 0;
  let materialState: AuroraVfxRenderedMaterialState | null = null;
  let textureReference: string | null = null;
  let renderedBounds: AuroraVfxRenderedBounds | null = null;

  for (const entry of texturedContracts) {
    if (
      requiresAuroraMtrFramebufferExecution(entry) &&
      !requiresAuroraMtrCustomShaderExecution(entry)
    ) {
      unresolvedMaterialDiagnostics.push(
        CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTION_MISSING_DIAGNOSTIC
      );
      continue;
    }
    if (
      entry.blendMode.enum === "punch_through" &&
      !hasConfirmedPunchThroughAlphaDiscard(entry)
    ) {
      unresolvedMaterialDiagnostics.push(
        CANONICAL_PUNCH_THROUGH_ALPHA_DISCARD_MISSING_DIAGNOSTIC
      );
      continue;
    }
    const entryTextureReference = resolveAuroraVfxCanonicalTextureReference(
      payload,
      entry.emitterNodeName
    );
    const texture = resolveTexture(options.particleTexturesByReference, entryTextureReference);
    if (!texture) {
      missingTextureDiagnostics.push(CANONICAL_TEXTURE_MISSING_DIAGNOSTIC);
      continue;
    }
    const textureSamplerState = resolveAuroraVfxCanonicalTextureSamplerState(
      options.particleTextureSamplerStatesByReference,
      entryTextureReference
    );
    applyAuroraVfxCanonicalTextureSamplerState(texture, textureSamplerState);

    const drawRecords = entry.drawRecords
      .map((record) => options.drawRecordTransform?.(record) ?? record)
      .filter(isTexturedQuadDrawRecord);
    if (drawRecords.length === 0) {
      continue;
    }
    const customProgramRequested = requiresAuroraMtrCustomShaderExecution(entry);
    const rawGammaParticleLane = customProgramRequested
      ? null
      : resolveAuroraRawGammaParticleLane(entry);
    const additiveRadianceCalibration =
      rawGammaParticleLane === "aurora_raw_gamma_additive_before_retail_bloom"
        ? resolveAuroraVfxAdditiveParticleRadianceCalibration(
            options.additiveParticleRadianceCalibration
          )
        : null;
    const packedGammaVertexColorLane =
      !customProgramRequested && rawGammaParticleLane === null;
    const geometryDrawRecords = packedGammaVertexColorLane
      ? drawRecords.map(convertAuroraPackedGammaParticleColorToLinearScene)
      : drawRecords;
    const particleSoftDepthState =
      resolveAuroraVfxCanonicalParticleSoftDepthState({
        renderMode: entry.renderMode.enum ?? entry.renderMode.rawToken,
        drawRecords: geometryDrawRecords
      });
    const particleFogBranch: AuroraVfxCanonicalParticleFogBranch =
      rawGammaParticleLane ===
      "aurora_raw_gamma_additive_before_retail_bloom"
        ? "additive_alpha_attenuation"
        : "normal_rgb_mix";
    const geometry = buildCanonicalTexturedQuadGeometry(
      geometryDrawRecords,
      options.sourceCoordinateSpace ?? "three-y-up",
      undefined,
      additiveRadianceCalibration?.scale ?? 1
    );
    const material = new THREE.MeshBasicMaterial({
      map: rawGammaParticleLane
        ? acquireAuroraRawGammaParticleTexture(texture)
        : texture,
      vertexColors: true
    });
    if (rawGammaParticleLane) {
      installAuroraRawGammaParticleTextureRelease(material, texture);
      material.toneMapped = false;
    }
    bindAuroraMtrReplacementTextures(
      material,
      entry.materialState,
      options.particleTexturesByReference
    );
    if (!customProgramRequested) {
      installCanonicalParticleAlphaShader(
        material,
        rawGammaParticleLane
          ? {
              softDepthState: particleSoftDepthState,
              fogBranch: particleFogBranch
            }
          : undefined
      );
    }
    const entryMaterialState = applyRenderContractMaterialAdapterState(
      material,
      entry,
      entryTextureReference
    );
    const mesh = new THREE.Mesh(geometry, material);
    installCanonicalCameraBillboardUpdater(
      mesh,
      geometryDrawRecords,
      options.sourceCoordinateSpace ?? "three-y-up",
      additiveRadianceCalibration?.scale ?? 1
    );
    if (customProgramRequested) {
      const customShaderInstall = installAuroraMtrCustomShaderProgram({
        mesh,
        material,
        state: toAuroraMtrCustomShaderState(
          entry.materialState,
          entry.blendMode.enum === "punch_through" ? "punchthrough" : undefined
        ),
        texturesBySlot: resolveAuroraMtrTexturesBySlot(
          entry.materialState,
          options.particleTexturesByReference
        )
      });
      if (customShaderInstall.status !== "installed") {
        unresolvedMaterialDiagnostics.push(
          CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTION_MISSING_DIAGNOSTIC
        );
        geometry.dispose();
        material.dispose();
        continue;
      }
      entryMaterialState.status =
        "applied-mtr-custom-program-adapter-retail-proof-pending";
      customProgramDiagnostics.push(CANONICAL_MTR_CUSTOM_PROGRAM_EXECUTED_DIAGNOSTIC);
    }
    const entryBounds = readGeometryBounds(geometry);
    renderedBounds = mergeRenderedBounds(renderedBounds, entryBounds);
    materialState ??= entryMaterialState;
    textureReference ??= entryTextureReference;
    mesh.userData = {
      ...mesh.userData,
      ...buildCanonicalDrawMeshUserData(
        entry,
        drawRecords,
        geometry,
        entryTextureReference,
        entryMaterialState
      ),
      auroraVfxCanonicalParticleTextureBinding: AURORA_PARTICLE_TEXTURE_BINDING,
      auroraVfxCanonicalParticleAlphaSource: AURORA_PARTICLE_ALPHA_SOURCE,
      auroraVfxCanonicalInferredAlphaCompanion: false,
      auroraVfxCanonicalParticleTextureBindingSourceSha256:
        AURORA_PARTICLE_TEXTURE_BINDING_SOURCE_SHA256,
      ...(rawGammaParticleLane
        ? {
            auroraVfxCanonicalParticleSoftDepthState: {
              ...particleSoftDepthState
            },
            auroraVfxCanonicalParticleFogBranch: particleFogBranch
          }
        : {}),
      ...(rawGammaParticleLane
        ? {
            auroraVfxCanonicalColorAccumulationLane:
              rawGammaParticleLane,
            auroraVfxCanonicalParticleTextureColorSpace: "NoColorSpace",
            auroraVfxCanonicalParticleShaderColorSpaceSource:
              "retail-fsparticle-vsparticle-no-ApplyColorSpace-no-RevertColorSpace"
          }
        : packedGammaVertexColorLane
          ? {
              auroraVfxCanonicalParticleVertexColorLane:
                "aurora_packed_gamma_to_linear_scene",
              auroraVfxCanonicalParticleVertexColorSource:
                "decompiled_all.c:856080-856300 packs evaluated RGB*255.99 directly into particle vertex bytes",
              auroraVfxCanonicalParticleVertexColorOutputSource:
                "AuroraRetailBloomPass toAuroraGamma converts the linear scene target back to Aurora display gamma"
            }
          : {})
    };
    if (additiveRadianceCalibration) {
      mesh.userData = {
        ...mesh.userData,
        auroraVfxCanonicalAdditiveRadianceScale:
          additiveRadianceCalibration.scale,
        auroraVfxCanonicalAdditiveRadianceCalibrationSource:
          additiveRadianceCalibration.sourceEvidence
      };
    }
    if (textureSamplerState) {
      mesh.userData.auroraVfxCanonicalTextureSamplerState = {
        ...textureSamplerState
      };
      material.userData.auroraVfxCanonicalTextureSamplerState = {
        ...textureSamplerState
      };
    }
    material.userData = {
      ...material.userData,
      auroraVfxCanonicalParticleTextureBinding: AURORA_PARTICLE_TEXTURE_BINDING,
      auroraVfxCanonicalParticleAlphaSource: AURORA_PARTICLE_ALPHA_SOURCE,
      auroraVfxCanonicalInferredAlphaCompanion: false,
      auroraVfxCanonicalParticleTextureBindingSourceSha256:
        AURORA_PARTICLE_TEXTURE_BINDING_SOURCE_SHA256,
      ...(rawGammaParticleLane
        ? {
            auroraVfxCanonicalParticleSoftDepthState: {
              ...particleSoftDepthState
            },
            auroraVfxCanonicalParticleFogBranch: particleFogBranch
          }
        : {})
    };
    if (additiveRadianceCalibration) {
      material.userData = {
        ...material.userData,
        auroraVfxCanonicalAdditiveRadianceScale:
          additiveRadianceCalibration.scale,
        auroraVfxCanonicalAdditiveRadianceCalibrationSource:
          additiveRadianceCalibration.sourceEvidence
      };
    }
    if (rawGammaParticleLane) {
      material.userData = {
        ...material.userData,
        auroraVfxCanonicalColorAccumulationLane:
          rawGammaParticleLane,
        auroraVfxCanonicalParticleTextureColorSpace: "NoColorSpace",
        auroraVfxCanonicalParticleShaderColorSpaceSource:
          "retail-fsparticle-vsparticle-no-ApplyColorSpace-no-RevertColorSpace"
      };
    } else if (packedGammaVertexColorLane) {
      material.userData = {
        ...material.userData,
        auroraVfxCanonicalParticleVertexColorLane:
          "aurora_packed_gamma_to_linear_scene",
        auroraVfxCanonicalParticleVertexColorSource:
          "decompiled_all.c:856080-856300 packs evaluated RGB*255.99 directly into particle vertex bytes",
        auroraVfxCanonicalParticleVertexColorOutputSource:
          "AuroraRetailBloomPass toAuroraGamma converts the linear scene target back to Aurora display gamma"
      };
    }
    attachAuroraVfxDrawQueueRecord(mesh, {
      laneKey: resolveAuroraVfxDrawQueueLaneKey(entry),
      referencedObjectContextKey,
      renderOrderShort: entry.renderOrder.value
    });
    if (options.sourceCoordinateSpace === "aurora-z-up") {
      // Runtime particles already contain the emitter's source-model position.
      group.add(mesh);
    } else {
      modelGraphHierarchy
        .getEmitterParentGroup(entry.emitterNodeName ?? drawRecords[0]?.emitterNodeName)
        .add(mesh);
    }
    renderedDrawParticleCount += drawRecords.length;
    renderedVertexCount += geometry.getAttribute("position").count;
  }
  chunkLaneModelEntries.forEach((entry) => {
    if (options.sourceCoordinateSpace === "aurora-z-up") {
      group.add(entry.group);
    } else {
      modelGraphHierarchy.getEmitterParentGroup(entry.emitterNodeName).add(entry.group);
    }
    renderedBounds = mergeRenderedBounds(renderedBounds, readObjectBounds(entry.group));
  });

  if (renderedDrawParticleCount === 0) {
    const renderedChunkModelCount = countCanonicalChunkLaneModelInstances(chunkLaneModels);
    const diagnostics = mergeDiagnostics([
      ...collectPayloadDiagnostics(payload),
      ...payload.diagnostics.renderContract,
      ...contracts.flatMap((entry) => entry.diagnostics),
      ...contract.drawRecords.flatMap((record) => record.diagnostics ?? []),
      ...missingTextureDiagnostics,
      ...unresolvedMaterialDiagnostics,
      ...customProgramDiagnostics,
      ...buildCanonicalChunkLaneDiagnostics(contract, chunkLaneModels)
    ]);
    group.userData = buildCanonicalRootUserData(payload, contract, {
      diagnostics,
      renderedDrawParticleCount: 0,
      renderedVertexCount: 0,
      renderedChunkModelCount,
      renderedBounds,
      textureReference,
      textureStatus:
        unresolvedMaterialDiagnostics.length > 0 ? "material-unresolved" : "missing",
      materialState: null
    });
    if (renderedChunkModelCount === 0) {
      group.add(
        createDiagnosticPlaceholder(
          options.objectRadius,
          diagnostics.map((diagnostic) => diagnostic.code)
        )
      );
    }
    return group;
  }

  const diagnostics = mergeDiagnostics([
    ...collectPayloadDiagnostics(payload),
    ...payload.diagnostics.renderContract,
    ...contracts.flatMap((entry) => entry.diagnostics),
    ...contract.drawRecords.flatMap((record) => record.diagnostics ?? []),
    ...missingTextureDiagnostics,
    ...unresolvedMaterialDiagnostics,
    ...customProgramDiagnostics,
    ...buildCanonicalChunkLaneDiagnostics(contract, chunkLaneModels)
  ]);
  group.userData = buildCanonicalRootUserData(payload, contract, {
    diagnostics,
    renderedDrawParticleCount,
    renderedVertexCount,
    renderedChunkModelCount: countCanonicalChunkLaneModelInstances(chunkLaneModels),
    renderedBounds,
    textureReference,
    textureStatus: "applied",
    materialState
  });
  for (const entry of contracts) {
    for (const marker of createProgFxType4RequestMarkers(entry)) {
      group.add(marker);
    }
  }
  const progFxType4PointLight = createProgFxType4PointLightPreview(
    resolveProgFxType4SingleUserDataLight(contract)
  );
  if (progFxType4PointLight) {
    group.add(progFxType4PointLight);
    group.userData = {
      ...group.userData,
      auroraVfxProgFxType4PointLightPreviewStatus:
        AURORA_PROGFX_TYPE4_POINT_LIGHT_PREVIEW_STATUS,
      auroraVfxProgFxType4PointLightPreviewSource:
        AURORA_PROGFX_TYPE4_POINT_LIGHT_PREVIEW_SOURCE,
      auroraVfxProgFxType4PointLightCount: 1
    };
  }
  return group;
}

export function advanceAuroraVfxCanonicalRuntimePlayback(
  playbackRoot: THREE.Object3D,
  deltaSeconds: number,
  rendererFrameSerial?: number,
  rendererDeltaSeconds?: number
): boolean {
  if (
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return false;
  }
  const textureCycleRuntime = auroraCanonicalTextureCycleRuntimes.get(playbackRoot);
  textureCycleRuntime?.apply(
    rendererDeltaSeconds ?? deltaSeconds,
    undefined,
    rendererFrameSerial
  );
  if (textureCycleRuntime) {
    writeCanonicalTextureCycleRuntimeUserData(playbackRoot, textureCycleRuntime);
  }
  if (playbackRoot.userData.auroraVfxCanonicalRuntimePlayback !== true) {
    return false;
  }
  const previousElapsed = readFiniteNumber(
    playbackRoot.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds,
    0
  );
  return seekAuroraVfxCanonicalRuntimePlayback(
    playbackRoot,
    previousElapsed + deltaSeconds
  );
}

export function seekAuroraVfxCanonicalRuntimePlayback(
  playbackRoot: THREE.Object3D,
  elapsedSeconds: number
): boolean {
  if (
    playbackRoot.userData.auroraVfxCanonicalRuntimePlayback !== true ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0
  ) {
    return false;
  }
  let runtimeFrames = playbackRoot.children.filter(
    (child) => child.userData.auroraVfxCanonicalRuntimeFrame === true
  );
  if (runtimeFrames.length === 0) return false;
  const frameTimes = Array.isArray(
    playbackRoot.userData.auroraVfxCanonicalRuntimePlaybackFrameTimes
  )
    ? playbackRoot.userData.auroraVfxCanonicalRuntimePlaybackFrameTimes.filter(
        (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
      )
    : [];
  if (frameTimes.length === 0) return false;
  const duration = frameTimes.at(-1) ?? 0;
  const elapsed = Math.min(duration, elapsedSeconds);
  const postDuration = elapsedSeconds > duration + 1e-9;
  let frameIndex = 0;
  for (let index = 1; index < frameTimes.length; index += 1) {
    if (frameTimes[index]! > elapsed + 1e-9) break;
    frameIndex = index;
  }
  const lazyState = auroraLazyRuntimePlaybackStates.get(playbackRoot);
  if (lazyState && lazyState.currentFrameIndex !== frameIndex) {
    const nextFrame = createAuroraVfxCanonicalRuntimeFrameGroup(
      lazyState.runtimeFrames[frameIndex]!,
      frameIndex,
      lazyState.renderOptions
    );
    releaseAuroraVfxCanonicalRuntimeFrame(lazyState.currentFrame);
    playbackRoot.remove(lazyState.currentFrame);
    playbackRoot.add(nextFrame);
    registerCanonicalTextureCycleRuntime(playbackRoot);
    lazyState.currentFrame = nextFrame;
    lazyState.currentFrameIndex = frameIndex;
    runtimeFrames = [nextFrame];
  }
  runtimeFrames.forEach((child) => {
    child.visible =
      !postDuration &&
      child.userData.auroraVfxCanonicalRuntimeFrameIndex === frameIndex;
  });
  playbackRoot.userData = {
    ...playbackRoot.userData,
    auroraVfxCanonicalRuntimePlaybackElapsedSeconds: elapsed,
    auroraVfxCanonicalRuntimePlaybackFrameIndex: frameIndex,
    auroraVfxCanonicalRuntimePlaybackCompleted: elapsedSeconds >= duration,
    auroraVfxCanonicalRuntimePlaybackTerminalFrameFrozen: false,
    auroraVfxCanonicalRuntimePlaybackPostDurationHidden: postDuration
  };
  return true;
}

function releaseAuroraVfxCanonicalRuntimeFrame(frame: THREE.Object3D): void {
  frame.traverse((node) => {
    if (
      !(node instanceof THREE.Mesh) ||
      node.userData.auroraVfxCanonicalDrawMesh !== true
    ) {
      return;
    }
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material.dispose());
  });
}

function buildCanonicalRuntimeFramePayloads(
  payload: AuroraVfxPayload
): Array<{ timeSeconds: number; payload: AuroraVfxPayload }> {
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters) || runtimeEmitters.length === 0) return [];
  const emitterRecords: Array<Record<string, AuroraVfxJsonValue>> = [];
  for (const entry of runtimeEmitters) {
    if (!isRecord(entry)) return [];
    emitterRecords.push(entry as Record<string, AuroraVfxJsonValue>);
  }
  const frameArrays: Array<Array<Record<string, AuroraVfxJsonValue>>> = emitterRecords.map(
    (entry) =>
      Array.isArray(entry.runtimeFrames)
        ? entry.runtimeFrames.filter(isRecord).map(
            (frame) => frame as Record<string, AuroraVfxJsonValue>
          )
        : []
  );
  const frameCount = Math.min(...frameArrays.map((frames) => frames.length));
  if (!Number.isFinite(frameCount) || frameCount <= 1) return [];
  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const runtimeFrameEntries = emitterRecords.map((entry, emitterIndex) => {
      const frame = frameArrays[emitterIndex]![frameIndex]!;
      return {
        ...entry,
        ...(isRecord(frame.selectedAnimation)
          ? { selectedAnimation: frame.selectedAnimation }
          : {}),
        ...(isRecord(frame.sourceOwnerTransform)
          ? { sourceOwnerTransform: frame.sourceOwnerTransform }
          : {}),
        ...(isRecord(frame.aoeVisualOwner)
          ? { aoeVisualOwner: frame.aoeVisualOwner }
          : {}),
        ...(isRecord(frame.objectDurationVisualOwner)
          ? { objectDurationVisualOwner: frame.objectDurationVisualOwner }
          : {}),
        runtimeState: frame.runtimeState,
        runtimeSnapshot: frame.runtimeSnapshot,
        renderContract: frame.renderContract
      };
    });
    const timeSeconds = readFiniteNumber(frameArrays[0]![frameIndex]!.timeSeconds, 0);
    return {
      timeSeconds,
      payload: {
        ...payload,
        contracts: {
          ...payload.contracts,
          runtimeEmitters: runtimeFrameEntries,
          renderContract: runtimeFrameEntries[0]?.renderContract
        }
      }
    };
  });
}

export function resolveAuroraVfxCanonicalTextureReference(
  payload: AuroraVfxPayload,
  emitterNodeName?: string
): string | null {
  const dependencyGraph = payload.contracts.dependencyGraph;
  if (!isRecord(dependencyGraph) || !Array.isArray(dependencyGraph.edges)) {
    return null;
  }
  const normalizedEmitterNeedle = emitterNodeName ? `/emitter:${emitterNodeName}/` : "";
  const fallbackReferences: string[] = [];
  for (const edge of dependencyGraph.edges) {
    if (!isRecord(edge)) {
      continue;
    }
    const edgeType = readString(edge.edgeType);
    const requestedClass = readString(edge.requestedResourceClass);
    if (edgeType !== "texture" && requestedClass !== "texture") {
      continue;
    }
    const selectedCandidate = isRecord(edge.selectedCandidate)
      ? edge.selectedCandidate
      : undefined;
    const selectedResourceKey = readString(selectedCandidate?.resourceKey);
    const requestedRef = readString(edge.requestedRef);
    const reference = normalizeResourceReference(selectedResourceKey || requestedRef);
    if (reference) {
      const ownerPath = readString(edge.ownerPath);
      if (!normalizedEmitterNeedle || ownerPath.includes(normalizedEmitterNeedle)) {
        return reference;
      }
      fallbackReferences.push(reference);
    }
  }
  return fallbackReferences[0] ?? null;
}

export function resolveAuroraVfxCanonicalPltPaletteResolution(
  payload: AuroraVfxPayload
): AuroraVfxCanonicalPltPaletteResolution {
  const contexts = readAuroraVfxRuntimeRenderContracts(payload).flatMap((contract) =>
    contract.pltRenderContext ? [contract.pltRenderContext] : []
  );
  if (contexts.length === 0) {
    return { status: "not-applicable" };
  }
  if (
    contexts.some(
      (context) =>
        context.status !== "ready" ||
        !context.paletteRowsByLayer ||
        Object.keys(context.paletteRowsByLayer).length === 0
    )
  ) {
    return { status: "missing-target-context" };
  }

  const signatures = new Set(
    contexts.map((context) => buildPltPaletteRowSignature(context.paletteRowsByLayer ?? {}))
  );
  if (signatures.size !== 1) {
    return { status: "conflicting-context" };
  }

  const firstRows = contexts[0]?.paletteRowsByLayer ?? {};
  return {
    status: "ready",
    paletteRowsByLayer: Object.fromEntries(
      Object.entries(firstRows).map(([layer, row]) => [Number.parseInt(layer, 10), row])
    )
  };
}

export function resolveAuroraVfxCanonicalPltPaletteRows(
  payload: AuroraVfxPayload
): Readonly<Record<number, number | undefined>> | undefined {
  const resolution = resolveAuroraVfxCanonicalPltPaletteResolution(payload);
  return resolution.status === "ready" ? resolution.paletteRowsByLayer : undefined;
}

function buildCanonicalDrawMeshUserData(
  contract: AuroraVfxRuntimeRenderContractRecord,
  drawRecords: AuroraParticleDrawRecordLike[],
  geometry: THREE.BufferGeometry,
  textureReference: string | null,
  materialState: AuroraVfxRenderedMaterialState
): Record<string, unknown> {
  return {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalRenderer: true,
    auroraVfxPreviewRenderer: false,
    auroraVfxCanonicalDrawMesh: true,
    auroraVfxCanonicalDrawLane: contract.drawLane,
    auroraVfxCanonicalTextureReference: textureReference,
    auroraVfxCanonicalTextureStatus: "applied",
    auroraVfxCanonicalDrawParticleCount: drawRecords.length,
    auroraVfxCanonicalDrawVertexCount: geometry.getAttribute("position").count,
    auroraVfxCanonicalVerticesPerParticle: 6,
    auroraVfxCanonicalDrawRecordIds: drawRecords.map((record) => record.drawRecordId),
    auroraVfxCanonicalEmitterNodeNames: drawRecords.map((record) => record.emitterNodeName ?? ""),
    auroraVfxCanonicalDrawRecordLanes: drawRecords.map((record) => record.lane),
    auroraVfxCanonicalParticleIds: drawRecords.map((record) => record.particleId),
    auroraVfxCanonicalParticleIndexes: drawRecords.map((record) => record.particleIndex),
    auroraVfxCanonicalPositionX: drawRecords.map((record) => record.position.x),
    auroraVfxCanonicalPositionY: drawRecords.map((record) => record.position.y),
    auroraVfxCanonicalPositionZ: drawRecords.map((record) => record.position.z),
    auroraVfxCanonicalVelocityX: drawRecords.map((record) => record.velocity.x),
    auroraVfxCanonicalVelocityY: drawRecords.map((record) => record.velocity.y),
    auroraVfxCanonicalVelocityZ: drawRecords.map((record) => record.velocity.z),
    auroraVfxCanonicalDirectionX: drawRecords.map((record) => record.direction?.x ?? 0),
    auroraVfxCanonicalDirectionY: drawRecords.map((record) => record.direction?.y ?? 0),
    auroraVfxCanonicalDirectionZ: drawRecords.map((record) => record.direction?.z ?? 0),
    auroraVfxCanonicalLanded: drawRecords.map((record) => record.landed),
    auroraVfxCanonicalSplat: drawRecords.map((record) => record.splat),
    auroraVfxCanonicalContactNormalX: drawRecords.map(
      (record) => record.contactNormal?.x ?? 0
    ),
    auroraVfxCanonicalContactNormalY: drawRecords.map(
      (record) => record.contactNormal?.y ?? 0
    ),
    auroraVfxCanonicalContactNormalZ: drawRecords.map(
      (record) => record.contactNormal?.z ?? 0
    ),
    auroraVfxCanonicalInheritedVelocityMagnitude: drawRecords.map(
      (record) => record.inheritedVelocityMagnitude ?? 0
    ),
    auroraVfxCanonicalInheritedVelocityDirectionX: drawRecords.map(
      (record) => record.inheritedVelocityDirection?.x ?? 0
    ),
    auroraVfxCanonicalInheritedVelocityDirectionY: drawRecords.map(
      (record) => record.inheritedVelocityDirection?.y ?? 0
    ),
    auroraVfxCanonicalInheritedVelocityDirectionZ: drawRecords.map(
      (record) => record.inheritedVelocityDirection?.z ?? 0
    ),
    auroraVfxCanonicalInheritPart: drawRecords.map((record) => record.inheritPart === true),
    auroraVfxCanonicalRotationRadians: drawRecords.map((record) => record.rotationRadians),
    auroraVfxCanonicalColorR: drawRecords.map((record) => record.color.r),
    auroraVfxCanonicalColorG: drawRecords.map((record) => record.color.g),
    auroraVfxCanonicalColorB: drawRecords.map((record) => record.color.b),
    auroraVfxCanonicalParticleSizeX: drawRecords.map((record) => record.size.x),
    auroraVfxCanonicalParticleSizeY: drawRecords.map((record) => record.size.y),
    auroraVfxCanonicalAlpha: drawRecords.map((record) => record.alpha),
    auroraVfxCanonicalPackedRgbaVertexBoundary:
      geometry.userData.auroraVfxCanonicalPackedRgbaVertexBoundary === true,
    auroraVfxCanonicalPackedRgbaVertexScale:
      geometry.userData.auroraVfxCanonicalPackedRgbaVertexScale,
    auroraVfxCanonicalPackedRgbaVertexRounding:
      geometry.userData.auroraVfxCanonicalPackedRgbaVertexRounding,
    auroraVfxCanonicalPackedRgbaVertexNormalization:
      geometry.userData.auroraVfxCanonicalPackedRgbaVertexNormalization,
    auroraVfxCanonicalPackedRgbaVertexSource:
      geometry.userData.auroraVfxCanonicalPackedRgbaVertexSource,
    auroraVfxCanonicalRecordVerticesPerParticle: drawRecords.map(
      (record) => record.verticesPerParticle
    ),
    auroraVfxCanonicalPltLayers: drawRecords.map((record) => record.pltLayer ?? ""),
    auroraVfxCanonicalPltLayerColorSources: drawRecords.map(
      (record) => record.pltLayerColorSource ?? ""
    ),
    auroraVfxCanonicalAtlasFrames: drawRecords.map((record) => record.atlasUv.frameIndex),
    auroraVfxCanonicalAtlasUvU0: drawRecords.map((record) => record.atlasUv.u0),
    auroraVfxCanonicalAtlasUvV0: drawRecords.map((record) => record.atlasUv.v0),
    auroraVfxCanonicalAtlasUvU1: drawRecords.map((record) => record.atlasUv.u1),
    auroraVfxCanonicalAtlasUvV1: drawRecords.map((record) => record.atlasUv.v1),
    auroraVfxCanonicalRenderMode: contract.renderMode.enum ?? "unknown",
    auroraVfxCanonicalRenderModeRawToken: contract.renderMode.rawToken ?? "",
    auroraVfxCanonicalBlendMode: contract.blendMode.enum ?? "unknown",
    auroraVfxCanonicalBlendModeRawToken: contract.blendMode.rawToken ?? "",
    auroraVfxCanonicalBlendFactorStatus:
      contract.blendMode.exactGlBlendFactors?.status ?? "missing",
    auroraVfxCanonicalBlendSourceFactor:
      contract.blendMode.exactGlBlendFactors?.sourceFactor ?? "",
    auroraVfxCanonicalBlendDestinationFactor:
      contract.blendMode.exactGlBlendFactors?.destinationFactor ?? "",
    auroraVfxCanonicalBlendTableIndices:
      contract.blendMode.exactGlBlendFactors?.blendTableIndices ?? [],
    auroraVfxCanonicalMtrMaterialReference:
      readString(contract.materialState?.materialRef) ?? "",
    auroraVfxCanonicalMtrMaterialState: contract.materialState ?? null,
    auroraVfxCanonicalRenderOrder: contract.renderOrder.value,
    auroraVfxCanonicalMaterialTransparent: materialState.transparent,
    auroraVfxCanonicalMaterialDepthWrite: materialState.depthWrite,
    auroraVfxCanonicalMaterialDepthTest: materialState.depthTest,
    auroraVfxCanonicalMaterialAlphaTest: materialState.alphaTest,
    auroraVfxCanonicalMaterialAlphaTestSource: materialState.alphaTestSource,
    auroraVfxCanonicalMaterialOpacity: materialState.opacity,
    auroraVfxCanonicalMaterialColorHex: materialState.colorHex,
    auroraVfxCanonicalMaterialBlending: materialState.blending,
    auroraVfxCanonicalMaterialBlendSrc: materialState.blendSrc,
    auroraVfxCanonicalMaterialBlendDst: materialState.blendDst,
    auroraVfxCanonicalMaterialBlendEquation: materialState.blendEquation,
    auroraVfxCanonicalMaterialMapBound: materialState.mapBound,
    auroraVfxCanonicalMaterialMapReference: materialState.mapReference,
    auroraVfxCanonicalMaterialVertexColors: materialState.vertexColors,
    auroraVfxCanonicalMaterialSide: materialState.side,
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxMaterialAdapterSource: "aurora-render-contract",
    auroraVfxRetailParityProof: false,
    ...buildProgFxType4LightUserData(resolveProgFxType4SingleUserDataLight(contract))
  };
}

function readCanonicalModelGraphTimeSeconds(payload: AuroraVfxPayload): number {
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) return 0;
  for (const entry of runtimeEmitters) {
    if (!isRecord(entry) || !isRecord(entry.runtimeState)) continue;
    const sourceClockSeconds = entry.runtimeState.sourceClockSeconds;
    if (typeof sourceClockSeconds === "number" && Number.isFinite(sourceClockSeconds)) {
      return Math.max(0, sourceClockSeconds);
    }
  }
  return 0;
}

interface CanonicalModelGraphAnimation {
  animationName: string;
  currentTimeSeconds: number;
  blendWeight: number;
}

function readCanonicalModelGraphAnimation(
  payload: AuroraVfxPayload
): CanonicalModelGraphAnimation | undefined {
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) return undefined;
  for (const entry of runtimeEmitters) {
    if (!isRecord(entry) || !isRecord(entry.selectedAnimation)) continue;
    const animationName = readString(entry.selectedAnimation.animationName);
    const currentTimeSeconds = entry.selectedAnimation.currentTimeSeconds;
    const blendWeight = entry.selectedAnimation.blendWeight;
    if (
      animationName &&
      typeof currentTimeSeconds === "number" &&
      Number.isFinite(currentTimeSeconds)
    ) {
      return {
        animationName,
        currentTimeSeconds: Math.max(0, currentTimeSeconds),
        blendWeight:
          typeof blendWeight === "number" && Number.isFinite(blendWeight)
            ? THREE.MathUtils.clamp(blendWeight, 0, 1)
            : 1
      };
    }
  }
  return undefined;
}

function readAuroraVfxRuntimeRenderContracts(
  payload: AuroraVfxPayload
): AuroraVfxRuntimeRenderContractRecord[] {
  if (payload.contracts.runtimeEmittersDeferred === true) {
    return [];
  }
  const runtimeEmitterContracts = readRuntimeEmitterRenderContracts(payload.contracts.runtimeEmitters);
  if (runtimeEmitterContracts.length > 0) {
    return runtimeEmitterContracts;
  }
  const contract = payload.contracts.renderContract;
  if (!isRecord(contract)) {
    return [];
  }
  const parsed = readAuroraVfxRuntimeRenderContractRecord(contract);
  return parsed ? [parsed] : [];
}

function readRuntimeEmitterRenderContracts(value: unknown): AuroraVfxRuntimeRenderContractRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const contract = readAuroraVfxRuntimeRenderContractRecord(entry.renderContract);
    if (!contract) {
      return [];
    }
    const emitterNodeName = readString(entry.emitterNodeName) || contract.emitterNodeName;
    return [
      {
        ...contract,
        ...(emitterNodeName ? { emitterNodeName } : {})
      }
    ];
  });
}

function readAuroraVfxRuntimeRenderContractRecord(
  contract: unknown
): AuroraVfxRuntimeRenderContractRecord | null {
  if (!isRecord(contract)) {
    return null;
  }
  if (contract.version !== "aurora-vfx-runtime-render-contract/v1") {
    return null;
  }
  const drawLane = readDrawLane(contract.drawLane);
  const verticesPerDrawParticle = readVerticesPerParticle(contract.verticesPerDrawParticle);
  const drawRecords = Array.isArray(contract.drawRecords)
    ? contract.drawRecords.flatMap((entry) => readDrawRecord(entry))
    : [];
  const chunkLane = readChunkParticleLane(contract.chunkLane);
  const progFxType4Light = readProgFxType4LightRecord(contract.progFxType4Light);
  const progFxType4Requests = readProgFxType4LightRecords(contract.progFxType4Requests);
  const pltRenderContext = readPltRenderContext(contract.pltRenderContext);
  return {
    version: "aurora-vfx-runtime-render-contract/v1",
    ...(readString(contract.emitterNodeName) ? { emitterNodeName: readString(contract.emitterNodeName) } : {}),
    activeParticleCount: readFiniteNumber(contract.activeParticleCount, 0),
    drawParticleCount: readFiniteNumber(contract.drawParticleCount, drawRecords.length),
    verticesPerDrawParticle,
    drawVertexCount: readFiniteNumber(
      contract.drawVertexCount,
      drawRecords.length * verticesPerDrawParticle
    ),
    drawLane,
    renderMode: readModeRecord(contract.renderMode),
    blendMode: readModeRecord(contract.blendMode),
    ...(isRecord(contract.materialState) ? { materialState: contract.materialState } : {}),
    ...(isRecord(contract.renderState) ? { renderState: contract.renderState } : {}),
    renderOrder: readRenderOrder(contract.renderOrder),
    ...(chunkLane ? { chunkLane } : {}),
    drawRecords,
    diagnostics: normalizeDiagnostics(contract.diagnostics),
    ...(progFxType4Light ? { progFxType4Light } : {}),
    ...(progFxType4Requests.length > 0 ? { progFxType4Requests } : {}),
    ...(pltRenderContext ? { pltRenderContext } : {})
  };
}

function readPltRenderContext(value: unknown): AuroraVfxPltRenderContextRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const status = value.status;
  const requestedTextureRef = readString(value.requestedTextureRef);
  const shaderLane = value.shaderLane;
  if (
    (status !== "ready" && status !== "missing_target_context") ||
    !requestedTextureRef ||
    !isRecord(shaderLane) ||
    shaderLane.vertexShader !== "vs_pltgen" ||
    shaderLane.fragmentShader !== "fs_pltgen" ||
    shaderLane.schemeUniformPattern !== "PLTscheme[%d]" ||
    shaderLane.schemeUniformCount !== 15 ||
    value.proofStatus !== "source-backed-contract-retail-visual-unverified"
  ) {
    return null;
  }
  const paletteRowsByLayer = readPltPaletteRows(value.paletteRowsByLayer);
  const selectedResourceKey = readString(value.selectedResourceKey);
  const targetRef = readString(value.targetRef);
  const profile = readString(value.profile);
  const provenance = readString(value.provenance);
  return {
    status,
    requestedTextureRef,
    ...(selectedResourceKey ? { selectedResourceKey } : {}),
    ...(targetRef ? { targetRef } : {}),
    ...(Object.keys(paletteRowsByLayer).length > 0 ? { paletteRowsByLayer } : {}),
    ...(profile ? { profile } : {}),
    ...(provenance ? { provenance } : {}),
    shaderLane: {
      vertexShader: "vs_pltgen",
      fragmentShader: "fs_pltgen",
      schemeUniformPattern: "PLTscheme[%d]",
      schemeUniformCount: 15
    },
    proofStatus: "source-backed-contract-retail-visual-unverified"
  };
}

function readPltPaletteRows(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, number] =>
          /^\d+$/u.test(entry[0]) &&
          typeof entry[1] === "number" &&
          Number.isFinite(entry[1]) &&
          entry[1] >= 0
      )
      .map(([layer, row]) => [String(Number.parseInt(layer, 10)), Math.trunc(row)])
      .sort(([left], [right]) => Number(left) - Number(right))
  );
}

function buildPltPaletteRowSignature(rows: Record<string, number>): string {
  return Object.entries(rows)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([layer, row]) => `${layer}:${row}`)
    .join(",");
}

function buildAggregateRuntimeRenderContract(
  contracts: AuroraVfxRuntimeRenderContractRecord[]
): AuroraVfxRuntimeRenderContractRecord | null {
  if (contracts.length === 0) {
    return null;
  }
  if (contracts.length === 1) {
    return contracts[0]!;
  }
  const base = contracts.find((entry) => entry.drawLane !== "chunk_model") ?? contracts[0]!;
  const drawRecords = contracts.flatMap((entry) => entry.drawRecords);
  const diagnostics = mergeDiagnostics(contracts.flatMap((entry) => entry.diagnostics));
  const progFxType4Requests = contracts.flatMap((entry) => [
    ...(entry.progFxType4Light ? [entry.progFxType4Light] : []),
    ...(entry.progFxType4Requests ?? [])
  ]);
  const chunkLanes = contracts.flatMap((entry) => [
    ...(entry.chunkLane ? [entry.chunkLane] : []),
    ...(entry.chunkLanes ?? [])
  ]);
  const drawParticleCount = contracts.reduce((sum, entry) => sum + entry.drawParticleCount, 0);
  const drawVertexCount = contracts.reduce((sum, entry) => sum + entry.drawVertexCount, 0);
  return {
    ...base,
    emitterNodeName: contracts
      .map((entry) => entry.emitterNodeName)
      .filter((entry): entry is string => Boolean(entry))
      .join("|"),
    activeParticleCount: contracts.reduce((sum, entry) => sum + entry.activeParticleCount, 0),
    drawParticleCount,
    drawVertexCount,
    drawLane: contracts.every((entry) => entry.drawLane === "chunk_model")
      ? "chunk_model"
      : base.drawLane === "chunk_model"
        ? "textured_quad"
        : base.drawLane,
    drawRecords,
    diagnostics,
    ...(progFxType4Requests.length === 1
      ? { progFxType4Light: progFxType4Requests[0] }
      : {}),
    ...(progFxType4Requests.length > 1 ? { progFxType4Requests } : {}),
    ...(chunkLanes.length > 0 ? { chunkLane: chunkLanes[0], chunkLanes } : {})
  };
}

function resolveAuroraVfxDrawQueueLaneKey(
  contract: AuroraVfxRuntimeRenderContractRecord
): string {
  return `${contract.drawLane}:${contract.renderState?.transparentLane ?? "render-state-lane-missing"}`;
}

type AuroraVfxCanonicalChunkParticleInstance =
  AuroraVfxChunkParticleLaneRecord["particleInstances"][number];

function buildCanonicalChunkParticleMotionHistory(
  runtimeFrames: Array<{ timeSeconds: number; payload: AuroraVfxPayload }>,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): ReadonlyMap<string, readonly AuroraVfxCanonicalChunkMotionSample[]> {
  const history = new Map<string, AuroraVfxCanonicalChunkMotionSample[]>();
  for (const frame of runtimeFrames) {
    for (const contract of readAuroraVfxRuntimeRenderContracts(frame.payload)) {
      const chunkLanes =
        contract.chunkLanes ?? (contract.chunkLane ? [contract.chunkLane] : []);
      for (const chunkLane of chunkLanes) {
        for (const particle of chunkLane.particleInstances) {
          const key = resolveCanonicalChunkParticleMotionKey(
            contract.emitterNodeName,
            particle
          );
          const samples = history.get(key) ?? [];
          const sample: AuroraVfxCanonicalChunkMotionSample = {
            ageSeconds: Math.max(0, particle.ageSeconds ?? 0),
            position: convertCanonicalSourceVector(
              particle.position,
              sourceCoordinateSpace
            ),
            dynamicQuaternion: buildCanonicalChunkParticleDynamicQuaternion(
              particle,
              sourceCoordinateSpace
            )
          };
          const previous = samples.at(-1);
          if (
            previous &&
            Math.abs(previous.ageSeconds - sample.ageSeconds) <= 1e-9
          ) {
            samples[samples.length - 1] = sample;
          } else {
            samples.push(sample);
          }
          history.set(key, samples);
        }
      }
    }
  }
  return history;
}

function resolveCanonicalChunkParticleMotionKey(
  emitterNodeName: string | undefined,
  particle: AuroraVfxCanonicalChunkParticleInstance
): string {
  const modelInstanceRef = particle.modelInstanceRef?.trim();
  return modelInstanceRef || `${emitterNodeName ?? "chunk"}:particle:${particle.particleId}`;
}

function resolveCanonicalChunkInstanceRuntimePayload(
  fallback: AuroraVfxCanonicalChunkModelRuntimePayload,
  particle: AuroraVfxCanonicalChunkParticleInstance
): AuroraVfxPayload {
  const instanceFrame = particle.modelRuntimeFrame;
  if (
    instanceFrame?.version !== "aurora-vfx-child-model-runtime-frame/v1" ||
    instanceFrame.modelInstanceRef !== particle.modelInstanceRef ||
    !Array.isArray(instanceFrame.runtimeEmitters)
  ) {
    return fallback.payload;
  }
  const fallbackRuntimeEmitters = Array.isArray(
    fallback.payload.contracts.runtimeEmitters
  )
    ? fallback.payload.contracts.runtimeEmitters.flatMap((entry) =>
        isRecord(entry) ? [entry] : []
      )
    : [];
  const runtimeEmitters = instanceFrame.runtimeEmitters.flatMap((emitterFrame) => {
    const emitterNodeName = readString(emitterFrame.emitterNodeName);
    const emitterIndex = readFiniteNumber(emitterFrame.emitterIndex, -1);
    const renderContractFrame = isRecord(emitterFrame.renderContractFrame)
      ? emitterFrame.renderContractFrame
      : null;
    const fallbackEmitter = fallbackRuntimeEmitters.find(
      (candidate) =>
        readString(candidate.emitterNodeName) === emitterNodeName &&
        readFiniteNumber(candidate.emitterIndex, -2) === emitterIndex
    );
    const fallbackRenderContract = isRecord(fallbackEmitter?.renderContract)
      ? fallbackEmitter.renderContract
      : null;
    if (
      !emitterNodeName ||
      emitterIndex < 0 ||
      renderContractFrame?.version !==
        "aurora-vfx-child-render-contract-frame/v1" ||
      !fallbackEmitter ||
      !fallbackRenderContract ||
      !Array.isArray(renderContractFrame.compactDrawRecords)
    ) {
      return [];
    }
    const compactDrawRecords = renderContractFrame.compactDrawRecords.flatMap(
      (entry) => (isRecord(entry) ? [entry] : [])
    );
    if (compactDrawRecords.length !== renderContractFrame.compactDrawRecords.length) {
      return [];
    }
    const drawRoute = isRecord(fallbackRenderContract.texturedQuadTopology)
      ? fallbackRenderContract.texturedQuadTopology.drawRoute
      : undefined;
    const drawRecords = compactDrawRecords.map((record) => ({
      ...record,
      recordKind: "aurora-particle-draw-record",
      emitterNodeName,
      verticesPerParticle: 6,
      vertexCount: 6,
      ...(drawRoute !== undefined ? { drawRoute } : {}),
      renderMode: fallbackRenderContract.renderMode,
      blendMode: fallbackRenderContract.blendMode,
      renderState: fallbackRenderContract.renderState,
      renderOrder: fallbackRenderContract.renderOrder
    }));
    return [
      {
        ...fallbackEmitter,
        ...emitterFrame,
        renderContract: {
          ...fallbackRenderContract,
          activeParticleCount: renderContractFrame.activeParticleCount,
          drawParticleCount: renderContractFrame.drawParticleCount,
          verticesPerDrawParticle:
            renderContractFrame.verticesPerDrawParticle,
          drawVertexCount: renderContractFrame.drawVertexCount,
          drawLane: renderContractFrame.drawLane,
          drawRecords,
          ...(renderContractFrame.chunkLane !== undefined
            ? { chunkLane: renderContractFrame.chunkLane }
            : {}),
          ...(renderContractFrame.progFxType4Light !== undefined
            ? { progFxType4Light: renderContractFrame.progFxType4Light }
            : {})
        }
      }
    ];
  });
  if (runtimeEmitters.length !== instanceFrame.runtimeEmitters.length) {
    return fallback.payload;
  }
  const firstEmitter = runtimeEmitters[0];
  return {
    ...fallback.payload,
    contracts: {
      ...fallback.payload.contracts,
      runtimeEmitters,
      ...(firstEmitter?.renderContract !== undefined
        ? { renderContract: firstEmitter.renderContract }
        : {})
    },
    provenance: {
      ...fallback.payload.provenance,
      ...(instanceFrame.sourceModelObjectKey
        ? { sourceProfile: instanceFrame.sourceModelObjectKey }
        : {})
    }
  };
}

function buildCanonicalChunkParticleDynamicQuaternion(
  particle: AuroraVfxCanonicalChunkParticleInstance,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): THREE.Quaternion {
  const quaternion = new THREE.Quaternion();
  if (particle.particleOrientation) {
    quaternion.premultiply(
      canonicalSourceOrientationToThreeQuaternion(
        particle.particleOrientation,
        sourceCoordinateSpace
      )
    );
  }
  const rotationAxis = convertCanonicalSourceVector(
    particle.rotationAxis ?? { x: 0, y: 0, z: 1 },
    sourceCoordinateSpace
  );
  if (
    !particle.landed &&
    Number.isFinite(particle.rotationRadians) &&
    rotationAxis.lengthSq() > 1e-10
  ) {
    quaternion.premultiply(
      new THREE.Quaternion().setFromAxisAngle(
        convertCanonicalSourceRotationAxis(
          rotationAxis,
          sourceCoordinateSpace
        ),
        particle.rotationRadians ?? 0
      )
    );
  }
  return quaternion.normalize();
}

function sampleCanonicalChunkParticleMotion(
  samples: readonly AuroraVfxCanonicalChunkMotionSample[],
  ageSeconds: number
): AuroraVfxCanonicalChunkMotionSample | undefined {
  if (samples.length === 0) return undefined;
  if (ageSeconds <= samples[0]!.ageSeconds + 1e-9) {
    return {
      ageSeconds,
      position: samples[0]!.position.clone(),
      dynamicQuaternion: samples[0]!.dynamicQuaternion.clone()
    };
  }
  const last = samples.at(-1)!;
  if (ageSeconds >= last.ageSeconds - 1e-9) {
    return {
      ageSeconds,
      position: last.position.clone(),
      dynamicQuaternion: last.dynamicQuaternion.clone()
    };
  }
  for (let index = 1; index < samples.length; index += 1) {
    const next = samples[index]!;
    if (next.ageSeconds < ageSeconds) continue;
    const previous = samples[index - 1]!;
    const span = Math.max(1e-9, next.ageSeconds - previous.ageSeconds);
    const alpha = THREE.MathUtils.clamp(
      (ageSeconds - previous.ageSeconds) / span,
      0,
      1
    );
    return {
      ageSeconds,
      position: previous.position.clone().lerp(next.position, alpha),
      dynamicQuaternion: previous.dynamicQuaternion
        .clone()
        .slerp(next.dynamicQuaternion, alpha)
        .normalize()
    };
  }
  return undefined;
}

function readCanonicalWorldSpaceEmitterNames(
  payload: AuroraVfxPayload
): ReadonlySet<string> {
  const emitterNames = new Set<string>();
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) return emitterNames;
  for (const entry of runtimeEmitters) {
    if (!isRecord(entry)) continue;
    const firstRuntimeFrame = Array.isArray(entry.runtimeFrames)
      ? (entry.runtimeFrames.find(isRecord) as Record<string, unknown> | undefined)
      : undefined;
    const runtimeState = isRecord(entry.runtimeState)
      ? entry.runtimeState
      : isRecord(firstRuntimeFrame?.runtimeState)
        ? firstRuntimeFrame.runtimeState
        : undefined;
    const source = isRecord(runtimeState?.source) ? runtimeState.source : undefined;
    const simulation = isRecord(source?.simulation) ? source.simulation : undefined;
    if (
      !simulation ||
      simulation.inherit === true ||
      simulation.inheritLocal === true ||
      simulation.inheritPart === true
    ) {
      continue;
    }
    const emitterNodeName =
      readString(entry.emitterNodeName) ||
      readString(runtimeState?.emitterNodeName) ||
      readString(source?.nodeName);
    if (emitterNodeName) emitterNames.add(emitterNodeName);
  }
  return emitterNames;
}

function createCanonicalChunkWorldSpaceDrawRecordTransform(input: {
  nestedPayload: AuroraVfxPayload;
  motionSamples: readonly AuroraVfxCanonicalChunkMotionSample[];
  parentAgeSeconds: number;
  currentPosition: THREE.Vector3;
  currentQuaternion: THREE.Quaternion;
  templateBaseQuaternion: THREE.Quaternion;
  templateScale: THREE.Vector3;
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up";
}): {
  emitterNames: readonly string[];
  transform?: (
    record: AuroraParticleDrawRecordLike
  ) => AuroraParticleDrawRecordLike;
} {
  const emitterNames = [...readCanonicalWorldSpaceEmitterNames(input.nestedPayload)];
  if (emitterNames.length === 0 || input.motionSamples.length === 0) {
    return { emitterNames };
  }
  const emitterNameSet = new Set(emitterNames);
  const inverseCurrentQuaternion = input.currentQuaternion.clone().invert();
  const transformVector = (
    value: AuroraVector3Like,
    birthQuaternion: THREE.Quaternion
  ): AuroraVector3Like => {
    const transformed = convertCanonicalSourceVector(
      value,
      input.sourceCoordinateSpace
    )
      .multiply(input.templateScale)
      .applyQuaternion(birthQuaternion)
      .applyQuaternion(inverseCurrentQuaternion);
    transformed.set(
      Math.abs(input.templateScale.x) > 1e-12
        ? transformed.x / input.templateScale.x
        : 0,
      Math.abs(input.templateScale.y) > 1e-12
        ? transformed.y / input.templateScale.y
        : 0,
      Math.abs(input.templateScale.z) > 1e-12
        ? transformed.z / input.templateScale.z
        : 0
    );
    return convertCanonicalThreeVectorToSource(
      transformed,
      input.sourceCoordinateSpace
    );
  };
  const transformPoint = (
    value: AuroraVector3Like,
    birthPosition: THREE.Vector3,
    birthQuaternion: THREE.Quaternion
  ): AuroraVector3Like => {
    const transformed = convertCanonicalSourceVector(
      value,
      input.sourceCoordinateSpace
    )
      .multiply(input.templateScale)
      .applyQuaternion(birthQuaternion)
      .add(birthPosition)
      .sub(input.currentPosition)
      .applyQuaternion(inverseCurrentQuaternion);
    transformed.set(
      Math.abs(input.templateScale.x) > 1e-12
        ? transformed.x / input.templateScale.x
        : 0,
      Math.abs(input.templateScale.y) > 1e-12
        ? transformed.y / input.templateScale.y
        : 0,
      Math.abs(input.templateScale.z) > 1e-12
        ? transformed.z / input.templateScale.z
        : 0
    );
    return convertCanonicalThreeVectorToSource(
      transformed,
      input.sourceCoordinateSpace
    );
  };
  return {
    emitterNames,
    transform: (record) => {
      if (!emitterNameSet.has(record.emitterNodeName ?? "")) return record;
      const birthAgeSeconds = Math.max(
        0,
        input.parentAgeSeconds - Math.max(0, record.ageSeconds)
      );
      const birthSample = sampleCanonicalChunkParticleMotion(
        input.motionSamples,
        birthAgeSeconds
      );
      if (!birthSample) return record;
      const birthQuaternion = birthSample.dynamicQuaternion
        .clone()
        .multiply(input.templateBaseQuaternion)
        .normalize();
      const transformedContactNormal = record.contactNormal
        ? transformVector(record.contactNormal, birthQuaternion)
        : undefined;
      if (transformedContactNormal) {
        const normal = new THREE.Vector3(
          transformedContactNormal.x,
          transformedContactNormal.y,
          transformedContactNormal.z
        ).normalize();
        transformedContactNormal.x = normal.x;
        transformedContactNormal.y = normal.y;
        transformedContactNormal.z = normal.z;
      }
      return {
        ...record,
        position: transformPoint(
          record.position,
          birthSample.position,
          birthQuaternion
        ),
        ...(record.previousPosition
          ? {
              previousPosition: transformPoint(
                record.previousPosition,
                birthSample.position,
                birthQuaternion
              )
            }
          : {}),
        ...(record.linkedNextPosition
          ? {
              linkedNextPosition: transformPoint(
                record.linkedNextPosition,
                birthSample.position,
                birthQuaternion
              )
            }
          : {}),
        velocity: transformVector(record.velocity, birthQuaternion),
        ...(record.direction
          ? { direction: transformVector(record.direction, birthQuaternion) }
          : {}),
        ...(record.inheritedVelocityDirection
          ? {
              inheritedVelocityDirection: transformVector(
                record.inheritedVelocityDirection,
                birthQuaternion
              )
            }
          : {}),
        ...(transformedContactNormal
          ? { contactNormal: transformedContactNormal }
          : {})
      };
    }
  };
}

function createCanonicalChunkLaneModelGroups(
  contract: AuroraVfxRuntimeRenderContractRecord,
  options: AuroraVfxCanonicalRenderOptions,
  referencedObjectContextKey: string
): THREE.Group[] {
  const chunkLanes = contract.chunkLanes ?? (contract.chunkLane ? [contract.chunkLane] : []);
  return chunkLanes.flatMap((chunkLane) => {
    const resourceKey = chunkLane.resolvedResource?.resourceKey ?? "";
    const template = resourceKey ? options.chunkModelsByResourceKey?.get(resourceKey) : undefined;
    if (!template) {
      return [];
    }
    const nestedRuntime = resourceKey
      ? options.chunkModelRuntimePayloadsByResourceKey?.get(resourceKey)
      : undefined;
    const chunkModelAnimation = chunkLane.modelAnimation;
    const nestedRuntimeDependencyCycle = Boolean(
      nestedRuntime && options.chunkModelRuntimeResolutionStack?.has(resourceKey)
    );
    const deliveryUrl = resourceKey
      ? options.chunkModelDeliveryUrlsByResourceKey?.get(resourceKey) ?? ""
      : "";
    const instanceCount = Math.max(0, Math.trunc(chunkLane.activeParticleCount));
    if (instanceCount === 0) {
      return [];
    }
    const group = new THREE.Group();
    group.userData = {
      auroraVfxRenderer: "canonical",
      auroraVfxCanonicalChunkLaneModelGroup: true,
      auroraVfxCanonicalChunkLaneModelPreviewStatus:
        "applied-local-model-preview-retail-unverified",
      auroraVfxCanonicalChunkLaneChunkName: chunkLane.chunkName ?? "",
      auroraVfxCanonicalChunkLaneResolvedResourceKey: resourceKey,
      auroraVfxCanonicalChunkLaneDeliveryUrl: deliveryUrl,
      auroraVfxCanonicalChunkLaneInstanceCount: instanceCount,
      auroraVfxCanonicalChunkModelAnimationName: chunkModelAnimation?.animationName ?? "",
      auroraVfxCanonicalChunkModelAnimationPlaybackRate:
        chunkModelAnimation?.playbackRate ?? 0,
      auroraVfxCanonicalChunkModelAnimationStartPolicy:
        chunkModelAnimation?.startPolicy ?? "contract-missing",
      auroraVfxRetailParityProof: false
    };
    for (let index = 0; index < instanceCount; index += 1) {
      const instance = template.clone(true);
      isolateCanonicalChunkInstanceMaterials(instance);
      const templateBaseQuaternion = instance.quaternion.clone();
      const templateBaseScale = instance.scale.clone();
      const materialBinding = bindCanonicalChunkModelSourceMaterials(instance, options);
      attachAuroraVfxDrawQueueRecord(instance, {
        laneKey: resolveAuroraVfxDrawQueueLaneKey(contract),
        referencedObjectContextKey,
        renderOrderShort: contract.renderOrder.value
      });
      const particle = chunkLane.particleInstances[index];
      const instanceRuntimePayload =
        nestedRuntime && particle
          ? resolveCanonicalChunkInstanceRuntimePayload(nestedRuntime, particle)
          : nestedRuntime?.payload;
      const nestedRuntimeAnimationNames = instanceRuntimePayload
        ? readCanonicalRuntimeAnimationNames(instanceRuntimePayload)
        : [];
      const nestedRuntimeAnimationMatches = Boolean(
        chunkModelAnimation &&
          nestedRuntimeAnimationNames.length > 0 &&
          nestedRuntimeAnimationNames.every(
            (animationName) =>
              animationName.toLowerCase() === chunkModelAnimation.animationName
          )
      );
      const particleScaleX = particle?.scale?.x;
      const chunkUniformScale =
        typeof particleScaleX === "number" && Number.isFinite(particleScaleX)
          ? Math.max(0, particleScaleX)
          : 1;
      if (particle) {
        instance.position.copy(
          convertCanonicalSourceVector(
            particle.position,
            options.sourceCoordinateSpace ?? "three-y-up"
          )
        );
        instance.quaternion.copy(
          buildCanonicalChunkParticleDynamicQuaternion(
            particle,
            options.sourceCoordinateSpace ?? "three-y-up"
          )
            .multiply(templateBaseQuaternion)
            .normalize()
        );
        instance.scale.multiplyScalar(chunkUniformScale);
      }
      if (
        nestedRuntime &&
        instanceRuntimePayload &&
        chunkModelAnimation &&
        nestedRuntimeAnimationMatches &&
        !nestedRuntimeDependencyCycle &&
        particle
      ) {
        const animationTimeSeconds =
          Math.max(0, particle.ageSeconds ?? 0) * chunkModelAnimation.playbackRate;
        const motionKey = resolveCanonicalChunkParticleMotionKey(
          contract.emitterNodeName,
          particle
        );
        const motionSamples =
          options.chunkParticleMotionHistory?.get(motionKey) ?? [];
        const worldSpaceDrawRecordTransform =
          createCanonicalChunkWorldSpaceDrawRecordTransform({
            nestedPayload: instanceRuntimePayload,
            motionSamples,
            parentAgeSeconds: Math.max(0, particle.ageSeconds ?? 0),
            currentPosition: instance.position.clone(),
            currentQuaternion: instance.quaternion.clone(),
            templateBaseQuaternion,
            templateScale: templateBaseScale,
            sourceCoordinateSpace: options.sourceCoordinateSpace ?? "three-y-up"
          });
        const nestedRuntimeGroup = createAuroraVfxCanonicalRenderGroup(instanceRuntimePayload, {
          particleTexturesByReference: options.particleTexturesByReference,
          chunkModelsByResourceKey: options.chunkModelsByResourceKey,
          chunkModelDeliveryUrlsByResourceKey: options.chunkModelDeliveryUrlsByResourceKey,
          chunkModelTexturesByReference: options.chunkModelTexturesByReference,
          chunkModelAuroraMaterial: options.chunkModelAuroraMaterial,
          chunkModelTextureBindings: options.chunkModelTextureBindings,
          chunkModelRuntimePayloadsByResourceKey: options.chunkModelRuntimePayloadsByResourceKey,
          chunkModelRuntimeResolutionStack: new Set([
            ...(options.chunkModelRuntimeResolutionStack ?? []),
            resourceKey
          ]),
          modelGraph: nestedRuntime.modelGraph,
          objectRadius: options.objectRadius,
          referencedObjectContextKey,
          sourceCoordinateSpace: options.sourceCoordinateSpace,
          drawRecordTransform: worldSpaceDrawRecordTransform.transform,
          runtimeFrameMaterialization: "lazy",
          additiveParticleRadianceCalibration:
            options.additiveParticleRadianceCalibration
        });
        seekAuroraVfxCanonicalRuntimePlayback(
          nestedRuntimeGroup,
          animationTimeSeconds
        );
        nestedRuntimeGroup.position.copy(instance.position);
        nestedRuntimeGroup.quaternion.copy(instance.quaternion);
        nestedRuntimeGroup.scale.copy(templateBaseScale);
        nestedRuntimeGroup.name = `aurora_vfx_chunk_model_runtime:${resourceKey}:${particle.particleId}`;
        nestedRuntimeGroup.userData = {
          ...nestedRuntimeGroup.userData,
          auroraVfxCanonicalChunkModelNestedRuntime: true,
          auroraVfxCanonicalChunkModelNestedRuntimeStatus:
            "source-model-impact-runtime-attached",
          auroraVfxCanonicalChunkModelNestedRuntimeSource:
            "C:/Projects/New Folder/export/decompiled_all.c:853365-853375 FUN_00a28a38 plus nwtoolset.exe 0x00a28a38-0x00a28a9a start model animation 'impact' once at Chunk particle activation with rate 1.0; FUN_00a2d9c4 retains the live model and FUN_00a31070 updates its transform.",
          auroraVfxCanonicalChunkModelNestedRuntimeResourceKey: resourceKey,
          auroraVfxCanonicalChunkModelNestedRuntimeSourceModelObjectKey:
            nestedRuntime.sourceModelObjectKey ?? "",
          auroraVfxCanonicalChunkModelNestedRuntimeAnimationName:
            chunkModelAnimation.animationName,
          auroraVfxCanonicalChunkModelNestedRuntimeAnimationPlaybackRate:
            chunkModelAnimation.playbackRate,
          auroraVfxCanonicalChunkModelNestedRuntimeAnimationStartPolicy:
            chunkModelAnimation.startPolicy,
          auroraVfxCanonicalChunkModelNestedRuntimeTimeSeconds: animationTimeSeconds,
          auroraVfxCanonicalChunkModelNestedRuntimeFrameSource:
            particle.modelRuntimeFrame?.version ===
            "aurora-vfx-child-model-runtime-frame/v1"
              ? "instance-bound-shared-scheduler-frame"
              : "resource-payload-age-seek-fallback",
          auroraVfxCanonicalChunkModelVisualScaleIsolation:
            "nested-emitter-runtime-excludes-live-chunk-model-visual-scale",
          auroraVfxCanonicalChunkModelVisualScaleIsolationSource:
            "backend/docs/aurora-reverse/vfx-row28-source-location-and-nested-chunk-scale-audit-2026-08-25.md: native impact disks preserve nested PartEmitter source size while the sampled Chunk particle size controls only live model geometry",
          auroraVfxCanonicalChunkModelWorldSpaceEmitterNames:
            worldSpaceDrawRecordTransform.emitterNames,
          auroraVfxCanonicalChunkModelWorldSpaceParticleHistoryRebased:
            worldSpaceDrawRecordTransform.transform !== undefined,
          auroraVfxCanonicalChunkModelWorldSpaceParticleHistorySource:
            "Aurora emitter motion flags: FUN_00a2d9c4 updates existing particles through the moving source only for inherit, inheritLocal, or inheritPart; source emitters without those flags retain birth-world transforms.",
          auroraVfxRetailParityProof: false
        };
        group.add(nestedRuntimeGroup);
      }
      instance.userData = {
        ...instance.userData,
        auroraVfxRenderer: "canonical",
        auroraVfxCanonicalChunkLaneModelInstance: true,
        auroraVfxCanonicalChunkLaneModelPreviewStatus:
          "applied-local-model-preview-retail-unverified",
        auroraVfxCanonicalChunkLaneChunkName: chunkLane.chunkName ?? "",
        auroraVfxCanonicalChunkLaneResolvedResourceKey: resourceKey,
        auroraVfxCanonicalChunkLaneDeliveryUrl: deliveryUrl,
        auroraVfxCanonicalChunkParticleIndex: index,
        auroraVfxCanonicalChunkParticleId: particle?.particleId ?? -1,
        auroraVfxCanonicalChunkModelInstanceRef: particle?.modelInstanceRef ?? "",
        auroraVfxCanonicalChunkModelRuntimeStatus: particle?.modelRuntimeStatus ?? "unknown",
        auroraVfxCanonicalChunkModelAnimationName: chunkModelAnimation?.animationName ?? "",
        auroraVfxCanonicalChunkModelAnimationPlaybackRate:
          chunkModelAnimation?.playbackRate ?? 0,
        auroraVfxCanonicalChunkModelAnimationStartPolicy:
          chunkModelAnimation?.startPolicy ?? "contract-missing",
        auroraVfxCanonicalChunkModelAnimationRawArgumentAfterRate:
          chunkModelAnimation?.rawArguments.argumentAfterRate ?? null,
        auroraVfxCanonicalChunkModelAnimationRawFinalArgument:
          chunkModelAnimation?.rawArguments.finalArgument ?? null,
        auroraVfxCanonicalChunkModelAnimationSource:
          chunkModelAnimation?.source ?? "contract-missing",
        auroraVfxCanonicalChunkModelAnimationBinarySha256:
          chunkModelAnimation?.binarySha256 ?? "",
        auroraVfxCanonicalChunkParticleAgeSeconds: particle?.ageSeconds ?? 0,
        auroraVfxCanonicalChunkParticleLifetimeSeconds: particle?.lifetimeSeconds ?? 0,
        auroraVfxCanonicalChunkParticleRotationRadians: particle?.rotationRadians ?? 0,
        auroraVfxCanonicalChunkParticleRotationAxisX: particle?.rotationAxis?.x ?? 0,
        auroraVfxCanonicalChunkParticleRotationAxisY: particle?.rotationAxis?.y ?? 0,
        auroraVfxCanonicalChunkParticleRotationAxisZ: particle?.rotationAxis?.z ?? 1,
        auroraVfxCanonicalChunkParticleLanded: particle?.landed ?? false,
        auroraVfxCanonicalChunkParticleContactNormalX: particle?.contactNormal?.x ?? 0,
        auroraVfxCanonicalChunkParticleContactNormalY: particle?.contactNormal?.y ?? 0,
        auroraVfxCanonicalChunkParticleContactNormalZ: particle?.contactNormal?.z ?? 0,
        auroraVfxCanonicalChunkParticleContactOrientationApplied:
          particle?.particleOrientation !== undefined,
        auroraVfxCanonicalChunkParticleRotationSuppressedAfterLanding:
          particle?.landed === true,
        auroraVfxCanonicalChunkParticleRotationAxisSource:
          "C:/Projects/New Folder/export/decompiled_all.c:852762-852822 FUN_00a2625c derives particle direction after emitter orientation and spread; FUN_00a31070 uses that particle vector for chunk orientation",
        auroraVfxCanonicalChunkParticleContactOrientationSource:
          "C:/Projects/New Folder/export/decompiled_all.c:855097-855123 FUN_00a2c36c writes quaternion from global up to contact normal; FUN_00a31070:856868-856882 suppresses particleRot after landed",
        auroraVfxCanonicalChunkParticleScaleX: particle?.scale?.x ?? 1,
        auroraVfxCanonicalChunkParticleScaleY: particle?.scale?.y ?? 1,
        auroraVfxCanonicalChunkUniformScaleApplied: particle !== undefined,
        auroraVfxCanonicalChunkUniformScale: chunkUniformScale,
        auroraVfxCanonicalChunkUniformScaleProfile:
          "source-decomp-model-init-particle-size-uniform-scale",
        auroraVfxCanonicalChunkUniformScaleSource:
          "nwtoolset.exe:0x00a28a68-0x00a28a7a FUN_00a28a38 passes the sampled particle size to the live Chunk model before starting impact; C:/Projects/New Folder/export/decompiled_all.c:856838-856881 FUN_00a31070 draws the already-scaled model without another size multiply",
        auroraVfxCanonicalChunkModelMaterialBindingStatus:
          materialBinding.unresolvedReferences.length > 0
            ? materialBinding.resolvedReferences.length > 0
              ? "source-reference-partially-bound"
              : "source-reference-unresolved"
            : materialBinding.resolvedReferences.length > 0
              ? "source-reference-bound"
              : "source-reference-absent",
        auroraVfxCanonicalChunkModelMaterialResolvedReferences: materialBinding.resolvedReferences,
        auroraVfxCanonicalChunkModelMaterialUnresolvedReferences: materialBinding.unresolvedReferences,
        auroraVfxCanonicalChunkModelNestedRuntimeStatus: nestedRuntime
          ? nestedRuntimeDependencyCycle
            ? "source-model-runtime-cycle-detected"
            : !chunkModelAnimation
              ? "chunk-impact-animation-contract-missing"
              : nestedRuntimeAnimationMatches
                ? "source-model-impact-runtime-attached"
                : "chunk-impact-animation-payload-mismatch"
          : "source-model-runtime-unresolved",
        auroraVfxCanonicalChunkModelNestedRuntimeSource: nestedRuntime
          ? "FUN_00a28a38 starts Chunk model animation 'impact' once at activation with rate 1.0; the matching source-model runtime is evaluated from particle age, retained by FUN_00a2d9c4, and transformed by FUN_00a31070."
          : "No parsed source-MDL runtime payload was delivered for this resolved chunk model resource.",
        auroraVfxThreeMaterialSourceTruth: false,
        auroraVfxRetailParityProof: false
      };
      group.add(instance);
    }
    return [group];
  });
}

const canonicalChunkModelTextures = new WeakMap<THREE.Texture, THREE.Texture>();

function isolateCanonicalChunkInstanceMaterials(instance: THREE.Object3D): void {
  const clonedMaterials = new Map<THREE.Material, THREE.Material>();
  const cloneMaterial = (source: THREE.Material): THREE.Material => {
    const existing = clonedMaterials.get(source);
    if (existing) return existing;

    const clone = source.clone();
    clone.onBeforeCompile = source.onBeforeCompile;
    clone.customProgramCacheKey = source.customProgramCacheKey;
    clonedMaterials.set(source, clone);
    return clone;
  };

  instance.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.material = Array.isArray(node.material)
      ? node.material.map(cloneMaterial)
      : cloneMaterial(node.material);
  });
}

function bindCanonicalChunkModelSourceMaterials(
  instance: THREE.Object3D,
  options: AuroraVfxCanonicalRenderOptions
): { resolvedReferences: string[]; unresolvedReferences: string[] } {
  const textures = options.chunkModelTexturesByReference ?? options.particleTexturesByReference;
  const canonicalTextures = new Map<string, THREE.Texture>();
  textures?.forEach((texture, reference) => {
    canonicalTextures.set(reference, resolveCanonicalChunkModelTexture(texture));
  });
  const materialReport = applyPlaceableTexturesToModel(
    instance,
    canonicalTextures,
    undefined,
    {
      allowSingleTextureFallback: false,
      auroraMaterial: options.chunkModelAuroraMaterial,
      textureBindings: options.chunkModelTextureBindings
    }
  );
  instance.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      installCanonicalChunkMaterialLightingCompatibility(material);
      const textureReference = readCanonicalChunkModelMaterialTextureReference(material);
      if (!textureReference) return;
      const textureMaterial = material as THREE.Material & { map?: THREE.Texture | null };
      const bound = "map" in textureMaterial && textureMaterial.map !== null;
      textureMaterial.userData = {
        ...textureMaterial.userData,
        auroraVfxCanonicalChunkModelMaterialTextureReference: textureReference,
        auroraVfxCanonicalChunkModelMaterialTextureBound: bound,
        auroraVfxCanonicalChunkModelMaterialTextureSource:
          "shared Aurora model material adapter from source-MDL GLB material extras"
      };
    });
  });
  return materialReport;
}

function installCanonicalChunkMaterialLightingCompatibility(
  material: THREE.Material
): void {
  if (material.userData.auroraTxiDecalLightingInstalled === true) {
    return;
  }
  const result = installAuroraMdlSourceMaterialLighting(material);
  if (
    result.ambientToDiffuse === null ||
    material.userData.auroraVfxCanonicalChunkModelSourceMaterialLightingInstalled === true
  ) {
    return;
  }

  const adapterOnBeforeCompile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    adapterOnBeforeCompile(shader, renderer);
    shader.uniforms.auroraChunkMaterialAmbientToDiffuse =
      shader.uniforms.auroraMdlMaterialAmbientToDiffuse;
    shader.fragmentShader += `
// Legacy canonical Chunk diagnostics; the generic MDL adapter above owns the equation.
// AURORA_WEB_CANONICAL_CHUNK_MATERIAL_AMBIENT
// irradiance *= auroraChunkMaterialAmbientToDiffuse
// uniform vec3 auroraChunkMaterialAmbientToDiffuse`;
    material.userData.auroraVfxCanonicalChunkModelSourceMaterialLightingPatchStatus =
      "applied";
  };
  material.userData = {
    ...material.userData,
    auroraVfxCanonicalChunkModelSourceMaterialLightingInstalled: true,
    auroraVfxCanonicalChunkModelSourceAmbient:
      material.userData.auroraMdlMaterialSourceAmbient,
    auroraVfxCanonicalChunkModelSourceDiffuse:
      material.userData.auroraMdlMaterialSourceDiffuse,
    auroraVfxCanonicalChunkModelAmbientToDiffuse:
      material.userData.auroraMdlMaterialAmbientToDiffuse,
    auroraVfxCanonicalChunkModelSourceMaterialLightingStatus:
      material.userData.auroraMdlMaterialLightingStatus,
    auroraVfxCanonicalChunkModelSourceMaterialLightingPatchStatus:
      "installed-awaiting-compile",
    auroraVfxCanonicalChunkModelSourceMaterialLightingSource:
      material.userData.auroraMdlMaterialLightingSource
  };
}

function resolveCanonicalChunkModelTexture(sourceTexture: THREE.Texture): THREE.Texture {
  const cached = canonicalChunkModelTextures.get(sourceTexture);
  if (cached) {
    return cached;
  }
  const texture = sourceTexture.clone();
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.userData = {
    ...texture.userData,
    auroraVfxCanonicalChunkModelTextureFlipY: false,
    auroraVfxCanonicalChunkModelTextureCoordinateSource:
      "Aurora MDL-to-GLB conversion writes glTF V coordinates as 1-v; model-bound source textures therefore use the glTF flipY=false convention."
  };
  canonicalChunkModelTextures.set(sourceTexture, texture);
  return texture;
}

function readCanonicalChunkModelMaterialTextureReference(material: THREE.Material): string {
  const aurora = isRecord(material.userData.aurora) ? material.userData.aurora : undefined;
  return aurora ? readString(aurora.textureReference).toLowerCase() : "";
}

function attachCanonicalChunkLaneModelGroups(
  modelGraphHierarchy: CanonicalModelGraphHierarchy,
  entries: ReadonlyArray<{ emitterNodeName?: string; group: THREE.Group }>
): void {
  entries.forEach((entry) => {
    modelGraphHierarchy.getEmitterParentGroup(entry.emitterNodeName).add(entry.group);
  });
}

interface CanonicalModelGraphHierarchy {
  root: THREE.Group;
  getEmitterParentGroup(emitterNodeName: string | undefined): THREE.Group;
  getNodeParentGroup(nodeName: string | undefined): THREE.Group;
  getNodeGroup(nodeName: string | undefined): THREE.Group | undefined;
  getNodeBindWorldMatrix(nodeName: string | undefined): THREE.Matrix4 | undefined;
}

function createCanonicalModelGraphHierarchy(
  modelGraph: AuroraVfxCanonicalModelGraph | undefined,
  fallbackRoot: THREE.Group,
  timeSeconds: number,
  selectedAnimation: CanonicalModelGraphAnimation | undefined,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): CanonicalModelGraphHierarchy {
  const root = modelGraph?.nodes.length ? new THREE.Group() : fallbackRoot;
  root.name = "aurora_vfx_model_graph_root";
  root.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalModelGraphRoot: true
  };
  const nodes = modelGraph?.nodes ?? [];
  const nodeByName = new Map<string, AuroraVfxCanonicalModelGraphNode>();
  const groupsByName = new Map<string, THREE.Group>();
  const bindWorldMatricesByName = buildCanonicalModelGraphBindWorldMatrices(
    nodes,
    sourceCoordinateSpace
  );
  nodes.forEach((node) => {
    const key = normalizeCanonicalModelGraphNodeName(node.nodeName);
    if (!key || nodeByName.has(key)) return;
    nodeByName.set(key, node);
    const nodeGroup = new THREE.Group();
    nodeGroup.name = `aurora_vfx_model_graph_node:${node.nodeName}`;
    applyCanonicalModelGraphTransform(
      nodeGroup,
      node.transform,
      timeSeconds,
      node.animationTracks,
      selectedAnimation,
      sourceCoordinateSpace
    );
    nodeGroup.userData = {
      auroraVfxRenderer: "canonical",
      auroraVfxCanonicalModelGraphNode: true,
      auroraVfxCanonicalModelGraphNodeName: node.nodeName,
      auroraVfxCanonicalModelGraphNodeKind: node.nodeKind,
      auroraVfxCanonicalModelGraphTransformTimelinePending:
        hasCanonicalModelGraphTransformTimeline(node.transform)
    };
    groupsByName.set(key, nodeGroup);
  });

  const attached = new Set<string>();
  const attachNode = (nodeKey: string, ancestry: ReadonlySet<string>): void => {
    if (attached.has(nodeKey)) return;
    const node = nodeByName.get(nodeKey);
    const nodeGroup = groupsByName.get(nodeKey);
    if (!node || !nodeGroup) return;
    const parentKey = normalizeCanonicalModelGraphNodeName(node.parentNodeName);
    if (!parentKey || ancestry.has(parentKey) || !groupsByName.has(parentKey)) {
      root.add(nodeGroup);
      attached.add(nodeKey);
      return;
    }
    attachNode(parentKey, new Set([...ancestry, nodeKey]));
    const parentGroup = groupsByName.get(parentKey);
    if (parentGroup) {
      parentGroup.add(nodeGroup);
    } else {
      root.add(nodeGroup);
    }
    attached.add(nodeKey);
  };
  nodeByName.forEach((_node, key) => attachNode(key, new Set()));

  const getNodeParentGroup = (nodeName: string | undefined): THREE.Group => {
    const node = nodeByName.get(normalizeCanonicalModelGraphNodeName(nodeName));
    const parentGroup = node
      ? groupsByName.get(normalizeCanonicalModelGraphNodeName(node.parentNodeName))
      : undefined;
    return parentGroup ?? root;
  };
  return {
    root,
    getNodeParentGroup,
    getEmitterParentGroup: getNodeParentGroup,
    getNodeGroup: (nodeName) =>
      groupsByName.get(normalizeCanonicalModelGraphNodeName(nodeName)),
    getNodeBindWorldMatrix: (nodeName) =>
      bindWorldMatricesByName
        .get(normalizeCanonicalModelGraphNodeName(nodeName))
        ?.clone()
  };
}

function buildCanonicalModelGraphBindWorldMatrices(
  nodes: ReadonlyArray<AuroraVfxCanonicalModelGraphNode>,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): ReadonlyMap<string, THREE.Matrix4> {
  const nodeByName = new Map<string, AuroraVfxCanonicalModelGraphNode>();
  const localMatricesByName = new Map<string, THREE.Matrix4>();
  nodes.forEach((node) => {
    const key = normalizeCanonicalModelGraphNodeName(node.nodeName);
    if (!key || nodeByName.has(key)) return;
    nodeByName.set(key, node);
    const bindGroup = new THREE.Group();
    applyCanonicalModelGraphTransform(
      bindGroup,
      node.transform
        ? {
            position: node.transform.position,
            orientation: node.transform.orientation,
            scale: node.transform.scale
          }
        : undefined,
      0,
      undefined,
      undefined,
      sourceCoordinateSpace
    );
    bindGroup.updateMatrix();
    localMatricesByName.set(key, bindGroup.matrix.clone());
  });

  const worldMatricesByName = new Map<string, THREE.Matrix4>();
  const resolveWorldMatrix = (
    key: string,
    ancestry: ReadonlySet<string>
  ): THREE.Matrix4 => {
    const cached = worldMatricesByName.get(key);
    if (cached) return cached;
    const local = localMatricesByName.get(key)?.clone() ?? new THREE.Matrix4();
    const node = nodeByName.get(key);
    const parentKey = normalizeCanonicalModelGraphNodeName(node?.parentNodeName);
    const world =
      parentKey && !ancestry.has(parentKey) && nodeByName.has(parentKey)
        ? resolveWorldMatrix(parentKey, new Set([...ancestry, key]))
            .clone()
            .multiply(local)
        : local;
    worldMatricesByName.set(key, world);
    return world;
  };
  nodeByName.forEach((_node, key) => {
    resolveWorldMatrix(key, new Set());
  });
  return worldMatricesByName;
}

function attachCanonicalSourceModelGeometry(
  modelGraphHierarchy: CanonicalModelGraphHierarchy,
  template: THREE.Object3D | undefined,
  options: AuroraVfxCanonicalRenderOptions,
  timeSeconds: number,
  selectedAnimation: CanonicalModelGraphAnimation | undefined
): void {
  if (!template || !options.modelGraph?.nodes.length) return;
  const instance = template.clone(true);
  isolateCanonicalChunkInstanceMaterials(instance);
  const sourceNodes = new Map(
    options.modelGraph.nodes.map((node) => [
      normalizeCanonicalModelGraphNodeName(node.nodeName),
      node
    ] as const)
  );
  const meshes: THREE.Mesh[] = [];
  instance.traverse((node) => {
    if (node instanceof THREE.Mesh) meshes.push(node);
  });
  instance.updateMatrixWorld(true);
  let attachedCount = 0;
  let unresolvedCount = 0;
  meshes.forEach((mesh) => {
    const aurora = isRecord(mesh.userData.aurora)
      ? mesh.userData.aurora
      : undefined;
    const sourceMeshName = readString(aurora?.sourceMesh) || mesh.name;
    const sourceNode = sourceNodes.get(
      normalizeCanonicalModelGraphNodeName(sourceMeshName)
    );
    if (!sourceNode) {
      unresolvedCount += 1;
      return;
    }
    const parent =
      modelGraphHierarchy.getNodeGroup(sourceNode.nodeName) ??
      modelGraphHierarchy.root;
    const sourceModelWorldMatrix = mesh.matrixWorld.clone();
    mesh.removeFromParent();
    const bindPoseWorldMatrix =
      modelGraphHierarchy.getNodeBindWorldMatrix(sourceNode.nodeName);
    const bindPoseWorldTransformCompensated =
      bindPoseWorldMatrix !== undefined &&
      Math.abs(bindPoseWorldMatrix.determinant()) > 1e-12;
    if (bindPoseWorldTransformCompensated) {
      const compensatedLocalMatrix = bindPoseWorldMatrix!
        .invert()
        .multiply(sourceModelWorldMatrix);
      mesh.matrixAutoUpdate = true;
      compensatedLocalMatrix.decompose(
        mesh.position,
        mesh.quaternion,
        mesh.scale
      );
      mesh.updateMatrix();
    }
    const materialBinding = bindCanonicalSourceModelMaterials(mesh, options);
    const meshAlpha = applyCanonicalSourceModelMeshAlpha(
      mesh,
      sourceNode,
      timeSeconds,
      selectedAnimation
    );
    mesh.name = `aurora_vfx_source_model_geometry:${sourceMeshName}`;
    mesh.userData = {
      ...mesh.userData,
      auroraVfxRenderer: "canonical",
      auroraVfxCanonicalSourceModelGeometry: true,
      auroraVfxCanonicalSourceModelNodeName: sourceMeshName,
      auroraVfxCanonicalSourceModelBindPosePositionCompensated:
        bindPoseWorldTransformCompensated &&
        sourceNode.transform?.position !== undefined,
      auroraVfxCanonicalSourceModelBindPoseWorldTransformCompensated:
        bindPoseWorldTransformCompensated,
      auroraVfxCanonicalSourceModelMaterialBindingStatus:
        materialBinding.unresolvedReferences.length > 0
          ? materialBinding.resolvedReferences.length > 0
            ? "source-reference-partially-bound"
            : "source-reference-unresolved"
          : materialBinding.resolvedReferences.length > 0
            ? "source-reference-bound"
            : "source-reference-absent",
      auroraVfxCanonicalSourceModelMaterialResolvedReferences:
        materialBinding.resolvedReferences,
      auroraVfxCanonicalSourceModelMaterialUnresolvedReferences:
        materialBinding.unresolvedReferences,
      ...(meshAlpha
        ? {
            auroraVfxCanonicalSourceModelMeshAlpha: meshAlpha.alpha,
            auroraVfxCanonicalSourceModelMeshAlphaAnimation:
              meshAlpha.animationName ?? "",
            auroraVfxCanonicalSourceModelMeshAlphaStatus: meshAlpha.status
          }
        : {
            auroraVfxCanonicalSourceModelMeshAlphaStatus: "source-controller-absent"
          }),
      auroraVfxRetailParityProof: false
    };
    parent.add(mesh);
    attachedCount += 1;
  });
  modelGraphHierarchy.root.userData = {
    ...modelGraphHierarchy.root.userData,
    auroraVfxCanonicalSourceModelGeometryStatus:
      unresolvedCount === 0 ? "source-graph-bound" : "source-graph-partially-bound",
    auroraVfxCanonicalSourceModelGeometryCount: attachedCount,
    auroraVfxCanonicalSourceModelGeometryUnresolvedCount: unresolvedCount,
    auroraVfxRetailParityProof: false
  };
}

function applyCanonicalSourceModelMeshAlpha(
  mesh: THREE.Mesh,
  node: AuroraVfxCanonicalModelGraphNode,
  timeSeconds: number,
  selectedAnimation: CanonicalModelGraphAnimation | undefined
): {
  alpha: number;
  animationName?: string;
  status: "base-track-applied" | "animation-track-applied";
} | undefined {
  const baseAlpha = evaluateCanonicalMeshMaterialAlpha(
    node.meshMaterialState,
    timeSeconds
  );
  const selectedTrack = selectedAnimation
    ? node.meshMaterialAnimationTracks?.find(
        (track) =>
          track.animationName.trim().toLowerCase() ===
          selectedAnimation.animationName.trim().toLowerCase()
      )
    : undefined;
  const animatedAlpha = selectedTrack && selectedAnimation
    ? evaluateCanonicalMeshMaterialAlpha(
        selectedTrack.state,
        selectedAnimation.currentTimeSeconds
      )
    : undefined;
  if (baseAlpha === undefined && animatedAlpha === undefined) {
    return undefined;
  }
  const alpha = THREE.MathUtils.clamp(
    animatedAlpha === undefined
      ? (baseAlpha ?? 1)
      : blendCanonicalModelGraphNumber(
          baseAlpha ?? 1,
          animatedAlpha,
          selectedAnimation?.blendWeight ?? 1
        ),
    0,
    1
  );
  const sourceMaterials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  const materials = sourceMaterials.map((sourceMaterial) => {
    const material = sourceMaterial.clone();
    material.onBeforeCompile = sourceMaterial.onBeforeCompile;
    material.customProgramCacheKey = sourceMaterial.customProgramCacheKey;
    return material;
  });
  mesh.material = Array.isArray(mesh.material) ? materials : materials[0]!;
  materials.forEach((material) => {
    const sourceOpacity = Number.isFinite(material.opacity) ? material.opacity : 1;
    material.opacity = sourceOpacity * alpha;
    material.transparent = material.transparent || alpha < 1;
    material.needsUpdate = true;
    material.userData = {
      ...material.userData,
      auroraVfxCanonicalMeshAlphaSourceOpacity: sourceOpacity,
      auroraVfxCanonicalMeshAlpha: alpha,
      auroraVfxCanonicalMeshAlphaAnimation: selectedTrack?.animationName ?? ""
    };
  });
  return {
    alpha,
    ...(selectedTrack ? { animationName: selectedTrack.animationName } : {}),
    status: selectedTrack ? "animation-track-applied" : "base-track-applied"
  };
}

function evaluateCanonicalMeshMaterialAlpha(
  state: AuroraVfxCanonicalMeshMaterialState | undefined,
  timeSeconds: number
): number | undefined {
  if (!state) return undefined;
  return sampleCanonicalModelGraphNumber(state.alphaTimeline, timeSeconds) ?? state.alpha;
}

function bindCanonicalSourceModelMaterials(
  instance: THREE.Mesh,
  options: AuroraVfxCanonicalRenderOptions
): { resolvedReferences: string[]; unresolvedReferences: string[] } {
  const textures =
    options.sourceModelTexturesByReference ?? options.particleTexturesByReference;
  const canonicalTextures = new Map<string, THREE.Texture>();
  textures?.forEach((texture, reference) => {
    canonicalTextures.set(reference, resolveCanonicalChunkModelTexture(texture));
  });
  const materialReport = applyPlaceableTexturesToModel(
    instance,
    canonicalTextures,
    undefined,
    {
      allowSingleTextureFallback: false,
      textureBindings: options.sourceModelTextureBindings
    }
  );
  const materials = Array.isArray(instance.material)
    ? instance.material
    : [instance.material];
  materials.forEach((material) => {
    installCanonicalChunkMaterialLightingCompatibility(material);
  });
  return materialReport;
}

function normalizeCanonicalModelGraphNodeName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function applyCanonicalModelGraphTransform(
  group: THREE.Group,
  transform: AuroraVfxCanonicalModelGraphTransform | undefined,
  timeSeconds: number,
  animationTracks: AuroraVfxCanonicalModelGraphNode["animationTracks"],
  selectedAnimation: CanonicalModelGraphAnimation | undefined,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): void {
  const base = evaluateCanonicalModelGraphTransform(transform, timeSeconds);
  const selectedTrack = selectedAnimation
    ? animationTracks?.find(
        (track) =>
          track.animationName.trim().toLowerCase() ===
          selectedAnimation.animationName.trim().toLowerCase()
      )
    : undefined;
  const animated = selectedTrack && selectedAnimation
    ? evaluateCanonicalModelGraphTransform(
        selectedTrack.transform,
        selectedAnimation.currentTimeSeconds
      )
    : undefined;
  const position = animated?.position
    ? blendCanonicalModelGraphVector3(base.position, animated.position, selectedAnimation!.blendWeight)
    : base.position;
  if (position && position.length >= 3) {
    group.position.copy(
      convertCanonicalSourceVector(
        {
          x: readFiniteNumber(position[0], 0),
          y: readFiniteNumber(position[1], 0),
          z: readFiniteNumber(position[2], 0)
        },
        sourceCoordinateSpace
      )
    );
  }
  const orientation = animated?.orientation
    ? blendCanonicalModelGraphOrientation(
        base.orientation,
        animated.orientation,
        selectedAnimation!.blendWeight
      )
    : base.orientation;
  if (orientation) {
    const [x, y, z] = orientation.axis;
    const length = Math.hypot(x, y, z);
    if (length > 1e-12 && Number.isFinite(orientation.angleRadians)) {
      group.quaternion.setFromAxisAngle(
        convertCanonicalSourceRotationAxis(
          convertCanonicalSourceVector(
            { x: x / length, y: y / length, z: z / length },
            sourceCoordinateSpace
          ),
          sourceCoordinateSpace
        ),
        orientation.angleRadians
      );
    }
  }
  const scale = animated?.scale !== undefined
    ? blendCanonicalModelGraphNumber(base.scale, animated.scale, selectedAnimation!.blendWeight)
    : base.scale;
  if (typeof scale === "number" && Number.isFinite(scale)) {
    group.scale.setScalar(scale);
  }
}

interface EvaluatedCanonicalModelGraphTransform {
  position?: [number, number, number];
  orientation?: { axis: [number, number, number]; angleRadians: number };
  scale?: number;
}

function evaluateCanonicalModelGraphTransform(
  transform: AuroraVfxCanonicalModelGraphTransform | undefined,
  timeSeconds: number
): EvaluatedCanonicalModelGraphTransform {
  if (!transform) return {};
  return {
    position:
      sampleCanonicalModelGraphVector3(transform.positionTimeline, timeSeconds) ??
      transform.position,
    orientation:
      sampleCanonicalModelGraphOrientation(transform.orientationTimeline, timeSeconds) ??
      transform.orientation,
    scale:
      sampleCanonicalModelGraphNumber(transform.scaleTimeline, timeSeconds) ?? transform.scale
  };
}

function blendCanonicalModelGraphVector3(
  base: [number, number, number] | undefined,
  animated: [number, number, number],
  weight: number
): [number, number, number] {
  if (!base) return animated;
  return [
    THREE.MathUtils.lerp(base[0], animated[0], weight),
    THREE.MathUtils.lerp(base[1], animated[1], weight),
    THREE.MathUtils.lerp(base[2], animated[2], weight)
  ];
}

function blendCanonicalModelGraphNumber(
  base: number | undefined,
  animated: number,
  weight: number
): number {
  return base === undefined ? animated : THREE.MathUtils.lerp(base, animated, weight);
}

function blendCanonicalModelGraphOrientation(
  base: { axis: [number, number, number]; angleRadians: number } | undefined,
  animated: { axis: [number, number, number]; angleRadians: number },
  weight: number
): { axis: [number, number, number]; angleRadians: number } {
  if (!base) return animated;
  const quaternion = canonicalOrientationToQuaternion(base)
    .slerp(canonicalOrientationToQuaternion(animated), weight)
    .normalize();
  const sine = Math.hypot(quaternion.x, quaternion.y, quaternion.z);
  return sine > 1e-12
    ? {
        axis: [quaternion.x / sine, quaternion.y / sine, quaternion.z / sine],
        angleRadians: 2 * Math.atan2(sine, quaternion.w)
      }
    : { axis: [0, 0, 1], angleRadians: 0 };
}

function sampleCanonicalModelGraphVector3(
  frames: AuroraVfxCanonicalModelGraphTransform["positionTimeline"],
  timeSeconds: number
): [number, number, number] | undefined {
  const pair = findCanonicalModelGraphFramePair(frames, timeSeconds);
  if (!pair) return undefined;
  const { previous, next, ratio } = pair;
  if (previous.interpolation === "bezier" || next.interpolation === "bezier") {
    const outgoing = previous.bezierOutgoingTangent;
    const incoming = next.bezierIncomingTangent;
    if (!outgoing || !incoming) return undefined;
    return [
      evaluateCanonicalAuroraCubicBezier(
        previous.value[0], previous.value[0] + outgoing[0], next.value[0] + incoming[0], next.value[0], ratio
      ),
      evaluateCanonicalAuroraCubicBezier(
        previous.value[1], previous.value[1] + outgoing[1], next.value[1] + incoming[1], next.value[1], ratio
      ),
      evaluateCanonicalAuroraCubicBezier(
        previous.value[2], previous.value[2] + outgoing[2], next.value[2] + incoming[2], next.value[2], ratio
      )
    ];
  }
  return [
    previous.value[0] + (next.value[0] - previous.value[0]) * ratio,
    previous.value[1] + (next.value[1] - previous.value[1]) * ratio,
    previous.value[2] + (next.value[2] - previous.value[2]) * ratio
  ];
}

function sampleCanonicalModelGraphNumber(
  frames: AuroraVfxCanonicalNumberKeyframe[] | undefined,
  timeSeconds: number
): number | undefined {
  const pair = findCanonicalModelGraphFramePair(frames, timeSeconds);
  if (!pair) return undefined;
  if (pair.previous.interpolation === "bezier" || pair.next.interpolation === "bezier") {
    const outgoing = pair.previous.bezierOutgoingTangent;
    const incoming = pair.next.bezierIncomingTangent;
    if (outgoing === undefined || incoming === undefined) return undefined;
    return evaluateCanonicalAuroraCubicBezier(
      pair.previous.value,
      pair.previous.value + outgoing,
      pair.next.value + incoming,
      pair.next.value,
      pair.ratio
    );
  }
  return pair.previous.value + (pair.next.value - pair.previous.value) * pair.ratio;
}

function sampleCanonicalModelGraphOrientation(
  frames: AuroraVfxCanonicalModelGraphTransform["orientationTimeline"],
  timeSeconds: number
): { axis: [number, number, number]; angleRadians: number } | undefined {
  if (frames?.some((frame) => frame.interpolation === "bezier")) return undefined;
  const pair = findCanonicalModelGraphFramePair(frames, timeSeconds);
  if (!pair) return undefined;
  const previous = canonicalOrientationToQuaternion(pair.previous.value);
  const next = canonicalOrientationToQuaternion(pair.next.value);
  const quaternion = previous.clone().slerp(next, pair.ratio).normalize();
  const sine = Math.hypot(quaternion.x, quaternion.y, quaternion.z);
  if (!(sine > 1e-12)) {
    return { axis: [0, 0, 1], angleRadians: 0 };
  }
  return {
    axis: [quaternion.x / sine, quaternion.y / sine, quaternion.z / sine],
    angleRadians: 2 * Math.atan2(sine, quaternion.w)
  };
}

function evaluateCanonicalAuroraCubicBezier(
  start: number,
  startControl: number,
  endControl: number,
  end: number,
  t: number
): number {
  const inverse = 1 - t;
  return (
    inverse * inverse * inverse * start +
    3 * inverse * inverse * t * startControl +
    3 * inverse * t * t * endControl +
    t * t * t * end
  );
}

function canonicalOrientationToQuaternion(orientation: {
  axis: [number, number, number];
  angleRadians: number;
}): THREE.Quaternion {
  const [x, y, z] = orientation.axis;
  const length = Math.hypot(x, y, z);
  return length > 1e-12 && Number.isFinite(orientation.angleRadians)
    ? new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(x / length, y / length, z / length),
        orientation.angleRadians
      )
    : new THREE.Quaternion();
}

function findCanonicalModelGraphFramePair<T extends { time: number; value: unknown }>(
  frames: readonly T[] | undefined,
  timeSeconds: number
): { previous: T; next: T; ratio: number } | undefined {
  if (!frames || frames.length === 0) return undefined;
  const ordered = frames.filter((frame) => Number.isFinite(frame.time));
  if (ordered.length === 0) return undefined;
  const target = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const nextIndex = ordered.findIndex((frame) => target <= frame.time);
  if (nextIndex < 0) {
    const frame = ordered.at(-1)!;
    return { previous: frame, next: frame, ratio: 0 };
  }
  if (nextIndex === 0) {
    const frame = ordered[0]!;
    return { previous: frame, next: frame, ratio: 0 };
  }
  const previous = ordered[nextIndex - 1]!;
  const next = ordered[nextIndex]!;
  const span = next.time - previous.time;
  return {
    previous,
    next,
    ratio: span > 0 ? Math.max(0, Math.min(1, (target - previous.time) / span)) : 1
  };
}

function hasCanonicalModelGraphTransformTimeline(
  transform: AuroraVfxCanonicalModelGraphTransform | undefined
): boolean {
  return Boolean(
    (transform?.positionTimeline?.length ?? 0) > 0 ||
      (transform?.orientationTimeline?.length ?? 0) > 0 ||
      (transform?.scaleTimeline?.length ?? 0) > 0
  );
}

function appendCanonicalSourceMdlLights(
  payload: AuroraVfxPayload,
  group: THREE.Group,
  modelGraphHierarchy: CanonicalModelGraphHierarchy,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): void {
  const rawLights = payload.contracts.sourceMdlLights;
  if (!Array.isArray(rawLights)) {
    return;
  }
  const sourceTimeSeconds = readCanonicalModelGraphTimeSeconds(payload);
  const selectedAnimation = readCanonicalModelGraphAnimation(payload);
  if (readCanonicalSourceOwnerActive(payload) === false) {
    return;
  }
  const sourceOwnerPosition = readCanonicalSourceOwnerPosition(payload);
  let count = 0;
  rawLights.forEach((entry) => {
    if (!isRecord(entry)) return;
    const transform = isRecord(entry.transform) ? entry.transform : undefined;
    const basePositionTuple = transform
      ? sampleCanonicalModelGraphVector3(
          readCanonicalLightVector3Timeline(transform.positionTimeline),
          sourceTimeSeconds
        )
      : undefined;
    const directPosition = readLightPosition(entry.transform);
    const basePosition: [number, number, number] = basePositionTuple ?? [
      directPosition.x,
      directPosition.y,
      directPosition.z
    ];
    const directColor = readLightColor(entry.color);
    const baseColor: [number, number, number] = [directColor.r, directColor.g, directColor.b];
    const baseRadius = Math.max(0, readFiniteNumber(entry.radius, 0));
    const baseMultiplier = readFiniteNumber(entry.multiplier, 1);
    const animation = selectedAnimation && Array.isArray(entry.animations)
      ? entry.animations.find(
          (candidate) =>
            isRecord(candidate) &&
            readString(candidate.animationName).toLowerCase() ===
              selectedAnimation.animationName.toLowerCase()
        )
      : undefined;
    const animationRecord = isRecord(animation) ? animation : undefined;
    const animatedPosition = animationRecord
      ? sampleCanonicalModelGraphVector3(
          readCanonicalLightVector3Timeline(animationRecord.positionTimeline),
          selectedAnimation!.currentTimeSeconds
        )
      : undefined;
    const animatedColor = animationRecord
      ? sampleCanonicalModelGraphVector3(
          readCanonicalLightVector3Timeline(animationRecord.colorTimeline),
          selectedAnimation!.currentTimeSeconds
        )
      : undefined;
    const animatedRadius = animationRecord
      ? sampleCanonicalModelGraphNumber(
          readCanonicalLightNumberTimeline(animationRecord.radiusTimeline),
          selectedAnimation!.currentTimeSeconds
        )
      : undefined;
    const animatedMultiplier = animationRecord
      ? sampleCanonicalModelGraphNumber(
          readCanonicalLightNumberTimeline(animationRecord.multiplierTimeline),
          selectedAnimation!.currentTimeSeconds
        )
      : undefined;
    const weight = selectedAnimation?.blendWeight ?? 1;
    const positionTuple = animatedPosition
      ? blendCanonicalModelGraphVector3(basePosition, animatedPosition, weight)
      : basePosition;
    const colorTuple = animatedColor
      ? blendCanonicalModelGraphVector3(baseColor, animatedColor, weight)
      : baseColor;
    const radius = Math.max(
      0,
      animatedRadius !== undefined
        ? blendCanonicalModelGraphNumber(baseRadius, animatedRadius, weight)
        : baseRadius
    );
    const multiplier = animatedMultiplier !== undefined
      ? blendCanonicalModelGraphNumber(baseMultiplier, animatedMultiplier, weight)
      : baseMultiplier;
    const nodeName = readString(entry.nodeName) || `light_${count + 1}`;
    const falloffShaderPatch = installAuroraLinearLightFalloffShaderChunk();
    const ambientOnly = entry.ambientOnly === true;
    const lightProjection = resolveAuroraEnhancedPerformancePointLightProjection({
      color: colorTuple,
      multiplier,
      sourceRadiusWorld: radius,
      ambientOnly
    });
    const light = new THREE.PointLight(
      new THREE.Color(...lightProjection.adjustedColor),
      lightProjection.intensity,
      lightProjection.effectiveRange,
      lightProjection.decay
    );
    light.position.copy(
      convertCanonicalSourceVector(
        { x: positionTuple[0], y: positionTuple[1], z: positionTuple[2] },
        sourceCoordinateSpace
      )
    );
    light.name = `aurora_vfx_source_mdl_light:${nodeName}`;
    light.userData = {
      auroraVfxRenderer: "canonical",
      auroraVfxCanonicalSourceMdlLight: true,
      auroraVfxCanonicalSourceMdlLightNodeName: nodeName,
      auroraVfxCanonicalSourceMdlLightAnimation: selectedAnimation?.animationName ?? "",
      auroraVfxCanonicalSourceMdlLightSampleTimeSeconds:
        selectedAnimation?.currentTimeSeconds ?? sourceTimeSeconds,
      auroraVfxCanonicalSourceMdlLightColor: colorTuple,
      auroraVfxCanonicalSourceMdlLightRadius: radius,
      auroraVfxCanonicalSourceMdlLightMultiplier: multiplier,
      auroraVfxCanonicalSourceMdlLightAdjustedColor:
        lightProjection.adjustedColor,
      auroraVfxCanonicalSourceMdlLightEffectiveRange:
        lightProjection.effectiveRange,
      auroraVfxCanonicalSourceMdlLightSourceRadius: radius,
      auroraVfxCanonicalSourceMdlLightSourceMultiplier: multiplier,
      auroraVfxCanonicalSourceMdlLightAmbientOnly: ambientOnly,
      auroraVfxCanonicalSourceMdlLightChannelMappingStatus:
        ambientOnly
          ? AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS
          : "source-backed-localized-diffuse-channel-point-light-adapter",
      auroraVfxCanonicalSourceMdlLightChannelMappingSource:
        AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE,
      auroraVfxCanonicalSourceMdlLightShaderChannelMarker: light.decay,
      auroraVfxCanonicalSourceMdlLightShaderChannelMarkerRole:
        ambientOnly
          ? "negative-decay-localized-ambient-marker"
          : "positive-decay-localized-diffuse",
      auroraVfxCanonicalSourceMdlLightFalloffFormula:
        AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FORMULA,
      auroraVfxCanonicalSourceMdlLightFalloffRendererPatchStatus: falloffShaderPatch.status,
      auroraVfxCanonicalSourceMdlLightFalloffRendererProofStatus:
        AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_PROOF_STATUS,
      auroraVfxCanonicalSourceMdlLightFalloffRendererSource:
        AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_SOURCE,
      auroraVfxCanonicalSourceMdlLightRetailProof: false
    };
    const modelParent = modelGraphHierarchy.getNodeParentGroup(readString(entry.nodeName));
    modelParent.add(light);
    if (sourceOwnerPosition) {
      group.updateMatrixWorld(true);
      modelParent.updateWorldMatrix(true, false);
      const baseWorldPosition = light.getWorldPosition(new THREE.Vector3());
      const ownerWorldOffset = convertCanonicalSourceVector(
        sourceOwnerPosition,
        sourceCoordinateSpace
      );
      group.add(light);
      light.position.copy(
        group.worldToLocal(baseWorldPosition.add(ownerWorldOffset))
      );
      light.userData = {
        ...light.userData,
        auroraVfxCanonicalSourceOwnerTransformApplied: true,
        auroraVfxCanonicalSourceOwnerPosition: [
          sourceOwnerPosition.x,
          sourceOwnerPosition.y,
          sourceOwnerPosition.z
        ]
      };
    }
    count += 1;
  });
  if (count === 0) return;
  modelGraphHierarchy.root.userData = {
    ...modelGraphHierarchy.root.userData,
    auroraVfxCanonicalSourceMdlLightGroup: true,
    auroraVfxCanonicalSourceMdlLightCount: count,
    auroraVfxCanonicalSourceMdlLightRetailProof: false
  };
}

function readCanonicalSourceOwnerPosition(
  payload: AuroraVfxPayload
): { x: number; y: number; z: number } | undefined {
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) {
    return undefined;
  }
  for (const emitter of runtimeEmitters) {
    if (!isRecord(emitter) || !isRecord(emitter.sourceOwnerTransform)) {
      continue;
    }
    const position = emitter.sourceOwnerTransform.position;
    if (
      Array.isArray(position) &&
      position.length >= 3 &&
      position.slice(0, 3).every((value) => typeof value === "number" && Number.isFinite(value))
    ) {
      return {
        x: position[0] as number,
        y: position[1] as number,
        z: position[2] as number
      };
    }
  }
  return undefined;
}

function readCanonicalSourceOwnerActive(payload: AuroraVfxPayload): boolean | undefined {
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) {
    return undefined;
  }
  for (const emitter of runtimeEmitters) {
    if (isRecord(emitter) && isRecord(emitter.objectDurationVisualOwner)) {
      return emitter.objectDurationVisualOwner.active === false ? false : true;
    }
    if (!isRecord(emitter) || !isRecord(emitter.sourceOwnerTransform)) {
      continue;
    }
    return emitter.sourceOwnerTransform.active === false ? false : true;
  }
  return undefined;
}

function readCanonicalLightNumberTimeline(
  value: unknown
): AuroraVfxCanonicalModelGraphTransform["scaleTimeline"] {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const time = readOptionalFiniteNumber(entry.time);
    const frameValue = readOptionalFiniteNumber(entry.value);
    if (time === undefined || frameValue === undefined) return [];
    const incoming = readOptionalFiniteNumber(entry.bezierIncomingTangent);
    const outgoing = readOptionalFiniteNumber(entry.bezierOutgoingTangent);
    return [{
      time,
      value: frameValue,
      ...(entry.interpolation === "bezier" ? { interpolation: "bezier" as const } : {}),
      ...(incoming !== undefined ? { bezierIncomingTangent: incoming } : {}),
      ...(outgoing !== undefined ? { bezierOutgoingTangent: outgoing } : {})
    }];
  });
}

function readCanonicalLightVector3Timeline(
  value: unknown
): AuroraVfxCanonicalModelGraphTransform["positionTimeline"] {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.value) || entry.value.length < 3) return [];
    const time = readOptionalFiniteNumber(entry.time);
    const frameValue = readVector3Tuple(entry.value);
    if (time === undefined || !frameValue) return [];
    const incoming = readVector3Tuple(entry.bezierIncomingTangent);
    const outgoing = readVector3Tuple(entry.bezierOutgoingTangent);
    return [{
      time,
      value: frameValue,
      ...(entry.interpolation === "bezier" ? { interpolation: "bezier" as const } : {}),
      ...(incoming ? { bezierIncomingTangent: incoming } : {}),
      ...(outgoing ? { bezierOutgoingTangent: outgoing } : {})
    }];
  });
}

function readVector3Tuple(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const x = readOptionalFiniteNumber(value[0]);
  const y = readOptionalFiniteNumber(value[1]);
  const z = readOptionalFiniteNumber(value[2]);
  return x !== undefined && y !== undefined && z !== undefined ? [x, y, z] : undefined;
}

function readLightPosition(value: unknown): AuroraVector3Like {
  if (isRecord(value) && Array.isArray(value.position) && value.position.length >= 3) {
    return {
      x: readFiniteNumber(value.position[0], 0),
      y: readFiniteNumber(value.position[1], 0),
      z: readFiniteNumber(value.position[2], 0)
    };
  }
  return { x: 0, y: 0, z: 0 };
}

function readLightColor(value: unknown): AuroraColorLike {
  if (Array.isArray(value) && value.length >= 3) {
    return {
      r: readFiniteNumber(value[0], 1),
      g: readFiniteNumber(value[1], 1),
      b: readFiniteNumber(value[2], 1)
    };
  }
  return { r: 1, g: 1, b: 1 };
}

function countCanonicalChunkLaneModelInstances(groups: readonly THREE.Object3D[]): number {
  let count = 0;
  groups.forEach((group) => {
    group.traverse((node) => {
      if (node.userData.auroraVfxCanonicalChunkLaneModelInstance === true) {
        count += 1;
      }
    });
  });
  return count;
}

function buildCanonicalChunkLaneDiagnostics(
  contract: AuroraVfxRuntimeRenderContractRecord,
  chunkLaneModels: readonly THREE.Object3D[]
): SceneObjectVfxDiagnostic[] {
  const chunkLaneCount = (contract.chunkLanes ?? (contract.chunkLane ? [contract.chunkLane] : []))
    .length;
  if (chunkLaneCount === 0) {
    return [];
  }
  return chunkLaneModels.length > 0
    ? [CANONICAL_CHUNK_MODEL_PREVIEW_DIAGNOSTIC]
    : [CANONICAL_CHUNK_LANE_DIAGNOSTIC];
}

function readChunkParticleLane(value: unknown): AuroraVfxChunkParticleLaneRecord | undefined {
  if (!isRecord(value) || value.lane !== "chunk_model") {
    return undefined;
  }
  const resolvedResource = readChunkModelResolvedResource(value.resolvedResource);
  const modelAnimation = readChunkModelAnimation(value.modelAnimation);
  return {
    lane: "chunk_model",
    ...(readString(value.chunkName) ? { chunkName: readString(value.chunkName) } : {}),
    ...(modelAnimation ? { modelAnimation } : {}),
    activeParticleCount: readFiniteNumber(value.activeParticleCount, 0),
    particleInstances: readChunkParticleInstances(value.particleInstances),
    texturedQuadCanonical: false,
    collapseAttempted: readBoolean(value.collapseAttempted, false),
    resourceResolveStatus:
      value.resourceResolveStatus === "resolved" || resolvedResource ? "resolved" : "unresolved",
    ...(resolvedResource ? { resolvedResource } : {})
  };
}

function readChunkModelAnimation(value: unknown): AuroraVfxChunkModelAnimationRecord | undefined {
  if (
    !isRecord(value) ||
    value.animationName !== "impact" ||
    value.playbackRate !== 1 ||
    value.startPolicy !== "once_on_particle_activation" ||
    value.source !== "nwtoolset-1.5.0.5-chunk-particle-init-disassembly" ||
    value.binarySha256 !==
      "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" ||
    !isRecord(value.rawArguments) ||
    value.rawArguments.argumentAfterRate !== 1 ||
    value.rawArguments.finalArgument !== 0
  ) {
    return undefined;
  }
  return {
    animationName: "impact",
    playbackRate: 1,
    startPolicy: "once_on_particle_activation",
    rawArguments: {
      argumentAfterRate: 1,
      finalArgument: 0
    },
    source: "nwtoolset-1.5.0.5-chunk-particle-init-disassembly",
    binarySha256:
      "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
  };
}

function readCanonicalRuntimeAnimationNames(payload: AuroraVfxPayload): string[] {
  const runtimeEmitters = payload.contracts.runtimeEmitters;
  if (!Array.isArray(runtimeEmitters)) return [];
  const animationNames = new Set<string>();
  runtimeEmitters.forEach((entry) => {
    if (!isRecord(entry)) return;
    const selectedAnimationName = isRecord(entry.selectedAnimation)
      ? readString(entry.selectedAnimation.animationName).trim()
      : "";
    if (selectedAnimationName) animationNames.add(selectedAnimationName);
    if (!Array.isArray(entry.runtimeFrames)) return;
    entry.runtimeFrames.forEach((frame) => {
      if (!isRecord(frame) || !isRecord(frame.selectedAnimation)) return;
      const frameAnimationName = readString(frame.selectedAnimation.animationName).trim();
      if (frameAnimationName) animationNames.add(frameAnimationName);
    });
  });
  return [...animationNames];
}

function readChunkParticleInstances(value: unknown): Array<{
  particleId: number;
  position: { x: number; y: number; z: number };
  rotationRadians?: number;
  rotationAxis?: { x: number; y: number; z: number };
  particleOrientation?: {
    axis: [number, number, number];
    angleRadians: number;
  };
  landed: boolean;
  contactNormal?: { x: number; y: number; z: number };
  scale?: { x: number; y: number };
  ageSeconds?: number;
  lifetimeSeconds?: number;
  modelInstanceRef?: string;
  modelRuntimeStatus?: "active" | "released";
  modelRuntimeFrame?: AuroraVfxCanonicalChildModelRuntimeFrame;
}> {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!isRecord(entry) || !Number.isFinite(entry.particleId)) return [];
        const position = readVector3(entry.position);
        if (!position) return [];
        const rotationAxis = readVector3(entry.rotationAxis);
        const particleOrientation = readCanonicalDrawRecordOrientation(entry.particleOrientation);
        const contactNormal = readVector3(entry.contactNormal);
        const scale = isRecord(entry.scale) && Number.isFinite(entry.scale.x) && Number.isFinite(entry.scale.y)
          ? { x: entry.scale.x as number, y: entry.scale.y as number }
          : undefined;
        const modelRuntimeStatus =
          entry.modelRuntimeStatus === "active" || entry.modelRuntimeStatus === "released"
            ? entry.modelRuntimeStatus
            : undefined;
        const modelRuntimeFrame = readCanonicalChildModelRuntimeFrame(
          entry.modelRuntimeFrame
        );
        return [{
          particleId: Math.trunc(entry.particleId as number),
          position,
          ...(Number.isFinite(entry.rotationRadians)
            ? { rotationRadians: entry.rotationRadians as number }
            : {}),
          ...(rotationAxis ? { rotationAxis } : {}),
          ...(particleOrientation ? { particleOrientation } : {}),
          landed: entry.landed === true,
          ...(contactNormal ? { contactNormal } : {}),
          ...(scale ? { scale } : {}),
          ...(Number.isFinite(entry.ageSeconds) ? { ageSeconds: entry.ageSeconds as number } : {}),
          ...(Number.isFinite(entry.lifetimeSeconds)
            ? { lifetimeSeconds: entry.lifetimeSeconds as number }
            : {}),
          ...(readString(entry.modelInstanceRef)
            ? { modelInstanceRef: readString(entry.modelInstanceRef) }
            : {}),
          ...(modelRuntimeStatus ? { modelRuntimeStatus } : {}),
          ...(modelRuntimeFrame ? { modelRuntimeFrame } : {})
        }];
      })
    : [];
}

function readCanonicalChildModelRuntimeFrame(
  value: unknown
): AuroraVfxCanonicalChildModelRuntimeFrame | undefined {
  if (
    !isRecord(value) ||
    value.version !== "aurora-vfx-child-model-runtime-frame/v1" ||
    !readString(value.modelInstanceRef) ||
    !Number.isFinite(value.localClockSeconds) ||
    !isRecord(value.rngLineage) ||
    value.rngLineage.algorithm !== "nwn-ee-msvc-rand15" ||
    !Number.isFinite(value.rngLineage.initialSeed) ||
    !Number.isFinite(value.rngLineage.finalSeed) ||
    !Array.isArray(value.runtimeEmitters)
  ) {
    return undefined;
  }
  const runtimeEmitters = value.runtimeEmitters.filter(isRecord).map(
    (entry) => entry as Record<string, AuroraVfxJsonValue>
  );
  if (runtimeEmitters.length !== value.runtimeEmitters.length) {
    return undefined;
  }
  return {
    version: "aurora-vfx-child-model-runtime-frame/v1",
    modelInstanceRef: readString(value.modelInstanceRef),
    ...(readString(value.sourceModelObjectKey)
      ? { sourceModelObjectKey: readString(value.sourceModelObjectKey) }
      : {}),
    localClockSeconds: Math.max(0, value.localClockSeconds as number),
    rngLineage: {
      algorithm: "nwn-ee-msvc-rand15",
      initialSeed: Math.trunc(value.rngLineage.initialSeed as number) >>> 0,
      finalSeed: Math.trunc(value.rngLineage.finalSeed as number) >>> 0
    },
    runtimeEmitters
  };
}

function readChunkModelResolvedResource(
  value: unknown
): AuroraVfxChunkModelResolvedResourceRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const requestedRef = readString(value.requestedRef);
  const resourceKey = readString(value.resourceKey);
  const sourceLayer = readString(value.sourceLayer);
  if (!requestedRef || !resourceKey || !sourceLayer) {
    return undefined;
  }
  return {
    requestedRef,
    resourceKey,
    sourceLayer,
    ...(readString(value.sourcePath) ? { sourcePath: readString(value.sourcePath) } : {}),
    ...(readString(value.hakName) ? { hakName: readString(value.hakName) } : {}),
    ...(readString(value.sourceHash) ? { sourceHash: readString(value.sourceHash) } : {}),
    ...(readString(value.resourceHash) ? { resourceHash: readString(value.resourceHash) } : {}),
    ...(readString(value.candidateId) ? { candidateId: readString(value.candidateId) } : {}),
    ...(typeof value.precedenceRank === "number" && Number.isFinite(value.precedenceRank)
      ? { precedenceRank: value.precedenceRank }
      : {}),
    resolutionSource:
      readString(value.resolutionSource) || "dependency-graph-selected-candidate"
  };
}

function mergeRenderedBounds(
  left: AuroraVfxRenderedBounds | null,
  right: AuroraVfxRenderedBounds
): AuroraVfxRenderedBounds {
  if (!left) {
    return right;
  }
  const leftMinX = left.centerX - left.width * 0.5;
  const leftMaxX = left.centerX + left.width * 0.5;
  const leftMinY = left.centerY - left.height * 0.5;
  const leftMaxY = left.centerY + left.height * 0.5;
  const leftMinZ = left.centerZ - left.depth * 0.5;
  const leftMaxZ = left.centerZ + left.depth * 0.5;
  const rightMinX = right.centerX - right.width * 0.5;
  const rightMaxX = right.centerX + right.width * 0.5;
  const rightMinY = right.centerY - right.height * 0.5;
  const rightMaxY = right.centerY + right.height * 0.5;
  const rightMinZ = right.centerZ - right.depth * 0.5;
  const rightMaxZ = right.centerZ + right.depth * 0.5;
  const minX = Math.min(leftMinX, rightMinX);
  const maxX = Math.max(leftMaxX, rightMaxX);
  const minY = Math.min(leftMinY, rightMinY);
  const maxY = Math.max(leftMaxY, rightMaxY);
  const minZ = Math.min(leftMinZ, rightMinZ);
  const maxZ = Math.max(leftMaxZ, rightMaxZ);
  return {
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
    centerX: (minX + maxX) * 0.5,
    centerY: (minY + maxY) * 0.5,
    centerZ: (minZ + maxZ) * 0.5
  };
}

function readProgFxType4LightRecords(value: unknown): AuroraVfxProgFxType4LightRecord[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const record = readProgFxType4LightRecord(entry);
        return record ? [record] : [];
      })
    : [];
}

function readProgFxType4LightRecord(value: unknown): AuroraVfxProgFxType4LightRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const sourceMdlRadiusFrames = Array.isArray(value.sourceMdlRadiusFrames)
    ? value.sourceMdlRadiusFrames
        .map((entry) => readNullableFiniteNumber(entry))
        .filter((entry): entry is number => entry !== null)
    : [];
  return {
    rowId: readFiniteNumber(value.rowId, -1),
    label: readString(value.label),
    animationRaw: readString(value.animationRaw),
    animation: readString(value.animation),
    animationParameterStatus: readString(value.animationParameterStatus),
    animationKind: readString(value.animationKind),
    visionMode: readString(value.visionMode),
    visionParameterStatus: readString(value.visionParameterStatus),
    symbolicColor: readString(value.symbolicColor),
    tokenRadiusMeters: readNullableFiniteNumber(value.tokenRadiusMeters),
    tokenRadiusProofStatus: readString(value.tokenRadiusProofStatus),
    radiusMeters: readNullableFiniteNumber(value.radiusMeters),
    radiusProofStatus: readString(value.radiusProofStatus),
    sourceMdlNodeName: readString(value.sourceMdlNodeName),
    sourceMdlAnimation: readString(value.sourceMdlAnimation),
    sourceMdlColor: readColor(value.sourceMdlColor),
    sourceMdlColorSource: readString(value.sourceMdlColorSource),
    sourceMdlColorProofStatus: readString(value.sourceMdlColorProofStatus),
    sourceMdlRadiusMeters: readNullableFiniteNumber(value.sourceMdlRadiusMeters),
    sourceMdlRadiusFrames:
      sourceMdlRadiusFrames.length === 2
        ? [sourceMdlRadiusFrames[0]!, sourceMdlRadiusFrames[1]!]
        : null,
    sourceMdlRadiusSource: readString(value.sourceMdlRadiusSource),
    sourceMdlRadiusProofStatus: readString(value.sourceMdlRadiusProofStatus),
    animationSpeedRaw: readString(value.animationSpeedRaw),
    animationSpeed: readNullableFiniteNumber(value.animationSpeed),
    animationSpeedParameterStatus: readString(value.animationSpeedParameterStatus),
    castShadowsRaw: readString(value.castShadowsRaw),
    castShadows: readNullableBoolean(value.castShadows),
    castShadowParameterStatus: readString(value.castShadowParameterStatus),
    priorityRaw: readString(value.priorityRaw),
    priority: readNullableFiniteNumber(value.priority),
    priorityParameterStatus: readString(value.priorityParameterStatus),
    proximitySuppressionRaw: readString(value.proximitySuppressionRaw),
    proximitySuppression: readNullableBoolean(value.proximitySuppression),
    proximitySuppressionParameterStatus: readString(
      value.proximitySuppressionParameterStatus
    ),
    attachToSceneRaw: readString(value.attachToSceneRaw),
    attachToScene: readNullableBoolean(value.attachToScene),
    sceneAttachmentParameterStatus: readString(value.sceneAttachmentParameterStatus),
    modelRaw: readString(value.modelRaw),
    modelRef: readString(value.modelRef),
    modelParameterStatus: readString(value.modelParameterStatus),
    unusedParam8Raw: readString(value.unusedParam8Raw),
    color: readColor(value.color) ?? { r: 1, g: 1, b: 1 },
    proofStatus: readString(value.proofStatus),
    notPlaceableTwoDaLight: readBoolean(value.notPlaceableTwoDaLight, false),
    notMdlLightNode: readBoolean(value.notMdlLightNode, false),
    parameterSource: readString(value.parameterSource),
    parameterPreservationProofSource: readString(value.parameterPreservationProofSource),
    parameterPreservationProofStatus: readString(value.parameterPreservationProofStatus),
    runtimeSchedulingStatus: readString(value.runtimeSchedulingStatus),
    runtimeSchedulingProofSource: readString(value.runtimeSchedulingProofSource),
    runtimeSchedulingBlocker: readString(value.runtimeSchedulingBlocker),
    sceneAttachmentPolicyStatus: readString(value.sceneAttachmentPolicyStatus),
    proximitySuppressionPolicyStatus: readString(
      value.proximitySuppressionPolicyStatus
    ),
    visionMutationPolicyStatus: readString(value.visionMutationPolicyStatus),
    shadowPolicyStatus: readString(value.shadowPolicyStatus),
    visualPreviewStatus: readString(value.visualPreviewStatus),
    ownerVisualEffectRowId: readNullableFiniteNumber(value.ownerVisualEffectRowId),
    ownerVisualEffectLabel: readString(value.ownerVisualEffectLabel),
    ownerPhase: readString(value.ownerPhase),
    ownerProgFxRef: readString(value.ownerProgFxRef),
    ownerEffectConstructorKind: readString(value.ownerEffectConstructorKind),
    ownerDurationType: readString(value.ownerDurationType)
  };
}

function readDrawRecord(value: unknown): AuroraParticleDrawRecordLike[] {
  if (!isRecord(value) || value.recordKind !== "aurora-particle-draw-record") {
    return [];
  }
  const lane = readDrawLane(value.lane);
  if (lane === "chunk_model") {
    return [];
  }
  const position = readVector3(value.position);
  const velocity = readVector3(value.velocity) ?? { x: 0, y: 0, z: 0 };
  const color = readColor(value.color);
  const size = readSize(value.size);
  const atlasUv = readAtlasUv(value.atlasUv);
  const atlasProvenance = isRecord(value.atlasProvenance) ? value.atlasProvenance : null;
  if (!position || !color || !size || !atlasUv) {
    return [];
  }
  return [
    {
      recordKind: "aurora-particle-draw-record",
      drawRecordId: readString(value.drawRecordId) || `particle:${readFiniteNumber(value.particleId, 0)}`,
      emitterNodeName: readString(value.emitterNodeName),
      lane,
      particleId: readFiniteNumber(value.particleId, 0),
      particleIndex: readFiniteNumber(value.particleIndex, 0),
      ageSeconds: Math.max(0, readFiniteNumber(value.ageSeconds, 0)),
      lifetimeSeconds: Math.max(0, readFiniteNumber(value.lifetimeSeconds, 0)),
      linkedNextParticleId: readOptionalFiniteNumber(value.linkedNextParticleId),
      linkedNextPosition: readVector3(value.linkedNextPosition) ?? undefined,
      verticesPerParticle: 6,
      vertexCount: 6,
      position,
      previousPosition: readVector3(value.previousPosition) ?? undefined,
      velocity,
      direction: readVector3(value.direction) ?? undefined,
      landed: value.landed === true,
      contactNormal: readVector3(value.contactNormal) ?? undefined,
      splat: value.splat === true,
      inheritedVelocityMagnitude: readOptionalFiniteNumber(value.inheritedVelocityMagnitude),
      inheritedVelocityDirection: readVector3(value.inheritedVelocityDirection) ?? undefined,
      inheritPart: value.inheritPart === true,
      rotationRadians: readFiniteNumber(value.rotationRadians, 0),
      particleOrientation: readCanonicalDrawRecordOrientation(value.particleOrientation),
      emitterOrientation: readCanonicalDrawRecordOrientation(value.emitterOrientation),
      color,
      alpha: clamp(readFiniteNumber(value.alpha, 1), 0, 1),
      size,
      atlasUv,
      renderMode: readModeRecord(value.renderMode),
      blendMode: readModeRecord(value.blendMode),
      renderOrder: readRenderOrder(value.renderOrder),
      pltLayer: readString(value.pltLayer) || readString(atlasProvenance?.pltLayer),
      pltLayerColorSource:
        readString(value.pltLayerColorSource) || readString(atlasProvenance?.pltLayerColorSource),
      diagnostics: normalizeDiagnostics(value.diagnostics)
    }
  ];
}

function readCanonicalDrawRecordOrientation(
  value: unknown
): AuroraParticleDrawRecordLike["emitterOrientation"] | undefined {
  if (!isRecord(value) || !Array.isArray(value.axis) || value.axis.length !== 3) {
    return undefined;
  }
  const axis = value.axis.map((entry) => (typeof entry === "number" ? entry : Number.NaN));
  if (
    !axis.every((entry) => Number.isFinite(entry)) ||
    !(typeof value.angleRadians === "number" && Number.isFinite(value.angleRadians))
  ) {
    return undefined;
  }
  return {
    axis: [axis[0]!, axis[1]!, axis[2]!],
    angleRadians: value.angleRadians
  };
}

function resolveCanonicalParticleBasis(
  record: AuroraParticleDrawRecordLike,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up" = "three-y-up",
  cameraBillboardBasis?: AuroraVfxCanonicalCameraBillboardBasis
): AuroraVfxCanonicalParticleBasis {
  const landedSplatBasis = resolveLandedSplatParticleBasis(record, sourceCoordinateSpace);
  if (landedSplatBasis) {
    return landedSplatBasis;
  }
  const renderMode = normalizeRenderModeToken(record.renderMode?.enum || record.renderMode?.rawToken);
  if (renderMode === "aligned_to_particle_dir") {
    return resolveParticleOrientationBasis(record, sourceCoordinateSpace);
  }
  if (renderMode === "motion_blur") {
    return resolveMotionBlurParticleBasis(
      record,
      sourceCoordinateSpace,
      cameraBillboardBasis
    );
  }
  if (renderMode === "billboard_to_local_z") {
    return resolveLocalZVerticalParticleBasis(record, sourceCoordinateSpace);
  }
  if (renderMode === "billboard_to_world_z" || renderMode === "linked") {
    return resolveWorldZVerticalParticleBasis(record, sourceCoordinateSpace);
  }
  if (renderMode === "aligned_to_world_z") {
    return resolveWorldZAlignedParticleBasis(record, cameraBillboardBasis);
  }
  return resolveCameraXyParticleBasis(record, cameraBillboardBasis);
}

function normalizeRenderModeToken(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function convertCanonicalSourceVector(
  value: { x: number; y: number; z: number },
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): THREE.Vector3 {
  return sourceCoordinateSpace === "aurora-z-up"
    ? new THREE.Vector3(value.x, value.z, value.y)
    : new THREE.Vector3(value.x, value.y, value.z);
}

function convertCanonicalThreeVectorToSource(
  value: THREE.Vector3,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): AuroraVector3Like {
  return sourceCoordinateSpace === "aurora-z-up"
    ? { x: value.x, y: value.z, z: value.y }
    : { x: value.x, y: value.y, z: value.z };
}

function convertCanonicalSourceRotationAxis(
  convertedAxis: THREE.Vector3,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): THREE.Vector3 {
  const axis = convertedAxis.clone().normalize();
  // C=(x,z,y) reflects handedness, so C*R(a)*C^-1 uses -C*a at the same angle.
  return sourceCoordinateSpace === "aurora-z-up" ? axis.negate() : axis;
}

function canonicalSourceOrientationToThreeQuaternion(
  orientation: { axis: [number, number, number]; angleRadians: number },
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): THREE.Quaternion {
  const [x, y, z] = orientation.axis;
  const axis = convertCanonicalSourceRotationAxis(
    convertCanonicalSourceVector({ x, y, z }, sourceCoordinateSpace),
    sourceCoordinateSpace
  );
  return axis.lengthSq() > 1e-12 && Number.isFinite(orientation.angleRadians)
    ? new THREE.Quaternion().setFromAxisAngle(axis, orientation.angleRadians)
    : new THREE.Quaternion();
}

function resolveLandedSplatParticleBasis(
  record: AuroraParticleDrawRecordLike,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): AuroraVfxCanonicalParticleBasis | undefined {
  if (!record.splat || !record.landed || !record.contactNormal) {
    return undefined;
  }
  const normal = convertCanonicalSourceVector(
    record.contactNormal,
    sourceCoordinateSpace
  );
  if (normal.lengthSq() <= 1e-10) {
    return undefined;
  }
  normal.normalize();
  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    normal
  );
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(orientation);
  const up = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation);
  if (record.rotationRadians !== 0) {
    right.applyAxisAngle(normal, record.rotationRadians);
    up.applyAxisAngle(normal, record.rotationRadians);
  }
  return {
    mode: "landed_splat_contact_plane",
    source: "aurora-landed-splat-contact-normal-orientation",
    right,
    up,
    heightScale: 1
  };
}

function resolveCameraXyParticleBasis(
  record: AuroraParticleDrawRecordLike,
  cameraBillboardBasis?: AuroraVfxCanonicalCameraBillboardBasis
): AuroraVfxCanonicalParticleBasis {
  const rotationCos = Math.cos(record.rotationRadians);
  const rotationSin = Math.sin(record.rotationRadians);
  if (cameraBillboardBasis) {
    return {
      mode: "camera_xy_billboard",
      source: "runtime-camera-facing-billboard",
      right: cameraBillboardBasis.right
        .clone()
        .multiplyScalar(rotationCos)
        .addScaledVector(cameraBillboardBasis.up, rotationSin),
      up: cameraBillboardBasis.up
        .clone()
        .multiplyScalar(rotationCos)
        .addScaledVector(cameraBillboardBasis.right, -rotationSin),
      heightScale: 1,
      reverseWinding: cameraBillboardBasis.reverseWinding
    };
  }
  return {
    mode: "camera_xy_billboard",
    source: "fallback-camera-xy-billboard",
    right: new THREE.Vector3(rotationCos, rotationSin, 0),
    up: new THREE.Vector3(-rotationSin, rotationCos, 0),
    heightScale: 1
  };
}

function resolveWorldZAlignedParticleBasis(
  record: AuroraParticleDrawRecordLike,
  cameraBillboardBasis?: AuroraVfxCanonicalCameraBillboardBasis
): AuroraVfxCanonicalParticleBasis {
  const cameraBasis = resolveCameraXyParticleBasis(record, cameraBillboardBasis);
  const worldZ = new THREE.Vector3(0, 1, 0);
  if (cameraBillboardBasis && cameraBillboardBasis.up.dot(worldZ) < 0) {
    worldZ.negate();
  }
  // Native Mode 4 starts with the camera-derived first quad vector, then
  // replaces only the second vector with signed global Z
  // (FUN_00a2e250:855984-855993, 856598-856602).
  // In the canonical Three scene global Aurora Z maps to Three Y.
  return {
    mode: "world_z_aligned_camera_billboard",
    source: cameraBillboardBasis
      ? "aurora-render-mode-world-z-camera-horizontal-signed-world-z"
      : "aurora-render-mode-world-z-camera-horizontal-fallback",
    right: cameraBasis.right,
    up: worldZ,
    heightScale: 1
  };
}

function resolveWorldZVerticalParticleBasis(
  record: AuroraParticleDrawRecordLike,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up" = "three-y-up"
): AuroraVfxCanonicalParticleBasis {
  if (sourceCoordinateSpace === "aurora-z-up") {
    // Mode 2 starts from Aurora's identity X/Y quad. C=(x,z,y) maps that
    // plane to Three X/Z, and the handedness correction lives in the rotation
    // quaternion rather than in a visual approximation.
    const rotation = canonicalSourceOrientationToThreeQuaternion(
      { axis: [0, 0, 1], angleRadians: record.rotationRadians },
      sourceCoordinateSpace
    );
    return {
      mode: "world_z_vertical_billboard",
      source: "aurora-render-mode-world-z-source-xy-plane",
      right: convertCanonicalSourceVector({ x: 1, y: 0, z: 0 }, sourceCoordinateSpace)
        .applyQuaternion(rotation)
        .normalize(),
      up: convertCanonicalSourceVector({ x: 0, y: 1, z: 0 }, sourceCoordinateSpace)
        .applyQuaternion(rotation)
        .normalize(),
      heightScale: 1,
      // C=(x,z,y) is a reflection. Reverse the mapped native X/Y quad so
      // Aurora's +Z front face remains Three's +Y front face under culling.
      reverseWinding: true
    };
  }
  const rotationCos = Math.cos(record.rotationRadians);
  const rotationSin = Math.sin(record.rotationRadians);
  return {
    mode: "world_z_vertical_billboard",
    source: "aurora-render-mode-world-or-local-z",
    right: new THREE.Vector3(rotationCos, 0, rotationSin),
    up: new THREE.Vector3(0, 1, 0),
    heightScale: 1
  };
}

function resolveLocalZVerticalParticleBasis(
  record: AuroraParticleDrawRecordLike,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): AuroraVfxCanonicalParticleBasis {
  const orientation = record.emitterOrientation;
  const emitterQuaternion = orientation
    ? canonicalSourceOrientationToThreeQuaternion(orientation, sourceCoordinateSpace)
    : new THREE.Quaternion();
  const right = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(emitterQuaternion)
    .normalize();
  const up = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(emitterQuaternion)
    .normalize();
  const localZ = new THREE.Vector3(0, 1, 0)
    .applyQuaternion(emitterQuaternion)
    .normalize();
  if (record.rotationRadians !== 0) {
    const rotationRadians =
      sourceCoordinateSpace === "aurora-z-up"
        ? -record.rotationRadians
        : record.rotationRadians;
    right.applyAxisAngle(localZ, rotationRadians);
    up.applyAxisAngle(localZ, rotationRadians);
  }
  return {
    mode: "local_z_vertical_billboard",
    source: orientation
      ? "aurora-render-mode-local-z-emitter-local-xy-plane"
      : "aurora-render-mode-local-z-identity-local-xy-plane",
    right,
    up,
    heightScale: 1,
    reverseWinding: sourceCoordinateSpace === "aurora-z-up"
  };
}

function resolveParticleOrientationBasis(
  record: AuroraParticleDrawRecordLike,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up"
): AuroraVfxCanonicalParticleBasis {
  const orientation = record.particleOrientation;
  if (!orientation) {
    return {
      ...resolveWorldZVerticalParticleBasis(record, sourceCoordinateSpace),
      mode: "particle_orientation_aligned",
      source: "aurora-render-mode-particle-orientation-unavailable-world-z-fallback",
      heightScale: 1
    };
  }
  const quaternion = canonicalSourceOrientationToThreeQuaternion(orientation, sourceCoordinateSpace);
  return {
    mode: "particle_orientation_aligned",
    source: "aurora-render-mode-particle-orientation-slot",
    right: new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize(),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize(),
    heightScale: 1,
    reverseWinding: sourceCoordinateSpace === "aurora-z-up"
  };
}

function resolveMotionBlurParticleBasis(
  record: AuroraParticleDrawRecordLike,
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up" = "three-y-up",
  cameraBillboardBasis?: AuroraVfxCanonicalCameraBillboardBasis
): AuroraVfxCanonicalParticleBasis {
  if (!record.previousPosition) {
    return {
      ...resolveWorldZVerticalParticleBasis(record, sourceCoordinateSpace),
      mode: "motion_blur_velocity_aligned",
      source: "aurora-motion-blur-previous-position-unavailable",
      heightScale: 1
    };
  }
  const segment = convertCanonicalSourceVector(record.position, sourceCoordinateSpace).sub(
    convertCanonicalSourceVector(record.previousPosition, sourceCoordinateSpace)
  );
  const cameraRight = (cameraBillboardBasis?.right ?? new THREE.Vector3(1, 0, 0))
    .clone()
    .normalize();
  const cameraUp = (cameraBillboardBasis?.up ?? new THREE.Vector3(0, 1, 0))
    .clone()
    .normalize();
  const rightProjection = segment.dot(cameraRight);
  const upProjection = segment.dot(cameraUp);
  const segmentLength = segment.length();
  if (segmentLength <= 1e-10) {
    return {
      mode: "motion_blur_velocity_aligned",
      source: "aurora-motion-blur-degenerate-segment",
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      heightScale: 1
    };
  }
  // FUN_00a2e250 projects the segment onto the two camera vectors, then
  // scales both projections by the reciprocal length of the full 3D segment.
  const inverseSegmentLength = 1 / segmentLength;
  const right = cameraRight
    .clone()
    .multiplyScalar(upProjection * inverseSegmentLength)
    .addScaledVector(cameraUp, -rightProjection * inverseSegmentLength);
  const up = cameraRight
    .clone()
    .multiplyScalar(rightProjection * inverseSegmentLength)
    .addScaledVector(cameraUp, upProjection * inverseSegmentLength);
  return {
    mode: "motion_blur_velocity_aligned",
    source: "aurora-motion-blur-previous-position-segment",
    right,
    up,
    heightScale: 1,
    reverseWinding: cameraBillboardBasis?.reverseWinding
  };
}

function buildCanonicalTexturedQuadGeometry(
  drawRecords: AuroraParticleDrawRecordLike[],
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up" = "three-y-up",
  cameraBillboardBasis?: AuroraVfxCanonicalCameraBillboardBasis,
  radianceScale = 1
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const alphas: number[] = [];
  const sizes: number[] = [];
  const frameIndices: number[] = [];
  const drawRecordIndices: number[] = [];
  const basisModes: AuroraVfxCanonicalRenderModeBasisMode[] = [];
  const basisSources: string[] = [];
  let nativeMotionBlurParticleCount = 0;
  const nativeMotionBlurTrailingAlphaFactors: number[] = [];

  const linkedSegmentMode =
    drawRecords.length > 0 && drawRecords.every((record) => record.lane === "linked_textured_quad");
  const recordsForGeometry = linkedSegmentMode
    ? [...drawRecords].sort((left, right) => left.particleIndex - right.particleIndex)
    : drawRecords;
  const linkedSegmentCount = linkedSegmentMode
    ? recordsForGeometry.filter((record) => record.linkedNextPosition).length
    : 0;

  const appendVertex = (
    record: AuroraParticleDrawRecordLike,
    drawRecordIndex: number,
    position: [number, number, number],
    uv: readonly [number, number],
    alpha = record.alpha
  ) => {
    positions.push(position[0], position[1], position[2]);
    uvs.push(uv[0], uv[1]);
    colors.push(
      normalizeAuroraPackedParticleVertexChannel(record.color.r) * radianceScale,
      normalizeAuroraPackedParticleVertexChannel(record.color.g) * radianceScale,
      normalizeAuroraPackedParticleVertexChannel(record.color.b) * radianceScale
    );
    alphas.push(normalizeAuroraPackedParticleVertexChannel(alpha));
    sizes.push(record.size.x, record.size.y);
    frameIndices.push(record.atlasUv.frameIndex);
    drawRecordIndices.push(drawRecordIndex);
  };

  if (linkedSegmentMode) {
    for (const start of recordsForGeometry) {
      if (!start.linkedNextPosition) continue;
      const startPosition = convertCanonicalSourceVector(start.position, sourceCoordinateSpace);
      const endPosition = convertCanonicalSourceVector(
        start.linkedNextPosition,
        sourceCoordinateSpace
      );
      const segment = endPosition.clone().sub(startPosition);
      const cameraRight = (cameraBillboardBasis?.right ?? new THREE.Vector3(1, 0, 0))
        .clone()
        .normalize();
      const cameraUp = (cameraBillboardBasis?.up ?? new THREE.Vector3(0, 1, 0))
        .clone()
        .normalize();
      const rightProjection = segment.dot(cameraRight);
      const upProjection = segment.dot(cameraUp);
      const segmentLength = segment.length();
      let transverse: THREE.Vector3;
      let longitudinal: THREE.Vector3;
      if (segmentLength <= 1e-10) {
        transverse = new THREE.Vector3();
        longitudinal = new THREE.Vector3();
      } else {
        const inverseSegmentLength = 1 / segmentLength;
        transverse = cameraRight
          .clone()
          .multiplyScalar(upProjection * inverseSegmentLength)
          .addScaledVector(cameraUp, -rightProjection * inverseSegmentLength);
        longitudinal = cameraRight
          .clone()
          .multiplyScalar(rightProjection * inverseSegmentLength)
          .addScaledVector(cameraUp, upProjection * inverseSegmentLength);
      }
      const transverseOffset = transverse.multiplyScalar(Math.max(0, start.size.x));
      const longitudinalOffset = longitudinal.multiplyScalar(Math.max(0, start.size.y) * 0.25);
      const positiveStart = startPosition
        .clone()
        .add(transverseOffset)
        .sub(longitudinalOffset);
      const negativeStart = startPosition
        .clone()
        .sub(transverseOffset)
        .sub(longitudinalOffset);
      const positiveEnd = endPosition
        .clone()
        .add(transverseOffset)
        .add(longitudinalOffset);
      const negativeEnd = endPosition
        .clone()
        .sub(transverseOffset)
        .add(longitudinalOffset);
      const atlas = start.atlasUv;
      const drawRecordIndex = drawRecords.indexOf(start);
      basisModes.push("linked_segment_strip");
      basisSources.push("aurora-linked-camera-plane-transverse-and-longitudinal-basis");
      // Points and camera bases are already in Three space. Reversing again for
      // Aurora Z-up would make the native FrontSide strip back-facing.
      const vertices = [
        [negativeStart, atlas.u0, atlas.v0],
        [positiveStart, atlas.u1, atlas.v0],
        [negativeEnd, atlas.u0, atlas.v1],
        [negativeEnd, atlas.u0, atlas.v1],
        [positiveStart, atlas.u1, atlas.v0],
        [positiveEnd, atlas.u1, atlas.v1]
      ] as const;
      vertices.forEach(([position, u, v]) => {
        appendVertex(
          start,
          drawRecordIndex,
          [position.x, position.y, position.z],
          [u, v]
        );
      });
    }
  }

  if (!linkedSegmentMode) {
    recordsForGeometry.forEach((record, drawRecordIndex) => {
    const renderMode = normalizeRenderModeToken(record.renderMode?.enum || record.renderMode?.rawToken);
    if (renderMode === "motion_blur" && record.previousPosition) {
      const previousPosition = convertCanonicalSourceVector(
        record.previousPosition,
        sourceCoordinateSpace
      );
      const currentPosition = convertCanonicalSourceVector(
        record.position,
        sourceCoordinateSpace
      );
      const basis = resolveCanonicalParticleBasis(
        record,
        sourceCoordinateSpace,
        cameraBillboardBasis
      );
      const segment = currentPosition.clone().sub(previousPosition);
      const segmentLength = segment.length();
      const width = Math.max(0, record.size.x);
      const sideOffset = basis.right.clone().multiplyScalar(width);
      const longitudinalOffset = basis.up
        .clone()
        .multiplyScalar(Math.max(0, record.size.y) * 0.25);
      const positiveCurrent = currentPosition.clone().add(sideOffset).add(longitudinalOffset);
      const negativeCurrent = currentPosition.clone().sub(sideOffset).add(longitudinalOffset);
      const positivePrevious = previousPosition.clone().add(sideOffset).sub(longitudinalOffset);
      const negativePrevious = previousPosition.clone().sub(sideOffset).sub(longitudinalOffset);
      const trailingAlphaFactor = segmentLength > 1e-10
        ? Math.min(width / segmentLength, 1)
        : 0;
      const trailingAlpha = record.alpha * trailingAlphaFactor;
      const atlas = record.atlasUv;
      nativeMotionBlurParticleCount += 1;
      nativeMotionBlurTrailingAlphaFactors.push(trailingAlphaFactor);
      basisModes.push(basis.mode);
      basisSources.push(basis.source);
      const sourceWindingVertices = [
        [positiveCurrent, atlas.u1, atlas.v1, record.alpha],
        [negativeCurrent, atlas.u0, atlas.v1, record.alpha],
        [positivePrevious, atlas.u1, atlas.v0, trailingAlpha],
        [positivePrevious, atlas.u1, atlas.v0, trailingAlpha],
        [negativeCurrent, atlas.u0, atlas.v1, record.alpha],
        [negativePrevious, atlas.u0, atlas.v0, trailingAlpha]
      ] as const;
      const reflectedParentVertices = [
        sourceWindingVertices[0],
        sourceWindingVertices[2],
        sourceWindingVertices[1],
        sourceWindingVertices[3],
        sourceWindingVertices[5],
        sourceWindingVertices[4]
      ] as const;
      const vertices = basis.reverseWinding
        ? reflectedParentVertices
        : sourceWindingVertices;
      vertices.forEach(([position, u, v, alpha]) => {
        appendVertex(
          record,
          drawRecordIndex,
          [position.x, position.y, position.z],
          [u, v],
          alpha
        );
      });
      return;
    }
    const halfWidth = Math.max(0, record.size.x) * 0.5;
    const basis = resolveCanonicalParticleBasis(
      record,
      sourceCoordinateSpace,
      cameraBillboardBasis
    );
    const halfHeight = Math.max(0, record.size.y) * basis.heightScale * 0.5;
    basisModes.push(basis.mode);
    basisSources.push(basis.source);
    const resolveLocalPoint = (x: number, y: number): [number, number, number] => {
      const position = convertCanonicalSourceVector(record.position, sourceCoordinateSpace)
        .addScaledVector(basis.right, x)
        .addScaledVector(basis.up, y);
      return [position.x, position.y, position.z];
    };
    const atlas = record.atlasUv;
    const localVertices: Array<readonly [number, number, number, number]> = basis.reverseWinding
      ? [
          [-halfWidth, -halfHeight, atlas.u0, atlas.v0],
          [-halfWidth, halfHeight, atlas.u0, atlas.v1],
          [halfWidth, -halfHeight, atlas.u1, atlas.v0],
          [-halfWidth, halfHeight, atlas.u0, atlas.v1],
          [halfWidth, halfHeight, atlas.u1, atlas.v1],
          [halfWidth, -halfHeight, atlas.u1, atlas.v0]
        ]
      : [
          [-halfWidth, -halfHeight, atlas.u0, atlas.v0],
          [halfWidth, -halfHeight, atlas.u1, atlas.v0],
          [-halfWidth, halfHeight, atlas.u0, atlas.v1],
          [-halfWidth, halfHeight, atlas.u0, atlas.v1],
          [halfWidth, -halfHeight, atlas.u1, atlas.v0],
          [halfWidth, halfHeight, atlas.u1, atlas.v1]
        ];
    localVertices.forEach(([x, y, u, v]) => {
      appendVertex(record, drawRecordIndex, resolveLocalPoint(x, y), [u, v]);
    });
  });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
  geometry.setAttribute("auroraAlpha", new THREE.BufferAttribute(new Float32Array(alphas), 1));
  geometry.setAttribute("auroraParticleSize", new THREE.BufferAttribute(new Float32Array(sizes), 2));
  geometry.setAttribute(
    "auroraAtlasFrameIndex",
    new THREE.BufferAttribute(new Float32Array(frameIndices), 1)
  );
  geometry.setAttribute(
    "auroraDrawRecordIndex",
    new THREE.BufferAttribute(new Float32Array(drawRecordIndices), 1)
  );
  const positionAttribute = geometry.getAttribute("position");
  const colorAttribute = geometry.getAttribute("color");
  const alphaAttribute = geometry.getAttribute("auroraAlpha");
  const particleSizeAttribute = geometry.getAttribute("auroraParticleSize");
  const atlasFrameAttribute = geometry.getAttribute("auroraAtlasFrameIndex");
  const drawRecordIndexAttribute = geometry.getAttribute("auroraDrawRecordIndex");
  const uvAttribute = geometry.getAttribute("uv");
  const positionXRange = readAttributeComponentRange(positionAttribute, 0);
  const positionYRange = readAttributeComponentRange(positionAttribute, 1);
  const positionZRange = readAttributeComponentRange(positionAttribute, 2);
  const colorRRange = readAttributeComponentRange(colorAttribute, 0);
  const colorGRange = readAttributeComponentRange(colorAttribute, 1);
  const colorBRange = readAttributeComponentRange(colorAttribute, 2);
  const alphaRange = readAttributeComponentRange(alphaAttribute, 0);
  const particleSizeXRange = readAttributeComponentRange(particleSizeAttribute, 0);
  const particleSizeYRange = readAttributeComponentRange(particleSizeAttribute, 1);
  const uvURange = readAttributeComponentRange(uvAttribute, 0);
  const uvVRange = readAttributeComponentRange(uvAttribute, 1);
  const uniqueAtlasFrameCount = new Set(frameIndices).size;
  const uniqueDrawRecordIndexCount = new Set(drawRecordIndices).size;
  const uniqueBasisModes = [...new Set(basisModes)];
  const uniqueBasisSources = [...new Set(basisSources)];
  const drawRecordIndexBucketStats = readDrawRecordIndexBucketStats(drawRecordIndices);
  const positionBucketStats = readPerDrawRecordUniqueTupleStats(drawRecordIndices, positions, 3);
  const colorBucketStats = readPerDrawRecordUniqueTupleStats(drawRecordIndices, colors, 3);
  const alphaBucketStats = readPerDrawRecordUniqueValueStats(drawRecordIndices, alphas);
  const particleSizeBucketStats = readPerDrawRecordUniqueTupleStats(
    drawRecordIndices,
    sizes,
    2
  );
  const atlasFrameBucketStats = readPerDrawRecordUniqueValueStats(drawRecordIndices, frameIndices);
  const uvBucketStats = readPerDrawRecordUniqueTupleStats(drawRecordIndices, uvs, 2);
  geometry.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalTexturedQuadGeometry: true,
    auroraVfxCanonicalLinkedSegmentTopology: linkedSegmentMode,
    auroraVfxCanonicalLinkedSegmentCount: linkedSegmentCount,
    auroraVfxCanonicalLinkedSegmentSource: linkedSegmentMode
      ? "aurora-decomp-next-active-particle-position"
      : "not-linked-segment-topology",
    auroraVfxCanonicalLinkedSegmentNativeGeometryProfile:
      "aurora-mode-3-camera-plane-width-x2-y-quarter-outward-cap",
    auroraVfxCanonicalLinkedSegmentBasisNormalization:
      "aurora-full-3d-segment-reciprocal",
    auroraVfxCanonicalLinkedSegmentWinding: linkedSegmentMode
      ? "three-camera-front-facing-after-source-conversion"
      : "not-linked-segment-topology",
    auroraVfxCanonicalNonIndexedDrawArrays: true,
    auroraVfxCanonicalIndexedDrawArrays: false,
    auroraVfxCanonicalDrawModeArgument: 3,
    auroraVfxCanonicalDrawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
    auroraVfxCanonicalVerticesPerParticle: 6,
    auroraVfxCanonicalVertexCount: positions.length / 3,
    auroraVfxCanonicalParticleCount: drawRecords.length,
    auroraVfxCanonicalRenderModeGeometrySource: "aurora-render-contract-render-mode",
    auroraVfxCanonicalRenderModeBasisModes: uniqueBasisModes,
    auroraVfxCanonicalRenderModeBasisSources: uniqueBasisSources,
    auroraVfxCanonicalRenderModeBasisModeCount: uniqueBasisModes.length,
    auroraVfxCanonicalRenderModeUsesVelocityBasis: false,
    auroraVfxCanonicalRenderModeUsesParticleOrientation:
      uniqueBasisModes.includes("particle_orientation_aligned"),
    auroraVfxCanonicalRenderModeUsesMotionBlurPreviousPosition:
      uniqueBasisSources.includes("aurora-motion-blur-previous-position-segment"),
    auroraVfxCanonicalMotionBlurNativeGeometryProfile:
      "aurora-mode-6-camera-plane-width-x2-y-quarter-cap-trailing-alpha",
    auroraVfxCanonicalMotionBlurBasisNormalization:
      "aurora-full-3d-segment-reciprocal",
    auroraVfxCanonicalMotionBlurTrailingAlphaLengthSource:
      "aurora-full-3d-segment-length",
    auroraVfxCanonicalMotionBlurNativeParticleCount: nativeMotionBlurParticleCount,
    auroraVfxCanonicalMotionBlurTrailingAlphaFactorMin:
      nativeMotionBlurTrailingAlphaFactors.length > 0
        ? Math.min(...nativeMotionBlurTrailingAlphaFactors)
        : 0,
    auroraVfxCanonicalMotionBlurTrailingAlphaFactorMax:
      nativeMotionBlurTrailingAlphaFactors.length > 0
        ? Math.max(...nativeMotionBlurTrailingAlphaFactors)
        : 0,
    auroraVfxCanonicalAtlasUvSource: "aurora-particle-draw-record",
    auroraVfxCanonicalPackedRgbaVertexBoundary: true,
    auroraVfxCanonicalPackedRgbaVertexScale: AURORA_PARTICLE_VERTEX_CHANNEL_SCALE,
    auroraVfxCanonicalPackedRgbaVertexRounding: "truncate-toward-zero-low-byte",
    auroraVfxCanonicalPackedRgbaVertexNormalization: "packed-byte-divided-by-255",
    auroraVfxCanonicalPackedRgbaVertexSource:
      "nwtoolset.exe FUN_00a2e250 and FUN_00b908cc",
    auroraVfxCanonicalPositionAttributeCount: positionAttribute.count,
    auroraVfxCanonicalPositionAttributeItemSize: positionAttribute.itemSize,
    auroraVfxCanonicalPositionAttributeXMin: positionXRange.min,
    auroraVfxCanonicalPositionAttributeXMax: positionXRange.max,
    auroraVfxCanonicalPositionAttributeYMin: positionYRange.min,
    auroraVfxCanonicalPositionAttributeYMax: positionYRange.max,
    auroraVfxCanonicalPositionAttributeZMin: positionZRange.min,
    auroraVfxCanonicalPositionAttributeZMax: positionZRange.max,
    auroraVfxCanonicalPositionAttributeMinUniqueValuesPerRecord:
      positionBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalPositionAttributeMaxUniqueValuesPerRecord:
      positionBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalColorAttributeCount: colorAttribute.count,
    auroraVfxCanonicalColorAttributeItemSize: colorAttribute.itemSize,
    auroraVfxCanonicalColorAttributeUniqueCount: countUniqueAttributeTuples(colorAttribute),
    auroraVfxCanonicalColorAttributeRMin: colorRRange.min,
    auroraVfxCanonicalColorAttributeRMax: colorRRange.max,
    auroraVfxCanonicalColorAttributeGMin: colorGRange.min,
    auroraVfxCanonicalColorAttributeGMax: colorGRange.max,
    auroraVfxCanonicalColorAttributeBMin: colorBRange.min,
    auroraVfxCanonicalColorAttributeBMax: colorBRange.max,
    auroraVfxCanonicalColorAttributeMinUniqueValuesPerRecord:
      colorBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalColorAttributeMaxUniqueValuesPerRecord:
      colorBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalAlphaAttributeCount: alphaAttribute.count,
    auroraVfxCanonicalAlphaAttributeItemSize: alphaAttribute.itemSize,
    auroraVfxCanonicalAlphaAttributeMin: alphaRange.min,
    auroraVfxCanonicalAlphaAttributeMax: alphaRange.max,
    auroraVfxCanonicalAlphaAttributeMinUniqueValuesPerRecord:
      alphaBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalAlphaAttributeMaxUniqueValuesPerRecord:
      alphaBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalParticleSizeAttributeCount: particleSizeAttribute.count,
    auroraVfxCanonicalParticleSizeAttributeItemSize: particleSizeAttribute.itemSize,
    auroraVfxCanonicalParticleSizeAttributeXMin: particleSizeXRange.min,
    auroraVfxCanonicalParticleSizeAttributeXMax: particleSizeXRange.max,
    auroraVfxCanonicalParticleSizeAttributeYMin: particleSizeYRange.min,
    auroraVfxCanonicalParticleSizeAttributeYMax: particleSizeYRange.max,
    auroraVfxCanonicalParticleSizeAttributeMinUniqueValuesPerRecord:
      particleSizeBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalParticleSizeAttributeMaxUniqueValuesPerRecord:
      particleSizeBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalAtlasFrameAttributeCount: atlasFrameAttribute.count,
    auroraVfxCanonicalAtlasFrameAttributeItemSize: atlasFrameAttribute.itemSize,
    auroraVfxCanonicalAtlasFrameAttributeSource: "auroraAtlasFrameIndex-buffer-attribute",
    auroraVfxCanonicalAtlasFrameAttributeUniqueCount: uniqueAtlasFrameCount,
    auroraVfxCanonicalAtlasFrameAttributeMin:
      frameIndices.length > 0 ? Math.min(...frameIndices) : 0,
    auroraVfxCanonicalAtlasFrameAttributeMax:
      frameIndices.length > 0 ? Math.max(...frameIndices) : 0,
    auroraVfxCanonicalAtlasFrameAttributeMinUniqueValuesPerRecord:
      atlasFrameBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalAtlasFrameAttributeMaxUniqueValuesPerRecord:
      atlasFrameBucketStats.maxUniqueValuesPerRecord,
    auroraVfxCanonicalDrawRecordIndexAttributeCount: drawRecordIndexAttribute.count,
    auroraVfxCanonicalDrawRecordIndexAttributeItemSize: drawRecordIndexAttribute.itemSize,
    auroraVfxCanonicalDrawRecordIndexAttributeSource: "auroraDrawRecordIndex-buffer-attribute",
    auroraVfxCanonicalDrawRecordIndexAttributeUniqueCount: uniqueDrawRecordIndexCount,
    auroraVfxCanonicalDrawRecordIndexAttributeMin:
      drawRecordIndices.length > 0 ? Math.min(...drawRecordIndices) : 0,
    auroraVfxCanonicalDrawRecordIndexAttributeMax:
      drawRecordIndices.length > 0 ? Math.max(...drawRecordIndices) : 0,
    auroraVfxCanonicalDrawRecordIndexAttributeMinVerticesPerRecord:
      drawRecordIndexBucketStats.minVerticesPerRecord,
    auroraVfxCanonicalDrawRecordIndexAttributeMaxVerticesPerRecord:
      drawRecordIndexBucketStats.maxVerticesPerRecord,
    auroraVfxCanonicalUvAttributeCount: uvAttribute.count,
    auroraVfxCanonicalUvAttributeItemSize: uvAttribute.itemSize,
    auroraVfxCanonicalUvAttributeUMin: uvURange.min,
    auroraVfxCanonicalUvAttributeUMax: uvURange.max,
    auroraVfxCanonicalUvAttributeVMin: uvVRange.min,
    auroraVfxCanonicalUvAttributeVMax: uvVRange.max,
    auroraVfxCanonicalUvAttributeMinUniqueValuesPerRecord:
      uvBucketStats.minUniqueValuesPerRecord,
    auroraVfxCanonicalUvAttributeMaxUniqueValuesPerRecord:
      uvBucketStats.maxUniqueValuesPerRecord
  };
  return geometry;
}

const AURORA_PARTICLE_VERTEX_CHANNEL_SCALE = Math.fround(255.99);

function normalizeAuroraPackedParticleVertexChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const packedByte = Math.trunc(value * AURORA_PARTICLE_VERTEX_CHANNEL_SCALE) & 0xff;
  return packedByte / 255;
}

function readDrawRecordIndexBucketStats(drawRecordIndices: number[]): {
  minVerticesPerRecord: number;
  maxVerticesPerRecord: number;
} {
  if (drawRecordIndices.length === 0) {
    return { minVerticesPerRecord: 0, maxVerticesPerRecord: 0 };
  }

  const counts = new Map<number, number>();
  drawRecordIndices.forEach((drawRecordIndex) => {
    counts.set(drawRecordIndex, (counts.get(drawRecordIndex) ?? 0) + 1);
  });
  const verticesPerRecord = [...counts.values()];
  return {
    minVerticesPerRecord: Math.min(...verticesPerRecord),
    maxVerticesPerRecord: Math.max(...verticesPerRecord)
  };
}

function readPerDrawRecordUniqueValueStats(
  drawRecordIndices: number[],
  values: number[]
): {
  minUniqueValuesPerRecord: number;
  maxUniqueValuesPerRecord: number;
} {
  if (drawRecordIndices.length === 0 || values.length === 0) {
    return { minUniqueValuesPerRecord: 0, maxUniqueValuesPerRecord: 0 };
  }

  const valuesByRecord = new Map<number, Set<string>>();
  drawRecordIndices.forEach((drawRecordIndex, vertexIndex) => {
    const value = values[vertexIndex];
    if (value === undefined) return;
    const bucket = valuesByRecord.get(drawRecordIndex) ?? new Set<string>();
    bucket.add(value.toFixed(6));
    valuesByRecord.set(drawRecordIndex, bucket);
  });
  const uniqueValuesPerRecord = [...valuesByRecord.values()].map((bucket) => bucket.size);
  return {
    minUniqueValuesPerRecord: Math.min(...uniqueValuesPerRecord),
    maxUniqueValuesPerRecord: Math.max(...uniqueValuesPerRecord)
  };
}

function readPerDrawRecordUniqueTupleStats(
  drawRecordIndices: number[],
  values: number[],
  itemSize: number
): {
  minUniqueValuesPerRecord: number;
  maxUniqueValuesPerRecord: number;
} {
  if (drawRecordIndices.length === 0 || values.length === 0 || itemSize <= 0) {
    return { minUniqueValuesPerRecord: 0, maxUniqueValuesPerRecord: 0 };
  }

  const valuesByRecord = new Map<number, Set<string>>();
  drawRecordIndices.forEach((drawRecordIndex, vertexIndex) => {
    const firstComponent = vertexIndex * itemSize;
    const tuple = values
      .slice(firstComponent, firstComponent + itemSize)
      .map((value) => value.toFixed(6))
      .join(":");
    const bucket = valuesByRecord.get(drawRecordIndex) ?? new Set<string>();
    bucket.add(tuple);
    valuesByRecord.set(drawRecordIndex, bucket);
  });

  const uniqueValuesPerRecord = [...valuesByRecord.values()].map((bucket) => bucket.size);
  return {
    minUniqueValuesPerRecord: Math.min(...uniqueValuesPerRecord),
    maxUniqueValuesPerRecord: Math.max(...uniqueValuesPerRecord)
  };
}

function countUniqueAttributeTuples(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): number {
  const unique = new Set<string>();
  for (let index = 0; index < attribute.count; index += 1) {
    const tuple = [];
    for (let component = 0; component < attribute.itemSize; component += 1) {
      tuple.push(readAttributeComponent(attribute, index, component).toFixed(6));
    }
    unique.add(tuple.join(":"));
  }
  return unique.size;
}

function readAttributeComponentRange(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  component: number
): { min: number; max: number } {
  if (attribute.count === 0 || component >= attribute.itemSize) {
    return { min: 0, max: 0 };
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < attribute.count; index += 1) {
    const value = readAttributeComponent(attribute, index, component);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function readAttributeComponent(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: number,
  component: number
): number {
  if (component === 0) return attribute.getX(index);
  if (component === 1) return attribute.getY(index);
  if (component === 2) return attribute.getZ(index);
  if (component === 3) return attribute.getW(index);
  return 0;
}

function applyRenderContractMaterialAdapterState(
  material: THREE.MeshBasicMaterial,
  contract: AuroraVfxRuntimeRenderContractRecord,
  textureReference: string | null
): AuroraVfxRenderedMaterialState {
  const blendMode = contract.blendMode.enum;
  const alphaDiscardLane = contract.renderState?.alphaDiscardLane;
  const alphaDiscardValue = readFiniteNumber(contract.renderState?.alphaDiscardValue, 0);
  material.side = resolveCanonicalParticleMaterialSide(contract.renderState);
  material.transparent = blendMode !== "punch_through";
  material.depthWrite = blendMode === "punch_through";
  material.alphaTest = blendMode === "punch_through" ? alphaDiscardValue : 0;
  const alphaTestSource =
    alphaDiscardLane === "punch_through_runtime_uniform_0_2" && alphaDiscardValue === 0.2
      ? "nwtoolset-1.5.0.5-fAlphaDiscardValue-state1-disassembly"
      : blendMode === "punch_through"
        ? "canonical-draw-refused-contract-lane-missing"
        : "aurora-non-punch-discard-compiled-out-variant";
  material.blending = blendMode === "normal" || blendMode === "punch_through"
    ? THREE.NormalBlending
    : THREE.CustomBlending;
  if (material.blending === THREE.CustomBlending) {
    const exactFactors = contract.blendMode.exactGlBlendFactors;
    material.blendSrc = THREE.SrcAlphaFactor;
    material.blendDst = resolveCanonicalBlendDestinationFactor(
      exactFactors?.destinationFactor
    );
    material.blendEquation = THREE.AddEquation;
  }
  material.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxMaterialAdapterSource: "aurora-render-contract",
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxSpriteMaterialParityProof: false,
    auroraVfxShaderMaterialParityProof: false,
    auroraVfxCanonicalRenderMode: contract.renderMode.enum ?? "unknown",
    auroraVfxCanonicalRenderModeRawToken: contract.renderMode.rawToken ?? "",
    auroraVfxCanonicalBlendMode: contract.blendMode.enum ?? "unknown",
    auroraVfxCanonicalBlendModeRawToken: contract.blendMode.rawToken ?? "",
    auroraVfxCanonicalBlendModeNumber: contract.blendMode.modeNumber ?? -1,
    auroraVfxCanonicalBlendFactorStatus:
      contract.blendMode.exactGlBlendFactors?.status ?? "missing",
    auroraVfxCanonicalBlendSourceFactor:
      contract.blendMode.exactGlBlendFactors?.sourceFactor ?? "",
    auroraVfxCanonicalBlendDestinationFactor:
      contract.blendMode.exactGlBlendFactors?.destinationFactor ?? "",
    auroraVfxCanonicalBlendTableIndices:
      contract.blendMode.exactGlBlendFactors?.blendTableIndices ?? [],
    auroraVfxCanonicalMtrMaterialReference:
      readString(contract.materialState?.materialRef) ?? "",
    auroraVfxCanonicalMtrMaterialState: contract.materialState ?? null,
    auroraVfxCanonicalRenderState: contract.renderState ?? null,
    auroraVfxCanonicalMaterialMapBound: material.map !== null,
    auroraVfxCanonicalMaterialMapReference: material.map ? textureReference ?? "" : "",
    auroraVfxCanonicalMaterialDepthTest: material.depthTest,
    auroraVfxCanonicalMaterialAlphaTestSource: alphaTestSource,
    auroraVfxCanonicalMaterialOpacity: material.opacity,
    auroraVfxCanonicalMaterialColorHex: `#${material.color.getHexString()}`,
    auroraVfxCanonicalMaterialVertexColors: material.vertexColors,
    auroraVfxCanonicalMaterialSide: readThreeSideName(material.side)
  };
  return {
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    depthTest: material.depthTest,
    alphaTest: material.alphaTest,
    alphaTestSource,
    opacity: material.opacity,
    colorHex: `#${material.color.getHexString()}`,
    blending: material.blending === THREE.NormalBlending ? "normal" : "custom",
    blendSrc: readThreeBlendFactorName(material.blendSrc),
    blendDst: readThreeBlendFactorName(material.blendDst),
    blendEquation: readThreeBlendEquationName(material.blendEquation),
    mapBound: material.map !== null,
    mapReference: material.map ? textureReference ?? "" : "",
    vertexColors: material.vertexColors,
    side: readThreeSideName(material.side),
    status:
      blendMode === "punch_through"
        ? "applied-punch-through-alpha-discard-0.2"
        : "applied"
  };
}

function hasConfirmedPunchThroughAlphaDiscard(
  contract: AuroraVfxRuntimeRenderContractRecord
): boolean {
  return (
    contract.renderState?.alphaDiscardLane === "punch_through_runtime_uniform_0_2" &&
    contract.renderState.alphaDiscardValue === 0.2
  );
}

function requiresAuroraMtrFramebufferExecution(
  contract: AuroraVfxRuntimeRenderContractRecord
): boolean {
  const framebufferLane = isRecord(contract.renderState?.framebufferLane)
    ? contract.renderState.framebufferLane
    : undefined;
  const runtimeLane = readFiniteNumber(framebufferLane?.runtimeLane, 0);
  return runtimeLane === 5 || runtimeLane === 6;
}

function requiresAuroraMtrCustomShaderExecution(
  contract: AuroraVfxRuntimeRenderContractRecord
): boolean {
  const materialState = contract.materialState;
  return (
    readString(materialState?.customShaderVS) !== "" ||
    readString(materialState?.customShaderFS) !== "" ||
    readString(materialState?.customShaderGS) !== "" ||
    isRecord(materialState?.customShaderProgram)
  );
}

function resolveAuroraRawGammaParticleLane(
  contract: AuroraVfxRuntimeRenderContractRecord
):
  | "aurora_raw_gamma_normal_before_retail_bloom"
  | "aurora_raw_gamma_additive_before_retail_bloom"
  | null {
  const sourceFactor = contract.blendMode.exactGlBlendFactors?.sourceFactor;
  const destinationFactor =
    contract.blendMode.exactGlBlendFactors?.destinationFactor;
  if (
    contract.blendMode.enum === "normal" ||
    (sourceFactor === "GL_SRC_ALPHA" &&
      destinationFactor === "GL_ONE_MINUS_SRC_ALPHA")
  ) {
    return "aurora_raw_gamma_normal_before_retail_bloom";
  }
  if (
    contract.blendMode.exactGlBlendFactors?.sourceFactor === "GL_SRC_ALPHA" &&
    contract.blendMode.exactGlBlendFactors.destinationFactor === "GL_ONE"
  ) {
    return "aurora_raw_gamma_additive_before_retail_bloom";
  }
  return null;
}

function resolveAuroraVfxAdditiveParticleRadianceCalibration(
  calibration: AuroraVfxCanonicalRenderOptions["additiveParticleRadianceCalibration"]
): { scale: number; sourceEvidence: string } | null {
  const sourceEvidence = calibration?.sourceEvidence.trim() ?? "";
  const scale = calibration?.scale ?? 1;
  if (!sourceEvidence || !Number.isFinite(scale) || scale <= 0) return null;
  return { scale, sourceEvidence };
}

function convertAuroraPackedGammaParticleColorToLinearScene(
  record: AuroraParticleDrawRecordLike
): AuroraParticleDrawRecordLike {
  const linearColor = new THREE.Color(
    record.color.r,
    record.color.g,
    record.color.b
  ).convertSRGBToLinear();
  return {
    ...record,
    color: {
      r: linearColor.r,
      g: linearColor.g,
      b: linearColor.b
    }
  };
}

function acquireAuroraRawGammaParticleTexture(source: THREE.Texture): THREE.Texture {
  const cached = auroraRawGammaParticleTextureCache.get(source);
  if (cached) {
    cached.referenceCount += 1;
    return cached.texture;
  }
  const texture = source.clone();
  texture.name = source.name
    ? `${source.name}:aurora-raw-gamma-particle`
    : "aurora-raw-gamma-particle";
  const inheritedTransform = {
    repeat: source.repeat.toArray(),
    offset: source.offset.toArray(),
    center: source.center.toArray(),
    rotation: source.rotation
  };
  // Canonical particle geometry already carries Aurora's evaluated atlas cell
  // in each vertex UV. A shared model texture can concurrently carry a TXI
  // proceduretype-cycle repeat/offset; inheriting that transform here crops the
  // selected atlas cell a second time and leaves only a thin bright sliver.
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  texture.center.set(0, 0);
  texture.rotation = 0;
  texture.matrixAutoUpdate = true;
  texture.updateMatrix();
  texture.userData = {
    ...texture.userData,
    auroraVfxCanonicalParticleAtlasTransformOwnership:
      "per-particle-geometry-uv",
    auroraVfxCanonicalParticleInheritedTextureTransform: inheritedTransform
  };
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  auroraRawGammaParticleTextureCache.set(source, {
    texture,
    referenceCount: 1
  });
  return texture;
}

function installAuroraRawGammaParticleTextureRelease(
  material: THREE.Material,
  source: THREE.Texture
): void {
  const release = () => {
    material.removeEventListener("dispose", release);
    const cached = auroraRawGammaParticleTextureCache.get(source);
    if (!cached) return;
    cached.referenceCount -= 1;
    if (cached.referenceCount > 0) return;
    cached.texture.dispose();
    auroraRawGammaParticleTextureCache.delete(source);
  };
  material.addEventListener("dispose", release);
}

function bindAuroraMtrReplacementTextures(
  material: THREE.Material,
  materialState: Record<string, unknown> | undefined,
  texturesByReference: ReadonlyMap<string, THREE.Texture> | undefined
): void {
  const bumpReference = readString(materialState?.bumpmaptexture);
  const environmentReference = readString(materialState?.envmaptexture);
  const bumpyShinyReference = readString(materialState?.bumpyshinytexture);
  const bumpReplacementReference = readString(materialState?.bumpreplacementtexture);
  const bumpTexture = resolveTexture(texturesByReference, bumpReference || null);
  const environmentTexture = resolveTexture(
    texturesByReference,
    environmentReference || null
  );
  const textureMaterial = material as THREE.Material & {
    bumpMap?: THREE.Texture | null;
    envMap?: THREE.Texture | null;
  };
  if (bumpTexture) {
    textureMaterial.bumpMap = bumpTexture;
  }
  if (environmentTexture) {
    textureMaterial.envMap = environmentTexture;
  }
  material.userData = {
    ...material.userData,
    auroraMaterialBumpMapTextureReference: bumpReference || undefined,
    auroraMaterialEnvironmentMapTextureReference: environmentReference || undefined,
    auroraMaterialBumpMapTextureBound: Boolean(bumpTexture),
    auroraMaterialEnvironmentMapTextureBound: Boolean(environmentTexture),
    auroraMaterialBumpyShinyTextureBindingStatus: bumpyShinyReference
      ? "source-reference-preserved-binding-unverified"
      : undefined,
    auroraMaterialBumpReplacementTextureBindingStatus: bumpReplacementReference
      ? "source-reference-preserved-binding-unverified"
      : undefined
  };
  if (bumpTexture || environmentTexture) {
    material.needsUpdate = true;
  }
}

function resolveAuroraMtrTexturesBySlot(
  materialState: Record<string, unknown> | undefined,
  texturesByReference: ReadonlyMap<string, THREE.Texture> | undefined
): Map<number, THREE.Texture> {
  const texturesBySlot = new Map<number, THREE.Texture>();
  if (!Array.isArray(materialState?.textureSlots)) return texturesBySlot;
  for (const value of materialState.textureSlots) {
    if (!isRecord(value)) continue;
    const slot = value.slot;
    const reference = readString(value.reference);
    if (
      typeof slot !== "number" ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 15 ||
      !reference
    ) {
      continue;
    }
    const texture = resolveTexture(texturesByReference, reference);
    if (texture) texturesBySlot.set(slot, texture);
  }
  return texturesBySlot;
}

function resolveCanonicalParticleMaterialSide(
  renderState: Record<string, unknown> | undefined
): THREE.Side {
  return renderState?.twoSidedTextureLane === "two_sided_texture_cull_disabled"
    ? THREE.DoubleSide
    : THREE.FrontSide;
}

function resolveCanonicalBlendDestinationFactor(
  destinationFactor: string | undefined
): THREE.BlendingDstFactor {
  return destinationFactor === "GL_ONE_MINUS_SRC_ALPHA"
    ? THREE.OneMinusSrcAlphaFactor
    : THREE.OneFactor;
}

function installCanonicalParticleAlphaShader(
  material: THREE.MeshBasicMaterial,
  retailParticleState?: {
    softDepthState: AuroraVfxCanonicalParticleSoftDepthState;
    fogBranch: AuroraVfxCanonicalParticleFogBranch;
  }
): void {
  if (!retailParticleState) {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = replaceShaderAnchorExactlyOnce(
        shader.vertexShader,
        "void main() {",
        "attribute float auroraAlpha;\nvarying float vAuroraAlpha;\nvoid main() {\n  vAuroraAlpha = auroraAlpha;"
      );
      shader.fragmentShader = replaceShaderAnchorExactlyOnce(
        replaceShaderAnchorExactlyOnce(
          shader.fragmentShader,
          "void main() {",
          "varying float vAuroraAlpha;\nvoid main() {"
        ),
          "#include <map_fragment>",
          "#include <map_fragment>\n  diffuseColor.a *= clamp(vAuroraAlpha, 0.0, 1.0);"
      );
    };
    material.customProgramCacheKey = () => "aurora-vfx-canonical-particle-alpha/v1";
    return;
  }

  const binding: AuroraVfxCanonicalParticleShaderBinding = {
    softDepthState: retailParticleState.softDepthState,
    fogBranch: retailParticleState.fogBranch,
    uniforms: {
      auroraSceneDepthTexture: { value: null },
      auroraSceneDepthBound: { value: 0 },
      auroraParticlePixelSize: { value: new THREE.Vector2(1, 1) },
      auroraNearClip: { value: 0.1 },
      auroraFarClip: { value: 100 },
      auroraPerspectiveDepth: { value: 1 },
      auroraParticleSoftness: {
        value: retailParticleState.softDepthState.particleSoftness
      },
      auroraFogEnabled: { value: 0 },
      auroraFogStart: { value: 0 },
      auroraFogInvRange: { value: 0 },
      auroraFogColorGamma: { value: new THREE.Color(0, 0, 0) },
      auroraFogAdditive: {
        value:
          retailParticleState.fogBranch === "additive_alpha_attenuation"
            ? 1
            : 0
      }
    }
  };
  auroraCanonicalParticleShaderBindings.set(material, binding);
  material.fog = false;
  material.userData.auroraVfxCanonicalParticleShaderApplied = false;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, binding.uniforms);
    shader.vertexShader = replaceShaderAnchorExactlyOnce(
      replaceShaderAnchorExactlyOnce(
        shader.vertexShader,
        "void main() {",
        [
          "attribute float auroraAlpha;",
          "varying float vAuroraAlpha;",
          "varying highp float vAuroraParticleViewZ;",
          "void main() {",
          "  vAuroraAlpha = auroraAlpha;"
        ].join("\n")
      ),
      "#include <project_vertex>",
      [
        "#include <project_vertex>",
        "  vAuroraParticleViewZ = mvPosition.z;"
      ].join("\n")
    );
    shader.fragmentShader = replaceShaderAnchorExactlyOnce(
      replaceShaderAnchorExactlyOnce(
        replaceShaderAnchorExactlyOnce(
          shader.fragmentShader,
          "void main() {",
          [
            "uniform sampler2D auroraSceneDepthTexture;",
            "uniform int auroraSceneDepthBound;",
            "uniform vec2 auroraParticlePixelSize;",
            "uniform float auroraNearClip;",
            "uniform float auroraFarClip;",
            "uniform float auroraPerspectiveDepth;",
            "uniform float auroraParticleSoftness;",
            "uniform int auroraFogEnabled;",
            "uniform float auroraFogStart;",
            "uniform float auroraFogInvRange;",
            "uniform vec3 auroraFogColorGamma;",
            "uniform int auroraFogAdditive;",
            "varying float vAuroraAlpha;",
            "varying highp float vAuroraParticleViewZ;",
            "void main() {"
          ].join("\n")
        ),
        "#include <map_fragment>",
        "#include <map_fragment>\n  diffuseColor.a *= clamp(vAuroraAlpha, 0.0, 1.0);"
      ),
      "#include <color_fragment>",
      [
          "#include <color_fragment>",
          "  if (auroraSceneDepthBound != 0 && auroraParticleSoftness > 0.0) {",
          "    float auroraDepthSample = texture2D(",
          "      auroraSceneDepthTexture,",
          "      gl_FragCoord.xy * auroraParticlePixelSize",
          "    ).x;",
          "    float auroraPerspectiveSceneDepth = auroraNearClip / (",
          "      1.0 - auroraDepthSample * (1.0 - auroraNearClip / auroraFarClip)",
          "    );",
          "    float auroraOrthographicSceneDepth = auroraNearClip",
          "      + auroraDepthSample * (auroraFarClip - auroraNearClip);",
          "    float auroraSceneDepth = mix(",
          "      auroraOrthographicSceneDepth,",
          "      auroraPerspectiveSceneDepth,",
          "      auroraPerspectiveDepth",
          "    );",
          "    float auroraPerspectiveFragmentViewZ = -auroraNearClip / (",
          "      1.0 - gl_FragCoord.z * (1.0 - auroraNearClip / auroraFarClip)",
          "    );",
          "    float auroraOrthographicFragmentViewZ = -(",
          "      auroraNearClip + gl_FragCoord.z * (auroraFarClip - auroraNearClip)",
          "    );",
          "    float auroraFragmentViewZ = mix(",
          "      auroraOrthographicFragmentViewZ,",
          "      auroraPerspectiveFragmentViewZ,",
          "      auroraPerspectiveDepth",
          "    );",
          "    float auroraSoftFade = clamp(",
          "      (auroraSceneDepth + auroraFragmentViewZ)",
          "        * auroraParticleSoftness,",
          "      0.0,",
          "      1.0",
          "    );",
          "    diffuseColor.a *= auroraSoftFade * auroraSoftFade;",
          "  }",
          "  float auroraFogAmount = auroraFogEnabled != 0",
          "    ? clamp(",
          "        (-vAuroraParticleViewZ - auroraFogStart)",
          "          * auroraFogInvRange,",
          "        0.0,",
          "        1.0",
          "      )",
          "    : 0.0;",
          "  if (auroraFogAdditive != 0) {",
          "    diffuseColor.a *= 1.0 - auroraFogAmount;",
          "  } else {",
          "    diffuseColor.rgb = mix(diffuseColor.rgb, auroraFogColorGamma, auroraFogAmount);",
          "  }"
      ].join("\n")
    );
    material.userData.auroraVfxCanonicalParticleShaderApplied = true;
    material.userData.auroraVfxCanonicalParticleShaderPatchStatus = "applied";
  };
  material.customProgramCacheKey = () =>
    "aurora-vfx-canonical-particle-retail-soft-depth-fog/v2";
}

function replaceShaderAnchorExactlyOnce(
  source: string,
  anchor: string,
  replacement: string
): string {
  const matchCount = source.split(anchor).length - 1;
  if (matchCount !== 1) {
    throw new Error(
      `Aurora particle shader patch expected one "${anchor}" anchor, got ${matchCount}.`
    );
  }
  return source.replace(anchor, replacement);
}

function installCanonicalCameraBillboardUpdater(
  mesh: THREE.Mesh,
  drawRecords: AuroraParticleDrawRecordLike[],
  sourceCoordinateSpace: "three-y-up" | "aurora-z-up",
  radianceScale = 1
): void {
  const hasCameraBillboards = drawRecords.some((record) => {
    const mode = normalizeRenderModeToken(record.renderMode?.enum || record.renderMode?.rawToken);
    return ![
      "aligned_to_particle_dir",
      "billboard_to_world_z",
      "billboard_to_local_z"
    ].includes(mode);
  });
  mesh.frustumCulled = false;
  if (!hasCameraBillboards) return;
  const update = (camera: THREE.Camera) => {
    camera.updateMatrixWorld(true);
    mesh.parent?.updateWorldMatrix(true, false);
    const inverseParentMatrix = mesh.parent
      ? mesh.parent.matrixWorld.clone().invert()
      : new THREE.Matrix4();
    // Area model space mirrors the source X axis (`scale.x < 0`) while
    // converting Aurora Z-up into Three Y-up. A quaternion-only inverse drops
    // that reflection and makes FrontSide particle quads face away from the
    // camera. Transport the camera directions through the full inverse linear
    // parent transform so scale, reflection and rotation are all retained.
    const cameraRight = new THREE.Vector3()
      .setFromMatrixColumn(camera.matrixWorld, 0)
      .transformDirection(inverseParentMatrix);
    const cameraUp = new THREE.Vector3()
      .setFromMatrixColumn(camera.matrixWorld, 1)
      .transformDirection(inverseParentMatrix);
    const reverseWinding = (mesh.parent?.matrixWorld.determinant() ?? 1) < 0;
    const updatedGeometry = buildCanonicalTexturedQuadGeometry(
      drawRecords,
      sourceCoordinateSpace,
      { right: cameraRight, up: cameraUp, reverseWinding },
      radianceScale
    );
    const updatedPosition = updatedGeometry.getAttribute("position");
    const updatedUv = updatedGeometry.getAttribute("uv");
    const position = mesh.geometry.getAttribute("position");
    const uv = mesh.geometry.getAttribute("uv");
    if (
      position instanceof THREE.BufferAttribute &&
      updatedPosition instanceof THREE.BufferAttribute &&
      position.count === updatedPosition.count
    ) {
      position.copy(updatedPosition);
      position.needsUpdate = true;
      if (
        uv instanceof THREE.BufferAttribute &&
        updatedUv instanceof THREE.BufferAttribute &&
        uv.count === updatedUv.count
      ) {
        uv.copy(updatedUv);
        uv.needsUpdate = true;
      }
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
      Object.assign(mesh.geometry.userData, updatedGeometry.userData);
    }
    updatedGeometry.dispose();
  };
  auroraCanonicalCameraBillboardUpdaters.set(mesh, update);
  mesh.userData.auroraVfxCanonicalCameraBillboardPreRenderUpdateRequired = true;
  mesh.userData.auroraVfxCanonicalCameraBillboardParentTransformPolicy =
    "full-inverse-linear-including-reflection";
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    update(camera);
  };
}

function readThreeBlendFactorName(value: number): string {
  if (value === THREE.ZeroFactor) return "ZeroFactor";
  if (value === THREE.OneFactor) return "OneFactor";
  if (value === THREE.SrcColorFactor) return "SrcColorFactor";
  if (value === THREE.OneMinusSrcColorFactor) return "OneMinusSrcColorFactor";
  if (value === THREE.SrcAlphaFactor) return "SrcAlphaFactor";
  if (value === THREE.OneMinusSrcAlphaFactor) return "OneMinusSrcAlphaFactor";
  if (value === THREE.DstAlphaFactor) return "DstAlphaFactor";
  if (value === THREE.OneMinusDstAlphaFactor) return "OneMinusDstAlphaFactor";
  if (value === THREE.DstColorFactor) return "DstColorFactor";
  if (value === THREE.OneMinusDstColorFactor) return "OneMinusDstColorFactor";
  return `unknown:${value}`;
}

function readThreeBlendEquationName(value: number): string {
  if (value === THREE.AddEquation) return "AddEquation";
  if (value === THREE.SubtractEquation) return "SubtractEquation";
  if (value === THREE.ReverseSubtractEquation) return "ReverseSubtractEquation";
  if (value === THREE.MinEquation) return "MinEquation";
  if (value === THREE.MaxEquation) return "MaxEquation";
  return `unknown:${value}`;
}

function readThreeSideName(value: number): string {
  if (value === THREE.FrontSide) return "FrontSide";
  if (value === THREE.BackSide) return "BackSide";
  if (value === THREE.DoubleSide) return "DoubleSide";
  return `unknown:${value}`;
}

function buildCanonicalRootUserData(
  payload: AuroraVfxPayload,
  contract: AuroraVfxRuntimeRenderContractRecord | null,
  options: {
    diagnostics: SceneObjectVfxDiagnostic[];
    renderedDrawParticleCount: number;
    renderedVertexCount: number;
    renderedChunkModelCount?: number;
    renderedBounds?: AuroraVfxRenderedBounds | null;
    textureReference?: string | null;
    textureStatus: string;
    materialState: AuroraVfxRenderedMaterialState | null;
  }
): Record<string, unknown> {
  const diagnostics = mergeDiagnostics(options.diagnostics);
  const progFxType4Light = resolveProgFxType4SingleUserDataLight(contract);
  const runtimeEmitterNodeNames = readRuntimeEmitterNodeNames(contract);
  const chunkLanes = contract ? contract.chunkLanes ?? (contract.chunkLane ? [contract.chunkLane] : []) : [];
  const chunkLane = chunkLanes[0];
  const chunkResolvedResource = chunkLane?.resolvedResource;
  const renderedChunkModelCount = options.renderedChunkModelCount ?? 0;
  const pltPaletteResolution = resolveAuroraVfxCanonicalPltPaletteResolution(payload);
  const claimState = resolveAuroraVfxClaimState(payload);
  return {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalRenderer: true,
    auroraVfxPreviewRenderer: false,
    auroraVfxCanonicalStatus: payload.canonicalStatus,
    auroraVfxRendererEligibility: claimState.rendererEligibility,
    auroraVfxRetailParityStatus: claimState.retailParityStatus,
    auroraVfxRetailParityPromoted: claimState.retailParityPromoted,
    auroraVfxLegacyCanonicalLabelNonRetail: claimState.legacyCanonicalLabelNonRetail,
    auroraVfxCanonicalMode: "canonical",
    auroraVfxCanonicalPayloadVersion: payload.version,
    auroraVfxCanonicalSourceKind: payload.sourceKind,
    auroraVfxCanonicalMtrMaterialReference:
      readString(contract?.materialState?.materialRef) ?? "",
    auroraVfxCanonicalMtrMaterialState: contract?.materialState ?? null,
    auroraVfxCanonicalTextureReference: options.textureReference ?? null,
    auroraVfxCanonicalTextureStatus: options.textureStatus,
    auroraVfxCanonicalParticleCount: contract?.activeParticleCount ?? 0,
    auroraVfxCanonicalDrawParticleCount: contract?.drawParticleCount ?? 0,
    auroraVfxCanonicalRenderedDrawParticleCount: options.renderedDrawParticleCount,
    auroraVfxCanonicalRenderedChunkModelCount: renderedChunkModelCount,
    auroraVfxCanonicalDrawVertexCount: contract?.drawVertexCount ?? 0,
    auroraVfxCanonicalRenderedVertexCount: options.renderedVertexCount,
    auroraVfxCanonicalRenderedBoundsWidth: options.renderedBounds?.width ?? 0,
    auroraVfxCanonicalRenderedBoundsHeight: options.renderedBounds?.height ?? 0,
    auroraVfxCanonicalRenderedBoundsDepth: options.renderedBounds?.depth ?? 0,
    auroraVfxCanonicalRenderedBoundsCenterX: options.renderedBounds?.centerX ?? 0,
    auroraVfxCanonicalRenderedBoundsCenterY: options.renderedBounds?.centerY ?? 0,
    auroraVfxCanonicalRenderedBoundsCenterZ: options.renderedBounds?.centerZ ?? 0,
    auroraVfxCanonicalMaterialTransparent: options.materialState?.transparent ?? null,
    auroraVfxCanonicalMaterialDepthWrite: options.materialState?.depthWrite ?? null,
    auroraVfxCanonicalMaterialDepthTest: options.materialState?.depthTest ?? null,
    auroraVfxCanonicalMaterialAlphaTest: options.materialState?.alphaTest ?? null,
    auroraVfxCanonicalMaterialAlphaTestSource: options.materialState?.alphaTestSource ?? "none",
    auroraVfxCanonicalMaterialOpacity: options.materialState?.opacity ?? null,
    auroraVfxCanonicalMaterialColorHex: options.materialState?.colorHex ?? "none",
    auroraVfxCanonicalMaterialBlending: options.materialState?.blending ?? "none",
    auroraVfxCanonicalMaterialBlendSrc: options.materialState?.blendSrc ?? "none",
    auroraVfxCanonicalMaterialBlendDst: options.materialState?.blendDst ?? "none",
    auroraVfxCanonicalMaterialBlendEquation: options.materialState?.blendEquation ?? "none",
    auroraVfxCanonicalMaterialMapBound: options.materialState?.mapBound ?? false,
    auroraVfxCanonicalMaterialMapReference: options.materialState?.mapReference ?? "",
    auroraVfxCanonicalMaterialVertexColors: options.materialState?.vertexColors ?? false,
    auroraVfxCanonicalMaterialSide: options.materialState?.side ?? "none",
    auroraVfxCanonicalMaterialStatus: options.materialState?.status ?? "not-applied",
    auroraVfxCanonicalPltPaletteStatus: pltPaletteResolution.status,
    auroraVfxCanonicalPltPaletteRowsByLayer:
      pltPaletteResolution.status === "ready"
        ? pltPaletteResolution.paletteRowsByLayer
        : null,
    auroraVfxCanonicalPltRetailParityProof: false,
    auroraVfxCanonicalVerticesPerParticle: contract?.verticesPerDrawParticle ?? 0,
    auroraVfxCanonicalDrawLane: contract?.drawLane ?? "none",
    auroraVfxCanonicalChunkLaneCount: chunkLanes.length,
    auroraVfxCanonicalChunkLaneChunkNames: chunkLanes.map((entry) => entry.chunkName ?? ""),
    auroraVfxCanonicalChunkLaneResourceResolveStatuses: chunkLanes.map(
      (entry) => entry.resourceResolveStatus
    ),
    auroraVfxCanonicalChunkLaneResolvedResourceKeys: chunkLanes.map(
      (entry) => entry.resolvedResource?.resourceKey ?? ""
    ),
    auroraVfxCanonicalChunkLaneResourceResolveStatus:
      chunkLane?.resourceResolveStatus ?? "none",
    auroraVfxCanonicalChunkLaneChunkName: chunkLane?.chunkName ?? "",
    auroraVfxCanonicalChunkLaneActiveParticleCount: chunkLane?.activeParticleCount ?? 0,
    auroraVfxCanonicalChunkLaneTexturedQuadCanonical:
      chunkLane?.texturedQuadCanonical ?? null,
    auroraVfxCanonicalChunkLaneCollapseAttempted: chunkLane?.collapseAttempted ?? false,
    auroraVfxCanonicalChunkLaneResolvedResourceKey:
      chunkResolvedResource?.resourceKey ?? "",
    auroraVfxCanonicalChunkLaneResolvedResourceLayer:
      chunkResolvedResource?.sourceLayer ?? "",
    auroraVfxCanonicalChunkLaneResolvedResourcePath:
      chunkResolvedResource?.sourcePath ?? "",
    auroraVfxCanonicalChunkLaneResolvedResourceHash:
      chunkResolvedResource?.resourceHash ?? "",
    auroraVfxCanonicalChunkLaneResolvedResourceCandidateId:
      chunkResolvedResource?.candidateId ?? "",
    auroraVfxCanonicalChunkLaneRendererPending:
      chunkLanes.length > 0 && renderedChunkModelCount === 0,
    auroraVfxCanonicalChunkLaneModelPreviewStatus:
      chunkLanes.length === 0
        ? "none"
        : renderedChunkModelCount > 0
          ? "applied-local-model-preview-retail-unverified"
          : "pending-model-delivery",
    auroraVfxCanonicalRuntimeEmitterCount: runtimeEmitterNodeNames.length,
    auroraVfxCanonicalRuntimeEmitterNodeNames: runtimeEmitterNodeNames,
    auroraVfxCanonicalDrawRecordIds: contract?.drawRecords.map((record) => record.drawRecordId) ?? [],
    auroraVfxCanonicalEmitterNodeNames:
      contract?.drawRecords.map((record) => record.emitterNodeName ?? "") ?? [],
    auroraVfxCanonicalDrawRecordLanes: contract?.drawRecords.map((record) => record.lane) ?? [],
    auroraVfxCanonicalParticleIds: contract?.drawRecords.map((record) => record.particleId) ?? [],
    auroraVfxCanonicalParticleIndexes: contract?.drawRecords.map((record) => record.particleIndex) ?? [],
    auroraVfxCanonicalPositionX: contract?.drawRecords.map((record) => record.position.x) ?? [],
    auroraVfxCanonicalPositionY: contract?.drawRecords.map((record) => record.position.y) ?? [],
    auroraVfxCanonicalPositionZ: contract?.drawRecords.map((record) => record.position.z) ?? [],
    auroraVfxCanonicalVelocityX: contract?.drawRecords.map((record) => record.velocity.x) ?? [],
    auroraVfxCanonicalVelocityY: contract?.drawRecords.map((record) => record.velocity.y) ?? [],
    auroraVfxCanonicalVelocityZ: contract?.drawRecords.map((record) => record.velocity.z) ?? [],
    auroraVfxCanonicalDirectionX:
      contract?.drawRecords.map((record) => record.direction?.x ?? 0) ?? [],
    auroraVfxCanonicalDirectionY:
      contract?.drawRecords.map((record) => record.direction?.y ?? 0) ?? [],
    auroraVfxCanonicalDirectionZ:
      contract?.drawRecords.map((record) => record.direction?.z ?? 0) ?? [],
    auroraVfxCanonicalLanded:
      contract?.drawRecords.map((record) => record.landed) ?? [],
    auroraVfxCanonicalSplat:
      contract?.drawRecords.map((record) => record.splat) ?? [],
    auroraVfxCanonicalContactNormalX:
      contract?.drawRecords.map((record) => record.contactNormal?.x ?? 0) ?? [],
    auroraVfxCanonicalContactNormalY:
      contract?.drawRecords.map((record) => record.contactNormal?.y ?? 0) ?? [],
    auroraVfxCanonicalContactNormalZ:
      contract?.drawRecords.map((record) => record.contactNormal?.z ?? 0) ?? [],
    auroraVfxCanonicalInheritedVelocityMagnitude:
      contract?.drawRecords.map((record) => record.inheritedVelocityMagnitude ?? 0) ?? [],
    auroraVfxCanonicalInheritedVelocityDirectionX:
      contract?.drawRecords.map((record) => record.inheritedVelocityDirection?.x ?? 0) ?? [],
    auroraVfxCanonicalInheritedVelocityDirectionY:
      contract?.drawRecords.map((record) => record.inheritedVelocityDirection?.y ?? 0) ?? [],
    auroraVfxCanonicalInheritedVelocityDirectionZ:
      contract?.drawRecords.map((record) => record.inheritedVelocityDirection?.z ?? 0) ?? [],
    auroraVfxCanonicalInheritPart:
      contract?.drawRecords.map((record) => record.inheritPart === true) ?? [],
    auroraVfxCanonicalRotationRadians:
      contract?.drawRecords.map((record) => record.rotationRadians) ?? [],
    auroraVfxCanonicalColorR: contract?.drawRecords.map((record) => record.color.r) ?? [],
    auroraVfxCanonicalColorG: contract?.drawRecords.map((record) => record.color.g) ?? [],
    auroraVfxCanonicalColorB: contract?.drawRecords.map((record) => record.color.b) ?? [],
    auroraVfxCanonicalParticleSizeX: contract?.drawRecords.map((record) => record.size.x) ?? [],
    auroraVfxCanonicalParticleSizeY: contract?.drawRecords.map((record) => record.size.y) ?? [],
    auroraVfxCanonicalAlpha: contract?.drawRecords.map((record) => record.alpha) ?? [],
    auroraVfxCanonicalRecordVerticesPerParticle:
      contract?.drawRecords.map((record) => record.verticesPerParticle) ?? [],
    auroraVfxCanonicalPltLayers: contract?.drawRecords.map((record) => record.pltLayer ?? "") ?? [],
    auroraVfxCanonicalPltLayerColorSources:
      contract?.drawRecords.map((record) => record.pltLayerColorSource ?? "") ?? [],
    auroraVfxCanonicalAtlasFrames: contract?.drawRecords.map((record) => record.atlasUv.frameIndex) ?? [],
    auroraVfxCanonicalAtlasUvU0: contract?.drawRecords.map((record) => record.atlasUv.u0) ?? [],
    auroraVfxCanonicalAtlasUvV0: contract?.drawRecords.map((record) => record.atlasUv.v0) ?? [],
    auroraVfxCanonicalAtlasUvU1: contract?.drawRecords.map((record) => record.atlasUv.u1) ?? [],
    auroraVfxCanonicalAtlasUvV1: contract?.drawRecords.map((record) => record.atlasUv.v1) ?? [],
    auroraVfxCanonicalRenderMode: contract?.renderMode.enum ?? "unknown",
    auroraVfxCanonicalRenderModeRawToken: contract?.renderMode.rawToken ?? "",
    auroraVfxCanonicalBlendMode: contract?.blendMode.enum ?? "unknown",
    auroraVfxCanonicalBlendModeRawToken: contract?.blendMode.rawToken ?? "",
    auroraVfxCanonicalBlendModeNumber: contract?.blendMode.modeNumber ?? -1,
    auroraVfxCanonicalRenderOrder: contract?.renderOrder.value ?? 0,
    auroraVfxCanonicalDiagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    auroraVfxDiagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    ...buildProgFxType4LightUserData(progFxType4Light),
    ...buildProgFxType4MultiRequestUserData(contract),
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxRendererParityClaim: "none",
    auroraVfxRetailParityProof: false
  };
}

function readRuntimeEmitterNodeNames(
  contract: AuroraVfxRuntimeRenderContractRecord | null
): string[] {
  const fromAggregate = contract?.emitterNodeName
    ?.split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0) ?? [];
  if (fromAggregate.length > 0) {
    return [...new Set(fromAggregate)];
  }
  return [
    ...new Set(
      contract?.drawRecords
        .map((record) => record.emitterNodeName ?? "")
        .filter((entry) => entry.length > 0) ?? []
    )
  ];
}

function resolveProgFxType4SingleUserDataLight(
  contract: AuroraVfxRuntimeRenderContractRecord | null
): AuroraVfxProgFxType4LightRecord | null {
  const requests = contract?.progFxType4Requests ?? [];
  if (requests.length > 1) {
    return null;
  }
  return contract?.progFxType4Light ?? requests[0] ?? null;
}

function createProgFxType4RequestMarkers(
  contract: AuroraVfxRuntimeRenderContractRecord
): THREE.Group[] {
  const requests = contract.progFxType4Requests ?? [];
  if (requests.length <= 1) {
    return [];
  }
  return requests.map((request, requestIndex) => {
    const marker = new THREE.Group();
    const angle = (Math.PI * 2 * requestIndex) / requests.length;
    const radius = 0.18;
    marker.name = `aurora-progfx-type4-request-${request.rowId}-${requestIndex}`;
    marker.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    marker.userData = {
      ...buildProgFxType4LightUserData(request),
      auroraVfxProgFxType4RequestIndex: requestIndex,
      auroraVfxProgFxType4RequestCount: requests.length,
      auroraVfxProgFxType4MultiRequestStatus:
        AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_STATUS,
      auroraVfxProgFxType4MultiRequestPointLightPreviewStatus:
        AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_STATUS,
      auroraVfxProgFxType4MultiRequestPointLightPreviewSource:
        AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_SOURCE,
      auroraVfxProgFxType4MultiRequestPointLightPreviewBlocker:
        AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_BLOCKER,
      auroraVfxProgFxType4RequestSource: "render-contract.progFxType4Requests",
      auroraVfxProgFxType4RequestDiagnosticPositionSource:
        "local diagnostic ring only; not retail scheduler position parity"
    };
    return marker;
  });
}

function createProgFxType4PointLightPreview(
  progFxType4Light: AuroraVfxProgFxType4LightRecord | null
): THREE.PointLight | null {
  if (
    !progFxType4Light ||
    progFxType4Light.animationKind !== "light" ||
    progFxType4Light.sourceMdlColor === null
  ) {
    return null;
  }
  const distance =
    typeof progFxType4Light.sourceMdlRadiusMeters === "number" &&
    Number.isFinite(progFxType4Light.sourceMdlRadiusMeters) &&
    progFxType4Light.sourceMdlRadiusMeters > 0
      ? progFxType4Light.sourceMdlRadiusMeters
      : typeof progFxType4Light.radiusMeters === "number" &&
          Number.isFinite(progFxType4Light.radiusMeters) &&
          progFxType4Light.radiusMeters > 0
        ? progFxType4Light.radiusMeters
        : 0;
  if (distance <= 0) {
    return null;
  }
  const color = new THREE.Color(
    progFxType4Light.sourceMdlColor.r,
    progFxType4Light.sourceMdlColor.g,
    progFxType4Light.sourceMdlColor.b
  );
  const intensity = Math.max(color.r, color.g, color.b, 0.01);
  const falloffShaderPatch = installAuroraLinearLightFalloffShaderChunk();
  const pointLight = new THREE.PointLight(
    color,
    intensity,
    distance,
    AURORA_PROGFX_TYPE4_POINT_LIGHT_DECAY
  );
  pointLight.name = `progfx_type4_light_${progFxType4Light.ownerVisualEffectLabel || progFxType4Light.label}`;
  pointLight.castShadow = progFxType4Light.castShadows === true;
  pointLight.userData = {
    ...buildProgFxType4LightUserData(progFxType4Light),
    auroraVfxProgFxType4PreviewRole: "progfx-type4-point-light",
    auroraVfxProgFxType4PointLightPreviewStatus:
      AURORA_PROGFX_TYPE4_POINT_LIGHT_PREVIEW_STATUS,
    auroraVfxProgFxType4PointLightPreviewSource:
      AURORA_PROGFX_TYPE4_POINT_LIGHT_PREVIEW_SOURCE,
    auroraVfxProgFxType4PointLightDecay: AURORA_PROGFX_TYPE4_POINT_LIGHT_DECAY,
    auroraVfxProgFxType4PointLightDecaySource:
      AURORA_PROGFX_TYPE4_POINT_LIGHT_PREVIEW_SOURCE,
    auroraVfxProgFxType4FalloffRendererPatchStatus: falloffShaderPatch.status,
    auroraVfxProgFxType4FalloffRendererProofStatus: falloffShaderPatch.proofStatus,
    auroraVfxProgFxType4FalloffRendererSource: falloffShaderPatch.source,
    auroraVfxProgFxType4FalloffFormula:
      AURORA_PROGFX_TYPE4_POINT_LIGHT_FALLOFF_FORMULA,
    auroraVfxProgFxType4FalloffProofStatus:
      "source-backed-fx-light-clr-radius-linear-preview-scheduler-blocked",
    auroraVfxProgFxType4SourceMdlRadiusUnits: "meters",
    auroraVfxProgFxType4SourceMdlRadiusWorldDistance: distance,
    auroraVfxProgFxType4PointLightIntensity: intensity,
    auroraVfxProgFxType4PointLightIntensitySource:
      AURORA_PROGFX_TYPE4_POINT_LIGHT_INTENSITY_SOURCE,
    auroraVfxProgFxType4PointLightIntensityProofStatus:
      AURORA_PROGFX_TYPE4_POINT_LIGHT_INTENSITY_PROOF_STATUS,
    auroraVfxProgFxType4PointLightColor: [color.r, color.g, color.b],
    auroraVfxProgFxType4PointLightCastShadow: pointLight.castShadow
  };
  return pointLight;
}

function buildProgFxType4MultiRequestUserData(
  contract: AuroraVfxRuntimeRenderContractRecord | null
): Record<string, unknown> {
  const requests = contract?.progFxType4Requests ?? [];
  if (requests.length <= 1) {
    return {};
  }
  const lightRequests = requests.filter((request) => request.animationKind === "light");
  const visionRequests = requests.filter(
    (request) => request.animationKind === "vision" || request.visionMode.length > 0
  );
  const equalPriorityLightBuckets = new Map<number, number>();
  for (const request of lightRequests) {
    if (request.priority === null) {
      continue;
    }
    equalPriorityLightBuckets.set(
      request.priority,
      (equalPriorityLightBuckets.get(request.priority) ?? 0) + 1
    );
  }
  const equalPriorityLightTieCount = Array.from(
    equalPriorityLightBuckets.values()
  ).filter((count) => count > 1).length;
  return {
    auroraVfxProgFxType4MultiRequestPointLightPreviewStatus:
      AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_STATUS,
    auroraVfxProgFxType4MultiRequestPointLightPreviewSource:
      AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_SOURCE,
    auroraVfxProgFxType4MultiRequestPointLightPreviewBlocker:
      AURORA_PROGFX_TYPE4_MULTI_REQUEST_POINT_LIGHT_PREVIEW_BLOCKER,
    auroraVfxProgFxType4MultiRequestCount: requests.length,
    auroraVfxProgFxType4MultiRequestLightCount: lightRequests.length,
    auroraVfxProgFxType4MultiRequestVisionCount: visionRequests.length,
    auroraVfxProgFxType4MultiRequestEqualPriorityLightTieCount:
      equalPriorityLightTieCount,
    auroraVfxProgFxType4MultiRequestPointLightCount: 0,
    auroraVfxProgFxType4MultiRequestRuntimeOracleObservedSignal: "warm-yellow",
    auroraVfxProgFxType4MultiRequestCanonicalParityPromoted: false
  };
}

function buildProgFxType4LightUserData(
  progFxType4Light: AuroraVfxProgFxType4LightRecord | null
): Record<string, unknown> {
  return {
    auroraVfxProgFxType4ProofStatus: progFxType4Light?.proofStatus ?? "",
    auroraVfxProgFxType4RowId: progFxType4Light?.rowId ?? null,
    auroraVfxProgFxType4Label: progFxType4Light?.label ?? "",
    auroraVfxProgFxType4Param1AnimationRaw: progFxType4Light?.animationRaw ?? "",
    auroraVfxProgFxType4Animation: progFxType4Light?.animation ?? "",
    auroraVfxProgFxType4Param1AnimationStatus:
      progFxType4Light?.animationParameterStatus ?? "",
    auroraVfxProgFxType4AnimationKind: progFxType4Light?.animationKind ?? "",
    auroraVfxProgFxType4VisionMode: progFxType4Light?.visionMode ?? "",
    auroraVfxProgFxType4VisionParameterStatus:
      progFxType4Light?.visionParameterStatus ?? "",
    auroraVfxProgFxType4SymbolicColor: progFxType4Light?.symbolicColor ?? "",
    auroraVfxProgFxType4TokenRadiusMeters: progFxType4Light?.tokenRadiusMeters ?? null,
    auroraVfxProgFxType4TokenRadiusProofStatus:
      progFxType4Light?.tokenRadiusProofStatus ?? "",
    auroraVfxProgFxType4RadiusMeters: progFxType4Light?.radiusMeters ?? null,
    auroraVfxProgFxType4RadiusProofStatus: progFxType4Light?.radiusProofStatus ?? "",
    auroraVfxProgFxType4SourceMdlNodeName: progFxType4Light?.sourceMdlNodeName ?? "",
    auroraVfxProgFxType4SourceMdlAnimation: progFxType4Light?.sourceMdlAnimation ?? "",
    auroraVfxProgFxType4SourceMdlColor: progFxType4Light?.sourceMdlColor
      ? [
          progFxType4Light.sourceMdlColor.r,
          progFxType4Light.sourceMdlColor.g,
          progFxType4Light.sourceMdlColor.b
        ]
      : null,
    auroraVfxProgFxType4SourceMdlColorSource:
      progFxType4Light?.sourceMdlColorSource ?? "",
    auroraVfxProgFxType4SourceMdlColorProofStatus:
      progFxType4Light?.sourceMdlColorProofStatus ?? "",
    auroraVfxProgFxType4SourceMdlRadiusMeters:
      progFxType4Light?.sourceMdlRadiusMeters ?? null,
    auroraVfxProgFxType4SourceMdlRadiusFrames:
      progFxType4Light?.sourceMdlRadiusFrames ?? null,
    auroraVfxProgFxType4SourceMdlRadiusSource:
      progFxType4Light?.sourceMdlRadiusSource ?? "",
    auroraVfxProgFxType4SourceMdlRadiusProofStatus:
      progFxType4Light?.sourceMdlRadiusProofStatus ?? "",
    auroraVfxProgFxType4Param2AnimationSpeedRaw:
      progFxType4Light?.animationSpeedRaw ?? "",
    auroraVfxProgFxType4AnimationSpeed: progFxType4Light?.animationSpeed ?? null,
    auroraVfxProgFxType4Param2AnimationSpeedStatus:
      progFxType4Light?.animationSpeedParameterStatus ?? "",
    auroraVfxProgFxType4Param3CastShadowsRaw:
      progFxType4Light?.castShadowsRaw ?? "",
    auroraVfxProgFxType4CastShadows: progFxType4Light?.castShadows ?? null,
    auroraVfxProgFxType4Param3CastShadowsStatus:
      progFxType4Light?.castShadowParameterStatus ?? "",
    auroraVfxProgFxType4Param4PriorityRaw:
      progFxType4Light?.priorityRaw ?? "",
    auroraVfxProgFxType4Priority: progFxType4Light?.priority ?? null,
    auroraVfxProgFxType4Param4PriorityStatus:
      progFxType4Light?.priorityParameterStatus ?? "",
    auroraVfxProgFxType4Param5ProximitySuppressionRaw:
      progFxType4Light?.proximitySuppressionRaw ?? "",
    auroraVfxProgFxType4ProximitySuppression:
      progFxType4Light?.proximitySuppression ?? null,
    auroraVfxProgFxType4Param5ProximitySuppressionStatus:
      progFxType4Light?.proximitySuppressionParameterStatus ?? "",
    auroraVfxProgFxType4Param6AttachToSceneRaw:
      progFxType4Light?.attachToSceneRaw ?? "",
    auroraVfxProgFxType4AttachToScene: progFxType4Light?.attachToScene ?? null,
    auroraVfxProgFxType4Param6AttachToSceneStatus:
      progFxType4Light?.sceneAttachmentParameterStatus ?? "",
    auroraVfxProgFxType4Param7ModelRaw: progFxType4Light?.modelRaw ?? "",
    auroraVfxProgFxType4ModelRef: progFxType4Light?.modelRef ?? "",
    auroraVfxProgFxType4Param7ModelStatus:
      progFxType4Light?.modelParameterStatus ?? "",
    auroraVfxProgFxType4Param8UnusedRaw:
      progFxType4Light?.unusedParam8Raw ?? "",
    auroraVfxProgFxType4ColorR: progFxType4Light?.color.r ?? null,
    auroraVfxProgFxType4ColorG: progFxType4Light?.color.g ?? null,
    auroraVfxProgFxType4ColorB: progFxType4Light?.color.b ?? null,
    auroraVfxProgFxType4NotPlaceableTwoDaLight:
      progFxType4Light?.notPlaceableTwoDaLight ?? null,
    auroraVfxProgFxType4NotMdlLightNode: progFxType4Light?.notMdlLightNode ?? null,
    auroraVfxProgFxType4ParameterSource: progFxType4Light?.parameterSource ?? "",
    auroraVfxProgFxType4ParameterPreservationProofSource:
      progFxType4Light?.parameterPreservationProofSource ?? "",
    auroraVfxProgFxType4ParameterPreservationProofStatus:
      progFxType4Light?.parameterPreservationProofStatus ?? "",
    auroraVfxProgFxType4RuntimeSchedulingStatus:
      progFxType4Light?.runtimeSchedulingStatus ?? "",
    auroraVfxProgFxType4RuntimeSchedulingProofSource:
      progFxType4Light?.runtimeSchedulingProofSource ?? "",
    auroraVfxProgFxType4RuntimeSchedulingBlocker:
      progFxType4Light?.runtimeSchedulingBlocker ?? "",
    auroraVfxProgFxType4SceneAttachmentPolicyStatus:
      progFxType4Light?.sceneAttachmentPolicyStatus ?? "",
    auroraVfxProgFxType4ProximitySuppressionPolicyStatus:
      progFxType4Light?.proximitySuppressionPolicyStatus ?? "",
    auroraVfxProgFxType4VisionMutationPolicyStatus:
      progFxType4Light?.visionMutationPolicyStatus ?? "",
    auroraVfxProgFxType4ShadowPolicyStatus:
      progFxType4Light?.shadowPolicyStatus ?? "",
    auroraVfxProgFxType4VisualPreviewStatus:
      progFxType4Light?.visualPreviewStatus ?? "",
    auroraVfxProgFxType4OwnerVisualEffectRowId:
      progFxType4Light?.ownerVisualEffectRowId ?? null,
    auroraVfxProgFxType4OwnerVisualEffectLabel:
      progFxType4Light?.ownerVisualEffectLabel ?? "",
    auroraVfxProgFxType4OwnerPhase: progFxType4Light?.ownerPhase ?? "",
    auroraVfxProgFxType4OwnerProgFxRef: progFxType4Light?.ownerProgFxRef ?? "",
    auroraVfxProgFxType4OwnerEffectConstructorKind:
      progFxType4Light?.ownerEffectConstructorKind ?? "",
    auroraVfxProgFxType4OwnerDurationType:
      progFxType4Light?.ownerDurationType ?? ""
  };
}

function readGeometryBounds(geometry: THREE.BufferGeometry): AuroraVfxRenderedBounds {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds || bounds.isEmpty()) {
    return {
      width: 0,
      height: 0,
      depth: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0
    };
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  return {
    width: round(size.x),
    height: round(size.y),
    depth: round(size.z),
    centerX: round(center.x),
    centerY: round(center.y),
    centerZ: round(center.z)
  };
}

function readObjectBounds(object: THREE.Object3D): AuroraVfxRenderedBounds {
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) {
    return {
      width: 0,
      height: 0,
      depth: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0
    };
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  return {
    width: round(size.x),
    height: round(size.y),
    depth: round(size.z),
    centerX: round(center.x),
    centerY: round(center.y),
    centerZ: round(center.z)
  };
}

function mergeObjectBounds(objects: readonly THREE.Object3D[]): AuroraVfxRenderedBounds | null {
  return objects.reduce<AuroraVfxRenderedBounds | null>((current, object) => {
    const bounds = readObjectBounds(object);
    if (bounds.width === 0 && bounds.height === 0 && bounds.depth === 0) {
      return current;
    }
    return current ? mergeRenderedBounds(current, bounds) : bounds;
  }, null);
}

function createDiagnosticPlaceholder(
  objectRadius = 0.24,
  diagnosticCodes: readonly string[]
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(objectRadius * 0.58, objectRadius * 0.58, objectRadius * 0.58);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffb347"),
    wireframe: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = {
    auroraVfxRenderer: "canonical",
    auroraVfxCanonicalRenderer: true,
    auroraVfxCanonicalDiagnosticPlaceholder: true,
    auroraVfxCanonicalDrawMesh: false,
    auroraVfxCanonicalFakeParticleDraw: false,
    auroraVfxCanonicalDiagnosticCodes: [...diagnosticCodes],
    auroraVfxThreeMaterialSourceTruth: false,
    auroraVfxRetailParityProof: false
  };
  return mesh;
}

function isTexturedQuadDrawRecord(
  record: AuroraParticleDrawRecordLike
): record is AuroraParticleDrawRecordLike {
  return record.lane === "textured_quad" || record.lane === "linked_textured_quad";
}

function resolveTexture(
  texturesByReference: ReadonlyMap<string, THREE.Texture> | undefined,
  textureReference: string | null
): THREE.Texture | null {
  if (!texturesByReference || !textureReference) {
    return null;
  }
  return (
    texturesByReference.get(textureReference) ??
    texturesByReference.get(textureReference.trim().toLowerCase()) ??
    null
  );
}

function resolveAuroraVfxCanonicalTextureSamplerState(
  statesByReference: ReadonlyMap<string, AuroraVfxCanonicalTextureSamplerState> | undefined,
  textureReference: string | null
): AuroraVfxCanonicalTextureSamplerState | undefined {
  if (!statesByReference || !textureReference) return undefined;
  return (
    statesByReference.get(textureReference) ??
    statesByReference.get(textureReference.trim().toLowerCase())
  );
}

export function applyAuroraVfxCanonicalTextureSamplerState(
  texture: THREE.Texture,
  state: AuroraVfxCanonicalTextureSamplerState | undefined
): void {
  if (!state) return;
  if (state.mipmap === false) {
    texture.generateMipmaps = false;
    texture.minFilter = state.filter === false ? THREE.NearestFilter : THREE.LinearFilter;
  }
  if (state.filter === false) {
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
  }
  if (state.clamp === 1 || state.clamp === 3) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
  }
  if (state.clamp === 2 || state.clamp === 3) {
    texture.wrapT = THREE.ClampToEdgeWrapping;
  }
  texture.userData = {
    ...texture.userData,
    auroraVfxCanonicalTextureSamplerMipmap: state.mipmap,
    auroraVfxCanonicalTextureSamplerFilter: state.filter,
    auroraVfxCanonicalTextureSamplerClamp: state.clamp,
    auroraVfxCanonicalTextureSamplerDownsampleMin: state.downsampleMin,
    auroraVfxCanonicalTextureSamplerDownsampleMax: state.downsampleMax,
    auroraVfxCanonicalTextureSamplerSource: state.source ?? "TXI sidecar"
  };
  texture.needsUpdate = true;
}

function readDrawLane(value: unknown): AuroraVfxRuntimeRenderContractRecord["drawLane"] {
  return value === "linked_textured_quad" || value === "chunk_model"
    ? value
    : "textured_quad";
}

function readVerticesPerParticle(value: unknown): 0 | 6 {
  return value === 0 ? 0 : 6;
}

function readModeRecord(value: unknown): AuroraVfxModeRecord {
  if (!isRecord(value)) {
    return {};
  }
  const exactGlBlendFactors = isRecord(value.exactGlBlendFactors)
    ? {
        ...(readString(value.exactGlBlendFactors.status)
          ? { status: readString(value.exactGlBlendFactors.status) }
          : {}),
        ...(readString(value.exactGlBlendFactors.sourceFactor)
          ? { sourceFactor: readString(value.exactGlBlendFactors.sourceFactor) }
          : {}),
        ...(typeof value.exactGlBlendFactors.sourceFactorGlEnum === "number" &&
        Number.isFinite(value.exactGlBlendFactors.sourceFactorGlEnum)
          ? { sourceFactorGlEnum: value.exactGlBlendFactors.sourceFactorGlEnum }
          : {}),
        ...(readString(value.exactGlBlendFactors.destinationFactor)
          ? { destinationFactor: readString(value.exactGlBlendFactors.destinationFactor) }
          : {}),
        ...(typeof value.exactGlBlendFactors.destinationFactorGlEnum === "number" &&
        Number.isFinite(value.exactGlBlendFactors.destinationFactorGlEnum)
          ? { destinationFactorGlEnum: value.exactGlBlendFactors.destinationFactorGlEnum }
          : {}),
        ...(Array.isArray(value.exactGlBlendFactors.blendTableIndices) &&
        value.exactGlBlendFactors.blendTableIndices.length === 2 &&
        value.exactGlBlendFactors.blendTableIndices.every(
          (entry) => typeof entry === "number" && Number.isFinite(entry)
        )
          ? {
              blendTableIndices: [
                value.exactGlBlendFactors.blendTableIndices[0] as number,
                value.exactGlBlendFactors.blendTableIndices[1] as number
              ] as [number, number]
            }
          : {}),
        ...(readString(value.exactGlBlendFactors.source)
          ? { source: readString(value.exactGlBlendFactors.source) }
          : {}),
        ...(readString(value.exactGlBlendFactors.binarySha256)
          ? { binarySha256: readString(value.exactGlBlendFactors.binarySha256) }
          : {})
      }
    : undefined;
  return {
    ...(readString(value.enum) ? { enum: readString(value.enum) } : {}),
    ...(readString(value.rawToken) ? { rawToken: readString(value.rawToken) } : {}),
    ...(typeof value.modeNumber === "number" && Number.isFinite(value.modeNumber)
      ? { modeNumber: value.modeNumber }
      : {}),
    ...(exactGlBlendFactors ? { exactGlBlendFactors } : {})
  };
}

function readRenderOrder(value: unknown): { value: number; rawValue?: number } {
  if (!isRecord(value)) {
    return { value: 0 };
  }
  return {
    value: readFiniteNumber(value.value, 0),
    ...(typeof value.rawValue === "number" && Number.isFinite(value.rawValue)
      ? { rawValue: value.rawValue }
      : {})
  };
}

function readVector3(value: unknown): AuroraVector3Like | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    x: readFiniteNumber(value.x, 0),
    y: readFiniteNumber(value.y, 0),
    z: readFiniteNumber(value.z, 0)
  };
}

function readColor(value: unknown): AuroraColorLike | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    r: readFiniteNumber(value.r, 1),
    g: readFiniteNumber(value.g, 1),
    b: readFiniteNumber(value.b, 1)
  };
}

function readSize(value: unknown): { x: number; y: number } | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    x: Math.max(0, readFiniteNumber(value.x, 0)),
    y: Math.max(0, readFiniteNumber(value.y, 0))
  };
}

function readAtlasUv(value: unknown): AuroraAtlasUvLike | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    u0: readFiniteNumber(value.u0, 0),
    v0: readFiniteNumber(value.v0, 0),
    u1: readFiniteNumber(value.u1, 1),
    v1: readFiniteNumber(value.v1, 1),
    frameIndex: readFiniteNumber(value.frameIndex, 0),
    rawFrameIndex: readFiniteNumber(value.rawFrameIndex, readFiniteNumber(value.frameIndex, 0)),
    mapping: readString(value.mapping) || "unknown"
  };
}

function normalizeDiagnostics(value: unknown): SceneObjectVfxDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const code = readString(entry.code);
    if (!code) {
      return [];
    }
    const severity = entry.severity === "info" || entry.severity === "error" ? entry.severity : "warn";
    return [
      {
        code,
        severity,
        message: readString(entry.message)
      }
    ];
  });
}

function mergeDiagnostics(
  diagnostics: readonly SceneObjectVfxDiagnostic[]
): SceneObjectVfxDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.flatMap((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.severity}:${diagnostic.message}`;
    if (seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [{ ...diagnostic }];
  });
}

function collectPayloadDiagnostics(payload: AuroraVfxPayload): SceneObjectVfxDiagnostic[] {
  return Object.values(payload.diagnostics).flat();
}

function normalizeResourceReference(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\.(dds|tga|png|jpg|jpeg|plt)$/u, "");
  return normalized.length > 0 ? normalized : null;
}

function readFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNullableFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function round(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

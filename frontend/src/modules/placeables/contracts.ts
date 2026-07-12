import type { SceneObjectEmbeddedItemSummary } from "../scene/contracts";

export type PlaceableApiSubtype =
  | "generic"
  | "door"
  | "vfx"
  | "container"
  | "light_source"
  | "trigger_proxy";

export type PlaceableApiSubtypeHint = PlaceableApiSubtype | "vvx" | "vvxy";

export type PlaceableApiMetadataPrimitive = string | number | boolean;

export interface PlaceableApiListQuery {
  query?: string;
  category?: string;
  tag?: string;
  subtype?: PlaceableApiSubtypeHint;
  benchmark?: boolean;
  limit?: number;
  offset?: number;
}

export interface PlaceableApiListItem {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  placeableSubtype?: PlaceableApiSubtype;
  tags: string[];
  previewImageUrl: string;
  metadata?: Record<string, PlaceableApiMetadataPrimitive>;
}

export interface PlaceableApiListResult {
  items: PlaceableApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlaceableApiBlueprintEmbeddedItemEntry extends SceneObjectEmbeddedItemSummary {}

export interface PlaceableApiBlueprintInventoryItemEntry {
  resRef?: string;
  embeddedItem?: PlaceableApiBlueprintEmbeddedItemEntry;
  randomResRef?: string;
  randomList?: string;
  x?: number;
  y?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface PlaceableApiBlueprintCreatePayload {
  templateResRef: string;
  name: string;
  tag?: string;
  comments?: string;
  plot?: boolean;
  useable?: boolean;
  hasInventory?: boolean;
  appearanceId?: number;
  isStatic?: boolean;
  inventoryItemListEntries?: PlaceableApiBlueprintInventoryItemEntry[];
  overwrite?: boolean;
}

export interface PlaceableApiBlueprintDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export interface PlaceableApiBlueprintCreateResult {
  blueprint: PlaceableApiBlueprintDescriptor;
  placeable: PlaceableApiListItem & { kind?: "placeable" };
}

export interface PlaceableApiBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}

export interface PlaceableApiRenderContract {
  backendType: PlaceableApiSubtype;
  frontendType: "placeable" | "door" | "vfx";
  rendererPreset: string;
  isDoor: boolean;
  isVfx: boolean;
}

export type PlaceableRenderPackageStatus =
  | "ready"
  | "unsupported"
  | "missing_derived"
  | "missing_assets";

export interface PlaceableRenderPackageDiagnostic {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
}

export interface PlaceableRenderPackageAssetRefs {
  modelAssetIds?: string[];
  derivedModelAssetIds?: string[];
  chunkModelAssetIds?: string[];
  textureAssetIds?: string[];
  materialAssetIds?: string[];
  metadataAssetIds?: string[];
  otherAssetIds?: string[];
}

export interface PlaceableRenderPackageTextureTxiState {
  decal?: boolean;
  clamp?: 0 | 1 | 2 | 3;
  blending?: PlaceableRenderPackageAuroraMaterialBlending;
  mipmap?: boolean;
  filter?: boolean;
  bumpmaptexture?: string;
  envmaptexture?: string;
  proceduretype?: string;
  numx?: number;
  numy?: number;
  fps?: number;
}

export interface PlaceableRenderPackageTextureBinding {
  reference: string;
  assetId: string;
  fileName: string;
  objectKey: string;
  deliveryUrl: string;
  txi?: PlaceableRenderPackageTextureTxiState;
}

export type PlaceableRenderPackageAuroraEmitterSource =
  | "aurora-mdl-binary"
  | "aurora-mdl-ascii";

export interface PlaceableRenderPackageAuroraEmitterAtlas {
  xGridRaw?: number;
  yGridRaw?: number;
  effectiveXGrid: number;
  effectiveYGrid: number;
  fps?: number;
  frameStart?: number;
  frameEnd?: number;
  random?: boolean;
}

export interface PlaceableRenderPackageAuroraEmitterNumberKeyframe {
  time: number;
  value: number;
}

export interface PlaceableRenderPackageAuroraEmitterColorKeyframe {
  time: number;
  value: [number, number, number];
}

export interface PlaceableRenderPackageAuroraEmitterVector3Keyframe {
  time: number;
  value: [number, number, number];
}

export interface PlaceableRenderPackageAuroraEmitterOrientationKeyframe {
  time: number;
  value: {
    axis: [number, number, number];
    angleRadians: number;
  };
}

export type PlaceableRenderPackageAuroraEmitterSimulationTimelineKey =
  | "xSize"
  | "ySize"
  | "birthrate"
  | "lifeExp"
  | "mass"
  | "velocity"
  | "randvel"
  | "spread"
  | "particleRot"
  | "bounceCoefficient"
  | "blastRadius"
  | "blastLength"
  | "blurLength"
  | "detonate"
  | "fps"
  | "frameStart"
  | "frameEnd"
  | "lightningScale"
  | "lightningDelay"
  | "lightningRadius"
  | "p2pBezier2"
  | "p2pBezier3"
  | "combineTime"
  | "grav"
  | "drag"
  | "threshold"
  | "sizeStart"
  | "sizeMid"
  | "sizeEnd"
  | "sizeStartY"
  | "sizeMidY"
  | "sizeEndY"
  | "percentStart"
  | "percentMid"
  | "percentEnd"
  | "alphaStart"
  | "alphaMid"
  | "alphaEnd";

export type PlaceableRenderPackageAuroraEmitterSimulationTimeline = Partial<
  Record<
    PlaceableRenderPackageAuroraEmitterSimulationTimelineKey,
    PlaceableRenderPackageAuroraEmitterNumberKeyframe[]
  >
>;

export type PlaceableRenderPackageAuroraEmitterColorTimelineKey =
  | "colorStart"
  | "colorMid"
  | "colorEnd";

export type PlaceableRenderPackageAuroraEmitterColorTimeline = Partial<
  Record<
    PlaceableRenderPackageAuroraEmitterColorTimelineKey,
    PlaceableRenderPackageAuroraEmitterColorKeyframe[]
  >
>;

export interface PlaceableRenderPackageAuroraEmitterSimulation {
  xSize?: number;
  ySize?: number;
  spawnType?: number;
  birthrate?: number;
  lifeExp?: number;
  mass?: number;
  velocity?: number;
  randvel?: number;
  spread?: number;
  particleRot?: number;
  bounce?: boolean;
  bounceCoefficient?: number;
  blastRadius?: number;
  blastLength?: number;
  blurLength?: number;
  detonate?: number;
  fps?: number;
  frameStart?: number;
  frameEnd?: number;
  lightningScale?: number;
  lightningDelay?: number;
  lightningRadius?: number;
  deadspace?: number;
  p2p?: boolean;
  p2pType?: string;
  p2pBezier2?: number;
  p2pBezier3?: number;
  p2pSource?: number;
  p2pTarget?: number;
  combineTime?: number;
  grav?: number;
  drag?: number;
  threshold?: number;
  inherit?: boolean;
  inheritVel?: boolean;
  inheritLocal?: boolean;
  inheritPart?: boolean;
  affectedByWind?: boolean;
  sizeStart?: number;
  sizeMid?: number;
  sizeEnd?: number;
  sizeStartY?: number;
  sizeMidY?: number;
  sizeEndY?: number;
  alphaStart?: number;
  alphaMid?: number;
  alphaEnd?: number;
  colorStart?: [number, number, number];
  colorMid?: [number, number, number];
  colorEnd?: [number, number, number];
  percentStart?: number;
  percentMid?: number;
  percentEnd?: number;
  timeline?: PlaceableRenderPackageAuroraEmitterSimulationTimeline;
  colorTimeline?: PlaceableRenderPackageAuroraEmitterColorTimeline;
}

export interface PlaceableRenderPackageAuroraEmitterTransform {
  position?: [number, number, number];
  positionTimeline?: PlaceableRenderPackageAuroraEmitterVector3Keyframe[];
  orientation?: {
    axis: [number, number, number];
    angleRadians: number;
  };
  orientationTimeline?: PlaceableRenderPackageAuroraEmitterOrientationKeyframe[];
  scale?: number;
  scaleTimeline?: PlaceableRenderPackageAuroraEmitterNumberKeyframe[];
}

export interface PlaceableRenderPackageAuroraEmitterReferenceNode {
  nodeName: string;
  parentNodeName?: string;
  transform?: PlaceableRenderPackageAuroraEmitterTransform;
}

export interface PlaceableRenderPackageAuroraEmitterAnimationEvent {
  time: number;
  type: string;
  animationName?: string;
}

export interface PlaceableRenderPackageAuroraEmitterAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  simulation?: PlaceableRenderPackageAuroraEmitterSimulation;
  transform?: PlaceableRenderPackageAuroraEmitterTransform;
}

export interface PlaceableRenderPackageAuroraEmitterSourceState {
  renderOrder?: number;
  renderHintRaw?: string;
  renderHintMode?: 0 | 1 | 2 | 3;
  customShaderVS?: string;
  customShaderFS?: string;
  customShaderGS?: string;
  transparency?: boolean;
  twoSidedMaterial?: boolean;
  twoSidedTexture?: boolean;
  sampleFramebuffer?: number;
  volumetric?: boolean;
  loop?: boolean;
  isTinted?: boolean;
  splat?: boolean;
  rotateTexture?: boolean;
}

export interface PlaceableRenderPackageAuroraEmitterNode {
  source: PlaceableRenderPackageAuroraEmitterSource;
  sourceModelAssetId: string;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  nodeName: string;
  texture?: string;
  chunkName?: string;
  chunkModelAssetId?: string;
  chunkModelFileName?: string;
  chunkModelObjectKey?: string;
  emitterType?: string;
  renderMode?: string;
  blendMode?: string;
  atlas?: PlaceableRenderPackageAuroraEmitterAtlas;
  simulation?: PlaceableRenderPackageAuroraEmitterSimulation;
  transform?: PlaceableRenderPackageAuroraEmitterTransform;
  referenceNodes?: PlaceableRenderPackageAuroraEmitterReferenceNode[];
  events?: PlaceableRenderPackageAuroraEmitterAnimationEvent[];
  animations?: PlaceableRenderPackageAuroraEmitterAnimation[];
  sourceState?: PlaceableRenderPackageAuroraEmitterSourceState;
}

export interface PlaceableRenderPackageAuroraEmitter {
  source: "source-mdl";
  emitters: PlaceableRenderPackageAuroraEmitterNode[];
  diagnostics: PlaceableRenderPackageDiagnostic[];
}

export type PlaceableRenderPackageAuroraLightSource =
  | "aurora-mdl-binary"
  | "aurora-mdl-ascii";

export interface PlaceableRenderPackageAuroraLightNumberKeyframe {
  time: number;
  value: number;
}

export interface PlaceableRenderPackageAuroraLightColorKeyframe {
  time: number;
  value: [number, number, number];
}

export interface PlaceableRenderPackageAuroraLightVector3Keyframe {
  time: number;
  value: [number, number, number];
}

export interface PlaceableRenderPackageAuroraLightAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  positionTimeline?: PlaceableRenderPackageAuroraLightVector3Keyframe[];
  colorTimeline?: PlaceableRenderPackageAuroraLightColorKeyframe[];
  radiusTimeline?: PlaceableRenderPackageAuroraLightNumberKeyframe[];
  shadowRadiusTimeline?: PlaceableRenderPackageAuroraLightNumberKeyframe[];
  verticalDisplacementTimeline?: PlaceableRenderPackageAuroraLightNumberKeyframe[];
  multiplierTimeline?: PlaceableRenderPackageAuroraLightNumberKeyframe[];
}

export interface PlaceableRenderPackageAuroraLightNode {
  source: PlaceableRenderPackageAuroraLightSource;
  sourceModelAssetId: string;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  nodeName: string;
  sourceNodeKind?: string;
  parentNodeName?: string;
  transform?: PlaceableRenderPackageAuroraEmitterTransform;
  radius?: number;
  shadowRadius?: number;
  verticalDisplacement?: number;
  multiplier?: number;
  color?: [number, number, number];
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  lightPriority?: number;
  generateFlare?: boolean;
  textureNames?: string[];
  flareSizes?: number[];
  flarePositions?: number[];
  flareColorShifts?: [number, number, number][];
  flareRadius?: number;
  lensFlares?: boolean;
  fadingLight?: boolean;
  animations?: PlaceableRenderPackageAuroraLightAnimation[];
}

export interface PlaceableRenderPackageAuroraLight {
  source: "source-mdl";
  lights: PlaceableRenderPackageAuroraLightNode[];
  diagnostics: PlaceableRenderPackageDiagnostic[];
}

export type PlaceableRenderPackageAuroraMaterialBlending =
  | "additive"
  | "punchthrough";

export type PlaceableRenderPackageAuroraTextureSlotRole =
  | "diffuse"
  | "normal"
  | "specular"
  | "roughness"
  | "height"
  | "emissive"
  | "unknown";

export interface PlaceableRenderPackageAuroraTextureSlot {
  slot: number;
  role: PlaceableRenderPackageAuroraTextureSlotRole;
  reference: string;
}

export interface PlaceableRenderPackageAuroraMaterialState {
  blending?: PlaceableRenderPackageAuroraMaterialBlending;
  auroraBlendField48?: number;
  auroraBlendField4c?: number;
  decal?: boolean;
  transparency?: boolean;
  twoSided?: boolean;
  renderHint?: string;
  customShaderVS?: string;
  customShaderFS?: string;
  customShaderGS?: string;
  roughness?: number;
  specularity?: number;
  textureSlots?: PlaceableRenderPackageAuroraTextureSlot[];
}

export interface PlaceableRenderPackageAuroraMaterialNode {
  source: "aurora-mtr";
  materialAssetId: string;
  materialFileName: string;
  materialObjectKey: string;
  state: PlaceableRenderPackageAuroraMaterialState;
}

export interface PlaceableRenderPackageAuroraMaterial {
  source: "mtr";
  materials: PlaceableRenderPackageAuroraMaterialNode[];
  diagnostics: PlaceableRenderPackageDiagnostic[];
}

export interface PlaceableRenderPackage {
  status: PlaceableRenderPackageStatus;
  diagnostics: PlaceableRenderPackageDiagnostic[];
  assetRefs: PlaceableRenderPackageAssetRefs;
  modelUrl?: string;
  glbUrl?: string;
  textureUrls?: string[];
  textureBindings?: PlaceableRenderPackageTextureBinding[];
  auroraEmitter?: PlaceableRenderPackageAuroraEmitter;
  auroraLight?: PlaceableRenderPackageAuroraLight;
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial;
}

export type PlaceableApiAssetRole =
  | "model"
  | "texture"
  | "material"
  | "vfx"
  | "metadata"
  | "unknown";

export interface PlaceableApiAssetEntry {
  assetId: string;
  role: PlaceableApiAssetRole;
  fileName: string;
  objectKey: string;
  extension: string;
  sizeBytes: number;
  contentType: string;
  etag?: string;
}

export interface PlaceableApiAssetManifest {
  version: "placeable-asset-manifest/v1";
  source: "module-blob-snapshot";
  generatedAt: string;
  moduleHash?: string;
  assetCount: number;
  candidatesScanned: number;
  assets: PlaceableApiAssetEntry[];
}

export interface PlaceableApiRuntimeProjection {
  state?: {
    appearanceType?: number;
    animationState?: number;
    portraitId?: number;
    currentHitPoints?: number;
    hardness?: number;
    lightState?: number;
    lightStateSource?: string;
    lightStateProofStatus?: string;
    lightStateDefaulted?: boolean;
  };
}

export interface PlaceableApiProcessedPayload {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  placeableSubtype: PlaceableApiSubtype;
  render: PlaceableApiRenderContract;
  renderPackage?: PlaceableRenderPackage;
  assetManifest: PlaceableApiAssetManifest;
  metadata?: Record<string, string | number | boolean>;
  placeableRuntime?: PlaceableApiRuntimeProjection;
}

export interface PlaceableApiPreviewScene {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  placeableSubtype?: PlaceableApiSubtype;
  previewImageUrl: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface PlaceableApiProcessPayload {
  templateId?: string;
  resref?: string;
  tag?: string;
  localizedName?: string;
  description?: string;
  subtypeHint?: PlaceableApiSubtypeHint;
  appearanceType?: number;
  genericType?: number;
  bypassCache?: boolean;
  includeBenchmarkMetadata?: boolean;
}

export interface PlaceableApiProcessResult {
  cacheKey: string;
  cacheHit: boolean;
  storedAt: string;
  hits: number;
  placeable: PlaceableApiProcessedPayload;
}

export interface PlaceableApiProcessBatchResult {
  items: PlaceableApiProcessResult[];
}

export interface PlaceableApiAssetDeliveryContract {
  assetId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  deliveryPath: string;
  deliveryUrl: string;
  s3Url?: string;
}

export interface PlaceableApiAssetContractsResult {
  cacheKey: string;
  moduleHash?: string;
  assets: PlaceableApiAssetDeliveryContract[];
}

export interface PlaceableApiAssetContractsBatchRequestItem {
  cacheKey: string;
  assetIds?: string[];
}

export interface PlaceableApiAssetContractsBatchResult {
  items: PlaceableApiAssetContractsResult[];
}

export interface PlaceableApiViewportRenderPayload {
  templateId: string;
  cacheKey: string;
  cacheHit: boolean;
  storedAt: string;
  hits: number;
  placeable: PlaceableApiProcessedPayload;
  renderPackage?: PlaceableRenderPackage;
  assetContracts: PlaceableApiAssetContractsResult;
}

export interface PlaceableApiViewportRenderPayloadBatchResult {
  items: PlaceableApiViewportRenderPayload[];
}

export interface PlaceableRenderAssetDescriptor {
  assetId: string;
  role: PlaceableApiAssetRole;
  extension: string;
  fileName: string;
  contentType: string;
  deliveryUrl: string;
  sizeBytes: number;
}

export interface PlaceableRenderPreviewPayload {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  placeableSubtype: PlaceableApiSubtype;
  rendererPreset: string;
  frontendType: "placeable" | "door" | "vfx";
  cacheKey: string;
  previewImageUrl: string;
  assets: PlaceableRenderAssetDescriptor[];
}

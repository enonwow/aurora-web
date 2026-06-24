export type TemplateKind = "placeable" | "creature" | "item";
export type PlaceableSubtype =
  | "generic"
  | "door"
  | "vfx"
  | "container"
  | "light_source"
  | "trigger_proxy";
export type PlaceableSubtypeInput = PlaceableSubtype | "vvx" | "vvxy";

export type PlaceableAssetRole =
  | "model"
  | "texture"
  | "material"
  | "vfx"
  | "metadata"
  | "unknown";

export interface PlaceableAssetEntry {
  assetId: string;
  role: PlaceableAssetRole;
  fileName: string;
  objectKey: string;
  extension: string;
  sizeBytes: number;
  contentType: string;
  etag?: string;
}

export interface PlaceableAssetManifest {
  version: "placeable-asset-manifest/v1";
  source: "module-blob-snapshot";
  generatedAt: string;
  moduleHash?: string;
  assetCount: number;
  candidatesScanned: number;
  assets: PlaceableAssetEntry[];
}

export type PlaceableRenderPackageStatus =
  | "ready"
  | "unsupported"
  | "missing_derived"
  | "missing_assets";

export interface PlaceableRenderPackageDiagnostic {
  code: string;
  severity: "warn" | "error";
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
}

export interface PlaceableRenderPackageAuroraLightNode {
  source: PlaceableRenderPackageAuroraLightSource;
  sourceModelAssetId: string;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  nodeName: string;
  parentNodeName?: string;
  transform?: PlaceableRenderPackageAuroraEmitterTransform;
  radius?: number;
  multiplier?: number;
  color?: [number, number, number];
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  lightPriority?: number;
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

export interface PlaceableRenderPackageAuroraMaterialState {
  blending?: PlaceableRenderPackageAuroraMaterialBlending;
  auroraBlendField48?: number;
  auroraBlendField4c?: number;
  decal?: boolean;
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
  auroraEmitter?: PlaceableRenderPackageAuroraEmitter;
  auroraLight?: PlaceableRenderPackageAuroraLight;
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial;
}

export interface TemplateRecord {
  templateId: string;
  kind: TemplateKind;
  placeableSubtype?: PlaceableSubtype;
  benchmarkCandidate?: boolean;
  benchmarkBucket?: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata: Record<string, string | number | boolean>;
}

export interface TemplateListQuery {
  query?: string;
  category?: string;
  tag?: string;
  subtype?: PlaceableSubtype;
  benchmark?: boolean;
  limit: number;
  offset: number;
}

export interface TemplateListResult {
  items: TemplateRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlaceableProcessQuery {
  templateId?: string;
  resref?: string;
  subtypeHint?: PlaceableSubtypeInput;
  appearanceType?: number;
  genericType?: number;
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
}

export interface TemplateProcessQuery {
  templateId?: string;
  resref?: string;
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
}

export interface PlaceableRenderContract {
  backendType: PlaceableSubtype;
  frontendType: "placeable" | "door" | "vfx";
  rendererPreset:
    | "placeable-generic"
    | "placeable-container"
    | "placeable-light"
    | "placeable-trigger-proxy"
    | "door-standard"
    | "vfx-emitter";
  isDoor: boolean;
  isVfx: boolean;
}

export interface TemplateRenderContract {
  backendType: "creature" | "item";
  frontendType: "creature" | "item";
  rendererPreset: "creature-standard" | "item-standard";
}

export interface PlaceableRuntimeProjection {
  source: {
    fileType?: string;
    fileVersion?: string;
    structTypeId?: number;
  };
  identity: {
    templateResRef?: string;
    tag?: string;
    conversation?: string;
    keyName?: string;
  };
  interaction: {
    useable?: boolean;
    hasInventory?: boolean;
    bodyBag?: boolean;
    isStatic?: boolean;
    autoRemoveKey?: boolean;
    interruptable?: boolean;
  };
  locking: {
    factionId?: number;
    keyRequired?: boolean;
    lockable?: boolean;
    locked?: boolean;
    closeLockDc?: number;
    openLockDc?: number;
    invulnerable?: boolean;
  };
  trap: {
    trapDetectable?: boolean;
    trapDetectDc?: number;
    trapDisarmable?: boolean;
    disarmDc?: number;
    trapFlag?: boolean;
    trapOneShot?: boolean;
    trapType?: number;
  };
  state: {
    appearanceType?: number;
    animationState?: number;
    portraitId?: number;
    portraitResRef?: string;
    currentHitPoints?: number;
    hardness?: number;
    lightState?: number;
  };
  scripts: Record<string, string>;
}

export interface PlaceableValidationIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

export interface CreatureRuntimeProjection {
  source: {
    fileType?: string;
    fileVersion?: string;
    structTypeId?: number;
  };
  identity: {
    templateResRef?: string;
    firstName?: string;
    lastName?: string;
    description?: string;
    tag?: string;
    conversation?: string;
    gender?: number;
    race?: number;
    subrace?: string;
    deity?: string;
    phenotype?: number;
  };
  appearance: {
    appearanceType?: number;
    portraitId?: number;
    portraitResRef?: string;
    soundSetFile?: number;
    appearanceHead?: number;
    wingsNew?: number;
    tailNew?: number;
  };
  bodyParts: {
    rFoot?: number;
    lFoot?: number;
    rShin?: number;
    lShin?: number;
    lThigh?: number;
    rThigh?: number;
    pelvis?: number;
    torso?: number;
    belt?: number;
    neck?: number;
    rFArm?: number;
    lFArm?: number;
    rBicep?: number;
    lBicep?: number;
    rShoul?: number;
    lShoul?: number;
    rHand?: number;
    lHand?: number;
    robe?: number;
  };
  colors: {
    skin?: number;
    hair?: number;
    tattoo1?: number;
    tattoo2?: number;
  };
  faction: {
    factionId?: number;
  };
  stats: {
    challengeRating?: number;
    crAdjust?: number;
    perceptionRange?: number;
    naturalAc?: number;
    hitPoints?: number;
    currentHitPoints?: number;
    maxHitPoints?: number;
    reflexBonus?: number;
    willBonus?: number;
    fortitudeBonus?: number;
    goodEvil?: number;
    lawfulChaotic?: number;
  };
  lists: {
    classListCount?: number;
    skillListCount?: number;
    featListCount?: number;
    templateListCount?: number;
    specAbilityListCount?: number;
    equipItemListCount?: number;
  };
  scripts: Record<string, string>;
}

export interface CreatureValidationIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

export interface ItemRuntimeProjection {
  source: {
    fileType?: string;
    fileVersion?: string;
    structTypeId?: number;
  };
  identity: {
    templateResRef?: string;
    localizedName?: string;
    description?: string;
    identifiedDescription?: string;
    tag?: string;
  };
  classification: {
    baseItem?: number;
  };
  pricing: {
    addCost?: number;
    costTable?: number;
    costValue?: number;
  };
  state: {
    charges?: number;
    stackSize?: number;
    identified?: boolean;
    stolen?: boolean;
  };
  scripts: Record<string, string>;
}

export interface ItemValidationIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

export interface TemplateProcessingResult {
  templateId: string;
  kind: "creature" | "item";
  resref: string;
  name: string;
  category: string;
  benchmarkCandidate: boolean;
  benchmarkBucket?: string;
  metadata: Record<string, string | number | boolean>;
  render: TemplateRenderContract;
  creatureRuntime?: CreatureRuntimeProjection;
  creatureValidationIssues?: CreatureValidationIssue[];
  itemRuntime?: ItemRuntimeProjection;
  itemValidationIssues?: ItemValidationIssue[];
  processedAt: string;
}

export interface PlaceableBenchmarkRunQuery {
  templateIds?: string[];
  iterations: number;
  warmupIterations: number;
  bypassCache: boolean;
}

export interface BenchmarkDurationSummary {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface PlaceableBenchmarkResult {
  datasetFingerprint: string;
  config: {
    iterations: number;
    warmupIterations: number;
    bypassCache: boolean;
    candidates: number;
  };
  timing: {
    startedAt: string;
    finishedAt: string;
  };
  metrics: {
    overall: BenchmarkDurationSummary;
    perCandidate: Array<{
      templateId: string;
      resref: string;
      placeableSubtype: PlaceableSubtype;
      metrics: BenchmarkDurationSummary;
    }>;
  };
}

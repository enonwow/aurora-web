export type TemplateKind = "placeable" | "creature" | "item" | "encounter" | "store";
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
  tag?: string;
  localizedName?: string;
  description?: string;
  subtypeHint?: PlaceableSubtypeInput;
  appearanceType?: number;
  genericType?: number;
  bypassCache: boolean;
  includeBenchmarkMetadata: boolean;
}

export interface CreatureAppearanceProcessOverride {
  appearanceType?: number;
  appearanceHead?: number;
  wingsNew?: number;
  tailNew?: number;
  bodyParts?: {
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
  colors?: {
    skin?: number;
    hair?: number;
    tattoo1?: number;
    tattoo2?: number;
  };
}

export interface ItemVisualProcessOverride {
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  armorContext?: {
    modelPrefix?: string;
    label?: string;
    gender?: number;
    phenotype?: number;
    raceModel?: string;
  };
  armorParts?: {
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
  materialColors?: {
    leather1?: number;
    leather2?: number;
    cloth1?: number;
    cloth2?: number;
    metal1?: number;
    metal2?: number;
  };
}

export interface TemplateProcessQuery {
  templateId?: string;
  resref?: string;
  creatureMetadata?: Record<string, string | number | boolean>;
  creatureAppearanceOverride?: CreatureAppearanceProcessOverride;
  itemVisualOverride?: ItemVisualProcessOverride;
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
  backendType: "creature" | "item" | "encounter";
  frontendType: "creature" | "item" | "encounter";
  rendererPreset: "creature-standard" | "item-standard" | "encounter-standard";
}

export type CreatureRenderPackageStatus =
  | "ready"
  | "missing_profile"
  | "missing_derived"
  | "unsupported";

export interface CreatureRenderPackageDiagnostic {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
}

export interface CreatureRenderMaterialPipelineEvidence {
  source: "decompiled-aurora";
  pltVertexShaderName: string;
  pltFragmentShaderName: string;
  pltSchemeUniformPattern: string;
  pltSchemeUniformCount: number;
  pltReplacementUniformName: string;
  skinPaletteResRef: string;
}

export interface CreatureRenderSkeletonPipelineEvidence {
  source: "decompiled-aurora";
  supermodelCommandName: string;
  animationScaleCommandName: string;
  skinnedMeshNodeType: string;
  requiresComposedSkeleton: boolean;
}

export interface CreatureRenderAppearanceProfile {
  appearanceType?: number;
  appearanceLabel?: string;
  appearanceSource2daRow?: number;
  appearanceSourceKey?: string;
  modelType?: string;
  raceModel?: string;
  phenotype?: number;
  phenotypeLabel?: string;
  defaultPhenotype?: string;
  raceAppearanceId?: number;
  bloodColor?: string;
  weaponScale?: number;
  sizeCategory?: number;
  sizeCategoryLabel?: string;
  sizeCategorySource2daRow?: number;
  sizeCategorySourceKey?: string;
}

export interface CreatureRenderSourceModelCandidate {
  resref: string;
  role: "appearance-race-model";
  source: "appearance.2da.RACE";
  confidence: "direct-model" | "assembly-prefix";
  assetId?: string;
  modelUrl?: string;
  glbUrl?: string;
  supermodelResRef?: string;
  supermodelAssetId?: string;
  supermodelModelUrl?: string;
  supermodelGlbUrl?: string;
  supermodelChainResRefs?: string[];
  supermodelChainAssetIds?: string[];
  supermodelChainModelUrls?: string[];
  supermodelChainGlbUrls?: string[];
}

export interface CreatureRenderSkeletonModelCandidate {
  resref: string;
  role: "base-skeleton";
  source: "part-model-prefix";
  modelPrefix: string;
  confidence: "prefix-derived";
  assetId?: string;
  modelUrl?: string;
  glbUrl?: string;
  supermodelResRef?: string;
  supermodelAssetId?: string;
  supermodelModelUrl?: string;
  supermodelGlbUrl?: string;
  supermodelChainResRefs?: string[];
  supermodelChainAssetIds?: string[];
  supermodelChainModelUrls?: string[];
  supermodelChainGlbUrls?: string[];
}

export type CreatureRenderPartSlot =
  | "head"
  | "wings"
  | "tail"
  | "rFoot"
  | "lFoot"
  | "rShin"
  | "lShin"
  | "lThigh"
  | "rThigh"
  | "pelvis"
  | "torso"
  | "belt"
  | "neck"
  | "rFArm"
  | "lFArm"
  | "rBicep"
  | "lBicep"
  | "rShoul"
  | "lShoul"
  | "rHand"
  | "lHand"
  | "robe";

export interface CreatureRenderPartModelCandidate {
  slot: CreatureRenderPartSlot;
  partId: number;
  partModelName: string;
  nodeName?: string;
  modelPrefix?: string;
  modelResRef?: string;
  modelResRefPattern?: "aurora-player-body-part";
  modelResRefPatternFormat?: string;
  assetId?: string;
  modelUrl?: string;
  glbUrl?: string;
  source:
    | "capart.2da.MDLNAME"
    | "utc.Appearance_Head"
    | "wingmodel.2da.MODEL"
    | "tailmodel.2da.MODEL";
  source2daRow?: number;
  sourceKey: string;
  materialColors?: {
    leather1?: number;
    leather2?: number;
    cloth1?: number;
    cloth2?: number;
    metal1?: number;
    metal2?: number;
  };
}

export interface CreatureRenderEquipmentModelPartCandidate {
  resref: string;
  role?: string;
  partId?: number;
  assetId?: string;
  modelUrl?: string;
  glbUrl?: string;
  supermodelResRef?: string;
  supermodelAssetId?: string;
  supermodelModelUrl?: string;
  supermodelGlbUrl?: string;
  supermodelChainResRefs?: string[];
  supermodelChainAssetIds?: string[];
  supermodelChainModelUrls?: string[];
  supermodelChainGlbUrls?: string[];
}

export interface CreatureRenderEquipmentModelCandidate {
  resref: string;
  itemTemplateId?: string;
  itemResref?: string;
  itemSourceObjectKey?: string;
  slotMask?: number;
  slotLabels: string[];
  attachmentTargets: string[];
  primaryAttachmentTarget?: string;
  baseItem?: number;
  baseItemEquipableSlots?: string;
  weaponWield?: number;
  weaponType?: number;
  weaponSize?: number;
  rangedWeapon?: number;
  rotateOnGround?: number;
  ammunitionType?: number;
  itemName?: string;
  itemModelType?: string;
  itemModelParts?: number[];
  itemModelPartRoles?: string[];
  itemModelPartResRefs?: string[];
  itemModelPartCandidates?: CreatureRenderEquipmentModelPartCandidate[];
  itemModelPartSourceKey?: string;
  itemProperties?: ItemRuntimeProjection["itemProperties"];
  source: "utc.Equip_ItemList";
  sourceModelStatus: "metadata-only" | "model-parts-ready" | "model-resrefs-ready";
}

export interface CreatureRenderSourceMdlInspectionNode {
  name: string;
  nodeType: string;
  parentName?: string;
  position?: [number, number, number];
  orientation?: [number, number, number, number];
  orientationFormat?: "axis-angle" | "quaternion";
  scale?: number;
}

export interface CreatureRenderSourceMdlInspectionAnimation {
  name: string;
  targetModel?: string;
  animRoot?: string;
  animationScale?: number;
  lengthSeconds: number;
  transitionSeconds: number;
  events?: Array<{
    timeSeconds: number;
    name: string;
  }>;
  nodeCount: number;
  nodeNames: string[];
  positionKeyCount: number;
  orientationKeyCount: number;
  scaleKeyCount: number;
  alphaKeyCount?: number;
  danglyNodeCount: number;
  animmeshNodeCount: number;
}

export interface CreatureRenderSourceMdlInspectionModel {
  source: PlaceableRenderPackageAuroraEmitterSource;
  sourceModelAssetId: string;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  modelName: string;
  supermodel?: string;
  animationScale?: number;
  nodeCount: number;
  rootNodeNames: string[];
  nodeTypes: string[];
  nodeTypeCounts: Record<string, number>;
  nodes: CreatureRenderSourceMdlInspectionNode[];
  animationCount: number;
  animationNames: string[];
  animations: CreatureRenderSourceMdlInspectionAnimation[];
  meshCount: number;
  textureReferences: string[];
}

export interface CreatureRenderSourceMdlInspection {
  source: "source-mdl";
  models: CreatureRenderSourceMdlInspectionModel[];
  diagnostics: CreatureRenderPackageDiagnostic[];
}

export interface CreatureRenderPackage {
  status: CreatureRenderPackageStatus;
  diagnostics: CreatureRenderPackageDiagnostic[];
  rendererPreset: "creature-standard";
  appearanceProfile?: CreatureRenderAppearanceProfile;
  sourceModelCandidates: CreatureRenderSourceModelCandidate[];
  skeletonModelCandidates: CreatureRenderSkeletonModelCandidate[];
  partModelCandidates: CreatureRenderPartModelCandidate[];
  equipmentModelCandidates: CreatureRenderEquipmentModelCandidate[];
  assetRefs?: PlaceableRenderPackageAssetRefs;
  modelUrl?: string;
  glbUrl?: string;
  textureUrls?: string[];
  textureBindings?: PlaceableRenderPackageTextureBinding[];
  auroraEmitter?: PlaceableRenderPackageAuroraEmitter;
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial;
  auroraLight?: PlaceableRenderPackageAuroraLight;
  sourceMdlInspection?: CreatureRenderSourceMdlInspection;
  materialPipelineEvidence?: CreatureRenderMaterialPipelineEvidence;
  skeletonPipelineEvidence?: CreatureRenderSkeletonPipelineEvidence;
  bodyParts: CreatureRuntimeProjection["bodyParts"];
  colors: CreatureRuntimeProjection["colors"];
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
    lightStateSource?: string;
    lightStateProofStatus?: string;
    lightStateDefaulted?: boolean;
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
    etag?: string;
    fileType?: string;
    fileVersion?: string;
    structTypeId?: number;
    modelResRef?: string;
  };
  identity: {
    templateResRef?: string;
    firstName?: string;
    firstNameStrRef?: number;
    lastName?: string;
    lastNameStrRef?: number;
    localizedName?: string;
    localizedNameStrRef?: number;
    displayName?: string;
    description?: string;
    descriptionStrRef?: number;
    identifiedDescription?: string;
    identifiedDescriptionStrRef?: number;
    comments?: string;
    paletteId?: number;
    tag?: string;
    conversation?: string;
    gender?: number;
    genderLabel?: string;
    genderLabelSource2daRow?: number;
    genderLabelSourceKey?: string;
    race?: number;
    raceLabel?: string;
    raceLabelSource2daRow?: number;
    raceLabelSourceKey?: string;
    raceAppearanceId?: number;
    subrace?: string;
    subraceStrRef?: number;
    deity?: string;
    deityStrRef?: number;
    phenotype?: number;
    phenotypeLabel?: string;
    phenotypeLabelSource2daRow?: number;
    phenotypeLabelSourceKey?: string;
  };
  appearance: {
    appearanceType?: number;
    appearanceLabel?: string;
    appearanceLabelSource2daRow?: number;
    appearanceLabelSourceKey?: string;
    appearanceModelType?: string;
    appearanceRaceModel?: string;
    appearancePortrait2da?: string;
    appearanceEnvMap?: string;
    appearanceDefaultPhenotype?: string;
    appearanceBloodColor?: string;
    appearanceWeaponScale?: number;
    appearanceSizeCategory?: number;
    appearanceSizeCategoryLabel?: string;
    appearanceSizeCategorySource2daRow?: number;
    appearanceSizeCategorySourceKey?: string;
    portraitId?: number;
    portraitIdEffective?: number;
    portraitResRef?: string;
    portraitResolvedResRef?: string;
    portraitResolvedSource2daRow?: number;
    portraitResolvedSourceKey?: string;
    soundSetFile?: number;
    soundSetLabel?: string;
    soundSetResRef?: string;
    soundSetSource2daRow?: number;
    soundSetSourceKey?: string;
    appearanceHead?: number;
    wingsNew?: number;
    tailNew?: number;
  };
  state: {
    plot?: boolean;
    isPc?: boolean;
    isImmortal?: boolean;
    lootable?: boolean;
    interruptable?: boolean;
    noPermDeath?: boolean;
    bodyBag?: boolean;
    startingPackage?: boolean;
    decayTime?: number;
    walkRate?: number;
    walkRateSource2daRow?: number;
    walkRateSource2daName?: string;
    walkRateSpeed2daRow?: number;
    walkRateAppearance2daSourceKey?: string;
    walkRateSpeed2daSourceKey?: string;
    animationState?: number;
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
  partModelCandidates: CreatureRenderPartModelCandidate[];
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
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    strengthAdjust?: number;
    dexterityAdjust?: number;
    constitutionAdjust?: number;
    intelligenceAdjust?: number;
    wisdomAdjust?: number;
    charismaAdjust?: number;
    goodEvil?: number;
    lawfulChaotic?: number;
  };
  combat: {
    disarmable?: boolean;
  };
  effective: {
    challengeRating: number;
    factionId: number;
    goodEvil: number;
    lawfulChaotic: number;
    perceptionRange: number;
    disarmable: boolean;
    plot: boolean;
    isPc: boolean;
    isImmortal: boolean;
    lootable: boolean;
    interruptable: boolean;
    noPermDeath: boolean;
    bodyBag: boolean;
    startingPackage: boolean;
    decayTime: number;
    walkRate?: number;
  };
  lists: {
    classListCount?: number;
    skillListCount?: number;
    featListCount?: number;
    templateListCount?: number;
    specAbilityListCount?: number;
    inventoryItemListCount?: number;
    equipItemListCount?: number;
    classes?: Array<{
      classId?: number;
      classLabel?: string;
      classLabelSource2daRow?: number;
      classLabelSourceKey?: string;
      level?: number;
      knownSpellCount?: number;
      memorizedSpellCount?: number;
      knownSpells?: Array<{
        spellId?: number;
        spellLevel?: number;
        metaMagic?: number;
        flags?: number;
        spellLabel?: string;
        spellLabelSource2daRow?: number;
        spellLabelSourceKey?: string;
      }>;
      memorizedSpells?: Array<{
        spellId?: number;
        spellLevel?: number;
        metaMagic?: number;
        flags?: number;
        spellLabel?: string;
        spellLabelSource2daRow?: number;
        spellLabelSourceKey?: string;
      }>;
    }>;
    feats?: Array<{
      featId?: number;
      featLabel?: string;
      featLabelSource2daRow?: number;
      featLabelSourceKey?: string;
    }>;
    templates?: Array<{ templateId?: number }>;
    specialAbilities?: Array<{
      spellId?: number;
      flags?: number;
      casterLevel?: number;
      spellLabel?: string;
      spellLabelSource2daRow?: number;
      spellLabelSourceKey?: string;
    }>;
    inventoryItems?: Array<{
      resRef?: string;
      itemTemplateId?: string;
      itemResref?: string;
      itemSourceFingerprint?: string;
      itemSourceObjectKey?: string;
      itemRuntime?: ItemRuntimeProjection;
      x?: number;
      y?: number;
      dropable?: boolean;
      pickpocketable?: boolean;
      infinite?: boolean;
    }>;
    equippedItems?: Array<{
      resRef?: string;
      itemTemplateId?: string;
      itemResref?: string;
      itemSourceFingerprint?: string;
      itemSourceObjectKey?: string;
      itemRuntime?: ItemRuntimeProjection;
      slotMask?: number;
      dropable?: boolean;
      pickpocketable?: boolean;
      infinite?: boolean;
    }>;
    skills?: Array<{
      skillId?: number;
      skillLabel?: string;
      skillLabelSource2daRow?: number;
      skillLabelSourceKey?: string;
      rank?: number;
    }>;
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
    baseItemLabel?: string;
    baseItemSourceKey?: string;
    itemClass?: string;
    defaultIcon?: string;
    invSlotWidth?: number;
    invSlotHeight?: number;
    canRotateIcon?: number;
    equipableSlots?: string;
    baseCost?: number;
    stacking?: number;
    itemMultiplier?: number;
    maxProps?: number;
    minProps?: number;
    propColumn?: string;
    storePanel?: number;
    storePanelSort?: number;
    chargesStarting?: number;
    ilrStackSize?: number;
    weaponWield?: number;
    weaponType?: number;
    weaponSize?: number;
    rangedWeapon?: number;
    rotateOnGround?: number;
    weaponMatType?: number;
    ammunitionType?: number;
    arcaneSpellFailure?: number;
  };
  visual: {
    baseItemModelType?: string;
    baseItemDefaultModel?: string;
    baseItemModelSourceKey?: string;
    modelPart1?: number;
    modelPart2?: number;
    modelPart3?: number;
    modelParts: number[];
    modelPartRoles: string[];
    modelPartResRefs: string[];
    modelPartResRefRoles: string[];
    cloakModelRow?: number;
    cloakModel?: number;
    cloakTexture?: number;
    cloakIcon?: number;
    cloakModelResRef?: string;
    cloakTextureResRef?: string;
    cloakIconResRef?: string;
    cloakHiddenSlots: string[];
    cloakSourceKey?: string;
    armorPreviewContext?: {
      modelPrefix: string;
      sourceKey: string;
      label?: string;
      gender?: number;
      phenotype?: number;
      raceModel?: string;
    };
    armorRobeHiddenSlots: string[];
    armorPartModelCandidates: Array<{
      slot: string;
      partId: number;
      partModelName: string;
      nodeName?: string;
      modelPrefix: string;
      modelResRef: string;
      modelResRefPattern?: "aurora-player-body-part";
      modelResRefPatternFormat?: string;
      source2daRow?: number;
      sourceKey: string;
    }>;
    armorParts: {
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
    materialColors: {
      leather1?: number;
      leather2?: number;
      cloth1?: number;
      cloth2?: number;
      metal1?: number;
      metal2?: number;
    };
  };
  pricing: {
    cost?: number;
    addCost?: number;
    costTable?: number;
    costValue?: number;
    armorPartCostModifiers?: {
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
    armorPartCostModifierTotal?: number;
    armorPartCostModifierResolvedCount?: number;
    armorPartCostModifierUnresolvedCount?: number;
  };
  state: {
    plot?: boolean;
    cursed?: boolean;
    charges?: number;
    stackSize?: number;
    identified?: boolean;
    stolen?: boolean;
  };
  palette: {
    comments?: string;
    paletteId?: number;
  };
  itemProperties: Array<{
    propertyName?: number;
    propertyLabel?: string;
    subtype?: number;
    costTable?: number;
    costValue?: number;
    param1?: number;
    param1Value?: number;
    chanceAppear?: number;
    propertyDefinitionSource2daRow?: number;
    propertyDefinitionSourceKey?: string;
    subTypeTable?: string;
    costTableDefinition?: string;
    param1Table?: string;
    nameStrRef?: number;
    gameStrRef?: number;
    descriptionStrRef?: number;
  }>;
  scripts: Record<string, string>;
}

export interface ItemValidationIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

export interface EncounterRuntimeProjection {
  source: {
    etag?: string;
    fileType?: string;
    fileVersion?: string;
    structTypeId?: number;
  };
  identity: {
    templateResRef?: string;
    localizedName?: string;
    tag?: string;
    description?: string;
  };
  settings: {
    active?: boolean;
    difficulty?: number;
    difficultyIndex?: number;
    factionId?: number;
    maxCreatures?: number;
    recCreatures?: number;
    playerOnly?: boolean;
    reset?: boolean;
    resetTime?: number;
    respawns?: number;
    spawnOption?: number;
  };
  creatureList?: Array<{
    resRef?: string;
    appearance?: number;
    challengeRating?: number;
    singleSpawn?: boolean;
  }>;
  scripts: Record<string, string>;
}

export interface EncounterValidationIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

export interface TemplateProcessingResult {
  templateId: string;
  kind: "creature" | "item" | "encounter";
  resref: string;
  name: string;
  category: string;
  benchmarkCandidate: boolean;
  benchmarkBucket?: string;
  metadata: Record<string, string | number | boolean>;
  render: TemplateRenderContract;
  assetManifest?: PlaceableAssetManifest;
  creatureRenderPackage?: CreatureRenderPackage;
  creatureRuntime?: CreatureRuntimeProjection;
  creatureValidationIssues?: CreatureValidationIssue[];
  itemRuntime?: ItemRuntimeProjection;
  itemValidationIssues?: ItemValidationIssue[];
  encounterRuntime?: EncounterRuntimeProjection;
  encounterValidationIssues?: EncounterValidationIssue[];
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

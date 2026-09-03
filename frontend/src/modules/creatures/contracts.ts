import type {
  PlaceableRenderPackageAuroraEmitter,
  PlaceableRenderPackageAuroraLight,
  PlaceableRenderPackageAuroraMaterial,
  PlaceableRenderPackageTextureBinding
} from "../placeables/contracts";

export type CreatureApiMetadataPrimitive = string | number | boolean;

export interface CreatureApiAppearanceRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export type CreatureApiAppearanceRow = {
  rowIndex: number;
  displayName: string;
  displaySource: "strref" | "strref_id" | "label";
  strRef?: number;
  label?: string;
};

export interface CreatureApiAppearanceRowsResult {
  resourceName: "appearance.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiAppearanceRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiGenderRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export type CreatureApiGenderRow = {
  rowIndex: number;
  displayName: string;
  displaySource: "strref" | "strref_id";
  nameStrRef: number;
  genderToken: string;
  constant?: string;
};

export interface CreatureApiGenderRowsResult {
  resourceName: "gender.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiGenderRow[];
  total: number;
  limit: number;
  offset: number;
}

export type CreatureApiAppendageKind = "wings" | "tail";

export interface CreatureApiAppendageRowsQuery {
  kind: CreatureApiAppendageKind;
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiAppendageRow {
  rowIndex: number;
  displayName: string;
}

export interface CreatureApiAppendageRowsResult {
  resourceName: "wingmodel.2da" | "tailmodel.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiAppendageRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiPerceptionRangeRowsQuery {
  tableSha256: string;
  rowIndex?: 8 | 9 | 10 | 11;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiPerceptionRangeRow {
  rowIndex: 8 | 9 | 10 | 11;
  displayName: string;
  displaySource: "strref" | "strref_id";
  nameStrRef: number;
}

export interface CreatureApiPerceptionRangeRowsResult {
  resourceName: "ranges.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiPerceptionRangeRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiWalkRateRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiWalkRateRow {
  rowIndex: number;
  displayName: string;
  displaySource: "strref" | "strref_id";
  nameStrRef: number;
  twoDaName: string;
}

export interface CreatureApiWalkRateRowsResult {
  resourceName: "creaturespeed.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiWalkRateRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiSoundSetRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export type CreatureApiSoundSetRow = {
  rowIndex: number;
  displayName: string;
  displaySource: "strref" | "strref_id" | "label";
  nameStrRef: number | null;
  resRef: string;
};

export interface CreatureApiSoundSetRowsResult {
  resourceName: "soundset.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiSoundSetRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiStartingPackageRowsQuery {
  tableSha256: string;
  classIds: readonly number[];
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export type CreatureApiStartingPackageRow = {
  rowIndex: number;
  classId: number;
  displayName: string;
  displaySource: "strref" | "strref_id" | "label";
  nameStrRef: number | null;
};

export interface CreatureApiStartingPackageRowsResult {
  resourceName: "packages.2da";
  sha256: string;
  rowCount: number;
  classIds: number[];
  items: CreatureApiStartingPackageRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiClassRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiClassRow {
  rowIndex: number;
  displayName: string;
  displaySource: "strref" | "strref_id";
  nameStrRef: number;
}

export interface CreatureApiClassRowsResult {
  resourceName: "classes.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiClassRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiSkillRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiSkillRow {
  rowIndex: number;
  nameStrRef: number;
  displayName: string;
}

export interface CreatureApiSkillRowsResult {
  resourceName: "skills.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiSkillRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiFeatRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiFeatRow {
  rowIndex: number;
  featNameStrRef: number;
  descriptionStrRef?: number;
  toolsCategory: number;
  displayName: string;
}

export interface CreatureApiFeatRowsResult {
  resourceName: "feat.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiFeatRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiSpecialAbilityRowsQuery {
  tableSha256: string;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiSpecialAbilityRow {
  rowIndex: number;
  nameStrRef: number;
  spellDescStrRef?: number;
  userType: 1 | 2;
  displayName: string;
}

export interface CreatureApiSpecialAbilityRowsResult {
  resourceName: "spells.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiSpecialAbilityRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiPhenotypeRowsQuery {
  tableSha256: string;
  appearanceTableSha256: string;
  appearanceRowCount: number;
  appearanceType: number;
  rowIndex?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

export type CreatureApiPhenotypeRow = {
  rowIndex: number;
  displayName: string;
  displaySource: "strref" | "strref_id";
  nameStrRef: number;
  label?: string;
};

export interface CreatureApiPhenotypeRowsResult {
  resourceName: "phenotype.2da";
  sha256: string;
  rowCount: number;
  items: CreatureApiPhenotypeRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatureApiProcessPayload {
  templateId?: string;
  resref?: string;
  creatureMetadata?: Record<string, CreatureApiMetadataPrimitive>;
  creatureAppearanceOverride?: {
    appearanceType?: number;
    phenotype?: number;
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
  };
  bypassCache?: boolean;
  includeBenchmarkMetadata?: boolean;
}

export interface CreatureApiCacheDescriptor {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface CreatureApiRenderContract {
  backendType: "creature";
  frontendType: "creature";
  rendererPreset: "creature-standard";
}

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

export interface CreatureRenderEquipmentItemProperty {
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
  itemProperties?: CreatureRenderEquipmentItemProperty[];
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
  source: "aurora-mdl-binary" | "aurora-mdl-ascii";
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
  status: "ready" | "missing_profile" | "missing_derived" | "unsupported";
  diagnostics: CreatureRenderPackageDiagnostic[];
  rendererPreset: "creature-standard";
  appearanceProfile?: CreatureRenderAppearanceProfile;
  sourceModelCandidates: CreatureRenderSourceModelCandidate[];
  skeletonModelCandidates: CreatureRenderSkeletonModelCandidate[];
  partModelCandidates: CreatureRenderPartModelCandidate[];
  equipmentModelCandidates: CreatureRenderEquipmentModelCandidate[];
  assetRefs?: {
    modelAssetIds?: string[];
    derivedModelAssetIds?: string[];
    chunkModelAssetIds?: string[];
    textureAssetIds?: string[];
    materialAssetIds?: string[];
    metadataAssetIds?: string[];
    otherAssetIds?: string[];
  };
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
  bodyParts: Record<string, number | undefined>;
  colors: Record<string, number | undefined>;
}

export interface CreatureApiProcessedPayload {
  templateId: string;
  kind: "creature";
  resref: string;
  name: string;
  category: string;
  benchmarkCandidate: boolean;
  benchmarkBucket?: string;
  metadata?: Record<string, CreatureApiMetadataPrimitive>;
  render: CreatureApiRenderContract;
  creatureRenderPackage?: CreatureRenderPackage;
  creatureRuntime?: unknown;
  creatureValidationIssues?: CreatureRenderPackageDiagnostic[];
  processedAt: string;
}

export interface CreatureApiProcessResult {
  cache: CreatureApiCacheDescriptor;
  creature: CreatureApiProcessedPayload;
}

export type CreatureApiBlueprintFields = Record<string, unknown>;

export interface CreatureApiBlueprintCreatePayload {
  templateResRef: string;
  name: string;
  blueprint: CreatureApiBlueprintFields;
  overwrite: boolean;
}

export interface CreatureApiBlueprintDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export type CreatureApiBlueprintCreateResult = CreatureApiProcessResult & {
  blueprint: CreatureApiBlueprintDescriptor;
};

export interface CreatureApiBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}

export type CreatureApiResourceOptionKind = "conversation" | "portrait" | "script" | "soundset";

export interface CreatureApiResourceOption {
  resRef: string;
  label: string;
  soundSetFile?: number;
}

export interface CreatureApiResourceOptionsResult {
  kind: CreatureApiResourceOptionKind;
  items: CreatureApiResourceOption[];
  total: number;
}

export interface CreatureApiListQuery {
  query?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface CreatureApiListItem {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata?: Record<string, CreatureApiMetadataPrimitive>;
}

export interface CreatureApiListResult {
  items: CreatureApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

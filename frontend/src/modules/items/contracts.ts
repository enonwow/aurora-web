export type ItemApiMetadataPrimitive = string | number | boolean;

export interface ItemApiVisualOverride {
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

export interface ItemApiProcessPayload {
  templateId?: string;
  resref?: string;
  itemVisualOverride?: ItemApiVisualOverride;
  bypassCache?: boolean;
  includeBenchmarkMetadata?: boolean;
}

export interface ItemApiBlueprintPropertyEntry {
  propertyName: number;
  subtype?: number;
  costTable?: number;
  costValue?: number;
  param1?: number;
  param1Value?: number;
  chanceAppear?: number;
}

export type ItemApiBlueprintVariableEntry =
  | { name: string; type: "int"; value: number }
  | { name: string; type: "float"; value: number }
  | { name: string; type: "string"; value: string };

export interface ItemApiBlueprintInventoryEntry {
  resRef: string;
  x: number;
  y: number;
}

export interface ItemApiBlueprintEquipmentEntry {
  resRef: string;
  slotMask: number;
}

export interface ItemApiBlueprintCreatePayload {
  templateResRef: string;
  name: string;
  localizedNameStrRef?: number;
  tag?: string;
  description?: string;
  descriptionStrRef?: number;
  identifiedDescription?: string;
  identifiedDescriptionStrRef?: number;
  comments?: string;
  paletteId?: number;
  baseItem: number;
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  cost?: number;
  addCost?: number;
  charges?: number;
  stackSize?: number;
  identified?: boolean;
  stolen?: boolean;
  plot?: boolean;
  cursed?: boolean;
  armorContext?: ItemApiVisualOverride["armorContext"];
  armorParts?: ItemApiVisualOverride["armorParts"];
  materialColors?: ItemApiVisualOverride["materialColors"];
  propertyList?: ItemApiBlueprintPropertyEntry[];
  variableListEntries?: ItemApiBlueprintVariableEntry[];
  inventoryItemListEntries?: ItemApiBlueprintInventoryEntry[];
  equipItemListEntries?: ItemApiBlueprintEquipmentEntry[];
  overwrite?: boolean;
}

export interface ItemApiCacheDescriptor {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface ItemApiRenderContract {
  backendType: "item";
  frontendType: "item";
  rendererPreset: "item-standard";
}

export interface ItemApiAssetManifestAsset {
  assetId: string;
  role: string;
  fileName: string;
  objectKey: string;
  extension: string;
  sizeBytes: number;
  contentType: string;
  etag?: string;
}

export interface ItemApiAssetManifest {
  version: "placeable-asset-manifest/v1";
  source: "module-blob-snapshot";
  generatedAt: string;
  moduleHash?: string;
  assetCount: number;
  candidatesScanned: number;
  assets: ItemApiAssetManifestAsset[];
}

export interface ItemApiProcessedPayload {
  templateId: string;
  kind: "item";
  resref: string;
  name: string;
  category: string;
  benchmarkCandidate: boolean;
  benchmarkBucket?: string;
  metadata?: Record<string, ItemApiMetadataPrimitive>;
  render: ItemApiRenderContract;
  assetManifest?: ItemApiAssetManifest;
  itemRuntime?: unknown;
  itemValidationIssues?: unknown[];
  processedAt: string;
}

export interface ItemApiProcessResult {
  cache: ItemApiCacheDescriptor;
  item: ItemApiProcessedPayload;
}

export interface ItemApiBlueprintDescriptor {
  templateId: string;
  resref: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
}

export interface ItemApiBlueprintCreateResult extends ItemApiProcessResult {
  blueprint: ItemApiBlueprintDescriptor;
}

export interface ItemApiBlueprintDeleteResult {
  resref: string;
  objectKey: string;
  deleted: boolean;
}

export interface ItemApiPropertyDictionaryOption {
  rowId: number;
  label?: string;
  nameStrRef?: number;
  value?: number;
  cost?: number;
  potionCost?: number;
  wandCost?: number;
  casterLevel?: number;
  innateLevel?: number;
  spellIndex?: number;
  potionUse?: boolean;
  wandUse?: boolean;
  generalUse?: boolean;
  icon?: string;
  sourceKey: string;
}

export interface ItemApiPropertyDictionaryEntry {
  propertyName: number;
  label: string;
  propertyLabel?: string;
  cost?: number;
  nameStrRef?: number;
  gameStrRef?: number;
  descriptionStrRef?: number;
  subTypeTable?: string;
  costTableIndex?: number;
  costTableLabel?: string;
  costTableDefinition?: string;
  param1TableIndex?: number;
  param1TableLabel?: string;
  param1Table?: string;
  subtypeOptions: ItemApiPropertyDictionaryOption[];
  costValueOptions: ItemApiPropertyDictionaryOption[];
  param1Options: ItemApiPropertyDictionaryOption[];
}

export interface ItemApiPropertyDictionaryResult {
  generatedAt: string;
  properties: ItemApiPropertyDictionaryEntry[];
}

export interface ItemApiBaseItemEntry {
  baseItem: number;
  sourceKey: string;
  label?: string;
  nameStrRef?: number;
  itemClass?: string;
  modelType?: string;
  defaultModel?: string;
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
  weaponMatType?: number;
  ammunitionType?: number;
  arcaneSpellFailure?: number;
  reqFeats?: number[];
}

export interface ItemApiBaseItemsResult {
  generatedAt: string;
  sourceKey?: string;
  count: number;
  items: ItemApiBaseItemEntry[];
}

export type ItemApiPaletteTreeNodeKind = "folder" | "leaf" | "category";

export interface ItemApiPaletteTreeNode {
  nodeId: string;
  kind: ItemApiPaletteTreeNodeKind;
  depth: number;
  label: string;
  strRef?: number;
  id?: number;
  resRef?: string;
  name?: string;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  children: ItemApiPaletteTreeNode[];
}

export interface ItemApiPaletteTreeSource {
  resref: string;
  objectKey: string;
  fileName: string;
  sourceFileType: string;
  sourceFileVersion: string;
  rootCount: number;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
  selected: boolean;
}

export interface ItemApiPaletteTreeResult {
  generatedAt: string;
  activeSource?: string;
  sources: ItemApiPaletteTreeSource[];
  rootCount: number;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
  roots: ItemApiPaletteTreeNode[];
}

export interface ItemApiGeneratorSupportSource {
  objectKey: string;
  fileName: string;
  sizeBytes: number;
  source: "module-snapshot" | "local-retail-extract";
  header: string;
  classification: "gff-candidate" | "ltr-lexicon" | "unknown";
  supported: boolean;
  parseable: boolean;
  reason: string;
}

export interface ItemApiGeneratorSupportResult {
  generatedAt: string;
  supported: boolean;
  status: "ready" | "unsupported" | "no-sources";
  sourceCount: number;
  gffCandidateCount: number;
  parseableGffCount: number;
  ltrLexiconCount: number;
  parserImplemented: boolean;
  sources: ItemApiGeneratorSupportSource[];
  notes: string[];
}

export interface ItemApiCustomPaletteNodePayload {
  label?: string;
  strRef?: number;
  id?: number;
  resRef?: string;
  children?: ItemApiCustomPaletteNodePayload[];
}

export interface ItemApiCustomPaletteWritePayload {
  roots: ItemApiCustomPaletteNodePayload[];
}

export interface ItemApiCustomPaletteWriteDescriptor {
  resref: "itempalcus";
  objectKey: string;
  fileName: string;
  sizeBytes: number;
  etag?: string;
  sourceFileType: string;
  sourceFileVersion: string;
  rootCount: number;
  leafCount: number;
  folderCount: number;
  categoryLeafCount: number;
  maxDepth: number;
}

export interface ItemApiCustomPaletteWriteResult {
  palette: ItemApiCustomPaletteWriteDescriptor;
  tree: ItemApiPaletteTreeResult;
}

export interface ItemApiListQuery {
  query?: string;
  category?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface ItemApiListItem {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  previewImageUrl: string;
  metadata?: Record<string, ItemApiMetadataPrimitive>;
}

export interface ItemApiListResult {
  items: ItemApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

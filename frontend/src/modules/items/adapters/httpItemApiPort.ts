import { z } from "zod";
import type {
  ItemApiBaseItemEntry,
  ItemApiBaseItemsResult,
  ItemApiBlueprintCreatePayload,
  ItemApiBlueprintCreateResult,
  ItemApiBlueprintDeleteResult,
  ItemApiBlueprintDescriptor,
  ItemApiCustomPaletteWritePayload,
  ItemApiCustomPaletteWriteResult,
  ItemApiGeneratorSupportResult,
  ItemApiListItem,
  ItemApiListQuery,
  ItemApiListResult,
  ItemApiMetadataPrimitive,
  ItemApiPaletteTreeNode,
  ItemApiPaletteTreeResult,
  ItemApiProcessPayload,
  ItemApiProcessResult,
  ItemApiProcessedPayload,
  ItemApiPropertyDictionaryEntry,
  ItemApiPropertyDictionaryOption,
  ItemApiPropertyDictionaryResult
} from "../contracts";
import type { ItemApiPort } from "../ports/itemApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const defaultFetch: FetchLike = (input, init) => globalThis.fetch(input, init);

export class ItemApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "ItemApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const itemMetadataPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

const itemListItemSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  previewImageUrl: z.string(),
  metadata: z.record(itemMetadataPrimitiveSchema).optional()
});

const itemListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(itemListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const itemRenderSchema = z.object({
  backendType: z.literal("item"),
  frontendType: z.literal("item"),
  rendererPreset: z.literal("item-standard")
});

const itemAssetManifestAssetSchema = z.object({
  assetId: z.string().min(1),
  role: z.string().min(1),
  fileName: z.string().min(1),
  objectKey: z.string().min(1),
  extension: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  contentType: z.string().min(1),
  etag: z.string().optional()
});

const itemAssetManifestSchema = z.object({
  version: z.literal("placeable-asset-manifest/v1"),
  source: z.literal("module-blob-snapshot"),
  generatedAt: z.string().min(1),
  moduleHash: z.string().optional(),
  assetCount: z.number().int().nonnegative(),
  candidatesScanned: z.number().int().nonnegative(),
  assets: z.array(itemAssetManifestAssetSchema)
});

const itemProcessedPayloadSchema = z.object({
  templateId: z.string().min(1),
  kind: z.literal("item"),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  benchmarkCandidate: z.boolean(),
  benchmarkBucket: z.string().optional(),
  metadata: z.record(itemMetadataPrimitiveSchema).optional(),
  render: itemRenderSchema,
  assetManifest: itemAssetManifestSchema.optional(),
  itemRuntime: z.unknown().optional(),
  itemValidationIssues: z.array(z.unknown()).optional(),
  processedAt: z.string().min(1)
});

const itemProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    item: itemProcessedPayloadSchema
  })
});

const itemBlueprintDescriptorSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  objectKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().optional(),
  sourceFileType: z.string().min(1),
  sourceFileVersion: z.string().min(1)
});

const itemBlueprintCreateEnvelopeSchema = z.object({
  data: z.object({
    blueprint: itemBlueprintDescriptorSchema,
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    item: itemProcessedPayloadSchema
  })
});

const itemBlueprintDeleteEnvelopeSchema = z.object({
  data: z.object({
    resref: z.string().min(1),
    objectKey: z.string().min(1),
    deleted: z.boolean()
  })
});

const itemPropertyDictionaryOptionSchema = z.object({
  rowId: z.number().int().nonnegative(),
  label: z.string().optional(),
  nameStrRef: z.number().int().optional(),
  value: z.number().int().optional(),
  cost: z.number().optional(),
  potionCost: z.number().optional(),
  wandCost: z.number().optional(),
  casterLevel: z.number().optional(),
  innateLevel: z.number().optional(),
  spellIndex: z.number().int().optional(),
  potionUse: z.boolean().optional(),
  wandUse: z.boolean().optional(),
  generalUse: z.boolean().optional(),
  icon: z.string().optional(),
  sourceKey: z.string().min(1)
});

const itemPropertyDictionaryEntrySchema = z.object({
  propertyName: z.number().int().nonnegative(),
  label: z.string().min(1),
  propertyLabel: z.string().optional(),
  cost: z.number().optional(),
  nameStrRef: z.number().int().optional(),
  gameStrRef: z.number().int().optional(),
  descriptionStrRef: z.number().int().optional(),
  subTypeTable: z.string().optional(),
  costTableIndex: z.number().int().optional(),
  costTableLabel: z.string().optional(),
  costTableDefinition: z.string().optional(),
  param1TableIndex: z.number().int().optional(),
  param1TableLabel: z.string().optional(),
  param1Table: z.string().optional(),
  subtypeOptions: z.array(itemPropertyDictionaryOptionSchema),
  costValueOptions: z.array(itemPropertyDictionaryOptionSchema),
  param1Options: z.array(itemPropertyDictionaryOptionSchema)
});

const itemPropertyDictionaryEnvelopeSchema = z.object({
  data: z.object({
    generatedAt: z.string().min(1),
    properties: z.array(itemPropertyDictionaryEntrySchema)
  })
});

const itemBaseItemEntrySchema = z.object({
  baseItem: z.number().int().nonnegative(),
  sourceKey: z.string().min(1),
  label: z.string().optional(),
  nameStrRef: z.number().int().optional(),
  itemClass: z.string().optional(),
  modelType: z.string().optional(),
  defaultModel: z.string().optional(),
  defaultIcon: z.string().optional(),
  invSlotWidth: z.number().int().optional(),
  invSlotHeight: z.number().int().optional(),
  canRotateIcon: z.number().int().optional(),
  equipableSlots: z.string().optional(),
  baseCost: z.number().int().optional(),
  stacking: z.number().int().optional(),
  itemMultiplier: z.number().optional(),
  maxProps: z.number().int().optional(),
  minProps: z.number().int().optional(),
  propColumn: z.string().optional(),
  storePanel: z.number().int().optional(),
  storePanelSort: z.number().int().optional(),
  chargesStarting: z.number().int().optional(),
  ilrStackSize: z.number().int().optional(),
  weaponMatType: z.number().int().optional(),
  ammunitionType: z.number().int().optional(),
  arcaneSpellFailure: z.number().int().optional(),
  reqFeats: z.array(z.number().int()).optional()
});

const itemBaseItemsEnvelopeSchema = z.object({
  data: z.object({
    generatedAt: z.string().min(1),
    sourceKey: z.string().optional(),
    count: z.number().int().nonnegative(),
    items: z.array(itemBaseItemEntrySchema)
  })
});

const itemPaletteTreeNodeSchema: z.ZodType<ItemApiPaletteTreeNode> = z.lazy(() =>
  z.object({
    nodeId: z.string().min(1),
    kind: z.union([z.literal("folder"), z.literal("leaf"), z.literal("category")]),
    depth: z.number().int().nonnegative(),
    label: z.string().min(1),
    strRef: z.number().int().optional(),
    id: z.number().int().optional(),
    resRef: z.string().optional(),
    name: z.string().optional(),
    leafCount: z.number().int().nonnegative(),
    folderCount: z.number().int().nonnegative(),
    categoryLeafCount: z.number().int().nonnegative(),
    children: z.array(itemPaletteTreeNodeSchema)
  })
);

const itemPaletteTreeSourceSchema = z.object({
  resref: z.string().min(1),
  objectKey: z.string().min(1),
  fileName: z.string().min(1),
  sourceFileType: z.string().min(1),
  sourceFileVersion: z.string().min(1),
  rootCount: z.number().int().nonnegative(),
  leafCount: z.number().int().nonnegative(),
  folderCount: z.number().int().nonnegative(),
  categoryLeafCount: z.number().int().nonnegative(),
  maxDepth: z.number().int().nonnegative(),
  selected: z.boolean()
});

const itemPaletteTreeEnvelopeSchema = z.object({
  data: z.object({
    generatedAt: z.string().min(1),
    activeSource: z.string().optional(),
    sources: z.array(itemPaletteTreeSourceSchema),
    rootCount: z.number().int().nonnegative(),
    leafCount: z.number().int().nonnegative(),
    folderCount: z.number().int().nonnegative(),
    categoryLeafCount: z.number().int().nonnegative(),
    maxDepth: z.number().int().nonnegative(),
    roots: z.array(itemPaletteTreeNodeSchema)
  })
});

const itemGeneratorSupportSourceSchema = z.object({
  objectKey: z.string().min(1),
  fileName: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  source: z.union([z.literal("module-snapshot"), z.literal("local-retail-extract")]),
  header: z.string(),
  classification: z.union([
    z.literal("gff-candidate"),
    z.literal("ltr-lexicon"),
    z.literal("unknown")
  ]),
  supported: z.boolean(),
  parseable: z.boolean().default(false),
  reason: z.string().min(1)
});

const itemGeneratorSupportEnvelopeSchema = z.object({
  data: z.object({
    generatedAt: z.string().min(1),
    supported: z.boolean(),
    status: z.union([z.literal("ready"), z.literal("unsupported"), z.literal("no-sources")]),
    sourceCount: z.number().int().nonnegative(),
    gffCandidateCount: z.number().int().nonnegative(),
    parseableGffCount: z.number().int().nonnegative().default(0),
    ltrLexiconCount: z.number().int().nonnegative(),
    parserImplemented: z.boolean().default(false),
    sources: z.array(itemGeneratorSupportSourceSchema),
    notes: z.array(z.string())
  })
});

const itemCustomPaletteWriteEnvelopeSchema = z.object({
  data: z.object({
    palette: z.object({
      resref: z.literal("itempalcus"),
      objectKey: z.string().min(1),
      fileName: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
      etag: z.string().optional(),
      sourceFileType: z.string().min(1),
      sourceFileVersion: z.string().min(1),
      rootCount: z.number().int().nonnegative(),
      leafCount: z.number().int().nonnegative(),
      folderCount: z.number().int().nonnegative(),
      categoryLeafCount: z.number().int().nonnegative(),
      maxDepth: z.number().int().nonnegative()
    }),
    tree: itemPaletteTreeEnvelopeSchema.shape.data
  })
});

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function appendQueryParam(
  search: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
): void {
  if (value === undefined) {
    return;
  }
  const normalized = typeof value === "string" ? value.trim() : String(value);
  if (normalized.length === 0) {
    return;
  }
  search.set(key, normalized);
}

function buildListQueryString(query: ItemApiListQuery | undefined): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  appendQueryParam(search, "query", query.query);
  appendQueryParam(search, "category", query.category);
  appendQueryParam(search, "tag", query.tag);
  appendQueryParam(search, "limit", query.limit);
  appendQueryParam(search, "offset", query.offset);
  const value = search.toString();
  return value.length > 0 ? `?${value}` : "";
}

async function parseResponseOrThrow(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (response.ok) {
    return payload;
  }

  const code =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "code" in payload.error &&
    typeof payload.error.code === "string"
      ? payload.error.code
      : null;

  const message =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : `Backend request failed with status ${response.status}.`;

  throw new ItemApiRequestError(message, response.status, code);
}

function mapListItem(input: z.infer<typeof itemListItemSchema>): ItemApiListItem {
  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    tags: input.tags,
    previewImageUrl: input.previewImageUrl,
    metadata: input.metadata as Record<string, ItemApiMetadataPrimitive> | undefined
  };
}

function mapProcessedItemPayload(
  input: z.infer<typeof itemProcessedPayloadSchema>
): ItemApiProcessedPayload {
  return {
    templateId: input.templateId,
    kind: input.kind,
    resref: input.resref,
    name: input.name,
    category: input.category,
    benchmarkCandidate: input.benchmarkCandidate,
    benchmarkBucket: input.benchmarkBucket,
    metadata: input.metadata as Record<string, ItemApiMetadataPrimitive> | undefined,
    render: input.render,
    assetManifest: input.assetManifest,
    itemRuntime: input.itemRuntime,
    itemValidationIssues: input.itemValidationIssues,
    processedAt: input.processedAt
  };
}

function mapProcessEnvelope(
  input: z.infer<typeof itemProcessEnvelopeSchema>
): ItemApiProcessResult {
  return {
    cache: input.data.cache,
    item: mapProcessedItemPayload(input.data.item)
  };
}

function mapBlueprintDescriptor(
  input: z.infer<typeof itemBlueprintDescriptorSchema>
): ItemApiBlueprintDescriptor {
  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    objectKey: input.objectKey,
    sizeBytes: input.sizeBytes,
    etag: input.etag,
    sourceFileType: input.sourceFileType,
    sourceFileVersion: input.sourceFileVersion
  };
}

function mapBlueprintCreateEnvelope(
  input: z.infer<typeof itemBlueprintCreateEnvelopeSchema>
): ItemApiBlueprintCreateResult {
  return {
    blueprint: mapBlueprintDescriptor(input.data.blueprint),
    cache: input.data.cache,
    item: mapProcessedItemPayload(input.data.item)
  };
}

function mapPropertyDictionaryOption(
  input: z.infer<typeof itemPropertyDictionaryOptionSchema>
): ItemApiPropertyDictionaryOption {
  return {
    rowId: input.rowId,
    label: input.label,
    nameStrRef: input.nameStrRef,
    value: input.value,
    cost: input.cost,
    casterLevel: input.casterLevel,
    innateLevel: input.innateLevel,
    spellIndex: input.spellIndex,
    potionUse: input.potionUse,
    wandUse: input.wandUse,
    generalUse: input.generalUse,
    icon: input.icon,
    sourceKey: input.sourceKey
  };
}

function mapPropertyDictionaryEntry(
  input: z.infer<typeof itemPropertyDictionaryEntrySchema>
): ItemApiPropertyDictionaryEntry {
  return {
    propertyName: input.propertyName,
    label: input.label,
    propertyLabel: input.propertyLabel,
    cost: input.cost,
    nameStrRef: input.nameStrRef,
    gameStrRef: input.gameStrRef,
    descriptionStrRef: input.descriptionStrRef,
    subTypeTable: input.subTypeTable,
    costTableIndex: input.costTableIndex,
    costTableLabel: input.costTableLabel,
    costTableDefinition: input.costTableDefinition,
    param1TableIndex: input.param1TableIndex,
    param1TableLabel: input.param1TableLabel,
    param1Table: input.param1Table,
    subtypeOptions: input.subtypeOptions.map(mapPropertyDictionaryOption),
    costValueOptions: input.costValueOptions.map(mapPropertyDictionaryOption),
    param1Options: input.param1Options.map(mapPropertyDictionaryOption)
  };
}

function mapPropertyDictionaryEnvelope(
  input: z.infer<typeof itemPropertyDictionaryEnvelopeSchema>
): ItemApiPropertyDictionaryResult {
  return {
    generatedAt: input.data.generatedAt,
    properties: input.data.properties.map(mapPropertyDictionaryEntry)
  };
}

function mapBaseItemEntry(
  input: z.infer<typeof itemBaseItemEntrySchema>
): ItemApiBaseItemEntry {
  return {
    baseItem: input.baseItem,
    sourceKey: input.sourceKey,
    label: input.label,
    nameStrRef: input.nameStrRef,
    itemClass: input.itemClass,
    modelType: input.modelType,
    defaultModel: input.defaultModel,
    defaultIcon: input.defaultIcon,
    invSlotWidth: input.invSlotWidth,
    invSlotHeight: input.invSlotHeight,
    canRotateIcon: input.canRotateIcon,
    equipableSlots: input.equipableSlots,
    baseCost: input.baseCost,
    stacking: input.stacking,
    itemMultiplier: input.itemMultiplier,
    maxProps: input.maxProps,
    minProps: input.minProps,
    propColumn: input.propColumn,
    storePanel: input.storePanel,
    storePanelSort: input.storePanelSort,
    chargesStarting: input.chargesStarting,
    ilrStackSize: input.ilrStackSize,
    weaponMatType: input.weaponMatType,
    ammunitionType: input.ammunitionType,
    arcaneSpellFailure: input.arcaneSpellFailure,
    reqFeats: input.reqFeats
  };
}

function mapBaseItemsEnvelope(
  input: z.infer<typeof itemBaseItemsEnvelopeSchema>
): ItemApiBaseItemsResult {
  return {
    generatedAt: input.data.generatedAt,
    sourceKey: input.data.sourceKey,
    count: input.data.count,
    items: input.data.items.map(mapBaseItemEntry)
  };
}

function mapPaletteTreeNode(
  input: z.infer<typeof itemPaletteTreeNodeSchema>
): ItemApiPaletteTreeNode {
  return {
    nodeId: input.nodeId,
    kind: input.kind,
    depth: input.depth,
    label: input.label,
    strRef: input.strRef,
    id: input.id,
    resRef: input.resRef,
    name: input.name,
    leafCount: input.leafCount,
    folderCount: input.folderCount,
    categoryLeafCount: input.categoryLeafCount,
    children: input.children.map(mapPaletteTreeNode)
  };
}

function mapPaletteTreeEnvelope(
  input: z.infer<typeof itemPaletteTreeEnvelopeSchema>
): ItemApiPaletteTreeResult {
  return {
    generatedAt: input.data.generatedAt,
    activeSource: input.data.activeSource,
    sources: input.data.sources,
    rootCount: input.data.rootCount,
    leafCount: input.data.leafCount,
    folderCount: input.data.folderCount,
    categoryLeafCount: input.data.categoryLeafCount,
    maxDepth: input.data.maxDepth,
    roots: input.data.roots.map(mapPaletteTreeNode)
  };
}

function mapPaletteTreeData(
  input: z.infer<typeof itemPaletteTreeEnvelopeSchema>["data"]
): ItemApiPaletteTreeResult {
  return {
    generatedAt: input.generatedAt,
    activeSource: input.activeSource,
    sources: input.sources,
    rootCount: input.rootCount,
    leafCount: input.leafCount,
    folderCount: input.folderCount,
    categoryLeafCount: input.categoryLeafCount,
    maxDepth: input.maxDepth,
    roots: input.roots.map(mapPaletteTreeNode)
  };
}

function mapGeneratorSupportEnvelope(
  input: z.infer<typeof itemGeneratorSupportEnvelopeSchema>
): ItemApiGeneratorSupportResult {
  return input.data;
}

function mapCustomPaletteWriteEnvelope(
  input: z.infer<typeof itemCustomPaletteWriteEnvelopeSchema>
): ItemApiCustomPaletteWriteResult {
  return {
    palette: input.data.palette,
    tree: mapPaletteTreeData(input.data.tree)
  };
}

export class HttpItemApiPort implements ItemApiPort {
  constructor(
    private readonly fetchFn: FetchLike = defaultFetch,
    private readonly baseUrl: string = resolveBaseUrl()
  ) {}

  async listItems(
    accessToken: string,
    query?: ItemApiListQuery
  ): Promise<ItemApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/items${buildListQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const parsed = itemListEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async processItem(
    accessToken: string,
    requestPayload: ItemApiProcessPayload
  ): Promise<ItemApiProcessResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });
    return mapProcessEnvelope(
      itemProcessEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async createItemBlueprint(
    accessToken: string,
    requestPayload: ItemApiBlueprintCreatePayload
  ): Promise<ItemApiBlueprintCreateResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/blueprints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    });
    return mapBlueprintCreateEnvelope(
      itemBlueprintCreateEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async updateItemBlueprint(
    accessToken: string,
    resRef: string,
    requestPayload: ItemApiBlueprintCreatePayload
  ): Promise<ItemApiBlueprintCreateResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/items/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      }
    );
    return mapBlueprintCreateEnvelope(
      itemBlueprintCreateEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async deleteItemBlueprint(
    accessToken: string,
    resRef: string
  ): Promise<ItemApiBlueprintDeleteResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/items/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return itemBlueprintDeleteEnvelopeSchema.parse(await parseResponseOrThrow(response)).data;
  }

  async getItemPropertyDictionary(
    accessToken: string
  ): Promise<ItemApiPropertyDictionaryResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/property-dictionary`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return mapPropertyDictionaryEnvelope(
      itemPropertyDictionaryEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async getItemBaseItems(accessToken: string): Promise<ItemApiBaseItemsResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/base-items`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return mapBaseItemsEnvelope(
      itemBaseItemsEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async getItemPaletteTree(accessToken: string): Promise<ItemApiPaletteTreeResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/palette-tree`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return mapPaletteTreeEnvelope(
      itemPaletteTreeEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async getItemGeneratorSupport(accessToken: string): Promise<ItemApiGeneratorSupportResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/generator-support`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return mapGeneratorSupportEnvelope(
      itemGeneratorSupportEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async writeCustomItemPalette(
    accessToken: string,
    payload: ItemApiCustomPaletteWritePayload
  ): Promise<ItemApiCustomPaletteWriteResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/palette-tree/custom`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    return mapCustomPaletteWriteEnvelope(
      itemCustomPaletteWriteEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }

  async getProcessedItem(
    accessToken: string,
    cacheKey: string
  ): Promise<ItemApiProcessResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/items/cache/${cacheKey}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return mapProcessEnvelope(
      itemProcessEnvelopeSchema.parse(await parseResponseOrThrow(response))
    );
  }
}

export function createHttpItemApiPort(fetchFn?: FetchLike, baseUrl?: string): ItemApiPort {
  return new HttpItemApiPort(fetchFn, baseUrl);
}

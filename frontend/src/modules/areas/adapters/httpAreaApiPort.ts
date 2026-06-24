import { z } from "zod";
import type {
  AreaApiDetail,
  AreaApiListItem,
  AreaApiListQuery,
  AreaApiListResult,
  AreaApiLoginResult,
  AreaApiObjectPlacement,
  AreaApiProcessOptions,
  AreaApiProcessResult,
  AreaApiTextureDeliveryMode,
  AreaApiTextureDeliveryResult
} from "../contracts";
import type { AreaApiPort } from "../ports/areaApiPort";

export class AreaApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "AreaApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const loginEnvelopeSchema = z.object({
  data: z.object({
    session: z.object({
      accessToken: z.string().min(1)
    })
  })
});

const areaObjectCountsSchema = z.object({
  placeables: z.number().int().nonnegative(),
  doors: z.number().int().nonnegative(),
  creatures: z.number().int().nonnegative(),
  items: z.number().int().nonnegative(),
  sounds: z.number().int().nonnegative(),
  total: z.number().int().nonnegative()
});

const areaTextureAtlasSchema = z.object({
  atlasId: z.string().min(1),
  cacheKey: z.string().min(1),
  strategy: z.literal("blob-cache"),
  objectKey: z.string().optional(),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  etag: z.string().optional()
});

const areaTileInstanceSchema = z.object({
  tileInstanceId: z.string().min(1),
  areaId: z.string().min(1),
  tilesetResRef: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  tileIndex: z.number().int().nonnegative(),
  tileId: z.number().int().nonnegative().optional(),
  modelResRef: z.string().min(1).optional(),
  modelSource: z.enum(["are-tile-list", "set-tile-section"]).optional(),
  orientation: z.number().int().min(0).max(3).optional(),
  height: z.number().finite().optional(),
  source: z.literal("are-tile-list"),
  fallbackReason: z.string().min(1).optional()
});

const areaListItemSchema = z.object({
  areaId: z.string().min(1),
  name: z.string().min(1),
  biome: z.string().min(1),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  tags: z.array(z.string()),
  benchmark: z.boolean(),
  previewImageUrl: z.string(),
  textureAtlasId: z.string().min(1),
  objectCounts: areaObjectCountsSchema,
  updatedAt: z.string().min(1)
});

const areaListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(areaListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const areaPreservePrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

const areaSoundPositioningPreserveSchema = z.object({
  timeWindow: z.string(),
  hourMask: z.string(),
  active: z.boolean().optional(),
  whenToPlay: z.enum(["always", "dayNight", "hours"]).optional(),
  dayNight: z.enum(["both", "day", "night"]).optional(),
  hoursStart: z.number().finite().optional(),
  hoursEnd: z.number().finite().optional(),
  playStyle: z.enum(["once", "repeat", "loop"]).optional(),
  playOrder: z.enum(["sequential", "random"]).optional(),
  intervalMs: z.number().finite().nonnegative(),
  intervalVariationMs: z.number().finite().nonnegative(),
  volume: z.number().finite().nonnegative(),
  volumeVariation: z.number().finite().nonnegative(),
  pitchVariation: z.number().finite().nonnegative(),
  priority: z.number().finite().nonnegative(),
  flags: z.record(z.boolean()),
  extra: z.record(areaPreservePrimitiveSchema)
});

const areaSoundPositioningSchema = z.object({
  mode: z.enum(["everywhere", "random", "specific"]),
  elevation: z.number().finite().nonnegative(),
  maxVolumeDistance: z.number().finite().nonnegative(),
  cutoffDistance: z.number().finite().nonnegative(),
  randomRangeWestEast: z.number().finite().nonnegative(),
  randomRangeNorthSouth: z.number().finite().nonnegative(),
  preserve: areaSoundPositioningPreserveSchema.optional()
});

const areaDoorTransitionSchema = z.object({
  linkedTarget: z.string(),
  linkedModule: z.string(),
  linkedTag: z.string(),
  linkedWaypoint: z.string(),
  loadScreen: z.string(),
  flags: z.record(z.boolean()),
  extra: z.record(areaPreservePrimitiveSchema).optional()
});

const areaObjectSchema = z.object({
  objectId: z.string().min(1),
  kind: z.enum(["placeable", "door", "creature", "item", "sound"]),
  templateId: z.string().min(1),
  resRef: z.string().min(1).optional(),
  appearanceType: z.number().finite().optional(),
  genericType: z.number().finite().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  bearing: z.number().finite(),
  soundPositioning: areaSoundPositioningSchema.optional(),
  doorTransition: areaDoorTransitionSchema.optional()
});

const areaDetailEnvelopeSchema = z.object({
  data: z.object({
    areaId: z.string().min(1),
    name: z.string().min(1),
    biome: z.string().min(1),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    tags: z.array(z.string()),
    benchmark: z.boolean(),
    previewImageUrl: z.string(),
    textureAtlas: areaTextureAtlasSchema,
    tileSet: z.string().min(1).optional(),
    tiles: z.array(areaTileInstanceSchema).default([]),
    composition: areaObjectCountsSchema,
    updatedAt: z.string().min(1),
    objects: z.array(areaObjectSchema)
  })
});

const areaProcessedAreaSchema = areaDetailEnvelopeSchema.shape.data.extend({
  processedAt: z.string().min(1)
});

const areaProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    area: areaProcessedAreaSchema
  })
});

const areaTextureDeliveryContractSchema = z.object({
  mode: z.enum(["proxy", "direct"]),
  atlasId: z.string().min(1),
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().optional(),
  proxyPath: z.string().min(1),
  proxyUrl: z.string().min(1),
  directUrl: z.string().optional(),
  s3Url: z.string().optional()
});

const areaTextureDeliveryEnvelopeSchema = z.object({
  data: z.object({
    cacheKey: z.string().min(1),
    textureAtlas: areaTextureDeliveryContractSchema
  })
});

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function toQueryString(query?: AreaApiListQuery): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  if (query.query) {
    search.set("query", query.query);
  }
  if (query.biome) {
    search.set("biome", query.biome);
  }
  if (query.tag) {
    search.set("tag", query.tag);
  }
  if (typeof query.benchmark === "boolean") {
    search.set("benchmark", String(query.benchmark));
  }
  if (typeof query.limit === "number") {
    search.set("limit", String(query.limit));
  }
  if (typeof query.offset === "number") {
    search.set("offset", String(query.offset));
  }
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

  throw new AreaApiRequestError(message, response.status, code);
}

function mapListItem(input: z.infer<typeof areaListItemSchema>): AreaApiListItem {
  return {
    areaId: input.areaId,
    name: input.name,
    biome: input.biome,
    width: input.width,
    height: input.height,
    tags: input.tags,
    benchmark: input.benchmark,
    previewImageUrl: input.previewImageUrl,
    textureAtlasId: input.textureAtlasId,
    objectCounts: input.objectCounts,
    updatedAt: input.updatedAt
  };
}

function mapAreaObject(
  input: z.infer<typeof areaObjectSchema>
): AreaApiObjectPlacement {
  return {
    objectId: input.objectId,
    kind: input.kind,
    templateId: input.templateId,
    resRef: input.resRef,
    appearanceType: input.appearanceType,
    genericType: input.genericType,
    x: input.x,
    y: input.y,
    z: input.z,
    bearing: input.bearing,
    soundPositioning: input.soundPositioning,
    doorTransition: input.doorTransition
      ? {
          ...input.doorTransition,
          flags: { ...input.doorTransition.flags },
          ...(input.doorTransition.extra ? { extra: { ...input.doorTransition.extra } } : {})
        }
      : undefined
  };
}

function mapAreaDetail(input: z.infer<typeof areaDetailEnvelopeSchema>["data"]): AreaApiDetail {
  return {
    areaId: input.areaId,
    name: input.name,
    biome: input.biome,
    width: input.width,
    height: input.height,
    tags: input.tags,
    benchmark: input.benchmark,
    previewImageUrl: input.previewImageUrl,
    textureAtlas: input.textureAtlas,
    tileSet: input.tileSet,
    tiles: input.tiles,
    composition: input.composition,
    updatedAt: input.updatedAt,
    objects: input.objects.map(mapAreaObject)
  };
}

export class HttpAreaApiPort implements AreaApiPort {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;

  constructor(fetchFn: FetchLike = fetch.bind(globalThis), baseUrl = resolveBaseUrl()) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async login(username: string, password: string): Promise<AreaApiLoginResult> {
    const response = await this.fetchFn(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = loginEnvelopeSchema.parse(payload);
    return {
      accessToken: parsed.data.session.accessToken
    };
  }

  async listAreas(accessToken: string, query?: AreaApiListQuery): Promise<AreaApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas${toQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaListEnvelopeSchema.parse(payload);
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async getAreaById(accessToken: string, areaId: string): Promise<AreaApiDetail> {
    const response = await this.fetchFn(`${this.baseUrl}/areas/${encodeURIComponent(areaId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = areaDetailEnvelopeSchema.parse(payload);
    return mapAreaDetail(parsed.data);
  }

  async processArea(
    accessToken: string,
    areaId: string,
    options?: AreaApiProcessOptions
  ): Promise<AreaApiProcessResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/process`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bypassCache: options?.bypassCache ?? false })
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaProcessEnvelopeSchema.parse(payload);
    return {
      cache: parsed.data.cache,
      area: {
        ...mapAreaDetail(parsed.data.area),
        processedAt: parsed.data.area.processedAt
      }
    };
  }

  async getAreaTextureAtlasContracts(
    accessToken: string,
    cacheKey: string,
    mode: AreaApiTextureDeliveryMode = "proxy"
  ): Promise<AreaApiTextureDeliveryResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/cache/${encodeURIComponent(cacheKey)}/textures/contracts?mode=${encodeURIComponent(mode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaTextureDeliveryEnvelopeSchema.parse(payload);
    return {
      cacheKey: parsed.data.cacheKey,
      textureAtlas: parsed.data.textureAtlas
    };
  }
}

export function createHttpAreaApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): AreaApiPort {
  return new HttpAreaApiPort(fetchFn, baseUrl);
}

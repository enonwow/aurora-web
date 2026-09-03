import { z } from "zod";
import type {
  TileApiProcessBatchRequestItem,
  TileApiProcessBatchResult,
  TileApiProcessOptions,
  TileApiProcessResult,
  TileApiTextureDeliveryMode,
  TileApiTextureDeliveryResult
} from "../contracts";
import type { TileApiPort } from "../ports/tileApiPort";

export class TileApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "TileApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const tileTextureAtlasSchema = z.object({
  atlasId: z.string().min(1),
  cacheKey: z.string().min(1),
  strategy: z.literal("blob-cache"),
  objectKey: z.string().optional(),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  etag: z.string().optional()
});

const tileSourceAssetContractSchema = z.object({
  objectKey: z.string().min(1),
  extension: z.string().min(1),
  role: z.enum([
    "mdl_source",
    "set_metadata",
    "walkmesh_source",
    "itp_metadata",
    "texture_atlas_fallback",
    "derived_model_asset",
    "unknown_source"
  ]),
  origin: z.enum(["module-snapshot", "static-fallback"]),
  sizeBytes: z.number().int().nonnegative().optional(),
  etag: z.string().optional()
});

const tileRenderAssetContractSchema = z.object({
  sourceAssetStatus: z.enum(["ready", "blocked"]),
  mdlSourceStatus: z.enum(["ready", "blocked"]),
  mdlSourceObjectKey: z.string().optional(),
  mdlSourceContentSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
  glbGeometryStatus: z.enum([
    "ready",
    "blocked_tile_process_contract_missing_glb_geometry"
  ]),
  textureDeliveryStatus: z.enum([
    "texture_material_contract_ready",
    "texture_source_blob_metadata_present",
    "blocked_tile_texture_blob_metadata_missing",
    "blocked_tile_texture_contract_derived_model_only"
  ]),
  materialBindingStatus: z.enum([
    "ready",
    "blocked_tile_process_contract_missing_material_bindings",
    "blocked_tile_material_binding_derived_model_only"
  ]),
  rendererHandoffStatus: z.enum(["ready", "blocked_tile_model_geometry_loader_missing"]),
  modelDeliveryStatus: z.enum(["ready", "blocked_tile_model_glb_missing"]),
  modelAsset: z
    .object({
      objectKey: z.string().min(1),
      extension: z.enum(["glb", "gltf"]),
      contentType: z.enum(["model/gltf-binary", "model/gltf+json"]),
      sizeBytes: z.number().int().nonnegative(),
      etag: z.string().optional(),
      contentSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
      deliveryPath: z.string().min(1),
      deliveryUrl: z.string().min(1)
    })
    .optional(),
  materialTextureAssets: z
    .array(
      z.object({
        reference: z.string().min(1),
        textureId: z.string().min(1),
        resref: z.string().min(1),
        objectKey: z.string().min(1),
        extension: z.string().min(1),
        contentType: z.string().min(1),
        sizeBytes: z.number().int().nonnegative(),
        contentSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
        source: z.enum(["module", "hak", "vanilla"]),
        sourcePath: z.string().min(1),
        deliveryPath: z.string().min(1),
        deliveryUrl: z.string().min(1),
        s3Url: z.string().min(1)
      })
    )
    .optional(),
  expectedDerivedModelObjectKey: z.string().min(1).optional(),
  blockers: z.array(z.string())
});

const tileProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    tile: z.object({
      tileId: z.string().min(1),
      resref: z.string().min(1),
      name: z.string().min(1),
      tileset: z.string().min(1),
      variant: z.string().min(1),
      textureAtlas: tileTextureAtlasSchema,
      sourceAsset: tileSourceAssetContractSchema.optional(),
      render: z.object({
        backendType: z.literal("tile"),
        frontendType: z.literal("tile"),
        rendererPreset: z.enum(["tile-standard", "tile-water"])
      }),
      renderAssetContract: tileRenderAssetContractSchema.optional(),
      processedAt: z.string().min(1)
    })
  })
});

const tileProcessBatchEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(
      z.discriminatedUnion("status", [
        z.object({
          tileId: z.string().min(1),
          status: z.literal("ready"),
          result: tileProcessEnvelopeSchema.shape.data
        }),
        z.object({
          tileId: z.string().min(1),
          status: z.literal("blocked"),
          error: z.object({
            code: z.string().nullable(),
            message: z.string().min(1)
          })
        })
      ])
    )
  })
});

const tileTextureDeliveryContractSchema = z.object({
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

const tileTextureDeliveryEnvelopeSchema = z.object({
  data: z.object({
    cacheKey: z.string().min(1),
    textureAtlas: tileTextureDeliveryContractSchema
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
      : `Backend tile request failed with status ${response.status}.`;

  throw new TileApiRequestError(message, response.status, code);
}

export class HttpTileApiPort implements TileApiPort {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;

  constructor(fetchFn: FetchLike = fetch.bind(globalThis), baseUrl = resolveBaseUrl()) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async processTile(
    accessToken: string,
    tileId: string,
    options?: TileApiProcessOptions
  ): Promise<TileApiProcessResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/tiles/${encodeURIComponent(tileId)}/process`,
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
    const parsed = tileProcessEnvelopeSchema.parse(payload);
    return parsed.data;
  }

  async processTiles(
    accessToken: string,
    items: TileApiProcessBatchRequestItem[]
  ): Promise<TileApiProcessBatchResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/tiles/process/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ items })
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = tileProcessBatchEnvelopeSchema.parse(payload);
    return parsed.data;
  }

  async getTileTextureAtlasContracts(
    accessToken: string,
    cacheKey: string,
    mode: TileApiTextureDeliveryMode = "proxy"
  ): Promise<TileApiTextureDeliveryResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/tiles/cache/${encodeURIComponent(cacheKey)}/textures/contracts?mode=${encodeURIComponent(mode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = tileTextureDeliveryEnvelopeSchema.parse(payload);
    return parsed.data;
  }
}

export function createHttpTileApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): TileApiPort {
  return new HttpTileApiPort(fetchFn, baseUrl);
}

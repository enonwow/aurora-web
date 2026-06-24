import { z } from "zod";
import type {
  SoundApiAudioContractsResult,
  SoundApiDeliveryMode,
  SoundApiListItem,
  SoundApiListQuery,
  SoundApiListResult,
  SoundApiProcessPayload,
  SoundApiProcessResult
} from "../contracts";
import type { SoundApiPort } from "../ports/soundApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class SoundApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "SoundApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const soundCategorySchema = z.enum(["ambient", "music", "effect"]);
const soundFormatSchema = z.enum(["wav", "ogg", "bmu", "mp3"]);
const soundSpatialModeSchema = z.enum(["2d", "3d"]);
const soundPlaybackModeSchema = z.enum(["looping", "continuous", "random", "interval"]);
const soundDeliveryModeSchema = z.enum(["proxy", "direct"]);
const soundSourceLayerSchema = z.enum(["vanilla", "hak", "module", "other"]);
const soundAreaBindingKeySchema = z.enum(["GI_sound_area", "GI_sound_rndm", "GI_sound_pos"]);
const soundAreaSourceFieldSchema = z.enum([
  "AmbientSoundDay",
  "AmbientSoundNight",
  "MusicDay",
  "MusicNight",
  "MusicBattle",
  "PlacedSound",
  "RandomSound"
]);

const soundMetricsSchema = z.object({
  durationMs: z.number().finite().nonnegative(),
  cues: z.number().int().nonnegative(),
  emitters: z.number().int().nonnegative()
});

const soundAuroraUsageSchema = z.object({
  bindingKey: soundAreaBindingKeySchema,
  sourceField: soundAreaSourceFieldSchema,
  defaultsTable: z.enum(["sounddefaultstim", "sounddefaultspos"]).optional()
});

const soundListItemSchema = z.object({
  soundId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: soundCategorySchema,
  format: soundFormatSchema,
  tags: z.array(z.string()),
  benchmark: z.boolean(),
  previewWaveformUrl: z.string(),
  spatialMode: soundSpatialModeSchema,
  playbackMode: soundPlaybackModeSchema,
  source: z.object({
    layer: soundSourceLayerSchema
  }),
  auroraUsage: soundAuroraUsageSchema,
  metrics: soundMetricsSchema,
  updatedAt: z.string().min(1)
});

const soundListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(soundListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const processedSoundSchema = z
  .object({
    soundId: z.string().min(1),
    resref: z.string().min(1),
    name: z.string().min(1),
    category: soundCategorySchema,
    tags: z.array(z.string()),
    benchmark: z.boolean(),
    previewWaveformUrl: z.string(),
    audio: z.object({
      assetId: z.string().min(1),
      cacheKey: z.string().min(1),
      strategy: z.literal("blob-cache"),
      objectKey: z.string().min(1),
      contentType: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
      etag: z.string().min(1).optional(),
      format: soundFormatSchema,
      sampleRateHz: z.number().int().positive(),
      channels: z.union([z.literal(1), z.literal(2)])
    }),
    spatial: z.object({
      mode: soundSpatialModeSchema,
      loop: z.boolean()
    }),
    playback: z.object({
      mode: soundPlaybackModeSchema,
      intervalSeconds: z.number().finite().nonnegative().optional(),
      ambientOnly: z.boolean()
    }),
    auroraUsage: soundAuroraUsageSchema,
    metrics: soundMetricsSchema,
    render: z.object({
      backendType: z.literal("sound"),
      frontendType: z.literal("sound"),
      playbackPreset: z.enum(["ambient-loop", "music-stream", "effect-spatial"])
    }),
    updatedAt: z.string().min(1),
    processedAt: z.string().min(1)
  })
  .passthrough();

const soundProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    sound: processedSoundSchema
  })
});

const soundAudioContractsEnvelopeSchema = z.object({
  data: z.object({
    cacheKey: z.string().min(1),
    audio: z.object({
      mode: soundDeliveryModeSchema,
      assetId: z.string().min(1),
      objectKey: z.string().min(1),
      contentType: z.string().min(1),
      sizeBytes: z.number().int().nonnegative(),
      etag: z.string().min(1).optional(),
      proxyPath: z.string().min(1),
      proxyUrl: z.string().min(1),
      directUrl: z.string().min(1).optional(),
      s3Url: z.string().min(1).optional()
    })
  })
});

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function toListQueryString(query?: SoundApiListQuery): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  if (query.query) {
    search.set("query", query.query);
  }
  if (query.category) {
    search.set("category", query.category);
  }
  if (query.format) {
    search.set("format", query.format);
  }
  if (query.spatialMode) {
    search.set("spatialMode", query.spatialMode);
  }
  if (query.tag) {
    search.set("tag", query.tag);
  }
  if (query.bindingKey) {
    search.set("bindingKey", query.bindingKey);
  }
  if (query.sourceField) {
    search.set("sourceField", query.sourceField);
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

async function parseJsonResponseOrThrow(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (response.ok) {
    return payload;
  }

  throw new SoundApiRequestError(
    readBackendErrorMessage(payload, response.status),
    response.status,
    readBackendErrorCode(payload)
  );
}

async function parseBlobResponseOrThrow(response: Response): Promise<Blob> {
  if (response.ok) {
    return response.blob();
  }
  const payload = await response.json().catch(() => null);
  throw new SoundApiRequestError(
    readBackendErrorMessage(payload, response.status),
    response.status,
    readBackendErrorCode(payload)
  );
}

function readBackendErrorCode(payload: unknown): string | null {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "code" in payload.error &&
    typeof payload.error.code === "string"
    ? payload.error.code
    : null;
}

function readBackendErrorMessage(payload: unknown, status: number): string {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
    ? payload.error.message
    : `Backend request failed with status ${status}.`;
}

function mapListItem(input: z.infer<typeof soundListItemSchema>): SoundApiListItem {
  return {
    soundId: input.soundId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    format: input.format,
    tags: input.tags,
    benchmark: input.benchmark,
    previewWaveformUrl: input.previewWaveformUrl,
    spatialMode: input.spatialMode,
    playbackMode: input.playbackMode,
    source: input.source,
    auroraUsage: input.auroraUsage,
    metrics: input.metrics,
    updatedAt: input.updatedAt
  };
}

export class HttpSoundApiPort implements SoundApiPort {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;

  constructor(fetchFn: FetchLike = fetch.bind(globalThis), baseUrl = resolveBaseUrl()) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async listSounds(accessToken: string, query?: SoundApiListQuery): Promise<SoundApiListResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/sounds${toListQueryString(query)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await parseJsonResponseOrThrow(response);
    const parsed = soundListEnvelopeSchema.parse(payload);
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async processSound(
    accessToken: string,
    soundId: string,
    payload: SoundApiProcessPayload = {}
  ): Promise<SoundApiProcessResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/sounds/${encodeURIComponent(soundId)}/process`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bypassCache: Boolean(payload.bypassCache) })
      }
    );
    const parsed = soundProcessEnvelopeSchema.parse(await parseJsonResponseOrThrow(response));
    return {
      cacheKey: parsed.data.cache.key,
      cacheHit: parsed.data.cache.hit,
      storedAt: parsed.data.cache.storedAt,
      hits: parsed.data.cache.hits,
      sound: parsed.data.sound
    };
  }

  async getSoundAudioContracts(
    accessToken: string,
    cacheKey: string,
    mode: SoundApiDeliveryMode = "proxy"
  ): Promise<SoundApiAudioContractsResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/sounds/cache/${encodeURIComponent(cacheKey)}/audio/contracts?mode=${encodeURIComponent(mode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const parsed = soundAudioContractsEnvelopeSchema.parse(await parseJsonResponseOrThrow(response));
    return {
      cacheKey: parsed.data.cacheKey,
      audio: parsed.data.audio
    };
  }

  async getSoundAudioBlob(accessToken: string, cacheKey: string): Promise<Blob> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/sounds/cache/${encodeURIComponent(cacheKey)}/audio`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return parseBlobResponseOrThrow(response);
  }
}

export function createHttpSoundApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): SoundApiPort {
  return new HttpSoundApiPort(fetchFn, baseUrl);
}

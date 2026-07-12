import { z } from "zod";
import type {
  StoreApiBlueprintCreatePayload,
  StoreApiBlueprintCreateResult,
  StoreApiBlueprintDeleteResult,
  StoreApiListItem,
  StoreApiListQuery,
  StoreApiListResult,
  StoreApiMetadataPrimitive,
  StoreApiPreviewResult
} from "../contracts";
import type { StoreApiPort } from "../ports/storeApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const defaultFetch: FetchLike = (input, init) => globalThis.fetch(input, init);

export class StoreApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "StoreApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const storeMetadataPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

const storeListItemSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  previewImageUrl: z.string(),
  metadata: z.record(storeMetadataPrimitiveSchema).optional()
});

const storeListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(storeListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const storePreviewEnvelopeSchema = z.object({
  data: storeListItemSchema.extend({
    kind: z.literal("store"),
    benchmarkCandidate: z.boolean(),
    benchmarkBucket: z.string().optional()
  })
});

const storeBlueprintDescriptorSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  objectKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().optional(),
  sourceFileType: z.string().min(1),
  sourceFileVersion: z.string().min(1)
});

const storeBlueprintCreateEnvelopeSchema = z.object({
  data: z.object({
    blueprint: storeBlueprintDescriptorSchema,
    store: storeListItemSchema.extend({
      kind: z.literal("store").optional()
    })
  })
});

const storeBlueprintDeleteEnvelopeSchema = z.object({
  data: z.object({
    resref: z.string().min(1),
    objectKey: z.string().min(1),
    deleted: z.boolean()
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

function buildListQueryString(query: StoreApiListQuery | undefined): string {
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

  throw new StoreApiRequestError(message, response.status, code);
}

function mapListItem(input: z.infer<typeof storeListItemSchema>): StoreApiListItem {
  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    tags: input.tags,
    previewImageUrl: input.previewImageUrl,
    metadata: input.metadata as Record<string, StoreApiMetadataPrimitive> | undefined
  };
}

export class HttpStoreApiPort implements StoreApiPort {
  constructor(
    private readonly fetchFn: FetchLike = defaultFetch,
    private readonly baseUrl: string = resolveBaseUrl()
  ) {}

  async listStores(
    accessToken: string,
    query?: StoreApiListQuery
  ): Promise<StoreApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/stores${buildListQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const parsed = storeListEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async getStorePreview(
    accessToken: string,
    templateId: string
  ): Promise<StoreApiPreviewResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/stores/${encodeURIComponent(templateId)}/preview`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const parsed = storePreviewEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      ...mapListItem(parsed.data),
      kind: parsed.data.kind,
      benchmarkCandidate: parsed.data.benchmarkCandidate,
      benchmarkBucket: parsed.data.benchmarkBucket
    };
  }

  async createStoreBlueprint(
    accessToken: string,
    payload: StoreApiBlueprintCreatePayload
  ): Promise<StoreApiBlueprintCreateResult> {
    const response = await this.fetchFn(`${this.baseUrl}/catalog/stores/blueprints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const parsed = storeBlueprintCreateEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      blueprint: parsed.data.blueprint,
      store: {
        ...mapListItem(parsed.data.store),
        kind: parsed.data.store.kind
      }
    };
  }

  async updateStoreBlueprint(
    accessToken: string,
    resRef: string,
    payload: StoreApiBlueprintCreatePayload
  ): Promise<StoreApiBlueprintCreateResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/stores/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
    const parsed = storeBlueprintCreateEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      blueprint: parsed.data.blueprint,
      store: {
        ...mapListItem(parsed.data.store),
        kind: parsed.data.store.kind
      }
    };
  }

  async deleteStoreBlueprint(
    accessToken: string,
    resRef: string
  ): Promise<StoreApiBlueprintDeleteResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/stores/blueprints/${encodeURIComponent(resRef)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const parsed = storeBlueprintDeleteEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return parsed.data;
  }
}

export function createHttpStoreApiPort(fetchFn?: FetchLike, baseUrl?: string): StoreApiPort {
  return new HttpStoreApiPort(fetchFn, baseUrl);
}

import { z } from "zod";
import type {
  AreaApiDetail,
  AreaApiListItem,
  AreaApiListQuery,
  AreaApiListResult,
  AreaApiLoginResult,
  AreaApiObjectPlacement
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

const areaListItemSchema = z.object({
  areaId: z.string().min(1),
  name: z.string().min(1),
  biome: z.string().min(1),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  tags: z.array(z.string()),
  benchmark: z.boolean(),
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

const areaObjectSchema = z.object({
  objectId: z.string().min(1),
  kind: z.enum(["placeable", "creature", "item"]),
  templateId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  bearing: z.number().finite()
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
    updatedAt: z.string().min(1),
    objects: z.array(areaObjectSchema)
  })
});

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return "http://localhost:3000/api/v1";
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
    x: input.x,
    y: input.y,
    z: input.z,
    bearing: input.bearing
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
    return {
      areaId: parsed.data.areaId,
      name: parsed.data.name,
      biome: parsed.data.biome,
      width: parsed.data.width,
      height: parsed.data.height,
      tags: parsed.data.tags,
      benchmark: parsed.data.benchmark,
      updatedAt: parsed.data.updatedAt,
      objects: parsed.data.objects.map(mapAreaObject)
    };
  }
}

export function createHttpAreaApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): AreaApiPort {
  return new HttpAreaApiPort(fetchFn, baseUrl);
}

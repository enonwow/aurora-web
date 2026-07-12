import { z } from "zod";
import type {
  EncounterApiListItem,
  EncounterApiListQuery,
  EncounterApiListResult,
  EncounterApiMetadataPrimitive
} from "../contracts";
import type { EncounterApiPort } from "../ports/encounterApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class EncounterApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "EncounterApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const encounterMetadataPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

const encounterListItemSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  previewImageUrl: z.string(),
  metadata: z.record(encounterMetadataPrimitiveSchema).optional()
});

const encounterListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(encounterListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
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

function buildListQueryString(query: EncounterApiListQuery | undefined): string {
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

  throw new EncounterApiRequestError(message, response.status, code);
}

function mapListItem(input: z.infer<typeof encounterListItemSchema>): EncounterApiListItem {
  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    tags: input.tags,
    previewImageUrl: input.previewImageUrl,
    metadata: input.metadata as Record<string, EncounterApiMetadataPrimitive> | undefined
  };
}

export class HttpEncounterApiPort implements EncounterApiPort {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly baseUrl: string = resolveBaseUrl()
  ) {}

  async listEncounters(
    accessToken: string,
    query?: EncounterApiListQuery
  ): Promise<EncounterApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/encounters${buildListQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const parsed = encounterListEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }
}

export function createHttpEncounterApiPort(
  fetchFn?: FetchLike,
  baseUrl?: string
): EncounterApiPort {
  return new HttpEncounterApiPort(fetchFn, baseUrl);
}

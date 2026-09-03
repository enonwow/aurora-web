import { z } from "zod";
import type {
  WaypointApiAppearanceRowsQuery,
  WaypointApiAppearanceRowsResult,
  WaypointApiListItem,
  WaypointApiListQuery,
  WaypointApiListResult,
  WaypointApiMetadataPrimitive,
} from "../contracts";
import type { WaypointApiPort } from "../ports/waypointApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class WaypointApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "WaypointApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const metadataPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);
const listItemSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  previewImageUrl: z.string(),
  metadata: z.record(metadataPrimitiveSchema).optional(),
});
const listEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(listItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  }),
});
const appearanceRowSchema = z.object({
  rowIndex: z.number().int().min(0).max(255),
  modelResRef: z.string().min(1).max(16).regex(/^[A-Za-z0-9_]+$/u),
  strRef: z.number().int().min(0).max(0xffff_ffff),
  label: z.string().min(1).max(256).refine((value) => !value.includes("\0")).optional(),
  displayName: z.string().min(1).max(1024).refine((value) => !value.includes("\0")),
  displaySource: z.enum(["strref", "label", "model_resref"]),
}).strict();
const appearanceRowsEnvelopeSchema = z.object({
  data: z.object({
    resourceName: z.literal("waypoint.2da"),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    rowCount: z.number().int().min(1).max(256),
    items: z.array(appearanceRowSchema).max(256),
    total: z.number().int().min(0).max(256),
    limit: z.number().int().min(1).max(256),
    offset: z.number().int().min(0).max(999999),
  }).strict().superRefine((value, context) => {
    if (value.total > value.rowCount) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["total"], message: "total exceeds row count" });
    }
    if (value.items.length > value.limit) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "page exceeds limit" });
    }
    value.items.forEach((row, index) => {
      if (row.rowIndex >= value.rowCount) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "rowIndex"], message: "row outside table" });
      }
      if (index > 0 && value.items[index - 1]!.rowIndex >= row.rowIndex) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "rowIndex"], message: "rows not ascending" });
      }
    });
  }),
}).strict();

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function buildQueryString(query: WaypointApiListQuery | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    if (raw === undefined) continue;
    const value = typeof raw === "string" ? raw.trim() : String(raw);
    if (value.length > 0) search.set(key, value);
  }
  const value = search.toString();
  return value.length > 0 ? `?${value}` : "";
}

async function parseResponseOrThrow(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;
  const error = typeof payload === "object" && payload !== null && "error" in payload &&
    typeof payload.error === "object" && payload.error !== null
    ? payload.error as Record<string, unknown>
    : undefined;
  const code = typeof error?.code === "string" ? error.code : null;
  const message = typeof error?.message === "string"
    ? error.message
    : `Backend request failed with status ${response.status}.`;
  throw new WaypointApiRequestError(message, response.status, code);
}

function mapListItem(input: z.infer<typeof listItemSchema>): WaypointApiListItem {
  return {
    ...input,
    metadata: input.metadata as Record<string, WaypointApiMetadataPrimitive> | undefined,
  };
}

export class HttpWaypointApiPort implements WaypointApiPort {
  constructor(
    private readonly fetchFn: FetchLike = fetch,
    private readonly baseUrl: string = resolveBaseUrl(),
  ) {}

  async listWaypoints(
    accessToken: string,
    query?: WaypointApiListQuery,
  ): Promise<WaypointApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/waypoints${buildQueryString(query)}`,
      { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const parsed = listEnvelopeSchema.parse(await parseResponseOrThrow(response));
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    };
  }

  async listWaypointAppearanceRows(
    accessToken: string,
    query: WaypointApiAppearanceRowsQuery,
  ): Promise<WaypointApiAppearanceRowsResult> {
    const search = new URLSearchParams();
    search.set("tableSha256", query.tableSha256);
    if (query.query) search.set("query", query.query);
    if (query.limit !== undefined) search.set("limit", String(query.limit));
    if (query.offset !== undefined) search.set("offset", String(query.offset));
    const response = await this.fetchFn(
      `${this.baseUrl}/catalog/waypoints/appearances?${search.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const parsed = appearanceRowsEnvelopeSchema.parse(
      await parseResponseOrThrow(response),
    ).data;
    if (parsed.sha256 !== query.tableSha256) {
      throw new WaypointApiRequestError(
        "The returned waypoint.2da digest does not match the requested table.",
        409,
        "WAYPOINT_APPEARANCE_TABLE_STALE",
      );
    }
    const expectedLimit = query.limit ?? 100;
    const expectedOffset = query.offset ?? 0;
    if (parsed.limit !== expectedLimit || parsed.offset !== expectedOffset) {
      throw new WaypointApiRequestError(
        "The returned Waypoint Appearance page does not match the requested pagination.",
        502,
        "WAYPOINT_APPEARANCE_PAGE_INVALID",
      );
    }
    return {
      ...parsed,
      items: parsed.items.map((row) => ({ ...row })),
    };
  }
}

export function createHttpWaypointApiPort(
  fetchFn?: FetchLike,
  baseUrl?: string,
): WaypointApiPort {
  return new HttpWaypointApiPort(fetchFn, baseUrl);
}

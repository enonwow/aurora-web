import { z } from "zod";
import { resolveWorkspaceBackendApiBaseUrl } from "../../shared/workspaceBackendApiBaseUrl";
import {
  readAreaEventScriptCatalog,
  readAreaEventScriptCatalogQuery,
  type AreaEventScriptCatalog,
  type AreaEventScriptCatalogQuery,
} from "../domain/areaEventScriptCatalog";
import type { AreaEventScriptCatalogPort } from "../ports/areaEventScriptCatalogPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const successEnvelopeSchema = z.object({
  contractVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u),
  requestId: z.string().min(1).max(256),
  data: z.unknown(),
}).strict();
const errorEnvelopeSchema = z.object({
  contractVersion: z.string().min(1).max(64),
  requestId: z.string().min(1).max(256),
  error: z.object({
    code: z.string().min(1).max(128),
    message: z.string().min(1).max(1024),
    details: z.array(z.unknown()).max(64),
    retryable: z.boolean(),
  }).strict(),
}).strict();

export class AreaEventScriptCatalogRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "AreaEventScriptCatalogRequestError";
  }
}

export class HttpAreaEventScriptCatalogPort implements AreaEventScriptCatalogPort {
  private readonly baseUrl: string;

  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl = resolveWorkspaceBackendApiBaseUrl(),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async list(
    accessToken: string,
    query: AreaEventScriptCatalogQuery,
  ): Promise<AreaEventScriptCatalog> {
    if (accessToken.length < 1 || accessToken.length > 8192 || accessToken.includes("\0")) {
      throw new AreaEventScriptCatalogRequestError(
        "The Area event-script catalog request failed.",
        401,
        "AREA_EVENT_SCRIPT_CATALOG_ACCESS_TOKEN_INVALID",
      );
    }
    const parsedQuery = readAreaEventScriptCatalogQuery(query);
    if (!parsedQuery) {
      throw new AreaEventScriptCatalogRequestError(
        "The Area event-script catalog request failed.",
        422,
        "AREA_EVENT_SCRIPT_CATALOG_QUERY_INVALID",
      );
    }
    const parameters = new URLSearchParams();
    if (parsedQuery.search) parameters.set("search", parsedQuery.search);
    parameters.set("limit", String(parsedQuery.limit));
    parameters.set("offset", String(parsedQuery.offset));
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/event-script-catalog?${parameters.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      },
    );
    const payload = await readJson(response);
    if (!response.ok) {
      const error = errorEnvelopeSchema.safeParse(payload);
      throw new AreaEventScriptCatalogRequestError(
        "The Area event-script catalog request failed.",
        response.status,
        error.success ? error.data.error.code : "AREA_EVENT_SCRIPT_CATALOG_REQUEST_FAILED",
      );
    }
    const envelope = successEnvelopeSchema.safeParse(payload);
    const catalog = envelope.success ? readAreaEventScriptCatalog(envelope.data.data) : null;
    if (!catalog) {
      throw new AreaEventScriptCatalogRequestError(
        "The Area event-script catalog response was invalid.",
        response.status,
        "AREA_EVENT_SCRIPT_CATALOG_RESPONSE_INVALID",
      );
    }
    return catalog;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

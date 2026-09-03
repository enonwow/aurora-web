import { z } from "zod";
import { resolveWorkspaceBackendApiBaseUrl } from "../../shared/workspaceBackendApiBaseUrl";
import { readAreaCapabilityCatalog } from "../domain/areaCapabilityCatalog";
import type { AreaCapabilityCatalog } from "../domain/areaCapabilityCatalog";
import type { AreaCapabilityPort } from "../ports/areaCapabilityPort";

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

export class AreaCapabilityRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AreaCapabilityRequestError";
    this.status = status;
    this.code = code;
  }
}

export class HttpAreaCapabilityPort implements AreaCapabilityPort {
  private readonly baseUrl: string;

  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl = resolveWorkspaceBackendApiBaseUrl(),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async getAreaCapabilities(accessToken: string): Promise<AreaCapabilityCatalog> {
    if (accessToken.length < 1 || accessToken.length > 8192 || accessToken.includes("\0")) {
      throw new AreaCapabilityRequestError(
        "The Area capability catalog request failed.",
        401,
        "AREA_CAPABILITY_ACCESS_TOKEN_INVALID",
      );
    }
    const response = await this.fetchFn(`${this.baseUrl}/areas/capabilities`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const payload = await readJson(response);
    if (!response.ok) {
      const error = errorEnvelopeSchema.safeParse(payload);
      throw new AreaCapabilityRequestError(
        "The Area capability catalog request failed.",
        response.status,
        error.success ? error.data.error.code : "AREA_CAPABILITY_REQUEST_FAILED",
      );
    }
    const envelope = successEnvelopeSchema.safeParse(payload);
    const catalog = envelope.success ? readAreaCapabilityCatalog(envelope.data.data) : null;
    if (!catalog) {
      throw new AreaCapabilityRequestError(
        "The Area capability catalog response was invalid.",
        response.status,
        "AREA_CAPABILITY_RESPONSE_INVALID",
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

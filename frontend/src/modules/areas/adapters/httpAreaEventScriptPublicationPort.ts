import { z } from "zod";
import { resolveWorkspaceBackendApiBaseUrl } from "../../shared/workspaceBackendApiBaseUrl";
import {
  readAreaEventScriptPublicationReceipt,
  readAreaEventScriptSourceCommand,
  readAreaEventScriptSourceSnapshot,
  readAreaEventScriptValidationResult,
  type AreaEventScriptSourceCommand,
} from "../domain/areaEventScriptPublication";
import {
  AreaEventScriptPortError,
  type AreaEventScriptPublicationPort,
  type AreaEventScriptSourceQuery,
} from "../ports/areaEventScriptPublicationPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const MODULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;
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
    message: z.string().min(1).max(1_024),
    details: z.array(z.unknown()).max(100),
    retryable: z.boolean(),
  }).strict(),
}).strict();

export class HttpAreaEventScriptPublicationPort
  implements AreaEventScriptPublicationPort
{
  private readonly baseUrl: string;

  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl = resolveWorkspaceBackendApiBaseUrl(),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async readSource(accessToken: string, query: AreaEventScriptSourceQuery) {
    assertAccessToken(accessToken);
    assertSourceQuery(query);
    const parameters = new URLSearchParams({
      expectedModuleRevision: query.expectedModuleRevision,
    });
    const response = await this.fetchFn(
      `${this.scriptUrl(query.moduleId, query.targetResRef)}/source?${parameters.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      },
    );
    const result = await this.readResult(
      response,
      "source",
      readAreaEventScriptSourceSnapshot,
    );
    if (
      result.moduleId !== query.moduleId
      || result.targetResRef !== query.targetResRef
      || result.moduleRevision !== query.expectedModuleRevision
    ) throw responseInvalid("source");
    return result;
  }

  async validate(accessToken: string, command: AreaEventScriptSourceCommand) {
    assertAccessToken(accessToken);
    const canonical = assertCommand(command);
    const response = await this.fetchFn(
      `${this.scriptUrl(canonical.moduleId, canonical.targetResRef)}/validate`,
      {
        method: "POST",
        headers: jsonHeaders(accessToken),
        body: JSON.stringify(canonical),
      },
    );
    const result = await this.readResult(
      response,
      "validation",
      readAreaEventScriptValidationResult,
    );
    if (
      result.moduleId !== canonical.moduleId
      || result.targetResRef !== canonical.targetResRef
      || result.moduleRevision !== canonical.expectedModuleRevision
    ) throw responseInvalid("validation");
    return result;
  }

  async publish(
    accessToken: string,
    command: AreaEventScriptSourceCommand,
    idempotencyKey: string,
  ) {
    assertAccessToken(accessToken);
    const canonical = assertCommand(command);
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new AreaEventScriptPortError(
        "The Area event-script publication request is invalid.",
        422,
        "AREA_EVENT_SCRIPT_IDEMPOTENCY_KEY_INVALID",
        false,
      );
    }
    const response = await this.fetchFn(
      this.scriptUrl(canonical.moduleId, canonical.targetResRef),
      {
        method: "PUT",
        headers: {
          ...jsonHeaders(accessToken),
          "Idempotency-Key": idempotencyKey,
          "If-Match": `"${canonical.expectedModuleRevision}"`,
        },
        body: JSON.stringify(canonical),
      },
    );
    const receipt = await this.readResult(
      response,
      "publication",
      readAreaEventScriptPublicationReceipt,
    );
    if (
      receipt.moduleId !== canonical.moduleId
      || receipt.targetResRef !== canonical.targetResRef
      || receipt.previousModuleRevision !== canonical.expectedModuleRevision
    ) throw responseInvalid("publication");
    const idempotency = response.headers.get("Idempotency-Status");
    if (idempotency !== "created" && idempotency !== "replayed") {
      throw responseInvalid("publication");
    }
    return Object.freeze({ idempotency, receipt });
  }

  private scriptUrl(moduleId: string, targetResRef: string): string {
    return `${this.baseUrl}/modules/${encodeURIComponent(moduleId)}/scripts/${encodeURIComponent(targetResRef)}`;
  }

  private async readResult<T>(
    response: Response,
    operation: "source" | "validation" | "publication",
    reader: (value: unknown) => T | null,
  ): Promise<T> {
    const payload = await readBoundedJson(response);
    if (!response.ok) {
      const parsed = errorEnvelopeSchema.safeParse(payload);
      throw new AreaEventScriptPortError(
        `The Area event-script ${operation} request failed.`,
        response.status,
        parsed.success ? parsed.data.error.code : "AREA_EVENT_SCRIPT_REQUEST_FAILED",
        parsed.success ? parsed.data.error.retryable : response.status >= 500,
      );
    }
    const envelope = successEnvelopeSchema.safeParse(payload);
    const value = envelope.success ? reader(envelope.data.data) : null;
    if (!value) throw responseInvalid(operation);
    return value;
  }
}

function assertAccessToken(accessToken: string): void {
  if (accessToken.length < 1 || accessToken.length > 8_192 || accessToken.includes("\0")) {
    throw new AreaEventScriptPortError(
      "The Area event-script request is unauthorized.",
      401,
      "AREA_EVENT_SCRIPT_ACCESS_TOKEN_INVALID",
      false,
    );
  }
}

function assertSourceQuery(query: AreaEventScriptSourceQuery): void {
  if (
    !query ||
    !MODULE_ID_PATTERN.test(query.moduleId ?? "") ||
    !RESREF_PATTERN.test(query.targetResRef ?? "") ||
    query.targetResRef === "nwscript" ||
    !SHA256_PATTERN.test(query.expectedModuleRevision ?? "")
  ) {
    throw new AreaEventScriptPortError(
      "The Area event-script source query is invalid.",
      422,
      "AREA_EVENT_SCRIPT_SOURCE_QUERY_INVALID",
      false,
    );
  }
}

function assertCommand(command: AreaEventScriptSourceCommand): AreaEventScriptSourceCommand {
  const canonical = readAreaEventScriptSourceCommand(command);
  if (!canonical) {
    throw new AreaEventScriptPortError(
      "The Area event-script source command is invalid.",
      422,
      "AREA_EVENT_SCRIPT_SOURCE_COMMAND_INVALID",
      false,
    );
  }
  return canonical;
}

function jsonHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) return null;
  try {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function responseInvalid(operation: string): AreaEventScriptPortError {
  return new AreaEventScriptPortError(
    `The Area event-script ${operation} response was invalid.`,
    502,
    "AREA_EVENT_SCRIPT_RESPONSE_INVALID",
    true,
  );
}

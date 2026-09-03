import { z } from "zod";

import type { AreaDeletePreview, AreaDeleteReceipt } from "../areaDeleteContracts";
import type {
  AreaDeleteApiFailure,
  AreaDeleteApiMetadata,
  AreaDeleteApiOperation,
  AreaDeleteApiPort,
  AreaDeleteApiResult,
  AreaDeleteMutationInput,
  AreaDeletePreviewInput
} from "../ports/areaDeleteApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const CONTRACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const nonBlankSchema = z.string().min(1);
const sha256Schema = z.string().regex(SHA256_PATTERN);
const resRefSchema = z.string().regex(RESREF_PATTERN);
const nonNegativeIntegerSchema = z.number().int().nonnegative();

const previewResourceSchema = z
  .object({
    logicalKey: nonBlankSchema,
    resourceType: nonNegativeIntegerSchema,
    size: nonNegativeIntegerSchema,
    sha256: sha256Schema
  })
  .strict();

const findingSchema = z
  .object({
    code: z.enum([
      "AREA_DELETE_ENTRY_AREA_REFERENCE",
      "AREA_DELETE_GIT_REFERENCE",
      "AREA_DELETE_SCRIPT_SOURCE_REFERENCE",
      "AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE",
      "AREA_DELETE_GIT_SCAN_INVALID",
      "AREA_DELETE_TARGET_RESOURCE_INVALID",
      "AREA_DELETE_MEMBERSHIP_INVALID",
      "AREA_DELETE_REFERENCE_SCAN_TRUNCATED"
    ]),
    severity: z.enum(["blocker", "warning"]),
    resourceKey: nonBlankSchema,
    fieldPath: z.string(),
    reason: nonBlankSchema
  })
  .strict();

const previewSchema = z
  .object({
    schemaVersion: z.literal("area-delete-preview.v1"),
    scanVersion: z.literal("area-delete-impact-scan.v1"),
    moduleId: nonBlankSchema,
    areaResRef: resRefSchema,
    moduleRevision: sha256Schema,
    targetResources: z.array(previewResourceSchema).length(3),
    moduleIfo: previewResourceSchema,
    membershipCount: nonNegativeIntegerSchema,
    entryAreaResRef: resRefSchema.nullable(),
    findings: z.array(findingSchema).max(256),
    blockerCount: nonNegativeIntegerSchema,
    warningCount: nonNegativeIntegerSchema,
    previewSha256: sha256Schema,
    expiresAt: z.string().datetime()
  })
  .strict()
  .superRefine((value, context) => {
    const expected = new Map<string, number>([
      [`${value.areaResRef}.are`, 2012],
      [`${value.areaResRef}.git`, 2023],
      [`${value.areaResRef}.gic`, 2046]
    ]);
    if (
      value.targetResources.some(
        (entry) => expected.get(entry.logicalKey.toLowerCase()) !== entry.resourceType
      ) ||
      new Set(value.targetResources.map((entry) => entry.logicalKey.toLowerCase())).size !== 3 ||
      value.moduleIfo.logicalKey.toLowerCase() !== "module.ifo" ||
      value.moduleIfo.resourceType !== 2014 ||
      value.blockerCount !== value.findings.filter((entry) => entry.severity === "blocker").length ||
      value.warningCount !== value.findings.filter((entry) => entry.severity === "warning").length
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Delete preview is inconsistent." });
    }
  });

const persistedResourceSchema = z
  .object({
    extension: z.enum(["are", "git", "gic"]),
    key: nonBlankSchema,
    fileName: nonBlankSchema,
    resourceType: nonNegativeIntegerSchema,
    size: nonNegativeIntegerSchema,
    sha256: sha256Schema
  })
  .strict();

const receiptSchema = z
  .object({
    schemaVersion: z.literal("area-delete-receipt.v1"),
    transactionId: nonBlankSchema,
    areaResRef: resRefSchema,
    moduleId: nonBlankSchema,
    previousModuleRevision: sha256Schema,
    newModuleRevision: sha256Schema,
    commandHash: sha256Schema,
    previewSha256: sha256Schema,
    scanVersion: z.literal("area-delete-impact-scan.v1"),
    removedResources: z.array(persistedResourceSchema).length(3),
    moduleIfo: z
      .object({
        key: nonBlankSchema,
        baselineSha256: sha256Schema,
        candidateSha256: sha256Schema,
        size: nonNegativeIntegerSchema
      })
      .strict(),
    survivorCount: nonNegativeIntegerSchema,
    blockerCount: z.literal(0),
    readbackStatus: z.literal("verified"),
    warnings: z.array(z.string()),
    deletedAt: z.string().datetime()
  })
  .strict()
  .superRefine((value, context) => {
    const expected = new Map<string, number>([
      ["are", 2012],
      ["git", 2023],
      ["gic", 2046]
    ]);
    if (
      value.removedResources.some(
        (entry) =>
          expected.get(entry.extension) !== entry.resourceType ||
          entry.fileName.toLowerCase() !== `${value.areaResRef}.${entry.extension}`
      ) ||
      new Set(value.removedResources.map((entry) => entry.extension)).size !== 3
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Delete receipt is inconsistent." });
    }
  });

function successEnvelopeSchema<TSchema extends z.ZodTypeAny>(data: TSchema) {
  return z
    .object({
      contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
      requestId: nonBlankSchema,
      data
    })
    .strict();
}

const previewEnvelopeSchema = successEnvelopeSchema(previewSchema);
const receiptEnvelopeSchema = successEnvelopeSchema(receiptSchema);
const errorEnvelopeSchema = z
  .object({
    contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
    requestId: nonBlankSchema,
    error: z
      .object({
        code: nonBlankSchema,
        message: nonBlankSchema,
        details: z.array(z.object({ path: z.string(), reason: nonBlankSchema }).strict()),
        retryable: z.boolean()
      })
      .strict()
  })
  .strict();

function jsonHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=utf-8"
  };
}

function invalidResponseFailure(
  operation: AreaDeleteApiOperation,
  response: Response
): AreaDeleteApiResult<never> {
  const etag = response.headers.get("etag");
  return {
    ok: false,
    error: {
      code: "AREA_DELETE_RESPONSE_INVALID",
      operation,
      status: response.status,
      message: "The Area Delete API returned a response outside the v1 contract.",
      retryable: response.status >= 500,
      details: [],
      ...(etag ? { etag } : {})
    }
  };
}

function transportFailure(operation: AreaDeleteApiOperation): AreaDeleteApiResult<never> {
  return {
    ok: false,
    error: {
      code: "AREA_DELETE_TRANSPORT_FAILED",
      operation,
      status: null,
      message: "The Area Delete API request could not be completed.",
      retryable: true,
      details: []
    }
  };
}

function backendFailure(
  operation: AreaDeleteApiOperation,
  response: Response,
  payload: unknown
): AreaDeleteApiResult<never> {
  const parsed = errorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return invalidResponseFailure(operation, response);
  const etag = response.headers.get("etag");
  const error: AreaDeleteApiFailure = {
    code: parsed.data.error.code,
    operation,
    status: response.status,
    message: parsed.data.error.message,
    retryable: parsed.data.error.retryable,
    details: parsed.data.error.details,
    contractVersion: parsed.data.contractVersion,
    requestId: parsed.data.requestId,
    ...(etag ? { etag } : {})
  };
  return { ok: false, error };
}

export class HttpAreaDeleteApiPort implements AreaDeleteApiPort {
  private readonly baseUrl: string;

  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl = resolveAreaDeleteApiBaseUrl(
      import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined,
      import.meta.env.DEV
    )
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async preview(input: AreaDeletePreviewInput): Promise<AreaDeleteApiResult<AreaDeletePreview>> {
    const operation = "preview_delete" as const;
    let response: Response;
    let payload: unknown;
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/areas/${encodeURIComponent(input.areaResRef)}/delete-previews`,
        {
          method: "POST",
          headers: {
            ...jsonHeaders(input.accessToken),
            "If-Match": `"${input.command.expectedModuleRevision}"`
          },
          body: JSON.stringify(input.command)
        }
      );
      payload = await response.json();
    } catch {
      return transportFailure(operation);
    }
    if (!response.ok) return backendFailure(operation, response, payload);
    const parsed = previewEnvelopeSchema.safeParse(payload);
    if (!parsed.success) return invalidResponseFailure(operation, response);
    const expectedEtag = `"${parsed.data.data.moduleRevision}"`;
    if (response.headers.get("etag") !== expectedEtag) {
      return invalidResponseFailure(operation, response);
    }
    const metadata: AreaDeleteApiMetadata = {
      contractVersion: parsed.data.contractVersion,
      requestId: parsed.data.requestId,
      moduleRevision: parsed.data.data.moduleRevision,
      etag: expectedEtag
    };
    return { ok: true, value: parsed.data.data as AreaDeletePreview, metadata };
  }

  async delete(input: AreaDeleteMutationInput): Promise<AreaDeleteApiResult<AreaDeleteReceipt>> {
    const operation = "delete_area" as const;
    let response: Response;
    let payload: unknown;
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/areas/${encodeURIComponent(input.areaResRef)}`,
        {
          method: "DELETE",
          headers: {
            ...jsonHeaders(input.accessToken),
            "Idempotency-Key": input.idempotencyKey,
            "If-Match": `"${input.command.expectedModuleRevision}"`
          },
          body: JSON.stringify(input.command)
        }
      );
      payload = await response.json();
    } catch {
      return transportFailure(operation);
    }
    if (!response.ok) return backendFailure(operation, response, payload);
    const parsed = receiptEnvelopeSchema.safeParse(payload);
    if (!parsed.success) return invalidResponseFailure(operation, response);
    const expectedEtag = `"${parsed.data.data.newModuleRevision}"`;
    const idempotencyStatus = response.headers.get("idempotency-status");
    if (
      response.headers.get("etag") !== expectedEtag ||
      (idempotencyStatus !== "created" && idempotencyStatus !== "replayed")
    ) {
      return invalidResponseFailure(operation, response);
    }
    return {
      ok: true,
      value: parsed.data.data as AreaDeleteReceipt,
      metadata: {
        contractVersion: parsed.data.contractVersion,
        requestId: parsed.data.requestId,
        moduleRevision: parsed.data.data.newModuleRevision,
        etag: expectedEtag,
        idempotencyStatus
      }
    };
  }
}

export function resolveAreaDeleteApiBaseUrl(
  candidate: string | undefined,
  isDevelopment: boolean
): string {
  const normalized = candidate?.trim();
  if (normalized) return normalized.replace(/\/+$/u, "");
  return isDevelopment ? "/_aurora/v1" : "/api/v1";
}

export function createHttpAreaDeleteApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl?: string
): HttpAreaDeleteApiPort {
  return new HttpAreaDeleteApiPort(fetchFn, baseUrl);
}

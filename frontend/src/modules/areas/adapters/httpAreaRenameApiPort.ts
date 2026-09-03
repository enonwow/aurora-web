import { z } from "zod";
import type { AreaRenamePreview, AreaRenameReceipt } from "../areaRenameContracts";
import type {
  AreaRenameApiFailure,
  AreaRenameApiMetadata,
  AreaRenameApiOperation,
  AreaRenameApiPort,
  AreaRenameApiResult,
  AreaRenameMutationInput,
  AreaRenamePreviewInput
} from "../ports/areaRenameApiPort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const sha = z.string().regex(/^[a-f0-9]{64}$/u);
const resref = z.string().regex(/^[a-z0-9_]{1,16}$/u);
const nonBlank = z.string().min(1);
const integer = z.number().int().nonnegative();
const descriptor = z.object({
  logicalKey: nonBlank, resourceType: integer, size: integer, sha256: sha
}).strict();
const finding = z.object({
  code: z.enum([
    "AREA_RENAME_STATIC_REFERENCE",
    "AREA_RENAME_SOURCE_IDENTITY_INVALID",
    "AREA_RENAME_COMPANION_INVALID",
    "AREA_RENAME_MEMBERSHIP_INVALID",
    "AREA_RENAME_SCAN_BUDGET_EXCEEDED",
    "AREA_RENAME_REFERENCE_SCAN_TRUNCATED"
  ]),
  severity: z.enum(["blocker", "warning"]),
  resourceKey: nonBlank,
  fieldPath: z.string(),
  reason: nonBlank
}).strict();

const previewSchema = z.object({
  schemaVersion: z.literal("area-rename-preview.v1"),
  scanVersion: z.literal("area-rename-impact-scan.v1"),
  moduleId: nonBlank,
  areaResRef: resref,
  targetAreaResRef: resref,
  moduleRevision: sha,
  sourceResources: z.array(descriptor).length(3),
  targetResourceKeys: z.array(nonBlank).length(3),
  moduleIfo: descriptor,
  sourceAreaRootResRef: resref.nullable(),
  oldMembershipCount: integer,
  newMembershipCount: integer,
  entryAreaResRef: resref.nullable(),
  entryAreaUpdated: z.boolean(),
  scanBudgets: z.object({
    maxObjects: integer,
    maxObjectBytes: integer,
    maxTotalBytes: integer,
    maxFindings: integer
  }).strict(),
  findings: z.array(finding).max(256),
  blockerCount: integer,
  warningCount: integer,
  previewSha256: sha,
  expiresAt: z.string().datetime()
}).strict().superRefine((value, context) => {
  const sourceExpected = new Map([
    [`${value.areaResRef}.are`, 2012],
    [`${value.areaResRef}.gic`, 2046],
    [`${value.areaResRef}.git`, 2023]
  ]);
  const targetExpected = new Set([
    `${value.targetAreaResRef}.are`,
    `${value.targetAreaResRef}.gic`,
    `${value.targetAreaResRef}.git`
  ]);
  if (value.sourceResources.some((entry) =>
        sourceExpected.get(entry.logicalKey.toLowerCase()) !== entry.resourceType) ||
      new Set(value.sourceResources.map((entry) => entry.logicalKey.toLowerCase())).size !== 3 ||
      new Set(value.targetResourceKeys.map((entry) => entry.toLowerCase())).size !== 3 ||
      value.targetResourceKeys.some((entry) => !targetExpected.has(entry.toLowerCase())) ||
      value.moduleIfo.logicalKey.toLowerCase() !== "module.ifo" ||
      value.moduleIfo.resourceType !== 2014 ||
      value.blockerCount !== value.findings.filter((entry) => entry.severity === "blocker").length ||
      value.warningCount !== value.findings.filter((entry) => entry.severity === "warning").length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Rename preview is inconsistent." });
  }
});

const persistedResource = z.object({
  extension: z.enum(["are", "gic", "git"]),
  sourceKey: nonBlank,
  targetKey: nonBlank,
  resourceType: integer,
  baselineSize: integer,
  baselineSha256: sha,
  candidateSize: integer,
  candidateSha256: sha
}).strict();

const receiptSchema = z.object({
  schemaVersion: z.literal("area-rename-receipt.v1"),
  transactionId: nonBlank,
  moduleId: nonBlank,
  areaResRef: resref,
  targetAreaResRef: resref,
  previousModuleRevision: sha,
  newModuleRevision: sha,
  commandHash: sha,
  previewSha256: sha,
  scanVersion: z.literal("area-rename-impact-scan.v1"),
  resources: z.array(persistedResource).length(3),
  moduleIfo: z.object({
    key: z.literal("module.ifo"),
    baselineSize: integer,
    baselineSha256: sha,
    candidateSize: integer,
    candidateSha256: sha
  }).strict(),
  entryAreaUpdated: z.boolean(),
  blockerCount: z.literal(0),
  warningCount: integer,
  readbackStatus: z.literal("verified"),
  warnings: z.array(z.string()),
  renamedAt: z.string().datetime()
}).strict().superRefine((value, context) => {
  const expectedTypes = new Map([["are", 2012], ["gic", 2046], ["git", 2023]]);
  if (value.resources.some((entry) =>
        expectedTypes.get(entry.extension) !== entry.resourceType ||
        entry.sourceKey.toLowerCase() !== `${value.areaResRef}.${entry.extension}` ||
        entry.targetKey.toLowerCase() !== `${value.targetAreaResRef}.${entry.extension}`) ||
      new Set(value.resources.map((entry) => entry.extension)).size !== 3) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Rename receipt is inconsistent." });
  }
});

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    contractVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u),
    requestId: nonBlank,
    data
  }).strict();
}

const previewEnvelope = envelope(previewSchema);
const receiptEnvelope = envelope(receiptSchema);
const errorEnvelope = z.object({
  contractVersion: nonBlank,
  requestId: nonBlank,
  error: z.object({
    code: nonBlank,
    message: nonBlank,
    details: z.array(z.object({ path: z.string(), reason: nonBlank }).strict()),
    retryable: z.boolean()
  }).strict()
}).strict();

function headers(token: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=utf-8"
  };
}

function failure(
  operation: AreaRenameApiOperation,
  response: Response | null,
  payload?: unknown
): AreaRenameApiResult<never> {
  const parsed = response ? errorEnvelope.safeParse(payload) : null;
  if (response && parsed?.success) {
    const error: AreaRenameApiFailure = {
      code: parsed.data.error.code,
      operation,
      status: response.status,
      message: parsed.data.error.message,
      retryable: parsed.data.error.retryable,
      details: parsed.data.error.details,
      contractVersion: parsed.data.contractVersion,
      requestId: parsed.data.requestId,
      ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {})
    };
    return { ok: false, error };
  }
  return {
    ok: false,
    error: {
      code: response ? "AREA_RENAME_RESPONSE_INVALID" : "AREA_RENAME_TRANSPORT_FAILED",
      operation,
      status: response?.status ?? null,
      message: response
        ? "The Area rename API returned a response outside the v1 contract."
        : "The Area rename API request could not be completed.",
      retryable: !response || response.status >= 500,
      details: []
    }
  };
}

export class HttpAreaRenameApiPort implements AreaRenameApiPort {
  private readonly baseUrl: string;

  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl = resolveAreaRenameApiBaseUrl(
      import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined,
      import.meta.env.DEV
    )
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async preview(input: AreaRenamePreviewInput): Promise<AreaRenameApiResult<AreaRenamePreview>> {
    const operation = "preview_rename" as const;
    let response: Response;
    let payload: unknown;
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/areas/${encodeURIComponent(input.areaResRef)}/rename-previews`,
        {
          method: "POST",
          headers: { ...headers(input.accessToken), "If-Match": `"${input.command.expectedModuleRevision}"` },
          body: JSON.stringify(input.command)
        }
      );
      payload = await response.json();
    } catch {
      return failure(operation, null);
    }
    if (!response.ok) return failure(operation, response, payload);
    const parsed = previewEnvelope.safeParse(payload);
    if (!parsed.success || response.headers.get("etag") !== `"${parsed.data.data.moduleRevision}"`) {
      return failure(operation, response);
    }
    const metadata: AreaRenameApiMetadata = {
      contractVersion: parsed.data.contractVersion,
      requestId: parsed.data.requestId,
      moduleRevision: parsed.data.data.moduleRevision,
      etag: `"${parsed.data.data.moduleRevision}"`
    };
    return { ok: true, value: parsed.data.data as AreaRenamePreview, metadata };
  }

  async rename(input: AreaRenameMutationInput): Promise<AreaRenameApiResult<AreaRenameReceipt>> {
    const operation = "rename_area" as const;
    let response: Response;
    let payload: unknown;
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/areas/${encodeURIComponent(input.areaResRef)}/renames`,
        {
          method: "POST",
          headers: {
            ...headers(input.accessToken),
            "Idempotency-Key": input.idempotencyKey,
            "If-Match": `"${input.command.expectedModuleRevision}"`
          },
          body: JSON.stringify(input.command)
        }
      );
      payload = await response.json();
    } catch {
      return failure(operation, null);
    }
    if (!response.ok) return failure(operation, response, payload);
    const parsed = receiptEnvelope.safeParse(payload);
    const idempotencyStatus = response.headers.get("idempotency-status");
    if (!parsed.success || response.headers.get("etag") !== `"${parsed.data.data.newModuleRevision}"` ||
        (idempotencyStatus !== "created" && idempotencyStatus !== "replayed")) {
      return failure(operation, response);
    }
    return {
      ok: true,
      value: parsed.data.data as AreaRenameReceipt,
      metadata: {
        contractVersion: parsed.data.contractVersion,
        requestId: parsed.data.requestId,
        moduleRevision: parsed.data.data.newModuleRevision,
        etag: `"${parsed.data.data.newModuleRevision}"`,
        idempotencyStatus
      }
    };
  }
}

export function resolveAreaRenameApiBaseUrl(candidate: string | undefined, development: boolean): string {
  const normalized = candidate?.trim();
  if (normalized) return normalized.replace(/\/+$/u, "");
  return development ? "/_aurora/v1" : "/api/v1";
}

export function createHttpAreaRenameApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl?: string
): HttpAreaRenameApiPort {
  return new HttpAreaRenameApiPort(fetchFn, baseUrl);
}

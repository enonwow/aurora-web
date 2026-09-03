import { z } from "zod";

import type {
  AreaCreateExecution,
  AreaCreateProfileCatalog,
  AreaCreateValidationReceipt
} from "../areaCreateContracts";
import type {
  AreaCreateApiFailure,
  AreaCreateApiMetadata,
  AreaCreateApiOperation,
  AreaCreateApiPort,
  AreaCreateApiResult,
  AreaCreateMutationInput,
  AreaCreateValidationInput
} from "../ports/areaCreateApiPort";
import { areaTileProductionAdmissionSchema } from "./areaTileProductionAdmissionSchema";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CONTRACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

const nonBlankSchema = z.string().min(1);
const sha256Schema = z.string().regex(SHA256_PATTERN);
const orientationSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);

const tileSchema = z
  .object({
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
    tileId: z.number().int().nonnegative(),
    orientation: orientationSchema,
    height: z.number().int().nonnegative(),
    mainLight1: z.number().int().min(0).max(255),
    mainLight2: z.number().int().min(0).max(255),
    sourceLight1: z.number().int().min(0).max(255),
    sourceLight2: z.number().int().min(0).max(255),
    animLoop1: z.number().int().min(0).max(255),
    animLoop2: z.number().int().min(0).max(255),
    animLoop3: z.number().int().min(0).max(255)
  })
  .strict();

const groupCellSchema = z
  .object({
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative()
  })
  .strict();

const groupInstanceSchema = z
  .object({
    groupId: nonBlankSchema,
    anchorRow: z.number().int().nonnegative(),
    anchorCol: z.number().int().nonnegative(),
    orientation: orientationSchema,
    cells: z.array(groupCellSchema)
  })
  .strict();

const creationProfileBaseSchema = z
  .object({
    id: nonBlankSchema,
    evidenceScope: z.literal("aur-s05-05-structural-candidate"),
    tilesetResRef: nonBlankSchema,
    width: z.number().int().min(2).max(32),
    height: z.number().int().min(2).max(32),
    initializerAlgorithmVersion: nonBlankSchema,
    initializerSeed: z.number().int().nonnegative(),
    tiles: z.array(tileSchema).max(1024),
    groupInstances: z.array(groupInstanceSchema).max(1024),
    fingerprintSha256: sha256Schema,
    setFingerprintSha256: sha256Schema
  });

const creationProfileSchema = z.discriminatedUnion("persistenceStatus", [
  creationProfileBaseSchema
    .extend({
      persistenceStatus: z.literal(
        "structural-candidate-awaiting-native-certification"
      ),
      materializationAllowed: z.literal(false),
      certificationId: z.null(),
      blockingProofs: z.array(
        z.enum(["runtime-canvas", "toolset-save-build", "nwn-runtime-load"])
      )
    })
    .strict(),
  creationProfileBaseSchema
    .extend({
      persistenceStatus: z.literal("native-certified"),
      materializationAllowed: z.literal(true),
      certificationId: nonBlankSchema,
      blockingProofs: z.tuple([])
    })
    .strict()
]);

const resourceDescriptorSchema = z
  .object({
    extension: z.enum(["are", "git", "gic"]),
    fileName: nonBlankSchema,
    resourceType: z.number().int().nonnegative(),
    size: z.number().int().nonnegative(),
    sha256: sha256Schema
  })
  .strict();

const profilesDataSchema = z
  .object({
    moduleId: nonBlankSchema,
    moduleRevision: nonBlankSchema,
    profiles: z.array(creationProfileSchema)
  })
  .strict();

const validationReceiptSchema = z
  .object({
    validationId: nonBlankSchema,
    commandHash: sha256Schema,
    moduleId: nonBlankSchema,
    moduleRevision: nonBlankSchema,
    profileFingerprintSha256: sha256Schema,
    setFingerprintSha256: sha256Schema,
    tileProductionAdmission: areaTileProductionAdmissionSchema,
    validatorVersion: nonBlankSchema,
    resources: z.array(resourceDescriptorSchema).length(3),
    moduleIfo: z
      .object({
        fileName: nonBlankSchema,
        size: z.number().int().nonnegative(),
        sha256: sha256Schema
      })
      .strict(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime()
  })
  .strict();

const persistedResourceSchema = resourceDescriptorSchema.extend({
  key: nonBlankSchema
}).strict();

const receiptSchema = z
  .object({
    schemaVersion: z.literal("area-create-receipt.v1"),
    transactionId: nonBlankSchema,
    areaId: nonBlankSchema,
    resRef: nonBlankSchema,
    name: nonBlankSchema,
    tag: nonBlankSchema,
    moduleId: nonBlankSchema,
    previousModuleRevision: nonBlankSchema,
    newModuleRevision: nonBlankSchema,
    profileId: nonBlankSchema,
    profileFingerprintSha256: sha256Schema,
    setFingerprintSha256: sha256Schema,
    tileProductionAdmission: areaTileProductionAdmissionSchema,
    draftNormalizedSha256: sha256Schema,
    commandHash: sha256Schema,
    validatorVersion: nonBlankSchema,
    resources: z.array(persistedResourceSchema).length(3),
    moduleIfo: z
      .object({
        key: nonBlankSchema,
        size: z.number().int().nonnegative(),
        sha256: sha256Schema
      })
      .strict(),
    readbackStatus: z.literal("verified"),
    warnings: z.array(z.string()),
    createdAt: z.string().datetime()
  })
  .strict();

const executionSchema = z
  .object({
    idempotency: z.enum(["created", "replayed"]),
    receipt: receiptSchema
  })
  .strict();

function successEnvelopeSchema<TSchema extends z.ZodTypeAny>(data: TSchema) {
  return z
    .object({
      contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
      requestId: nonBlankSchema,
      data
    })
    .strict();
}

const profilesEnvelopeSchema = successEnvelopeSchema(profilesDataSchema);
const validationEnvelopeSchema = successEnvelopeSchema(validationReceiptSchema);
const executionEnvelopeSchema = successEnvelopeSchema(executionSchema);

const errorEnvelopeSchema = z
  .object({
    contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
    requestId: nonBlankSchema,
    error: z
      .object({
        code: nonBlankSchema,
        message: nonBlankSchema,
        details: z.array(
          z
            .object({
              path: z.string(),
              reason: nonBlankSchema
            })
            .strict()
        ),
        retryable: z.boolean()
      })
      .strict()
  })
  .strict();

interface SuccessProjection<TValue> {
  readonly value: TValue;
  readonly metadata: AreaCreateApiMetadata;
}

export function resolveAreaCreateApiBaseUrl(
  candidate: string | undefined,
  isDevelopment: boolean
): string {
  const normalized = candidate?.trim();
  if (normalized) {
    return normalized.replace(/\/+$/u, "");
  }
  return isDevelopment ? "/_aurora/v1" : "/api/v1";
}

function resolveBaseUrl(): string {
  return resolveAreaCreateApiBaseUrl(
    import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined,
    import.meta.env.DEV
  );
}

function authorizationHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

function jsonHeaders(accessToken: string): Record<string, string> {
  return {
    ...authorizationHeaders(accessToken),
    "Content-Type": "application/json; charset=utf-8"
  };
}

function invalidResponseFailure(
  operation: AreaCreateApiOperation,
  response: Response,
  details: readonly { readonly path: string; readonly reason: string }[] = []
): AreaCreateApiResult<never> {
  const etag = response.headers.get("etag");
  return {
    ok: false,
    error: {
      code: "AREA_CREATE_RESPONSE_INVALID",
      operation,
      status: response.status,
      message: "The Area Create API returned a response outside the v1 contract.",
      retryable: response.status >= 500,
      details,
      ...(etag ? { etag } : {})
    }
  };
}

function transportFailure(operation: AreaCreateApiOperation): AreaCreateApiResult<never> {
  return {
    ok: false,
    error: {
      code: "AREA_CREATE_TRANSPORT_FAILED",
      operation,
      status: null,
      message: "The Area Create API request could not be completed.",
      retryable: true,
      details: []
    }
  };
}

function backendFailure(
  operation: AreaCreateApiOperation,
  response: Response,
  payload: unknown
): AreaCreateApiResult<never> {
  const parsed = errorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    return invalidResponseFailure(operation, response);
  }
  const etag = response.headers.get("etag");
  const error: AreaCreateApiFailure = {
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

export class HttpAreaCreateApiPort implements AreaCreateApiPort {
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;

  constructor(fetchFn: FetchLike = fetch.bind(globalThis), baseUrl = resolveBaseUrl()) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  getProfiles(accessToken: string): Promise<AreaCreateApiResult<AreaCreateProfileCatalog>> {
    return this.request(
      "get_profiles",
      `${this.baseUrl}/area-creation/profiles`,
      {
        method: "GET",
        headers: authorizationHeaders(accessToken)
      },
      profilesEnvelopeSchema,
      (parsed) => ({
        value: parsed.data,
        metadata: {
          contractVersion: parsed.contractVersion,
          requestId: parsed.requestId,
          moduleRevision: parsed.data.moduleRevision
        }
      })
    );
  }

  validate(
    input: AreaCreateValidationInput
  ): Promise<AreaCreateApiResult<AreaCreateValidationReceipt>> {
    return this.request(
      "validate_candidate",
      `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/area-creation-validations`,
      {
        method: "POST",
        headers: jsonHeaders(input.accessToken),
        body: JSON.stringify(input.command)
      },
      validationEnvelopeSchema,
      (parsed) => ({
        value: parsed.data,
        metadata: {
          contractVersion: parsed.contractVersion,
          requestId: parsed.requestId,
          moduleRevision: parsed.data.moduleRevision
        }
      })
    );
  }

  create(input: AreaCreateMutationInput): Promise<AreaCreateApiResult<AreaCreateExecution>> {
    return this.request(
      "create_area",
      `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/areas`,
      {
        method: "POST",
        headers: {
          ...jsonHeaders(input.accessToken),
          "Idempotency-Key": input.idempotencyKey,
          "If-Match": `"${input.command.expectedModuleRevision}"`
        },
        body: JSON.stringify(input.command)
      },
      executionEnvelopeSchema,
      (parsed, response) => {
        const etag = response.headers.get("etag");
        const expectedEtag = `"${parsed.data.receipt.newModuleRevision}"`;
        if (etag !== expectedEtag) {
          throw new Error();
        }
        return {
          value: parsed.data,
          metadata: {
            contractVersion: parsed.contractVersion,
            requestId: parsed.requestId,
            moduleRevision: parsed.data.receipt.newModuleRevision,
            etag
          }
        };
      }
    );
  }

  private async request<TSchema extends z.ZodTypeAny, TValue>(
    operation: AreaCreateApiOperation,
    url: string,
    init: RequestInit,
    schema: TSchema,
    project: (parsed: z.infer<TSchema>, response: Response) => SuccessProjection<TValue>
  ): Promise<AreaCreateApiResult<TValue>> {
    let response: Response;
    try {
      response = await this.fetchFn(url, init);
    } catch {
      return transportFailure(operation);
    }

    const [payloadResult] = await Promise.allSettled([response.json()]);
    if (payloadResult.status !== "fulfilled") {
      return invalidResponseFailure(operation, response, [
        { path: "response.body", reason: "invalid_json" }
      ]);
    }
    const payload: unknown = payloadResult.value;

    if (!response.ok) {
      return backendFailure(operation, response, payload);
    }

    try {
      const projected = project(schema.parse(payload), response);
      return {
        ok: true,
        value: projected.value,
        metadata: projected.metadata
      };
    } catch {
      return invalidResponseFailure(operation, response);
    }
  }
}

export function createHttpAreaCreateApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): AreaCreateApiPort {
  return new HttpAreaCreateApiPort(fetchFn, baseUrl);
}

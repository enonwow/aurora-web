import { z } from "zod";

import type {
  AreaUpdateReceipt,
  AreaUpdateValidationReceipt
} from "../areaUpdateContracts";
import type {
  AreaUpdateApiFailure,
  AreaUpdateApiMetadata,
  AreaUpdateApiOperation,
  AreaUpdateApiPort,
  AreaUpdateApiResult,
  AreaUpdateMutationInput,
  AreaUpdateValidationInput
} from "../ports/areaUpdateApiPort";
import { areaTileProductionAdmissionSchema } from "./areaTileProductionAdmissionSchema";
import {
  auroraVariableEntriesEqual,
  readAuroraVariableSourceEntries,
  readAuroraVariableTargetEntries,
  type AuroraVariableSourceEntry,
  type AuroraVariableTargetEntry
} from "../../shared/domain/auroraVariableTable";
import {
  areaAudioEnvironmentsEqual,
  isAreaAudioEnvironment,
  type AreaAudioEnvironment
} from "../domain/areaAudioEnvironment";
import {
  areaModuleStartLocationsEqual,
  isAreaModuleStartLocation,
  type AreaModuleStartLocation
} from "../domain/areaModuleStartLocation";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CONTRACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const nonBlankSchema = z.string().min(1);
const sha256Schema = z.string().regex(SHA256_PATTERN);
const nonNegativeIntegerSchema = z.number().int().nonnegative();

const draftIdentitySchema = z
  .object({
    id: nonBlankSchema,
    revision: z.number().int().positive(),
    normalizedSha256: sha256Schema
  })
  .strict();

function resourceSchema(
  extension: "are" | "git" | "gic",
  resourceType: 2012 | 2023 | 2046
) {
  return z
    .object({
      extension: z.literal(extension),
      fileName: nonBlankSchema,
      resourceType: z.literal(resourceType),
      size: nonNegativeIntegerSchema,
      sha256: sha256Schema
    })
    .strict();
}

const areResourceSchema = resourceSchema("are", 2012);
const gitResourceSchema = resourceSchema("git", 2023);
const gicResourceSchema = resourceSchema("gic", 2046);
const resourceSetSchema = z.tuple([
  areResourceSchema,
  gitResourceSchema,
  gicResourceSchema
]);

const familyCountsSchema = z
  .object({
    creature: nonNegativeIntegerSchema,
    door: nonNegativeIntegerSchema,
    encounter: nonNegativeIntegerSchema,
    item: nonNegativeIntegerSchema,
    placeable: nonNegativeIntegerSchema,
    sound: nonNegativeIntegerSchema,
    store: nonNegativeIntegerSchema,
    trigger: nonNegativeIntegerSchema,
    waypoint: nonNegativeIntegerSchema
  })
  .strict();

const objectMutationSchema = z
  .object({
    sourceGitSha256: sha256Schema,
    sourceGicSha256: sha256Schema,
    candidateGitSha256: sha256Schema,
    candidateGicSha256: sha256Schema,
    sourceCounts: familyCountsSchema,
    candidateCounts: familyCountsSchema,
    deletedCounts: familyCountsSchema,
    transformedCounts: familyCountsSchema,
    propertyUpdatedCounts: familyCountsSchema.optional(),
    polygonUpdatedCounts: familyCountsSchema.optional(),
    soundIntervalVariationUpdatedCounts: familyCountsSchema.optional(),
    soundVolumeUpdatedCounts: familyCountsSchema.optional(),
    soundScheduleUpdatedCounts: familyCountsSchema.optional(),
    soundActiveUpdatedCounts: familyCountsSchema.optional(),
    soundPlayOrderUpdatedCounts: familyCountsSchema.optional(),
    soundPlayStyleUpdatedCounts: familyCountsSchema.optional(),
    soundPlaybackUpdatedCounts: familyCountsSchema.optional(),
    soundProfileUpdatedCounts: familyCountsSchema.optional(),
    addedCounts: familyCountsSchema,
    totalDeleted: nonNegativeIntegerSchema,
    totalTransformed: nonNegativeIntegerSchema,
    totalPropertyUpdated: nonNegativeIntegerSchema.optional(),
    totalPolygonUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundIntervalVariationUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundVolumeUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundScheduleUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundActiveUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundPlayOrderUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundPlayStyleUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundPlaybackUpdated: nonNegativeIntegerSchema.optional(),
    totalSoundProfileUpdated: nonNegativeIntegerSchema.optional(),
    totalAdded: nonNegativeIntegerSchema,
    blueprintSources: z.array(
      z
        .object({
          sourceProfileId: nonBlankSchema,
          templateResRef: nonBlankSchema,
          sourceSha256: sha256Schema,
          dependencyCount: nonNegativeIntegerSchema.optional(),
          dependencySetSha256: sha256Schema.optional(),
          addedCount: nonNegativeIntegerSchema
        })
        .strict()
    )
  })
  .strict();

const unchangedCompanionsSchema = z
  .object({
    gitSha256: sha256Schema,
    gicSha256: sha256Schema,
    moduleIfoSha256: sha256Schema
  })
  .strict();

const variableSourceEntriesSchema = z.custom<readonly AuroraVariableSourceEntry[]>(
  (value) => readAuroraVariableSourceEntries(value) !== null,
  "Invalid typed ordered Area variable source entries."
);
const variableTargetEntriesSchema = z.custom<readonly AuroraVariableTargetEntry[]>(
  (value) => readAuroraVariableTargetEntries(value) !== null,
  "Invalid typed ordered Area variable target entries."
);
const variableMutationSchema = z
  .object({
    expectedEntries: variableSourceEntriesSchema,
    entries: variableTargetEntriesSchema,
    sourceGitSha256: sha256Schema,
    candidateGitSha256: sha256Schema
  })
  .strict()
  .superRefine((value, context) => {
    const expectedEntries = readAuroraVariableSourceEntries(value.expectedEntries);
    const entries = readAuroraVariableTargetEntries(value.entries);
    if (!expectedEntries || !entries || auroraVariableEntriesEqual(expectedEntries, entries)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Area variable summary must contain one changed exact table."
      });
    }
  });
const areaAudioEnvironmentSchema = z.custom<AreaAudioEnvironment>(
  isAreaAudioEnvironment,
  "Invalid exact Area audio environment."
);
const audioEnvironmentMutationSchema = z
  .object({
    expectedValue: areaAudioEnvironmentSchema,
    value: areaAudioEnvironmentSchema,
    sourceGitSha256: sha256Schema,
    candidateGitSha256: sha256Schema
  })
  .strict()
  .superRefine((value, context) => {
    if (areaAudioEnvironmentsEqual(value.expectedValue, value.value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Area audio summary must contain one changed exact tuple."
      });
    }
  });
const areaModuleStartLocationSchema = z.custom<AreaModuleStartLocation>(
  isAreaModuleStartLocation,
  "Invalid exact module start location."
);
const moduleStartLocationMutationSchema = z
  .object({
    expectedValue: areaModuleStartLocationSchema,
    value: areaModuleStartLocationSchema,
    sourceIfoSha256: sha256Schema,
    candidateIfoSha256: sha256Schema
  })
  .strict()
  .superRefine((value, context) => {
    if (areaModuleStartLocationsEqual(value.expectedValue, value.value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Module start-location summary must contain one changed exact tuple."
      });
    }
  });

function exactlyOneSummary(
  value: {
    unchangedCompanions?: unknown;
    objectMutation?: unknown;
    variableMutation?: unknown;
    audioEnvironmentMutation?: unknown;
  },
  context: z.RefinementCtx
) {
  const hasMutation = value.objectMutation !== undefined ||
    value.variableMutation !== undefined ||
    value.audioEnvironmentMutation !== undefined;
  if ((value.unchangedCompanions !== undefined) === hasMutation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Exactly one companion summary is required."
    });
  }
}

const validationReceiptSchema = z
  .object({
    schemaVersion: z.literal("area-update-validation-receipt.v1"),
    validationId: nonBlankSchema,
    commandHash: sha256Schema,
    moduleId: nonBlankSchema,
    moduleRevision: nonBlankSchema,
    areaResRef: nonBlankSchema,
    sourceAreaSha256: sha256Schema,
    draft: draftIdentitySchema,
    setFingerprintSha256: sha256Schema,
    tileProductionAdmission: areaTileProductionAdmissionSchema,
    candidateAre: areResourceSchema,
    candidateResources: resourceSetSchema,
    candidateModuleIfo: z
      .object({
        fileName: z.literal("module.ifo"),
        resourceType: z.literal(2014),
        size: nonNegativeIntegerSchema,
        sha256: sha256Schema
      })
      .strict(),
    unchangedCompanions: unchangedCompanionsSchema.optional(),
    objectMutation: objectMutationSchema.optional(),
    variableMutation: variableMutationSchema.optional(),
    audioEnvironmentMutation: audioEnvironmentMutationSchema.optional(),
    moduleStartLocationMutation: moduleStartLocationMutationSchema.optional(),
    validatorVersion: nonBlankSchema,
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime()
  })
  .strict()
  .superRefine(exactlyOneSummary);

const persistedResourceSetSchema = z.tuple([
  areResourceSchema.extend({ key: nonBlankSchema }).strict(),
  gitResourceSchema.extend({ key: nonBlankSchema }).strict(),
  gicResourceSchema.extend({ key: nonBlankSchema }).strict()
]);

const receiptSchema = z
  .object({
    schemaVersion: z.literal("area-update-receipt.v1"),
    transactionId: nonBlankSchema,
    areaResRef: nonBlankSchema,
    moduleId: nonBlankSchema,
    previousModuleRevision: nonBlankSchema,
    newModuleRevision: nonBlankSchema,
    sourceAreaSha256: sha256Schema,
    candidateAreaSha256: sha256Schema,
    draft: draftIdentitySchema,
    setFingerprintSha256: sha256Schema,
    tileProductionAdmission: areaTileProductionAdmissionSchema,
    commandHash: sha256Schema,
    validatorVersion: nonBlankSchema,
    resources: persistedResourceSetSchema,
    moduleIfo: z
      .object({ key: nonBlankSchema, size: nonNegativeIntegerSchema, sha256: sha256Schema })
      .strict(),
    unchangedCompanions: unchangedCompanionsSchema.optional(),
    objectMutation: objectMutationSchema.optional(),
    variableMutation: variableMutationSchema.optional(),
    audioEnvironmentMutation: audioEnvironmentMutationSchema.optional(),
    moduleStartLocationMutation: moduleStartLocationMutationSchema.optional(),
    readbackStatus: z.literal("verified"),
    warnings: z.array(z.string()),
    updatedAt: z.string().datetime()
  })
  .strict()
  .superRefine(exactlyOneSummary);

function successEnvelopeSchema<TSchema extends z.ZodTypeAny>(data: TSchema) {
  return z
    .object({
      contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
      requestId: nonBlankSchema,
      data
    })
    .strict();
}

const validationEnvelopeSchema = successEnvelopeSchema(validationReceiptSchema);
const updateEnvelopeSchema = successEnvelopeSchema(receiptSchema);
const errorEnvelopeSchema = z
  .object({
    contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
    requestId: nonBlankSchema,
    error: z
      .object({
        code: nonBlankSchema,
        message: nonBlankSchema,
        details: z.array(
          z.object({ path: z.string(), reason: nonBlankSchema }).strict()
        ),
        retryable: z.boolean()
      })
      .strict()
  })
  .strict();

function authorizationHeaders(accessToken: string): Record<string, string> {
  return { Accept: "application/json", Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): Record<string, string> {
  return {
    ...authorizationHeaders(accessToken),
    "Content-Type": "application/json; charset=utf-8"
  };
}

function invalidResponseFailure(
  operation: AreaUpdateApiOperation,
  response: Response
): AreaUpdateApiResult<never> {
  const etag = response.headers.get("etag");
  return {
    ok: false,
    error: {
      code: "AREA_UPDATE_RESPONSE_INVALID",
      operation,
      status: response.status,
      message: "The Area Update API returned a response outside the v1 contract.",
      retryable: response.status >= 500,
      details: [],
      ...(etag ? { etag } : {})
    }
  };
}

function transportFailure(operation: AreaUpdateApiOperation): AreaUpdateApiResult<never> {
  return {
    ok: false,
    error: {
      code: "AREA_UPDATE_TRANSPORT_FAILED",
      operation,
      status: null,
      message: "The Area Update API request could not be completed.",
      retryable: true,
      details: []
    }
  };
}

function backendFailure(
  operation: AreaUpdateApiOperation,
  response: Response,
  payload: unknown
): AreaUpdateApiResult<never> {
  const parsed = errorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return invalidResponseFailure(operation, response);
  const etag = response.headers.get("etag");
  const error: AreaUpdateApiFailure = {
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

async function readJson(response: Response): Promise<unknown> {
  return await response.json();
}

export class HttpAreaUpdateApiPort implements AreaUpdateApiPort {
  private readonly baseUrl: string;

  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl = resolveAreaUpdateApiBaseUrl(
      import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined,
      import.meta.env.DEV
    )
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async validate(
    input: AreaUpdateValidationInput
  ): Promise<AreaUpdateApiResult<AreaUpdateValidationReceipt>> {
    const operation = "validate_update" as const;
    let response: Response;
    let payload: unknown;
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/areas/${encodeURIComponent(input.areaResRef)}/update-validations`,
        {
          method: "POST",
          headers: jsonHeaders(input.accessToken),
          body: JSON.stringify(input.command)
        }
      );
      payload = await readJson(response);
    } catch {
      return transportFailure(operation);
    }
    if (!response.ok) return backendFailure(operation, response, payload);
    const parsed = validationEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      return invalidResponseFailure(operation, response);
    }
    const expectedEtag = `"${parsed.data.data.moduleRevision}"`;
    if (response.headers.get("etag") !== expectedEtag) {
      return invalidResponseFailure(operation, response);
    }
    const metadata: AreaUpdateApiMetadata = {
      contractVersion: parsed.data.contractVersion,
      requestId: parsed.data.requestId,
      moduleRevision: parsed.data.data.moduleRevision,
      etag: expectedEtag
    };
    return {
      ok: true,
      value: parsed.data.data as AreaUpdateValidationReceipt,
      metadata
    };
  }

  async update(
    input: AreaUpdateMutationInput
  ): Promise<AreaUpdateApiResult<AreaUpdateReceipt>> {
    const operation = "update_area" as const;
    let response: Response;
    let payload: unknown;
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/modules/${encodeURIComponent(input.moduleId)}/areas/${encodeURIComponent(input.areaResRef)}`,
        {
          method: "PUT",
          headers: {
            ...jsonHeaders(input.accessToken),
            "Idempotency-Key": input.idempotencyKey,
            "If-Match": `"${input.command.expectedModuleRevision}"`
          },
          body: JSON.stringify(input.command)
        }
      );
      payload = await readJson(response);
    } catch {
      return transportFailure(operation);
    }
    if (!response.ok) return backendFailure(operation, response, payload);
    const parsed = updateEnvelopeSchema.safeParse(payload);
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
      value: parsed.data.data as AreaUpdateReceipt,
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

export function resolveAreaUpdateApiBaseUrl(
  candidate: string | undefined,
  isDevelopment: boolean
): string {
  const normalized = candidate?.trim();
  if (normalized) return normalized.replace(/\/+$/u, "");
  return isDevelopment ? "/_aurora/v1" : "/api/v1";
}

export function createHttpAreaUpdateApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl?: string
): HttpAreaUpdateApiPort {
  return new HttpAreaUpdateApiPort(fetchFn, baseUrl);
}

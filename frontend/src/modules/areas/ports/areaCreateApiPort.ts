import type {
  AreaCreateCommand,
  AreaCreateExecution,
  AreaCreateProfileCatalog,
  AreaCreateValidationReceipt
} from "../areaCreateContracts";

export type AreaCreateApiOperation =
  | "get_profiles"
  | "validate_candidate"
  | "create_area";

export interface AreaCreateApiErrorDetail {
  readonly path: string;
  readonly reason: string;
}

export interface AreaCreateApiFailure {
  readonly code: string;
  readonly operation: AreaCreateApiOperation;
  readonly status: number | null;
  readonly message: string;
  readonly retryable: boolean;
  readonly details: readonly AreaCreateApiErrorDetail[];
  readonly contractVersion?: string;
  readonly requestId?: string;
  readonly etag?: string;
}

export interface AreaCreateApiMetadata {
  readonly contractVersion: string;
  readonly requestId: string;
  readonly moduleRevision?: string;
  readonly etag?: string;
}

export type AreaCreateApiResult<TValue> =
  | Readonly<{
      ok: true;
      value: TValue;
      metadata: AreaCreateApiMetadata;
    }>
  | Readonly<{
      ok: false;
      error: AreaCreateApiFailure;
    }>;

export interface AreaCreateValidationInput {
  readonly accessToken: string;
  readonly moduleId: string;
  readonly command: AreaCreateCommand;
}

export interface AreaCreateMutationInput extends AreaCreateValidationInput {
  readonly idempotencyKey: string;
}

export interface AreaCreateApiPort {
  getProfiles(accessToken: string): Promise<AreaCreateApiResult<AreaCreateProfileCatalog>>;
  validate(
    input: AreaCreateValidationInput
  ): Promise<AreaCreateApiResult<AreaCreateValidationReceipt>>;
  create(input: AreaCreateMutationInput): Promise<AreaCreateApiResult<AreaCreateExecution>>;
}

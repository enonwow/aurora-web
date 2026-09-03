import type {
  AreaUpdateCommand,
  AreaUpdateReceipt,
  AreaUpdateValidationCommand,
  AreaUpdateValidationReceipt
} from "../areaUpdateContracts";

export type AreaUpdateApiOperation = "validate_update" | "update_area";

export interface AreaUpdateApiFailure {
  readonly code: string;
  readonly operation: AreaUpdateApiOperation;
  readonly status: number | null;
  readonly message: string;
  readonly retryable: boolean;
  readonly details: readonly Readonly<{ path: string; reason: string }>[];
  readonly contractVersion?: string;
  readonly requestId?: string;
  readonly etag?: string;
}

export interface AreaUpdateApiMetadata {
  readonly contractVersion: string;
  readonly requestId: string;
  readonly moduleRevision: string;
  readonly etag: string;
  readonly idempotencyStatus?: "created" | "replayed";
}

export type AreaUpdateApiResult<TValue> =
  | Readonly<{
      ok: true;
      value: TValue;
      metadata: AreaUpdateApiMetadata;
    }>
  | Readonly<{ ok: false; error: AreaUpdateApiFailure }>;

export interface AreaUpdateValidationInput {
  readonly accessToken: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly command: AreaUpdateValidationCommand;
}

export interface AreaUpdateMutationInput {
  readonly accessToken: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly idempotencyKey: string;
  readonly command: AreaUpdateCommand;
}

export interface AreaUpdateApiPort {
  validate(
    input: AreaUpdateValidationInput
  ): Promise<AreaUpdateApiResult<AreaUpdateValidationReceipt>>;
  update(input: AreaUpdateMutationInput): Promise<AreaUpdateApiResult<AreaUpdateReceipt>>;
}

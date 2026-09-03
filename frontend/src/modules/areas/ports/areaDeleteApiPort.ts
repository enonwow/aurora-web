import type {
  AreaDeleteCommand,
  AreaDeletePreview,
  AreaDeletePreviewCommand,
  AreaDeleteReceipt
} from "../areaDeleteContracts";

export type AreaDeleteApiOperation = "preview_delete" | "delete_area";

export interface AreaDeleteApiFailure {
  readonly code: string;
  readonly operation: AreaDeleteApiOperation;
  readonly status: number | null;
  readonly message: string;
  readonly retryable: boolean;
  readonly details: readonly Readonly<{ path: string; reason: string }>[];
  readonly contractVersion?: string;
  readonly requestId?: string;
  readonly etag?: string;
}

export interface AreaDeleteApiMetadata {
  readonly contractVersion: string;
  readonly requestId: string;
  readonly moduleRevision: string;
  readonly etag: string;
  readonly idempotencyStatus?: "created" | "replayed";
}

export type AreaDeleteApiResult<TValue> =
  | Readonly<{ ok: true; value: TValue; metadata: AreaDeleteApiMetadata }>
  | Readonly<{ ok: false; error: AreaDeleteApiFailure }>;

export interface AreaDeletePreviewInput {
  readonly accessToken: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly command: AreaDeletePreviewCommand;
}

export interface AreaDeleteMutationInput {
  readonly accessToken: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly idempotencyKey: string;
  readonly command: AreaDeleteCommand;
}

export interface AreaDeleteApiPort {
  preview(input: AreaDeletePreviewInput): Promise<AreaDeleteApiResult<AreaDeletePreview>>;
  delete(input: AreaDeleteMutationInput): Promise<AreaDeleteApiResult<AreaDeleteReceipt>>;
}

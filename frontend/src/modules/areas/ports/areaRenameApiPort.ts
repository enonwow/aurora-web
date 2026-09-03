import type {
  AreaRenameCommand,
  AreaRenamePreview,
  AreaRenamePreviewCommand,
  AreaRenameReceipt
} from "../areaRenameContracts";

export type AreaRenameApiOperation = "preview_rename" | "rename_area";

export interface AreaRenameApiFailure {
  readonly code: string;
  readonly operation: AreaRenameApiOperation;
  readonly status: number | null;
  readonly message: string;
  readonly retryable: boolean;
  readonly details: readonly Readonly<{ path: string; reason: string }>[];
  readonly contractVersion?: string;
  readonly requestId?: string;
  readonly etag?: string;
}

export interface AreaRenameApiMetadata {
  readonly contractVersion: string;
  readonly requestId: string;
  readonly moduleRevision: string;
  readonly etag: string;
  readonly idempotencyStatus?: "created" | "replayed";
}

export type AreaRenameApiResult<T> =
  | Readonly<{ ok: true; value: T; metadata: AreaRenameApiMetadata }>
  | Readonly<{ ok: false; error: AreaRenameApiFailure }>;

export interface AreaRenamePreviewInput {
  readonly accessToken: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly command: AreaRenamePreviewCommand;
}

export interface AreaRenameMutationInput {
  readonly accessToken: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly idempotencyKey: string;
  readonly command: AreaRenameCommand;
}

export interface AreaRenameApiPort {
  preview(input: AreaRenamePreviewInput): Promise<AreaRenameApiResult<AreaRenamePreview>>;
  rename(input: AreaRenameMutationInput): Promise<AreaRenameApiResult<AreaRenameReceipt>>;
}

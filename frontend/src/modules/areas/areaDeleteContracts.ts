export const AREA_DELETE_PREVIEW_COMMAND_SCHEMA_VERSION =
  "area-delete-preview-command.v1" as const;
export const AREA_DELETE_COMMAND_SCHEMA_VERSION = "area-delete-command.v1" as const;
export const AREA_DELETE_PREVIEW_SCHEMA_VERSION = "area-delete-preview.v1" as const;
export const AREA_DELETE_RECEIPT_SCHEMA_VERSION = "area-delete-receipt.v1" as const;
export const AREA_DELETE_IMPACT_SCAN_VERSION = "area-delete-impact-scan.v1" as const;

export interface AreaDeletePreviewCommand {
  readonly schemaVersion: typeof AREA_DELETE_PREVIEW_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly expectedModuleRevision: string;
  readonly clientCommandId: string;
}

export interface AreaDeleteCommand {
  readonly schemaVersion: typeof AREA_DELETE_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly expectedModuleRevision: string;
  readonly preview: Readonly<{ sha256: string }>;
  readonly confirmation: Readonly<{
    areaResRef: string;
    policy: "block_on_references";
  }>;
  readonly clientCommandId: string;
}

export interface AreaDeletePreviewResource {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export type AreaDeleteFindingCode =
  | "AREA_DELETE_ENTRY_AREA_REFERENCE"
  | "AREA_DELETE_GIT_REFERENCE"
  | "AREA_DELETE_SCRIPT_SOURCE_REFERENCE"
  | "AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE"
  | "AREA_DELETE_GIT_SCAN_INVALID"
  | "AREA_DELETE_TARGET_RESOURCE_INVALID"
  | "AREA_DELETE_MEMBERSHIP_INVALID"
  | "AREA_DELETE_REFERENCE_SCAN_TRUNCATED";

export interface AreaDeleteImpactFinding {
  readonly code: AreaDeleteFindingCode;
  readonly severity: "blocker" | "warning";
  readonly resourceKey: string;
  readonly fieldPath: string;
  readonly reason: string;
}

export interface AreaDeletePreview {
  readonly schemaVersion: typeof AREA_DELETE_PREVIEW_SCHEMA_VERSION;
  readonly scanVersion: typeof AREA_DELETE_IMPACT_SCAN_VERSION;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly moduleRevision: string;
  readonly targetResources: readonly AreaDeletePreviewResource[];
  readonly moduleIfo: AreaDeletePreviewResource;
  readonly membershipCount: number;
  readonly entryAreaResRef: string | null;
  readonly findings: readonly AreaDeleteImpactFinding[];
  readonly blockerCount: number;
  readonly warningCount: number;
  readonly previewSha256: string;
  readonly expiresAt: string;
}

export interface AreaDeletePersistedResource {
  readonly extension: "are" | "git" | "gic";
  readonly key: string;
  readonly fileName: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaDeleteReceipt {
  readonly schemaVersion: typeof AREA_DELETE_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly areaResRef: string;
  readonly moduleId: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly commandHash: string;
  readonly previewSha256: string;
  readonly scanVersion: typeof AREA_DELETE_IMPACT_SCAN_VERSION;
  readonly removedResources: readonly AreaDeletePersistedResource[];
  readonly moduleIfo: Readonly<{
    key: string;
    baselineSha256: string;
    candidateSha256: string;
    size: number;
  }>;
  readonly survivorCount: number;
  readonly blockerCount: 0;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly deletedAt: string;
}

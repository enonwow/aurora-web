export const AREA_RENAME_PREVIEW_COMMAND_SCHEMA_VERSION = "area-rename-preview-command.v1" as const;
export const AREA_RENAME_COMMAND_SCHEMA_VERSION = "area-rename-command.v1" as const;
export const AREA_RENAME_PREVIEW_SCHEMA_VERSION = "area-rename-preview.v1" as const;
export const AREA_RENAME_RECEIPT_SCHEMA_VERSION = "area-rename-receipt.v1" as const;
export const AREA_RENAME_IMPACT_SCAN_VERSION = "area-rename-impact-scan.v1" as const;

export interface AreaRenamePreviewCommand {
  readonly schemaVersion: typeof AREA_RENAME_PREVIEW_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly expectedModuleRevision: string;
  readonly clientCommandId: string;
}

export interface AreaRenameCommand {
  readonly schemaVersion: typeof AREA_RENAME_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly expectedModuleRevision: string;
  readonly preview: Readonly<{ sha256: string }>;
  readonly confirmation: Readonly<{
    sourceAreaResRef: string;
    targetAreaResRef: string;
    policy: "block_on_references";
  }>;
  readonly clientCommandId: string;
}

export interface AreaRenamePreviewResource {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export type AreaRenameFindingCode =
  | "AREA_RENAME_STATIC_REFERENCE"
  | "AREA_RENAME_SOURCE_IDENTITY_INVALID"
  | "AREA_RENAME_COMPANION_INVALID"
  | "AREA_RENAME_MEMBERSHIP_INVALID"
  | "AREA_RENAME_SCAN_BUDGET_EXCEEDED"
  | "AREA_RENAME_REFERENCE_SCAN_TRUNCATED";

export interface AreaRenameImpactFinding {
  readonly code: AreaRenameFindingCode;
  readonly severity: "blocker" | "warning";
  readonly resourceKey: string;
  readonly fieldPath: string;
  readonly reason: string;
}

export interface AreaRenamePreview {
  readonly schemaVersion: typeof AREA_RENAME_PREVIEW_SCHEMA_VERSION;
  readonly scanVersion: typeof AREA_RENAME_IMPACT_SCAN_VERSION;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly moduleRevision: string;
  readonly sourceResources: readonly AreaRenamePreviewResource[];
  readonly targetResourceKeys: readonly string[];
  readonly moduleIfo: AreaRenamePreviewResource;
  readonly sourceAreaRootResRef: string | null;
  readonly oldMembershipCount: number;
  readonly newMembershipCount: number;
  readonly entryAreaResRef: string | null;
  readonly entryAreaUpdated: boolean;
  readonly scanBudgets: Readonly<{
    maxObjects: number;
    maxObjectBytes: number;
    maxTotalBytes: number;
    maxFindings: number;
  }>;
  readonly findings: readonly AreaRenameImpactFinding[];
  readonly blockerCount: number;
  readonly warningCount: number;
  readonly previewSha256: string;
  readonly expiresAt: string;
}

export interface AreaRenamePersistedResource {
  readonly extension: "are" | "gic" | "git";
  readonly sourceKey: string;
  readonly targetKey: string;
  readonly resourceType: number;
  readonly baselineSize: number;
  readonly baselineSha256: string;
  readonly candidateSize: number;
  readonly candidateSha256: string;
}

export interface AreaRenameReceipt {
  readonly schemaVersion: typeof AREA_RENAME_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly commandHash: string;
  readonly previewSha256: string;
  readonly scanVersion: typeof AREA_RENAME_IMPACT_SCAN_VERSION;
  readonly resources: readonly AreaRenamePersistedResource[];
  readonly moduleIfo: Readonly<{
    key: "module.ifo";
    baselineSize: number;
    baselineSha256: string;
    candidateSize: number;
    candidateSha256: string;
  }>;
  readonly entryAreaUpdated: boolean;
  readonly blockerCount: 0;
  readonly warningCount: number;
  readonly readbackStatus: "verified";
  readonly warnings: readonly string[];
  readonly renamedAt: string;
}

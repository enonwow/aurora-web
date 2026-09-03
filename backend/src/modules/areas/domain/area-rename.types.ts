export const AREA_RENAME_PREVIEW_SCHEMA_VERSION = "area-rename-preview.v1" as const;
export const AREA_RENAME_IMPACT_SCAN_VERSION = "area-rename-impact-scan.v1" as const;

export const AREA_RENAME_SCAN_BUDGETS = Object.freeze({
  maxObjects: 50_000,
  maxObjectBytes: 16 * 1024 * 1024,
  maxTotalBytes: 512 * 1024 * 1024,
  maxFindings: 256,
});

export interface AreaRenameImpactScanInput {
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly targetAreaResRef: string;
  readonly expectedModuleRevision: string;
}

export interface AreaRenamePreviewResource {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaRenameImpactFinding {
  readonly code:
    | "AREA_RENAME_STATIC_REFERENCE"
    | "AREA_RENAME_SOURCE_IDENTITY_INVALID"
    | "AREA_RENAME_COMPANION_INVALID"
    | "AREA_RENAME_MEMBERSHIP_INVALID"
    | "AREA_RENAME_SCAN_BUDGET_EXCEEDED"
    | "AREA_RENAME_REFERENCE_SCAN_TRUNCATED";
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
  readonly scanBudgets: typeof AREA_RENAME_SCAN_BUDGETS;
  readonly findings: readonly AreaRenameImpactFinding[];
  readonly blockerCount: number;
  readonly warningCount: number;
  readonly previewSha256: string;
  readonly expiresAt: string;
}

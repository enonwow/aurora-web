export const AREA_DELETE_PREVIEW_SCHEMA_VERSION = "area-delete-preview.v1" as const;
export const AREA_DELETE_IMPACT_SCAN_VERSION = "area-delete-impact-scan.v1" as const;

export interface AreaDeleteImpactScanInput {
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly expectedModuleRevision: string;
}

export interface AreaDeletePreviewResource {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaDeleteImpactFinding {
  readonly code:
    | "AREA_DELETE_ENTRY_AREA_REFERENCE"
    | "AREA_DELETE_GIT_REFERENCE"
    | "AREA_DELETE_SCRIPT_SOURCE_REFERENCE"
    | "AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE"
    | "AREA_DELETE_GIT_SCAN_INVALID"
    | "AREA_DELETE_TARGET_RESOURCE_INVALID"
    | "AREA_DELETE_MEMBERSHIP_INVALID"
    | "AREA_DELETE_REFERENCE_SCAN_TRUNCATED";
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

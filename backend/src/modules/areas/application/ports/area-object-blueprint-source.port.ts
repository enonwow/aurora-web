export type AdmittedAreaObjectBlueprintSourceKind =
  | "creature"
  | "door"
  | "encounter"
  | "item"
  | "placeable"
  | "sound"
  | "store"
  | "trigger"
  | "waypoint";

export interface AreaObjectBlueprintSourceRequest {
  readonly sourceKind: AdmittedAreaObjectBlueprintSourceKind;
  readonly sourceProfileId: string;
  readonly templateResRef: string;
  readonly expectedSha256: string;
}

export interface ResolvedAreaObjectBlueprint {
  readonly sourceKind: AdmittedAreaObjectBlueprintSourceKind;
  readonly sourceProfileId: string;
  readonly templateResRef: string;
  readonly sha256: string;
  readonly bytes: Buffer;
  readonly dependencies?: readonly ResolvedAreaObjectBlueprintDependency[];
}

export interface ResolvedAreaObjectBlueprintDependency {
  readonly templateResRef: string;
  readonly resourceType: number;
  readonly sha256: string;
  readonly bytes: Buffer;
}

export interface AreaObjectBlueprintSourcePort {
  resolve(
    request: AreaObjectBlueprintSourceRequest,
  ): Promise<ResolvedAreaObjectBlueprint>;
}

export type AreaObjectBlueprintSourceErrorCode =
  | "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID"
  | "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE";

export class AreaObjectBlueprintSourceError extends Error {
  constructor(
    readonly code: AreaObjectBlueprintSourceErrorCode,
    message: string,
    readonly diagnostics: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaObjectBlueprintSourceError";
  }
}

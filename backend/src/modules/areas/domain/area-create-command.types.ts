export const AREA_CREATE_COMMAND_SCHEMA_VERSION =
  "area-create-command.v1" as const;

export type AreaCreateOrientation = 0 | 1 | 2 | 3;

export interface AreaCreateTile {
  readonly row: number;
  readonly col: number;
  readonly tileId: number;
  readonly orientation: AreaCreateOrientation;
  readonly height: number;
  readonly mainLight1: number;
  readonly mainLight2: number;
  readonly sourceLight1: number;
  readonly sourceLight2: number;
  readonly animLoop1: number;
  readonly animLoop2: number;
  readonly animLoop3: number;
}

export interface AreaCreateGroupCell {
  readonly row: number;
  readonly col: number;
}

export interface AreaCreateGroupInstance {
  readonly groupId: string;
  readonly anchorRow: number;
  readonly anchorCol: number;
  readonly orientation: AreaCreateOrientation;
  readonly cells: readonly AreaCreateGroupCell[];
}

export interface AreaCreateCommand {
  readonly schemaVersion: typeof AREA_CREATE_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly expectedModuleRevision: string;
  readonly creationProfile: Readonly<{
    id: string;
    fingerprintSha256: string;
  }>;
  readonly area: Readonly<{
    name: string;
    resRef: string;
    tag: string;
  }>;
  readonly tileset: Readonly<{
    resRef: string;
    setFingerprintSha256: string;
  }>;
  readonly dimensions: Readonly<{
    width: number;
    height: number;
  }>;
  readonly initializer: Readonly<{
    algorithmVersion: string;
    seed: number;
  }>;
  readonly tiles: readonly AreaCreateTile[];
  readonly groupInstances: readonly AreaCreateGroupInstance[];
  readonly draft: Readonly<{
    id: string;
    revision: number;
    normalizedSha256: string;
  }>;
  readonly clientCommandId: string;
}

export type AreaCreateCommandValidationIssueCode =
  | "invalid_field"
  | "unknown_field"
  | "invalid_tile_grid"
  | "invalid_group_instance";

export interface AreaCreateCommandValidationIssue {
  readonly code: AreaCreateCommandValidationIssueCode;
  readonly path: string;
  readonly message: string;
}

export type AreaCreateCommandValidationResult =
  | Readonly<{
      valid: true;
      value: AreaCreateCommand;
      canonicalJson: string;
      commandHash: string;
    }>
  | Readonly<{
      valid: false;
      issues: readonly AreaCreateCommandValidationIssue[];
    }>;

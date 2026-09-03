export const AREA_UPDATE_VALIDATION_COMMAND_SCHEMA_VERSION =
  "area-update-validation.v1" as const;

export interface AreaUpdateValidationCommand {
  readonly schemaVersion: typeof AREA_UPDATE_VALIDATION_COMMAND_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly areaResRef: string;
  readonly expectedModuleRevision: string;
  readonly draft: Readonly<{
    id: string;
    revision: number;
    normalizedSha256: string;
  }>;
  readonly clientCommandId: string;
}

export interface AreaUpdateValidationCommandIssue {
  readonly code: "invalid_field" | "unknown_field";
  readonly path: string;
  readonly message: string;
}

export type AreaUpdateValidationCommandResult =
  | Readonly<{
      valid: true;
      value: AreaUpdateValidationCommand;
      canonicalJson: string;
      commandHash: string;
    }>
  | Readonly<{
      valid: false;
      issues: readonly AreaUpdateValidationCommandIssue[];
    }>;

export const AREA_UPDATE_COMMAND_SCHEMA_VERSION = "area-update-command.v1" as const;

export interface AreaUpdateCommand {
  readonly schemaVersion: typeof AREA_UPDATE_COMMAND_SCHEMA_VERSION;
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

export interface AreaUpdateCommandIssue {
  readonly code: "invalid_field" | "unknown_field";
  readonly path: string;
  readonly message: string;
}

export type AreaUpdateCommandResult =
  | Readonly<{
      valid: true;
      value: AreaUpdateCommand;
      canonicalJson: string;
      commandHash: string;
    }>
  | Readonly<{
      valid: false;
      issues: readonly AreaUpdateCommandIssue[];
    }>;

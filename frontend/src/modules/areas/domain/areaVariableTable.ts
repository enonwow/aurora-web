import type {
  AuroraVariableSourceEntry,
  AuroraVariableTargetEntry,
} from "../../shared/domain/auroraVariableTable";

export type AreaVariableSourceEntry = AuroraVariableSourceEntry;
export type AreaVariableTargetEntry = AuroraVariableTargetEntry;

export interface ExistingAreaVariableMutation {
  readonly expectedEntries: readonly AreaVariableSourceEntry[];
  readonly entries: readonly AreaVariableTargetEntry[];
  readonly sourceGitSha256: string;
}

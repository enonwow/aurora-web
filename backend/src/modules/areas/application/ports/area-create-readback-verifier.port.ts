import type {
  AreaCreatePersistedArtifact,
  AreaCreatePersistedModuleIfo,
} from "../../domain/area-create-transaction.types";
import type { AuroraVariableTargetEntry } from "../../domain/aurora-variable-table";
import type { AreaBasicIdentity } from "../../domain/area-basic-identity";
import type { AreaVisualEnvironment } from "../../domain/area-visual-environment";
import type { AreaVisualEnvironmentScalarControls } from "../../domain/area-visual-environment-scalar-controls";
import type { AreaVisualEnvironmentCatalogSelection } from "../../domain/area-visual-environment-catalog-selection";

export const AREA_CREATE_PERSISTED_READBACK_VERIFIER = Symbol(
  "AREA_CREATE_PERSISTED_READBACK_VERIFIER",
);

export interface AreaCreateReadbackResource extends AreaCreatePersistedArtifact {
  readonly bytes: Buffer;
}

export interface AreaCreateReadbackModuleIfo extends AreaCreatePersistedModuleIfo {
  readonly bytes: Buffer;
}

export interface AreaCreatePersistedReadbackVerifierPort {
  readonly version: string;
  verify(input: Readonly<{
    areaId: string;
    resources: readonly AreaCreateReadbackResource[];
    moduleIfo: AreaCreateReadbackModuleIfo;
    expectedAreaVariables?: readonly AuroraVariableTargetEntry[];
    expectedAreaBasicIdentity?: Readonly<AreaBasicIdentity>;
    expectedAreaVisualEnvironment?: Readonly<AreaVisualEnvironment>;
    expectedAreaVisualEnvironmentScalarControls?: Readonly<AreaVisualEnvironmentScalarControls>;
    expectedAreaVisualEnvironmentCatalogSelection?:
      Readonly<AreaVisualEnvironmentCatalogSelection>;
  }>): Promise<Readonly<{
    valid: boolean;
    diagnostics: readonly string[];
  }>>;
}

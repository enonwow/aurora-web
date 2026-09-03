import type {
  AuroraAreaEditingState,
  AuroraAreaTilesetDefinition,
} from "../../scene/domain/auroraAreaEditing";
import type { ExistingAreaCommentsMutation } from "../domain/areaComments";
import type { ExistingAreaEventScriptMutations } from "../domain/areaEventScripts";
import type { ExistingAreaBasicIdentityMutations } from "../domain/areaBasicIdentity";
import type { ExistingAreaAdvancedFlagMutations } from "../domain/areaAdvancedFlags";
import type { ExistingAreaVisualEnvironmentMutation } from "../domain/areaVisualEnvironment";
import type { ExistingAreaVisualEnvironmentScalarControlsMutation } from "../domain/areaVisualEnvironmentScalarControls";
import type { ExistingAreaVisualEnvironmentCatalogSelectionMutation } from "../domain/areaVisualEnvironmentCatalogSelectionMutation";

export interface AreaTilesetEditingSummary {
  readonly tilesetResRef: string;
  readonly displayName: string;
  readonly displayNameStrRef?: number;
}

export interface AreaEditingDefinitionResult {
  readonly definition: AuroraAreaTilesetDefinition;
  readonly areaFingerprint?: string;
}

export interface AreaEditingDraftRequest {
  readonly accessToken: string;
  readonly name: string;
  readonly state: AuroraAreaEditingState;
  readonly comments?: ExistingAreaCommentsMutation;
  readonly eventScripts?: ExistingAreaEventScriptMutations;
  readonly basicIdentity?: ExistingAreaBasicIdentityMutations;
  readonly advancedFlags?: ExistingAreaAdvancedFlagMutations;
  readonly visualEnvironment?: ExistingAreaVisualEnvironmentMutation;
  readonly visualEnvironmentScalarControls?: ExistingAreaVisualEnvironmentScalarControlsMutation;
  readonly visualEnvironmentCatalogSelection?: ExistingAreaVisualEnvironmentCatalogSelectionMutation;
}

export interface AreaEditingVerificationIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly row?: number;
  readonly col?: number;
  readonly tileId?: number;
}

export interface AreaEditingVerificationResult {
  readonly valid: boolean;
  readonly issues: readonly AreaEditingVerificationIssue[];
  readonly stats: Readonly<{
    width: number;
    height: number;
    expectedTileCount: number;
    tileCount: number;
    uniqueTileIds: number;
    groupTileCount: number;
    sourceProvenanceTileCount: number;
    modelResolvedTileCount: number;
    minHeight: number;
    maxHeight: number;
  }>;
  readonly tilesetFingerprint: string;
}

export interface AreaEditingExportArtifact {
  readonly bytes: ArrayBuffer;
  readonly contentType: string;
  readonly fileName: string;
}

export interface AreaEditingSourcePort {
  listAreaTilesets(accessToken: string): Promise<readonly AreaTilesetEditingSummary[]>;
  getAreaTilesetDefinition(
    accessToken: string,
    tilesetResRef: string,
  ): Promise<AuroraAreaTilesetDefinition>;
  getAreaEditingDefinitionForArea(
    accessToken: string,
    areaId: string,
  ): Promise<AreaEditingDefinitionResult>;
}

export interface AreaEditingTransferPort {
  verify(input: AreaEditingDraftRequest): Promise<AreaEditingVerificationResult>;
  exportAre(input: AreaEditingDraftRequest): Promise<AreaEditingExportArtifact>;
}

export interface AreaEditingDownloadPort {
  downloadAre(artifact: AreaEditingExportArtifact): void;
}

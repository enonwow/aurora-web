import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_AURORA_AREA_EDITING_TOOL,
  type AreaScene,
  type AuroraAreaEditingTool
} from "../contracts";
import type {
  AreaEditingFacade,
  AreaEditingVerificationResult,
  AreaTilesetEditingSummary,
} from "../../areas/application/areaEditingFacade";
import type { AreaCreateFacade } from "../../areas/application/areaCreateFacade";
import type { AreaUpdateFacade } from "../../areas/application/areaUpdateFacade";
import type { AreaEventScriptCatalogFacade } from "../../areas/application/areaEventScriptCatalogFacade";
import type { AreaEventScriptPublicationFacade } from "../../areas/application/areaEventScriptPublicationFacade";
import { resolveCurrentAreaUpdateDraftIdentity } from "../../areas/application/areaUpdateDraftAdmission";
import {
  prepareAreaCreateCommand,
  sha256Hex
} from "../../areas/application/areaCreateCommandBuilder";
import type {
  AreaCreateCommand,
  AreaCreateProfile,
  AreaCreateValidationReceipt
} from "../../areas/areaCreateContracts";
import type {
  AreaUpdateValidationCommand,
  AreaUpdateValidationReceipt
} from "../../areas/areaUpdateContracts";
import type { AreaDraftSessionRegistry } from "../../areas/ports/areaLifecyclePort";
import type { AreaWorkspaceStatusEvent } from "../../areas/application/areaWorkspaceStatus";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import {
  changeAuroraAreaTileHeight,
  changeAuroraAreaGroupHeightAtCell,
  createAuroraAreaEditingState,
  hydrateAuroraAreaEditingState,
  placeAuroraAreaDiagnosticFixtureGroups,
  placeAuroraAreaDiagnosticFixtureTileId,
  placeAuroraAreaDiagnosticFixtureTiles,
  removeAuroraAreaGroupAtCell,
  resolveAuroraAreaGroupInstanceAtCell,
  resizeAuroraArea,
  rotateAuroraArea,
  rotateAuroraAreaGroupAtCell,
  rotateAuroraAreaTile,
  replaceAuroraAreaTileId,
  rerollAuroraAreaTileVariant,
  type AuroraAreaEditingState,
  type AuroraAreaEditableTile,
  type AuroraAreaTilesetDefinition,
  type AuroraAreaTilesetTile
} from "../../scene/domain/auroraAreaEditing";
import { createAuroraAreaPlacementSelector } from "../application/useWorkspacePointerSelection";
import { applyAuroraAreaEditingStateToScene } from "../../scene/domain/auroraAreaEditingSceneMapper";
import { buildAreaTileConnectivityDiagnostics } from "../../scene/domain/areaTileConnectivityDiagnostics";
import {
  removeSourceAuroraAreaGroupConservatively,
  rotateSourceAuroraAreaGroupConservatively
} from "../../scene/domain/auroraAreaSourceGroupEditing";
import {
  createBlankAreaScene,
  DEFAULT_BLANK_SCENE_ID
} from "../../scene/domain/sceneFactory";
import { AuroraAreaTilePropertiesDialog } from "./AuroraAreaTilePropertiesDialog";
import { AreaPropertiesDialog } from "./properties/AreaPropertiesDialog";
import {
  createAreaPropertiesFacade,
  type AreaPropertiesFacade,
  type AreaPropertiesDraft,
} from "../../areas/application/areaPropertiesFacade";
import type { AreaTileProcessContractReadiness } from "../../tiles/application/areaTileProcessContractReadiness";
import {
  filterAreaTileCatalog,
  type AreaTileCatalogCapabilityFilter,
  type AreaTileCatalogCategoryFilter,
  type AreaTileCatalogCertificationFilter,
  type AreaTileCatalogCertificationIndex,
} from "../../areas/application/areaTileCatalogFilter";
import {
  collectChangedAuroraAreaTileDefinitionIds,
  evaluateAreaTileProductionPlacementAdmission,
  formatAreaTileProductionPlacementBlocker,
  type AreaTileProductionCertificationSource,
  type AreaTileProductionPlacementAdmissionResult,
} from "../../areas/application/areaTileProductionPlacementAdmission";

interface AuroraAreaEditingPanelProps {
  accessToken: string | null;
  scene: AreaScene | null | undefined;
  selectedTileId?: string | null;
  selectedTileIds?: readonly string[];
  tileProcessReadiness?: AreaTileProcessContractReadiness | null;
  tileCatalogCertificationIndex?: AreaTileCatalogCertificationIndex;
  tileProductionCertification?: AreaTileProductionCertificationSource;
  activeTool?: AuroraAreaEditingTool;
  onActiveToolChange?: (tool: AuroraAreaEditingTool) => void;
  onSceneSelected: (scene: AreaScene) => void;
  onSceneMutation?: (scene: AreaScene, selectedTileId?: string | null, selectedTileIds?: string[]) => void;
  areaEditingFacade?: AreaEditingFacade;
  areaCreateFacade?: AreaCreateFacade;
  areaUpdateFacade?: AreaUpdateFacade;
  areaEventScriptCatalogFacade?: AreaEventScriptCatalogFacade;
  areaEventScriptPublicationFacade?: AreaEventScriptPublicationFacade;
  areaDraftSessionRegistry?: AreaDraftSessionRegistry;
  canMaterializeAreas?: boolean;
  onAreaMaterialized?: () => void;
  onAreaWorkspaceStatusChange?: (event: AreaWorkspaceStatusEvent) => void;
  trackTelemetryEvent?: (name: string, payload?: TelemetryPayload) => void;
}

const AREA_EDITING_LOCAL_PROOF_EVENT = "aurora:areas:create-local-editing-proof";
const AREA_TILE_CATALOG_VISIBLE_RESULT_LIMIT = 100;

/**
 * A one-cell SET group is still a normal replaceable tile.  Only members of a
 * multi-cell group need to remain out of the individual Tile_ID selector,
 * because replacing one of those would corrupt the group footprint.
 */
export function resolveAuroraAreaReplaceableTiles(
  definition: AuroraAreaTilesetDefinition
): readonly AuroraAreaTilesetTile[] {
  const multiCellGroupTileIds = new Set(
    definition.groups
      .filter((group) => group.tileIds.filter((tileId) => tileId !== null).length > 1)
      .flatMap((group) => group.tileIds)
      .filter((tileId): tileId is number => tileId !== null)
  );
  return definition.tiles.filter((tile) => !multiCellGroupTileIds.has(tile.tileId));
}

interface AreaEditingLocalProofEventDetail {
  areaResRef: string;
  width: number;
  height: number;
  definition: AuroraAreaTilesetDefinition;
}

interface TilePropertiesTarget {
  sceneId: string;
  sourceUpdatedAtUnixMs: number;
  selectedTileId: string;
  tileIds: string[];
}

interface AreaPropertiesTarget {
  sceneId: string;
  sourceUpdatedAtUnixMs: number;
}

interface AreaVerificationSnapshot {
  sourceUpdatedAtUnixMs: number;
  result: AreaEditingVerificationResult;
  finalValid: boolean;
  issues: AreaEditingVerificationResult["issues"];
  assetReadiness: AreaVerificationAssetReadiness;
}

interface AtomicAreaCreateValidationSnapshot {
  readonly sourceUpdatedAtUnixMs: number;
  readonly areaName: string;
  readonly areaTag: string;
  readonly profile: AreaCreateProfile;
  readonly command: AreaCreateCommand;
  readonly idempotencyKey: string;
  readonly receipt: AreaCreateValidationReceipt;
}

interface AtomicAreaUpdateValidationSnapshot {
  readonly sourceUpdatedAtUnixMs: number;
  readonly command: AreaUpdateValidationCommand;
  readonly idempotencyKey: string;
  readonly receipt: AreaUpdateValidationReceipt;
}

type AreaVerificationAssetReadiness = Pick<
  AreaTileProcessContractReadiness,
  | "areaId"
  | "status"
  | "expectedCandidateCount"
  | "pendingCandidateCount"
  | "checkedCandidateCount"
  | "readyCandidateCount"
  | "blockedCandidateCount"
  | "sourceAssetReadyCount"
  | "sourceAssetBlockedCount"
  | "mdlSourceReadyCount"
  | "mdlSourceBlockedCount"
  | "glbGeometryReadyCount"
  | "glbGeometryBlockedCount"
  | "materialTextureContractReadyCount"
  | "materialBindingBlockedCount"
  | "renderLoaderReadyCount"
  | "renderLoaderBlockedCount"
  | "blockerSummary"
  | "textureMaterialBlockerSummary"
  | "renderAssetContractBlockerSummary"
  | "mdlGlbMaterialBlockerSummary"
>;

function snapshotAreaAssetReadiness(
  readiness: AreaTileProcessContractReadiness
): AreaVerificationAssetReadiness {
  const {
    areaId,
    status,
    expectedCandidateCount,
    pendingCandidateCount,
    checkedCandidateCount,
    readyCandidateCount,
    blockedCandidateCount,
    sourceAssetReadyCount,
    sourceAssetBlockedCount,
    mdlSourceReadyCount,
    mdlSourceBlockedCount,
    glbGeometryReadyCount,
    glbGeometryBlockedCount,
    materialTextureContractReadyCount,
    materialBindingBlockedCount,
    renderLoaderReadyCount,
    renderLoaderBlockedCount,
    blockerSummary,
    textureMaterialBlockerSummary,
    renderAssetContractBlockerSummary,
    mdlGlbMaterialBlockerSummary
  } = readiness;
  return {
    areaId,
    status,
    expectedCandidateCount,
    pendingCandidateCount,
    checkedCandidateCount,
    readyCandidateCount,
    blockedCandidateCount,
    sourceAssetReadyCount,
    sourceAssetBlockedCount,
    mdlSourceReadyCount,
    mdlSourceBlockedCount,
    glbGeometryReadyCount,
    glbGeometryBlockedCount,
    materialTextureContractReadyCount,
    materialBindingBlockedCount,
    renderLoaderReadyCount,
    renderLoaderBlockedCount,
    blockerSummary,
    textureMaterialBlockerSummary,
    renderAssetContractBlockerSummary,
    mdlGlbMaterialBlockerSummary
  };
}

function buildAreaAssetReadinessIssues(
  readiness: AreaVerificationAssetReadiness
): AreaEditingVerificationResult["issues"] {
  if (isAreaAssetReadinessSettled(readiness)) {
    return [];
  }
  const issues: Array<AreaEditingVerificationResult["issues"][number]> = [{
    severity: "error",
    code: "TILE_ASSET_PROCESS_NOT_READY",
    message: `Tile asset process is ${readiness.status}: ${readiness.checkedCandidateCount}/${readiness.expectedCandidateCount ?? readiness.checkedCandidateCount} checked, ${readiness.readyCandidateCount} ready, ${readiness.blockedCandidateCount} blocked, ${readiness.pendingCandidateCount ?? 0} pending. ${readiness.blockerSummary}`
  }];
  const summaries: Array<[string, string]> = [
    ["TILE_ASSET_TEXTURE_MATERIAL_BLOCKERS", readiness.textureMaterialBlockerSummary],
    ["TILE_ASSET_RENDER_CONTRACT_BLOCKERS", readiness.renderAssetContractBlockerSummary],
    ["TILE_ASSET_MDL_GLB_MATERIAL_BLOCKERS", readiness.mdlGlbMaterialBlockerSummary]
  ];
  for (const [code, summary] of summaries) {
    if (summary.trim() && summary.trim().toLowerCase() !== "none") {
      issues.push({ severity: "error", code, message: summary });
    }
  }
  return issues;
}

function isAreaAssetReadinessSettled(
  readiness: AreaVerificationAssetReadiness
): boolean {
  return readiness.status === "ready" &&
    readiness.blockedCandidateCount === 0 &&
    (readiness.pendingCandidateCount ?? 0) === 0 &&
    readiness.checkedCandidateCount ===
      (readiness.expectedCandidateCount ?? readiness.checkedCandidateCount) &&
    readiness.readyCandidateCount === readiness.checkedCandidateCount;
}

function nextAreaCreateOpaqueId(prefix: string): string {
  const suffix = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
  return `${prefix}-${suffix}`;
}

function formatAreaCreateFailure(error: Readonly<{
  code: string;
  message: string;
  details: readonly Readonly<{ path: string; reason: string }>[];
}>): string {
  const details = error.details
    .map((detail) => `${detail.path}: ${detail.reason}`)
    .join("; ");
  return `${error.code}: ${error.message}${details ? ` (${details})` : ""}`;
}

function formatAreaUpdateFailure(error: Readonly<{
  code: string;
  message: string;
  details: readonly Readonly<{ path: string; reason: string }>[];
}>): string {
  const details = error.details
    .map((detail) => `${detail.path}: ${detail.reason}`)
    .join("; ");
  return `${error.code}: ${error.message}${details ? ` (${details})` : ""}`;
}

function resolveAreaWorkspaceFailureCode(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const [candidate] = error.message.split(":", 1);
  return candidate && /^[A-Z][A-Z0-9_]*$/u.test(candidate) ? candidate : fallback;
}

export function buildAreaEditingPropertyMutations(
  facade: AreaPropertiesFacade,
  scene: AreaScene,
  sourceArea: unknown,
) {
  const comments = facade.buildMutation(scene, sourceArea);
  const eventScripts = facade.buildEventScriptMutations(scene, sourceArea);
  const basicIdentity = facade.buildBasicIdentityMutations(scene, sourceArea);
  const advancedFlags = facade.buildAdvancedFlagMutations(scene, sourceArea);
  const visualEnvironmentCatalogSelection =
    facade.buildVisualEnvironmentCatalogSelectionMutation(scene, sourceArea);
  const lightingSchemeChanged = Boolean(
    visualEnvironmentCatalogSelection
    && visualEnvironmentCatalogSelection.expectedValue.lightingSchemeRowIndex
      !== visualEnvironmentCatalogSelection.value.lightingSchemeRowIndex,
  );
  const visualEnvironment = lightingSchemeChanged
    ? undefined
    : facade.buildVisualEnvironmentMutation(scene, sourceArea);
  const visualEnvironmentScalarControls = lightingSchemeChanged
    ? undefined
    : facade.buildVisualEnvironmentScalarControlsMutation(scene, sourceArea);
  return Object.freeze({
    ...(comments ? { comments } : {}),
    ...(eventScripts ? { eventScripts } : {}),
    ...(basicIdentity ? { basicIdentity } : {}),
    ...(advancedFlags ? { advancedFlags } : {}),
    ...(visualEnvironmentCatalogSelection
      ? { visualEnvironmentCatalogSelection }
      : {}),
    ...(visualEnvironment ? { visualEnvironment } : {}),
    ...(visualEnvironmentScalarControls
      ? { visualEnvironmentScalarControls }
      : {}),
  });
}

export function AuroraAreaEditingPanel({
  accessToken,
  scene,
  selectedTileId = null,
  selectedTileIds = [],
  tileProcessReadiness = null,
  tileCatalogCertificationIndex,
  tileProductionCertification,
  activeTool = DEFAULT_AURORA_AREA_EDITING_TOOL,
  onActiveToolChange,
  onSceneSelected,
  onSceneMutation,
  areaEditingFacade,
  areaCreateFacade,
  areaUpdateFacade,
  areaEventScriptCatalogFacade,
  areaEventScriptPublicationFacade,
  areaDraftSessionRegistry,
  canMaterializeAreas = false,
  onAreaMaterialized,
  onAreaWorkspaceStatusChange,
  trackTelemetryEvent,
}: AuroraAreaEditingPanelProps) {
  const connectivityDiagnostics = useMemo(
    () =>
      scene
        ? buildAreaTileConnectivityDiagnostics({
            width: scene.width,
            height: scene.height,
            tiles: scene.tiles,
            ...(scene.auroraVfxCollision
              ? { collision: scene.auroraVfxCollision }
              : {})
          })
        : null,
    [scene]
  );
  const notifySceneMutation = (
    nextScene: AreaScene,
    nextSelectedTileId?: string | null,
    nextSelectedTileIds?: string[]
  ) => {
    if (onSceneMutation) {
      onSceneMutation(nextScene, nextSelectedTileId, nextSelectedTileIds);
      return;
    }
    onSceneSelected(nextScene);
  };
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [tileRow, setTileRow] = useState(0);
  const [tileCol, setTileCol] = useState(0);
  const [replacementTileId, setReplacementTileId] = useState("");
  const [matrixFixtureTileId, setMatrixFixtureTileId] = useState("");
  const [matrixFixtureBatch, setMatrixFixtureBatch] = useState("");
  const [matrixGroupFixtureBatch, setMatrixGroupFixtureBatch] = useState("");
  const [tileCatalogQuery, setTileCatalogQuery] = useState("");
  const [tileCatalogCategory, setTileCatalogCategory] =
    useState<AreaTileCatalogCategoryFilter>("all");
  const [tileCatalogCapability, setTileCatalogCapability] =
    useState<AreaTileCatalogCapabilityFilter>("all");
  const [tileCatalogCertification, setTileCatalogCertification] =
    useState<AreaTileCatalogCertificationFilter>("all");
  const [tileCatalogTilesets, setTileCatalogTilesets] =
    useState<readonly AreaTilesetEditingSummary[] | null>(null);
  const [tileCatalogTilesetResRef, setTileCatalogTilesetResRef] = useState("");
  const [tileCatalogDefinition, setTileCatalogDefinition] =
    useState<AuroraAreaTilesetDefinition | null>(null);
  const [loadedTileCatalogCertification, setLoadedTileCatalogCertification] =
    useState<Readonly<{
      tilesetResRef: string;
      index: AreaTileCatalogCertificationIndex;
    }> | null>(null);
  const [tileCatalogLoadState, setTileCatalogLoadState] =
    useState<"idle" | "loading" | "error">("idle");
  const [tileCatalogLoadMessage, setTileCatalogLoadMessage] = useState<string | null>(null);
  const [availableTilesets, setAvailableTilesets] = useState<readonly AreaTilesetEditingSummary[] | null>(null);
  const [newAreaResRef, setNewAreaResRef] = useState("new_area");
  const [newTilesetResRef, setNewTilesetResRef] = useState("");
  const [newWidth, setNewWidth] = useState(4);
  const [newHeight, setNewHeight] = useState(4);
  const [newAreaProofInitializer, setNewAreaProofInitializer] = useState<
    "native-lcg" | "first-compatible"
  >("native-lcg");
  const [tilePropertiesTarget, setTilePropertiesTarget] =
    useState<TilePropertiesTarget | null>(null);
  const [areaPropertiesTarget, setAreaPropertiesTarget] =
    useState<AreaPropertiesTarget | null>(null);
  const areaPropertiesFacade = useMemo(() => createAreaPropertiesFacade(), []);
  const [verification, setVerification] = useState<AreaVerificationSnapshot | null>(null);
  const [moduleAreaName, setModuleAreaName] = useState(scene?.areaName ?? "");
  const [moduleAreaTag, setModuleAreaTag] = useState(
    scene?.auroraAreaEditing?.state.areaResRef ?? ""
  );
  const [atomicValidation, setAtomicValidation] =
    useState<AtomicAreaCreateValidationSnapshot | null>(null);
  const [atomicUpdateValidation, setAtomicUpdateValidation] =
    useState<AtomicAreaUpdateValidationSnapshot | null>(null);
  const tilePropertiesCommitInFlightRef = useRef(false);
  const currentTileProcessReadiness =
    scene && tileProcessReadiness?.areaId === scene.sceneId ? tileProcessReadiness : null;
  const currentAssetReadiness = currentTileProcessReadiness
    ? snapshotAreaAssetReadiness(currentTileProcessReadiness)
    : null;
  const currentVerification =
    verification &&
    scene &&
    currentAssetReadiness &&
    verification.sourceUpdatedAtUnixMs === scene.updatedAtUnixMs &&
    JSON.stringify(verification.assetReadiness) === JSON.stringify(currentAssetReadiness)
      ? verification
      : null;
  const currentAtomicValidation =
    atomicValidation &&
    scene &&
    currentVerification?.finalValid === true &&
    atomicValidation.sourceUpdatedAtUnixMs === scene.updatedAtUnixMs &&
    atomicValidation.areaName === moduleAreaName &&
    atomicValidation.areaTag === moduleAreaTag
      ? atomicValidation
      : null;
  const currentDraftSession = scene
    ? areaDraftSessionRegistry?.current[scene.sceneId]
    : undefined;
  const currentPersistedDraftIdentity = scene
    ? resolveCurrentAreaUpdateDraftIdentity(scene, currentDraftSession)
    : null;
  const currentAtomicUpdateValidation =
    atomicUpdateValidation &&
    scene &&
    currentVerification?.finalValid === true &&
    currentPersistedDraftIdentity &&
    atomicUpdateValidation.sourceUpdatedAtUnixMs === scene.updatedAtUnixMs &&
    atomicUpdateValidation.command.draft.id === currentPersistedDraftIdentity.id &&
    atomicUpdateValidation.command.draft.revision === currentPersistedDraftIdentity.revision &&
    atomicUpdateValidation.command.draft.normalizedSha256 ===
      currentPersistedDraftIdentity.normalizedSha256
      ? atomicUpdateValidation
      : null;
  const selectedTile =
    scene && selectedTileId
      ? scene.tiles.find((tile) => tile.id === selectedTileId) ?? null
      : null;
  const editingPayload = scene?.auroraAreaEditing;
  const effectiveTileCatalogDefinition =
    tileCatalogDefinition ?? editingPayload?.definition ?? null;
  const productionTileCatalogCertificationIndex =
    tileProductionCertification?.status === "ready" &&
    effectiveTileCatalogDefinition?.tilesetResRef.trim().toLowerCase() ===
      tileProductionCertification.tilesetResRef.trim().toLowerCase()
      ? tileProductionCertification.index
      : undefined;
  const effectiveTileCatalogCertificationIndex =
    productionTileCatalogCertificationIndex ??
    (loadedTileCatalogCertification &&
    effectiveTileCatalogDefinition?.tilesetResRef.trim().toLowerCase() ===
      loadedTileCatalogCertification.tilesetResRef
      ? loadedTileCatalogCertification.index
      : tileCatalogCertificationIndex);
  const tileCatalog = useMemo(
    () => effectiveTileCatalogDefinition
      ? filterAreaTileCatalog({
          definition: effectiveTileCatalogDefinition,
          query: tileCatalogQuery,
          category: tileCatalogCategory,
          capability: tileCatalogCapability,
          certification: tileCatalogCertification,
          certificationIndex: effectiveTileCatalogCertificationIndex,
        })
      : null,
    [
      effectiveTileCatalogDefinition,
      tileCatalogCapability,
      tileCatalogCategory,
      tileCatalogCertification,
      effectiveTileCatalogCertificationIndex,
      tileCatalogQuery,
    ],
  );

  useEffect(() => {
    if (!editingPayload) return;
    setTileCatalogDefinition(editingPayload.definition);
    setLoadedTileCatalogCertification(null);
    setTileCatalogTilesetResRef(editingPayload.definition.tilesetResRef);
    setTileCatalogLoadState("idle");
    setTileCatalogLoadMessage(null);
  }, [editingPayload?.definition]);

  useEffect(() => {
    if (!selectedTile) {
      return;
    }
    setTileRow(selectedTile.row);
    setTileCol(selectedTile.col);
    setReplacementTileId(String(selectedTile.tileId ?? selectedTile.tileIndex ?? ""));
  }, [selectedTile]);

  useEffect(() => {
    setModuleAreaName(scene?.areaName ?? "");
    setModuleAreaTag(scene?.auroraAreaEditing?.state.areaResRef ?? "");
    setAtomicValidation(null);
    setAtomicUpdateValidation(null);
  }, [scene?.sceneId]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    const handleLocalProof = (event: Event) => {
      const detail = (event as CustomEvent<AreaEditingLocalProofEventDetail>).detail;
      if (
        !detail?.definition ||
        !detail.areaResRef.trim().toLowerCase().startsWith("matrix_")
      ) {
        return;
      }
      const result = createAuroraAreaEditingState({
        areaResRef: detail.areaResRef,
        width: detail.width,
        height: detail.height,
        definition: detail.definition,
        selector: () => 0
      });
      if (!result.ok) {
        setStatus("error");
        setMessage(result.message);
        return;
      }
      const draftScene: AreaScene = {
        ...createBlankAreaScene(detail.width, detail.height),
        sceneId: `area_${detail.areaResRef}`,
        areaName: detail.areaResRef,
        width: detail.width,
        height: detail.height,
        tiles: [],
        objects: [],
        updatedAtUnixMs: Date.now(),
        source: "local_draft"
      };
      onSceneSelected(
        applyAuroraAreaEditingStateToScene(
          draftScene,
          result.state,
          detail.definition,
          detail.definition.defaultTerrain ?? ""
        )
      );
      setStatus("ready");
      setMessage(null);
    };
    window.addEventListener(AREA_EDITING_LOCAL_PROOF_EVENT, handleLocalProof);
    return () => window.removeEventListener(AREA_EDITING_LOCAL_PROOF_EVENT, handleLocalProof);
  }, [onSceneSelected, scene]);

  if (!accessToken) {
    return null;
  }

  const loadTilesetsForCreate = async () => {
    if (!areaEditingFacade) {
      setStatus("error");
      setMessage("Area editing facade is unavailable.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const tilesets = await areaEditingFacade.queries.listTilesets(accessToken);
      setAvailableTilesets(tilesets);
      setNewTilesetResRef((current) => current || tilesets[0]?.tilesetResRef || "");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not load tilesets.");
    }
  };

  const createBlankArea = async () => {
    if (!areaEditingFacade) {
      setStatus("error");
      setMessage("Area editing facade is unavailable.");
      return;
    }
    const areaResRef = newAreaResRef.trim().toLowerCase();
    if (!/^[a-z0-9_]{1,16}$/u.test(areaResRef) || !newTilesetResRef) {
      setMessage("Enter a 1..16 character Area resref and select a tileset.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const definition = await areaEditingFacade.queries.getTilesetDefinition(
        accessToken,
        newTilesetResRef,
      );
      const result = createAuroraAreaEditingState({
        areaResRef,
        width: newWidth,
        height: newHeight,
        definition,
        ...(newAreaProofInitializer === "first-compatible"
          ? { selector: () => 0 }
          : {})
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      const isDevelopmentMatrixProofCreation =
        import.meta.env.DEV &&
        newAreaProofInitializer === "first-compatible" &&
        areaResRef.startsWith("matrix_");
      if (tileProductionCertification && !isDevelopmentMatrixProofCreation) {
        const normalizedTilesetResRef = definition.tilesetResRef.trim().toLowerCase();
        let certification = tileProductionCertification;
        if (
          certification.status !== "ready" ||
          certification.tilesetResRef.trim().toLowerCase() !== normalizedTilesetResRef
        ) {
          try {
            certification = {
              status: "ready",
              tilesetResRef: normalizedTilesetResRef,
              index: await areaEditingFacade.queries.getTileCertificationIndex(
                accessToken,
                normalizedTilesetResRef,
              ),
            };
          } catch {
            certification = {
              status: "unavailable",
              tilesetResRef: normalizedTilesetResRef,
              reasonCode: "LOAD_FAILED",
            };
          }
        }
        const admission = evaluateAreaTileProductionPlacementAdmission({
          tilesetResRef: normalizedTilesetResRef,
          candidateTileIds: result.state.tiles.map((tile) => tile.tileId),
          certification,
        });
        if (!admission.allowed) {
          const firstDiagnostic = admission.diagnostics[0];
          setStatus("error");
          setMessage(formatAreaTileProductionPlacementBlocker(admission));
          trackTelemetryEvent?.("scene.area_tiles.production_admission.blocked", {
            code: admission.code,
            operationKind: "area_create_initial_topology",
            tilesetResRef: admission.tilesetResRef,
            changedTileIdCount: admission.tileIds.length,
            firstBlockedTileId: firstDiagnostic?.tileId,
            firstBlockedStage: firstDiagnostic?.stage,
          });
          return;
        }
      }
      const draftScene: AreaScene = {
        ...createBlankAreaScene(newWidth, newHeight),
        sceneId: `area_${areaResRef}`,
        areaName: areaResRef,
        width: newWidth,
        height: newHeight,
        tiles: [],
        objects: [],
        updatedAtUnixMs: Date.now(),
        source: "local_draft"
      };
      onSceneSelected(
        applyAuroraAreaEditingStateToScene(
          draftScene,
          result.state,
          definition,
          definition.defaultTerrain ?? ""
        )
      );
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not create the local Area draft.");
    }
  };

  const newAreaControls = (
    <>
      <button
        type="button"
        onClick={() => void loadTilesetsForCreate()}
        disabled={status === "loading" || !areaEditingFacade}
        title={areaEditingFacade ? undefined : "Area editing facade is unavailable."}
      >
        New blank local Area
      </button>
      {availableTilesets ? (
        <div role="group" aria-label="New Area settings">
          <label>
            Area resref
            <input value={newAreaResRef} maxLength={16} onChange={(event) => setNewAreaResRef(event.target.value)} />
          </label>
          <label>
            Tileset
            <select value={newTilesetResRef} onChange={(event) => setNewTilesetResRef(event.target.value)}>
              {availableTilesets.map((tileset) => (
                <option key={tileset.tilesetResRef} value={tileset.tilesetResRef}>
                  {tileset.displayName} ({tileset.tilesetResRef})
                </option>
              ))}
            </select>
          </label>
          <label>
            Width
            <input type="number" min={2} max={32} value={newWidth} onChange={(event) => setNewWidth(Number(event.target.value))} />
          </label>
          <label>
            Height
            <input type="number" min={2} max={32} value={newHeight} onChange={(event) => setNewHeight(Number(event.target.value))} />
          </label>
          {import.meta.env.DEV ? (
            <label>
              Development proof initializer
              <select
                value={newAreaProofInitializer}
                onChange={(event) =>
                  setNewAreaProofInitializer(
                    event.target.value === "first-compatible"
                      ? "first-compatible"
                      : "native-lcg"
                  )
                }
              >
                <option value="native-lcg">Normal deterministic Aurora LCG</option>
                <option value="first-compatible">First compatible SET tile</option>
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => void createBlankArea()}
            disabled={status === "loading" || !newTilesetResRef || !areaEditingFacade}
          >
            Create local Area
          </button>
        </div>
      ) : null}
    </>
  );

  if (!scene) {
    return (
      <section className="aurora-area-editing-panel" aria-label="Aurora Area editing">
        <h3>Area topology</h3>
        {newAreaControls}
        {message ? <p role="alert">{message}</p> : null}
      </section>
    );
  }

  const payload = editingPayload;
  const isBlankSeedScene = scene.sceneId === DEFAULT_BLANK_SCENE_ID;
  const isMatrixDiagnosticArea = import.meta.env.DEV &&
    payload?.state.areaResRef.startsWith("matrix_") === true;
  const terrainOptions = payload
    ? payload.definition.terrainTypes?.length
      ? payload.definition.terrainTypes.map((type) => ({ id: type.id, name: type.name }))
      : [...new Set(payload.definition.tiles.flatMap((tile) => Object.values(tile.terrain).filter(Boolean)))]
          .sort()
          .map((id) => ({ id, name: id }))
    : [];
  const crosserOptions = payload?.definition.crosserTypes ?? [];
  const groups = payload?.definition.groups ?? [];
  const selectedGroupInstance =
    payload && selectedTile
      ? resolveAuroraAreaGroupInstanceAtCell(payload.state, {
          row: selectedTile.row,
          col: selectedTile.col
        })
      : undefined;
  const selectedGroupTemplate = selectedGroupInstance
    ? groups.find((group) => group.id === selectedGroupInstance.groupId)
    : undefined;

  const evaluateTileIdAdmission = (
    candidateTileIds: readonly number[],
  ): AreaTileProductionPlacementAdmissionResult | null => {
    if (!tileProductionCertification || !payload || isMatrixDiagnosticArea) {
      return null;
    }
    return evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: payload.definition.tilesetResRef,
      candidateTileIds,
      certification: tileProductionCertification,
    });
  };

  const admitTopologyState = (
    nextState: AuroraAreaEditingState,
    operationKind: string,
    bypassDiagnosticFixture = false,
  ): boolean => {
    if (!payload) return false;
    if (!tileProductionCertification || bypassDiagnosticFixture) return true;
    const candidateTileIds = collectChangedAuroraAreaTileDefinitionIds(
      payload.state,
      nextState,
    );
    if (candidateTileIds.length === 0) return true;
    const admission = evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: payload.definition.tilesetResRef,
      candidateTileIds,
      certification: tileProductionCertification,
    });
    if (admission.allowed) return true;
    const firstDiagnostic = admission.diagnostics[0];
    setStatus("error");
    setMessage(formatAreaTileProductionPlacementBlocker(admission));
    trackTelemetryEvent?.("scene.area_tiles.production_admission.blocked", {
      code: admission.code,
      operationKind,
      tilesetResRef: admission.tilesetResRef,
      changedTileIdCount: admission.tileIds.length,
      firstBlockedTileId: firstDiagnostic?.tileId,
      firstBlockedStage: firstDiagnostic?.stage,
    });
    return false;
  };

  const loadTileCatalogTilesets = async () => {
    if (!areaEditingFacade || !payload) {
      setTileCatalogLoadState("error");
      setTileCatalogLoadMessage("Area editing facade is unavailable.");
      return;
    }
    setTileCatalogLoadState("loading");
    setTileCatalogLoadMessage(null);
    try {
      const listed = await areaEditingFacade.queries.listTilesets(accessToken);
      const currentResRef = payload.definition.tilesetResRef;
      const includesCurrent = listed.some(
        (tileset) => tileset.tilesetResRef.toLowerCase() === currentResRef.toLowerCase(),
      );
      setTileCatalogTilesets(
        includesCurrent
          ? listed
          : [
              { tilesetResRef: currentResRef, displayName: currentResRef },
              ...listed,
            ],
      );
      setTileCatalogTilesetResRef((current) => current || currentResRef);
      setTileCatalogLoadState("idle");
    } catch (error) {
      setTileCatalogLoadState("error");
      setTileCatalogLoadMessage(
        error instanceof Error ? error.message : "Could not list catalog tilesets.",
      );
    }
  };

  const loadSelectedTileCatalog = async () => {
    if (!areaEditingFacade || !tileCatalogTilesetResRef) {
      setTileCatalogLoadState("error");
      setTileCatalogLoadMessage("Select a catalog tileset through the Area editing facade.");
      return;
    }
    setTileCatalogLoadState("loading");
    setTileCatalogLoadMessage(null);
    try {
      const requestedTilesetResRef = tileCatalogTilesetResRef.trim();
      const definition = await areaEditingFacade.queries.getTilesetDefinition(
        accessToken,
        requestedTilesetResRef,
      );
      if (
        definition.tilesetResRef.trim().toLowerCase() !==
        requestedTilesetResRef.toLowerCase()
      ) {
        throw new Error(
          `Tile catalog response returned ${definition.tilesetResRef} for requested ${requestedTilesetResRef}.`,
        );
      }
      setTileCatalogDefinition(definition);
      const normalizedTilesetResRef = requestedTilesetResRef.toLowerCase();
      try {
        const certificationIndex =
          await areaEditingFacade.queries.getTileCertificationIndex(
            accessToken,
            normalizedTilesetResRef,
          );
        setLoadedTileCatalogCertification({
          tilesetResRef: normalizedTilesetResRef,
          index: certificationIndex,
        });
      } catch {
        setLoadedTileCatalogCertification({
          tilesetResRef: normalizedTilesetResRef,
          index: new Map(),
        });
        setTileCatalogLoadMessage(
          "Tile certification ledger is unavailable; certification remains missing.",
        );
      }
      setTileCatalogLoadState("idle");
    } catch (error) {
      setTileCatalogLoadState("error");
      setTileCatalogLoadMessage(
        error instanceof Error ? error.message : "Could not load the selected tile catalog.",
      );
    }
  };

  const enable = async () => {
    if (!areaEditingFacade) {
      setStatus("error");
      setMessage("Area editing facade is unavailable.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const source = await areaEditingFacade.queries.getDefinitionForArea(
        accessToken,
        scene.sceneId,
      );
      const definition = source.definition;
      const tiles: AuroraAreaEditableTile[] = scene.tiles.map((tile) => ({
        id: tile.id,
        row: tile.row,
        col: tile.col,
        tileId: tile.tileId ?? tile.tileIndex ?? 0,
        orientation: tile.orientation,
        height: tile.height ?? 0,
        mainLight1: tile.mainLight1,
        mainLight2: tile.mainLight2,
        sourceLight1: tile.sourceLight1,
        sourceLight2: tile.sourceLight2,
        animLoop1: tile.animLoop1,
        animLoop2: tile.animLoop2,
        animLoop3: tile.animLoop3
      }));
      const hydrated = hydrateAuroraAreaEditingState({
        areaResRef: scene.sceneId.replace(/^area_/u, "").slice(0, 16),
        width: scene.width,
        height: scene.height,
        definition,
        tiles,
        sourceAreaFingerprint: source.areaFingerprint
      });
      if (!hydrated.ok) {
        throw new Error(hydrated.message);
      }
      onSceneSelected(
        applyAuroraAreaEditingStateToScene(
          scene,
          hydrated.state,
          definition,
          definition.defaultTerrain ?? terrainOptions[0]?.id ?? ""
        )
      );
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not load the Area editing definition.");
    }
  };
  const selectTerrain = (terrainBrush: string) => {
    onActiveToolChange?.({ kind: "terrain", terrain: terrainBrush });
  };

  const selectGroup = (selectedGroupId: string) => {
    onActiveToolChange?.({ kind: "group", groupId: selectedGroupId, orientation: 0 });
  };

  const selectCrosser = (crosser: string) => {
    onActiveToolChange?.({ kind: "crosser", crosser });
  };

  const selectHeight = (delta: -1 | 1) => {
    onActiveToolChange?.({ kind: "height", delta });
  };

  const rotateGroup = (delta: -1 | 1) => {
    if (activeTool.kind !== "group") return;
    const orientation = (((activeTool.orientation + delta + 4) % 4) as 0 | 1 | 2 | 3);
    onActiveToolChange?.({ ...activeTool, orientation });
  };

  const resize = (edge: "top" | "right" | "bottom" | "left", delta: number) => {
    if (!payload) return;
    const result = resizeAuroraArea(payload.state, payload.definition, edge, delta);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!admitTopologyState(result.state, `resize:${edge}:${delta}`)) return;
    setMessage(null);
    notifySceneMutation(
      applyAuroraAreaEditingStateToScene(scene, result.state, payload.definition, payload.terrainBrush)
    );
  };

  const rotate = (turns: 1 | 3) => {
    if (!payload) return;
    const result = rotateAuroraArea(payload.state, payload.definition, turns);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!admitTopologyState(result.state, `area_rotate:${turns}`)) return;
    setMessage(null);
    notifySceneMutation(
      applyAuroraAreaEditingStateToScene(scene, result.state, payload.definition, payload.terrainBrush)
    );
  };

  const mutateTile = (operation: "rotateLeft" | "rotateRight" | "heightDown" | "heightUp" | "reroll") => {
    if (!payload) return;
    if (
      !Number.isInteger(tileRow) ||
      !Number.isInteger(tileCol) ||
      tileRow < 0 ||
      tileRow >= payload.state.height ||
      tileCol < 0 ||
      tileCol >= payload.state.width
    ) {
      setMessage(
        `Choose an integer tile cell inside rows 0..${payload.state.height - 1} and columns 0..${payload.state.width - 1}.`
      );
      return;
    }
    const cell = { row: tileRow, col: tileCol };
    const selector = createAuroraAreaPlacementSelector(scene.sceneId, tileRow, tileCol, {
      kind: "terrain",
      terrain: `__tile_${operation}__`
    });
    const result = operation === "reroll"
      ? rerollAuroraAreaTileVariant(
          payload.state,
          payload.definition,
          cell,
          selector
        )
      : operation === "rotateLeft"
      ? rotateAuroraAreaTile(payload.state, payload.definition, cell, -1, selector)
      : operation === "rotateRight"
        ? rotateAuroraAreaTile(payload.state, payload.definition, cell, 1, selector)
        : changeAuroraAreaTileHeight(
            payload.state,
            payload.definition,
            cell,
            operation === "heightDown" ? -1 : 1,
            selector
          );
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!admitTopologyState(result.state, `tile_${operation}`)) return;
    setMessage(null);
    const nextScene = applyAuroraAreaEditingStateToScene(
      scene,
      result.state,
      payload.definition,
      payload.terrainBrush
    );
    const nextSelectedTileId = nextScene.tiles.find(
      (tile) => tile.row === cell.row && tile.col === cell.col
    )?.id ?? null;
    notifySceneMutation(nextScene, nextSelectedTileId);
  };

  const replaceSelectedTileId = () => {
    if (!payload) return;
    if (
      !Number.isInteger(tileRow) ||
      !Number.isInteger(tileCol) ||
      tileRow < 0 ||
      tileRow >= payload.state.height ||
      tileCol < 0 ||
      tileCol >= payload.state.width
    ) {
      setMessage(
        `Choose an integer tile cell inside rows 0..${payload.state.height - 1} and columns 0..${payload.state.width - 1}.`
      );
      return;
    }
    const tileId = Number(isMatrixDiagnosticArea ? matrixFixtureTileId : replacementTileId);
    const cell = { row: tileRow, col: tileCol };
    const selector = createAuroraAreaPlacementSelector(scene.sceneId, tileRow, tileCol, {
      kind: "terrain",
      terrain: `__tile_id_${tileId}__`
    });
    const result = isMatrixDiagnosticArea
      ? placeAuroraAreaDiagnosticFixtureTileId(payload.state, payload.definition, cell, tileId)
      : replaceAuroraAreaTileId(payload.state, payload.definition, cell, tileId, selector);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!admitTopologyState(
      result.state,
      isMatrixDiagnosticArea ? "matrix_fixture_exact" : "tile_id_replace",
      isMatrixDiagnosticArea,
    )) return;
    setMessage(null);
    const nextScene = applyAuroraAreaEditingStateToScene(
      scene,
      result.state,
      payload.definition,
      payload.terrainBrush
    );
    const nextSelectedTileId = nextScene.tiles.find(
      (tile) => tile.row === cell.row && tile.col === cell.col
    )?.id ?? null;
    notifySceneMutation(nextScene, nextSelectedTileId);
  };

  const applyMatrixFixtureBatch = () => {
    if (!payload || !isMatrixDiagnosticArea) return;
    let fixtures: Array<{ row: number; col: number; tileId: number }>;
    try {
      const parsed: unknown = JSON.parse(matrixFixtureBatch);
      if (!Array.isArray(parsed)) throw new Error("Matrix fixture batch must be a JSON array.");
      fixtures = parsed.map((entry) => {
        const candidate = entry as { row?: unknown; col?: unknown; tileId?: unknown };
        const row = Number(candidate.row);
        const col = Number(candidate.col);
        const tileId = Number(candidate.tileId);
        if (!Number.isInteger(row) || !Number.isInteger(col) || !Number.isInteger(tileId)) {
          throw new Error("Each matrix fixture requires integer row, col, and tileId values.");
        }
        return { row, col, tileId };
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Matrix fixture batch is invalid JSON.");
      return;
    }
    const result = placeAuroraAreaDiagnosticFixtureTiles(payload.state, payload.definition, fixtures);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!admitTopologyState(result.state, "matrix_fixture_batch", true)) return;
    setMessage(null);
    const nextScene = applyAuroraAreaEditingStateToScene(
      scene,
      result.state,
      payload.definition,
      payload.terrainBrush
    );
    const lastFixture = fixtures.at(-1) ?? null;
    const nextSelectedTileId = lastFixture
      ? nextScene.tiles.find((tile) => tile.row === lastFixture.row && tile.col === lastFixture.col)?.id ?? null
      : null;
    notifySceneMutation(nextScene, nextSelectedTileId);
  };

  const applyMatrixGroupFixtureBatch = () => {
    if (!payload || !isMatrixDiagnosticArea) return;
    let fixtures: Array<{ groupId: string; row: number; col: number; orientation: 0 | 1 | 2 | 3 }>;
    try {
      const parsed: unknown = JSON.parse(matrixGroupFixtureBatch);
      if (!Array.isArray(parsed)) throw new Error("Matrix group fixture batch must be a JSON array.");
      fixtures = parsed.map((entry) => {
        const candidate = entry as { groupId?: unknown; row?: unknown; col?: unknown; orientation?: unknown };
        const groupId = String(candidate.groupId ?? "").trim().toLowerCase();
        const row = Number(candidate.row);
        const col = Number(candidate.col);
        const orientation = Number(candidate.orientation);
        if (!groupId || !Number.isInteger(row) || !Number.isInteger(col) || ![0, 1, 2, 3].includes(orientation)) {
          throw new Error("Each matrix group fixture requires groupId, integer row/col, and orientation 0..3.");
        }
        return { groupId, row, col, orientation: orientation as 0 | 1 | 2 | 3 };
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Matrix group fixture batch is invalid JSON.");
      return;
    }
    const result = placeAuroraAreaDiagnosticFixtureGroups(payload.state, payload.definition, fixtures);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!admitTopologyState(result.state, "matrix_group_fixture_batch", true)) return;
    setMessage(null);
    const nextScene = applyAuroraAreaEditingStateToScene(
      scene,
      result.state,
      payload.definition,
      payload.terrainBrush
    );
    const firstFixture = fixtures[0] ?? null;
    const nextSelectedTileId = firstFixture
      ? result.state.groupInstances
        .find((group) =>
          group.groupId === firstFixture.groupId &&
          group.anchorRow === firstFixture.row &&
          group.anchorCol === firstFixture.col &&
          group.orientation === firstFixture.orientation
        )
        ?.tileIds[0] ?? null
      : null;
    notifySceneMutation(nextScene, nextSelectedTileId);
  };

  const mutateSelectedGroup = (
    operation: "rotateLeft" | "rotateRight" | "heightDown" | "heightUp" | "remove"
  ) => {
    if (!payload || !selectedTile || !selectedGroupInstance) return;
    const cell = { row: selectedTile.row, col: selectedTile.col };
    let result = operation === "remove"
      ? removeAuroraAreaGroupAtCell(payload.state, payload.definition, cell)
      : operation === "heightDown" || operation === "heightUp"
        ? changeAuroraAreaGroupHeightAtCell(
            payload.state,
            payload.definition,
            cell,
            operation === "heightDown" ? -1 : 1,
            createAuroraAreaPlacementSelector(scene.sceneId, cell.row, cell.col, {
              kind: "height",
              delta: operation === "heightDown" ? -1 : 1
            })
          )
        : rotateAuroraAreaGroupAtCell(
            payload.state,
            payload.definition,
            cell,
            operation === "rotateLeft" ? -1 : 1
          );
    if (
      !result.ok &&
      result.code === "GROUP_LOCKED" &&
      !selectedGroupInstance.underlay &&
      (operation === "remove" || operation === "rotateLeft" || operation === "rotateRight")
    ) {
      result = operation === "remove"
        ? removeSourceAuroraAreaGroupConservatively(payload.state, payload.definition, cell)
        : rotateSourceAuroraAreaGroupConservatively(
            payload.state,
            payload.definition,
            cell,
            operation === "rotateLeft" ? -1 : 1
          );
    }
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!admitTopologyState(result.state, `group_${operation}`)) return;
    setMessage(null);
    const nextScene = applyAuroraAreaEditingStateToScene(
      scene,
      result.state,
      payload.definition,
      payload.terrainBrush
    );
    const selectedMemberIndex = selectedGroupInstance.tileIds.indexOf(selectedTile.id);
    const nextGroup = result.state.groupInstances.find(
      (group) =>
        group.groupId === selectedGroupInstance.groupId &&
        group.anchorRow === selectedGroupInstance.anchorRow &&
        group.anchorCol === selectedGroupInstance.anchorCol
    );
    const nextSelectedTileId = operation === "remove"
      ? null
      : nextGroup?.tileIds[selectedMemberIndex] ?? nextGroup?.tileIds[0] ?? selectedTile.id;
    notifySceneMutation(nextScene, nextSelectedTileId);
  };

  const openTileProperties = () => {
    if (!payload || !selectedTile) {
      return;
    }
    const requestedIds = selectedTileIds.length > 0 ? selectedTileIds : [selectedTile.id];
    const tileIds = [...new Set(requestedIds.flatMap((tileId) => {
      const tile = payload.state.tiles.find((candidate) => candidate.id === tileId);
      if (!tile) return [];
      const group = resolveAuroraAreaGroupInstanceAtCell(payload.state, {
        row: tile.row,
        col: tile.col
      });
      return group ? group.tileIds : [tile.id];
    }))];
    if (tileIds.length === 0 || tileIds.some((tileId) =>
      !payload.state.tiles.some((tile) => tile.id === tileId)
    )) {
      setMessage("The Tile Properties selection is no longer present.");
      return;
    }
    tilePropertiesCommitInFlightRef.current = false;
    setTilePropertiesTarget({
      sceneId: scene.sceneId,
      sourceUpdatedAtUnixMs: scene.updatedAtUnixMs,
      selectedTileId: selectedTile.id,
      tileIds
    });
    setMessage(null);
  };

  const cancelTileProperties = () => {
    tilePropertiesCommitInFlightRef.current = false;
    setTilePropertiesTarget(null);
  };

  const openAreaProperties = () => {
    setAreaPropertiesTarget({
      sceneId: scene.sceneId,
      sourceUpdatedAtUnixMs: scene.updatedAtUnixMs,
    });
    setMessage(null);
  };

  const cancelAreaProperties = () => {
    setAreaPropertiesTarget(null);
  };

  const commitAreaProperties = (draft: AreaPropertiesDraft, close: boolean) => {
    if (
      !areaPropertiesTarget
      || areaPropertiesTarget.sceneId !== scene.sceneId
      || areaPropertiesTarget.sourceUpdatedAtUnixMs !== scene.updatedAtUnixMs
    ) {
      setAreaPropertiesTarget(null);
      setMessage("The Area Properties source changed; no changes were committed.");
      return;
    }
    const result = areaPropertiesFacade.apply(scene, draft);
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    setMessage(null);
    if (close) {
      setAreaPropertiesTarget(null);
    } else if (result.changed) {
      setAreaPropertiesTarget({
        sceneId: result.value.sceneId,
        sourceUpdatedAtUnixMs: result.value.updatedAtUnixMs,
      });
    }
    if (result.changed) {
      notifySceneMutation(
        result.value,
        selectedTileId,
        [...selectedTileIds],
      );
    }
  };

  const applyTileProperties = (nextState: AuroraAreaEditingState) => {
    if (!payload || !tilePropertiesTarget || tilePropertiesCommitInFlightRef.current) {
      return;
    }
    const targetIsCurrent =
      tilePropertiesTarget.sceneId === scene.sceneId &&
      tilePropertiesTarget.sourceUpdatedAtUnixMs === scene.updatedAtUnixMs &&
      tilePropertiesTarget.selectedTileId === selectedTileId &&
      tilePropertiesTarget.tileIds.every((tileId) =>
        payload.state.tiles.some((tile) => tile.id === tileId) &&
        nextState.tiles.some((tile) => tile.id === tileId)
      );
    if (!targetIsCurrent) {
      setTilePropertiesTarget(null);
      setMessage("The Tile Properties selection changed; no changes were committed.");
      return;
    }
    tilePropertiesCommitInFlightRef.current = true;
    const nextScene = applyAuroraAreaEditingStateToScene(
      scene,
      nextState,
      payload.definition,
      payload.terrainBrush
    );
    if (!admitTopologyState(nextState, "tile_properties")) {
      tilePropertiesCommitInFlightRef.current = false;
      return;
    }
    setTilePropertiesTarget(null);
    setMessage(null);
    notifySceneMutation(
      nextScene,
      tilePropertiesTarget.selectedTileId,
      tilePropertiesTarget.tileIds
    );
  };

  const exportAre = async () => {
    if (!payload || !areaEditingFacade) return;
    setStatus("loading");
    setMessage(null);
    try {
      const propertyMutations = buildAreaEditingPropertyMutations(
        areaPropertiesFacade,
        scene,
        currentDraftSession?.productionSource?.sourceArea,
      );
      await areaEditingFacade.commands.exportAndDownloadAre({
        accessToken,
        name: scene.areaName,
        state: payload.state,
        ...propertyMutations,
      });
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Area export failed.");
    }
  };

  const verifyArea = async () => {
    if (!payload || !currentTileProcessReadiness || !areaEditingFacade) return;
    setStatus("loading");
    setMessage(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "verification",
      state: "checking",
      sceneId: scene.sceneId,
      occurredAtUnixMs: Date.now(),
    });
    try {
      const propertyMutations = buildAreaEditingPropertyMutations(
        areaPropertiesFacade,
        scene,
        currentDraftSession?.productionSource?.sourceArea,
      );
      const result = await areaEditingFacade.queries.verify({
        accessToken,
        name: scene.areaName,
        state: payload.state,
        ...propertyMutations,
      });
      const assetReadiness = snapshotAreaAssetReadiness(currentTileProcessReadiness);
      const assetIssues = buildAreaAssetReadinessIssues(assetReadiness);
      const issues = [...result.issues, ...assetIssues];
      const finalValid = result.valid && assetIssues.length === 0;
      setVerification({
        sourceUpdatedAtUnixMs: scene.updatedAtUnixMs,
        result,
        finalValid,
        issues,
        assetReadiness
      });
      setStatus("ready");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "verification",
        state: finalValid ? "verified" : "failed",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        ...(finalValid ? {} : { code: "AREA_VERIFICATION_INVALID" }),
      });
      setMessage(finalValid
        ? `Area verification passed with ${issues.filter((issue) => issue.severity === "warning").length} warning(s).`
        : `Area verification found ${issues.filter((issue) => issue.severity === "error").length} error(s).`);
    } catch (error) {
      setStatus("error");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "verification",
        state: "failed",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        code: resolveAreaWorkspaceFailureCode(error, "AREA_VERIFICATION_FAILED"),
      });
      setMessage(error instanceof Error ? error.message : "Area verification failed.");
    }
  };

  const validateAtomicAreaCreate = async () => {
    if (!payload || payload.state.sourceAreaFingerprint || !areaCreateFacade) return;
    if (!currentVerification?.finalValid) {
      setMessage("Run Verify Area successfully on the current draft before validating Create.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    setAtomicValidation(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "validating",
      sceneId: scene.sceneId,
      occurredAtUnixMs: Date.now(),
      action: "create",
    });
    try {
      const profiles = await areaCreateFacade.queries.getProfiles(accessToken);
      if (!profiles.ok) {
        throw new Error(formatAreaCreateFailure(profiles.error));
      }
      const commandId = nextAreaCreateOpaqueId("command");
      const prepared = await prepareAreaCreateCommand({
        catalog: profiles.value,
        state: payload.state,
        areaName: moduleAreaName,
        areaTag: moduleAreaTag,
        draftId: `local-${payload.state.areaResRef}`,
        draftRevision: Math.max(1, Math.trunc(scene.updatedAtUnixMs)),
        clientCommandId: commandId,
        hashDraft: sha256Hex
      });
      if (!prepared.ok) {
        throw new Error(`${prepared.code}: ${prepared.message}`);
      }
      const validated = await areaCreateFacade.commands.validate({
        accessToken,
        moduleId: profiles.value.moduleId,
        command: prepared.command
      });
      if (!validated.ok) {
        throw new Error(formatAreaCreateFailure(validated.error));
      }
      if (validated.value.moduleRevision !== prepared.command.expectedModuleRevision) {
        throw new Error(
          "AREA_CREATE_MODULE_REVISION_CONFLICT: validation returned a different module revision."
        );
      }
      setAtomicValidation({
        sourceUpdatedAtUnixMs: scene.updatedAtUnixMs,
        areaName: moduleAreaName,
        areaTag: moduleAreaTag,
        profile: prepared.profile,
        command: prepared.command,
        idempotencyKey: nextAreaCreateOpaqueId("area-create"),
        receipt: validated.value
      });
      setStatus("ready");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: prepared.profile.materializationAllowed ? "ready" : "blocked",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "create",
        ...(prepared.profile.materializationAllowed
          ? {}
          : { code: prepared.profile.blockingProofs[0] ?? "CERTIFICATION_REQUIRED" }),
      });
      setMessage(
        `Atomic candidate validated at module revision ${validated.value.moduleRevision}.`
      );
    } catch (error) {
      setStatus("error");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: "failed",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "create",
        code: resolveAreaWorkspaceFailureCode(error, "AREA_CREATE_VALIDATION_FAILED"),
      });
      setMessage(error instanceof Error ? error.message : "Atomic Area Create validation failed.");
    }
  };

  const createAreaAtomically = async () => {
    if (!payload || !currentAtomicValidation || !areaCreateFacade) return;
    setStatus("loading");
    setMessage(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "materializing",
      sceneId: scene.sceneId,
      occurredAtUnixMs: Date.now(),
      action: "create",
    });
    try {
      const created = await areaCreateFacade.commands.create({
        accessToken,
        moduleId: currentAtomicValidation.command.moduleId,
        idempotencyKey: currentAtomicValidation.idempotencyKey,
        command: currentAtomicValidation.command
      });
      if (!created.ok) {
        if (created.error.code === "AREA_CREATE_MODULE_REVISION_CONFLICT") {
          setAtomicValidation(null);
        }
        throw new Error(formatAreaCreateFailure(created.error));
      }
      const are = created.value.receipt.resources.find(
        (resource) => resource.extension === "are"
      );
      if (!are) {
        throw new Error("AREA_CREATE_RESPONSE_INVALID: verified receipt has no ARE resource.");
      }
      const nextState: AuroraAreaEditingState = {
        ...payload.state,
        sourceAreaFingerprint: are.sha256
      };
      onSceneSelected(
        applyAuroraAreaEditingStateToScene(
          scene,
          nextState,
          payload.definition,
          payload.terrainBrush
        )
      );
      setVerification(null);
      setAtomicValidation(null);
      setStatus("ready");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: "verified",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "create",
      });
      setMessage(
        `Area ${created.value.receipt.resRef} committed at revision ${created.value.receipt.newModuleRevision} with verified readback.`
      );
    } catch (error) {
      setStatus("error");
      const code = resolveAreaWorkspaceFailureCode(error, "AREA_CREATE_FAILED");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: code.includes("CONFLICT") ? "conflict" : "recovery",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "create",
        code,
      });
      setMessage(error instanceof Error ? error.message : "Atomic Area Create failed.");
    }
  };

  const validateAtomicAreaUpdate = async () => {
    if (
      !payload?.state.sourceAreaFingerprint ||
      !areaCreateFacade ||
      !areaUpdateFacade ||
      !currentPersistedDraftIdentity
    ) {
      return;
    }
    if (!currentVerification?.finalValid) {
      setMessage("Run Verify Area successfully on the saved draft before validating Update.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    setAtomicUpdateValidation(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "validating",
      sceneId: scene.sceneId,
      occurredAtUnixMs: Date.now(),
      action: "update",
    });
    try {
      const profiles = await areaCreateFacade.queries.getProfiles(accessToken);
      if (!profiles.ok) throw new Error(formatAreaCreateFailure(profiles.error));
      const command: AreaUpdateValidationCommand = {
        schemaVersion: "area-update-validation.v1",
        moduleId: profiles.value.moduleId,
        areaResRef: payload.state.areaResRef,
        expectedModuleRevision: profiles.value.moduleRevision,
        draft: {
          id: currentPersistedDraftIdentity.id,
          revision: currentPersistedDraftIdentity.revision,
          normalizedSha256: currentPersistedDraftIdentity.normalizedSha256
        },
        clientCommandId: nextAreaCreateOpaqueId("command")
      };
      const validated = await areaUpdateFacade.commands.validate({
        accessToken,
        moduleId: command.moduleId,
        areaResRef: command.areaResRef,
        command
      });
      if (!validated.ok) throw new Error(formatAreaUpdateFailure(validated.error));
      if (
        validated.value.moduleRevision !== command.expectedModuleRevision ||
        validated.value.areaResRef !== command.areaResRef ||
        validated.value.draft.id !== command.draft.id ||
        validated.value.draft.revision !== command.draft.revision ||
        validated.value.draft.normalizedSha256 !== command.draft.normalizedSha256
      ) {
        throw new Error(
          "AREA_UPDATE_RESPONSE_INVALID: validation receipt identity differs from the requested draft."
        );
      }
      setAtomicUpdateValidation({
        sourceUpdatedAtUnixMs: scene.updatedAtUnixMs,
        command,
        idempotencyKey: nextAreaCreateOpaqueId("area-update"),
        receipt: validated.value
      });
      setStatus("ready");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: "ready",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "update",
      });
      setMessage(
        `Atomic Update candidate validated at module revision ${validated.value.moduleRevision}.`
      );
    } catch (error) {
      setStatus("error");
      const code = resolveAreaWorkspaceFailureCode(error, "AREA_UPDATE_VALIDATION_FAILED");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: code.includes("CONFLICT") ? "conflict" : "failed",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "update",
        code,
      });
      setMessage(
        error instanceof Error ? error.message : "Atomic Area Update validation failed."
      );
    }
  };

  const updateAreaAtomically = async () => {
    if (!payload || !currentAtomicUpdateValidation || !areaUpdateFacade) return;
    setStatus("loading");
    setMessage(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "materializing",
      sceneId: scene.sceneId,
      occurredAtUnixMs: Date.now(),
      action: "update",
    });
    try {
      const command = {
        ...currentAtomicUpdateValidation.command,
        schemaVersion: "area-update-command.v1" as const
      };
      const updated = await areaUpdateFacade.commands.update({
        accessToken,
        moduleId: command.moduleId,
        areaResRef: command.areaResRef,
        idempotencyKey: currentAtomicUpdateValidation.idempotencyKey,
        command
      });
      if (!updated.ok) {
        if (updated.error.status === 409 || updated.error.status === 412) {
          setAtomicUpdateValidation(null);
        }
        throw new Error(formatAreaUpdateFailure(updated.error));
      }
      const nextState: AuroraAreaEditingState = {
        ...payload.state,
        sourceAreaFingerprint: updated.value.candidateAreaSha256
      };
      const nextScene = applyAuroraAreaEditingStateToScene(
        scene,
        nextState,
        payload.definition,
        payload.terrainBrush
      );
      if (areaDraftSessionRegistry) {
        delete areaDraftSessionRegistry.current[scene.sceneId];
      }
      onSceneSelected(nextScene);
      onAreaMaterialized?.();
      setVerification(null);
      setAtomicUpdateValidation(null);
      setStatus("ready");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: "verified",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "update",
      });
      setMessage(
        `Area ${updated.value.areaResRef} updated at revision ${updated.value.newModuleRevision} with verified readback.`
      );
    } catch (error) {
      setStatus("error");
      const code = resolveAreaWorkspaceFailureCode(error, "AREA_UPDATE_FAILED");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: code.includes("CONFLICT") ? "conflict" : "recovery",
        sceneId: scene.sceneId,
        occurredAtUnixMs: Date.now(),
        action: "update",
        code,
      });
      setMessage(error instanceof Error ? error.message : "Atomic Area Update failed.");
    }
  };

  return (
    <section className="aurora-area-editing-panel" aria-label="Aurora Area editing">
      <h3>Area topology</h3>
      <button type="button" onClick={openAreaProperties}>Area Properties</button>
      {!payload ? (
        <>
          {!isBlankSeedScene ? (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={status === "loading" || !areaEditingFacade}
              title={
                areaEditingFacade
                  ? undefined
                  : "Area editing facade is unavailable."
              }
            >
              {status === "loading" ? "Loading SET..." : "Enable Aurora tile editing"}
            </button>
          ) : (
            <p>Select a tileset below to create a local Aurora Area.</p>
          )}
          {newAreaControls}
        </>
      ) : (
        <>
          <p>
            SET: <code>{payload.definition.tilesetResRef}</code> / {payload.state.width}x{payload.state.height}
          </p>
          <p aria-label="Active Area tile tool">
            Active canvas tool: <strong>{formatAreaEditingTool(activeTool)}</strong>
          </p>
          {tileProductionCertification ? (
            <p
              role="status"
              aria-label="Area tile production admission"
              data-area-tile-production-admission-status={
                tileProductionCertification.status
              }
              data-area-tile-production-admission-tileset={
                tileProductionCertification.tilesetResRef ?? "none"
              }
            >
              Production tile admission: {tileProductionCertification.status}
              {tileProductionCertification.status === "ready"
                ? ` (${tileProductionCertification.index.size} exact rows)`
                : null}
            </p>
          ) : null}
          {payload.definition.diagnostics?.some((diagnostic) => diagnostic.severity !== "info") ? (
            <section aria-label="SET diagnostics">
              <h4>SET diagnostics</h4>
              <ul>
                {payload.definition.diagnostics.filter((diagnostic) => diagnostic.severity !== "info").map((diagnostic, index) => (
                  <li key={`${diagnostic.code}:${diagnostic.section}:${index}`}>
                    {diagnostic.severity}: {diagnostic.section} / {diagnostic.code} — {diagnostic.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {tileCatalog ? (
            <section aria-label="Tile definition catalog">
              <h4>Tile definition catalog</h4>
              <button
                type="button"
                disabled={!areaEditingFacade || tileCatalogLoadState === "loading"}
                title={areaEditingFacade ? undefined : "Area editing facade is unavailable."}
                onClick={() => void loadTileCatalogTilesets()}
              >
                Browse catalog tilesets
              </button>
              {tileCatalogTilesets ? (
                <>
                  <label>
                    Catalog tileset
                    <select
                      aria-label="Catalog tileset"
                      value={tileCatalogTilesetResRef}
                      onChange={(event) => setTileCatalogTilesetResRef(event.target.value)}
                    >
                      {tileCatalogTilesets.map((tileset) => (
                        <option key={tileset.tilesetResRef} value={tileset.tilesetResRef}>
                          {tileset.displayName} ({tileset.tilesetResRef})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={
                      tileCatalogLoadState === "loading" || !tileCatalogTilesetResRef
                    }
                    onClick={() => void loadSelectedTileCatalog()}
                  >
                    Load selected tile catalog
                  </button>
                </>
              ) : null}
              {tileCatalogLoadState === "loading" ? (
                <p aria-live="polite">Loading tile catalog...</p>
              ) : null}
              {tileCatalogLoadMessage ? <p role="alert">{tileCatalogLoadMessage}</p> : null}
              <label>
                Search tile definitions
                <input
                  type="search"
                  aria-label="Search tile definitions"
                  value={tileCatalogQuery}
                  onChange={(event) => setTileCatalogQuery(event.target.value)}
                  placeholder="Tileset, Tile_ID, model, terrain, crosser, or group"
                />
              </label>
              <label>
                Tile category
                <select
                  aria-label="Tile category"
                  value={tileCatalogCategory}
                  onChange={(event) =>
                    setTileCatalogCategory(event.target.value as AreaTileCatalogCategoryFilter)
                  }
                >
                  <option value="all">All categories</option>
                  <option value="terrain">Terrain</option>
                  <option value="feature-crosser">Feature or crosser</option>
                  <option value="group">Multi-cell group</option>
                  <option value="individual">Individual tile</option>
                </select>
              </label>
              <label>
                Tile capability
                <select
                  aria-label="Tile capability"
                  value={tileCatalogCapability}
                  onChange={(event) =>
                    setTileCatalogCapability(event.target.value as AreaTileCatalogCapabilityFilter)
                  }
                >
                  <option value="all">All capabilities</option>
                  <option value="replaceable">Individually replaceable</option>
                  <option value="group-managed">Managed by SET group</option>
                  <option value="model-referenced">Has model reference</option>
                  <option value="model-reference-missing">Missing model reference</option>
                </select>
              </label>
              <label>
                Tile certification
                <select
                  aria-label="Tile certification"
                  value={tileCatalogCertification}
                  onChange={(event) =>
                    setTileCatalogCertification(
                      event.target.value as AreaTileCatalogCertificationFilter,
                    )
                  }
                >
                  <option value="all">All certification states</option>
                  <option value="verified">Verified</option>
                  <option value="failed">Failed</option>
                  <option value="missing">Missing</option>
                  <option value="excluded">Excluded</option>
                </select>
              </label>
              <p
                aria-label="Tile catalog diagnostics"
                aria-live="polite"
                data-tile-catalog-total={tileCatalog.diagnostics.total}
                data-tile-catalog-matched={tileCatalog.diagnostics.matched}
                data-tile-catalog-tileset={effectiveTileCatalogDefinition?.tilesetResRef}
                data-tile-catalog-certification-verified={tileCatalog.diagnostics.verified}
                data-tile-catalog-certification-failed={tileCatalog.diagnostics.failed}
                data-tile-catalog-certification-missing={tileCatalog.diagnostics.missing}
                data-tile-catalog-certification-excluded={tileCatalog.diagnostics.excluded}
              >
                {tileCatalog.diagnostics.matched} of {tileCatalog.diagnostics.total} tile definitions.
                {" "}Matched certification: {tileCatalog.diagnostics.verified} verified, {tileCatalog.diagnostics.failed} failed, {tileCatalog.diagnostics.missing} missing, {tileCatalog.diagnostics.excluded} excluded.
              </p>
              {tileCatalogQuery.trim() ||
              tileCatalogCategory !== "all" ||
              tileCatalogCapability !== "all" ||
              tileCatalogCertification !== "all" ? (
                tileCatalog.items.length > 0 ? (
                  <>
                    <ul aria-label="Tile catalog results">
                      {tileCatalog.items
                        .slice(0, AREA_TILE_CATALOG_VISIBLE_RESULT_LIMIT)
                        .map((item) => {
                          const groupManaged = item.capabilities.includes("group-managed");
                          const foreignTileset =
                            effectiveTileCatalogDefinition?.tilesetResRef.toLowerCase() !==
                            payload.definition.tilesetResRef.toLowerCase();
                          const productionAdmission = evaluateTileIdAdmission([
                            item.tile.tileId,
                          ]);
                          const productionBlocked =
                            productionAdmission?.allowed === false;
                          return (
                            <li key={item.tile.tileId}>
                              <button
                                type="button"
                                disabled={groupManaged || foreignTileset || productionBlocked}
                                title={
                                  foreignTileset
                                    ? "This definition belongs to another tileset and cannot replace a tile in the active Area."
                                    : groupManaged
                                    ? "This Tile_ID belongs to a multi-cell SET group and cannot be replaced individually."
                                    : productionBlocked && productionAdmission
                                    ? formatAreaTileProductionPlacementBlocker(
                                        productionAdmission,
                                      )
                                    : `Use Tile_ID ${item.tile.tileId} as the replacement candidate.`
                                }
                                onClick={() => setReplacementTileId(String(item.tile.tileId))}
                              >
                                Tile_ID {item.tile.tileId} — {item.tile.modelResRef ?? "no Model"} — {item.certification} certification
                              </button>
                              {item.groupNames.length > 0
                                ? ` (${item.groupNames.join(", ")})`
                                : null}
                            </li>
                          );
                        })}
                    </ul>
                    {tileCatalog.items.length > AREA_TILE_CATALOG_VISIBLE_RESULT_LIMIT ? (
                      <p role="note">
                        Showing the first {AREA_TILE_CATALOG_VISIBLE_RESULT_LIMIT} deterministic matches. Refine the filters to inspect the remaining definitions.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p>No tile definitions match the active catalog filters.</p>
                )
              ) : (
                <p>Use search or filters to inspect exact tile definitions and certification state.</p>
              )}
            </section>
          ) : null}
          <div role="group" aria-label="Area canvas tool">
            <button
              type="button"
              aria-pressed={activeTool.kind === "inspect"}
              onClick={() => onActiveToolChange?.({ kind: "inspect" })}
            >
              Inspect tiles
            </button>
          </div>
          <div role="group" aria-label="Terrain palette">
            {terrainOptions.map((terrain) => (
              <button
                key={terrain.id}
                type="button"
                aria-pressed={activeTool.kind === "terrain" && activeTool.terrain === terrain.id}
                onClick={() => selectTerrain(terrain.id)}
              >
                {terrain.name}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Features and crossers palette">
            {crosserOptions.map((crosser) => (
              <button
                key={crosser.id}
                type="button"
                aria-pressed={activeTool.kind === "crosser" && activeTool.crosser === crosser.id}
                onClick={() => selectCrosser(crosser.id)}
              >
                {crosser.name}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Raise and lower terrain">
            <button
              type="button"
              aria-pressed={activeTool.kind === "height" && activeTool.delta === 1}
              onClick={() => selectHeight(1)}
            >
              Raise terrain
            </button>
            <button
              type="button"
              aria-pressed={activeTool.kind === "height" && activeTool.delta === -1}
              onClick={() => selectHeight(-1)}
            >
              Lower terrain
            </button>
            <button
              type="button"
              aria-pressed={activeTool.kind === "eraser"}
              data-area-editing-proof-action="arm-eraser"
              title="Conservative Aurora mode-4 reconstruction: ambiguous SET candidate tie-breaks fail closed."
              onClick={() => onActiveToolChange?.({ kind: "eraser" })}
            >
              Eraser
            </button>
          </div>
          <div role="group" aria-label="Tileset groups">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                aria-pressed={activeTool.kind === "group" && activeTool.groupId === group.id}
                onClick={() => selectGroup(group.id)}
              >
                {group.name} ({group.rows}x{group.columns})
              </button>
            ))}
          </div>
          {activeTool.kind === "group" ? (
            <div role="group" aria-label="Group rotation">
              <button type="button" onClick={() => rotateGroup(-1)}>Rotate group brush left</button>
              <button type="button" onClick={() => rotateGroup(1)}>Rotate group brush right</button>
            </div>
          ) : null}
          <div role="group" aria-label="Tile properties">
            <p>
              Clipboard note: group Cut uses the recovered group contract. Loose-tile Cut is a
              conservative web fallback and succeeds only with one unambiguous default SET tile.
            </p>
            {selectedTile ? (
              <div role="status">
                <p>
                  Canvas selection: {selectedTileIds.length > 1 ? `${selectedTileIds.length} tiles; anchor ` : ""}Row {selectedTile.row}, Column {selectedTile.col}{" "}
                  (Tile_ID {selectedTile.tileId ?? selectedTile.tileIndex ?? 0}, Orientation {selectedTile.orientation}, Height {selectedTile.height ?? 0})
                </p>
                <p>
                  Lights: Main 1={formatTileProperty(selectedTile.mainLight1)}, Main 2={formatTileProperty(selectedTile.mainLight2)}, Source 1={formatTileProperty(selectedTile.sourceLight1)}, Source 2={formatTileProperty(selectedTile.sourceLight2)}
                </p>
                <p>
                  Animation loops: 1={formatTileProperty(selectedTile.animLoop1)}, 2={formatTileProperty(selectedTile.animLoop2)}, 3={formatTileProperty(selectedTile.animLoop3)}
                </p>
              </div>
            ) : (
              <p>Click a tile in terrain selection mode to make it the property target.</p>
            )}
            <label>
              Row
              <input type="number" min={0} max={payload.state.height - 1} value={tileRow} onChange={(event) => setTileRow(Number(event.target.value))} />
            </label>
            <label>
              Column
              <input type="number" min={0} max={payload.state.width - 1} value={tileCol} onChange={(event) => setTileCol(Number(event.target.value))} />
            </label>
            {selectedGroupInstance ? (
              <p>Individual tile transforms are unavailable while a SET group member is selected.</p>
            ) : null}
            <button type="button" onClick={() => mutateTile("rotateLeft")} disabled={Boolean(selectedGroupInstance)}>Rotate tile left</button>
            <button type="button" onClick={() => mutateTile("rotateRight")} disabled={Boolean(selectedGroupInstance)}>Rotate tile right</button>
            <button type="button" onClick={() => mutateTile("heightDown")} disabled={Boolean(selectedGroupInstance)}>Tile height -</button>
            <button type="button" onClick={() => mutateTile("heightUp")} disabled={Boolean(selectedGroupInstance)}>Tile height +</button>
            <button type="button" onClick={() => mutateTile("reroll")} disabled={Boolean(selectedGroupInstance)}>
              Reroll compatible tile variant
            </button>
            <label>
              Replace Tile_ID
              <select
                aria-label="Replace Tile_ID"
                value={replacementTileId}
                onChange={(event) => setReplacementTileId(event.target.value)}
                disabled={Boolean(selectedGroupInstance)}
              >
                {resolveAuroraAreaReplaceableTiles(payload.definition).map((tile) => {
                  const admission = evaluateTileIdAdmission([tile.tileId]);
                  return (
                    <option
                      key={tile.tileId}
                      value={tile.tileId}
                      disabled={admission?.allowed === false}
                    >
                      {tile.tileId}{tile.modelResRef ? ` — ${tile.modelResRef}` : " — no Model"}
                    </option>
                  );
                })}
              </select>
            </label>
            {isMatrixDiagnosticArea ? (
              <>
                <label>
                  Matrix fixture Tile_ID
                  <input
                    aria-label="Matrix fixture Tile_ID"
                    inputMode="numeric"
                    value={matrixFixtureTileId}
                    onChange={(event) => setMatrixFixtureTileId(event.target.value)}
                    disabled={Boolean(selectedGroupInstance)}
                  />
                </label>
                <p role="note">
                  Matrix diagnostic fixture: applies the explicit unrotated Tile_ID without normal
                  auto-retile. This is proof tooling, not claimed Aurora Toolset behaviour.
                </p>
                <label>
                  Matrix fixture batch JSON
                  <textarea
                    aria-label="Matrix fixture batch JSON"
                    value={matrixFixtureBatch}
                    onChange={(event) => setMatrixFixtureBatch(event.target.value)}
                    disabled={Boolean(selectedGroupInstance)}
                    placeholder='[{"row":0,"col":0,"tileId":1}]'
                  />
                </label>
                <button
                  type="button"
                  onClick={applyMatrixFixtureBatch}
                  disabled={Boolean(selectedGroupInstance)}
                >
                  Apply matrix fixture batch
                </button>
                <label>
                  Matrix group fixture batch JSON
                  <textarea
                    aria-label="Matrix group fixture batch JSON"
                    value={matrixGroupFixtureBatch}
                    onChange={(event) => setMatrixGroupFixtureBatch(event.target.value)}
                    disabled={Boolean(selectedGroupInstance)}
                    placeholder='[{"groupId":"group0","row":0,"col":0,"orientation":0}]'
                  />
                </label>
                <button
                  type="button"
                  onClick={applyMatrixGroupFixtureBatch}
                  disabled={Boolean(selectedGroupInstance)}
                >
                  Apply matrix group fixture batch
                </button>
              </>
            ) : null}
            <button type="button" onClick={replaceSelectedTileId} disabled={Boolean(selectedGroupInstance)}>
              {isMatrixDiagnosticArea ? "Apply exact Tile_ID fixture" : "Apply Tile_ID"}
            </button>
            <button type="button" onClick={openTileProperties} disabled={!selectedTile}>
              Tile Properties
            </button>
          </div>
          {selectedGroupInstance ? (
            <section
              aria-label="Selected SET group"
              data-area-editing-proof-group-origin={
                selectedGroupInstance.underlay ? "editor-placed" : "source"
              }
            >
              <h4>Selected SET group</h4>
              <p>
                Rotate, height and remove for an already placed group are explicit web extensions;
                Aurora parity is claimed only for group selection, preview and placement.
              </p>
              <p>
                Template: <strong>{selectedGroupTemplate?.name ?? selectedGroupInstance.groupId}</strong>{" "}
                (<code>{selectedGroupInstance.groupId}</code>)
              </p>
              <p>
                Orientation: {selectedGroupInstance.orientation}; members: {selectedGroupInstance.tileIds.length}
              </p>
              <div role="group" aria-label="Selected group operations">
                <button
                  type="button"
                  data-area-editing-proof-action="rotate-selected-group-left"
                  onClick={() => mutateSelectedGroup("rotateLeft")}
                >
                  Rotate selected group left
                </button>
                <button
                  type="button"
                  data-area-editing-proof-action="rotate-selected-group-right"
                  onClick={() => mutateSelectedGroup("rotateRight")}
                >
                  Rotate selected group right
                </button>
                <button
                  type="button"
                  data-area-editing-proof-action="selected-group-height-down"
                  onClick={() => mutateSelectedGroup("heightDown")}
                >
                  Selected group height -
                </button>
                <button
                  type="button"
                  data-area-editing-proof-action="selected-group-height-up"
                  onClick={() => mutateSelectedGroup("heightUp")}
                >
                  Selected group height +
                </button>
                <button
                  type="button"
                  data-area-editing-proof-action="remove-selected-group"
                  onClick={() => mutateSelectedGroup("remove")}
                >
                  Remove selected group
                </button>
              </div>
            </section>
          ) : null}
          <div role="group" aria-label="Area resize">
            <button type="button" onClick={() => resize("top", 1)}>+ Top</button>
            <button type="button" onClick={() => resize("right", 1)}>+ Right</button>
            <button type="button" onClick={() => resize("bottom", 1)}>+ Bottom</button>
            <button type="button" onClick={() => resize("left", 1)}>+ Left</button>
            <button type="button" onClick={() => resize("top", -1)}>- Top</button>
            <button type="button" onClick={() => resize("right", -1)}>- Right</button>
            <button type="button" onClick={() => resize("bottom", -1)}>- Bottom</button>
            <button type="button" onClick={() => resize("left", -1)}>- Left</button>
          </div>
          <div role="group" aria-label="Area rotation">
            <span>Aurora Area matrix rotation.</span>
            <button
              type="button"
              data-area-editing-proof-action="rotate-area-left"
              onMouseUp={(event) => {
                if (event.button === 0) rotate(3);
              }}
              onClick={(event) => {
                if (event.detail === 0) rotate(3);
              }}
            >
              Rotate entire Area left
            </button>
            <button
              type="button"
              data-area-editing-proof-action="rotate-area-right"
              onMouseUp={(event) => {
                if (event.button === 0) rotate(1);
              }}
              onClick={(event) => {
                if (event.detail === 0) rotate(1);
              }}
            >
              Rotate entire Area right
            </button>
          </div>
          <div role="group" aria-label="Area verification and persistence">
            <button
              type="button"
              onClick={() => void verifyArea()}
              disabled={
                status === "loading" ||
                !currentTileProcessReadiness ||
                !areaEditingFacade
              }
              title={
                !areaEditingFacade
                  ? "Area editing facade is unavailable."
                  : !currentTileProcessReadiness
                    ? "Waiting for settled tile asset readiness for this Area."
                    : undefined
              }
            >
              Verify Area
            </button>
            {!payload.state.sourceAreaFingerprint ? (
              <>
                <label>
                  Area module name
                  <input
                    value={moduleAreaName}
                    maxLength={256}
                    onChange={(event) => {
                      setModuleAreaName(event.target.value);
                      setAtomicValidation(null);
                    }}
                  />
                </label>
                <label>
                  Area module tag
                  <input
                    value={moduleAreaTag}
                    maxLength={256}
                    onChange={(event) => {
                      setModuleAreaTag(event.target.value);
                      setAtomicValidation(null);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void validateAtomicAreaCreate()}
                  disabled={
                    status === "loading" ||
                    currentVerification?.finalValid !== true ||
                    !areaCreateFacade
                  }
                  title={
                    areaCreateFacade
                      ? undefined
                      : "Atomic Area Create facade is unavailable."
                  }
                >
                  Validate atomic Area Create
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void validateAtomicAreaUpdate()}
                  disabled={
                    status === "loading" ||
                    currentVerification?.finalValid !== true ||
                    !currentPersistedDraftIdentity ||
                    !areaCreateFacade ||
                    !areaUpdateFacade ||
                    !canMaterializeAreas
                  }
                  title={
                    !canMaterializeAreas
                      ? "Area Update requires the administrator materialization permission."
                      : !currentPersistedDraftIdentity
                        ? "Save this exact scene as a local draft before validating Update."
                        : !areaUpdateFacade || !areaCreateFacade
                          ? "Atomic Area Update facade is unavailable."
                          : undefined
                  }
                >
                  Validate atomic Area Update
                </button>
                {!currentPersistedDraftIdentity ? (
                  <p role="status" data-area-update-draft="not-current">
                    Save the current scene as a local draft before validating Area Update.
                  </p>
                ) : null}
              </>
            )}
          </div>
          {currentAtomicValidation ? (
            <section
              aria-label="Atomic Area Create validation"
              data-area-create-validation-id={currentAtomicValidation.receipt.validationId}
              data-area-create-module-revision={currentAtomicValidation.receipt.moduleRevision}
              data-area-create-profile-status={currentAtomicValidation.profile.persistenceStatus}
            >
              <h4>Atomic Create candidate valid</h4>
              <p>
                Profile <code>{currentAtomicValidation.profile.id}</code>; module revision{" "}
                <code>{currentAtomicValidation.receipt.moduleRevision}</code>.
              </p>
              <p>
                Certification: {currentAtomicValidation.profile.persistenceStatus}; receipt expires{" "}
                {currentAtomicValidation.receipt.expiresAt}.
              </p>
              <button
                type="button"
                onClick={() => void createAreaAtomically()}
                disabled={
                  status === "loading" ||
                  !currentAtomicValidation.profile.materializationAllowed
                }
                title={
                  currentAtomicValidation.profile.materializationAllowed
                    ? undefined
                    : `Module materialization is blocked until these proofs are certified: ${currentAtomicValidation.profile.blockingProofs.join(", ")}.`
                }
              >
                Create Area atomically
              </button>
              {!currentAtomicValidation.profile.materializationAllowed ? (
                <p role="status" data-area-create-materialization="blocked">
                  Module materialization remains blocked. Missing certification: {currentAtomicValidation.profile.blockingProofs.join(", ")}.
                </p>
              ) : null}
            </section>
          ) : null}
          {currentAtomicUpdateValidation ? (
            <section
              aria-label="Atomic Area Update validation"
              data-area-update-validation-id={
                currentAtomicUpdateValidation.receipt.validationId
              }
              data-area-update-module-revision={
                currentAtomicUpdateValidation.receipt.moduleRevision
              }
            >
              <h4>Atomic Update candidate valid</h4>
              <p>
                Draft revision {currentAtomicUpdateValidation.command.draft.revision}; module
                revision <code>{currentAtomicUpdateValidation.receipt.moduleRevision}</code>.
              </p>
              <p>
                Validation receipt expires {currentAtomicUpdateValidation.receipt.expiresAt}.
              </p>
              <button
                type="button"
                onClick={() => void updateAreaAtomically()}
                disabled={status === "loading" || !canMaterializeAreas}
              >
                Update Area atomically
              </button>
            </section>
          ) : null}
          {connectivityDiagnostics ? (
            <section
              aria-label="Area tile connectivity diagnostics"
              data-area-path-connect-status={connectivityDiagnostics.pathConnect.status}
              data-area-wok-geometric-contact-seams={
                connectivityDiagnostics.summary.wokGeometricContactSeams
              }
              data-area-wok-discontinuous-seams={
                connectivityDiagnostics.summary.wokDiscontinuousSeams
              }
              data-area-wok-unresolved-seams={
                connectivityDiagnostics.summary.unresolvedSeams
              }
              data-area-wok-geometric-components={
                connectivityDiagnostics.summary.geometricContactComponents
              }
            >
              <h4>Tile connectivity evidence</h4>
              <p>
                Native PathConnect {connectivityDiagnostics.pathConnect.status}. PathNode
                metadata is retained as a separate evidence input.
              </p>
              <p>
                WOK geometric contacts {connectivityDiagnostics.summary.wokGeometricContactSeams}/
                {connectivityDiagnostics.summary.expectedInternalSeams}; discontinuous{" "}
                {connectivityDiagnostics.summary.wokDiscontinuousSeams}; unresolved{" "}
                {connectivityDiagnostics.summary.unresolvedSeams}.
              </p>
              <p>
                This is not a traversability claim. Native connection and NWN runtime
                crossing remain independent proof gates.
              </p>
            </section>
          ) : null}
          {!currentTileProcessReadiness ? (
            <p aria-live="polite" data-area-verification-waiting="tile-assets">
              Waiting for settled tile asset readiness before Area verification.
            </p>
          ) : null}
          {currentVerification ? (
            <section
              aria-label="Area verification report"
              data-area-verification-status={currentVerification.finalValid ? "valid" : "invalid"}
              data-area-verification-stats={JSON.stringify({
                ...currentVerification.result.stats,
                assetReadiness: currentVerification.assetReadiness
              })}
              data-area-verification-asset-readiness={JSON.stringify(currentVerification.assetReadiness)}
              data-area-verification-issues={JSON.stringify(currentVerification.issues)}
              data-area-verification-source-updated-at={currentVerification.sourceUpdatedAtUnixMs}
            >
              <h4>{currentVerification.finalValid ? "Area valid" : "Area invalid"}</h4>
              <p>
                Tiles {currentVerification.result.stats.tileCount}/{currentVerification.result.stats.expectedTileCount}; models {currentVerification.result.stats.modelResolvedTileCount}/{currentVerification.result.stats.tileCount}; height {currentVerification.result.stats.minHeight}..{currentVerification.result.stats.maxHeight}.
              </p>
              <p>
                Tile assets {currentVerification.assetReadiness.readyCandidateCount}/{currentVerification.assetReadiness.checkedCandidateCount} ready; {currentVerification.assetReadiness.blockedCandidateCount} blocked; status {currentVerification.assetReadiness.status}.
              </p>
              {currentVerification.issues.length > 0 ? (
                <ul>
                  {currentVerification.issues.map((issue, index) => (
                    <li key={`${issue.code}:${issue.row ?? ""}:${issue.col ?? ""}:${index}`}>
                      {issue.severity}: {issue.code} — {issue.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
          <button
            type="button"
            onClick={() => void exportAre()}
            disabled={status === "loading" || !areaEditingFacade}
            title={
              areaEditingFacade
                ? undefined
                : "Area editing facade is unavailable."
            }
          >
            Export edited ARE
          </button>
          {tilePropertiesTarget &&
          tilePropertiesTarget.sceneId === scene.sceneId &&
          tilePropertiesTarget.tileIds.every((tileId) =>
            payload.state.tiles.some((tile) => tile.id === tileId)
          ) ? (
            <AuroraAreaTilePropertiesDialog
              key={`${tilePropertiesTarget.sceneId}:${tilePropertiesTarget.sourceUpdatedAtUnixMs}:${tilePropertiesTarget.tileIds.join(",")}`}
              state={payload.state}
              definition={payload.definition}
              tileIds={tilePropertiesTarget.tileIds}
              onApply={applyTileProperties}
              onCancel={cancelTileProperties}
            />
          ) : null}
        </>
      )}
      {areaPropertiesTarget
      && areaPropertiesTarget.sceneId === scene.sceneId
      && areaPropertiesTarget.sourceUpdatedAtUnixMs === scene.updatedAtUnixMs ? (
        <AreaPropertiesDialog
          key={`${areaPropertiesTarget.sceneId}:${areaPropertiesTarget.sourceUpdatedAtUnixMs}`}
          draft={areaPropertiesFacade.buildDraft(scene)}
          eventScriptCatalogFacade={areaEventScriptCatalogFacade}
          eventScriptPublicationFacade={areaEventScriptPublicationFacade}
          eventScriptCatalogAccessToken={accessToken}
          onCommit={commitAreaProperties}
          onCancel={cancelAreaProperties}
        />
      ) : null}
      {message ? <p role="alert">{message}</p> : null}
    </section>
  );
}

function formatTileProperty(value: number | undefined): string {
  return value === undefined ? "unset" : String(value);
}

function formatAreaEditingTool(tool: AuroraAreaEditingTool): string {
  if (tool.kind === "inspect") return "Inspect/select";
  if (tool.kind === "terrain") return `Terrain: ${tool.terrain}`;
  if (tool.kind === "crosser") return `Feature/crosser: ${tool.crosser}`;
  if (tool.kind === "height") return tool.delta > 0 ? "Raise terrain" : "Lower terrain";
  if (tool.kind === "eraser") return "Eraser";
  return `SET group: ${tool.groupId}, orientation ${tool.orientation}`;
}

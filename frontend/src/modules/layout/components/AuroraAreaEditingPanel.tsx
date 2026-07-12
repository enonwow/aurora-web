import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_AURORA_AREA_EDITING_TOOL,
  type AreaScene,
  type AuroraAreaEditingTool
} from "../contracts";
import { createHttpAreaEditingApi } from "../../areas/adapters/httpAreaEditingApi";
import {
  downloadAreaEditingAre,
  exportAuroraAreaEditingAre,
  persistNewAuroraArea,
  verifyAuroraAreaEditing,
  type AreaEditingVerificationResult
} from "../../areas/adapters/httpAreaEditingExport";
import {
  changeAuroraAreaTileHeight,
  changeAuroraAreaGroupHeightAtCell,
  createAuroraAreaEditingState,
  hydrateAuroraAreaEditingState,
  removeAuroraAreaGroupAtCell,
  resolveAuroraAreaGroupInstanceAtCell,
  resizeAuroraArea,
  rotateAuroraArea,
  rotateAuroraAreaGroupAtCell,
  rotateAuroraAreaTile,
  rerollAuroraAreaTileVariant,
  type AuroraAreaEditingState,
  type AuroraAreaEditableTile,
  type AuroraAreaTilesetDefinition
} from "../../scene/domain/auroraAreaEditing";
import { createAuroraAreaPlacementSelector } from "../application/useWorkspacePointerSelection";
import { applyAuroraAreaEditingStateToScene } from "../../scene/domain/auroraAreaEditingSceneMapper";
import {
  removeSourceAuroraAreaGroupConservatively,
  rotateSourceAuroraAreaGroupConservatively
} from "../../scene/domain/auroraAreaSourceGroupEditing";
import { createBlankAreaScene } from "../../scene/domain/sceneFactory";
import { AuroraAreaTilePropertiesDialog } from "./AuroraAreaTilePropertiesDialog";
import type { AreaTileProcessContractReadiness } from "../../tiles/application/areaTileProcessContractReadiness";

interface AuroraAreaEditingPanelProps {
  accessToken: string | null;
  scene: AreaScene | null | undefined;
  selectedTileId?: string | null;
  selectedTileIds?: readonly string[];
  tileProcessReadiness?: AreaTileProcessContractReadiness | null;
  activeTool?: AuroraAreaEditingTool;
  onActiveToolChange?: (tool: AuroraAreaEditingTool) => void;
  onSceneSelected: (scene: AreaScene) => void;
  onSceneMutation?: (scene: AreaScene, selectedTileId?: string | null, selectedTileIds?: string[]) => void;
}

const AREA_EDITING_LOCAL_PROOF_EVENT = "aurora:areas:create-local-editing-proof";

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

interface AreaVerificationSnapshot {
  sourceUpdatedAtUnixMs: number;
  result: AreaEditingVerificationResult;
  finalValid: boolean;
  issues: AreaEditingVerificationResult["issues"];
  assetReadiness: AreaVerificationAssetReadiness;
}

type AreaVerificationAssetReadiness = Pick<
  AreaTileProcessContractReadiness,
  | "areaId"
  | "status"
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
  const issues: AreaEditingVerificationResult["issues"] = [{
    severity: "error",
    code: "TILE_ASSET_PROCESS_NOT_READY",
    message: `Tile asset process is ${readiness.status}: ${readiness.readyCandidateCount}/${readiness.checkedCandidateCount} ready, ${readiness.blockedCandidateCount} blocked. ${readiness.blockerSummary}`
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
    readiness.readyCandidateCount === readiness.checkedCandidateCount;
}

export function AuroraAreaEditingPanel({
  accessToken,
  scene,
  selectedTileId = null,
  selectedTileIds = [],
  tileProcessReadiness = null,
  activeTool = DEFAULT_AURORA_AREA_EDITING_TOOL,
  onActiveToolChange,
  onSceneSelected,
  onSceneMutation
}: AuroraAreaEditingPanelProps) {
  const api = useMemo(() => createHttpAreaEditingApi(), []);
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
  const [availableTilesets, setAvailableTilesets] = useState<string[] | null>(null);
  const [newAreaResRef, setNewAreaResRef] = useState("new_area");
  const [newTilesetResRef, setNewTilesetResRef] = useState("");
  const [newWidth, setNewWidth] = useState(4);
  const [newHeight, setNewHeight] = useState(4);
  const [tilePropertiesTarget, setTilePropertiesTarget] =
    useState<TilePropertiesTarget | null>(null);
  const [verification, setVerification] = useState<AreaVerificationSnapshot | null>(null);
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
  const selectedTile =
    scene && selectedTileId
      ? scene.tiles.find((tile) => tile.id === selectedTileId) ?? null
      : null;

  useEffect(() => {
    if (!selectedTile) {
      return;
    }
    setTileRow(selectedTile.row);
    setTileCol(selectedTile.col);
  }, [selectedTile]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    const handleLocalProof = (event: Event) => {
      const detail = (event as CustomEvent<AreaEditingLocalProofEventDetail>).detail;
      if (!detail?.definition || !detail.areaResRef) {
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
    setStatus("loading");
    setMessage(null);
    try {
      const tilesets = await api.listAreaTilesets(accessToken);
      setAvailableTilesets(tilesets.map((entry) => entry.tilesetResRef));
      setNewTilesetResRef((current) => current || tilesets[0]?.tilesetResRef || "");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not load tilesets.");
    }
  };

  const createBlankArea = async () => {
    const areaResRef = newAreaResRef.trim().toLowerCase();
    if (!/^[a-z0-9_]{1,16}$/u.test(areaResRef) || !newTilesetResRef) {
      setMessage("Enter a 1..16 character Area resref and select a tileset.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const definition = await api.getAreaTilesetDefinition(accessToken, newTilesetResRef);
      const result = createAuroraAreaEditingState({
        areaResRef,
        width: newWidth,
        height: newHeight,
        definition
      });
      if (!result.ok) {
        throw new Error(result.message);
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
      <button type="button" onClick={() => void loadTilesetsForCreate()} disabled={status === "loading"}>
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
              {availableTilesets.map((tilesetResRef) => <option key={tilesetResRef} value={tilesetResRef}>{tilesetResRef}</option>)}
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
          <button type="button" onClick={() => void createBlankArea()} disabled={status === "loading" || !newTilesetResRef}>
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

  const payload = scene.auroraAreaEditing;
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

  const enable = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const source = await api.getAreaEditingDefinitionForArea(accessToken, scene.sceneId);
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
    setTilePropertiesTarget(null);
    setMessage(null);
    notifySceneMutation(
      nextScene,
      tilePropertiesTarget.selectedTileId,
      tilePropertiesTarget.tileIds
    );
  };

  const exportAre = async () => {
    if (!payload) return;
    setStatus("loading");
    setMessage(null);
    try {
      downloadAreaEditingAre(await exportAuroraAreaEditingAre({
        accessToken,
        name: scene.areaName,
        state: payload.state
      }));
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Area export failed.");
    }
  };

  const verifyArea = async () => {
    if (!payload || !currentTileProcessReadiness) return;
    setStatus("loading");
    setMessage(null);
    try {
      const result = await verifyAuroraAreaEditing({
        accessToken,
        name: scene.areaName,
        state: payload.state
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
      setMessage(finalValid
        ? `Area verification passed with ${issues.filter((issue) => issue.severity === "warning").length} warning(s).`
        : `Area verification found ${issues.filter((issue) => issue.severity === "error").length} error(s).`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Area verification failed.");
    }
  };

  const persistNewArea = async () => {
    if (!payload || payload.state.sourceAreaFingerprint) return;
    if (!currentVerification?.finalValid) {
      setMessage("Run Verify Area successfully on the current draft before persisting it.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const persisted = await persistNewAuroraArea({
        accessToken,
        name: scene.areaName,
        state: payload.state
      });
      const nextState: AuroraAreaEditingState = {
        ...payload.state,
        sourceAreaFingerprint: persisted.areaFingerprint
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
      setStatus("ready");
      setMessage(`Created ${persisted.resources.length} module resources for ${persisted.areaResRef}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "New Area persistence failed.");
    }
  };

  return (
    <section className="aurora-area-editing-panel" aria-label="Aurora Area editing">
      <h3>Area topology</h3>
      {!payload ? (
        <>
          <button type="button" onClick={() => void enable()} disabled={status === "loading"}>
            {status === "loading" ? "Loading SET..." : "Enable Aurora tile editing"}
          </button>
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
          {payload.definition.diagnostics?.length ? (
            <section aria-label="SET diagnostics">
              <h4>SET diagnostics</h4>
              <ul>
                {payload.definition.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}:${diagnostic.section}:${index}`}>
                    {diagnostic.severity}: {diagnostic.section} / {diagnostic.code} — {diagnostic.message}
                  </li>
                ))}
              </ul>
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
              disabled={status === "loading" || !currentTileProcessReadiness}
              title={!currentTileProcessReadiness ? "Waiting for settled tile asset readiness for this Area." : undefined}
            >
              Verify Area
            </button>
            {!payload.state.sourceAreaFingerprint ? (
              <button
                type="button"
                onClick={() => void persistNewArea()}
                disabled={
                  status === "loading" ||
                  currentVerification?.finalValid !== true
                }
              >
                Persist new Area to module
              </button>
            ) : null}
          </div>
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
          <button type="button" onClick={() => void exportAre()} disabled={status === "loading"}>Export edited ARE</button>
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

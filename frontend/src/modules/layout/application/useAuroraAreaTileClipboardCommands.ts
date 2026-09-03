import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  collectChangedAuroraAreaTileDefinitionIds,
  evaluateAreaTileProductionPlacementAdmission,
  formatAreaTileProductionPlacementBlocker,
  type AreaTileProductionCertificationSource,
} from "../../areas/application/areaTileProductionPlacementAdmission";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import {
  copyAuroraAreaTilesToClipboard,
  cutAuroraAreaTilesToClipboard,
  pasteAuroraAreaTilesFromClipboard,
  removeAuroraAreaGroupAtCell,
  resolveAuroraAreaGroupInstanceAtCell,
  type AuroraAreaTileClipboardPayload
} from "../../scene/domain/auroraAreaEditing";
import { applyAuroraAreaEditingStateToScene } from "../../scene/domain/auroraAreaEditingSceneMapper";
import { cutAuroraAreaTilesWithSourceGroups } from "../../scene/domain/auroraAreaSourceGroupEditing";
import type { AreaScene, SceneHistoryState } from "../contracts";

interface UseAuroraAreaTileClipboardCommandsArgs {
  scene: AreaScene;
  selectedTileId: string | null;
  selectedTileIds?: readonly string[];
  sceneViewportPort: Pick<SceneViewportPort, "commitHistory">;
  tileProductionCertification: AreaTileProductionCertificationSource;
  setSceneHistory: Dispatch<SetStateAction<SceneHistoryState>>;
  setSelectedObjectIds: Dispatch<SetStateAction<string[]>>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  setSelectedTileIds?: Dispatch<SetStateAction<string[]>>;
  userId: string;
  trackTelemetry: (name: string, payload?: TelemetryPayload) => void;
}

export interface AuroraAreaTileClipboardFeedback {
  variant: "success" | "error";
  message: string;
}

export function useAuroraAreaTileClipboardCommands({
  scene,
  selectedTileId,
  selectedTileIds = [],
  sceneViewportPort,
  tileProductionCertification,
  setSceneHistory,
  setSelectedObjectIds,
  setSelectedTileId,
  setSelectedTileIds,
  userId,
  trackTelemetry
}: UseAuroraAreaTileClipboardCommandsArgs) {
  const clipboardRef = useRef<AuroraAreaTileClipboardPayload | null>(null);
  const [hasClipboardTiles, setHasClipboardTiles] = useState(false);
  const [clipboardFeedback, setClipboardFeedback] =
    useState<AuroraAreaTileClipboardFeedback | null>(null);
  const clearClipboardFeedback = useCallback(() => setClipboardFeedback(null), []);

  const admitTopologyCandidate = useCallback((
    beforeScene: AreaScene,
    afterScene: AreaScene,
    operationKind: "cut" | "delete" | "paste",
    source: string,
  ): boolean => {
    const before = beforeScene.auroraAreaEditing;
    const after = afterScene.auroraAreaEditing;
    if (!before || !after) return true;
    const candidateTileIds = collectChangedAuroraAreaTileDefinitionIds(
      before.state,
      after.state,
    );
    if (candidateTileIds.length === 0) return true;
    const admission = evaluateAreaTileProductionPlacementAdmission({
      tilesetResRef: after.definition.tilesetResRef,
      candidateTileIds,
      certification: tileProductionCertification,
    });
    if (admission.allowed) return true;
    const firstDiagnostic = admission.diagnostics[0];
    setClipboardFeedback({
      variant: "error",
      message: formatAreaTileProductionPlacementBlocker(admission),
    });
    trackTelemetry("scene.area_tiles.production_admission.blocked", {
      userId,
      code: admission.code,
      operationKind,
      source,
      tilesetResRef: admission.tilesetResRef,
      changedTileIdCount: admission.tileIds.length,
      firstBlockedTileId: firstDiagnostic?.tileId,
      firstBlockedStage: firstDiagnostic?.stage,
    });
    return false;
  }, [tileProductionCertification, trackTelemetry, userId]);

  const resolveSelection = useCallback(() => {
    const payload = scene.auroraAreaEditing;
    const requestedIds = selectedTileIds.length > 0
      ? selectedTileIds
      : selectedTileId
        ? [selectedTileId]
        : [];
    const tiles = requestedIds
      .map((id) => scene.tiles.find((candidate) => candidate.id === id))
      .filter((tile): tile is AreaScene["tiles"][number] => Boolean(tile));
    const anchor = selectedTileId
      ? tiles.find((tile) => tile.id === selectedTileId) ?? tiles.at(-1)
      : tiles.at(-1);
    return payload && anchor && tiles.length > 0 ? { payload, tile: anchor, tiles } : null;
  }, [scene, selectedTileId, selectedTileIds]);

  const copySelectedTilesToClipboard = useCallback(
    (source: string): boolean => {
      const selection = resolveSelection();
      if (!selection) return false;
      const copied = copyAuroraAreaTilesToClipboard(
        selection.payload.state,
        selection.tiles.map((tile) => ({ row: tile.row, col: tile.col }))
      );
      if (copied.ok === false) {
        setClipboardFeedback({ variant: "error", message: copied.message });
        trackTelemetry("scene.area_tiles.clipboard_copy_failed", {
          userId,
          source,
          reason: copied.code
        });
        return true;
      }
      clipboardRef.current = copied.payload;
      setHasClipboardTiles(true);
      setClipboardFeedback({
        variant: "success",
        message: `Copied ${copied.payload.tiles.length} tile(s)${
          copied.payload.groups.length > 0 ? ` from ${copied.payload.groups.length} SET group(s)` : ""
        }.`
      });
      trackTelemetry("scene.area_tiles.clipboard_copied", {
        userId,
        source,
        copiedCount: copied.payload.tiles.length,
        groupCount: copied.payload.groups.length
      });
      return true;
    },
    [resolveSelection, trackTelemetry, userId]
  );

  const cutOrDeleteSelectedTiles = useCallback(
    (source: string, keepClipboard: boolean): boolean => {
      const selection = resolveSelection();
      if (!selection) return false;
      const cells = selection.tiles.map((tile) => ({ row: tile.row, col: tile.col }));
      const selectedGroup = resolveAuroraAreaGroupInstanceAtCell(
        selection.payload.state,
        { row: selection.tile.row, col: selection.tile.col }
      );
      const selectsOnlyOneEditorGroup =
        !keepClipboard &&
        Boolean(selectedGroup?.underlay) &&
        selection.tiles.every((tile) =>
          resolveAuroraAreaGroupInstanceAtCell(
            selection.payload.state,
            { row: tile.row, col: tile.col }
          ) === selectedGroup
        );
      if (selectsOnlyOneEditorGroup) {
        const removed = removeAuroraAreaGroupAtCell(
          selection.payload.state,
          selection.payload.definition,
          { row: selection.tile.row, col: selection.tile.col }
        );
        if (removed.ok === false) {
          setClipboardFeedback({ variant: "error", message: removed.message });
          trackTelemetry("scene.area_tiles.delete_failed", {
            userId,
            source,
            reason: removed.code
          });
          return true;
        }
        const nextScene = applyAuroraAreaEditingStateToScene(
          scene,
          removed.state,
          selection.payload.definition,
          selection.payload.terrainBrush
        );
        if (!admitTopologyCandidate(scene, nextScene, "delete", source)) {
          return true;
        }
        setSceneHistory((current) =>
          sceneViewportPort.commitHistory(current, nextScene)
        );
        setSelectedObjectIds([]);
        setSelectedTileId(null);
        setSelectedTileIds?.([]);
        setClipboardFeedback({
          variant: "success",
          message: `Removed the SET group; ${removed.changedTileIds.length} Area cell(s) restored.`
        });
        trackTelemetry("scene.area_tiles.delete", {
          userId,
          source,
          changedCount: removed.changedTileIds.length,
          copiedCount: 0
        });
        return true;
      }
      let cut = cutAuroraAreaTilesToClipboard(
        selection.payload.state,
        selection.payload.definition,
        cells
      );
      if (cut.ok === false && cut.code === "GROUP_LOCKED") {
        cut = cutAuroraAreaTilesWithSourceGroups(
          selection.payload.state,
          selection.payload.definition,
          cells
        );
      }
      if (cut.ok === false) {
        setClipboardFeedback({ variant: "error", message: cut.message });
        trackTelemetry("scene.area_tiles.cut_failed", { userId, source, reason: cut.code });
        return true;
      }
      const nextScene = applyAuroraAreaEditingStateToScene(
        scene,
        cut.state,
        selection.payload.definition,
        selection.payload.terrainBrush
      );
      if (!admitTopologyCandidate(
        scene,
        nextScene,
        keepClipboard ? "cut" : "delete",
        source,
      )) {
        return true;
      }
      if (keepClipboard) {
        clipboardRef.current = cut.payload;
        setHasClipboardTiles(true);
      }
      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(current, nextScene)
      );
      setSelectedObjectIds([]);
      setSelectedTileId(null);
      setClipboardFeedback({
        variant: "success",
        message: keepClipboard
          ? `Cut ${cut.payload.tiles.length} tile(s) to the Area clipboard; ${cut.changedTileIds.length} Area cell(s) changed.`
          : `Removed the selection; ${cut.changedTileIds.length} Area cell(s) changed.`
      });
      trackTelemetry(keepClipboard ? "scene.area_tiles.cut" : "scene.area_tiles.delete", {
        userId,
        source,
        changedCount: cut.changedTileIds.length,
        copiedCount: keepClipboard ? cut.payload.tiles.length : 0
      });
      return true;
    },
    [
      resolveSelection,
      admitTopologyCandidate,
      scene,
      sceneViewportPort,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      setSelectedTileIds,
      trackTelemetry,
      userId
    ]
  );

  const cutSelectedTilesToClipboard = useCallback(
    (source: string) => cutOrDeleteSelectedTiles(source, true),
    [cutOrDeleteSelectedTiles]
  );
  const deleteSelectedTiles = useCallback(
    (source: string) => cutOrDeleteSelectedTiles(source, false),
    [cutOrDeleteSelectedTiles]
  );

  const pasteClipboardTiles = useCallback(
    (source: string): boolean => {
      const selection = resolveSelection();
      const clipboard = clipboardRef.current;
      if (!selection || !clipboard) return false;
      const pasted = pasteAuroraAreaTilesFromClipboard(
        selection.payload.state,
        selection.payload.definition,
        clipboard,
        { row: selection.tile.row, col: selection.tile.col }
      );
      if (pasted.ok === false) {
        setClipboardFeedback({ variant: "error", message: pasted.message });
        trackTelemetry("scene.area_tiles.clipboard_paste_failed", {
          userId,
          source,
          reason: pasted.code
        });
        return true;
      }
      const nextScene = applyAuroraAreaEditingStateToScene(
        scene,
        pasted.state,
        selection.payload.definition,
        selection.payload.terrainBrush
      );
      if (!admitTopologyCandidate(scene, nextScene, "paste", source)) {
        return true;
      }
      const selectedPastedTile = pasted.state.tiles.find(
        (tile) => tile.row === selection.tile.row && tile.col === selection.tile.col
      );
      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(current, nextScene)
      );
      setSelectedObjectIds([]);
      if (setSelectedTileIds) {
        setSelectedTileIds(pasted.changedTileIds);
      } else {
        setSelectedTileId(selectedPastedTile?.id ?? null);
      }
      setClipboardFeedback({
        variant: "success",
        message: `Pasted ${pasted.changedTileIds.length} tile(s) at row ${selection.tile.row}, column ${selection.tile.col}.`
      });
      trackTelemetry("scene.area_tiles.clipboard_pasted", {
        userId,
        source,
        pastedCount: pasted.changedTileIds.length,
        groupCount: clipboard.groups.length
      });
      return true;
    },
    [
      resolveSelection,
      admitTopologyCandidate,
      scene,
      sceneViewportPort,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
      setSelectedTileIds,
      trackTelemetry,
      userId
    ]
  );

  return {
    hasClipboardTiles,
    clipboardFeedback,
    clearClipboardFeedback,
    copySelectedTilesToClipboard,
    cutSelectedTilesToClipboard,
    deleteSelectedTiles,
    pasteClipboardTiles
  };
}

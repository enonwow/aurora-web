import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import {
  copyAuroraAreaTilesToClipboard,
  cutAuroraAreaTilesToClipboard,
  pasteAuroraAreaTilesFromClipboard,
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
      if (keepClipboard) {
        clipboardRef.current = cut.payload;
        setHasClipboardTiles(true);
      }
      const nextScene = applyAuroraAreaEditingStateToScene(
        scene,
        cut.state,
        selection.payload.definition,
        selection.payload.terrainBrush
      );
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
      scene,
      sceneViewportPort,
      setSceneHistory,
      setSelectedObjectIds,
      setSelectedTileId,
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

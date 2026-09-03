import { describe, expect, it, vi } from "vitest";
import {
  applyWorkspaceAreaEditorMutationSignal,
  resolveWorkspaceAreaEditorMutationSelectedTileId,
  resolveWorkspaceCommandRevisionAfterSceneReset,
  shouldApplyWorkspaceExternalSceneSeed,
  shouldPublishWorkspaceAreaSceneDraft,
  type WorkspaceAreaEditorMutationSignal
} from "../../../../src/modules/layout/components/WorkspaceCanvasViewport";
import { createSceneHistoryFacade } from "../../../../src/modules/scene/application/sceneHistoryFacade";
import { createSceneHistory } from "../../../../src/modules/scene/domain/sceneHistory";
import { createSeedAreaScene } from "../../../../src/modules/scene/domain/sceneFactory";
import type { SceneHistoryState } from "../../../../src/modules/scene/contracts";

function createHistory(sceneId: string): SceneHistoryState {
  return {
    past: [],
    present: {
      ...createSeedAreaScene(2, 2),
      sceneId,
      areaName: sceneId
    },
    future: []
  };
}

describe("applyWorkspaceAreaEditorMutationSignal", () => {
  it("never lowers the handled command revision when an Area scene is replaced", () => {
    expect(resolveWorkspaceCommandRevisionAfterSceneReset(7, 3)).toBe(7);
    expect(resolveWorkspaceCommandRevisionAfterSceneReset(0, 3)).toBe(3);
    expect(resolveWorkspaceCommandRevisionAfterSceneReset(7, null)).toBe(7);
  });

  it("does not reset local history for a dependency rerender or a parent echo of the current draft", () => {
    const originalSeed = createHistory("area_alpha").present;
    const localDraft = { ...originalSeed, width: 3 };
    const replacementSeed = { ...originalSeed, width: 4 };

    expect(
      shouldApplyWorkspaceExternalSceneSeed(originalSeed, originalSeed, localDraft)
    ).toBe(false);
    expect(
      shouldApplyWorkspaceExternalSceneSeed(originalSeed, localDraft, localDraft)
    ).toBe(false);
    expect(
      shouldApplyWorkspaceExternalSceneSeed(originalSeed, replacementSeed, localDraft)
    ).toBe(true);
    expect(
      shouldApplyWorkspaceExternalSceneSeed(
        originalSeed,
        replacementSeed,
        localDraft,
        replacementSeed
      )
    ).toBe(false);
  });

  it("does not echo a stale internal scene while a same-area editing seed is being applied", () => {
    const originalSeed = createHistory("area_alpha").present;
    const hydratedEditingSeed = {
      ...originalSeed,
      auroraAreaEditing: {} as typeof originalSeed.auroraAreaEditing
    };

    expect(
      shouldPublishWorkspaceAreaSceneDraft(
        hydratedEditingSeed,
        originalSeed,
        originalSeed
      )
    ).toBe(false);
    expect(
      shouldPublishWorkspaceAreaSceneDraft(
        hydratedEditingSeed,
        hydratedEditingSeed,
        hydratedEditingSeed
      )
    ).toBe(true);
  });

  it("applies an explicit runtime tile selection remap and preserves selection otherwise", () => {
    const history = createHistory("area_alpha");

    expect(
      resolveWorkspaceAreaEditorMutationSelectedTileId("old-member-id", {
        revision: 1,
        scene: history.present,
        selectedTileId: "rotated-member-id"
      }, 0, history.present.sceneId)
    ).toBe("rotated-member-id");
    expect(
      resolveWorkspaceAreaEditorMutationSelectedTileId("old-member-id", {
        revision: 2,
        scene: history.present
      }, 1, history.present.sceneId)
    ).toBe("old-member-id");

    expect(
      resolveWorkspaceAreaEditorMutationSelectedTileId("current-member-id", {
        revision: 1,
        scene: history.present,
        selectedTileId: "replayed-member-id"
      }, 1, history.present.sceneId)
    ).toBe("current-member-id");
    expect(
      resolveWorkspaceAreaEditorMutationSelectedTileId("current-member-id", {
        revision: 2,
        scene: createHistory("area_beta").present,
        selectedTileId: "other-area-member-id"
      }, 1, history.present.sceneId)
    ).toBe("current-member-id");
  });

  it("commits one same-area editor mutation, ignores its replay, and rejects a stale other-area signal", () => {
    const initialHistory = createHistory("area_alpha");
    const sameAreaSignal: WorkspaceAreaEditorMutationSignal = {
      revision: 1,
      scene: {
        ...initialHistory.present,
        width: 3
      }
    };
    const commitHistory = vi.fn((history: SceneHistoryState, scene) => ({
      past: [...history.past, history.present],
      present: scene,
      future: []
    }));

    const committed = applyWorkspaceAreaEditorMutationSignal(
      initialHistory,
      sameAreaSignal,
      0,
      { commitHistory }
    );
    const replayed = applyWorkspaceAreaEditorMutationSignal(
      committed.history,
      sameAreaSignal,
      committed.appliedRevision,
      { commitHistory }
    );
    const staleOtherAreaSignal: WorkspaceAreaEditorMutationSignal = {
      revision: 2,
      scene: {
        ...createHistory("area_beta").present,
        width: 4
      }
    };
    const ignoredOtherArea = applyWorkspaceAreaEditorMutationSignal(
      replayed.history,
      staleOtherAreaSignal,
      replayed.appliedRevision,
      { commitHistory }
    );

    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(committed.history.past).toEqual([initialHistory.present]);
    expect(committed.history.present).toBe(sameAreaSignal.scene);
    expect(replayed.history).toBe(committed.history);
    expect(ignoredOtherArea.history).toBe(committed.history);
    expect(ignoredOtherArea.appliedRevision).toBe(staleOtherAreaSignal.revision);
  });

  it("round-trips an Area editor mutation through the real undo and redo history", () => {
    const historyFacade = createSceneHistoryFacade();
    const initialScene = createHistory("area_alpha").present;
    const initialHistory = createSceneHistory(initialScene);
    const editedScene = {
      ...initialScene,
      tiles: initialScene.tiles.map((tile) =>
        tile.id === "tile_0_0"
          ? {
              ...tile,
              orientation: 1 as const,
              height: 1,
              mainLight1: 12,
              sourceLight2: 42,
              animLoop3: 1
            }
          : tile
      )
    };

    const committed = applyWorkspaceAreaEditorMutationSignal(
      initialHistory,
      { revision: 1, scene: editedScene },
      0,
      { commitHistory: historyFacade.commit }
    ).history;
    const undone = historyFacade.undo(committed);
    const redone = historyFacade.redo(undone);

    expect(committed.present.tiles[0]).toMatchObject({
      orientation: 1,
      height: 1,
      mainLight1: 12,
      sourceLight2: 42,
      animLoop3: 1
    });
    expect(undone.present.tiles[0]).toMatchObject({ orientation: 0 });
    expect(undone.present.tiles[0]?.height).toBeUndefined();
    expect(undone.present.tiles[0]?.mainLight1).toBeUndefined();
    expect(redone.present.tiles[0]).toMatchObject({
      orientation: 1,
      height: 1,
      mainLight1: 12,
      sourceLight2: 42,
      animLoop3: 1
    });
  });
});

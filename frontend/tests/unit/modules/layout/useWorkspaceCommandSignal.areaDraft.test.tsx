import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRef } from "react";

import { useWorkspaceCommandSignal } from "../../../../src/modules/layout/application/useWorkspaceCommandSignal";
import { createDefaultToolbarState } from "../../../../src/modules/layout/roleTopbarPolicy";
import type { AreaLifecycleFacade } from "../../../../src/modules/areas/application/areaLifecycleFacade";
import type { AreaLifecycleResult } from "../../../../src/modules/areas/ports/areaLifecyclePort";
import type { SceneViewportPort } from "../../../../src/modules/scene/application/sceneViewportPort";
import type { AreaScene, SceneHistoryState } from "../../../../src/modules/scene/contracts";

const scene: AreaScene = {
  sceneId: "area_draft_01",
  areaName: "Area draft",
  width: 2,
  height: 2,
  tiles: [],
  objects: [],
  updatedAtUnixMs: 10,
  source: "local_draft"
};

const emptyHistory: SceneHistoryState = { past: [], present: scene, future: [] };

function createViewportPort(saveLocalDraft = vi.fn()): SceneViewportPort {
  return {
    createInitialHistory: vi.fn(() => emptyHistory),
    createHistoryFromScene: vi.fn(() => emptyHistory),
    saveLocalDraft,
    commitHistory: vi.fn((history) => history),
    undoHistory: vi.fn((history) => history),
    redoHistory: vi.fn((history) => history)
  } as unknown as SceneViewportPort;
}

function successfulSave(
  revision: number,
  draftId = scene.sceneId
): AreaLifecycleResult<unknown> {
  return {
    ok: true,
    value: {
      draftId,
      title: scene.areaName,
      revision,
      updatedAt: "2026-08-07T10:00:00.000Z",
      normalizedSha256: String(revision).repeat(64),
      draft: {}
    },
    metadata: {
      contractVersion: "1.1.0",
      requestId: `request-${revision}`,
      revision,
      etag: `\"${revision}\"`
    }
  };
}

describe("useWorkspaceCommandSignal Area draft persistence", () => {
  it("retains the immutable production snapshot when saving an editable copy", async () => {
    const dynamicPlaceableSource = {
      type: "aurora_blueprint" as const,
      sourceKind: "placeable" as const,
      sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
      templateId: "plc_plc_chair",
      templateResRef: "plc_chair",
      sourceObjectKey:
        "modules/current/__aurora/sources/vanilla/templates/plc_chair.utp",
      sourceEtag: "a".repeat(64),
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff
    };
    const productionScene = {
      ...scene,
      sceneId: "area_crypt01",
      areaName: "Crypt 01",
      source: "aurora_area" as const,
      objects: [
        {
          id: "new_placeable_01",
          kind: "placeables" as const,
          name: "Chair",
          resRef: "plc_chair",
          tag: "Chair",
          source: dynamicPlaceableSource,
          isStatic: true,
          x: 1.5,
          y: 0.5,
          z: 0,
          bearing: 0,
          visualTransform: {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            pitch: 0,
            roll: 0,
            yaw: 0
          },
          placeableProperties: {
            plot: false,
            useable: false,
            hasInventory: false
          }
        }
      ]
    } satisfies AreaScene;
    const productionSource = {
      schemaVersion: "production-area-draft-payload.v1" as const,
      sourceArea: {
        areaId: "area_crypt01",
        name: "Crypt 01",
        width: 2,
        height: 2,
        tags: [],
        tiles: [],
        objects: [],
        textureAtlas: {},
        composition: {},
        updatedAt: "2026-08-07T09:59:00.000Z"
      },
      provenance: {
        areaId: "area_crypt01",
        sourceUpdatedAt: "2026-08-07T09:59:00.000Z",
        processingCacheKey: "processed-area-cache-01"
      }
    };
    const saveLocalDraft = vi
      .fn()
      .mockResolvedValue(successfulSave(2, "draft_copy_01"));
    const onAreaDraftPersisted = vi.fn();
    const registry = {
      current: {
        area_crypt01: {
          draftId: "draft_copy_01",
          revision: 1,
          productionSource
        }
      }
    };
    const areaLifecycleFacade = {
      queries: { listLocalDrafts: vi.fn(), openLocalDraft: vi.fn() },
      commands: {
        openProductionAreaAsDraft: vi.fn(),
        saveLocalDraft,
        deleteLocalDraft: vi.fn(),
        materializeArea: vi.fn()
      }
    } as unknown as AreaLifecycleFacade;

    renderHook(() => {
      useWorkspaceCommandSignal({
        commandSignal: { actionKey: "save_local_draft", revision: 1, issuedAtUnixMs: 1 },
        commandRevisionRef: useRef(0),
        runtimeRef: { current: null },
        bookmark1Ref: useRef(null),
        cameraRuntimePort: {
          centerCameraForScene: vi.fn(),
          createCameraBookmark: vi.fn(),
          restoreCameraBookmark: vi.fn()
        },
        scene: productionScene,
        sceneViewportPort: createViewportPort(),
        areaLifecycleFacade,
        areaDraftSessionRegistry: registry,
        onAreaDraftPersisted,
        createIdempotencyKey: () => "save-production-copy-01",
        setSceneHistory: vi.fn(),
        setSelectedObjectIds: vi.fn(),
        setSelectedTileId: vi.fn(),
        setLastSavedAtUnixMs: vi.fn(),
        copySelectedObjectsToClipboard: vi.fn(() => []),
        deleteSelectedObjects: vi.fn(() => 0),
        duplicateObjects: vi.fn(() => []),
        isSelectableByActiveFilters: vi.fn(() => true),
        renderAreaGeometry: true,
        selectedObjectIds: [],
        toolbarState: createDefaultToolbarState(),
        userId: "builder_01",
        visibleObjects: [],
        trackTelemetry: vi.fn()
      });
    });

    await waitFor(() => expect(saveLocalDraft).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onAreaDraftPersisted).toHaveBeenCalledTimes(1));
    expect(saveLocalDraft).toHaveBeenCalledWith(expect.objectContaining({
      draftId: "draft_copy_01",
      expectedRevision: 1,
      draft: expect.objectContaining({
        source: { type: "production_area", areaId: "area_crypt01" },
        payload: expect.objectContaining({
          schemaVersion: "production-area-draft-payload.v1",
          sourceArea: productionSource.sourceArea,
          editableScene: productionScene
        })
      })
    }));
    const savedDocument = saveLocalDraft.mock.calls[0]?.[0]?.draft;
    expect(savedDocument).toMatchObject({
      payload: {
        editableScene: {
          objects: [
            {
              id: "new_placeable_01",
              resRef: "plc_chair",
              source: dynamicPlaceableSource
            }
          ]
        }
      }
    });
    expect(registry.current.area_crypt01).toEqual(expect.objectContaining({
      draftId: "draft_copy_01",
      revision: 2,
      normalizedSha256: "2".repeat(64),
      persistedSceneUpdatedAtUnixMs: productionScene.updatedAtUnixMs
    }));
  });

  it("serializes rapid remote saves per scene so CAS revisions cannot race", async () => {
    let resolveFirstSave!: (result: AreaLifecycleResult<unknown>) => void;
    const firstSave = new Promise<AreaLifecycleResult<unknown>>((resolve) => {
      resolveFirstSave = resolve;
    });
    const saveLocalDraft = vi.fn()
      .mockReturnValueOnce(firstSave)
      .mockResolvedValueOnce(successfulSave(2));
    const areaLifecycleFacade = {
      queries: { listLocalDrafts: vi.fn(), openLocalDraft: vi.fn() },
      commands: { saveLocalDraft, deleteLocalDraft: vi.fn(), materializeArea: vi.fn() }
    } as unknown as AreaLifecycleFacade;
    const telemetry = vi.fn();

    const { rerender } = renderHook(
      ({ revision }) => {
        useWorkspaceCommandSignal({
          commandSignal: { actionKey: "save_local_draft", revision, issuedAtUnixMs: revision },
          commandRevisionRef: useRef(0),
          runtimeRef: { current: null },
          bookmark1Ref: useRef(null),
          cameraRuntimePort: {
            centerCameraForScene: vi.fn(),
            createCameraBookmark: vi.fn(),
            restoreCameraBookmark: vi.fn()
          },
          scene,
          sceneViewportPort: createViewportPort(),
          areaLifecycleFacade,
          createIdempotencyKey: (commandRevision) => `save-command-${commandRevision}`,
          setSceneHistory: vi.fn(),
          setSelectedObjectIds: vi.fn(),
          setSelectedTileId: vi.fn(),
          setLastSavedAtUnixMs: vi.fn(),
          copySelectedObjectsToClipboard: vi.fn(() => []),
          deleteSelectedObjects: vi.fn(() => 0),
          duplicateObjects: vi.fn(() => []),
          isSelectableByActiveFilters: vi.fn(() => true),
          renderAreaGeometry: true,
          selectedObjectIds: [],
          toolbarState: createDefaultToolbarState(),
          userId: "builder_01",
          visibleObjects: [],
          trackTelemetry: telemetry
        });
      },
      { initialProps: { revision: 1 } }
    );

    await waitFor(() => expect(saveLocalDraft).toHaveBeenCalledTimes(1));
    rerender({ revision: 2 });
    await Promise.resolve();
    expect(saveLocalDraft).toHaveBeenCalledTimes(1);

    resolveFirstSave(successfulSave(1));
    await waitFor(() => expect(saveLocalDraft).toHaveBeenCalledTimes(2));
    expect(saveLocalDraft).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        expectedRevision: 1,
        idempotencyKey: "save-command-2"
      })
    );
    await waitFor(() => {
      expect(telemetry).toHaveBeenCalledWith(
        "scene.save_local_draft_remote",
        expect.objectContaining({ revision: 2 })
      );
    });
    expect(telemetry).not.toHaveBeenCalledWith(
      "scene.save_local_draft_remote_failed",
      expect.objectContaining({ code: "PORT_FAILURE" })
    );
  });

  it("does not report the draft as saved until remote CAS succeeds and exposes the browser recovery copy while saving", async () => {
    let resolveRemoteSave!: (result: AreaLifecycleResult<unknown>) => void;
    const remoteSave = new Promise<AreaLifecycleResult<unknown>>((resolve) => {
      resolveRemoteSave = resolve;
    });
    const saveBrowserCopy = vi.fn();
    const saveLocalDraft = vi.fn().mockReturnValue(remoteSave);
    const setLastSavedAtUnixMs = vi.fn();
    const onAreaWorkspaceStatusChange = vi.fn();
    const areaLifecycleFacade = {
      queries: { listLocalDrafts: vi.fn(), openLocalDraft: vi.fn() },
      commands: { saveLocalDraft, deleteLocalDraft: vi.fn(), materializeArea: vi.fn() }
    } as unknown as AreaLifecycleFacade;

    renderHook(() => {
      useWorkspaceCommandSignal({
        commandSignal: { actionKey: "save_local_draft", revision: 1, issuedAtUnixMs: 1 },
        commandRevisionRef: useRef(0),
        runtimeRef: { current: null },
        bookmark1Ref: useRef(null),
        cameraRuntimePort: {
          centerCameraForScene: vi.fn(),
          createCameraBookmark: vi.fn(),
          restoreCameraBookmark: vi.fn()
        },
        scene,
        sceneViewportPort: createViewportPort(saveBrowserCopy),
        areaLifecycleFacade,
        createIdempotencyKey: () => "save-visible-state-01",
        setSceneHistory: vi.fn(),
        setSelectedObjectIds: vi.fn(),
        setSelectedTileId: vi.fn(),
        setLastSavedAtUnixMs,
        onAreaWorkspaceStatusChange,
        copySelectedObjectsToClipboard: vi.fn(() => []),
        deleteSelectedObjects: vi.fn(() => 0),
        duplicateObjects: vi.fn(() => []),
        isSelectableByActiveFilters: vi.fn(() => true),
        renderAreaGeometry: true,
        selectedObjectIds: [],
        toolbarState: createDefaultToolbarState(),
        userId: "builder_01",
        visibleObjects: [],
        trackTelemetry: vi.fn()
      });
    });

    await waitFor(() => expect(saveLocalDraft).toHaveBeenCalledTimes(1));
    expect(saveBrowserCopy).toHaveBeenCalledTimes(1);
    expect(setLastSavedAtUnixMs).not.toHaveBeenCalled();
    expect(onAreaWorkspaceStatusChange).toHaveBeenLastCalledWith(expect.objectContaining({
      lane: "draft",
      state: "saving",
      sceneId: scene.sceneId,
      browserRecoveryAvailable: true
    }));

    resolveRemoteSave(successfulSave(1));
    await waitFor(() => {
      expect(onAreaWorkspaceStatusChange).toHaveBeenLastCalledWith(expect.objectContaining({
        lane: "draft",
        state: "saved",
        sceneId: scene.sceneId,
        draftId: scene.sceneId,
        revision: 1,
        browserRecoveryAvailable: true
      }));
    });
    expect(setLastSavedAtUnixMs).toHaveBeenCalledTimes(1);
  });

  it("keeps the browser recovery copy and CAS-synchronizes successive saves through the lifecycle facade", async () => {
    const saveBrowserCopy = vi.fn();
    const saveLocalDraft = vi.fn()
      .mockResolvedValueOnce(successfulSave(1))
      .mockResolvedValueOnce(successfulSave(2));
    const areaLifecycleFacade = {
      queries: { listLocalDrafts: vi.fn(), openLocalDraft: vi.fn() },
      commands: { saveLocalDraft, deleteLocalDraft: vi.fn(), materializeArea: vi.fn() }
    } as unknown as AreaLifecycleFacade;
    const telemetry = vi.fn();
    const onAreaDraftPersisted = vi.fn();
    const setLastSavedAtUnixMs = vi.fn();

    const { rerender } = renderHook(
      ({ revision }) => {
        const commandRevisionRef = useRef(0);
        const bookmark1Ref = useRef<unknown | null>(null);
        useWorkspaceCommandSignal({
          commandSignal: { actionKey: "save_local_draft", revision, issuedAtUnixMs: 1 },
          commandRevisionRef,
          runtimeRef: { current: null },
          bookmark1Ref,
          cameraRuntimePort: {
            centerCameraForScene: vi.fn(),
            createCameraBookmark: vi.fn(),
            restoreCameraBookmark: vi.fn()
          },
          scene,
          sceneViewportPort: createViewportPort(saveBrowserCopy),
          areaLifecycleFacade,
          onAreaDraftPersisted,
          createIdempotencyKey: (commandRevision) => `save-command-${commandRevision}`,
          setSceneHistory: vi.fn(),
          setSelectedObjectIds: vi.fn(),
          setSelectedTileId: vi.fn(),
          setLastSavedAtUnixMs,
          copySelectedObjectsToClipboard: vi.fn(() => []),
          deleteSelectedObjects: vi.fn(() => 0),
          duplicateObjects: vi.fn(() => []),
          isSelectableByActiveFilters: vi.fn(() => true),
          renderAreaGeometry: true,
          selectedObjectIds: [],
          toolbarState: createDefaultToolbarState(),
          userId: "builder_01",
          visibleObjects: [],
          trackTelemetry: telemetry
        });
      },
      { initialProps: { revision: 1 } }
    );

    await waitFor(() => expect(saveLocalDraft).toHaveBeenCalledTimes(1));
    expect(saveBrowserCopy).toHaveBeenCalledWith("builder_01", scene);
    expect(saveLocalDraft).toHaveBeenNthCalledWith(1, {
      draftId: "area_draft_01",
      expectedRevision: 0,
      idempotencyKey: "save-command-1",
      schemaVersion: "area-draft.v1",
      draft: {
        schemaVersion: "area-draft.v1",
        title: "Area draft",
        source: { type: "new" },
        payload: scene
      }
    });

    rerender({ revision: 2 });
    await waitFor(() => expect(saveLocalDraft).toHaveBeenCalledTimes(2));
    expect(saveLocalDraft.mock.calls[1]?.[0]).toMatchObject({ expectedRevision: 1 });
    expect(setLastSavedAtUnixMs).toHaveBeenCalledTimes(2);
    expect(telemetry).toHaveBeenCalledWith(
      "scene.save_local_draft_remote",
      expect.objectContaining({ draftId: "area_draft_01", revision: 2 })
    );
    expect(onAreaDraftPersisted).toHaveBeenCalledTimes(2);
  });

  it("retains the browser recovery copy and emits actionable telemetry when remote CAS fails", async () => {
    const saveBrowserCopy = vi.fn();
    const saveLocalDraft = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        code: "STALE_REVISION",
        operation: "save_local_draft",
        message: "stale",
        retryable: false,
        recovery: "reload_draft",
        expectedRevision: 0,
        actualRevision: 4,
        details: []
      }
    });
    const telemetry = vi.fn();
    const onAreaDraftPersisted = vi.fn();
    const onAreaWorkspaceStatusChange = vi.fn();
    const setLastSavedAtUnixMs = vi.fn();
    const areaLifecycleFacade = {
      queries: { listLocalDrafts: vi.fn(), openLocalDraft: vi.fn() },
      commands: { saveLocalDraft, deleteLocalDraft: vi.fn(), materializeArea: vi.fn() }
    } as unknown as AreaLifecycleFacade;

    renderHook(() => {
      useWorkspaceCommandSignal({
        commandSignal: { actionKey: "save_local_draft", revision: 1, issuedAtUnixMs: 1 },
        commandRevisionRef: useRef(0),
        runtimeRef: { current: null },
        bookmark1Ref: useRef(null),
        cameraRuntimePort: {
          centerCameraForScene: vi.fn(),
          createCameraBookmark: vi.fn(),
          restoreCameraBookmark: vi.fn()
        },
        scene,
        sceneViewportPort: createViewportPort(saveBrowserCopy),
        areaLifecycleFacade,
        onAreaDraftPersisted,
        createIdempotencyKey: () => "save-command-failed",
        setSceneHistory: vi.fn(),
        setSelectedObjectIds: vi.fn(),
        setSelectedTileId: vi.fn(),
        setLastSavedAtUnixMs,
        onAreaWorkspaceStatusChange,
        copySelectedObjectsToClipboard: vi.fn(() => []),
        deleteSelectedObjects: vi.fn(() => 0),
        duplicateObjects: vi.fn(() => []),
        isSelectableByActiveFilters: vi.fn(() => true),
        renderAreaGeometry: true,
        selectedObjectIds: [],
        toolbarState: createDefaultToolbarState(),
        userId: "builder_01",
        visibleObjects: [],
        trackTelemetry: telemetry
      });
    });

    await waitFor(() => {
      expect(telemetry).toHaveBeenCalledWith("scene.save_local_draft_remote_failed", {
        userId: "builder_01",
        sceneId: "area_draft_01",
        code: "STALE_REVISION",
        recovery: "reload_draft",
        expectedRevision: 0,
        actualRevision: 4
      });
    });
    expect(saveBrowserCopy).toHaveBeenCalledTimes(1);
    expect(onAreaDraftPersisted).not.toHaveBeenCalled();
    expect(setLastSavedAtUnixMs).not.toHaveBeenCalled();
    expect(onAreaWorkspaceStatusChange).toHaveBeenLastCalledWith(expect.objectContaining({
      lane: "draft",
      state: "conflict",
      sceneId: scene.sceneId,
      code: "STALE_REVISION",
      expectedRevision: 0,
      actualRevision: 4,
      browserRecoveryAvailable: true
    }));
  });
});

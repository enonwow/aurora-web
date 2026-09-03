import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AreaDraftPanel,
  parseAreaDraftScene
} from "../../../../src/modules/layout/components/AreaDraftPanel";
import type { AreaLifecycleFacade } from "../../../../src/modules/areas/application/areaLifecycleFacade";
import type { AreaDraftDocument } from "../../../../src/modules/areas/ports/areaLifecyclePort";
import type { AreaScene } from "../../../../src/modules/scene/contracts";

const scene: AreaScene = {
  sceneId: "draft_02",
  areaName: "Second draft",
  width: 2,
  height: 2,
  tiles: [],
  objects: [],
  updatedAtUnixMs: 10,
  source: "local_draft"
};

const document: AreaDraftDocument<AreaScene> = {
  schemaVersion: "area-draft.v1",
  title: "Second draft",
  source: { type: "new" },
  payload: scene
};

const NORMALIZED_SHA256 = "d".repeat(64);

function success<T>(value: T, revision?: number) {
  return {
    ok: true as const,
    value,
    metadata: {
      contractVersion: "1.1.0",
      requestId: "request-01",
      ...(revision === undefined ? {} : { revision, etag: `\"${revision}\"` })
    }
  };
}

function createFacade() {
  return {
    queries: {
      listLocalDrafts: vi.fn().mockResolvedValue(success({
        items: [
          { draftId: "draft_01", title: "First draft", revision: 1, updatedAt: "2026-08-07T09:00:00.000Z", source: { type: "new" } },
          { draftId: "draft_02", title: "Second draft", revision: 4, updatedAt: "2026-08-07T10:00:00.000Z", source: { type: "new" } }
        ],
        nextCursor: null
      })),
      openLocalDraft: vi.fn().mockResolvedValue(success({
        draftId: "draft_02",
        title: "Second draft",
        revision: 4,
        updatedAt: "2026-08-07T10:00:00.000Z",
        normalizedSha256: NORMALIZED_SHA256,
        draft: document
      }, 4))
    },
    commands: {
      saveLocalDraft: vi.fn(),
      deleteLocalDraft: vi.fn().mockResolvedValue(success({
        draftId: "draft_02",
        deletedRevision: 4,
        deleted: true as const
      }, 4)),
      materializeArea: vi.fn()
    }
  } as unknown as AreaLifecycleFacade<AreaDraftDocument<AreaScene>>;
}

describe("AreaDraftPanel", () => {
  it("accepts the dynamic terrain identifiers emitted by local Aurora tilesets", () => {
    const roundTripScene = {
      ...scene,
      tiles: [
        {
          id: "area-tile:0:0:40",
          row: 0,
          col: 0,
          terrain: "ground",
          orientation: 1,
          rotateTexture: true,
          plot: false,
          source: "aurora_tile_list",
          tilesetResRef: "mst04",
          tileId: 40,
          modelResRef: "mst04_b10_01"
        }
      ]
    };

    expect(parseAreaDraftScene(roundTripScene)).toEqual(roundTripScene);
  });

  it("lists owner drafts, opens one exact revision, and publishes its CAS revision", async () => {
    const facade = createFacade();
    const onAreaSceneSelected = vi.fn();
    const revisions = { current: {} };

    render(
      <AreaDraftPanel
        userId="builder_01"
        facade={facade}
        draftSessionRegistry={revisions}
        onAreaSceneSelected={onAreaSceneSelected}
        trackTelemetryEvent={vi.fn()}
      />
    );

    expect(await screen.findByText("First draft")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /select second draft/i }));
    fireEvent.click(screen.getByRole("button", { name: /open selected local draft/i }));

    await waitFor(() => {
      expect(facade.queries.openLocalDraft).toHaveBeenCalledWith({
        draftId: "draft_02",
        revision: 4
      });
    });
    expect(onAreaSceneSelected).toHaveBeenCalledWith(scene);
    expect(revisions.current).toEqual({
      draft_02: {
        draftId: "draft_02",
        revision: 4,
        normalizedSha256: NORMALIZED_SHA256,
        persistedSceneUpdatedAtUnixMs: scene.updatedAtUnixMs
      }
    });
  });

  it("reloads the owner list after a production Area is copied into a draft", async () => {
    const facade = createFacade();
    const props = {
      userId: "builder_01",
      facade,
      draftSessionRegistry: { current: {} },
      onAreaSceneSelected: vi.fn(),
      trackTelemetryEvent: vi.fn()
    };
    const { rerender } = render(<AreaDraftPanel {...props} refreshRevision={0} />);

    await screen.findByText("First draft");
    expect(facade.queries.listLocalDrafts).toHaveBeenCalledTimes(1);

    rerender(<AreaDraftPanel {...props} refreshRevision={1} />);
    await waitFor(() => expect(facade.queries.listLocalDrafts).toHaveBeenCalledTimes(2));
  });

  it("requires an explicit second click before deleting and removes the confirmed revision", async () => {
    const facade = createFacade();
    const revisions = {
      current: { draft_02: { draftId: "draft_02", revision: 4 } }
    };

    render(
      <AreaDraftPanel
        userId="builder_01"
        facade={facade}
        draftSessionRegistry={revisions}
        createIdempotencyKey={() => "delete-draft-command-01"}
        onAreaSceneSelected={vi.fn()}
        trackTelemetryEvent={vi.fn()}
      />
    );

    await screen.findByText("Second draft");
    fireEvent.click(screen.getByRole("button", { name: /select second draft/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete selected local draft/i }));
    expect(facade.commands.deleteLocalDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /confirm delete second draft/i }));

    await waitFor(() => {
      expect(facade.commands.deleteLocalDraft).toHaveBeenCalledWith({
        draftId: "draft_02",
        expectedRevision: 4,
        idempotencyKey: "delete-draft-command-01"
      });
    });
    expect(screen.queryByText("Second draft")).not.toBeInTheDocument();
    expect(revisions.current).toEqual({});
  });

  it("rejects a malformed scene payload and exposes lifecycle conflicts without replacing the canvas", async () => {
    const facade = createFacade();
    vi.mocked(facade.queries.openLocalDraft).mockResolvedValueOnce(success({
      draftId: "draft_01",
      title: "First draft",
      revision: 1,
      updatedAt: "2026-08-07T09:00:00.000Z",
      normalizedSha256: NORMALIZED_SHA256,
      draft: { ...document, payload: { sceneId: "broken" } as AreaScene }
    }, 1));
    vi.mocked(facade.commands.deleteLocalDraft).mockResolvedValueOnce({
      ok: false,
      error: {
        code: "STALE_REVISION",
        operation: "delete_local_draft",
        message: "Revision changed.",
        retryable: false,
        recovery: "reload_draft",
        expectedRevision: 1,
        actualRevision: 2,
        details: []
      }
    });
    const onAreaSceneSelected = vi.fn();

    render(
      <AreaDraftPanel
        userId="builder_01"
        facade={facade}
        draftSessionRegistry={{ current: {} }}
        createIdempotencyKey={() => "delete-draft-command-02"}
        onAreaSceneSelected={onAreaSceneSelected}
        trackTelemetryEvent={vi.fn()}
      />
    );

    await screen.findByText("First draft");
    fireEvent.click(screen.getByRole("button", { name: /open selected local draft/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid area scene/i);
    expect(onAreaSceneSelected).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /delete selected local draft/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm delete first draft/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Revision changed.");
  });
});

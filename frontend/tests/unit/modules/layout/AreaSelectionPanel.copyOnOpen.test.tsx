import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AreaLifecycleFacade } from "../../../../src/modules/areas/application/areaLifecycleFacade";
import type { AreaApiDetail, AreaApiListItem } from "../../../../src/modules/areas/contracts";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";
import type {
  AreaDraftDocument,
  AreaDraftSessionRegistry,
  ProductionAreaDraftPayload,
} from "../../../../src/modules/areas/ports/areaLifecyclePort";
import { AreaSelectionPanel } from "../../../../src/modules/layout/components/AreaSelectionPanel";

const areaListItem = {
  areaId: "area_crypt01",
  name: "Crypt 01",
  biome: "Crypt",
  width: 1,
  height: 1,
  tags: ["crypt"],
  benchmark: false,
  previewImageUrl: "/preview.svg",
  textureAtlasId: "atlas_crypt01",
  objectCounts: {
    placeables: 0,
    doors: 0,
    creatures: 0,
    encounters: 0,
    items: 0,
    sounds: 0,
    stores: 0,
    triggers: 0,
    waypoints: 0,
    total: 0,
  },
  updatedAt: "2026-08-07T09:59:00.000Z",
} as AreaApiListItem;

const sourceArea = {
  ...areaListItem,
  textureAtlas: {
    atlasId: "atlas_crypt01",
    cacheKey: "atlas_crypt01:1x1",
    strategy: "blob-cache",
    objectKey: "atlas/crypt01",
    contentType: "image/png",
    sizeBytes: 100,
  },
  tileSet: "tin01",
  tiles: [],
  soundscape: null,
  composition: areaListItem.objectCounts,
  objects: [],
  sourceResources: {
    areSha256: "a".repeat(64),
    gitSha256: "b".repeat(64),
    gicSha256: "c".repeat(64),
  },
} as AreaApiDetail;

type Draft = AreaDraftDocument<ProductionAreaDraftPayload<AreaApiDetail>>;

function facade(openProductionAreaAsDraft: ReturnType<typeof vi.fn>) {
  return {
    queries: {
      listLocalDrafts: vi.fn(),
      openLocalDraft: vi.fn(),
    },
    commands: {
      openProductionAreaAsDraft,
      saveLocalDraft: vi.fn(),
      deleteLocalDraft: vi.fn(),
      materializeArea: vi.fn(),
    },
  } as unknown as AreaLifecycleFacade<Draft>;
}

function areaApiPort(): AreaApiPort {
  return {
    listAreas: vi.fn(async () => ({
      items: [areaListItem],
      total: 1,
      limit: 100,
      offset: 0,
    })),
    processArea: vi.fn(),
  } as unknown as AreaApiPort;
}

describe("AreaSelectionPanel production copy-on-open", () => {
  it("presents the scene only after an exact draft revision is created", async () => {
    const openProductionAreaAsDraft = vi.fn(async () => ({
      ok: true as const,
      value: {
        draftId: "draft_abcdef0123456789abcdef0123456789",
        title: "Crypt 01 - Working Copy",
        revision: 1,
        updatedAt: "2026-08-07T10:00:00.000Z",
        normalizedSha256: "d".repeat(64),
        draft: {
          schemaVersion: "area-draft.v1" as const,
          title: "Crypt 01 - Working Copy",
          source: { type: "production_area" as const, areaId: "area_crypt01" },
          payload: {
            schemaVersion: "production-area-draft-payload.v1" as const,
            sourceArea,
            provenance: {
              areaId: "area_crypt01",
              sourceUpdatedAt: sourceArea.updatedAt,
              processingCacheKey: "processed-area-cache-01",
              sourceAreSha256: sourceArea.sourceResources?.areSha256,
              sourceGitSha256: sourceArea.sourceResources?.gitSha256,
              sourceGicSha256: sourceArea.sourceResources?.gicSha256,
            },
          },
        },
      },
      metadata: {
        contractVersion: "1.1.0",
        requestId: "req-copy-01",
        revision: 1,
        etag: '"1"',
        idempotencyStatus: "created" as const,
        artifactIds: [],
      },
    }));
    const sessions: AreaDraftSessionRegistry = { current: {} };
    const onAreaSceneSelected = vi.fn();
    const onDraftCreated = vi.fn();
    const api = areaApiPort();

    const { container } = render(
      <AreaSelectionPanel
        userId="user-01"
        backendAccessToken="token-01"
        areaApiPort={api}
        areaLifecycleFacade={facade(openProductionAreaAsDraft)}
        areaDraftSessionRegistry={sessions}
        areaListClientCacheRef={{ current: null }}
        trackTelemetryEvent={vi.fn()}
        onDraftCreated={onDraftCreated}
        onAreaSceneSelected={onAreaSceneSelected}
      />
    );

    await waitFor(() =>
      expect(
        container.querySelector<HTMLButtonElement>('[data-area-id="area_crypt01"]')
      ).not.toBeNull()
    );
    const row = container.querySelector<HTMLButtonElement>('[data-area-id="area_crypt01"]');
    fireEvent.click(row!);
    fireEvent.click(screen.getByRole("button", { name: "Open Selected Area" }));

    await waitFor(() => expect(onAreaSceneSelected).toHaveBeenCalledTimes(1));
    expect(openProductionAreaAsDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: "area-draft-open.v1",
        areaId: "area_crypt01",
        draftTitle: "Crypt 01 - Working Copy",
        idempotencyKey: expect.stringMatching(/^area-draft-open:/u),
      })
    );
    expect(sessions.current.area_crypt01).toEqual(expect.objectContaining({
      draftId: "draft_abcdef0123456789abcdef0123456789",
      revision: 1,
      normalizedSha256: "d".repeat(64),
      persistedSceneUpdatedAtUnixMs: expect.any(Number),
    }));
    expect(sessions.current.area_crypt01?.productionSource).toMatchObject({
      schemaVersion: "production-area-draft-payload.v1",
      provenance: {
        areaId: "area_crypt01",
        sourceAreSha256: "a".repeat(64),
        sourceGitSha256: "b".repeat(64),
        sourceGicSha256: "c".repeat(64),
      },
    });
    expect(onDraftCreated).toHaveBeenCalledTimes(1);
    expect(api.processArea).not.toHaveBeenCalled();
  });

  it("fails closed when the durable draft cannot be created", async () => {
    const openProductionAreaAsDraft = vi.fn(async () => ({
      ok: false as const,
      error: {
        code: "PORT_FAILURE" as const,
        operation: "open_production_area_as_draft" as const,
        message: "Draft storage unavailable.",
        retryable: true,
        recovery: "retry" as const,
        details: [],
      },
    }));
    const onAreaSceneSelected = vi.fn();
    const { container } = render(
      <AreaSelectionPanel
        userId="user-01"
        backendAccessToken="token-01"
        areaApiPort={areaApiPort()}
        areaLifecycleFacade={facade(openProductionAreaAsDraft)}
        areaDraftSessionRegistry={{ current: {} }}
        areaListClientCacheRef={{ current: null }}
        trackTelemetryEvent={vi.fn()}
        onAreaSceneSelected={onAreaSceneSelected}
      />
    );
    await waitFor(() =>
      expect(
        container.querySelector<HTMLButtonElement>('[data-area-id="area_crypt01"]')
      ).not.toBeNull()
    );
    const row = container.querySelector<HTMLButtonElement>('[data-area-id="area_crypt01"]');
    fireEvent.click(row!);
    fireEvent.click(screen.getByRole("button", { name: "Open Selected Area" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Draft storage unavailable.");
    expect(onAreaSceneSelected).not.toHaveBeenCalled();
  });
});

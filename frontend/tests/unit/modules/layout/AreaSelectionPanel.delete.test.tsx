import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AreaCreateFacade } from "../../../../src/modules/areas/application/areaCreateFacade";
import type { AreaDeleteFacade } from "../../../../src/modules/areas/application/areaDeleteFacade";
import type { AreaApiListItem } from "../../../../src/modules/areas/contracts";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";
import { AreaSelectionPanel } from "../../../../src/modules/layout/components/AreaSelectionPanel";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const area = {
  areaId: "area_crypt01",
  name: "Crypt 01",
  biome: "Crypt",
  width: 2,
  height: 2,
  tags: [],
  benchmark: false,
  previewImageUrl: "/preview.svg",
  textureAtlasId: "atlas-01",
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
    total: 0
  },
  updatedAt: "2026-08-18T20:00:00.000Z"
} satisfies AreaApiListItem;

describe("AreaSelectionPanel Area Delete", () => {
  it("requires impact preview and typed exact confirmation before atomic deletion", async () => {
    const areaApiPort = {
      listAreas: vi.fn(async () => ({ items: [area], total: 1, limit: 100, offset: 0 })),
      processArea: vi.fn()
    } as unknown as AreaApiPort;
    const getProfiles = vi.fn(async () => ({
      ok: true as const,
      value: { moduleId: "module-01", moduleRevision: HASH_A, profiles: [] },
      metadata: { contractVersion: "1.1.0", requestId: "profiles-01" }
    }));
    const areaCreateFacade = {
      queries: { getProfiles },
      commands: { validate: vi.fn(), create: vi.fn() }
    } as AreaCreateFacade;
    const preview = vi.fn(async () => ({
      ok: true as const,
      value: {
        schemaVersion: "area-delete-preview.v1" as const,
        scanVersion: "area-delete-impact-scan.v1" as const,
        moduleId: "module-01",
        areaResRef: "crypt01",
        moduleRevision: HASH_A,
        targetResources: [],
        moduleIfo: {} as never,
        membershipCount: 1,
        entryAreaResRef: "start01",
        findings: [],
        blockerCount: 0,
        warningCount: 0,
        previewSha256: HASH_B,
        expiresAt: "2099-08-18T20:05:00.000Z"
      },
      metadata: {
        contractVersion: "1.1.0",
        requestId: "preview-01",
        moduleRevision: HASH_A,
        etag: `"${HASH_A}"`
      }
    })) as AreaDeleteFacade["commands"]["preview"];
    const deleteArea = vi.fn(async () => ({
      ok: true as const,
      value: {
        schemaVersion: "area-delete-receipt.v1" as const,
        transactionId: "transaction-01",
        areaResRef: "crypt01",
        moduleId: "module-01",
        previousModuleRevision: HASH_A,
        newModuleRevision: HASH_B,
        commandHash: HASH_A,
        previewSha256: HASH_B,
        scanVersion: "area-delete-impact-scan.v1" as const,
        removedResources: [],
        moduleIfo: {} as never,
        survivorCount: 0,
        blockerCount: 0 as const,
        readbackStatus: "verified" as const,
        warnings: [],
        deletedAt: "2026-08-18T20:01:00.000Z"
      },
      metadata: {
        contractVersion: "1.1.0",
        requestId: "delete-01",
        moduleRevision: HASH_B,
        etag: `"${HASH_B}"`,
        idempotencyStatus: "created" as const
      }
    })) as AreaDeleteFacade["commands"]["delete"];
    const areaDeleteFacade = {
      commands: { preview, delete: deleteArea }
    } as AreaDeleteFacade;
    const onAreaDeleted = vi.fn();
    const onAreaWorkspaceStatusChange = vi.fn();

    render(
      <AreaSelectionPanel
        userId="admin-01"
        backendAccessToken="token"
        areaApiPort={areaApiPort}
        areaCreateFacade={areaCreateFacade}
        areaDeleteFacade={areaDeleteFacade}
        canDeleteAreas
        areaListClientCacheRef={{ current: null }}
        trackTelemetryEvent={vi.fn()}
        onAreaSceneSelected={vi.fn()}
        onAreaDeleted={onAreaDeleted}
        onAreaWorkspaceStatusChange={onAreaWorkspaceStatusChange}
      />
    );

    const row = await screen.findByRole("button", { name: /Crypt 01/i });
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", { name: "Preview Area Delete" }));

    const report = await screen.findByLabelText("Area Delete impact preview");
    expect(report).toHaveTextContent("0 blocker(s)");
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({
      areaResRef: "crypt01",
      command: {
        schemaVersion: "area-delete-preview-command.v1",
        moduleId: "module-01",
        areaResRef: "crypt01",
        expectedModuleRevision: HASH_A,
        clientCommandId: expect.stringMatching(/^area-delete-preview-/u)
      }
    }));

    const deleteButton = screen.getByRole("button", { name: "Delete Area atomically" });
    expect(deleteButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirm Area ResRef"), {
      target: { value: "crypt01" }
    });
    expect(deleteButton).toBeEnabled();
    fireEvent.click(deleteButton);

    await waitFor(() => expect(deleteArea).toHaveBeenCalledOnce());
    expect(deleteArea).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: expect.stringMatching(/^area-delete-/u),
      command: {
        schemaVersion: "area-delete-command.v1",
        moduleId: "module-01",
        areaResRef: "crypt01",
        expectedModuleRevision: HASH_A,
        preview: { sha256: HASH_B },
        confirmation: { areaResRef: "crypt01", policy: "block_on_references" },
        clientCommandId: expect.stringMatching(/^area-delete-command-/u)
      }
    }));
    expect(onAreaDeleted).toHaveBeenCalledWith("area_crypt01");
    expect(
      onAreaWorkspaceStatusChange.mock.calls.map(([event]) => [event.lane, event.state, event.action])
    ).toEqual([
      ["materialization", "validating", "delete"],
      ["materialization", "ready", "delete"],
      ["materialization", "materializing", "delete"],
      ["materialization", "verified", "delete"],
    ]);
    expect(screen.queryByText("Crypt 01")).not.toBeInTheDocument();
  });
});

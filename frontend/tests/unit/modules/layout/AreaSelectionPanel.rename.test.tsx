import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AreaCreateFacade } from "../../../../src/modules/areas/application/areaCreateFacade";
import type { AreaRenameFacade } from "../../../../src/modules/areas/application/areaRenameFacade";
import type { AreaApiListItem } from "../../../../src/modules/areas/contracts";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";
import { AreaSelectionPanel } from "../../../../src/modules/layout/components/AreaSelectionPanel";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

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
  updatedAt: "2026-08-24T20:00:00.000Z"
} satisfies AreaApiListItem;

describe("AreaSelectionPanel Area Rename", () => {
  it("requires a source-bound preview and both exact confirmations before atomic rename", async () => {
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
        schemaVersion: "area-rename-preview.v1" as const,
        scanVersion: "area-rename-impact-scan.v1" as const,
        moduleId: "module-01",
        areaResRef: "crypt01",
        targetAreaResRef: "crypt02",
        moduleRevision: HASH_A,
        sourceResources: [
          { logicalKey: "crypt01.are", resourceType: 2012, size: 10, sha256: HASH_A },
          { logicalKey: "crypt01.gic", resourceType: 2046, size: 11, sha256: HASH_B },
          { logicalKey: "crypt01.git", resourceType: 2023, size: 12, sha256: HASH_C }
        ],
        targetResourceKeys: ["crypt02.are", "crypt02.gic", "crypt02.git"],
        moduleIfo: { logicalKey: "module.ifo", resourceType: 2014, size: 20, sha256: HASH_A },
        sourceAreaRootResRef: "crypt01",
        oldMembershipCount: 1,
        newMembershipCount: 0,
        entryAreaResRef: "crypt01",
        entryAreaUpdated: true,
        scanBudgets: { maxObjects: 100, maxObjectBytes: 1024, maxTotalBytes: 4096, maxFindings: 256 },
        findings: [],
        blockerCount: 0,
        warningCount: 0,
        previewSha256: HASH_B,
        expiresAt: "2099-08-24T20:05:00.000Z"
      },
      metadata: {
        contractVersion: "1.1.0",
        requestId: "preview-01",
        moduleRevision: HASH_A,
        etag: `"${HASH_A}"`
      }
    })) as AreaRenameFacade["commands"]["preview"];
    const rename = vi.fn(async () => ({
      ok: true as const,
      value: {
        schemaVersion: "area-rename-receipt.v1" as const,
        transactionId: "transaction-01",
        moduleId: "module-01",
        areaResRef: "crypt01",
        targetAreaResRef: "crypt02",
        previousModuleRevision: HASH_A,
        newModuleRevision: HASH_C,
        commandHash: HASH_A,
        previewSha256: HASH_B,
        scanVersion: "area-rename-impact-scan.v1" as const,
        resources: (["are", "gic", "git"] as const).map((extension, index) => ({
          extension,
          sourceKey: `crypt01.${extension}`,
          targetKey: `crypt02.${extension}`,
          resourceType: [2012, 2046, 2023][index]!,
          baselineSize: 10 + index,
          baselineSha256: HASH_A,
          candidateSize: 10 + index,
          candidateSha256: HASH_B
        })),
        moduleIfo: {
          key: "module.ifo" as const,
          baselineSize: 20,
          baselineSha256: HASH_A,
          candidateSize: 21,
          candidateSha256: HASH_B
        },
        entryAreaUpdated: true,
        blockerCount: 0 as const,
        warningCount: 0,
        readbackStatus: "verified" as const,
        warnings: [],
        renamedAt: "2026-08-24T20:01:00.000Z"
      },
      metadata: {
        contractVersion: "1.1.0",
        requestId: "rename-01",
        moduleRevision: HASH_C,
        etag: `"${HASH_C}"`,
        idempotencyStatus: "created" as const
      }
    })) as AreaRenameFacade["commands"]["rename"];
    const areaRenameFacade = { commands: { preview, rename } } as AreaRenameFacade;
    const onAreaRenamed = vi.fn();
    const onAreaWorkspaceStatusChange = vi.fn();

    render(
      <AreaSelectionPanel
        userId="admin-01"
        backendAccessToken="token"
        areaApiPort={areaApiPort}
        areaCreateFacade={areaCreateFacade}
        areaRenameFacade={areaRenameFacade}
        canRenameAreas
        areaListClientCacheRef={{ current: null }}
        trackTelemetryEvent={vi.fn()}
        onAreaSceneSelected={vi.fn()}
        onAreaRenamed={onAreaRenamed}
        onAreaWorkspaceStatusChange={onAreaWorkspaceStatusChange}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: /Crypt 01/i }));
    fireEvent.change(screen.getByLabelText("New Area ResRef"), {
      target: { value: "crypt02" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview Area Rename" }));

    const report = await screen.findByLabelText("Area Rename impact preview");
    expect(report).toHaveTextContent("0 blocker(s)");
    expect(preview).toHaveBeenCalledWith(expect.objectContaining({
      areaResRef: "crypt01",
      command: {
        schemaVersion: "area-rename-preview-command.v1",
        moduleId: "module-01",
        areaResRef: "crypt01",
        targetAreaResRef: "crypt02",
        expectedModuleRevision: HASH_A,
        clientCommandId: expect.stringMatching(/^area-rename-preview-/u)
      }
    }));

    const renameButton = screen.getByRole("button", { name: "Rename Area atomically" });
    expect(renameButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirm source Area ResRef"), {
      target: { value: "crypt01" }
    });
    expect(renameButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirm target Area ResRef"), {
      target: { value: "crypt02" }
    });
    expect(renameButton).toBeEnabled();
    fireEvent.click(renameButton);

    await waitFor(() => expect(rename).toHaveBeenCalledOnce());
    expect(rename).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: expect.stringMatching(/^area-rename-/u),
      command: {
        schemaVersion: "area-rename-command.v1",
        moduleId: "module-01",
        areaResRef: "crypt01",
        targetAreaResRef: "crypt02",
        expectedModuleRevision: HASH_A,
        preview: { sha256: HASH_B },
        confirmation: {
          sourceAreaResRef: "crypt01",
          targetAreaResRef: "crypt02",
          policy: "block_on_references"
        },
        clientCommandId: expect.stringMatching(/^area-rename-command-/u)
      }
    }));
    expect(onAreaRenamed).toHaveBeenCalledWith("area_crypt01", "area_crypt02", HASH_C);
    expect(screen.getByRole("button", { name: /Crypt 01/i })).toHaveAttribute(
      "data-area-id",
      "area_crypt02"
    );
    expect(
      onAreaWorkspaceStatusChange.mock.calls.map(([event]) => [event.lane, event.state, event.action])
    ).toEqual([
      ["materialization", "validating", "rename"],
      ["materialization", "ready", "rename"],
      ["materialization", "materializing", "rename"],
      ["materialization", "verified", "rename"]
    ]);
  });
});

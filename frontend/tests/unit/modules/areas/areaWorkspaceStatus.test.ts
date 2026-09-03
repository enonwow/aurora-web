import { describe, expect, it } from "vitest";

import {
  createAreaWorkspaceStatusSnapshot,
  reduceAreaWorkspaceStatus,
} from "../../../../src/modules/areas/application/areaWorkspaceStatus";

describe("Area workspace status", () => {
  it("keeps draft, verification, materialization and certification as independent lanes", () => {
    const initial = createAreaWorkspaceStatusSnapshot("area_keep", 10, 100);
    const saving = reduceAreaWorkspaceStatus(initial, {
      schemaVersion: "area-workspace-status.v1",
      lane: "draft",
      state: "saving",
      sceneId: "area_keep",
      commandRevision: 4,
      occurredAtUnixMs: 20,
      browserRecoveryAvailable: true,
      destination: "remote",
      sceneUpdatedAtUnixMs: 100,
    });
    const verified = reduceAreaWorkspaceStatus(saving, {
      schemaVersion: "area-workspace-status.v1",
      lane: "verification",
      state: "verified",
      sceneId: "area_keep",
      occurredAtUnixMs: 21,
    });
    const materializing = reduceAreaWorkspaceStatus(verified, {
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "materializing",
      sceneId: "area_keep",
      occurredAtUnixMs: 22,
      action: "update",
    });
    const certified = reduceAreaWorkspaceStatus(materializing, {
      schemaVersion: "area-workspace-status.v1",
      lane: "certification",
      state: "ready",
      sceneId: "area_keep",
      occurredAtUnixMs: 23,
      tilesetResRef: "tno01",
    });

    expect(certified).toMatchObject({
      sceneId: "area_keep",
      draft: { state: "saving", commandRevision: 4 },
      verification: { state: "verified" },
      materialization: { state: "materializing", action: "update" },
      certification: { state: "ready", tilesetResRef: "tno01" },
    });
  });

  it("ignores stale or foreign events instead of regressing visible state", () => {
    const initial = createAreaWorkspaceStatusSnapshot("area_keep", 10, 100);
    const saved = reduceAreaWorkspaceStatus(initial, {
      schemaVersion: "area-workspace-status.v1",
      lane: "draft",
      state: "saved",
      sceneId: "area_keep",
      commandRevision: 5,
      occurredAtUnixMs: 30,
      browserRecoveryAvailable: true,
      destination: "remote",
      revision: 8,
      sceneUpdatedAtUnixMs: 100,
    });
    const stale = reduceAreaWorkspaceStatus(saved, {
      schemaVersion: "area-workspace-status.v1",
      lane: "draft",
      state: "conflict",
      sceneId: "area_keep",
      commandRevision: 4,
      occurredAtUnixMs: 40,
      browserRecoveryAvailable: true,
      destination: "remote",
      sceneUpdatedAtUnixMs: 100,
    });
    const foreign = reduceAreaWorkspaceStatus(stale, {
      schemaVersion: "area-workspace-status.v1",
      lane: "verification",
      state: "failed",
      sceneId: "area_other",
      occurredAtUnixMs: 50,
    });

    expect(foreign).toBe(saved);
  });

  it("rejects completion of an older scene save after newer edits made the draft dirty", () => {
    const dirtyAfterEdit = createAreaWorkspaceStatusSnapshot("area_keep", 30, 200);
    const staleCompletion = reduceAreaWorkspaceStatus(dirtyAfterEdit, {
      schemaVersion: "area-workspace-status.v1",
      lane: "draft",
      state: "saved",
      sceneId: "area_keep",
      sceneUpdatedAtUnixMs: 100,
      commandRevision: 9,
      occurredAtUnixMs: 40,
      browserRecoveryAvailable: true,
      destination: "remote",
      revision: 8,
    });

    expect(staleCompletion).toBe(dirtyAfterEdit);
    expect(staleCompletion.draft.state).toBe("dirty");
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  createAreaLifecycleFacade,
  type AreaLifecycleFacade
} from "../../../../src/modules/areas/application/areaLifecycleFacade";
import type {
  AreaDraftListQuery,
  AreaDraftSnapshot,
  AreaLifecycleCommandPort,
  AreaLifecycleMetadata,
  AreaLifecycleQueryPort,
  AreaLifecycleResult,
  AreaMaterializationCommand,
  AreaMaterializationReceipt,
  DeleteLocalAreaDraftCommand,
  DeletedLocalAreaDraft,
  OpenProductionAreaAsDraftCommand,
  OpenLocalAreaDraftQuery,
  SaveLocalAreaDraftCommand
} from "../../../../src/modules/areas/ports/areaLifecyclePort";

interface TestDraftPayload {
  readonly title: string;
  readonly tileIds: readonly number[];
}

interface TestPorts {
  readonly queryPort: AreaLifecycleQueryPort<TestDraftPayload>;
  readonly commandPort: AreaLifecycleCommandPort<TestDraftPayload>;
  readonly listLocalDrafts: ReturnType<typeof vi.fn<AreaLifecycleQueryPort<TestDraftPayload>["listLocalDrafts"]>>;
  readonly openLocalDraft: ReturnType<typeof vi.fn<AreaLifecycleQueryPort<TestDraftPayload>["openLocalDraft"]>>;
  readonly saveLocalDraft: ReturnType<typeof vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["saveLocalDraft"]>>;
  readonly openProductionAreaAsDraft: ReturnType<typeof vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["openProductionAreaAsDraft"]>>;
  readonly deleteLocalDraft: ReturnType<typeof vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["deleteLocalDraft"]>>;
  readonly materializeArea: ReturnType<typeof vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["materializeArea"]>>;
}

const metadata: AreaLifecycleMetadata = {
  contractVersion: "1.1.0",
  schemaVersion: "area-draft.v1",
  requestId: "req_area_01",
  revision: 8,
  etag: 'W/"drf_01-r8"',
  commandId: "cmd_area_01",
  idempotencyKey: "idem_area_01",
  proof: {
    status: "verified",
    planId: "area-plan-01",
    artifactIds: ["artifact-readback-01"],
    sourceHashes: {
      are: "sha256:are-01",
      git: "sha256:git-01",
      gic: "sha256:gic-01"
    }
  }
};

const snapshot: AreaDraftSnapshot<TestDraftPayload> = {
  draftId: "drf_01",
  title: "Crypt working copy",
  revision: 8,
  updatedAt: "2026-08-07T08:00:00.000Z",
  normalizedSha256: "a".repeat(64),
  draft: {
    title: "Crypt",
    tileIds: [1, 2, 3, 4]
  }
};

function createPorts(): TestPorts {
  const listLocalDrafts = vi.fn<AreaLifecycleQueryPort<TestDraftPayload>["listLocalDrafts"]>();
  const openLocalDraft = vi.fn<AreaLifecycleQueryPort<TestDraftPayload>["openLocalDraft"]>();
  const saveLocalDraft = vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["saveLocalDraft"]>();
  const openProductionAreaAsDraft = vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["openProductionAreaAsDraft"]>();
  const deleteLocalDraft = vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["deleteLocalDraft"]>();
  const materializeArea = vi.fn<AreaLifecycleCommandPort<TestDraftPayload>["materializeArea"]>();

  return {
    queryPort: {
      listLocalDrafts,
      openLocalDraft
    },
    commandPort: {
      openProductionAreaAsDraft,
      saveLocalDraft,
      deleteLocalDraft,
      materializeArea
    },
    listLocalDrafts,
    openLocalDraft,
    saveLocalDraft,
    openProductionAreaAsDraft,
    deleteLocalDraft,
    materializeArea
  };
}

function createFacade(ports: TestPorts): AreaLifecycleFacade<TestDraftPayload> {
  return createAreaLifecycleFacade({
    queryPort: ports.queryPort,
    commandPort: ports.commandPort
  });
}

describe("areaLifecycleFacade", () => {
  it("opens a production Area through the mutation boundary", async () => {
    const ports = createPorts();
    const facade = createFacade(ports);
    const command: OpenProductionAreaAsDraftCommand = {
      schemaVersion: "area-draft-open.v1",
      areaId: "area_crypt01",
      draftTitle: "Crypt working copy",
      idempotencyKey: "open-copy-01"
    };
    const result: AreaLifecycleResult<AreaDraftSnapshot<TestDraftPayload>> = {
      ok: true,
      value: snapshot,
      metadata
    };
    ports.openProductionAreaAsDraft.mockResolvedValue(result);

    await expect(facade.commands.openProductionAreaAsDraft(command)).resolves.toBe(result);
    expect(ports.openProductionAreaAsDraft).toHaveBeenCalledWith(command);
    expect(ports.saveLocalDraft).not.toHaveBeenCalled();
  });

  it("keeps local-draft list and open operations on the query boundary", async () => {
    const ports = createPorts();
    const facade = createFacade(ports);
    const listQuery: AreaDraftListQuery = {
      cursor: "cursor_01",
      pageSize: 25
    };
    const listResult: AreaLifecycleResult<{
      readonly items: readonly [];
      readonly nextCursor: null;
    }> = {
      ok: true,
      value: {
        items: [],
        nextCursor: null
      },
      metadata
    };
    ports.listLocalDrafts.mockResolvedValue(listResult);

    await expect(facade.queries.listLocalDrafts(listQuery)).resolves.toBe(listResult);
    expect(ports.listLocalDrafts).toHaveBeenCalledWith(listQuery);
    expect(ports.saveLocalDraft).not.toHaveBeenCalled();

    const openQuery: OpenLocalAreaDraftQuery = {
      draftId: "drf_01",
      revision: 8
    };
    const openResult: AreaLifecycleResult<AreaDraftSnapshot<TestDraftPayload>> = {
      ok: true,
      value: snapshot,
      metadata
    };
    ports.openLocalDraft.mockResolvedValue(openResult);

    await expect(facade.queries.openLocalDraft(openQuery)).resolves.toBe(openResult);
    expect(ports.openLocalDraft).toHaveBeenCalledWith(openQuery);
    expect(ports.deleteLocalDraft).not.toHaveBeenCalled();
  });

  it("saves only through the command boundary and preserves revision, idempotency, and proof metadata", async () => {
    const ports = createPorts();
    const facade = createFacade(ports);
    const command: SaveLocalAreaDraftCommand<TestDraftPayload> = {
      draftId: "drf_01",
      expectedRevision: 7,
      idempotencyKey: "idem_save_01",
      schemaVersion: "area-draft.v1",
      draft: snapshot.draft
    };
    const result: AreaLifecycleResult<AreaDraftSnapshot<TestDraftPayload>> = {
      ok: true,
      value: snapshot,
      metadata
    };
    ports.saveLocalDraft.mockResolvedValue(result);

    await expect(facade.commands.saveLocalDraft(command)).resolves.toBe(result);
    expect(ports.saveLocalDraft).toHaveBeenCalledWith(command);
    expect(ports.listLocalDrafts).not.toHaveBeenCalled();
    expect(result.metadata).toBe(metadata);
    expect(result.metadata.proof).toEqual({
      status: "verified",
      planId: "area-plan-01",
      artifactIds: ["artifact-readback-01"],
      sourceHashes: {
        are: "sha256:are-01",
        git: "sha256:git-01",
        gic: "sha256:gic-01"
      }
    });
  });

  it("propagates a stale revision failure unchanged and without retry ambiguity", async () => {
    const ports = createPorts();
    const facade = createFacade(ports);
    const command: SaveLocalAreaDraftCommand<TestDraftPayload> = {
      draftId: "drf_01",
      expectedRevision: 7,
      idempotencyKey: "idem_stale_01",
      schemaVersion: "area-draft.v1",
      draft: snapshot.draft
    };
    const staleResult: AreaLifecycleResult<AreaDraftSnapshot<TestDraftPayload>> = {
      ok: false,
      error: {
        code: "STALE_REVISION",
        operation: "save_local_draft",
        message: "The requested draft revision is stale.",
        retryable: false,
        recovery: "reload_draft",
        expectedRevision: 7,
        actualRevision: 8,
        details: []
      },
      metadata: {
        ...metadata,
        revision: 8
      }
    };
    ports.saveLocalDraft.mockResolvedValue(staleResult);

    const result = await facade.commands.saveLocalDraft(command);

    expect(result).toBe(staleResult);
    expect(result).toEqual(staleResult);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: "STALE_REVISION",
        retryable: false,
        recovery: "reload_draft",
        expectedRevision: 7,
        actualRevision: 8
      });
    }
  });

  it("deletes a local draft with an expected revision and idempotency key", async () => {
    const ports = createPorts();
    const facade = createFacade(ports);
    const command: DeleteLocalAreaDraftCommand = {
      draftId: "drf_01",
      expectedRevision: 8,
      idempotencyKey: "idem_delete_01"
    };
    const deleted: DeletedLocalAreaDraft = {
      draftId: "drf_01",
      deletedRevision: 8,
      deleted: true
    };
    const result: AreaLifecycleResult<DeletedLocalAreaDraft> = {
      ok: true,
      value: deleted,
      metadata
    };
    ports.deleteLocalDraft.mockResolvedValue(result);

    await expect(facade.commands.deleteLocalDraft(command)).resolves.toBe(result);
    expect(ports.deleteLocalDraft).toHaveBeenCalledWith(command);
  });

  it.each<{
    readonly label: string;
    readonly command: AreaMaterializationCommand;
  }>([
    {
      label: "create",
      command: {
        action: "create",
        draftId: "drf_01",
        expectedDraftRevision: 8,
        targetModuleId: "module_01",
        expectedTargetRevision: "sha256:module-before",
        idempotencyKey: "idem_materialize_create_01"
      }
    },
    {
      label: "update",
      command: {
        action: "update",
        areaId: "area_01",
        draftId: "drf_01",
        expectedDraftRevision: 8,
        targetModuleId: "module_01",
        expectedTargetRevision: "sha256:module-before",
        idempotencyKey: "idem_materialize_update_01"
      }
    },
    {
      label: "delete",
      command: {
        action: "delete",
        areaId: "area_01",
        targetModuleId: "module_01",
        expectedTargetRevision: "sha256:module-before",
        idempotencyKey: "idem_materialize_delete_01"
      }
    }
  ])("passes the privileged $label materialization command through the command boundary", async ({ command }) => {
    const ports = createPorts();
    const facade = createFacade(ports);
    const receipt: AreaMaterializationReceipt = {
      materializationId: `materialization_${command.action}_01`,
      action: command.action,
      targetModuleId: command.targetModuleId,
      status: "accepted"
    };
    const result: AreaLifecycleResult<AreaMaterializationReceipt> = {
      ok: true,
      value: receipt,
      metadata
    };
    ports.materializeArea.mockResolvedValue(result);

    await expect(facade.commands.materializeArea(command)).resolves.toBe(result);
    expect(ports.materializeArea).toHaveBeenCalledWith(command);
    expect(ports.openLocalDraft).not.toHaveBeenCalled();
  });

  it("normalizes an unexpected port exception into the same deterministic failure on every call", async () => {
    const ports = createPorts();
    const facade = createFacade(ports);
    const query: OpenLocalAreaDraftQuery = {
      draftId: "drf_01",
      revision: 8
    };
    ports.openLocalDraft
      .mockRejectedValueOnce(new Error("socket path and secret details"))
      .mockRejectedValueOnce("different rejection shape");

    const first = await facade.queries.openLocalDraft(query);
    const second = await facade.queries.openLocalDraft(query);
    const expected = {
      ok: false,
      error: {
        code: "PORT_FAILURE",
        operation: "open_local_draft",
        message: "The Area lifecycle port failed before returning a contract result.",
        retryable: true,
        recovery: "retry",
        details: []
      }
    };

    expect(first).toEqual(expected);
    expect(second).toEqual(expected);
    expect(JSON.stringify(first)).not.toContain("socket");
  });

  it("classifies unexpected list, save, and delete failures by their exact operation", async () => {
    const ports = createPorts();
    const facade = createFacade(ports);
    ports.listLocalDrafts.mockRejectedValue(new Error("list failed"));
    ports.saveLocalDraft.mockRejectedValue(new Error("save failed"));
    ports.deleteLocalDraft.mockRejectedValue(new Error("delete failed"));

    const listResult = await facade.queries.listLocalDrafts({ pageSize: 10 });
    const saveResult = await facade.commands.saveLocalDraft({
      draftId: "drf_01",
      expectedRevision: 8,
      idempotencyKey: "idem_save_failure_01",
      schemaVersion: "area-draft.v1",
      draft: snapshot.draft
    });
    const deleteResult = await facade.commands.deleteLocalDraft({
      draftId: "drf_01",
      expectedRevision: 8,
      idempotencyKey: "idem_delete_failure_01"
    });

    expect(listResult).toMatchObject({
      ok: false,
      error: { code: "PORT_FAILURE", operation: "list_local_drafts" }
    });
    expect(saveResult).toMatchObject({
      ok: false,
      error: { code: "PORT_FAILURE", operation: "save_local_draft" }
    });
    expect(deleteResult).toMatchObject({
      ok: false,
      error: { code: "PORT_FAILURE", operation: "delete_local_draft" }
    });
  });

  it.each<{
    readonly command: AreaMaterializationCommand;
    readonly expectedOperation:
      | "materialize_create"
      | "materialize_update"
      | "materialize_delete";
  }>([
    {
      command: {
        action: "create",
        draftId: "drf_01",
        expectedDraftRevision: 8,
        targetModuleId: "module_01",
        expectedTargetRevision: "sha256:module-before",
        idempotencyKey: "idem_create_failure_01"
      },
      expectedOperation: "materialize_create"
    },
    {
      command: {
        action: "update",
        areaId: "area_01",
        draftId: "drf_01",
        expectedDraftRevision: 8,
        targetModuleId: "module_01",
        expectedTargetRevision: "sha256:module-before",
        idempotencyKey: "idem_update_failure_01"
      },
      expectedOperation: "materialize_update"
    },
    {
      command: {
        action: "delete",
        areaId: "area_01",
        targetModuleId: "module_01",
        expectedTargetRevision: "sha256:module-before",
        idempotencyKey: "idem_delete_materialization_failure_01"
      },
      expectedOperation: "materialize_delete"
    }
  ])(
    "classifies an unexpected $expectedOperation exception deterministically",
    async ({ command, expectedOperation }) => {
      const ports = createPorts();
      const facade = createFacade(ports);
      ports.materializeArea.mockRejectedValue(new Error("sensitive adapter failure"));

      const result = await facade.commands.materializeArea(command);

      expect(result).toMatchObject({
        ok: false,
        error: {
          code: "PORT_FAILURE",
          operation: expectedOperation,
          retryable: true,
          recovery: "retry"
        }
      });
    }
  );
});

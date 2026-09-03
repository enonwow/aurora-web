import type {
  AreaDraftList,
  AreaDraftListQuery,
  AreaDraftSnapshot,
  AreaLifecycleCommandPort,
  AreaLifecycleOperation,
  AreaLifecycleQueryPort,
  AreaLifecycleResult,
  AreaMaterializationCommand,
  AreaMaterializationReceipt,
  DeleteLocalAreaDraftCommand,
  DeletedLocalAreaDraft,
  OpenLocalAreaDraftQuery,
  OpenProductionAreaAsDraftCommand,
  SaveLocalAreaDraftCommand
} from "../ports/areaLifecyclePort";

export interface AreaLifecycleQueryFacade<TDraft = unknown> {
  listLocalDrafts(query: AreaDraftListQuery): Promise<AreaLifecycleResult<AreaDraftList>>;
  openLocalDraft(
    query: OpenLocalAreaDraftQuery
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>>;
}

export interface AreaLifecycleCommandFacade<TDraft = unknown> {
  openProductionAreaAsDraft(
    command: OpenProductionAreaAsDraftCommand
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>>;
  saveLocalDraft(
    command: SaveLocalAreaDraftCommand<TDraft>
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>>;
  deleteLocalDraft(
    command: DeleteLocalAreaDraftCommand
  ): Promise<AreaLifecycleResult<DeletedLocalAreaDraft>>;
  materializeArea(
    command: AreaMaterializationCommand
  ): Promise<AreaLifecycleResult<AreaMaterializationReceipt>>;
}

export interface AreaLifecycleFacade<TDraft = unknown> {
  readonly queries: AreaLifecycleQueryFacade<TDraft>;
  readonly commands: AreaLifecycleCommandFacade<TDraft>;
}

export interface AreaLifecycleFacadeDependencies<TDraft = unknown> {
  readonly queryPort: AreaLifecycleQueryPort<TDraft>;
  readonly commandPort: AreaLifecycleCommandPort<TDraft>;
}

function unexpectedPortFailure<TValue>(
  operation: AreaLifecycleOperation
): AreaLifecycleResult<TValue> {
  return {
    ok: false,
    error: {
      code: "PORT_FAILURE",
      operation,
      message: "The Area lifecycle port failed before returning a contract result.",
      retryable: true,
      recovery: "retry",
      details: []
    }
  };
}

async function callPort<TValue>(
  operation: AreaLifecycleOperation,
  invoke: () => Promise<AreaLifecycleResult<TValue>>
): Promise<AreaLifecycleResult<TValue>> {
  try {
    return await invoke();
  } catch {
    return unexpectedPortFailure(operation);
  }
}

function materializationOperation(
  command: AreaMaterializationCommand
): AreaLifecycleOperation {
  switch (command.action) {
    case "create":
      return "materialize_create";
    case "update":
      return "materialize_update";
    case "delete":
      return "materialize_delete";
  }
}

export function createAreaLifecycleFacade<TDraft = unknown>({
  queryPort,
  commandPort
}: AreaLifecycleFacadeDependencies<TDraft>): AreaLifecycleFacade<TDraft> {
  return {
    queries: {
      listLocalDrafts(query) {
        return callPort("list_local_drafts", () => queryPort.listLocalDrafts(query));
      },
      openLocalDraft(query) {
        return callPort("open_local_draft", () => queryPort.openLocalDraft(query));
      }
    },
    commands: {
      openProductionAreaAsDraft(command) {
        return callPort("open_production_area_as_draft", () =>
          commandPort.openProductionAreaAsDraft(command)
        );
      },
      saveLocalDraft(command) {
        return callPort("save_local_draft", () => commandPort.saveLocalDraft(command));
      },
      deleteLocalDraft(command) {
        return callPort("delete_local_draft", () => commandPort.deleteLocalDraft(command));
      },
      materializeArea(command) {
        return callPort(materializationOperation(command), () =>
          commandPort.materializeArea(command)
        );
      }
    }
  };
}

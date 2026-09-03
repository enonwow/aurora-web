import type { AreaDeletePreview, AreaDeleteReceipt } from "../areaDeleteContracts";
import type {
  AreaDeleteApiOperation,
  AreaDeleteApiPort,
  AreaDeleteApiResult,
  AreaDeleteMutationInput,
  AreaDeletePreviewInput
} from "../ports/areaDeleteApiPort";

export interface AreaDeleteFacade {
  readonly commands: Readonly<{
    preview(input: AreaDeletePreviewInput): Promise<AreaDeleteApiResult<AreaDeletePreview>>;
    delete(input: AreaDeleteMutationInput): Promise<AreaDeleteApiResult<AreaDeleteReceipt>>;
  }>;
}

function unexpectedPortFailure<TValue>(
  operation: AreaDeleteApiOperation
): AreaDeleteApiResult<TValue> {
  return {
    ok: false,
    error: {
      code: "AREA_DELETE_TRANSPORT_FAILED",
      operation,
      status: null,
      message: "The Area Delete port failed before returning a contract result.",
      retryable: true,
      details: []
    }
  };
}

async function callPort<TValue>(
  operation: AreaDeleteApiOperation,
  invoke: () => Promise<AreaDeleteApiResult<TValue>>
): Promise<AreaDeleteApiResult<TValue>> {
  try {
    return await invoke();
  } catch {
    return unexpectedPortFailure(operation);
  }
}

export function createAreaDeleteFacade(port: AreaDeleteApiPort): AreaDeleteFacade {
  return {
    commands: {
      preview(input) {
        return callPort("preview_delete", () => port.preview(input));
      },
      delete(input) {
        return callPort("delete_area", () => port.delete(input));
      }
    }
  };
}

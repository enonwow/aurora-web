import type {
  AreaUpdateReceipt,
  AreaUpdateValidationReceipt
} from "../areaUpdateContracts";
import type {
  AreaUpdateApiOperation,
  AreaUpdateApiPort,
  AreaUpdateApiResult,
  AreaUpdateMutationInput,
  AreaUpdateValidationInput
} from "../ports/areaUpdateApiPort";

export interface AreaUpdateFacade {
  readonly commands: Readonly<{
    validate(
      input: AreaUpdateValidationInput
    ): Promise<AreaUpdateApiResult<AreaUpdateValidationReceipt>>;
    update(input: AreaUpdateMutationInput): Promise<AreaUpdateApiResult<AreaUpdateReceipt>>;
  }>;
}

function unexpectedPortFailure<TValue>(
  operation: AreaUpdateApiOperation
): AreaUpdateApiResult<TValue> {
  return {
    ok: false,
    error: {
      code: "AREA_UPDATE_TRANSPORT_FAILED",
      operation,
      status: null,
      message: "The Area Update port failed before returning a contract result.",
      retryable: true,
      details: []
    }
  };
}

async function callPort<TValue>(
  operation: AreaUpdateApiOperation,
  invoke: () => Promise<AreaUpdateApiResult<TValue>>
): Promise<AreaUpdateApiResult<TValue>> {
  try {
    return await invoke();
  } catch {
    return unexpectedPortFailure(operation);
  }
}

export function createAreaUpdateFacade(port: AreaUpdateApiPort): AreaUpdateFacade {
  return {
    commands: {
      validate(input) {
        return callPort("validate_update", () => port.validate(input));
      },
      update(input) {
        return callPort("update_area", () => port.update(input));
      }
    }
  };
}

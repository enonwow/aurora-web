import type {
  AreaCreateApiPort,
  AreaCreateApiResult,
  AreaCreateMutationInput,
  AreaCreateValidationInput
} from "../ports/areaCreateApiPort";
import type {
  AreaCreateExecution,
  AreaCreateProfileCatalog,
  AreaCreateValidationReceipt
} from "../areaCreateContracts";

export interface AreaCreateQueryFacade {
  getProfiles(accessToken: string): Promise<AreaCreateApiResult<AreaCreateProfileCatalog>>;
}

export interface AreaCreateCommandFacade {
  validate(
    input: AreaCreateValidationInput
  ): Promise<AreaCreateApiResult<AreaCreateValidationReceipt>>;
  create(input: AreaCreateMutationInput): Promise<AreaCreateApiResult<AreaCreateExecution>>;
}

export interface AreaCreateFacade {
  readonly queries: AreaCreateQueryFacade;
  readonly commands: AreaCreateCommandFacade;
}

function unexpectedPortFailure<TValue>(
  operation: "get_profiles" | "validate_candidate" | "create_area"
): AreaCreateApiResult<TValue> {
  return {
    ok: false,
    error: {
      code: "AREA_CREATE_TRANSPORT_FAILED",
      operation,
      status: null,
      message: "The Area Create port failed before returning a contract result.",
      retryable: true,
      details: []
    }
  };
}

async function callPort<TValue>(
  operation: "get_profiles" | "validate_candidate" | "create_area",
  invoke: () => Promise<AreaCreateApiResult<TValue>>
): Promise<AreaCreateApiResult<TValue>> {
  try {
    return await invoke();
  } catch {
    return unexpectedPortFailure(operation);
  }
}

export function createAreaCreateFacade(port: AreaCreateApiPort): AreaCreateFacade {
  return {
    queries: {
      getProfiles(accessToken) {
        return callPort("get_profiles", () => port.getProfiles(accessToken));
      }
    },
    commands: {
      validate(input) {
        return callPort("validate_candidate", () => port.validate(input));
      },
      create(input) {
        return callPort("create_area", () => port.create(input));
      }
    }
  };
}

import type { AreaRenamePreview, AreaRenameReceipt } from "../areaRenameContracts";
import type {
  AreaRenameApiOperation,
  AreaRenameApiPort,
  AreaRenameApiResult,
  AreaRenameMutationInput,
  AreaRenamePreviewInput
} from "../ports/areaRenameApiPort";

export interface AreaRenameFacade {
  readonly commands: Readonly<{
    preview(input: AreaRenamePreviewInput): Promise<AreaRenameApiResult<AreaRenamePreview>>;
    rename(input: AreaRenameMutationInput): Promise<AreaRenameApiResult<AreaRenameReceipt>>;
  }>;
}

async function callPort<T>(
  operation: AreaRenameApiOperation,
  invoke: () => Promise<AreaRenameApiResult<T>>
): Promise<AreaRenameApiResult<T>> {
  try {
    return await invoke();
  } catch {
    return {
      ok: false,
      error: {
        code: "AREA_RENAME_TRANSPORT_FAILED",
        operation,
        status: null,
        message: "The Area rename port failed before returning a contract result.",
        retryable: true,
        details: []
      }
    };
  }
}

export function createAreaRenameFacade(port: AreaRenameApiPort): AreaRenameFacade {
  return {
    commands: {
      preview: (input) => callPort("preview_rename", () => port.preview(input)),
      rename: (input) => callPort("rename_area", () => port.rename(input))
    }
  };
}

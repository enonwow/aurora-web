import type { AreaCapabilityCatalog } from "../domain/areaCapabilityCatalog";
import type { AreaCapabilityPort } from "../ports/areaCapabilityPort";

export type AreaCapabilityQueryResult =
  | Readonly<{ ok: true; value: AreaCapabilityCatalog }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: "PORT_FAILURE";
        message: string;
        retryable: true;
      }>;
    }>;

export interface AreaCapabilityFacade {
  load(accessToken: string): Promise<AreaCapabilityQueryResult>;
}

export function createAreaCapabilityFacade(port: AreaCapabilityPort): AreaCapabilityFacade {
  return Object.freeze({
    async load(accessToken: string): Promise<AreaCapabilityQueryResult> {
      try {
        return { ok: true, value: await port.getAreaCapabilities(accessToken) };
      } catch {
        return {
          ok: false,
          error: {
            code: "PORT_FAILURE",
            message: "The Area capability catalog could not be loaded.",
            retryable: true,
          },
        };
      }
    },
  });
}

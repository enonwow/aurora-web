import type { IAuthFacade } from "../contracts";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";
import { createMockAuthFacade } from "./createMockAuthFacade";

export interface AppDependencies {
  authFacade: IAuthFacade;
  telemetryFacade: TelemetryFacade;
}

export function createBrowserAppDependencies(): AppDependencies {
  const telemetryFacade = browserTelemetryFacade;
  return {
    telemetryFacade,
    authFacade: createMockAuthFacade({ telemetryFacade })
  };
}

export const browserAppDependencies = createBrowserAppDependencies();

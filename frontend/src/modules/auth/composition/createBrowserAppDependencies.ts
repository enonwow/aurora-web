import type { IAuthFacade } from "../contracts";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";
import { createMockAuthFacade } from "./createMockAuthFacade";
import { createHttpBackendAuthFacade } from "../adapters/httpBackendAuthFacade";

export interface AppDependencies {
  authFacade: IAuthFacade;
  telemetryFacade: TelemetryFacade;
}

export function createBrowserAppDependencies(): AppDependencies {
  const telemetryFacade = browserTelemetryFacade;
  const isTestMode = import.meta.env.MODE === "test";
  return {
    telemetryFacade,
    authFacade: isTestMode
      ? createMockAuthFacade({ telemetryFacade })
      : createHttpBackendAuthFacade({ telemetryFacade })
  };
}

export const browserAppDependencies = createBrowserAppDependencies();

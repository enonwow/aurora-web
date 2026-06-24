import type { IAuthFacade } from "../contracts";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";
import { isVitestRuntime } from "../application/authRuntimeEnvironment";
import { createMockAuthFacade } from "./createMockAuthFacade";
import { createHttpBackendAuthFacade } from "../adapters/httpBackendAuthFacade";

export interface AppDependencies {
  authFacade: IAuthFacade;
  telemetryFacade: TelemetryFacade;
}

export function createBrowserAppDependencies(): AppDependencies {
  const telemetryFacade = browserTelemetryFacade;
  const useMockAuth = isVitestRuntime();
  return {
    telemetryFacade,
    authFacade: useMockAuth
      ? createMockAuthFacade({ telemetryFacade })
      : createHttpBackendAuthFacade({ telemetryFacade })
  };
}

export const browserAppDependencies = createBrowserAppDependencies();

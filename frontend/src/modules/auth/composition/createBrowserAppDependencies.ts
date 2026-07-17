import type { IAuthFacade } from "../contracts";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";
import { isVitestRuntime } from "../application/authRuntimeEnvironment";
import { createTestAuthFacade } from "./createTestAuthFacade";
import { createHttpBackendAuthFacade } from "../adapters/httpBackendAuthFacade";

export interface AppDependencies {
  authFacade: IAuthFacade;
  telemetryFacade: TelemetryFacade;
}

export function createBrowserAppDependencies(): AppDependencies {
  const telemetryFacade = browserTelemetryFacade;
  const useTestAuth = isVitestRuntime();
  return {
    telemetryFacade,
    authFacade: useTestAuth
      ? createTestAuthFacade({ telemetryFacade })
      : createHttpBackendAuthFacade({ telemetryFacade })
  };
}

export const browserAppDependencies = createBrowserAppDependencies();

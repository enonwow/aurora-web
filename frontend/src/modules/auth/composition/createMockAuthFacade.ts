import type { IAuthFacade } from "../contracts";
import { createAuthFacade } from "../application/authFacade";
import { createAuthBenchmarkRecorderPort } from "../adapters/authBenchmarkRecorderPort";
import { createAuthTelemetryFacadePort } from "../adapters/authTelemetryFacadePort";
import { createBrowserAuthClockPort } from "../adapters/browserAuthClockPort";
import { createDefaultAuthSessionFactoryPort } from "../adapters/defaultAuthSessionFactoryPort";
import { createStaticMockAuthIdentityPort } from "../adapters/staticMockAuthIdentityPort";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";

interface CreateMockAuthFacadeOptions {
  telemetryFacade?: TelemetryFacade;
}

export function createMockAuthFacade(
  options: CreateMockAuthFacadeOptions = {}
): IAuthFacade {
  const telemetryFacade = options.telemetryFacade ?? browserTelemetryFacade;

  return createAuthFacade({
    benchmarkPort: createAuthBenchmarkRecorderPort(),
    clockPort: createBrowserAuthClockPort(),
    identityPort: createStaticMockAuthIdentityPort(),
    sessionFactoryPort: createDefaultAuthSessionFactoryPort(),
    telemetryPort: createAuthTelemetryFacadePort(telemetryFacade)
  });
}

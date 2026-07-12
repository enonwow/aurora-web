import type { IAuthFacade } from "../contracts";
import { createAuthFacade } from "../application/authFacade";
import { createAuthBenchmarkRecorderPort } from "../adapters/authBenchmarkRecorderPort";
import { createAuthTelemetryFacadePort } from "../adapters/authTelemetryFacadePort";
import { createBrowserAuthClockPort } from "../adapters/browserAuthClockPort";
import { createDefaultAuthSessionFactoryPort } from "../adapters/defaultAuthSessionFactoryPort";
import { createStaticTestAuthIdentityPort } from "../adapters/staticTestAuthIdentityPort";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";

interface CreateTestAuthFacadeOptions {
  telemetryFacade?: TelemetryFacade;
}

export function createTestAuthFacade(
  options: CreateTestAuthFacadeOptions = {}
): IAuthFacade {
  const telemetryFacade = options.telemetryFacade ?? browserTelemetryFacade;

  return createAuthFacade({
    benchmarkPort: createAuthBenchmarkRecorderPort(),
    clockPort: createBrowserAuthClockPort(),
    identityPort: createStaticTestAuthIdentityPort(),
    sessionFactoryPort: createDefaultAuthSessionFactoryPort(),
    telemetryPort: createAuthTelemetryFacadePort(telemetryFacade)
  });
}

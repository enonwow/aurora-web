import type { TelemetryFacade } from "../../telemetry/application/telemetryFacade";
import type { AuthTelemetryPort } from "../ports/authTelemetryPort";

export function createAuthTelemetryFacadePort(
  telemetryFacade: TelemetryFacade
): AuthTelemetryPort {
  return {
    track(name, payload = {}) {
      telemetryFacade.track(name, payload);
    }
  };
}

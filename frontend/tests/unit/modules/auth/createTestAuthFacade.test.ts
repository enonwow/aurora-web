import { describe, expect, it } from "vitest";
import { createTestAuthFacade } from "../../../../src/modules/auth/composition/createTestAuthFacade";
import type { TelemetryFacade } from "../../../../src/modules/telemetry/application/telemetryFacade";
import type {
  TelemetryEvent,
  TelemetryListener,
  TelemetryPayload
} from "../../../../src/modules/telemetry/domain/telemetryEvent";

function createSpyTelemetryFacade(eventNames: string[]): TelemetryFacade {
  let nextId = 1;
  const listeners = new Set<TelemetryListener>();
  let events: TelemetryEvent[] = [];

  const publish = () => {
    const snapshot = [...events];
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    track(name: string, payload: TelemetryPayload = {}) {
      eventNames.push(name);
      const event: TelemetryEvent = {
        id: nextId++,
        name,
        timestamp: new Date().toISOString(),
        payload
      };
      events = [event, ...events];
      publish();
      return event;
    },
    getEvents() {
      return [...events];
    },
    clear() {
      nextId = 1;
      events = [];
      publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener([...events]);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

describe("createTestAuthFacade composition", () => {
  it("tracks auth events through injected telemetry facade", async () => {
    const trackedEventNames: string[] = [];
    const telemetryFacade = createSpyTelemetryFacade(trackedEventNames);
    const authFacade = createTestAuthFacade({ telemetryFacade });

    const authResult = await authFacade.authenticate({
      username: "admin.user",
      password: "admin123"
    });
    if (!authResult.ok) {
      throw new Error("Expected successful authentication");
    }

    await authFacade.authorize(authResult.session);
    await authFacade.signOut(authResult.session);

    expect(trackedEventNames).toContain("auth.authenticate.requested");
    expect(trackedEventNames).toContain("auth.authenticate.accepted");
    expect(trackedEventNames).toContain("auth.authorize.completed");
    expect(trackedEventNames).toContain("auth.signout.completed");
  });
});

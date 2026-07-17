import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTelemetry,
  getTelemetryEvents,
  subscribeTelemetry,
  trackTelemetry
} from "../../../../src/modules/telemetry/telemetryStore";

describe("telemetry store facade", () => {
  beforeEach(() => {
    clearTelemetry();
  });

  it("tracks newest events first", () => {
    const first = trackTelemetry("event.first", { a: 1 });
    const second = trackTelemetry("event.second", { b: 2 });
    const events = getTelemetryEvents();

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(events).toHaveLength(2);
    expect(events[0]?.name).toBe("event.second");
    expect(events[1]?.name).toBe("event.first");
  });

  it("emits current snapshot to subscribers", () => {
    const snapshots: string[][] = [];
    const unsubscribe = subscribeTelemetry((events) => {
      snapshots.push(events.map((event) => event.name));
    });

    trackTelemetry("alpha");
    trackTelemetry("beta");
    clearTelemetry();
    unsubscribe();

    expect(snapshots[0]).toEqual([]);
    expect(snapshots[1]).toEqual(["alpha"]);
    expect(snapshots[2]).toEqual(["beta", "alpha"]);
    expect(snapshots[3]).toEqual([]);
  });

  it("resets ids after clear", () => {
    trackTelemetry("before.clear");
    clearTelemetry();
    const event = trackTelemetry("after.clear");

    expect(event.id).toBe(1);
  });
});

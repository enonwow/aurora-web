import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthBenchmarks,
  getAuthBenchmarks
} from "../../../../src/modules/auth/authBenchmarks";
import { mockAuthFacade } from "../../../../src/modules/auth/mockAuthFacade";
import {
  clearTelemetry,
  getTelemetryEvents
} from "../../../../src/modules/telemetry/telemetryStore";

describe("mockAuthFacade contracts", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
  });

  it("returns session for valid credentials", async () => {
    const response = await mockAuthFacade.authenticate({
      username: "dm.user",
      password: "dm123"
    });

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.session.user.role).toBe("dm");
    expect(response.session.accessToken).toContain("mock-token");
  });

  it("returns error for invalid credentials", async () => {
    const response = await mockAuthFacade.authenticate({
      username: "dm.user",
      password: "bad-password"
    });

    expect(response.ok).toBe(false);
    if (response.ok) {
      return;
    }

    expect(response.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns role-based permissions after authorization", async () => {
    const auth = await mockAuthFacade.authenticate({
      username: "admin.user",
      password: "admin123"
    });
    if (!auth.ok) {
      throw new Error("Expected successful mock auth for admin.user");
    }

    const authz = await mockAuthFacade.authorize(auth.session);

    expect(authz.role).toBe("admin");
    expect(authz.permissions).toContain("admin.config.write");
  });

  it("records telemetry and benchmark samples for auth flow", async () => {
    const auth = await mockAuthFacade.authenticate({
      username: "builder.user",
      password: "builder123"
    });
    if (!auth.ok) {
      throw new Error("Expected successful mock auth for builder.user");
    }

    await mockAuthFacade.authorize(auth.session);

    const telemetry = getTelemetryEvents();
    const benchmarks = getAuthBenchmarks();

    expect(
      telemetry.some((entry) => entry.name === "auth.authenticate.accepted")
    ).toBe(true);
    expect(
      telemetry.some((entry) => entry.name === "auth.authorize.completed")
    ).toBe(true);
    expect(benchmarks.some((sample) => sample.operation === "authenticate")).toBe(
      true
    );
    expect(benchmarks.some((sample) => sample.operation === "authorize")).toBe(
      true
    );
  });

  it("keeps mock authentication latency in low milliseconds", async () => {
    for (let index = 0; index < 50; index += 1) {
      await mockAuthFacade.authenticate({
        username: "viewer.user",
        password: "viewer123"
      });
    }

    const authSamples = getAuthBenchmarks().filter(
      (sample) => sample.operation === "authenticate"
    );
    const avgDuration =
      authSamples.reduce((sum, sample) => sum + sample.durationMs, 0) /
      Math.max(authSamples.length, 1);

    expect(avgDuration).toBeLessThan(10);
  });
});

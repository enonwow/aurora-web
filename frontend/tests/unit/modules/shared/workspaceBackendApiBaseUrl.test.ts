import { describe, expect, it } from "vitest";
import { resolveWorkspaceBackendApiBaseUrl } from "../../../../src/modules/shared/workspaceBackendApiBaseUrl";

describe("resolveWorkspaceBackendApiBaseUrl", () => {
  it("uses the direct backend for the main dev workspace control plane", () => {
    expect(
      resolveWorkspaceBackendApiBaseUrl({
        DEV: true
      })
    ).toBe("http://127.0.0.1:3000/api/v1");
  });

  it("preserves an explicit environment override and strips trailing slashes", () => {
    expect(
      resolveWorkspaceBackendApiBaseUrl({
        DEV: true,
        VITE_BACKEND_API_BASE_URL: "http://localhost:4100/custom///"
      })
    ).toBe("http://localhost:4100/custom");
  });

  it("keeps production requests same-origin", () => {
    expect(
      resolveWorkspaceBackendApiBaseUrl({
        DEV: false
      })
    ).toBe("/api/v1");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  saveRuntimePathOnboarding,
  startRuntimeCacheRebuild,
  validateRuntimePathOnboarding
} from "../../../../src/modules/runtime-settings/runtimePathOnboardingApi";

describe("runtime path onboarding API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends explicit logout confirmation and idempotency for path save", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001"
    );
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        data: {
          outcome: "NO_CHANGES",
          operationId: "operation-1",
          fingerprint: "fingerprint-1",
          integrity: { valid: true, reason: "ok" }
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await saveRuntimePathOnboarding(
      "admin-token",
      {
        nwnUserDir: "C:\\Users\\alice\\Documents\\Neverwinter Nights",
        nwnInstallDir: "C:\\Games\\Neverwinter Nights",
        auroraReferenceDir: "",
        hakDirectories: [],
        itemGeneratorSourceDirectories: [],
        moduleDecompiledPath:
          "C:\\Users\\alice\\Documents\\Neverwinter Nights\\modules\\decompiled",
        modulePackedPath: ""
      },
      "http://backend/api/v1"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend/api/v1/settings/runtime/onboarding",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
          "Idempotency-Key": "00000000-0000-4000-8000-000000000001"
        }),
        body: expect.stringContaining('"confirmGlobalLogout":true')
      })
    );
  });

  it("uses a fresh idempotency key for an on-demand rebuild", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000002"
    );
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        data: {
          outcome: "ACCEPTED",
          operationId: "operation-2",
          fingerprint: "fingerprint-2",
          generation: "g-next",
          integrity: { valid: false, reason: "missing_generation" }
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await startRuntimeCacheRebuild(
      "admin-token",
      "http://backend/api/v1"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend/api/v1/settings/runtime/cache-rebuilds",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "00000000-0000-4000-8000-000000000002"
        }),
        body: '{"confirmGlobalLogout":true}'
      })
    );
  });

  it("validates real host paths before the confirmed save request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        data: {
          ready: false,
          canConfigure: true,
          issues: [
            {
              field: "nwnUserDir",
              code: "RESTART_REQUIRED",
              message: "Update NWN_USER_DIR_HOST in .env."
            }
          ],
          values: {
            nwnUserDir: "D:\\NWN",
            nwnInstallDir: "D:\\NWN Game",
            auroraReferenceDir: "",
            hakDirectories: [],
            itemGeneratorSourceDirectories: [],
            moduleDecompiledPath: "D:\\NWN\\module",
            modulePackedPath: ""
          },
          environment: { mode: "docker", mounts: [] }
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateRuntimePathOnboarding(
      "admin-token",
      {
        nwnUserDir: "D:\\NWN",
        nwnInstallDir: "D:\\NWN Game",
        auroraReferenceDir: "",
        hakDirectories: [],
        itemGeneratorSourceDirectories: [],
        moduleDecompiledPath: "D:\\NWN\\module",
        modulePackedPath: ""
      },
      "http://backend/api/v1"
    );

    expect(result.ready).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend/api/v1/settings/runtime/onboarding/validate",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"nwnUserDir":"D:\\\\NWN"')
      })
    );
  });
});

function response(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload
  } as Response;
}

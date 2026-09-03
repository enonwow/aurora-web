import { describe, expect, it, vi } from "vitest";

import { createAreaCreateFacade } from "../../../../src/modules/areas/application/areaCreateFacade";
import type {
  AreaCreateApiPort,
  AreaCreateApiResult
} from "../../../../src/modules/areas/ports/areaCreateApiPort";
import type {
  AreaCreateCommand,
  AreaCreateExecution,
  AreaCreateProfileCatalog,
  AreaCreateValidationReceipt
} from "../../../../src/modules/areas/areaCreateContracts";

const command = {
  schemaVersion: "area-create-command.v1",
  moduleId: "workspace-module-01",
  expectedModuleRevision: "revision-before",
  creationProfile: { id: "profile-01", fingerprintSha256: "a".repeat(64) },
  area: { name: "Area", resRef: "area_01", tag: "AREA_01" },
  tileset: { resRef: "tms01", setFingerprintSha256: "b".repeat(64) },
  dimensions: { width: 2, height: 2 },
  initializer: { algorithmVersion: "initializer.v1", seed: 0 },
  tiles: [0, 1, 2, 3].map((orientation, index) => ({
    row: Math.floor(index / 2),
    col: index % 2,
    tileId: 12,
    orientation: orientation as 0 | 1 | 2 | 3,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1
  })),
  groupInstances: [],
  draft: { id: "draft-01", revision: 1, normalizedSha256: "c".repeat(64) },
  clientCommandId: "client-command-01"
} satisfies AreaCreateCommand;

function createPort() {
  return {
    getProfiles: vi.fn<AreaCreateApiPort["getProfiles"]>(),
    validate: vi.fn<AreaCreateApiPort["validate"]>(),
    create: vi.fn<AreaCreateApiPort["create"]>()
  } satisfies AreaCreateApiPort;
}

describe("areaCreateFacade", () => {
  it("keeps profile queries and validation/create commands on separate port operations", async () => {
    const port = createPort();
    const facade = createAreaCreateFacade(port);
    const profiles = {
      ok: true,
      value: {
        moduleId: command.moduleId,
        moduleRevision: command.expectedModuleRevision,
        profiles: []
      },
      metadata: {
        contractVersion: "1.0.0",
        requestId: "req-profiles",
        moduleRevision: command.expectedModuleRevision
      }
    } satisfies AreaCreateApiResult<AreaCreateProfileCatalog>;
    const validation = {
      ok: true,
      value: { validationId: "validation-01" } as AreaCreateValidationReceipt,
      metadata: {
        contractVersion: "1.0.0",
        requestId: "req-validation",
        moduleRevision: command.expectedModuleRevision
      }
    } satisfies AreaCreateApiResult<AreaCreateValidationReceipt>;
    const created = {
      ok: true,
      value: { idempotency: "created" } as AreaCreateExecution,
      metadata: {
        contractVersion: "1.0.0",
        requestId: "req-create",
        etag: '"revision-after"',
        moduleRevision: "revision-after"
      }
    } satisfies AreaCreateApiResult<AreaCreateExecution>;
    port.getProfiles.mockResolvedValue(profiles);
    port.validate.mockResolvedValue(validation);
    port.create.mockResolvedValue(created);

    await expect(facade.queries.getProfiles("token")).resolves.toBe(profiles);
    await expect(
      facade.commands.validate({ accessToken: "token", moduleId: command.moduleId, command })
    ).resolves.toBe(validation);
    await expect(
      facade.commands.create({
        accessToken: "token",
        moduleId: command.moduleId,
        idempotencyKey: "idempotency-01",
        command
      })
    ).resolves.toBe(created);
    expect(port.getProfiles).toHaveBeenCalledWith("token");
    expect(port.validate).toHaveBeenCalledWith({
      accessToken: "token",
      moduleId: command.moduleId,
      command
    });
    expect(port.create).toHaveBeenCalledWith({
      accessToken: "token",
      moduleId: command.moduleId,
      idempotencyKey: "idempotency-01",
      command
    });
  });

  it("preserves a typed stale-revision failure returned by the port", async () => {
    const port = createPort();
    const facade = createAreaCreateFacade(port);
    const stale = {
      ok: false,
      error: {
        code: "AREA_CREATE_MODULE_REVISION_CONFLICT",
        operation: "create_area",
        status: 412,
        message: "The module revision changed.",
        retryable: false,
        details: [],
        contractVersion: "1.0.0",
        requestId: "req-stale",
        etag: '"revision-after"'
      }
    } satisfies AreaCreateApiResult<AreaCreateExecution>;
    port.create.mockResolvedValue(stale);

    await expect(
      facade.commands.create({
        accessToken: "token",
        moduleId: command.moduleId,
        idempotencyKey: "idempotency-01",
        command
      })
    ).resolves.toBe(stale);
  });

  it.each([
    ["get_profiles", "query", () => ({ method: "getProfiles" as const, args: ["token"] as const })],
    [
      "validate_candidate",
      "validation",
      () => ({
        method: "validate" as const,
        args: [{ accessToken: "token", moduleId: command.moduleId, command }] as const
      })
    ],
    [
      "create_area",
      "create",
      () => ({
        method: "create" as const,
        args: [
          {
            accessToken: "token",
            moduleId: command.moduleId,
            idempotencyKey: "idempotency-01",
            command
          }
        ] as const
      })
    ]
  ] as const)(
    "normalizes an unexpected %s port exception into a deterministic transport failure",
    async (operation, _label, invocationFactory) => {
      const port = createPort();
      const facade = createAreaCreateFacade(port);
      const invocation = invocationFactory();
      port[invocation.method].mockRejectedValue(new Error("secret adapter failure"));

      const result =
        invocation.method === "getProfiles"
          ? await facade.queries.getProfiles(invocation.args[0])
          : invocation.method === "validate"
            ? await facade.commands.validate(invocation.args[0])
            : await facade.commands.create(invocation.args[0]);

      expect(result).toEqual({
        ok: false,
        error: {
          code: "AREA_CREATE_TRANSPORT_FAILED",
          operation,
          status: null,
          message: "The Area Create port failed before returning a contract result.",
          retryable: true,
          details: []
        }
      });
      expect(JSON.stringify(result)).not.toContain("secret");
    }
  );
});

import { describe, expect, it, vi } from "vitest";

import {
  HttpAreaCreateApiPort,
  createHttpAreaCreateApiPort,
  resolveAreaCreateApiBaseUrl
} from "../../../../src/modules/areas/adapters/httpAreaCreateApiPort";
import type { AreaCreateCommand } from "../../../../src/modules/areas/areaCreateContracts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const MODULE_REVISION = "module-revision-before";
const NEW_MODULE_REVISION = "module-revision-after";

function tileProductionAdmission() {
  return {
    schemaVersion: "area-tile-production-admission.v1",
    policyVersion: "area-tile-production-admission-policy.v1",
    reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
    planId: "plan-01",
    corpusHash: HASH_C,
    profileId: "source-bound-v7",
    ledgerSha256: HASH_A,
    reportSha256: HASH_B,
    tilesetResRef: "tms01",
    uniqueTileIdCount: 1,
    tileIdSetSha256: HASH_C
  };
}

function command(): AreaCreateCommand {
  return {
    schemaVersion: "area-create-command.v1",
    moduleId: "workspace-module-01",
    expectedModuleRevision: MODULE_REVISION,
    creationProfile: {
      id: "aur-s05-05-microset-tiny-2x2.v1",
      fingerprintSha256: HASH_A
    },
    area: {
      name: "Atomic Area",
      resRef: "atomic_area",
      tag: "ATOMIC_AREA"
    },
    tileset: {
      resRef: "tms01",
      setFingerprintSha256: HASH_B
    },
    dimensions: { width: 2, height: 2 },
    initializer: {
      algorithmVersion: "aur-s05-05-observed-grid.v1",
      seed: 0
    },
    tiles: [2, 1, 3, 0].map((orientation, index) => ({
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
    draft: {
      id: "draft-01",
      revision: 7,
      normalizedSha256: HASH_C
    },
    clientCommandId: "client-command-01"
  };
}

function successEnvelope<T>(data: T) {
  return {
    contractVersion: "1.0.0",
    requestId: "req-area-create-01",
    data
  };
}

function profile() {
  return {
    id: "aur-s05-05-microset-tiny-2x2.v1",
    evidenceScope: "aur-s05-05-structural-candidate",
    tilesetResRef: "tms01",
    width: 2,
    height: 2,
    initializerAlgorithmVersion: "aur-s05-05-observed-grid.v1",
    initializerSeed: 0,
    tiles: command().tiles,
    groupInstances: [],
    fingerprintSha256: HASH_A,
    setFingerprintSha256: HASH_B,
    persistenceStatus: "structural-candidate-awaiting-native-certification",
    materializationAllowed: false,
    certificationId: null,
    blockingProofs: ["runtime-canvas", "toolset-save-build", "nwn-runtime-load"]
  };
}

function validationReceipt() {
  return {
    validationId: "validation-01",
    commandHash: HASH_C,
    moduleId: "workspace-module-01",
    moduleRevision: MODULE_REVISION,
    profileFingerprintSha256: HASH_A,
    setFingerprintSha256: HASH_B,
    tileProductionAdmission: tileProductionAdmission(),
    validatorVersion: "area-create-resource-set-validator.v1",
    resources: [
      {
        extension: "are",
        fileName: "atomic_area.are",
        resourceType: 2012,
        size: 128,
        sha256: HASH_A
      },
      {
        extension: "git",
        fileName: "atomic_area.git",
        resourceType: 2023,
        size: 64,
        sha256: HASH_B
      },
      {
        extension: "gic",
        fileName: "atomic_area.gic",
        resourceType: 2022,
        size: 32,
        sha256: HASH_C
      }
    ],
    moduleIfo: {
      fileName: "module.ifo",
      size: 256,
      sha256: HASH_A
    },
    createdAt: "2026-08-07T08:00:00.000Z",
    expiresAt: "2026-08-07T08:05:00.000Z"
  };
}

function createReceipt() {
  return {
    schemaVersion: "area-create-receipt.v1",
    transactionId: "transaction-01",
    areaId: "atomic_area",
    resRef: "atomic_area",
    name: "Atomic Area",
    tag: "ATOMIC_AREA",
    moduleId: "workspace-module-01",
    previousModuleRevision: MODULE_REVISION,
    newModuleRevision: NEW_MODULE_REVISION,
    profileId: "aur-s05-05-microset-tiny-2x2.v1",
    profileFingerprintSha256: HASH_A,
    setFingerprintSha256: HASH_B,
    tileProductionAdmission: tileProductionAdmission(),
    draftNormalizedSha256: HASH_C,
    commandHash: HASH_C,
    validatorVersion: "area-create-resource-set-validator.v1",
    resources: validationReceipt().resources.map((resource) => ({
      ...resource,
      key: `modules/current/${resource.fileName}`
    })),
    moduleIfo: {
      key: "modules/current/module.ifo",
      size: 256,
      sha256: HASH_A
    },
    readbackStatus: "verified",
    warnings: [],
    createdAt: "2026-08-07T08:00:01.000Z"
  };
}

describe("HttpAreaCreateApiPort", () => {
  it("loads the immutable profile catalog and propagates the captured module revision", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(
        successEnvelope({
          moduleId: "workspace-module-01",
          moduleRevision: MODULE_REVISION,
          profiles: [profile()]
        })
      )
    );
    const port = new HttpAreaCreateApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1/"
    );

    const result = await port.getProfiles("access-token");

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/area-creation/profiles",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer access-token"
        }
      }
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        moduleId: "workspace-module-01",
        moduleRevision: MODULE_REVISION
      },
      metadata: {
        contractVersion: "1.0.0",
        requestId: "req-area-create-01",
        moduleRevision: MODULE_REVISION
      }
    });
  });

  it("posts an exact validation command without mutation headers", async () => {
    const fetchStub = vi.fn(async () => Response.json(successEnvelope(validationReceipt())));
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const inputCommand = command();

    const result = await port.validate({
      accessToken: "access-token",
      moduleId: inputCommand.moduleId,
      command: inputCommand
    });

    expect(fetchStub).toHaveBeenCalledWith(
      "/api/v1/modules/workspace-module-01/area-creation-validations",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer access-token",
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(inputCommand)
      }
    );
    expect(result).toMatchObject({
      ok: true,
      value: { validationId: "validation-01", moduleRevision: MODULE_REVISION },
      metadata: { moduleRevision: MODULE_REVISION }
    });
  });

  it("creates an Area with Idempotency-Key and a quoted If-Match revision", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(successEnvelope({ idempotency: "created", receipt: createReceipt() }), {
        status: 201,
        headers: { ETag: `"${NEW_MODULE_REVISION}"` }
      })
    );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const inputCommand = command();

    const result = await port.create({
      accessToken: "access-token",
      moduleId: inputCommand.moduleId,
      idempotencyKey: "idempotency-area-create-01",
      command: inputCommand
    });

    expect(fetchStub).toHaveBeenCalledWith("/api/v1/modules/workspace-module-01/areas", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer access-token",
        "Content-Type": "application/json; charset=utf-8",
        "Idempotency-Key": "idempotency-area-create-01",
        "If-Match": `"${MODULE_REVISION}"`
      },
      body: JSON.stringify(inputCommand)
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        idempotency: "created",
        receipt: {
          readbackStatus: "verified",
          newModuleRevision: NEW_MODULE_REVISION
        }
      },
      metadata: {
        etag: `"${NEW_MODULE_REVISION}"`,
        moduleRevision: NEW_MODULE_REVISION
      }
    });
  });

  it("rejects a successful create response when ETag is missing or disagrees with the receipt", async () => {
    const payload = successEnvelope({ idempotency: "created", receipt: createReceipt() });
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(payload, { status: 201 }))
      .mockResolvedValueOnce(
        Response.json(payload, {
          status: 201,
          headers: { ETag: '"different-revision"' }
        })
      );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const input = {
      accessToken: "access-token",
      moduleId: command().moduleId,
      idempotencyKey: "idempotency-area-create-01",
      command: command()
    };

    await expect(port.create(input)).resolves.toEqual({
      ok: false,
      error: {
        code: "AREA_CREATE_RESPONSE_INVALID",
        operation: "create_area",
        status: 201,
        message: "The Area Create API returned a response outside the v1 contract.",
        retryable: false,
        details: []
      }
    });
    await expect(port.create(input)).resolves.toEqual({
      ok: false,
      error: {
        code: "AREA_CREATE_RESPONSE_INVALID",
        operation: "create_area",
        status: 201,
        message: "The Area Create API returned a response outside the v1 contract.",
        retryable: false,
        details: [],
        etag: '"different-revision"'
      }
    });
  });

  it("rejects validation and materialization success without tile admission provenance", async () => {
    const {
      tileProductionAdmission: _validationAdmission,
      ...validationWithoutAdmission
    } = validationReceipt();
    const {
      tileProductionAdmission: _receiptAdmission,
      ...receiptWithoutAdmission
    } = createReceipt();
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(successEnvelope(validationWithoutAdmission)))
      .mockResolvedValueOnce(
        Response.json(
          successEnvelope({ idempotency: "created", receipt: receiptWithoutAdmission }),
          {
            status: 201,
            headers: { ETag: `"${NEW_MODULE_REVISION}"` }
          }
        )
      );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.validate({
      accessToken: "token",
      moduleId: command().moduleId,
      command: command()
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_CREATE_RESPONSE_INVALID" }
    });
    await expect(port.create({
      accessToken: "token",
      moduleId: command().moduleId,
      idempotencyKey: "idempotency-area-create-01",
      command: command()
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_CREATE_RESPONSE_INVALID" }
    });
  });

  it("rejects unknown fields in nested successful response objects", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(
        successEnvelope({
          moduleId: "workspace-module-01",
          moduleRevision: MODULE_REVISION,
          profiles: [{ ...profile(), uncontractedField: true }]
        })
      )
    );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    const result = await port.getProfiles("access-token");

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "AREA_CREATE_RESPONSE_INVALID",
        operation: "get_profiles",
        retryable: false,
        status: 200
      }
    });
  });

  it("propagates the exact backend error code, details, request metadata, retryability, and ETag", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(
        {
          contractVersion: "1.0.0",
          requestId: "req-stale-01",
          error: {
            code: "AREA_CREATE_MODULE_REVISION_CONFLICT",
            message: "The module revision changed.",
            details: [
              { path: "details.0", reason: `expected ${MODULE_REVISION}` },
              { path: "details.1", reason: `actual ${NEW_MODULE_REVISION}` }
            ],
            retryable: false
          }
        },
        {
          status: 412,
          headers: { ETag: `"${NEW_MODULE_REVISION}"` }
        }
      )
    );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    const result = await port.create({
      accessToken: "access-token",
      moduleId: command().moduleId,
      idempotencyKey: "idempotency-area-create-01",
      command: command()
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "AREA_CREATE_MODULE_REVISION_CONFLICT",
        operation: "create_area",
        status: 412,
        message: "The module revision changed.",
        retryable: false,
        details: [
          { path: "details.0", reason: `expected ${MODULE_REVISION}` },
          { path: "details.1", reason: `actual ${NEW_MODULE_REVISION}` }
        ],
        contractVersion: "1.0.0",
        requestId: "req-stale-01",
        etag: `"${NEW_MODULE_REVISION}"`
      }
    });
  });

  it("normalizes network and malformed backend responses without leaking failure details", async () => {
    const fetchStub = vi
      .fn()
      .mockRejectedValueOnce(new Error("secret network path"))
      .mockResolvedValueOnce(
        new Response("not-json", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        })
      );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    const networkFailure = await port.getProfiles("access-token");
    const malformedFailure = await port.getProfiles("access-token");

    expect(networkFailure).toEqual({
      ok: false,
      error: {
        code: "AREA_CREATE_TRANSPORT_FAILED",
        operation: "get_profiles",
        message: "The Area Create API request could not be completed.",
        retryable: true,
        status: null,
        details: []
      }
    });
    expect(malformedFailure).toMatchObject({
      ok: false,
      error: {
        code: "AREA_CREATE_RESPONSE_INVALID",
        operation: "get_profiles",
        retryable: true,
        status: 503,
        details: [{ path: "response.body", reason: "invalid_json" }]
      }
    });
    expect(JSON.stringify([networkFailure, malformedFailure])).not.toContain("secret");
  });

  it("classifies malformed error envelopes at status 500 as retryable invalid responses", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(
        {
          contractVersion: "1.0.0",
          requestId: "req-invalid-error",
          error: {
            code: "AREA_CREATE_STORAGE_UNAVAILABLE",
            message: "Storage unavailable.",
            details: [],
            retryable: true,
            unexpected: true
          }
        },
        { status: 500 }
      )
    );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.getProfiles("access-token")).resolves.toEqual({
      ok: false,
      error: {
        code: "AREA_CREATE_RESPONSE_INVALID",
        operation: "get_profiles",
        status: 500,
        message: "The Area Create API returned a response outside the v1 contract.",
        retryable: true,
        details: []
      }
    });
  });

  it("classifies an invalid validation response with the validation operation", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(successEnvelope({ ...validationReceipt(), unexpected: true }))
    );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(
      port.validate({
        accessToken: "access-token",
        moduleId: command().moduleId,
        command: command()
      })
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "AREA_CREATE_RESPONSE_INVALID",
        operation: "validate_candidate"
      }
    });
  });

  it("strips every trailing slash from an explicit base URL", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(
        successEnvelope({
          moduleId: "workspace-module-01",
          moduleRevision: MODULE_REVISION,
          profiles: [profile()]
        })
      )
    );
    const port = new HttpAreaCreateApiPort(fetchStub as unknown as typeof fetch, "/api/v1///");

    await port.getProfiles("access-token");

    expect(fetchStub).toHaveBeenCalledWith(
      "/api/v1/area-creation/profiles",
      expect.any(Object)
    );
  });

  it("builds the default HTTP adapter through its factory", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(
        successEnvelope({
          moduleId: "workspace-module-01",
          moduleRevision: MODULE_REVISION,
          profiles: [profile()]
        })
      )
    );
    const port = createHttpAreaCreateApiPort(fetchStub as unknown as typeof fetch);

    await port.getProfiles("access-token");

    expect(fetchStub).toHaveBeenCalledWith(
      expect.stringMatching(/\/(?:_aurora|api)\/v1\/area-creation\/profiles$/u),
      expect.any(Object)
    );
  });

  it("resolves configured, blank, development, and production API base URLs deterministically", () => {
    expect(resolveAreaCreateApiBaseUrl(" https://api.example.test/api/v1/// ", false)).toBe(
      "https://api.example.test/api/v1"
    );
    expect(resolveAreaCreateApiBaseUrl("   ", false)).toBe("/api/v1");
    expect(resolveAreaCreateApiBaseUrl(undefined, true)).toBe("/_aurora/v1");
    expect(resolveAreaCreateApiBaseUrl(undefined, false)).toBe("/api/v1");
  });
});

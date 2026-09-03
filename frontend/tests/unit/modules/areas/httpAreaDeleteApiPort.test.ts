import { describe, expect, it, vi } from "vitest";

import {
  HttpAreaDeleteApiPort,
  resolveAreaDeleteApiBaseUrl
} from "../../../../src/modules/areas/adapters/httpAreaDeleteApiPort";
import type {
  AreaDeleteCommand,
  AreaDeletePreviewCommand
} from "../../../../src/modules/areas/areaDeleteContracts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const HASH_D = "d".repeat(64);
const HASH_E = "e".repeat(64);
const MODULE_REVISION = HASH_A;
const NEW_MODULE_REVISION = HASH_E;

function previewCommand(): AreaDeletePreviewCommand {
  return {
    schemaVersion: "area-delete-preview-command.v1",
    moduleId: "workspace-module-01",
    areaResRef: "crypt01",
    expectedModuleRevision: MODULE_REVISION,
    clientCommandId: "preview-command-01"
  };
}

function deleteCommand(): AreaDeleteCommand {
  return {
    schemaVersion: "area-delete-command.v1",
    moduleId: "workspace-module-01",
    areaResRef: "crypt01",
    expectedModuleRevision: MODULE_REVISION,
    preview: { sha256: HASH_D },
    confirmation: { areaResRef: "crypt01", policy: "block_on_references" },
    clientCommandId: "delete-command-01"
  };
}

function descriptor(logicalKey: string, resourceType: number, sha256: string) {
  return { logicalKey, resourceType, size: 128, sha256 };
}

function preview() {
  return {
    schemaVersion: "area-delete-preview.v1",
    scanVersion: "area-delete-impact-scan.v1",
    moduleId: "workspace-module-01",
    areaResRef: "crypt01",
    moduleRevision: MODULE_REVISION,
    targetResources: [
      descriptor("crypt01.are", 2012, HASH_A),
      descriptor("crypt01.git", 2023, HASH_B),
      descriptor("crypt01.gic", 2046, HASH_C)
    ],
    moduleIfo: descriptor("module.ifo", 2014, HASH_E),
    membershipCount: 1,
    entryAreaResRef: "start01",
    findings: [],
    blockerCount: 0,
    warningCount: 0,
    previewSha256: HASH_D,
    expiresAt: "2026-08-18T20:05:00.000Z"
  };
}

function receipt() {
  return {
    schemaVersion: "area-delete-receipt.v1",
    transactionId: "transaction-delete-01",
    areaResRef: "crypt01",
    moduleId: "workspace-module-01",
    previousModuleRevision: MODULE_REVISION,
    newModuleRevision: NEW_MODULE_REVISION,
    commandHash: HASH_C,
    previewSha256: HASH_D,
    scanVersion: "area-delete-impact-scan.v1",
    removedResources: preview().targetResources.map((entry) => ({
      extension: entry.logicalKey.slice(-3) as "are" | "git" | "gic",
      key: `modules/current/${entry.logicalKey}`,
      fileName: entry.logicalKey,
      resourceType: entry.resourceType,
      size: entry.size,
      sha256: entry.sha256
    })),
    moduleIfo: {
      key: "modules/current/module.ifo",
      baselineSha256: HASH_E,
      candidateSha256: HASH_B,
      size: 256
    },
    survivorCount: 12,
    blockerCount: 0,
    readbackStatus: "verified",
    warnings: [],
    deletedAt: "2026-08-18T20:00:01.000Z"
  };
}

function envelope(data: unknown) {
  return { contractVersion: "1.1.0", requestId: "request-delete-01", data };
}

describe("HttpAreaDeleteApiPort", () => {
  it("posts an exact impact preview command with a strong module precondition", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(envelope(preview()), { headers: { ETag: `"${MODULE_REVISION}"` } })
    );
    const port = new HttpAreaDeleteApiPort(fetchStub as unknown as typeof fetch, "/api/v1/");
    const command = previewCommand();

    const result = await port.preview({
      accessToken: "token",
      moduleId: command.moduleId,
      areaResRef: command.areaResRef,
      command
    });

    expect(fetchStub).toHaveBeenCalledWith(
      "/api/v1/modules/workspace-module-01/areas/crypt01/delete-previews",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer token",
          "Content-Type": "application/json; charset=utf-8",
          "If-Match": `"${MODULE_REVISION}"`
        },
        body: JSON.stringify(command)
      }
    );
    expect(result).toMatchObject({
      ok: true,
      value: { previewSha256: HASH_D, blockerCount: 0 },
      metadata: { etag: `"${MODULE_REVISION}"`, moduleRevision: MODULE_REVISION }
    });
  });

  it("deletes with explicit confirmation, CAS/idempotency headers, and verified readback", async () => {
    const fetchStub = vi.fn(async () =>
      Response.json(envelope(receipt()), {
        headers: {
          ETag: `"${NEW_MODULE_REVISION}"`,
          "Idempotency-Status": "created"
        }
      })
    );
    const port = new HttpAreaDeleteApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const command = deleteCommand();

    const result = await port.delete({
      accessToken: "token",
      moduleId: command.moduleId,
      areaResRef: command.areaResRef,
      idempotencyKey: "delete-idempotency-01",
      command
    });

    expect(fetchStub).toHaveBeenCalledWith(
      "/api/v1/modules/workspace-module-01/areas/crypt01",
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer token",
          "Content-Type": "application/json; charset=utf-8",
          "Idempotency-Key": "delete-idempotency-01",
          "If-Match": `"${MODULE_REVISION}"`
        },
        body: JSON.stringify(command)
      }
    );
    expect(result).toMatchObject({
      ok: true,
      value: { readbackStatus: "verified", newModuleRevision: NEW_MODULE_REVISION },
      metadata: { idempotencyStatus: "created", moduleRevision: NEW_MODULE_REVISION }
    });
  });

  it("accepts replay, but rejects invalid headers and malformed strict receipts", async () => {
    const malformed = { ...receipt(), moduleIfo: { ...receipt().moduleIfo, extra: true } };
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(envelope(receipt()), {
        headers: { ETag: `"${NEW_MODULE_REVISION}"`, "Idempotency-Status": "replayed" }
      }))
      .mockResolvedValueOnce(Response.json(envelope(receipt()), {
        headers: { ETag: '"wrong"', "Idempotency-Status": "created" }
      }))
      .mockResolvedValueOnce(Response.json(envelope(receipt()), {
        headers: { ETag: `"${NEW_MODULE_REVISION}"`, "Idempotency-Status": "unknown" }
      }))
      .mockResolvedValueOnce(Response.json(envelope(malformed), {
        headers: { ETag: `"${NEW_MODULE_REVISION}"`, "Idempotency-Status": "created" }
      }));
    const port = new HttpAreaDeleteApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const input = {
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      idempotencyKey: "idem-delete-01",
      command: deleteCommand()
    };

    await expect(port.delete(input)).resolves.toMatchObject({
      ok: true,
      metadata: { idempotencyStatus: "replayed" }
    });
    for (let index = 0; index < 3; index += 1) {
      await expect(port.delete(input)).resolves.toMatchObject({
        ok: false,
        error: { code: "AREA_DELETE_RESPONSE_INVALID" }
      });
    }
  });

  it("rejects malformed preview successes and missing preview ETags", async () => {
    const malformed = { ...preview(), unexpected: true };
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(envelope(malformed), {
          headers: { ETag: `"${MODULE_REVISION}"` }
        })
      )
      .mockResolvedValueOnce(Response.json(envelope(preview())));
    const port = new HttpAreaDeleteApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const input = {
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      command: previewCommand()
    };

    await expect(port.preview(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_DELETE_RESPONSE_INVALID" }
    });
    await expect(port.preview(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_DELETE_RESPONSE_INVALID" }
    });
  });

  it("maps a strict backend failure from the destructive Delete operation", async () => {
    const backendError = {
      contractVersion: "1.1.0",
      requestId: "request-delete-error",
      error: {
        code: "AREA_DELETE_PREVIEW_STALE",
        message: "The preview is stale.",
        details: [{ path: "preview.sha256", reason: "stale" }],
        retryable: false
      }
    };
    const fetchStub = vi.fn(async () => Response.json(backendError, { status: 412 }));
    const port = new HttpAreaDeleteApiPort(fetchStub as unknown as typeof fetch, "/api/v1");

    await expect(port.delete({
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      idempotencyKey: "idem-01",
      command: deleteCommand()
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_DELETE_PREVIEW_STALE", status: 412 }
    });
  });

  it("maps backend errors and transport exceptions without leaking implementation details", async () => {
    const backendError = {
      contractVersion: "1.1.0",
      requestId: "request-error",
      error: {
        code: "AREA_DELETE_REFERENCES_BLOCKED",
        message: "References block deletion.",
        details: [{ path: "preview", reason: "door01.git" }],
        retryable: false
      }
    };
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(Response.json(backendError, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ error: "bad" }, { status: 422 }))
      .mockRejectedValueOnce(new Error("private path"));
    const port = new HttpAreaDeleteApiPort(fetchStub as unknown as typeof fetch, "/api/v1");
    const input = {
      accessToken: "token",
      moduleId: "workspace-module-01",
      areaResRef: "crypt01",
      command: previewCommand()
    };

    await expect(port.preview(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_DELETE_REFERENCES_BLOCKED", status: 409 }
    });
    await expect(port.preview(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "AREA_DELETE_RESPONSE_INVALID", status: 422 }
    });
    await expect(port.preview(input)).resolves.toEqual({
      ok: false,
      error: {
        code: "AREA_DELETE_TRANSPORT_FAILED",
        operation: "preview_delete",
        status: null,
        message: "The Area Delete API request could not be completed.",
        retryable: true,
        details: []
      }
    });
  });

  it("normalizes configured and default API roots", () => {
    expect(resolveAreaDeleteApiBaseUrl(" https://api.test/v1/// ", false))
      .toBe("https://api.test/v1");
    expect(resolveAreaDeleteApiBaseUrl(undefined, true)).toBe("/_aurora/v1");
    expect(resolveAreaDeleteApiBaseUrl("  ", false)).toBe("/api/v1");
  });
});

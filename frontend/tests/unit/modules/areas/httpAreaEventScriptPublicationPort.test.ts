import { describe, expect, it, vi } from "vitest";
import { HttpAreaEventScriptPublicationPort } from "../../../../src/modules/areas/adapters/httpAreaEventScriptPublicationPort";
import { AreaEventScriptPortError } from "../../../../src/modules/areas/ports/areaEventScriptPublicationPort";
import { createAreaEventScriptSourceCommand } from "../../../../src/modules/areas/domain/areaEventScriptPublication";
import {
  SCRIPT_MODULE_ID,
  SCRIPT_REVISION,
  SCRIPT_SOURCE,
  areaEventScriptPublicationReceiptFixture,
  areaEventScriptSourceSnapshotFixture,
  areaEventScriptValidationFixture,
} from "./areaEventScriptPublicationFixture";

describe("HttpAreaEventScriptPublicationPort", () => {
  it("reads one authenticated revision-fenced source snapshot", async () => {
    const fetchStub = vi.fn(async () => response(areaEventScriptSourceSnapshotFixture()));
    const port = new HttpAreaEventScriptPublicationPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1/",
    );

    await expect(port.readSource("token", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
    })).resolves.toEqual(areaEventScriptSourceSnapshotFixture());
    expect(fetchStub).toHaveBeenCalledWith(
      `http://localhost:3000/api/v1/modules/module%3Atest/scripts/area_enter/source?expectedModuleRevision=${SCRIPT_REVISION}`,
      {
        method: "GET",
        headers: { Accept: "application/json", Authorization: "Bearer token" },
      },
    );
  });

  it("validates and publishes through exact byte-free commands and fencing headers", async () => {
    const fetchStub = vi.fn()
      .mockResolvedValueOnce(response(areaEventScriptValidationFixture()))
      .mockResolvedValueOnce(response(areaEventScriptPublicationReceiptFixture(), {
        "Idempotency-Status": "created",
      }));
    const port = new HttpAreaEventScriptPublicationPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1",
    );
    const command = createAreaEventScriptSourceCommand({
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
      sourceText: SCRIPT_SOURCE,
      includeResRefs: [],
    })!;

    await expect(port.validate("token", command))
      .resolves.toEqual(areaEventScriptValidationFixture());
    await expect(port.publish("token", command, "script-publish-1"))
      .resolves.toEqual({
        idempotency: "created",
        receipt: areaEventScriptPublicationReceiptFixture(),
      });
    expect(fetchStub).toHaveBeenNthCalledWith(1,
      "http://localhost:3000/api/v1/modules/module%3Atest/scripts/area_enter/validate",
      expect.objectContaining({ method: "POST", body: JSON.stringify(command) }),
    );
    expect(fetchStub).toHaveBeenNthCalledWith(2,
      "http://localhost:3000/api/v1/modules/module%3Atest/scripts/area_enter",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Idempotency-Key": "script-publish-1",
          "If-Match": `"${SCRIPT_REVISION}"`,
        }),
        body: JSON.stringify(command),
      }),
    );
    expect(JSON.stringify(fetchStub.mock.calls)).not.toContain("compiled-ncs");
  });

  it("fails closed before fetch for invalid access, query, command, or key", async () => {
    const fetchStub = vi.fn();
    const port = new HttpAreaEventScriptPublicationPort(fetchStub as unknown as typeof fetch);
    const command = createAreaEventScriptSourceCommand({
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
      sourceText: SCRIPT_SOURCE,
      includeResRefs: [],
    })!;

    await expect(port.readSource("", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
    })).rejects.toMatchObject({ code: "AREA_EVENT_SCRIPT_ACCESS_TOKEN_INVALID" });
    await expect(port.readSource("token", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "Upper",
      expectedModuleRevision: SCRIPT_REVISION,
    })).rejects.toMatchObject({ code: "AREA_EVENT_SCRIPT_SOURCE_QUERY_INVALID" });
    await expect(port.publish("token", command, "bad key with spaces"))
      .rejects.toMatchObject({ code: "AREA_EVENT_SCRIPT_IDEMPOTENCY_KEY_INVALID" });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("preserves only stable error metadata and rejects oversized/malformed responses", async () => {
    const errorFetch = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-script",
      error: {
        code: "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND",
        message: "host path secret",
        details: [{ path: "C:\\secret" }],
        retryable: false,
      },
    }), { status: 404 }));
    const port = new HttpAreaEventScriptPublicationPort(errorFetch as unknown as typeof fetch);

    await expect(port.readSource("token", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
    })).rejects.toEqual(new AreaEventScriptPortError(
      "The Area event-script source request failed.",
      404,
      "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND",
      false,
    ));

    const oversizedFetch = vi.fn(async () => new Response("x".repeat(1024 * 1024 + 1), {
      status: 200,
    }));
    await expect(new HttpAreaEventScriptPublicationPort(
      oversizedFetch as unknown as typeof fetch,
    ).readSource("token", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
    })).rejects.toMatchObject({ code: "AREA_EVENT_SCRIPT_RESPONSE_INVALID" });
  });

  it("rejects otherwise valid responses bound to another command identity", async () => {
    const foreignSource = structuredClone(areaEventScriptSourceSnapshotFixture());
    foreignSource.targetResRef = "area_exit";
    const sourcePort = new HttpAreaEventScriptPublicationPort(
      vi.fn(async () => response(foreignSource)) as unknown as typeof fetch,
    );
    await expect(sourcePort.readSource("token", {
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
    })).rejects.toMatchObject({ code: "AREA_EVENT_SCRIPT_RESPONSE_INVALID" });

    const foreignValidation = structuredClone(areaEventScriptValidationFixture());
    foreignValidation.moduleRevision = "f".repeat(64);
    const validationPort = new HttpAreaEventScriptPublicationPort(
      vi.fn(async () => response(foreignValidation)) as unknown as typeof fetch,
    );
    await expect(validationPort.validate("token", command()))
      .rejects.toMatchObject({ code: "AREA_EVENT_SCRIPT_RESPONSE_INVALID" });

    const foreignReceipt = structuredClone(areaEventScriptPublicationReceiptFixture());
    foreignReceipt.targetResRef = "area_exit";
    foreignReceipt.resources = foreignReceipt.resources.map((resource) => ({
      ...resource,
      logicalKey: `area_exit.${resource.extension}`,
    }));
    const publicationPort = new HttpAreaEventScriptPublicationPort(
      vi.fn(async () => response(foreignReceipt, {
        "Idempotency-Status": "created",
      })) as unknown as typeof fetch,
    );
    await expect(publicationPort.publish("token", command(), "script-publish-1"))
      .rejects.toMatchObject({ code: "AREA_EVENT_SCRIPT_RESPONSE_INVALID" });
  });
});

function response(data: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({
    contractVersion: "1.0.0",
    requestId: "request-script",
    data,
  }), { status: 200, headers: { "Content-Type": "application/json", ...headers } });
}

function command() {
  return createAreaEventScriptSourceCommand({
    moduleId: SCRIPT_MODULE_ID,
    targetResRef: "area_enter",
    expectedModuleRevision: SCRIPT_REVISION,
    sourceText: SCRIPT_SOURCE,
    includeResRefs: [],
  })!;
}

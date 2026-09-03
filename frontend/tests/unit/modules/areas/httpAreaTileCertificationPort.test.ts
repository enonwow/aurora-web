import { describe, expect, it, vi } from "vitest";
import { HttpAreaTileCertificationPort } from "../../../../src/modules/areas/adapters/httpAreaTileCertificationPort";

const hashes = Object.freeze({
  planId: "a".repeat(64),
  corpusHash: "b".repeat(64),
  ledgerSha256: "c".repeat(64),
  reportSha256: "d".repeat(64),
});

function page() {
  return {
    schemaVersion: "area-tile-certification-page.v1",
    generatedAtIso: "2026-08-21T18:00:00.000Z",
    ...hashes,
    profileId: "source-bound-v7",
    tilesetResRef: "tms01",
    items: [
      {
        tileId: 2,
        rowId: "tile:tms01:2",
        capabilityId: "topology_certified_placement_gate",
        eligibility: { status: "eligible" },
        identity: {
          schemaVersion: "area-certification.v1",
          planId: hashes.planId,
          corpusHash: hashes.corpusHash,
          profileId: "source-bound-v7",
          subject: { kind: "tile-definition", id: "tms01:2" },
        },
        proofs: {
          inventory: "verified",
          assetClosure: "missing",
          render: "missing",
          visualSeam: "missing",
          setAdjacency: "missing",
          pathReference: "missing",
          pathConnect: "missing",
          wokSeam: "missing",
          persistence: "missing",
          toolset: "missing",
          nwnRuntime: "missing",
        },
      },
    ],
    total: 1,
    limit: 256,
    offset: 0,
  };
}

describe("HttpAreaTileCertificationPort", () => {
  it("loads and strictly validates one authenticated immutable ledger page", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      contractVersion: "1.0.0",
      requestId: "request-1",
      data: page(),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaTileCertificationPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1/",
    );

    await expect(port.getTilesetPage("access-token", "tms01", {
      limit: 256,
      offset: 0,
    })).resolves.toEqual(page());
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/certification/tilesets/tms01?limit=256&offset=0",
      {
        method: "GET",
        headers: { Accept: "application/json", Authorization: "Bearer access-token" },
      },
    );
  });

  it.each([
    ["wrong tileset binding", (value: any) => { value.tilesetResRef = "tin01"; }],
    ["wrong subject binding", (value: any) => { value.items[0].identity.subject.id = "tms01:3"; }],
    ["duplicate tile id", (value: any) => { value.items.push(structuredClone(value.items[0])); }],
    ["unknown proof", (value: any) => { value.items[0].proofs.render = "pending"; }],
    ["unknown key", (value: any) => { value.items[0].ready = true; }],
    ["wrong page total", (value: any) => { value.total = 0; }],
  ])("fails closed on %s", async (_label, mutate) => {
    const malformed = structuredClone(page()) as any;
    mutate(malformed);
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: malformed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const port = new HttpAreaTileCertificationPort(fetchStub as unknown as typeof fetch);

    await expect(port.getTilesetPage("access-token", "tms01", {
      limit: 256,
      offset: 0,
    })).rejects.toMatchObject({
      name: "AreaTileCertificationRequestError",
      code: "AREA_TILE_CERTIFICATION_RESPONSE_INVALID",
    });
  });

  it("maps backend failures without exposing server detail", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
        message: "C:/secret/report.json is malformed",
        details: [],
        retryable: false,
      },
    }), { status: 503, headers: { "Content-Type": "application/json" } }));
    const port = new HttpAreaTileCertificationPort(fetchStub as unknown as typeof fetch);

    await expect(port.getTilesetPage("access-token", "tms01", {
      limit: 256,
      offset: 0,
    })).rejects.toMatchObject({
      name: "AreaTileCertificationRequestError",
      status: 503,
      code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
      message: "The Area tile-certification request failed.",
    });
  });
});

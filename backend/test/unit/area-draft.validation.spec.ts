import {
  AREA_DRAFT_MAX_BYTES,
  canonicalizeAreaDraftDocument,
  parseAreaDraftDocument,
  parseAreaDraftId,
  parseAreaDraftIdempotencyKey,
  parseAreaDraftIfMatch,
  parseAreaDraftListQuery,
  parseProductionAreaDraftOpenRequest,
} from "../../src/modules/areas/domain/area-draft.validation";

describe("Area draft boundary validation", () => {
  const valid = {
    schemaVersion: "area-draft.v1",
    title: " Crypt working copy ",
    source: { type: "production_area", areaId: "crypt01" },
    payload: { tiles: [{ row: 0, col: 0, tileId: 12 }], preserved: { FutureField: 7 } },
  };

  it("normalizes a strict v1 document and canonicalizes it deterministically", () => {
    const parsed = parseAreaDraftDocument(valid);
    expect(parsed.title).toBe("Crypt working copy");
    expect(parsed.payload).toEqual(valid.payload);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(canonicalizeAreaDraftDocument(parsed)).toBe(
      canonicalizeAreaDraftDocument(parseAreaDraftDocument({ ...valid, payload: { preserved: { FutureField: 7 }, tiles: valid.payload.tiles } })),
    );
  });

  it.each<readonly [unknown, string]>([
    [{ ...valid, unknown: true }, "unknown top-level field"],
    [{ ...valid, schemaVersion: "area-draft.v2" }, "unsupported schema"],
    [{ ...valid, source: { type: "production_area" } }, "missing source Area"],
    [{ ...valid, payload: { bad: Number.POSITIVE_INFINITY } }, "non-finite number"],
    [{ ...valid, payload: Buffer.from("binary") }, "binary payload"],
  ])("rejects %s (%s)", (candidate) => {
    expect(() => parseAreaDraftDocument(candidate)).toThrow(/AREA_DRAFT_INVALID/u);
  });

  it("rejects depth, entry-count, and byte budgets", () => {
    let nested: unknown = "leaf";
    for (let index = 0; index < 66; index += 1) nested = { child: nested };
    expect(() => parseAreaDraftDocument({ ...valid, payload: nested })).toThrow(/depth/u);
    expect(() => parseAreaDraftDocument({ ...valid, payload: "x".repeat(AREA_DRAFT_MAX_BYTES) })).toThrow(/bytes/u);
  });

  it("parses IDs, idempotency keys, exact quoted revisions, and bounded pagination", () => {
    expect(parseAreaDraftId("draft_01")).toBe("draft_01");
    expect(parseAreaDraftIdempotencyKey("save:draft_01:0001")).toBe("save:draft_01:0001");
    expect(parseAreaDraftIfMatch('"17"')).toBe(17);
    expect(parseAreaDraftListQuery({ pageSize: "100", cursor: "opaque_01" })).toEqual({ pageSize: 100, cursor: "opaque_01" });
    expect(() => parseAreaDraftIfMatch("17")).toThrow(/If-Match/u);
    expect(() => parseAreaDraftId("../draft")).toThrow(/draftId/u);
    expect(() => parseAreaDraftListQuery({ pageSize: "101" })).toThrow(/pageSize/u);
  });

  it("parses the strict copy-on-open request without accepting client source data", () => {
    expect(
      parseProductionAreaDraftOpenRequest({
        schemaVersion: "area-draft-open.v1",
        draftTitle: " Crypt 01 - Working Copy ",
      }),
    ).toEqual({
      schemaVersion: "area-draft-open.v1",
      draftTitle: "Crypt 01 - Working Copy",
    });
    expect(() =>
      parseProductionAreaDraftOpenRequest({
        schemaVersion: "area-draft-open.v1",
        draftTitle: "Copy",
        sourceArea: { injected: true },
      }),
    ).toThrow(/AREA_DRAFT_INVALID/u);
  });
});

import {
  parseModuleCacheRebuildQuery,
  parseTextureDeliveryQuery,
  parseTextureIdParam,
  parseReplaceRuntimeSettingsRequest
} from "../../src/modules/runtime-settings/adapters/inbound/http/runtime-settings.schemas";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";

const POC_MODULE_PACKED_PATH =
  "C:/Users/enonw/Documents/Neverwinter Nights/modules/the_last_city.mod";

describe("runtime settings payload schema", () => {
  it("accepts payload with moduleDecompiledPath only", () => {
    const payload = buildPayload();
    payload.paths.modulePackedPath = "";
    payload.blobStorage.bucket = "";

    expect(() => parseReplaceRuntimeSettingsRequest(payload)).not.toThrow();
  });

  it("rejects payload when both module paths are empty", () => {
    const payload = buildPayload();
    payload.paths.moduleDecompiledPath = "";
    payload.paths.modulePackedPath = "";

    expect(() => parseReplaceRuntimeSettingsRequest(payload)).toThrow(
      "Runtime settings validation failed."
    );
  });

  it("rejects payload when modulePackedPath is set and bucket is empty", () => {
    const payload = buildPayload();
    payload.paths.moduleDecompiledPath = "";
    payload.paths.modulePackedPath = POC_MODULE_PACKED_PATH;
    payload.blobStorage.bucket = "";

    expect(() => parseReplaceRuntimeSettingsRequest(payload)).toThrow(
      "Runtime settings validation failed."
    );
  });

  it("rejects payload when hakProfileId points to unknown profile", () => {
    const payload = buildPayload();
    payload.sources.placeable.hakProfileId = "unknown_profile";

    expect(() => parseReplaceRuntimeSettingsRequest(payload)).toThrow(
      "Runtime settings validation failed."
    );
  });
});

describe("module cache rebuild query schema", () => {
  it("defaults forceFull to false", () => {
    expect(parseModuleCacheRebuildQuery({})).toEqual({ forceFull: false });
  });

  it("accepts forceFull=true string", () => {
    expect(parseModuleCacheRebuildQuery({ forceFull: "true" })).toEqual({
      forceFull: true
    });
  });

  it("rejects invalid forceFull value", () => {
    expect(() => parseModuleCacheRebuildQuery({ forceFull: "abc" })).toThrow(
      "Module cache rebuild query validation failed."
    );
  });
});

describe("texture delivery query schema", () => {
  it("parses comma-separated texture ids and normalizes case", () => {
    const parsed = parseTextureDeliveryQuery({
      textureIds: "ABCDEFABCDEFABCDEFABCDEF,1234567890abcdef12345678",
      limit: "5",
      offset: "2"
    });

    expect(parsed).toEqual({
      textureIds: ["abcdefabcdefabcdefabcdef", "1234567890abcdef12345678"],
      resref: undefined,
      limit: 5,
      offset: 2
    });
  });

  it("parses repeated texture ids and de-duplicates them", () => {
    const parsed = parseTextureDeliveryQuery({
      textureIds: [
        "abcdefabcdefabcdefabcdef",
        "abcdefabcdefabcdefabcdef",
        "1234567890abcdef12345678"
      ]
    });

    expect(parsed.textureIds).toEqual([
      "abcdefabcdefabcdefabcdef",
      "1234567890abcdef12345678"
    ]);
    expect(parsed.limit).toBe(100);
    expect(parsed.offset).toBe(0);
  });

  it("rejects malformed texture id", () => {
    expect(() =>
      parseTextureDeliveryQuery({
        textureIds: "invalid"
      })
    ).toThrow("Texture delivery query validation failed.");
  });
});

describe("texture id param schema", () => {
  it("accepts valid 24-char hex id", () => {
    expect(parseTextureIdParam("ABCDEFABCDEFABCDEFABCDEF")).toBe(
      "abcdefabcdefabcdefabcdef"
    );
  });

  it("rejects invalid id shape", () => {
    expect(() => parseTextureIdParam("xyz")).toThrow("Texture id validation failed.");
  });
});

function buildPayload() {
  const defaults = buildDefaultRuntimeSettings("2026-05-23T00:00:00.000Z");
  const {
    revision: _revision,
    updatedAt: _updatedAt,
    updatedBy: _updatedBy,
    ...payload
  } = defaults;

  return payload;
}

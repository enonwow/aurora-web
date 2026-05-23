import { parseReplaceRuntimeSettingsRequest } from "../../src/modules/runtime-settings/adapters/inbound/http/runtime-settings.schemas";
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

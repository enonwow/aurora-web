import { describe, expect, it, vi } from "vitest";

import { resolvePlaceableAssetDeliveryUrl } from "../../../../src/modules/placeables/application/placeableRenderAssetResolver";

describe("resolvePlaceableAssetDeliveryUrl", () => {
  it("routes relative backend assets through the Vite proxy", () => {
    vi.stubEnv("DEV", true);

    expect(
      resolvePlaceableAssetDeliveryUrl(
        "/api/v1/catalog/tiles/cache/example/model",
        "http://127.0.0.1:5173"
      )
    ).toBe("http://127.0.0.1:5173/_aurora/v1/catalog/tiles/cache/example/model");

    vi.unstubAllEnvs();
  });
});

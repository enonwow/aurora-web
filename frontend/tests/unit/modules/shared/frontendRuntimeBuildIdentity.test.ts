import { describe, expect, it } from "vitest";

import { readFrontendRuntimeBuildIdentity } from "../../../../src/modules/shared/application/frontendRuntimeBuildIdentity";

describe("readFrontendRuntimeBuildIdentity", () => {
  it("normalizes the three compile-time identity fields", () => {
    expect(
      readFrontendRuntimeBuildIdentity({
        VITE_RUNTIME_BUILD_COMMIT: " build-commit ",
        VITE_RUNTIME_BUILD_IMAGE_DIGEST: ` sha256:${"a".repeat(64)} `,
        VITE_RUNTIME_BUILD_BUILT_AT: " 2026-08-21T16:00:00.000Z "
      })
    ).toEqual({
      commit: "build-commit",
      imageDigest: `sha256:${"a".repeat(64)}`,
      builtAt: "2026-08-21T16:00:00.000Z"
    });
  });

  it("preserves missing values as null instead of synthesizing identity", () => {
    expect(
      readFrontendRuntimeBuildIdentity({
        VITE_RUNTIME_BUILD_COMMIT: " ",
        VITE_RUNTIME_BUILD_IMAGE_DIGEST: undefined,
        VITE_RUNTIME_BUILD_BUILT_AT: 123
      })
    ).toEqual({ commit: null, imageDigest: null, builtAt: null });
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("WorkspaceLayout UI hexagonal boundary", () => {
  it("uses an application cache-miss contract instead of a renderer adapter type", () => {
    const workspaceSource = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/layout/components/WorkspaceLayout.tsx",
      ),
      "utf8",
    );
    const revalidationSource = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/layout/application/areaPlaceableRenderPayloadRevalidation.ts",
      ),
      "utf8",
    );

    expect(workspaceSource).not.toMatch(/\/adapters\//u);
    expect(workspaceSource).toContain("AreaPlaceableAssetCacheMiss");
    expect(revalidationSource).toContain(
      "export interface AreaPlaceableAssetCacheMiss",
    );
    expect(revalidationSource).toMatch(/readonly cacheKey: string/u);
    expect(revalidationSource).toMatch(
      /readonly assetKind: "model" \| "texture"/u,
    );
  });
});

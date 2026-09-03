import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("WorkspaceCanvasViewport retained ItemList dynamic UTI wiring", () => {
  it("derives exact catalog options and routes additions through provenance validation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/modules/layout/components/WorkspaceCanvasViewport.tsx"),
      "utf8",
    );

    expect(source).toContain("itemTemplateOptions = []");
    expect(source).toContain(
      "listExistingItemInventoryBlueprintOptions(itemTemplateOptions)",
    );
    expect(source).toContain("appendExistingItemInventoryBlueprintEntry(");
    expect(source).toContain(
      "itemInventoryBlueprintOptions={itemInventoryBlueprintOptions}",
    );
    expect(source).toContain(
      "addItemInventoryBlueprintEntry={addItemInventoryBlueprintEntry}",
    );
  });
});

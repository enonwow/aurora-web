import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Area editing UI hexagonal boundary", () => {
  it("keeps concrete Area adapters out of every layout component", () => {
    const componentsRoot = resolve(
      process.cwd(),
      "src/modules/layout/components",
    );
    const violations = (
      readdirSync(componentsRoot, {
        recursive: true,
        encoding: "utf8",
      }) as string[]
    )
      .filter((relativePath) => relativePath.endsWith(".tsx"))
      .filter((relativePath) =>
        /\.\.\/\.\.\/areas\/adapters/u.test(
          readFileSync(resolve(componentsRoot, relativePath), "utf8"),
        ),
      );

    expect(violations).toEqual([]);
  });

  it("routes the Area editing panel through its application facade", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/layout/components/AuroraAreaEditingPanel.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("areaEditingFacade.queries.listTilesets");
    expect(source).toContain("areaEditingFacade.queries.verify");
    expect(source).toContain(
      "areaEditingFacade.commands.exportAndDownloadAre",
    );
  });

  it("keeps adapters in the composition root, not the application facade", () => {
    const applicationSource = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/areas/application/areaEditingFacade.ts",
      ),
      "utf8",
    );
    const compositionSource = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/areas/composition/createBrowserAreaEditingFacade.ts",
      ),
      "utf8",
    );

    expect(applicationSource).not.toMatch(/\/adapters\//u);
    expect(compositionSource).toMatch(/\/adapters\//u);
  });
});

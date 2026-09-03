import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Creature appearance palette UI hexagonal boundary", () => {
  it("keeps concrete palette adapters out of CreaturesModePanel", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/layout/components/CreaturesModePanel.tsx",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/\/adapters\//u);
    expect(source).toMatch(
      /creatureAppearancePaletteFacade\.queries\s*\.ensureLoaded/u,
    );
    expect(source).toMatch(
      /creatureAppearancePaletteFacade\?\.queries\.resolveRgba/u,
    );
  });

  it("keeps the adapter in browser composition and outside the application facade", () => {
    const applicationSource = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/creatures/application/creatureAppearancePaletteFacade.ts",
      ),
      "utf8",
    );
    const compositionSource = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/creatures/composition/createBrowserCreatureAppearancePaletteFacade.ts",
      ),
      "utf8",
    );

    expect(applicationSource).not.toMatch(/\/adapters\//u);
    expect(compositionSource).toMatch(/\/adapters\//u);
  });

  it("composes in App and injects through WorkspaceLayout", () => {
    const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const workspaceSource = readFileSync(
      resolve(
        process.cwd(),
        "src/modules/layout/components/WorkspaceLayout.tsx",
      ),
      "utf8",
    );

    expect(appSource).toContain(
      "createBrowserCreatureAppearancePaletteFacade",
    );
    expect(appSource).toContain(
      "creatureAppearancePaletteFacade={creatureAppearancePaletteFacade}",
    );
    expect(workspaceSource).toContain(
      "creatureAppearancePaletteFacade={creatureAppearancePaletteFacade}",
    );
  });
});

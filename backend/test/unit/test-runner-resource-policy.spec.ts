import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("test runner resource policy", () => {
  it("routes direct Jest and Vitest commands through a 1 GB Node heap cap", () => {
    const repositoryRoot = join(process.cwd(), "..");
    for (const packagePath of ["backend/package.json", "frontend/package.json"]) {
      const packageJson = JSON.parse(
        readFileSync(join(repositoryRoot, packagePath), "utf8"),
      ) as { scripts: Record<string, string> };

      for (const [name, command] of Object.entries(packageJson.scripts)) {
        if (!/(?:^|&&\s*)(?:jest|vitest)(?:\s|$)/u.test(command)) continue;
        throw new Error(
          `${packagePath} script ${name} bypasses the Node heap cap: ${command}`,
        );
      }

      for (const name of ["test", "test:unit"]) {
        expect(packageJson.scripts[name]).toContain("--max-old-space-size=1024");
      }
    }
  });

  it("keeps the bounded backend unit lane single-worker and transpile-only", () => {
    const config = require(join(process.cwd(), "jest.unit.bounded.config.js")) as {
      maxWorkers?: number;
      transform?: Record<string, unknown>;
    };
    const transformer = config.transform?.["^.+\\.ts$"] as
      | [string, { diagnostics?: boolean; tsconfig?: { isolatedModules?: boolean } }]
      | undefined;

    expect(config.maxWorkers).toBe(1);
    expect(transformer?.[0]).toBe("ts-jest");
    expect(transformer?.[1]).toEqual(expect.objectContaining({
      diagnostics: false,
      tsconfig: expect.objectContaining({ isolatedModules: true }),
    }));
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("browser capture resource policy", () => {
  it("serializes every Node capture script that launches Chrome", () => {
    const scriptsDirectory = join(process.cwd(), "scripts");
    const chromeCaptureScripts = readdirSync(scriptsDirectory)
      .filter((name) => /^capture.*\.(?:cjs|mjs)$/u.test(name))
      .filter((name) => {
        const source = readFileSync(join(scriptsDirectory, name), "utf8");
        return /chrome\.exe|CHROME_PATH|chromePath/u.test(source);
      });

    expect(chromeCaptureScripts.length).toBeGreaterThan(0);
    for (const name of chromeCaptureScripts) {
      const source = readFileSync(join(scriptsDirectory, name), "utf8");
      expect(source).toContain("proof-capture-lock-auto.cjs");
      expect(source).toContain('"--renderer-process-limit=2"');
    }

    for (const name of chromeCaptureScripts.filter((name) =>
      name.startsWith("capture-vfx-"),
    )) {
      const source = readFileSync(join(scriptsDirectory, name), "utf8");
      expect(source).toContain("capture-process-lifecycle.mjs");
      expect(source).toContain("installCaptureProcessGuard");
      expect(source).toContain("chromeProcessGuard.terminate()");
    }
  });
});

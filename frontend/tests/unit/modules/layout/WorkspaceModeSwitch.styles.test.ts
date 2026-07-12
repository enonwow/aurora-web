import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("WorkspaceModeSwitch styles", () => {
  it("keeps all four workspace modes visible in one selector row", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf-8");
    const selectorRule = css.match(
      /\.workspace-mode-switch-buttons\[aria-label="workspace mode selector"\]\s*\{(?<body>[^}]+)\}/u
    );

    expect(selectorRule?.groups?.body).toContain(
      "grid-template-columns: repeat(4, minmax(0, 1fr));"
    );
  });
});

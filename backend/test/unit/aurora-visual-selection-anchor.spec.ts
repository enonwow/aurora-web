import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const moduleUrl = pathToFileURL(
  resolve(__dirname, "../../scripts/lib/aurora-visual-selection-anchor.mjs"),
).href;

async function evaluate(source: string) {
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `
    import * as anchor from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify(await (async () => { ${source} })()));
  `]);
  return JSON.parse(stdout);
}

describe("Aurora visual selection anchor", () => {
  const analysis = (x: number, y: number) => ({
    acceptance: { accepted: true },
    selectionAnchor: { center: { x, y } },
  });

  it("measures a selected visual anchor independently of whole-viewport pixel volume", async () => {
    const result = await evaluate(`
      const before = ${JSON.stringify(analysis(100, 100))};
      const after = ${JSON.stringify(analysis(104, 103))};
      return anchor.buildSelectionAnchorTransition({ before, after });
    `);
    expect(result.deltaX).toBe(4);
    expect(result.deltaY).toBe(3);
    expect(result.distancePixels).toBe(5);
  });

  it("rejects motion that does not clear the selection-anchor noise floor", async () => {
    const result = await evaluate(`
      const baseline = anchor.buildSelectionAnchorTransition({ before: ${JSON.stringify(analysis(10, 10))}, after: ${JSON.stringify(analysis(10.2, 10))} });
      const effect = anchor.buildSelectionAnchorTransition({ before: ${JSON.stringify(analysis(10.2, 10))}, after: ${JSON.stringify(analysis(10.6, 10))} });
      return anchor.requireMeasuredSelectionAnchorMovement({ baseline, effect });
    `);
    expect(result.status).toBe("blocked");
    expect(result.blockerCode).toBe("toolset_selection_anchor_delta_not_proven");
  });
});

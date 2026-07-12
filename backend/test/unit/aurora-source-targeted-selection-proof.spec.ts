import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const url = pathToFileURL(resolve(__dirname, "../../scripts/lib/aurora-source-targeted-selection-proof.mjs")).href;
async function verify(input: unknown) { const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `import { verifySourceTargetedSelection } from ${JSON.stringify(url)}; console.log(JSON.stringify(verifySourceTargetedSelection(${JSON.stringify(input)})));`]); return JSON.parse(stdout); }
const base = { sourceTile: { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 }, dispatch: { targetClass: "TScrollBox", method: "targeted_wm_lbuttondown_up", click: { x: 500, y: 300 }, usesGlobalCursor: false, usesGlobalKeyboard: false, usesGlobalMouse: false }, beforeAnchor: { acceptance: { accepted: false } }, afterAnchor: { acceptance: { accepted: true }, selectionAnchor: { center: { x: 560, y: 290 }, bounds: { left: 448, top: 178, width: 225, height: 225 } } }, viewportBounds: { left: 0, top: 0, width: 1291, height: 807 }, capturePath: "C:/proof/after.png" };
describe("source-targeted selection proof", () => {
  it("proves a target-only non-global selection transaction", async () => { const result = await verify(base); expect(result).toMatchObject({ status: "verified", evidenceKind: "source-targeted-visual-selection/v1", sourceTile: { tileId: 197 } }); });
  it("rejects a click that does not explain the outline", async () => { const result = await verify({ ...base, dispatch: { ...base.dispatch, click: { x: 50, y: 50 } } }); expect(result).toMatchObject({ status: "blocked", blockerCode: "source_targeted_selection_click_outside_outline" }); });
  it("rejects global input", async () => { await expect(verify({ ...base, dispatch: { ...base.dispatch, usesGlobalMouse: true } })).rejects.toBeTruthy(); });
});

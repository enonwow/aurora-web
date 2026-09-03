import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const script = resolve(__dirname, "../../scripts/build-aurora-source-grid-projection.mjs");
const proof = (x: number, y: number) => ({
  status: "verified", evidenceKind: "source-targeted-visual-selection/v1",
  plan: { module: "the_last_city - codex", area: "_ikea" },
  sourceTile: { index: y * 10 + x, x, y, tileId: 197, orientation: 1 },
  selectionCenter: { x: 100 + 20 * x - 5 * y, y: 200 + 3 * x + 25 * y },
});

describe("build-aurora-source-grid-projection", () => {
  it("writes a projection only from matching verified selection proofs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurora-source-grid-build-"));
    const inputs = await Promise.all([proof(0, 0), proof(1, 0), proof(0, 1)].map(async (value, index) => {
      const path = join(dir, `proof-${index}.json`); await writeFile(path, JSON.stringify(value)); return path;
    }));
    const out = join(dir, "projection.json");
    await execFileAsync("node", [script, "--inputs", inputs.join(","), "--module", "the_last_city - codex", "--area", "_ikea", "--out", out]);
    expect(JSON.parse(await readFile(out, "utf8"))).toMatchObject({ status: "estimated", module: "the_last_city - codex", area: "_ikea", maxResidualPixels: 0 });
  });

  it("refuses a proof from another Area", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aurora-source-grid-build-"));
    const inputs = await Promise.all([proof(0, 0), proof(1, 0), { ...proof(0, 1), plan: { module: "the_last_city - codex", area: "other" } }].map(async (value, index) => {
      const path = join(dir, `proof-${index}.json`); await writeFile(path, JSON.stringify(value)); return path;
    }));
    await expect(execFileAsync("node", [script, "--inputs", inputs.join(","), "--module", "the_last_city - codex", "--area", "_ikea", "--out", join(dir, "projection.json")])).rejects.toMatchObject({ stderr: expect.stringContaining("source_grid_projection_context_mismatch") });
  });
});

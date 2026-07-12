import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const readerUrl = pathToFileURL(resolve(__dirname, "../../scripts/inspect-aurora-toolset-tile-properties.mjs")).href;

async function evaluate(source: string) {
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `
    import { evaluateTilePropertiesSnapshot } from ${JSON.stringify(readerUrl)};
    console.log(JSON.stringify(evaluateTilePropertiesSnapshot(${source})));
  `]);
  return JSON.parse(stdout);
}

describe("Aurora Toolset Tile Properties readback", () => {
  const target = { module: "the_last_city - codex.mod", area: "enon_bakery" };

  it("fails closed when no Toolset is running", async () => {
    const result = await evaluate(JSON.stringify({ ...target, processCount: 0, dialogs: [] }));
    expect(result).toMatchObject({ status: "blocked", blockerCode: "toolset_process_count_invalid" });
    expect(result.safety).toMatchObject({ readOnly: true, launchesToolset: false, sendsWindowMessages: false });
  });

  it("does not open or infer the tile-properties dialog", async () => {
    const result = await evaluate(JSON.stringify({ ...target, processCount: 1, dialogs: [] }));
    expect(result).toMatchObject({ status: "blocked", blockerCode: "toolset_tile_properties_dialog_not_open" });
  });

  it("proves the visible dialog cannot become Tile_ID evidence", async () => {
    const result = await evaluate(JSON.stringify({
      ...target,
      processCount: 1,
      dialogs: [{ className: "TdlgTileProperties", title: "Tile Properties", childControls: [{ className: "TEdit", text: "197" }] }],
    }));
    expect(result).toMatchObject({ status: "blocked", blockerCode: "toolset_tile_properties_has_no_tile_identity_fields" });
  });
});

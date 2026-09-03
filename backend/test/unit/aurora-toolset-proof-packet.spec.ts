import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packetUrl = pathToFileURL(resolve(__dirname, "../../scripts/lib/aurora-toolset-proof-packet.mjs")).href;
async function assemble(input: unknown) {
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `import { assembleAuroraToolsetProofPacket } from ${JSON.stringify(packetUrl)}; console.log(JSON.stringify(assembleAuroraToolsetProofPacket(${JSON.stringify(input)})));`]);
  return JSON.parse(stdout);
}

const valid = {
  session: { modulePath: "approved.mod", moduleLoad: { readyAt: "2026-07-12T00:00:00.000Z" }, currentArea: { resref: "enon_bakery" } },
  observation: { target: { areaResref: "enon_bakery" }, capture: { viewportPng: "C:/proof/viewport.png", scope: "validated Toolset Area TScrollBox viewport" }, cameraPose: { status: "estimated", yawDegrees: 135, yawEvidence: { method: "source-grid-directed-selection/v1" }, pitchDegrees: 65, zoomPixelsPerTile: 143 } },
  targetReport: { status: "verified" },
  tileReadback: { status: "verified", tile: { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 } },
  monitorEvidence: { approvedPhysicalScreenDevice: "\\\\.\\DISPLAY1", moduleScreenDevice: "\\\\.\\DISPLAY1", moduleScreenPrimary: false },
};

describe("Aurora proof packet", () => {
  it("does not promote a visual-only tile selection to proof", async () => {
    const result = await assemble({ ...valid, tileReadback: { status: "blocked" } });
    expect(result).toMatchObject({ status: "blocked", blockerCodes: expect.arrayContaining(["proof_exact_tile_selection_missing"]) });
  });
  it("requires full world yaw instead of modulo-90", async () => {
    const observation = { ...valid.observation, cameraPose: { status: "estimated", yawDegreesModulo90: 45, pitchDegrees: 65, zoomPixelsPerTile: 143 } };
    const result = await assemble({ ...valid, observation });
    expect(result).toMatchObject({ status: "blocked", blockerCodes: expect.arrayContaining(["proof_numeric_camera_components_missing"]) });
  });
  it("rejects primary-display proof", async () => {
    const result = await assemble({ ...valid, monitorEvidence: { ...valid.monitorEvidence, moduleScreenPrimary: true } });
    expect(result).toMatchObject({ status: "blocked", blockerCodes: expect.arrayContaining(["proof_physical_second_monitor_unverified"]) });
  });
  it("accepts only the complete evidence packet", async () => {
    const result = await assemble(valid);
    expect(result).toMatchObject({ status: "verified", blockerCodes: [] });
    expect(result.safety).toMatchObject({ launchesToolset: false, sendsWindowMessages: false });
  });
  it("accepts a verified source-targeted selection transaction", async () => {
    const result = await assemble({ ...valid, tileReadback: { status: "verified", evidenceKind: "source-targeted-visual-selection/v1", sourceTile: valid.tileReadback.tile, selectionCenter: { x: 400, y: 300 } } });
    expect(result).toMatchObject({ status: "verified" });
    expect(result.acceptance.checks).toEqual(expect.arrayContaining([expect.objectContaining({ name: "source_targeted_tile_selection", status: "verified" })]));
  });
  it("uses monitor evidence attached by the viewport capture when no sidecar is supplied", async () => {
    const observation = { ...valid.observation, capture: { ...valid.observation.capture, monitorEvidence: valid.monitorEvidence } };
    const result = await assemble({ ...valid, observation, monitorEvidence: null });
    expect(result).toMatchObject({ status: "verified" });
  });

  it("accepts native absolute camera state only with an independent Eye transaction", async () => {
    const absoluteCoreResult = {
      status: "at_target",
      adapter: { readback: "native", provenance: "native_toolset", binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" },
      achievedState: { area: "enon_bakery", provenance: "native_toolset", camera: { yawDegrees: 45, pitchDegrees: 45, zoom: 25.5, centreX: 15, centreY: 15 } },
    };
    const eyeEvidence = {
      beforeA: { status: "verified" }, beforeB: { status: "verified" }, after: { status: "verified" },
      baseline: { status: "verified", changedSamples: 0, changedRatio: 0 },
      effect: { status: "verified", changedSamples: 42, changedRatio: 0.25 },
    };
    const result = await assemble({ ...valid, absoluteCoreResult, eyeEvidence });
    expect(result).toMatchObject({ status: "verified", blockerCodes: [] });
    expect(result.acceptance.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "native_absolute_camera", status: "verified" }),
      expect.objectContaining({ name: "independent_aurora_eye", status: "verified" }),
    ]));
  });

  it("rejects native state without a changed-after Eye result", async () => {
    const absoluteCoreResult = {
      status: "at_target",
      adapter: { readback: "native", provenance: "native_toolset", binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" },
      achievedState: { camera: { yawDegrees: 45, pitchDegrees: 45, zoom: 25.5, centreX: 15, centreY: 15 } },
    };
    const result = await assemble({ ...valid, absoluteCoreResult, eyeEvidence: { beforeA: { status: "verified" }, beforeB: { status: "verified" }, after: { status: "verified" }, baseline: { status: "verified", changedSamples: 0, changedRatio: 0 }, effect: { status: "verified", changedSamples: 0 } } });
    expect(result).toMatchObject({ status: "blocked", blockerCodes: expect.arrayContaining(["proof_aurora_eye_transaction_unverified"]) });
  });

  it("rejects an Eye baseline above the measured 0.1 percent noise ceiling", async () => {
    const absoluteCoreResult = {
      status: "at_target",
      adapter: { readback: "native", provenance: "native_toolset", binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" },
      achievedState: { camera: { yawDegrees: 45, pitchDegrees: 45, zoom: 25.5, centreX: 15, centreY: 15 } },
    };
    const eyeEvidence = { beforeA: { status: "verified" }, beforeB: { status: "verified" }, after: { status: "verified" }, baseline: { status: "verified", changedSamples: 500, changedRatio: 0.002 }, effect: { status: "verified", changedSamples: 50000, changedRatio: 0.2 } };
    const result = await assemble({ ...valid, absoluteCoreResult, eyeEvidence });
    expect(result).toMatchObject({ status: "blocked", blockerCodes: expect.arrayContaining(["proof_aurora_eye_transaction_unverified"]) });
  });
});

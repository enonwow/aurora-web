import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const stateModule = pathToFileURL(
  resolve(__dirname, "../../scripts/lib/aurora-toolset-session-state.mjs"),
).href;
const planModule = pathToFileURL(
  resolve(__dirname, "../../scripts/lib/toolset-startup-load-plan.mjs"),
).href;

async function runScenario(body: string) {
  const source = `
import * as state from ${JSON.stringify(stateModule)};
import * as plan from ${JSON.stringify(planModule)};
const result = await (async () => { ${body} })();
console.log(JSON.stringify(result));
`;
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", source], {
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout);
}

describe("aurora-toolset-session-state", () => {
  it("accepts only the dedicated left-monitor origin", async () => {
    const result = await runScenario(`
      return {
        approved: plan.isApprovedToolsetProofWindowLeft(-1920),
        primary: plan.isApprovedToolsetProofWindowLeft(0),
        arbitraryNegative: plan.isApprovedToolsetProofWindowLeft(-1),
      };
    `);

    expect(result).toEqual({ approved: true, primary: false, arbitraryNegative: false });
  });

  it("starts with a passive observation window even when MRU0 matches", async () => {
    const result = await runScenario(`
      return plan.buildToolsetStartupLoadPlan({
        modulePath: "C:/NWN/modules/the_last_city - codex.mod",
        currentMru0: "C:\\\\NWN\\\\modules\\\\the_last_city - codex.mod",
      });
    `);

    expect(result).toMatchObject({
      mode: "passive_observation_then_explicit_open",
      loadOwner: null,
      observedExternalLoadOwner: "mru",
      expectedMruMatches: true,
      explicitOpenAllowed: false,
      passiveObservationMs: 0,
    });
  });

  it("does not pre-authorize Open when MRU0 targets another module", async () => {
    const result = await runScenario(`
      return plan.buildToolsetStartupLoadPlan({
        modulePath: "C:/NWN/modules/the_last_city - codex.mod",
        currentMru0: "C:/NWN/modules/another.mod",
      });
    `);

    expect(result).toMatchObject({
      mode: "passive_observation_then_explicit_open",
      loadOwner: null,
      observedExternalLoadOwner: "external",
      expectedMruMatches: false,
      explicitOpenAllowed: false,
    });
  });

  it("does not add an artificial startup delay on a clean welcome surface", async () => {
    const result = await runScenario(`
      const startupPlan = plan.buildToolsetStartupLoadPlan({
        modulePath: "C:/NWN/modules/approved.mod",
        currentMru0: "C:/NWN/modules/approved.mod",
      });
      return plan.evaluateToolsetStartupObservation({
        plan: startupPlan,
        elapsedMs: 0,
        stableSurfaceMs: 0,
        surfaceKind: "welcome",
      });
    `);

    expect(result).toMatchObject({
      decision: "explicit_open_eligible",
      explicitOpenAllowed: true,
      loadOwner: null,
    });
  });

  it("allows one explicit Open only after a stable no-signal surface", async () => {
    const result = await runScenario(`
      const startupPlan = plan.buildToolsetStartupLoadPlan({
        modulePath: "C:/NWN/modules/approved.mod",
        currentMru0: "C:/NWN/modules/approved.mod",
      });
      return plan.evaluateToolsetStartupObservation({
        plan: startupPlan,
        elapsedMs: 15000,
        stableSurfaceMs: 15000,
        surfaceKind: "blank_frame",
      });
    `);

    expect(result).toMatchObject({
      decision: "explicit_open_eligible",
      explicitOpenAllowed: true,
      loadOwner: null,
    });
  });

  it("permanently gives startup progress ownership before any explicit Open", async () => {
    const result = await runScenario(`
      const startupPlan = plan.buildToolsetStartupLoadPlan({
        modulePath: "C:/NWN/modules/approved.mod",
        currentMru0: "C:/NWN/modules/approved.mod",
      });
      return plan.evaluateToolsetStartupObservation({
        plan: startupPlan,
        elapsedMs: 7000,
        stableSurfaceMs: 7000,
        surfaceKind: "welcome",
        observedSignals: [{ kind: plan.TOOLSET_STARTUP_SIGNAL_KINDS.PROGRESS_DIALOG }],
      });
    `);

    expect(result).toMatchObject({ decision: "owned_load", loadOwner: "mru", explicitOpenAllowed: false });
  });

  it("does not restore explicit Open after a startup progress dialog disappears", async () => {
    const result = await runScenario(`
      const startupPlan = plan.buildToolsetStartupLoadPlan({
        modulePath: "C:/NWN/modules/approved.mod",
        currentMru0: "C:/NWN/modules/approved.mod",
      });
      return plan.evaluateToolsetStartupObservation({
        plan: startupPlan,
        elapsedMs: 60000,
        stableSurfaceMs: 30000,
        surfaceKind: "blank_frame",
        observedSignals: [],
        loadOwner: plan.TOOLSET_LOAD_OWNERS.MRU,
      });
    `);

    expect(result).toMatchObject({ decision: "owned_load", loadOwner: "mru", explicitOpenAllowed: false });
  });

  it("makes a recovery prompt a hard blocker instead of clicking through", async () => {
    const result = await runScenario(`
      const startupPlan = plan.buildToolsetStartupLoadPlan({
        modulePath: "C:/NWN/modules/approved.mod",
        currentMru0: "C:/NWN/modules/approved.mod",
      });
      return plan.evaluateToolsetStartupObservation({
        plan: startupPlan,
        elapsedMs: 1000,
        stableSurfaceMs: 0,
        surfaceKind: null,
        observedSignals: [{ kind: plan.TOOLSET_STARTUP_SIGNAL_KINDS.RECOVERY_PROMPT }],
      });
    `);

    expect(result).toMatchObject({
      decision: "block",
      loadOwner: "recovery",
      explicitOpenAllowed: false,
      blockerCode: "toolset_recovery_prompt_blocked_critical",
    });
  });

  it("forbids File > Open after MRU owns module loading", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 169 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      return { session, explicitOpenAllowed: state.canSubmitExplicitModuleOpen(session) };
    `);

    expect(result.explicitOpenAllowed).toBe(false);
    expect(result.session.moduleLoad).toMatchObject({ owner: "mru", explicitOpenCount: 0 });
  });

  it("keeps a valid Area session active when one evidence lane fails", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "approved.mod" });
      session = state.markAreaReady(session, { resref: "approved_area", name: "Approved Area" });
      session = state.recordLaneFailure(session, { lane: "area_capture", code: "readonly_capture_not_comparable" });
      return { phase: session.phase, laneFailures: session.laneFailures, liveness: state.inspectToolsetSessionLiveness(session, [{ Id: 42 }]) };
    `);

    expect(result.phase).toBe("area_ready");
    expect(result.laneFailures).toEqual([expect.objectContaining({ lane: "area_capture", code: "readonly_capture_not_comparable", currentArea: "approved_area" })]);
    expect(result.liveness).toEqual({ status: "live", blockerCode: null });
  });

  it("never treats partial or estimated proof as a completed six-stage session", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "approved.mod" });
      session = state.markAreaReady(session, { resref: "approved_area" });
      session = state.recordModuleOpenProof(session, { proofPath: "C:/proof/open.png" });
      session = state.recordAreaCapture(session, { resref: "approved_area", pngPath: "C:/proof/before-a.png" });
      session = state.recordCameraCalibration(session, { resref: "approved_area", calibrationPath: "C:/proof/camera.json", status: "estimated" });
      return state.evaluateToolsetSessionCompletion(session);
    `);

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining([
      "aurora_eye_artifacts",
      "native_readback_and_camera_response",
      "target_45_degree_and_proof_packet",
    ]));
  });

  it("requires exactly the three independently verified Aurora Eye checkpoints", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "approved.mod" });
      session = state.markAreaReady(session, { resref: "approved_area" });
      session = state.recordSceneObservation(session, { resref: "approved_area", observationPath: "C:/proof/scene.json", status: "verified" });
      session = state.recordAuroraEyeArtifact(session, { resref: "approved_area", stage: "before-a", pngPath: "C:/proof/a.png", resultPath: "C:/proof/a.json", status: "verified" });
      session = state.recordAuroraEyeArtifact(session, { resref: "approved_area", stage: "before-b", pngPath: "C:/proof/b.png", resultPath: "C:/proof/b.json", status: "verified" });
      let duplicateCode = null;
      try { state.recordAuroraEyeArtifact(session, { resref: "approved_area", stage: "before-b", pngPath: "C:/proof/b2.png", resultPath: "C:/proof/b2.json", status: "verified" }); } catch (error) { duplicateCode = error.code; }
      return { completion: state.evaluateToolsetSessionCompletion(session), duplicateCode };
    `);

    expect(result.completion.requirements.find((requirement: { id: string }) => requirement.id === "aurora_eye_artifacts")).toMatchObject({ ok: false });
    expect(result.duplicateCode).toBe("DUPLICATE_EYE_ARTIFACT_FORBIDDEN");
  });

  it("requires verified native readback rather than a visual camera estimate", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "approved.mod" });
      session = state.markAreaReady(session, { resref: "approved_area" });
      session = state.recordCameraCalibration(session, { resref: "approved_area", calibrationPath: "C:/proof/camera.json", status: "verified" });
      return state.evaluateToolsetSessionCompletion(session);
    `);

    expect(result.requirements.find((requirement: { id: string }) => requirement.id === "native_readback_and_camera_response")).toMatchObject({ ok: false });
  });

  it("requires separate three-sample native models for yaw, pitch, and zoom", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "approved.mod" });
      session = state.markAreaReady(session, { resref: "approved_area" });
      session = state.recordNativeCameraResponseModel(session, { resref: "approved_area", modelPath: "C:/proof/yaw.json", command: "yaw-plus", controlledAxes: ["yawDegrees"], sampleCount: 3 });
      session = state.recordNativeCameraResponseModel(session, { resref: "approved_area", modelPath: "C:/proof/pitch.json", command: "pitch-plus", controlledAxes: ["pitchDegrees"], sampleCount: 3 });
      return state.evaluateToolsetSessionCompletion(session);
    `);

    expect(result.requirements.find((requirement: { id: string }) => requirement.id === "native_readback_and_camera_response")).toMatchObject({ ok: false });
  });

  it("accepts the documented Tile Properties non-identity finding but still requires source selection", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "approved.mod" });
      session = state.markAreaReady(session, { resref: "approved_area" });
      session = state.recordTilePropertyReadback(session, { resref: "approved_area", readbackPath: "C:/proof/tile.json", status: "blocked", blockerCode: "toolset_tile_properties_has_no_tile_identity_fields" });
      session = state.recordSourceSelectionProof(session, { resref: "approved_area", proofPath: "C:/proof/selection.json", status: "verified" });
      for (const [command, axis] of [["yaw-plus", "yawDegrees"], ["pitch-plus", "pitchDegrees"], ["zoom-plus", "zoomLogRatio"]]) session = state.recordNativeCameraResponseModel(session, { resref: "approved_area", modelPath: "C:/proof/" + command + ".json", command, controlledAxes: [axis], sampleCount: 3 });
      return state.evaluateToolsetSessionCompletion(session);
    `);

    expect(result.requirements.find((requirement: { id: string }) => requirement.id === "native_readback_and_camera_response")).toMatchObject({ ok: true });
  });

  it("allows coverage to be closed after a documented lane failure without claiming completion", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "approved.mod" });
      session = state.markAreaReady(session, { resref: "approved_area" });
      session = state.recordModuleOpenProof(session, { proofPath: "C:/proof/open.png" });
      for (const stage of ["before-a", "before-b", "after"]) session = state.recordAuroraEyeArtifact(session, { resref: "approved_area", stage, pngPath: "C:/proof/" + stage + ".png", resultPath: "C:/proof/" + stage + ".json", status: "failed" });
      session = state.recordLaneFailure(session, { lane: "native_camera_response", code: "adapter_unavailable", details: { evidencePath: "C:/proof/adapter.json" } });
      session = state.recordLaneFailure(session, { lane: "viewport_target", code: "target_blocked", details: { evidencePath: "C:/proof/target.json" } });
      return { coverage: state.evaluateToolsetSessionCoverage(session), completion: state.evaluateToolsetSessionCompletion(session) };
    `);

    expect(result.coverage.ok).toBe(true);
    expect(result.completion.ok).toBe(false);
  });

  it("does not count a historical PID from a blocked session as a live single-process proof", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.blockToolsetSession(session, { code: "unexpected_module_window_loaded" });
      return state.evaluateToolsetSessionCompletion(session);
    `);

    expect(result.requirements.find((requirement: { id: string }) => requirement.id === "one_toolset_process")).toMatchObject({ ok: false });
  });

  it("retains the one-process proof after a verified canonical close", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session.phase = "closed";
      session.closeResult = { close: { ok: true } };
      return state.evaluateToolsetSessionCompletion(session);
    `);

    expect(result.requirements.find((requirement: { id: string }) => requirement.id === "one_toolset_process")).toMatchObject({ ok: true });
  });

  it("rejects a second load owner after recovery, MRU, or explicit open claimed the session", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.RECOVERY });
      try {
        state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.EXPLICIT_OPEN });
        return { code: null };
      } catch (error) {
        return { code: error.code, message: error.message };
      }
    `);

    expect(result.code).toBe("SECOND_MODULE_LOAD_FORBIDDEN");
  });

  it("claims startup progress before recording Loading Inventory List", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.recordStartupLoadSignal(session, {
        kind: plan.TOOLSET_STARTUP_SIGNAL_KINDS.PROGRESS_DIALOG,
        details: { texts: ["Loading Inventory List", "Loading GIT Files", "appearance"] },
        owner: plan.TOOLSET_LOAD_OWNERS.MRU,
      });
      session = state.recordModuleProgress(session, { kind: "loading_inventory_list" });
      return { explicitOpenAllowed: state.canSubmitExplicitModuleOpen(session), session };
    `);

    expect(result.explicitOpenAllowed).toBe(false);
    expect(result.session.moduleLoad.owner).toBe("mru");
    expect(result.session.moduleLoad.progressKind).toBe("loading_inventory_list");
    expect(result.session.moduleLoad.explicitOpenCount).toBe(0);
    expect(result.session.moduleLoad.startupSignals).toHaveLength(1);
  });

  it("rejects a second Toolset process and a duplicate Area open", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      let secondProcessCode = null;
      try { state.recordToolsetProcessStart(session, { pid: 43 }); } catch (error) { secondProcessCode = error.code; }
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.EXPLICIT_OPEN });
      session = state.markModuleReady(session, { windowTitle: "Toolset - approved.mod" });
      session = state.markAreaReady(session, { resref: "_ikea" });
      let duplicateAreaCode = null;
      try { state.markAreaReady(session, { resref: "_ikea" }); } catch (error) { duplicateAreaCode = error.code; }
      return { secondProcessCode, duplicateAreaCode };
    `);

    expect(result).toEqual({
      secondProcessCode: "SECOND_TOOLSET_START_FORBIDDEN",
      duplicateAreaCode: "DUPLICATE_AREA_OPEN_FORBIDDEN",
    });
  });

  it("records observation, source selection proof, and viewport-target evaluation only for the current Area", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      session = state.claimModuleLoad(session, { owner: plan.TOOLSET_LOAD_OWNERS.MRU });
      session = state.markModuleReady(session, { windowTitle: "Toolset - approved.mod" });
      session = state.markAreaReady(session, { resref: "enon_bakery" });
      session = state.recordSceneObservation(session, {
        resref: "enon_bakery",
        observationPath: "C:/proof/scene-observation.json",
        status: "captured-and-contextualized",
      });
      session = state.recordTilePropertyReadback(session, {
        resref: "enon_bakery",
        readbackPath: "C:/proof/tile-properties.json",
        status: "blocked",
        blockerCode: "toolset_tile_properties_has_no_tile_identity_fields",
      });
      session = state.recordSourceSelectionProof(session, {
        resref: "enon_bakery",
        proofPath: "C:/proof/source-selection.json",
        status: "verified",
      });
      session = state.recordCameraCalibration(session, {
        resref: "enon_bakery",
        calibrationPath: "C:/proof/yaw-calibration.json",
        status: "estimated",
      });
      session = state.recordViewportTargetEvaluation(session, {
        resref: "enon_bakery",
        reportPath: "C:/proof/viewport-target.json",
        status: "blocked",
        blockerCodes: ["camera_world_yaw_readback_unavailable"],
      });
      session = state.recordProofPacket(session, {
        resref: "enon_bakery",
        packetPath: "C:/proof/packet.json",
        status: "blocked",
        blockerCodes: ["proof_exact_tile_selection_missing"],
      });
      let mismatchCode = null;
      try {
        state.recordViewportTargetEvaluation(session, {
          resref: "other_area",
          reportPath: "C:/proof/other.json",
          status: "blocked",
        });
      } catch (error) { mismatchCode = error.code; }
      return { observations: session.observations, readbacks: session.tilePropertyReadbacks, selections: session.sourceSelectionProofs, calibrations: session.cameraCalibrations, targets: session.viewportTargetEvaluations, packets: session.proofPackets, mismatchCode };
    `);

    expect(result.observations).toHaveLength(1);
    expect(result.readbacks).toHaveLength(1);
    expect(result.readbacks[0]).toMatchObject({
      resref: "enon_bakery",
      status: "blocked",
      blockerCode: "toolset_tile_properties_has_no_tile_identity_fields",
    });
    expect(result.selections).toHaveLength(1);
    expect(result.selections[0]).toMatchObject({ resref: "enon_bakery", status: "verified" });
    expect(result.calibrations).toHaveLength(1);
    expect(result.calibrations[0]).toMatchObject({ resref: "enon_bakery", status: "estimated" });
    expect(result.targets).toHaveLength(1);
    expect(result.packets).toHaveLength(1);
    expect(result.packets[0]).toMatchObject({ status: "blocked", blockerCodes: ["proof_exact_tile_selection_missing"] });
    expect(result.targets[0]).toMatchObject({
      resref: "enon_bakery",
      status: "blocked",
      blockerCodes: ["camera_world_yaw_readback_unavailable"],
    });
    expect(result.mismatchCode).toBe("VIEWPORT_TARGET_AREA_MISMATCH");
  });

  it("classifies an active session with no process as orphaned instead of live", async () => {
    const result = await runScenario(`
      let session = state.createToolsetSession({ modulePath: "approved.mod", queuePath: "queue.json", areaCount: 1 });
      session = state.recordToolsetProcessStart(session, { pid: 42 });
      return state.inspectToolsetSessionLiveness(session, []);
    `);

    expect(result).toEqual({
      status: "orphaned",
      blockerCode: "toolset_session_orphaned_no_process",
      reason: "Session is active but no nwtoolset process exists. Run reconcile before another preflight.",
    });
  });

  it("wires the real opener and queue to the single-load contract", async () => {
    const opener = await readFile(
      resolve(__dirname, "../../scripts/open-last-city-module-and-area-toolset-no-global-input.mjs"),
      "utf8",
    );
    const manager = await readFile(
      resolve(__dirname, "../../scripts/aurora-toolset-session.mjs"),
      "utf8",
    );
    const queue = await readFile(
      resolve(__dirname, "../../scripts/run-toolset-area-oracle-queue.mjs"),
      "utf8",
    );

    expect(opener).toContain("buildToolsetStartupLoadPlan");
    expect(opener).toContain("AURORA_TOOLSET_STARTUP_LOAD_MODE");
    expect(opener).toContain("'TdlgProgress'");
    expect(opener).toContain("AURORA_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS");
    expect(opener).toContain("toolset_noncanonical_entrypoint_rejected");
    expect(opener.indexOf("toolset_primary_display_target_rejected")).toBeLessThan(
      opener.indexOf("toolset_unsafe_override_rejected"),
    );
    expect(opener).toContain("unowned_open_module_dialog_detected");
    expect(opener).toContain("explicit_open_forbidden_after_module_load_claim");
    expect(opener).not.toContain("Start-Sleep -Seconds 3");
    expect(opener).toContain("welcomeHandled = $welcomeHandled");
    expect(opener).toContain("welcomeProbe = $welcomeProbe");
    expect(opener).toContain("openModuleDialogRequested = $openModuleDialogRequested");
    expect(opener).toContain("openModuleDialogHandled = $openModuleDialogHandled");
    expect(opener).toContain("terminalFailureWithoutVisibleProcess");
    expect(opener).toContain("welcome_open_existing_radio_not_checked");
    expect(opener).toContain("radioCheckReadback = $radioCheckReadback");
    expect(opener).toContain("Loading Custom Palettes");
    expect(opener).toContain("startup_non_module_progress");
    expect(opener).not.toContain("function Restart-BlankToolsetFrame");
    expect(manager).toContain('case "all"');
    expect(manager).toContain('case "observe"');
    expect(manager).toContain('case "record-eye-artifact"');
    expect(manager).toContain('case "read-tile-properties"');
    expect(manager).toContain('case "record-source-selection"');
    expect(manager).toContain('case "record-camera-calibration"');
    expect(manager).toContain('case "record-native-camera-response"');
    expect(manager).toContain('case "verify-viewport-target"');
    expect(manager).toContain('case "assemble-proof-packet"');
    expect(manager).toContain('case "reconcile"');
    expect(manager).toContain("recordSceneObservation");
    expect(manager).toContain("recordAuroraEyeArtifact");
    expect(manager).toContain("recordTilePropertyReadback");
    expect(manager).toContain("recordSourceSelectionProof");
    expect(manager).toContain("recordCameraCalibration");
    expect(manager).toContain("recordNativeCameraResponseModel");
    expect(manager).toContain("recordViewportTargetEvaluation");
    expect(manager).toContain("recordProofPacket");
    expect(manager).toContain("evaluateToolsetSessionCompletion");
    expect(manager).toContain("evaluateToolsetSessionCoverage");
    expect(manager).toContain("TOOLSET_SESSION_CLOSE_BEFORE_COVERAGE_FORBIDDEN");
    expect(manager).toContain("TOOLSET_CLOSE_REQUIRES_EXPLICIT_USER_AUTHORIZATION");
    expect(manager).toContain("--userAuthorizedClose true");
    expect(manager).toContain("--closeAuthorization <verbatim user request>");
    expect(manager).toContain("function preserveLiveSessionAfterFailure");
    expect(manager).not.toContain("function safeCloseAfterFailure");
    expect(manager).toContain("profile.requiresSixStageCoverage");
    expect(manager).toMatch(/"npc-item-live":\s*\{\s*requiresSixStageCoverage: false/u);
    expect(manager).toMatch(/"placeable-live-standard":\s*\{\s*requiresSixStageCoverage: false/u);
    expect(manager).toContain("TOOLSET_VIEWPORT_TARGET_MUST_BE_45_DEGREES");
    expect(manager).toContain('appendOptionalOption(args, "tileIndex", "--tileIndex")');
    expect(manager).toContain('AURORA_TOOLSET_CANONICAL_SESSION_ENTRYPOINT: "1"');
    expect(manager).not.toContain('"integration-test"');
    expect(manager).toContain("CANONICAL_TOOLSET_WORKFLOW_STAGES_REQUIRED");
    expect(queue).toContain("resolveAreaResref");
    expect(queue).toContain('"--outPath"');
    const tileInspector = await readFile(
      resolve(__dirname, "../../scripts/inspect-aurora-toolset-tile-properties.mjs"),
      "utf8",
    );
    expect(tileInspector).toContain("$windowProcessId");
    expect(tileInspector).not.toContain("[uint32]$pid = 0");
  });
});

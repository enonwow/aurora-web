import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import App from "../../../src/App";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

describe("App VFX fixture runner route", () => {
  beforeEach(() => {
    clearTelemetry();
    window.localStorage.clear();
  });

  it("renders the dev VFX fixture route without auth redirecting to login", () => {
    const path =
      "/dev/vfx-fixture/vfx-retail-dm-visualeffect-row-68-duration-0?time=0.5&seed=1";
    window.history.replaceState({}, "", path);

    render(<App />);

    const runner = screen.getByTestId("vfx-fixture-runner");
    expect(runner).toHaveAttribute(
      "data-fixture-id",
      "vfx-retail-dm-visualeffect-row-68-duration-0"
    );
    expect(runner).toHaveAttribute("data-canonical-parity-promoted", "false");
    expect(runner).toHaveAttribute("data-texture-profile", "radial-soft-atlas-4x4-v2");
    expect(runner).toHaveAttribute("data-texture-atlas-columns", "4");
    expect(runner).toHaveAttribute("data-texture-atlas-rows", "4");
    expect(runner).toHaveAttribute("data-texture-atlas-cell-size", "32");
    expect(runner).toHaveAttribute("data-texture-atlas-cell-count", "16");
    expect(runner).toHaveAttribute("data-texture-width", "128");
    expect(runner).toHaveAttribute("data-texture-height", "128");
    expect(runner).toHaveAttribute("data-screenshot-export", "disabled");
    expect(runner).toHaveAttribute("data-draw-lane", "textured_quad");
    expect(runner).toHaveAttribute("data-rendered-vertices", "0");
    expect(runner).toHaveAttribute("data-rendered-draw-record-ids", "");
    expect(runner).toHaveAttribute("data-rendered-emitter-node-names", "");
    expect(runner).toHaveAttribute("data-rendered-draw-record-lanes", "");
    expect(runner).toHaveAttribute("data-rendered-particle-ids", "");
    expect(runner).toHaveAttribute("data-rendered-particle-indexes", "");
    expect(runner).toHaveAttribute("data-rendered-position-x", "");
    expect(runner).toHaveAttribute("data-rendered-position-y", "");
    expect(runner).toHaveAttribute("data-rendered-position-z", "");
    expect(runner).toHaveAttribute("data-rendered-velocity-x", "");
    expect(runner).toHaveAttribute("data-rendered-velocity-y", "");
    expect(runner).toHaveAttribute("data-rendered-velocity-z", "");
    expect(runner).toHaveAttribute("data-rendered-color-r", "");
    expect(runner).toHaveAttribute("data-rendered-color-g", "");
    expect(runner).toHaveAttribute("data-rendered-color-b", "");
    expect(runner).toHaveAttribute("data-rendered-particle-size-x", "");
    expect(runner).toHaveAttribute("data-rendered-particle-size-y", "");
    expect(runner).toHaveAttribute("data-rendered-alpha", "");
    expect(runner).toHaveAttribute("data-rendered-record-vertices-per-particle", "");
    expect(runner).toHaveAttribute("data-rendered-plt-layers", "");
    expect(runner).toHaveAttribute("data-rendered-plt-layer-color-sources", "");
    expect(runner).toHaveAttribute("data-rendered-render-order", "0");
    expect(runner).toHaveAttribute("data-rendered-render-mode", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-render-mode-raw-token", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-blend-mode", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-blend-mode-raw-token", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-blend-mode-number", "-1");
    expect(runner).toHaveAttribute("data-rendered-diagnostic-codes", "");
    expect(runner).toHaveAttribute("data-rendered-atlas-frames", "");
    expect(runner).toHaveAttribute("data-rendered-atlas-frame-count", "0");
    expect(runner).toHaveAttribute("data-rendered-atlas-uv-u0", "");
    expect(runner).toHaveAttribute("data-rendered-atlas-uv-v0", "");
    expect(runner).toHaveAttribute("data-rendered-atlas-uv-u1", "");
    expect(runner).toHaveAttribute("data-rendered-atlas-uv-v1", "");
    expect(runner).toHaveAttribute("data-rendered-geometry-non-indexed-draw-arrays", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-geometry-indexed-draw-arrays", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-geometry-draw-mode-argument", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-mode-argument-source",
      "skipped-test"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-vertices-per-particle", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-atlas-uv-source", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-count", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-item-size", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-x-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-x-max", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-y-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-y-max", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-z-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-position-attribute-z-max", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-position-attribute-min-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-position-attribute-max-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-count", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-item-size", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-unique-count", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-r-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-r-max", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-g-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-g-max", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-b-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-color-attribute-b-max", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-color-attribute-min-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-color-attribute-max-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-alpha-attribute-count", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-alpha-attribute-item-size", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-alpha-attribute-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-alpha-attribute-max", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-alpha-attribute-min-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-alpha-attribute-max-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-particle-size-attribute-count", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-particle-size-attribute-item-size",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-particle-size-attribute-x-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-particle-size-attribute-x-max", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-particle-size-attribute-y-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-particle-size-attribute-y-max", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-particle-size-attribute-min-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-particle-size-attribute-max-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-atlas-frame-attribute-count", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-atlas-frame-attribute-item-size",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-atlas-frame-attribute-source",
      "skipped-test"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-atlas-frame-attribute-unique-count",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-atlas-frame-attribute-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-atlas-frame-attribute-max", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-atlas-frame-attribute-min-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-atlas-frame-attribute-max-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-item-size",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-source",
      "skipped-test"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-unique-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-min",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-max",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-min-vertices-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-draw-record-index-attribute-max-vertices-per-record",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-geometry-uv-attribute-count", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-uv-attribute-item-size", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-uv-attribute-u-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-uv-attribute-u-max", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-uv-attribute-v-min", "0");
    expect(runner).toHaveAttribute("data-rendered-geometry-uv-attribute-v-max", "0");
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-uv-attribute-min-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-geometry-uv-attribute-max-unique-values-per-record",
      "0"
    );
    expect(runner).toHaveAttribute("data-rendered-bounds-width", "0");
    expect(runner).toHaveAttribute("data-rendered-bounds-height", "0");
    expect(runner).toHaveAttribute("data-rendered-bounds-center-x", "0");
    expect(runner).toHaveAttribute("data-rendered-bounds-center-y", "0");
    expect(runner).toHaveAttribute("data-rendered-texture-reference", "");
    expect(runner).toHaveAttribute("data-rendered-texture-status", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-transparent", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-depth-write", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-depth-test", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-alpha-test", "0");
    expect(runner).toHaveAttribute("data-rendered-material-opacity", "0");
    expect(runner).toHaveAttribute("data-rendered-material-color-hex", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-blending", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-blend-src", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-blend-dst", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-blend-equation", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-map-bound", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-map-reference", "");
    expect(runner).toHaveAttribute("data-rendered-material-vertex-colors", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-side", "skipped-test");
    expect(runner).toHaveAttribute("data-rendered-material-status", "skipped-test");
    expect(screen.getByLabelText(/render canvas/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /sign in to aurora web/i })
    ).not.toBeInTheDocument();
    expect(window.location.pathname).toBe(
      "/dev/vfx-fixture/vfx-retail-dm-visualeffect-row-68-duration-0"
    );
  });

  it("exposes ProgFX Type 4 light metadata on the fixture route with the simple data-url proof switch", () => {
    const path =
      "/dev/vfx-fixture/vfx-retail-progfx-type4-blue-5m-light?time=0.5&seed=37&capture=data-url";
    window.history.replaceState({}, "", path);

    render(<App />);

    const runner = screen.getByTestId("vfx-fixture-runner");
    expect(runner).toHaveAttribute("data-fixture-id", "vfx-retail-progfx-type4-blue-5m-light");
    expect(runner).toHaveAttribute("data-screenshot-export", "data-url");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-proof-status",
      "source-backed-progfx-type4-light-lane-not-placeable-not-mdl-runtime-scheduling-unverified"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-row-id", "304");
    expect(runner).toHaveAttribute("data-progfx-type4-label", "LightBlue5m");
    expect(runner).toHaveAttribute("data-progfx-type4-param1-animation-raw", "Blue_5m");
    expect(runner).toHaveAttribute("data-progfx-type4-animation", "Blue_5m");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-param1-animation-status",
      "source-backed-progfx-type4-param1-animation-token-preserved"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-symbolic-color", "Blue");
    expect(runner).toHaveAttribute("data-progfx-type4-token-radius-meters", "5");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-token-radius-proof-status",
      "source-backed-progfx-param1-animation-token-radius"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-radius-meters", "13.3");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-radius-proof-status",
      "source-family-backed-fx_light_clr-mdl-animation-radius"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-node-name", "AuroraLight01");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-animation", "Blue_5m");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-color", "0.5,0.5,1");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-radius-meters", "13.3");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-radius-frames", "0,13.3");
    expect(runner).toHaveAttribute("data-progfx-type4-param3-cast-shadows-raw", "0");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-param3-cast-shadows-status",
      "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-param4-priority-raw", "20");
    expect(runner).toHaveAttribute("data-progfx-type4-priority", "20");
    expect(runner).toHaveAttribute("data-progfx-type4-cast-shadows", "false");
    expect(runner).toHaveAttribute("data-progfx-type4-param6-attach-to-scene-raw", "0");
    expect(runner).toHaveAttribute("data-progfx-type4-attach-to-scene", "false");
    expect(runner).toHaveAttribute("data-progfx-type4-param7-model-raw", "fx_light_clr");
    expect(runner).toHaveAttribute("data-progfx-type4-model-ref", "fx_light_clr");
    expect(runner).toHaveAttribute("data-progfx-type4-color-r", "0.5");
    expect(runner).toHaveAttribute("data-progfx-type4-color-g", "0.5");
    expect(runner).toHaveAttribute("data-progfx-type4-color-b", "1");
    expect(runner).toHaveAttribute("data-progfx-type4-not-placeable-light", "true");
    expect(runner).toHaveAttribute("data-progfx-type4-not-mdl-light-node", "true");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-runtime-scheduling-status",
      "blocked-owner-phase-effect-instance-required"
    );
    expect(runner.getAttribute("data-progfx-type4-runtime-scheduling-proof-source")).toContain(
      "decompiled_all.c:348244 loads visualeffects.2da"
    );
    expect(runner.getAttribute("data-progfx-type4-runtime-scheduling-blocker")).toContain(
      "Param4/Param5/Param6/vision policy semantics are docs-backed"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-parameter-preservation-proof-status",
      "source-backed-progfx-type4-param1-param8-raw-preserved"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-shadow-policy-status",
      "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked"
    );
  });

  it("exposes ProgFX Type 4 owner-phase metadata on the fixture route", () => {
    const path =
      "/dev/vfx-fixture/vfx-retail-progfx-type4-blue-5m-owner-phase?time=0.5&seed=37&capture=data-url";
    window.history.replaceState({}, "", path);

    render(<App />);

    const runner = screen.getByTestId("vfx-fixture-runner");
    expect(runner).toHaveAttribute(
      "data-fixture-id",
      "vfx-retail-progfx-type4-blue-5m-owner-phase"
    );
    expect(runner).toHaveAttribute("data-screenshot-export", "data-url");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-proof-status",
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-row-id", "304");
    expect(runner).toHaveAttribute("data-progfx-type4-label", "LightBlue5m");
    expect(runner).toHaveAttribute("data-progfx-type4-param1-animation-raw", "Blue_5m");
    expect(runner).toHaveAttribute("data-progfx-type4-animation", "Blue_5m");
    expect(runner).toHaveAttribute("data-progfx-type4-symbolic-color", "Blue");
    expect(runner).toHaveAttribute("data-progfx-type4-token-radius-meters", "5");
    expect(runner).toHaveAttribute("data-progfx-type4-radius-meters", "13.3");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-radius-meters", "13.3");
    expect(runner).toHaveAttribute("data-progfx-type4-color-r", "0.5");
    expect(runner).toHaveAttribute("data-progfx-type4-color-g", "0.5");
    expect(runner).toHaveAttribute("data-progfx-type4-color-b", "1");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-runtime-scheduling-status",
      "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified"
    );
    expect(runner.getAttribute("data-progfx-type4-runtime-scheduling-proof-source")).toContain(
      "decompiled_all.c:348244 loads visualeffects.2da"
    );
    expect(runner.getAttribute("data-progfx-type4-runtime-scheduling-blocker")).toContain(
      "Param4/Param5/Param6/vision policy semantics are docs-backed"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-param3-cast-shadows-raw", "0");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-param4-priority-status",
      "docs-backed-progfx-type4-param4-priority-lower-value-wins"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-scene-attachment-policy-status",
      "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-proximity-suppression-policy-status",
      "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-vision-mutation-policy-status",
      "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-shadow-policy-status",
      "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-visual-preview-status",
      "backend-render-contract-source-record-no-scene-light"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-owner-visualeffect-row-id", "153");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-owner-visualeffect-label",
      "VFX_DUR_LIGHT_BLUE_5"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-owner-phase", "duration");
    expect(runner).toHaveAttribute("data-progfx-type4-owner-progfx-ref", "304");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-owner-effect-constructor-kind",
      "EffectVisualEffect"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-owner-duration-type", "temporary");
    expect(runner).toHaveAttribute(
      "data-rendered-progfx-type4-point-light-preview-status",
      "source-backed-fx-light-clr-pointlight-preview-scheduler-parity-blocked"
    );
    expect(runner.getAttribute("data-rendered-progfx-type4-point-light-preview-source")).toContain(
      "fx_light_clr.mdl AuroraLight01 source color/radius"
    );
    expect(runner).toHaveAttribute("data-rendered-progfx-type4-point-light-count", "1");
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-status",
      "docs-backed-progfx-type4-policy-diagnostic-retail-scheduler-dataflow-blocked"
    );
    expect(
      runner.getAttribute("data-scene-non-point-light-request-scheduler-proof-source")
    ).toContain("Param4 priority lower value wins");
    expect(
      runner.getAttribute("data-scene-non-point-light-request-scheduler-priority-winner")
    ).toContain("row=304;label=LightBlue5m");
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-light-request-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-vision-request-count",
      "0"
    );
  });

  it("exposes ProgFX Type 4 vision owner-phase metadata on the fixture route", () => {
    const path =
      "/dev/vfx-fixture/vfx-retail-progfx-type4-blind-vision-owner-phase?time=0.5&seed=37&capture=data-url";
    window.history.replaceState({}, "", path);

    render(<App />);

    const runner = screen.getByTestId("vfx-fixture-runner");
    expect(runner).toHaveAttribute(
      "data-fixture-id",
      "vfx-retail-progfx-type4-blind-vision-owner-phase"
    );
    expect(runner).toHaveAttribute("data-screenshot-export", "data-url");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-proof-status",
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-row-id", "329");
    expect(runner).toHaveAttribute("data-progfx-type4-label", "LightBlindvision");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-param1-animation-raw",
      "Blind_Vision"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-animation", "Blind_Vision");
    expect(runner).toHaveAttribute("data-progfx-type4-animation-kind", "vision");
    expect(runner).toHaveAttribute("data-progfx-type4-vision-mode", "Blind_Vision");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-vision-parameter-status",
      "docs-backed-progfx-type4-param1-vision-token-param4-priority"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-symbolic-color", "");
    expect(runner).toHaveAttribute("data-progfx-type4-radius-meters", "");
    expect(runner).toHaveAttribute("data-progfx-type4-radius-proof-status", "");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-node-name", "AuroraLight02");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-source-mdl-animation",
      "Blind_Vision"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-color", "0.3,0.3,0.3");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-radius-meters", "7");
    expect(runner).toHaveAttribute("data-progfx-type4-source-mdl-radius-frames", "0,7");
    expect(runner).toHaveAttribute("data-progfx-type4-priority", "53");
    expect(runner).toHaveAttribute("data-progfx-type4-param5-proximity-suppression-raw", "1");
    expect(runner).toHaveAttribute("data-progfx-type4-proximity-suppression", "true");
    expect(runner).toHaveAttribute("data-progfx-type4-param6-attach-to-scene-raw", "0");
    expect(runner).toHaveAttribute("data-progfx-type4-cast-shadows", "false");
    expect(runner).toHaveAttribute("data-progfx-type4-attach-to-scene", "false");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-runtime-scheduling-status",
      "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified"
    );
    expect(runner.getAttribute("data-progfx-type4-runtime-scheduling-proof-source")).toContain(
      "decompiled_all.c:348244 loads visualeffects.2da"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-vision-mutation-policy-status",
      "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-shadow-policy-status",
      "source-backed-progfx-type4-non-item-cast-shadow-absent-vanilla-rows"
    );
    expect(runner).toHaveAttribute(
      "data-progfx-type4-visual-preview-status",
      "backend-render-contract-source-record-no-scene-light"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-owner-visualeffect-row-id", "242");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-owner-visualeffect-label",
      "VFX_DUR_BLINDVISION"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-owner-phase", "duration");
    expect(runner).toHaveAttribute("data-progfx-type4-owner-progfx-ref", "329");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-owner-effect-constructor-kind",
      "EffectVisualEffect"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-owner-duration-type", "temporary");
    expect(runner).toHaveAttribute("data-progfx-type4-request-count", "1");
    expect(runner).toHaveAttribute("data-progfx-type4-request-row-ids", "329");
    expect(runner).toHaveAttribute("data-progfx-type4-request-labels", "LightBlindvision");
    expect(runner).toHaveAttribute("data-progfx-type4-request-proximity-suppression-count", "1");
    expect(runner).toHaveAttribute("data-progfx-type4-request-scene-attachment-count", "0");
    expect(runner).toHaveAttribute("data-scene-point-light-count", "0");
    expect(runner).toHaveAttribute("data-scene-source-backed-point-light-count", "0");
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-lanes",
      "progfx-type4-vision-request"
    );
    expect(runner).toHaveAttribute("data-scene-non-point-light-request-count", "1");
    expect(runner.getAttribute("data-scene-non-point-light-request-samples")).toContain(
      "lane=progfx-type4-vision-request;row=329;label=LightBlindvision"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-coverage-status",
      "missing-required-light-lane-observations-ordering-still-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-required-lanes",
      "terrain-tile-light|placeables-2da-light|source-mdl-light-node|item-property-light|progfx-type4-light-request"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-observed-lanes",
      "progfx-type4-vision-request"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-status",
      "local-cross-lane-runtime-probe-missing-required-lanes-retail-ordering-still-blocked"
    );
    expect(
      runner.getAttribute("data-scene-point-light-retail-ordering-proof-source")
    ).toContain("source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane");
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-proof-status",
      "source-backed-cross-lane-ordering-blocked-no-common-insertion-callsite"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-manager-cross-lane-callsite-blocker"
      )
    ).toContain("owner-lane data-flow");
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-proof-source"
      )
    ).toContain("runtime scene diagnostic scans source-backed THREE.PointLight lanes");
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-blocker"
      )
    ).toContain("retail cross-lane insertion/creation order remains blocked");
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-local-order-source"
      )
    ).toContain("ProgFX Type 4 scheduler samples are listed separately");
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-required-lane-coverage-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-point-light-sample-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-non-point-request-sample-count",
      "1"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
      )
    ).toContain(
      "lane=progfx-type4-vision-request;kind=progfx-type4-request-not-pointlight;name=LightBlindvision;localOrderKey=25053"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-status",
      "docs-backed-progfx-type4-policy-diagnostic-retail-scheduler-dataflow-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-scene-attachment-request-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-proximity-suppression-candidate-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-vision-request-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-would-suppress-scene-point-lights",
      "false"
    );
    expect(
      runner.getAttribute("data-scene-non-point-light-request-scheduler-samples")
    ).toContain(
      "sceneAttachmentPolicy=docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-source")).toContain(
      "FUN_00a82d8c"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-source")).toContain(
      "FUN_00a83fec"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-source")).toContain(
      "shaderUniformEvidence proofStatus=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-source")).toContain(
      "localDrawStateOrderEvidence proofStatus=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-source")).toContain(
      "localBlendDepthColorMaskCallHits=[]"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-source")).toContain(
      "914001 binds DAT_00d0247c through FUN_00a788b0"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-shader-names",
      "vs_shadowvol|fs_shadowvol"
    );
    expect(
      runner.getAttribute("data-scene-shadow-retail-projection-light-profile-source")
    ).toContain("shadowradius +0x60 when positive else radius +0x58");
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-light-profile-status",
      "source-backed-shadowvol-light-profile-known-active-stencil-preview-retail-parity-blocked"
    );
    expect(
      runner.getAttribute("data-scene-shadow-retail-projection-geometry-source")
    ).toContain("FUN_00a78128");
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-geometry-status",
      "source-backed-shadowvol-caster-buffer-three-geometry-helper-ported-active-renderer-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-render-buckets",
      "0xd|0xe|0xb|0xc"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-proof-status",
      "source-backed-shadowplane-shadowvol-shader-caster-path-zpass-zfail-stencil-render-state-slot3-preview-active-retail-face-op-mapped-parity-blocked"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-blocker")).toContain(
      "source-backed helpers for the retail paired-vertex/six-index caster buffer schema, the equivalent Three BufferGeometry with auroraShadowVolumeW, placeable fast-shadow proxies bind a source-quad caster buffer"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-blocker")).toContain(
      "WebGL stencil front/back z-pass/z-fail receiver lane uses the retail-mapped GL_FRONT/GL_BACK plus GL_KEEP/GL_INCR/GL_DECR sequence"
    );
    expect(runner.getAttribute("data-scene-shadow-retail-projection-blocker")).toContain(
      "render-state wrapper slot 3 is mapped to GL_CULL_FACE"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-runtime-probe-status",
      "not-observed-no-active-shadowvol-placeable-fast-shadow-proxies"
    );
    expect(
      runner.getAttribute(
        "data-scene-shadow-retail-projection-runtime-probe-proof-source"
      )
    ).toContain("runtime scene diagnostic scans active placeable fast-shadow proxies");
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-runtime-probe-local-pixel-proof-status",
      "local-cdp-canvas-pixels-required-not-retail-oracle"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-runtime-probe-active-caster-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-runtime-probe-stencil-volume-pass-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-runtime-probe-expected-stencil-passes",
      "back:zpass|front:zpass|back:zfail|front:zfail"
    );
    expect(runner).toHaveAttribute(
      "data-scene-shadow-retail-projection-runtime-probe-observed-stencil-passes",
      ""
    );
  });

  it("exposes ProgFX Type 4 multi-request scheduler policy metadata on the fixture route", () => {
    const path =
      "/dev/vfx-fixture/vfx-retail-progfx-type4-multi-request-policy?time=0.5&seed=37&capture=data-url";
    window.history.replaceState({}, "", path);

    render(<App />);

    const runner = screen.getByTestId("vfx-fixture-runner");
    expect(runner).toHaveAttribute(
      "data-fixture-id",
      "vfx-retail-progfx-type4-multi-request-policy"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-row-id", "333");
    expect(runner).toHaveAttribute("data-progfx-type4-label", "LightAreaBlackout");
    expect(runner).toHaveAttribute("data-progfx-type4-priority", "13");
    expect(runner).toHaveAttribute("data-progfx-type4-attach-to-scene", "true");
    expect(runner).toHaveAttribute("data-progfx-type4-request-count", "4");
    expect(runner).toHaveAttribute("data-progfx-type4-request-row-ids", "333|304|308|328");
    expect(runner).toHaveAttribute(
      "data-progfx-type4-request-labels",
      "LightAreaBlackout|LightBlue5m|LightYellow5m|LightDarkvision"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-request-priorities", "13|20|20|51");
    expect(runner).toHaveAttribute("data-progfx-type4-request-scene-attachment-count", "1");
    expect(runner).toHaveAttribute("data-progfx-type4-request-proximity-suppression-count", "1");
    expect(runner).toHaveAttribute("data-progfx-type4-request-light-count", "2");
    expect(runner).toHaveAttribute("data-progfx-type4-request-vision-count", "2");
    expect(runner).toHaveAttribute(
      "data-rendered-progfx-type4-multi-request-point-light-preview-status",
      "blocked-runtime-oracle-multi-request-no-pointlight-until-retail-scheduler-parity"
    );
    expect(
      runner.getAttribute(
        "data-rendered-progfx-type4-multi-request-point-light-preview-source"
      )
    ).toContain("visible warm-yellow Type 4 pixel signal");
    expect(
      runner.getAttribute(
        "data-rendered-progfx-type4-multi-request-point-light-preview-blocker"
      )
    ).toContain("single light request");
    expect(runner).toHaveAttribute("data-rendered-progfx-type4-multi-request-count", "4");
    expect(runner).toHaveAttribute("data-rendered-progfx-type4-multi-request-light-count", "2");
    expect(runner).toHaveAttribute("data-rendered-progfx-type4-multi-request-vision-count", "2");
    expect(runner).toHaveAttribute(
      "data-rendered-progfx-type4-multi-request-equal-priority-light-tie-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-progfx-type4-multi-request-point-light-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-progfx-type4-multi-request-runtime-oracle-observed-signal",
      "warm-yellow"
    );
    expect(runner).toHaveAttribute(
      "data-rendered-progfx-type4-multi-request-canonical-parity-promoted",
      "false"
    );
    expect(runner.getAttribute("data-progfx-type4-request-samples")).toContain(
      "row=328;label=LightDarkvision;kind=vision;priority=51;proximity=true;attachToScene=false"
    );
    expect(runner).toHaveAttribute("data-scene-point-light-count", "0");
    expect(runner).toHaveAttribute("data-scene-non-point-light-request-count", "4");
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-lanes",
      "progfx-type4-light-request|progfx-type4-vision-request"
    );
    expect(runner.getAttribute("data-scene-non-point-light-request-samples")).toContain(
      "lane=progfx-type4-light-request;row=304;label=LightBlue5m"
    );
    expect(runner.getAttribute("data-scene-non-point-light-request-samples")).toContain(
      "lane=progfx-type4-light-request;row=308;label=LightYellow5m"
    );
    expect(runner.getAttribute("data-scene-non-point-light-request-samples")).toContain(
      "lane=progfx-type4-vision-request;row=333;label=LightAreaBlackout"
    );
    expect(runner.getAttribute("data-scene-non-point-light-request-samples")).toContain(
      "lane=progfx-type4-vision-request;row=328;label=LightDarkvision"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-required-lane-coverage-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-non-point-request-sample-count",
      "4"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
      )
    ).toContain(
      "lane=progfx-type4-vision-request;kind=progfx-type4-request-not-pointlight;name=LightAreaBlackout;localOrderKey=25013"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
      )
    ).toContain(
      "lane=progfx-type4-light-request;kind=progfx-type4-request-not-pointlight;name=LightBlue5m;localOrderKey=25020"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
      )
    ).toContain(
      "lane=progfx-type4-light-request;kind=progfx-type4-request-not-pointlight;name=LightYellow5m;localOrderKey=25020"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
      )
    ).toContain(
      "lane=progfx-type4-vision-request;kind=progfx-type4-request-not-pointlight;name=LightDarkvision;localOrderKey=25051"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-priority-winner",
      "row=333;label=LightAreaBlackout;lane=progfx-type4-vision-request;worldPosition=0.18,0,0;priority=13;param4Status=docs-backed-progfx-type4-param4-priority-lower-value-wins;animation=Blind_Vision;vision=Blind_Vision;attachToScene=true;proximity=false"
    );
    expect(
      runner.getAttribute(
        "data-scene-non-point-light-request-scheduler-priority-evaluation-order-source"
      )
    ).toContain("local diagnostics sort ProgFX Type 4 requests by docs-backed Param4");
    expect(
      runner.getAttribute(
        "data-scene-non-point-light-request-scheduler-priority-evaluation-order"
      )
    ).toContain("rank=1;inputOrder=0;row=333;label=LightAreaBlackout");
    expect(
      runner.getAttribute(
        "data-scene-non-point-light-request-scheduler-priority-evaluation-order"
      )
    ).toContain("rank=2;inputOrder=2;row=308;label=LightYellow5m");
    expect(
      runner.getAttribute(
        "data-scene-non-point-light-request-scheduler-priority-evaluation-order"
      )
    ).toContain("rank=4;inputOrder=3;row=328;label=LightDarkvision");
    expect(
      runner.getAttribute(
        "data-scene-non-point-light-request-scheduler-priority-evaluation-order"
      )
    ).toContain("retailDataFlow=blocked");
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-priority-tie-group-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-priority-tie-policy-status",
      "retail-oracle-progfx-type4-equal-priority-tie-candidate-observed-general-policy-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-priority-zero-always-applies-request-count",
      "0"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-priority-zero-policy-status",
      "docs-backed-progfx-type4-param4-zero-always-applies-retail-dataflow-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-priority-zero-runtime-capture-status",
      "runtime-oracle-custom-param4-zero-capture-present-not-stock-retail-parity"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-canonical-parity-status",
      "blocked-retail-priority-tie-proximity-attach-and-local-vs-retail-parity-incomplete"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-scene-attachment-request-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-proximity-suppression-candidate-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-vision-request-count",
      "2"
    );
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-light-request-count",
      "2"
    );
    expect(
      runner.getAttribute("data-scene-non-point-light-request-scheduler-samples")
    ).toContain("sceneAttachmentSuppressedPointLights=0");
    expect(
      runner.getAttribute("data-scene-non-point-light-request-scheduler-samples")
    ).toContain(
      "proximityCandidate=row=328;label=LightDarkvision;requestPosition=0,-0.18,0"
    );
    expect(
      runner.getAttribute("data-scene-non-point-light-request-scheduler-samples")
    ).toContain("threshold=unknown-retail-distance-blocked");
    expect(runner).toHaveAttribute(
      "data-scene-non-point-light-request-scheduler-would-suppress-scene-point-lights",
      "false"
    );
  });

  it("exposes all required cross-lane light lanes without claiming retail ordering", () => {
    const path =
      "/dev/vfx-fixture/vfx-retail-cross-lane-all-light-lanes-policy?time=0.5&seed=37&capture=data-url";
    window.history.replaceState({}, "", path);

    render(<App />);

    const runner = screen.getByTestId("vfx-fixture-runner");
    expect(runner).toHaveAttribute(
      "data-fixture-id",
      "vfx-retail-cross-lane-all-light-lanes-policy"
    );
    expect(runner).toHaveAttribute("data-progfx-type4-row-id", "304");
    expect(runner).toHaveAttribute("data-progfx-type4-label", "LightBlue5m");
    expect(runner).toHaveAttribute("data-scene-point-light-count", "5");
    expect(runner).toHaveAttribute("data-scene-source-backed-point-light-count", "5");
    expect(runner).toHaveAttribute("data-scene-non-point-light-request-count", "1");
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-coverage-status",
      "observed-required-tile-placeable-mdl-item-vfx-lanes-ordering-still-blocked"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-required-lanes",
      "terrain-tile-light|placeables-2da-light|source-mdl-light-node|item-property-light|progfx-type4-light-request"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-observed-lanes",
      "item-property-light|placeables-2da-light|progfx-type4-light-request|source-mdl-light-node|terrain-tile-light"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-missing-lanes",
      ""
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-status",
      "local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked"
    );
    expect(
      runner.getAttribute("data-scene-point-light-retail-ordering-proof-source")
    ).toContain("source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane");
    expect(
      runner.getAttribute("data-scene-point-light-retail-ordering-proof-source")
    ).toContain("directProximityUploadEvidence proofStatus=source-backed-lightmanager-direct-proximity-upload-order");
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-proof-status",
      "source-backed-cross-lane-ordering-blocked-no-common-insertion-callsite"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-manager-cross-lane-callsite-blocker"
      )
    ).toContain("owner-lane data-flow");
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-required-lane-coverage-count",
      "5"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-point-light-sample-count",
      "5"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-non-point-request-sample-count",
      "1"
    );
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-budget-accepted-lanes",
      "item-property-light|placeables-2da-light|source-mdl-light-node|terrain-tile-light"
    );
    const localOrderSamples = runner.getAttribute(
      "data-scene-point-light-retail-ordering-runtime-probe-local-order-samples"
    );
    expect(localOrderSamples).toContain(
      "lane=item-property-light;kind=point-light;name=VFX_DUR_LIGHT_RED_20;localOrderKey=1"
    );
    expect(localOrderSamples).toContain(
      "lane=source-mdl-light-node;kind=point-light;name=diagnostic_mdl_light01;localOrderKey=2"
    );
    expect(localOrderSamples).toContain(
      "lane=terrain-tile-light;kind=point-light;name=diagnostic-tile-sourcelight1;localOrderKey=3"
    );
    expect(localOrderSamples).toContain(
      "lane=placeables-2da-light;kind=point-light;name=PaleYellow;localOrderKey=4"
    );
    expect(localOrderSamples).toContain(
      "lane=progfx-type4-light-request;kind=point-light;name=VFX_DUR_LIGHT_BLUE_5"
    );
    expect(localOrderSamples).toContain(
      "lane=progfx-type4-light-request;kind=progfx-type4-request-not-pointlight;name=LightBlue5m;localOrderKey=25020"
    );
    expect(localOrderSamples).toContain("retailOrdering=blocked");
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-preview-budget-plan-status",
      "source-backed-lightmanager-score-global-budget-active-preview-retail-precedence-blocked"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-preview-budget-plan-strategy"
      )
    ).toContain("global-budget");
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-preview-budget-plan-proof-source"
      )
    ).toContain("FUN_00a41e30 caps uploaded active slots");
    expect(runner).toHaveAttribute(
      "data-scene-point-light-retail-ordering-preview-budget-plan-proof-status",
      "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-preview-budget-plan-blocker"
      )
    ).toContain("mutating THREE.PointLight visibility");
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-preview-budget-plan-samples"
      )
    ).toContain("retailPrecedence=blocked");
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "sourceModel=fx_placeable01.mdl;sourceRadius=10"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "itemVfxLabel=VFX_DUR_LIGHT_RED_20"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "itemProgFxRow=315"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "sourceModel=fx_flame01.mdl;sourceRadius=7"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "intensitySource=local cross-lane runtime probe fixture intensity scalar"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "intensityProof=local-diagnostic-cross-lane-intensity-fixture-retail-pixel-parity-blocked"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "retailScore=60;retailScorePriority=0;retailScorePreviewDistance=2.5;retailScoreSourceRadius=13.3"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "retailScoreActiveSelectionRadiusLimit=unknown;retailScoreActiveSelectionRadiusEnforced=unknown;retailScoreActiveSelectionRadiusPassed=unknown"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "retailScoreMultiplier=1;retailScoreField0x70=0;retailScoreRuntimeExtent=1;retailScoreRangeTerm=20"
    );
    expect(runner.getAttribute("data-scene-point-light-samples")).toContain(
      "retailScoreSource=C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 writes LightManager score +0x84"
    );
    expect(runner.getAttribute("data-scene-non-point-light-request-samples")).toContain(
      "lane=progfx-type4-light-request;row=304;label=LightBlue5m"
    );
    expect(
      runner.getAttribute(
        "data-scene-point-light-retail-ordering-runtime-probe-blocker"
      )
    ).toContain("retail cross-lane insertion/creation order remains blocked");
  });
});

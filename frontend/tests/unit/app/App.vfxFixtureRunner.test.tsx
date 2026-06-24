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
});

import { render, screen, within } from "@testing-library/react";
import { PlaceablesModeRightPanel } from "../../../../src/modules/layout/components/PlaceablesModeRightPanel";
import type { PlaceableViewportRenderPayload } from "../../../../src/modules/placeables/application/placeableRenderPayloadResolver";

interface LightPayloadOptions {
  row: number;
  raw: string;
  label: string;
  red: number;
  green: number;
  blue: number;
  toolsetRed?: number;
  toolsetGreen?: number;
  toolsetBlue?: number;
  lightState?: number;
  isVfx?: boolean;
}

function buildPlaceableLightPayload(options: LightPayloadOptions): PlaceableViewportRenderPayload {
  return {
    templateId: "plc_light_fixture",
    cacheKey: "plc_light_fixture",
    cacheHit: false,
    storedAt: "2026-07-01T00:00:00.000Z",
    hits: 0,
    placeable: {
      templateId: "plc_light_fixture",
      kind: "placeable",
      resref: "plc_light_fixture",
      name: "Light Fixture",
      category: "lights",
      placeableSubtype: "light_source",
      render: {
        backendType: options.isVfx ? "vfx" : "model",
        frontendType: options.isVfx ? "vfx" : "model",
        rendererPreset: options.isVfx ? "vfx-emitter" : "placeable-model",
        isDoor: false,
        isVfx: options.isVfx === true
      },
      metadata: {
        source2daLightColorRaw: options.raw,
        source2daLightColorRow: options.row,
        source2daLightColorLabel: options.label,
        source2daLightRed: options.red,
        source2daLightGreen: options.green,
        source2daLightBlue: options.blue,
        source2daToolsetRed: options.toolsetRed,
        source2daToolsetGreen: options.toolsetGreen,
        source2daToolsetBlue: options.toolsetBlue,
        source2daLightOffsetX: 0.24,
        source2daLightOffsetY: 0.01,
        source2daLightOffsetZ: 0.19,
        source2daShadowSize: 1
      },
      placeableRuntime: {
        state: {
          lightState: options.lightState ?? 1
        }
      },
      assetManifest: {
        assets: []
      },
      processedAt: "2026-07-01T00:00:00.000Z"
    } as unknown as PlaceableViewportRenderPayload["placeable"],
    renderPackage: {
      status: "ready",
      diagnostics: [],
      assetRefs: {
        modelAssetIds: [],
        derivedModelAssetIds: [],
        chunkModelAssetIds: [],
        textureAssetIds: [],
        materialAssetIds: [],
        metadataAssetIds: [],
        otherAssetIds: []
      },
      textureUrls: [],
      glbUrl: "/_aurora/v1/catalog/placeables/cache/plc_light_fixture/assets/model.glb"
    } as unknown as PlaceableViewportRenderPayload["renderPackage"],
    assetContracts: {
      assets: []
    } as unknown as PlaceableViewportRenderPayload["assetContracts"]
  };
}

describe("PlaceablesModeRightPanel", () => {
  it("shows the source-backed lightcolor.2da color swatch for a light placeable", () => {
    render(
      <PlaceablesModeRightPanel
        activePayload={buildPlaceableLightPayload({
          row: 6,
          raw: "6",
          label: "PaleYellow",
          red: 1.9,
          green: 1.9,
          blue: 1
        })}
        activePreviewObject={null}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByText("PaleYellow #6")).toBeInTheDocument();
    expect(screen.getByText("1.9, 1.9, 1")).toBeInTheDocument();
    const swatch = screen.getByRole("img", {
      name: "lightcolor.2da color swatch PaleYellow #6"
    });
    expect(swatch).toHaveAttribute("title", "lightcolor.2da RGB 1.9, 1.9, 1");
    expect(swatch).toHaveStyle("background-color: rgb(255, 255, 134)");
    expect(swatch).not.toHaveStyle("background-color: rgb(255, 255, 255)");
    expect(screen.getByText("on (1)")).toBeInTheDocument();
    expect(screen.getByText("Shadow asset:")).toBeInTheDocument();
    expect(screen.getByText("Fx_Shadow_M (fx_shadow_m.mdl)")).toHaveAttribute(
      "title",
      expect.stringContaining("ShadowSize 0->Fx_Shadow_S, 2->Fx_Shadow_L")
    );
    expect(screen.getByText("Shadow projection:")).toBeInTheDocument();
    expect(screen.getByText("preview proxy; retail parity blocked")).toHaveAttribute(
      "title",
      expect.stringContaining("exact retail shadow-volume/projection pixel parity remains blocked")
    );
    expect(screen.getByText("Radius:")).toBeInTheDocument();
    expect(screen.getByText("10 (fx_placeable01/AuroraLight01)")).toHaveAttribute(
      "title",
      expect.stringContaining("decompiled_all.c:866543-866563")
    );
    expect(screen.getByText("Falloff:")).toBeInTheDocument();
    expect(screen.getByText("max(0, 1 - distance/radius)")).toHaveAttribute(
      "title",
      expect.stringContaining("fx_placeable01.mdl radius 10")
    );
    expect(screen.queryByText("blocked: no decompiled falloff formula")).not.toBeInTheDocument();
  });

  it("labels LightState zero as off for source-backed light placeables", () => {
    render(
      <PlaceablesModeRightPanel
        activePayload={buildPlaceableLightPayload({
          row: 6,
          raw: "6",
          label: "PaleYellow",
          red: 1.9,
          green: 1.9,
          blue: 1,
          lightState: 0
        })}
        activePreviewObject={null}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByText("LightState:")).toBeInTheDocument();
    expect(screen.getByText("off (0)")).toBeInTheDocument();
  });

  it("uses TOOLSET RGB for the visible emitter swatch when Aurora provides it", () => {
    render(
      <PlaceablesModeRightPanel
        activePayload={buildPlaceableLightPayload({
          row: 6,
          raw: "6",
          label: "PaleYellow",
          red: 1.9,
          green: 1.9,
          blue: 1,
          toolsetRed: 0.94,
          toolsetGreen: 0.94,
          toolsetBlue: 0.77
        })}
        activePreviewObject={null}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByText("RGB:")).toBeInTheDocument();
    expect(screen.getByText("1.9, 1.9, 1")).toBeInTheDocument();
    expect(screen.getByText("Toolset RGB:")).toBeInTheDocument();
    expect(screen.getByText("0.94, 0.94, 0.77")).toBeInTheDocument();
    const swatch = screen.getByRole("img", {
      name: "lightcolor.2da toolset color swatch PaleYellow #6"
    });
    expect(swatch).toHaveAttribute("title", "lightcolor.2da TOOLSET RGB 0.94, 0.94, 0.77");
    expect(swatch).toHaveStyle("background-color: rgb(255, 255, 209)");
  });

  it("does not collapse different lightcolor.2da rows into the same white swatch", () => {
    const { rerender } = render(
      <PlaceablesModeRightPanel
        activePayload={buildPlaceableLightPayload({
          row: 6,
          raw: "6",
          label: "PaleYellow",
          red: 1.9,
          green: 1.9,
          blue: 1
        })}
        activePreviewObject={null}
        previewErrorMessage={null}
      />
    );

    expect(
      screen.getByRole("img", {
        name: "lightcolor.2da color swatch PaleYellow #6"
      })
    ).toHaveStyle("background-color: rgb(255, 255, 134)");

    rerender(
      <PlaceablesModeRightPanel
        activePayload={buildPlaceableLightPayload({
          row: 27,
          raw: "27",
          label: "Red",
          red: 2,
          green: 0.5,
          blue: 0.2
        })}
        activePreviewObject={null}
        previewErrorMessage={null}
      />
    );

    expect(
      screen.getByRole("img", {
        name: "lightcolor.2da color swatch Red #27"
      })
    ).toHaveStyle("background-color: rgb(255, 64, 26)");
  });

  it("keeps the lightcolor.2da swatch visible for VFX light placeables", () => {
    render(
      <PlaceablesModeRightPanel
        activePayload={buildPlaceableLightPayload({
          row: 27,
          raw: "27",
          label: "Red",
          red: 2,
          green: 0.5,
          blue: 0.2,
          isVfx: true
        })}
        activePreviewObject={null}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByText("Preview mode:")).toBeInTheDocument();
    expect(screen.getByText("Red #27")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "lightcolor.2da color swatch Red #27"
      })
    ).toHaveStyle("background-color: rgb(255, 64, 26)");
  });

  it("keeps a generic rendered placeable out of the VFX inspector when its MDL carries emitter metadata", () => {
    const payload = buildPlaceableLightPayload({
      row: 6,
      raw: "6",
      label: "PaleYellow",
      red: 1.9,
      green: 1.9,
      blue: 1
    });
    payload.placeable.templateId = "plc_plc_watertrough";
    payload.placeable.resref = "plc_watertrough";
    payload.placeable.name = "Water Trough";
    payload.placeable.placeableSubtype = "generic";
    payload.placeable.render = {
      backendType: "generic",
      frontendType: "placeable",
      rendererPreset: "placeable-model",
      isDoor: false,
      isVfx: false
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      auroraEmitter: {
        emitters: [{ nodeName: "AuroraEmitter01", renderMode: "normal" }]
      },
      auroraVfxPayload: {
        version: "backend-vfx-payload/test",
        canonicalStatus: "unmapped",
        backendCanonical: false,
        sourceKind: "source_mdl_graph",
        previewMode: "none"
      }
    } as unknown as PlaceableViewportRenderPayload["renderPackage"];

    render(
      <PlaceablesModeRightPanel
        activePayload={payload}
        activePreviewObject={null}
        previewErrorMessage={null}
      />
    );

    const inspector = screen.getByRole("article", { name: /placeables mode inspector/i });
    expect(within(inspector).getByText("ready")).toBeInTheDocument();
    expect(within(inspector).getByText("yes")).toBeInTheDocument();
    expect(within(inspector).queryByText("Preview mode:")).not.toBeInTheDocument();
    expect(within(inspector).queryByText("not rendered for VFX")).not.toBeInTheDocument();
  });
});

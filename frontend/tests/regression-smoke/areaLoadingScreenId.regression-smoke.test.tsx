import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createAreaPropertiesFacade } from "../../src/modules/areas/application/areaPropertiesFacade";
import { AreaPropertiesDialog } from "../../src/modules/layout/components/properties/AreaPropertiesDialog";
import type { AreaScene } from "../../src/modules/scene/contracts";
import type { EffectiveAreaLoadingScreenCatalog } from "../../src/modules/areas/domain/effectiveAreaLoadingScreenCatalog";

describe("Area loading-screen Word regression smoke", () => {
  it("keeps the exact existing LoadScreenID path connected from dialog to CAS export", () => {
    const source: AreaScene = {
      sceneId: "loading_screen_probe",
      areaName: "Loading Screen Probe",
      width: 2,
      height: 2,
      areaAdvancedFlags: { loadingScreenId: 0 },
      tiles: [],
      objects: [],
      updatedAtUnixMs: 100,
      source: "aurora_area",
    };
    const facade = createAreaPropertiesFacade(() => 200);
    const onCommit = vi.fn();

    render(
      <AreaPropertiesDialog
        draft={facade.buildDraft(source)}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Area loading screen ID"), {
      target: { value: "65535" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    const committed = onCommit.mock.calls[0]?.[0];
    const applied = facade.apply(source, committed);
    expect(applied).toMatchObject({
      ok: true,
      changed: true,
      value: { areaAdvancedFlags: { loadingScreenId: 0xffff } },
    });
    if (!applied.ok) throw new Error("Expected exact loading-screen edit to succeed.");
    expect(facade.buildAdvancedFlagMutations(applied.value, {
      advancedFlags: source.areaAdvancedFlags,
    })).toEqual({
      loadingScreenId: { expectedValue: 0, value: 0xffff },
    });
  });

  it("keeps the effective Toolset selector connected to the same exact Word CAS path", () => {
    const source: AreaScene = {
      sceneId: "loading_screen_catalog_probe",
      areaName: "Loading Screen Catalog Probe",
      width: 2,
      height: 2,
      areaAdvancedFlags: { loadingScreenId: 7 },
      areaLoadingScreenCatalog: loadingScreenCatalog(),
      tiles: [],
      objects: [],
      updatedAtUnixMs: 100,
      source: "aurora_area",
    };
    const facade = createAreaPropertiesFacade(() => 200);
    const onCommit = vi.fn();

    render(
      <AreaPropertiesDialog
        draft={facade.buildDraft(source)}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    const selector = screen.getByLabelText("Area loading screen ID");
    expect(selector).toHaveValue("7");
    expect(selector).toHaveTextContent("7 — Row 7 (retained; image unavailable)");
    fireEvent.change(selector, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    const committed = onCommit.mock.calls[0]?.[0];
    const applied = facade.apply(source, committed);
    expect(applied).toMatchObject({
      ok: true,
      changed: true,
      value: { areaAdvancedFlags: { loadingScreenId: 1 } },
    });
    if (!applied.ok) throw new Error("Expected catalog-backed loading-screen edit to succeed.");
    expect(facade.buildAdvancedFlagMutations(applied.value, {
      advancedFlags: source.areaAdvancedFlags,
    })).toEqual({
      loadingScreenId: { expectedValue: 7, value: 1 },
    });
  });
});

function loadingScreenCatalog(): EffectiveAreaLoadingScreenCatalog {
  return {
    schemaVersion: "area-loading-screen-catalog.v1",
    descriptor: {
      resourceName: "loadscreens.2da",
      sourceObjectKey: "modules/current/loadscreens.2da",
      sourceLayer: "module",
      sha256: "a".repeat(64),
      sizeBytes: 128,
      rowCount: 2,
    },
    rows: [
      {
        rowIndex: 0,
        sourceRowId: 100,
        imageResRef: "ls_default",
        displayName: "Default",
        displaySource: "area_default_strref",
        toolsetSelectable: true,
        imageAsset: {
          resourceName: "ls_default.tga",
          sourceObjectKey: "modules/current/ls_default.tga",
          sourceLayer: "module",
          sha256: "b".repeat(64),
          sizeBytes: 1024,
        },
      },
      {
        rowIndex: 1,
        sourceRowId: 200,
        imageResRef: "ls_city",
        displayName: "City",
        displaySource: "row_index",
        toolsetSelectable: true,
        imageAsset: {
          resourceName: "ls_city.tga",
          sourceObjectKey: "modules/current/ls_city.tga",
          sourceLayer: "module",
          sha256: "c".repeat(64),
          sizeBytes: 2048,
        },
      },
    ],
  };
}

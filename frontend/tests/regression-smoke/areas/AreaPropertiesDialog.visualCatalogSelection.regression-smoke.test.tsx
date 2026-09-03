import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import type { AreaPropertiesDraft } from "../../../src/modules/areas/application/areaPropertiesFacade";
import { AreaPropertiesDialog } from "../../../src/modules/layout/components/properties/AreaPropertiesDialog";

const sourceVisual = {
  dayNightMode: "cycle" as const,
  shadowOpacity: 50,
  chanceRain: 0,
  chanceSnow: 0,
  chanceLightning: 0,
  sun: {
    ambientColor: 0,
    diffuseColor: 0,
    fogColor: 0,
    fogAmount: 0,
    shadows: false,
  },
  moon: {
    ambientColor: 0,
    diffuseColor: 0,
    fogColor: 0,
    fogAmount: 0,
    shadows: false,
  },
};
const targetVisual = {
  ...sourceVisual,
  dayNightMode: "always_night" as const,
  shadowOpacity: 70,
  sun: { ...sourceVisual.sun },
  moon: { ...sourceVisual.moon, shadows: true },
};

it("keeps catalog-bound Lighting Scheme authoring connected to the committed Area draft", () => {
  const onCommit = vi.fn();
  const draft: AreaPropertiesDraft = {
    comments: "",
    commentsState: "preserve_only",
    maxCommentsCodeUnits: 4096,
    visualEnvironment: {
      value: sourceVisual,
      sourceValue: sourceVisual,
      state: "editable",
    },
    visualEnvironmentScalarControls: {
      value: { fogClipDistance: 45, windPower: 0 },
      sourceValue: { fogClipDistance: 45, windPower: 0 },
      state: "editable",
    },
    visualEnvironmentCatalogs: {
      schemaVersion: "area-visual-environment-catalogs.v1",
      lightingSchemes: {
        descriptor: {
          resourceName: "environment.2da",
          sourceObjectKey: "module/environment.2da",
          sourceLayer: "module",
          sha256: "a".repeat(64),
          sizeBytes: 256,
          rowCount: 2,
        },
        rows: [
          {
            rowIndex: 0,
            displayName: "Source",
            displaySource: "row_index",
            visualEnvironment: sourceVisual,
            visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
            skyBoxRowIndex: 0,
          },
          {
            rowIndex: 1,
            displayName: "Night",
            displaySource: "row_index",
            visualEnvironment: targetVisual,
            visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
            skyBoxRowIndex: 1,
          },
        ],
      },
      skyBoxes: {
        descriptor: {
          resourceName: "skyboxes.2da",
          sourceObjectKey: "module/skyboxes.2da",
          sourceLayer: "module",
          sha256: "b".repeat(64),
          sizeBytes: 128,
          rowCount: 2,
        },
        rows: [
          { rowIndex: 0, displayName: "None", displaySource: "row_index" },
          { rowIndex: 1, displayName: "Night", displaySource: "row_index" },
        ],
      },
    },
    visualEnvironmentCatalogSelection: {
      value: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
      sourceValue: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
      state: "editable",
    },
  };

  render(<AreaPropertiesDialog draft={draft} onCommit={onCommit} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "Visual" }));
  fireEvent.change(screen.getByLabelText("Area Lighting Scheme"), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({
    visualEnvironmentCatalogSelection: expect.objectContaining({
      value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
    }),
    visualEnvironment: expect.objectContaining({ value: targetVisual }),
    visualEnvironmentScalarControls: expect.objectContaining({
      value: { fogClipDistance: 120, windPower: 2 },
    }),
  }), false);
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AreaPropertiesDraft } from "../../../../../../src/modules/areas/application/areaPropertiesFacade";
import { AreaPropertiesDialog } from "../../../../../../src/modules/layout/components/properties/AreaPropertiesDialog";

const visualEnvironment = () => ({
  dayNightMode: "cycle" as const,
  shadowOpacity: 65,
  chanceRain: 25,
  chanceSnow: 5,
  chanceLightning: 10,
  sun: {
    ambientColor: 0x112233,
    diffuseColor: 0x445566,
    fogColor: 0x778899,
    fogAmount: 7,
    shadows: true,
  },
  moon: {
    ambientColor: 0x223344,
    diffuseColor: 0x556677,
    fogColor: 0x8899aa,
    fogAmount: 11,
    shadows: false,
  },
});

function draft(): AreaPropertiesDraft {
  const source = visualEnvironment();
  const night = {
    ...source,
    dayNightMode: "always_night" as const,
    shadowOpacity: 70,
    sun: { ...source.sun, fogAmount: 9 },
    moon: { ...source.moon, shadows: true },
  };
  return {
    comments: "",
    commentsState: "preserve_only",
    maxCommentsCodeUnits: 4096,
    visualEnvironment: {
      value: source,
      sourceValue: source,
      state: "editable",
    },
    visualEnvironmentScalarControls: {
      value: { fogClipDistance: 80, windPower: 0 },
      sourceValue: { fogClipDistance: 80, windPower: 0 },
      state: "editable",
    },
    visualEnvironmentCatalogs: {
      schemaVersion: "area-visual-environment-catalogs.v1",
      lightingSchemes: {
        descriptor: {
          resourceName: "environment.2da",
          sourceObjectKey: "modules/current/environment.2da",
          sourceLayer: "module",
          sha256: "a".repeat(64),
          sizeBytes: 512,
          rowCount: 2,
        },
        rows: [
          {
            rowIndex: 0,
            displayName: "Exterior",
            displaySource: "label",
            visualEnvironment: source,
            visualEnvironmentScalarControls: { fogClipDistance: 80, windPower: 0 },
            skyBoxRowIndex: 0,
          },
          {
            rowIndex: 1,
            displayName: "Night",
            displaySource: "label",
            visualEnvironment: night,
            visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
            skyBoxRowIndex: 1,
          },
        ],
      },
      skyBoxes: {
        descriptor: {
          resourceName: "skyboxes.2da",
          sourceObjectKey: "modules/current/skyboxes.2da",
          sourceLayer: "module",
          sha256: "b".repeat(64),
          sizeBytes: 128,
          rowCount: 2,
        },
        rows: [
          { rowIndex: 0, displayName: "None", displaySource: "row_index" },
          { rowIndex: 1, displayName: "Clear", displaySource: "label" },
        ],
      },
    },
    visualEnvironmentCatalogSelection: {
      value: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
      sourceValue: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
      state: "editable",
    },
  };
}

describe("AreaPropertiesDialog visual environment", () => {
  it("applies a Lighting Scheme row and then admits complete manual overrides", () => {
    const onCommit = vi.fn();
    render(<AreaPropertiesDialog draft={draft()} onCommit={onCommit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Visual" }));

    expect(screen.getByLabelText("Area Lighting Scheme")).toBeEnabled();
    expect(screen.getByLabelText("Area Sky Box")).toBeEnabled();
    expect(screen.getByLabelText("Area Wind Power")).toBeEnabled();
    expect(screen.getByLabelText("Area Fog Clip Distance")).toBeEnabled();
    expect(screen.getByLabelText("Area Sun ambient color")).toHaveValue("#332211");
    fireEvent.change(screen.getByLabelText("Area Lighting Scheme"), {
      target: { value: "1" },
    });
    expect(screen.getByLabelText("Area Sky Box")).toHaveValue("1");
    expect(screen.getByLabelText("Area Fog Clip Distance")).toHaveValue(120);
    expect(screen.getByLabelText("Area Wind Power")).toHaveValue(2);
    fireEvent.change(screen.getByLabelText("Area day/night mode"), {
      target: { value: "always_night" },
    });
    fireEvent.change(screen.getByLabelText("Area shadow opacity"), {
      target: { value: "40" },
    });
    fireEvent.change(screen.getByLabelText("Area chance rain"), {
      target: { value: "90" },
    });
    fireEvent.change(screen.getByLabelText("Area Sun ambient color"), {
      target: { value: "#aabbcc" },
    });
    fireEvent.change(screen.getByLabelText("Area Moon fog amount"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByLabelText("Area Moon shadows"));
    fireEvent.change(screen.getByLabelText("Area Wind Power"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Area Fog Clip Distance"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({
      visualEnvironment: expect.objectContaining({
        state: "editable",
        value: expect.objectContaining({
          dayNightMode: "always_night",
          shadowOpacity: 40,
          chanceRain: 90,
          sun: expect.objectContaining({ ambientColor: 0xccbbaa }),
          moon: expect.objectContaining({ fogAmount: 4, shadows: false }),
        }),
      }),
      visualEnvironmentScalarControls: expect.objectContaining({
        state: "editable",
        value: { fogClipDistance: 120, windPower: 2 },
      }),
      visualEnvironmentCatalogSelection: expect.objectContaining({
        state: "editable",
        value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
      }),
    }), false);
  });

  it("changes only the catalog selection when Sky Box changes", () => {
    const onCommit = vi.fn();
    const sourceDraft = draft();
    render(<AreaPropertiesDialog draft={sourceDraft} onCommit={onCommit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Visual" }));
    fireEvent.change(screen.getByLabelText("Area Sky Box"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const committed = onCommit.mock.calls[0]?.[0] as AreaPropertiesDraft;
    expect(committed.visualEnvironmentCatalogSelection?.value).toEqual({
      lightingSchemeRowIndex: 0,
      skyBoxRowIndex: 1,
    });
    expect(committed.visualEnvironment?.value).toEqual(
      sourceDraft.visualEnvironment?.value,
    );
    expect(committed.visualEnvironmentScalarControls?.value).toEqual(
      sourceDraft.visualEnvironmentScalarControls?.value,
    );
  });

  it("blocks commit when a scalar control leaves its source-closed range", () => {
    render(<AreaPropertiesDialog draft={draft()} onCommit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Visual" }));
    fireEvent.change(screen.getByLabelText("Area Fog Clip Distance"), {
      target: { value: "29" },
    });
    expect(screen.getAllByRole("alert").some((entry) =>
      entry.textContent?.includes("Fog Clip Distance"))).toBe(true);
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("blocks commit when a bounded visual value is invalid", () => {
    render(<AreaPropertiesDialog draft={draft()} onCommit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Visual" }));
    fireEvent.change(screen.getByLabelText("Area chance lightning"), {
      target: { value: "101" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Visual environment");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
});

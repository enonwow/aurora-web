import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdjustLocationDialog } from "../../../../../../src/modules/layout/components/properties/AdjustLocationDialog";

describe("AdjustLocationDialog", () => {
  it("shows Visual Transform controls for placeable-capable selections without Static render warning", () => {
    render(
      <AdjustLocationDialog
        dialog={{
          objectIds: ["plc_static_001"],
          showVisualTransforms: true,
          mixedStaticPlaceables: false,
          windowX: 10,
          windowY: 12,
          collapsed: false,
          draft: {
            x: 0,
            y: 0,
            z: 0,
            bearingDeg: 0,
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
            xRotationDeg: 0,
            yRotationDeg: 0,
            zRotationDeg: 0,
            xTranslation: 0,
            yTranslation: 0,
            zTranslation: 0
          }
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onDraftFieldChange={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByText("Visual Transforms")).toBeInTheDocument();
    expect(screen.getByLabelText("Uniform Scale")).toBeInTheDocument();
    expect(screen.getByLabelText("Scale X")).toBeInTheDocument();
    expect(screen.getByLabelText("Scale Y")).toBeInTheDocument();
    expect(screen.getByLabelText("Scale Z")).toBeInTheDocument();
    expect(screen.getByLabelText("Visual transform rules info")).toHaveAttribute(
      "title",
      expect.stringContaining("saved and rendered")
    );
    expect(screen.getByLabelText("Visual transform rules info")).not.toHaveAttribute(
      "title",
      expect.stringContaining("not rendered")
    );
  });
});

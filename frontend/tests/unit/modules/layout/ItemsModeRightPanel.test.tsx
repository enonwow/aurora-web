import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemsModeRightPanel } from "../../../../src/modules/layout/components/ItemsModeRightPanel";
import type { SceneObject } from "../../../../src/modules/layout/contracts";

function buildItemTemplate(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "itm_template_item_invalid",
    kind: "items",
    name: "Unsupported Source Item",
    resRef: "invalid_item",
    tag: "INVALID_ITEM",
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    itemProperties: {
      baseItem: 77,
      baseItemLabel: "creatureitem",
      baseItemDefaultIcon: "iinvalid_2x2"
    },
    ...overrides
  };
}

describe("ItemsModeRightPanel", () => {
  it("shows an unsupported preview notice for item sources without real visuals", () => {
    render(
      <ItemsModeRightPanel
        activePreviewObject={buildItemTemplate()}
        sourcePreviewObject={null}
        loadedItems={393}
        creatorStatus="idle"
        creatorErrorMessage={null}
        onApplyVisualOverride={vi.fn()}
        onResetVisualOverride={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Preview unsupported");
    expect(screen.getByRole("alert")).toHaveTextContent("invalid inventory icon");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuroraAreaTilePropertiesDialog } from "../../../../src/modules/layout/components/AuroraAreaTilePropertiesDialog";
import {
  createAuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "../../../../src/modules/scene/domain/auroraAreaEditing";

const definition: AuroraAreaTilesetDefinition = {
  tilesetResRef: "props_set",
  fingerprint: "b".repeat(64),
  defaultTerrain: "floor",
  transitionRules: [],
  groups: [],
  tiles: [{
    tileId: 0,
    terrain: { topLeft: "floor", topRight: "floor", bottomRight: "floor", bottomLeft: "floor" },
    crossers: {},
    cornerHeights: {},
    mainLight1: 4,
    animLoop1: 1
  }]
};

function state() {
  const result = createAuroraAreaEditingState({
    areaResRef: "props",
    width: 2,
    height: 2,
    definition,
    selector: () => 0
  });
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

describe("AuroraAreaTilePropertiesDialog", () => {
  it("applies a seven-field patch atomically to the selected tiles", () => {
    const initial = state();
    const tileIds = initial.tiles.slice(0, 2).map((tile) => tile.id);
    const onApply = vi.fn();
    render(
      <AuroraAreaTilePropertiesDialog
        state={initial}
        definition={definition}
        tileIds={tileIds}
        onApply={onApply}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Main Light 1"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Source Light 2"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Animation Loop 3"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const result = onApply.mock.calls[0][0];
    expect(result.tiles.slice(0, 2).every((tile: { mainLight1?: number; sourceLight2?: number; animLoop3?: number }) =>
      tile.mainLight1 === 12 && tile.sourceLight2 === 7 && tile.animLoop3 === 1
    )).toBe(true);
  });

  it("loads SET defaults without committing until OK and supports Cancel", () => {
    const initial = state();
    initial.tiles[0].mainLight1 = 99;
    const tileIds = [initial.tiles[0].id];
    const onApply = vi.fn();
    const onCancel = vi.fn();
    render(
      <AuroraAreaTilePropertiesDialog
        state={initial}
        definition={definition}
        tileIds={tileIds}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Defaults" }));
    expect(screen.getByLabelText("Main Light 1")).toHaveValue(4);
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0].tiles[0]).toMatchObject({
      mainLight1: 4,
      animLoop1: 1
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("closes an unchanged dialog without creating a mutation", () => {
    const initial = state();
    const onApply = vi.fn();
    const onCancel = vi.fn();
    render(
      <AuroraAreaTilePropertiesDialog
        state={initial}
        definition={definition}
        tileIds={[initial.tiles[0].id]}
        onApply={onApply}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

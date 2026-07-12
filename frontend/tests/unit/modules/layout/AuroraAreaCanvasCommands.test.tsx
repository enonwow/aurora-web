import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuroraAreaCanvasCommands } from "../../../../src/modules/layout/components/AuroraAreaCanvasCommands";

function renderCommands(overrides: Partial<ComponentProps<typeof AuroraAreaCanvasCommands>> = {}) {
  const callbacks = {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onCopy: vi.fn(),
    onCut: vi.fn(),
    onPaste: vi.fn(),
    onRemove: vi.fn()
  };
  render(
    <AuroraAreaCanvasCommands
      visible
      canUndo
      canRedo
      hasSelectedTile
      hasClipboardTiles
      feedback={null}
      leftPx={12}
      maxWidth="500px"
      {...callbacks}
      {...overrides}
    />
  );
  return callbacks;
}

describe("AuroraAreaCanvasCommands", () => {
  it("exposes undo/redo and every tile/group clipboard command", () => {
    const callbacks = renderCommands();

    const undo = screen.getByRole("button", { name: "Undo tile edit" });
    const redo = screen.getByRole("button", { name: "Redo tile edit" });
    const cut = screen.getByRole("button", { name: "Cut tile/group" });
    expect(undo).toHaveAttribute("data-area-editing-proof-action", "undo");
    expect(redo).toHaveAttribute("data-area-editing-proof-action", "redo");
    expect(cut).toHaveAttribute("data-area-editing-proof-action", "cut-selection");

    fireEvent.click(undo);
    fireEvent.click(redo);
    fireEvent.click(screen.getByRole("button", { name: "Copy tile/group" }));
    fireEvent.click(cut);
    fireEvent.click(screen.getByRole("button", { name: "Paste at selected tile" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove tile/group" }));

    Object.values(callbacks).forEach((callback) => expect(callback).toHaveBeenCalledOnce());
  });

  it("gates commands by history, selection and clipboard state and announces domain errors", () => {
    renderCommands({
      canUndo: false,
      canRedo: false,
      hasSelectedTile: false,
      hasClipboardTiles: false,
      feedback: { variant: "error", message: "Clipboard paste falls outside the Area bounds." }
    });

    screen.getAllByRole("button").forEach((button) => expect(button).toBeDisabled());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Clipboard paste falls outside the Area bounds."
    );
  });
});

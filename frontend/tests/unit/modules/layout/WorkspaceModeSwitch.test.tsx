import { fireEvent, render, screen, within } from "@testing-library/react";
import { WorkspaceModeSwitch } from "../../../../src/modules/layout/components/WorkspaceModeSwitch";

describe("WorkspaceModeSwitch", () => {
  it("renders workspace modes as a compact accessible selector", () => {
    const onModeSelect = vi.fn();

    render(
      <WorkspaceModeSwitch
        activeModeId="areas_mode"
        onModeSelect={onModeSelect}
      />
    );

    const selector = screen.getByRole("group", { name: /workspace mode selector/i });
    expect(within(selector).getByRole("button", { name: "Areas Mode" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(selector).getByRole("button", { name: "Areas Mode" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(selector).getByRole("button", { name: "Placeables Mode" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.queryByRole("button", { name: "Magic Mouth Demo" })).not.toBeInTheDocument();

    fireEvent.click(within(selector).getByRole("button", { name: "Placeables Mode" }));

    expect(onModeSelect).toHaveBeenCalledWith("placeables_mode");
  });
});

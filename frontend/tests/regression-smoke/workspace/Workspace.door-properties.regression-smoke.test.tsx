import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

async function signInAs(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: username }
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: password }
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
}

async function openDoorContextMenu() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const doorRow = within(rightSidebar).getByRole("button", { name: /door_west_01/i });
  fireEvent.contextMenu(doorRow, { clientX: 280, clientY: 220 });
  return doorRow;
}

async function openDoorPropertiesDialog() {
  await openDoorContextMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /door properties/i });
}

async function openPlaceablePropertiesDialog() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(placeableRow, { clientX: 260, clientY: 210 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /placeable properties/i });
}

describe("Regression smoke: door properties shell (Aurora-first)", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("opens Door Properties from context menu and keeps Adjust Location hidden for doors", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openDoorContextMenu();
    expect(screen.queryByRole("menuitem", { name: /^adjust location$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const dialog = await screen.findByRole("dialog", { name: /door properties/i });

    expect(within(dialog).getByRole("button", { name: /^basic$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^transition$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^comments$/i })).toBeInTheDocument();

    const nameInput = within(dialog).getByRole("textbox", { name: /^name$/i });
    const tagInput = within(dialog).getByRole("textbox", { name: /^tag$/i });
    expect(nameInput).toHaveAttribute("readonly");
    expect(tagInput).toHaveAttribute("readonly");

    fireEvent.click(within(dialog).getByRole("button", { name: /^transition$/i }));
    const linkedTargetInput = within(dialog).getByRole("textbox", { name: /linked target/i });
    const flagsInput = within(dialog).getByRole("textbox", { name: /^flags$/i });
    expect(linkedTargetInput).toHaveAttribute("readonly");
    expect(flagsInput).toHaveAttribute("readonly");
  });

  it("keeps shell dialog behavior for Apply/OK/Cancel", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openDoorPropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /door properties/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /door properties/i })).not.toBeInTheDocument();
    });

    const reopenedDialog = await openDoorPropertiesDialog();
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /door properties/i })).not.toBeInTheDocument();
    });
  });

  it("activates placeable phase-1 tabs and persists contract-backed fields", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const placeableDialog = await openPlaceablePropertiesDialog();
    const plotCheckbox = within(placeableDialog).getByRole("checkbox", {
      name: /plot active_now/i
    });
    fireEvent.click(plotCheckbox);

    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^scripts$/i }));
    const enableScriptSlots = within(placeableDialog).getByRole("checkbox", {
      name: /enable script slots payload/i
    });
    fireEvent.click(enableScriptSlots);
    const onClickScriptInput = within(placeableDialog).getByRole("textbox", {
      name: /onclick script/i
    });
    fireEvent.change(onClickScriptInput, { target: { value: "plc_phase1_onclick" } });

    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^advanced$/i }));
    const enableDisabledFlags = within(placeableDialog).getByRole("checkbox", {
      name: /enable disabled flags payload/i
    });
    fireEvent.click(enableDisabledFlags);
    const useableDisabledCheckbox = within(placeableDialog).getByRole("checkbox", {
      name: /useable disabled/i
    });
    fireEvent.click(useableDisabledCheckbox);

    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /placeable properties/i })).toBeInTheDocument();
    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i })).not.toBeInTheDocument();
    });

    const reopenedDialog = await openPlaceablePropertiesDialog();
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: /^basic$/i }));
    expect(
      within(reopenedDialog).getByRole("checkbox", { name: /plot active_now/i })
    ).toBeChecked();
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: /^scripts$/i }));
    expect(
      within(reopenedDialog).getByRole("checkbox", { name: /enable script slots payload/i })
    ).toBeChecked();
    expect(within(reopenedDialog).getByRole("textbox", { name: /onclick script/i })).toHaveValue(
      "plc_phase1_onclick"
    );
    fireEvent.click(within(reopenedDialog).getByRole("button", { name: /^advanced$/i }));
    expect(
      within(reopenedDialog).getByRole("checkbox", { name: /enable disabled flags payload/i })
    ).toBeChecked();
    expect(
      within(reopenedDialog).getByRole("checkbox", { name: /useable disabled/i })
    ).toBeChecked();
  });
});

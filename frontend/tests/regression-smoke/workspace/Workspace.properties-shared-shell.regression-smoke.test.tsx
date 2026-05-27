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

async function openPropertiesDialogForObject(
  objectName: RegExp,
  dialogName: RegExp
): Promise<HTMLElement> {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: objectName });
  fireEvent.contextMenu(row, { clientX: 280, clientY: 220 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: dialogName });
}

describe("Regression smoke: shared properties shell", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("keeps common shell actions for placeable/creature/sound/door properties dialogs", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialogs = [
      {
        objectName: /plc_barrel_01/i,
        dialogName: /placeable properties/i,
        collapseButton: /collapse placeable properties dialog/i,
        expandButton: /expand placeable properties dialog/i,
        closeButton: /close placeable properties dialog/i
      },
      {
        objectName: /crt_devourer_01/i,
        dialogName: /creature properties/i,
        collapseButton: /collapse creature properties dialog/i,
        expandButton: /expand creature properties dialog/i,
        closeButton: /close creature properties dialog/i
      },
      {
        objectName: /sound_forest_01/i,
        dialogName: /sound properties/i,
        collapseButton: /collapse sound properties dialog/i,
        expandButton: /expand sound properties dialog/i,
        closeButton: /close sound properties dialog/i
      },
      {
        objectName: /door_west_01/i,
        dialogName: /door properties/i,
        collapseButton: /collapse door properties dialog/i,
        expandButton: /expand door properties dialog/i,
        closeButton: /close door properties dialog/i
      }
    ];

    for (const entry of dialogs) {
      const dialog = await openPropertiesDialogForObject(entry.objectName, entry.dialogName);

      const collapse = within(dialog).getByRole("button", { name: entry.collapseButton });
      expect(collapse).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: entry.closeButton })).toBeInTheDocument();

      fireEvent.click(collapse);
      expect(
        within(dialog).queryByRole("button", {
          name: /^apply$/i
        })
      ).not.toBeInTheDocument();

      const expand = within(dialog).getByRole("button", { name: entry.expandButton });
      fireEvent.click(expand);

      expect(within(dialog).getByRole("button", { name: /^apply$/i })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: /^ok$/i })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: entry.dialogName })).not.toBeInTheDocument();
      });
    }
  });

  it("keeps shared scripts controls for placeable and door properties", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const placeableDialog = await openPropertiesDialogForObject(
      /plc_barrel_01/i,
      /placeable properties/i
    );
    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^scripts$/i }));
    expect(
      within(placeableDialog).getByRole("button", { name: /^save script set$/i })
    ).toBeInTheDocument();
    expect(
      within(placeableDialog).getByRole("button", { name: /^load script set$/i })
    ).toBeInTheDocument();
    expect(within(placeableDialog).getByRole("textbox", { name: /onclick/i })).toBeInTheDocument();
    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i })).not.toBeInTheDocument();
    });

    const doorDialog = await openPropertiesDialogForObject(/door_west_01/i, /door properties/i);
    fireEvent.click(within(doorDialog).getByRole("button", { name: /^scripts$/i }));
    expect(within(doorDialog).getByRole("button", { name: /^save script set$/i })).toBeInTheDocument();
    expect(within(doorDialog).getByRole("button", { name: /^load script set$/i })).toBeInTheDocument();
    expect(within(doorDialog).getByRole("textbox", { name: /onclose/i })).toBeInTheDocument();
    fireEvent.click(within(doorDialog).getByRole("button", { name: /^cancel$/i }));
  });

  it("keeps shared advanced core fields for placeable and door properties", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const placeableDialog = await openPropertiesDialogForObject(
      /plc_barrel_01/i,
      /placeable properties/i
    );
    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^advanced$/i }));
    expect(
      within(placeableDialog).getByRole("textbox", { name: /^blueprint resref$/i })
    ).toBeInTheDocument();
    expect(
      within(placeableDialog).getByRole("combobox", { name: /^belongs to faction$/i })
    ).toBeInTheDocument();
    expect(
      within(placeableDialog).getByRole("textbox", { name: /conversation/i })
    ).toBeInTheDocument();
    expect(
      within(placeableDialog).getByRole("checkbox", { name: /^no interrupt$/i })
    ).toBeInTheDocument();
    expect(within(placeableDialog).getByRole("textbox", { name: /portrait/i })).toBeInTheDocument();
    expect(
      within(placeableDialog).getByRole("combobox", { name: /^initial state$/i })
    ).toBeInTheDocument();
    expect(
      within(placeableDialog).getByRole("combobox", { name: /^treasure model$/i })
    ).toBeInTheDocument();
    expect(
      within(placeableDialog).getByRole("button", { name: /browse conversation/i })
    ).toBeInTheDocument();
    fireEvent.click(within(placeableDialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i })).not.toBeInTheDocument();
    });

    const doorDialog = await openPropertiesDialogForObject(/door_west_01/i, /door properties/i);
    fireEvent.click(within(doorDialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(doorDialog).getByRole("textbox", { name: /^blueprint resref$/i })).toBeInTheDocument();
    expect(within(doorDialog).getByRole("combobox", { name: /^belongs to faction$/i })).toBeInTheDocument();
    expect(within(doorDialog).getByRole("textbox", { name: /conversation/i })).toBeInTheDocument();
    expect(within(doorDialog).getByRole("checkbox", { name: /^no interrupt$/i })).toBeInTheDocument();
    expect(within(doorDialog).getByRole("textbox", { name: /portrait/i })).toBeInTheDocument();
    expect(within(doorDialog).getByRole("combobox", { name: /^initial state$/i })).toBeInTheDocument();
    expect(
      within(doorDialog).queryByRole("combobox", { name: /^treasure model$/i })
    ).not.toBeInTheDocument();
    expect(
      within(doorDialog).queryByRole("button", { name: /browse conversation/i })
    ).not.toBeInTheDocument();
    fireEvent.click(within(doorDialog).getByRole("button", { name: /^cancel$/i }));
  });
});

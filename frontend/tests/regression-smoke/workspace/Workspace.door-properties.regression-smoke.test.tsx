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

describe("Regression smoke: door properties dialog (Aurora-first expanded)", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("shows expanded door tabs/controls and keeps Adjust Location hidden for doors", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openDoorContextMenu();
    expect(screen.queryByRole("menuitem", { name: /^adjust location$/i })).not.toBeInTheDocument();

    const dialog = await openDoorPropertiesDialog();

    const expectedTabs = [
      /^basic$/i,
      /^lock$/i,
      /^trap$/i,
      /^area transition$/i,
      /^scripts$/i,
      /^advanced$/i,
      /^description$/i,
      /^comments$/i
    ];
    expectedTabs.forEach((tabName) => {
      expect(within(dialog).getByRole("button", { name: tabName })).toBeInTheDocument();
    });

    expect(within(dialog).getByRole("textbox", { name: /^name$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /^tag$/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("combobox", { name: /^appearance type$/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("combobox", { name: /^generic appearance$/i })
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: /^plot$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /^hardness$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /^hit points$/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("spinbutton", { name: /^fortitude save$/i })
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /^reflex save$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /^will save$/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^area transition$/i }));
    expect(
      within(dialog).getByRole("textbox", { name: /^destination tag$/i })
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /^none$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /^door$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /^waypoint$/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("combobox", { name: /^loading screen$/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /^setup area transition$/i })
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^lock$/i }));
    const lockedCheckbox = within(dialog).getByRole("checkbox", { name: /^locked$/i });
    const openLockDcInput = within(dialog).getByRole("spinbutton", { name: /^open lock dc$/i });
    const keyTagInput = within(dialog).getByRole("textbox", { name: /^key tag$/i });
    expect(lockedCheckbox).toBeInTheDocument();
    expect(openLockDcInput).toBeInTheDocument();
    expect(keyTagInput).toBeInTheDocument();

    fireEvent.click(lockedCheckbox);
    fireEvent.change(openLockDcInput, { target: { value: "29" } });
    fireEvent.change(keyTagInput, { target: { value: "DOR_KEY_INTERACT_01" } });
    expect(lockedCheckbox).toBeChecked();
    expect(openLockDcInput).toHaveValue(29);
    expect(keyTagInput).toHaveValue("DOR_KEY_INTERACT_01");

    fireEvent.click(within(dialog).getByRole("button", { name: /^trap$/i }));
    const isTrappedCheckbox = within(dialog).getByRole("checkbox", { name: /^is trapped$/i });
    const disarmDcInput = within(dialog).getByRole("spinbutton", { name: /^disarm dc$/i });
    const onTrapTriggeredInput = within(dialog).getByRole("textbox", {
      name: /^ontraptriggered$/i
    });
    expect(isTrappedCheckbox).toBeInTheDocument();
    expect(disarmDcInput).toBeInTheDocument();
    expect(onTrapTriggeredInput).toBeInTheDocument();

    fireEvent.click(isTrappedCheckbox);
    fireEvent.change(disarmDcInput, { target: { value: "24" } });
    fireEvent.change(onTrapTriggeredInput, { target: { value: "door_trap_interact_01" } });
    expect(isTrappedCheckbox).toBeChecked();
    expect(disarmDcInput).toHaveValue(24);
    expect(onTrapTriggeredInput).toHaveValue("door_trap_interact_01");
  });

  it("persists Basic/Lock/Trap/Area edits on Apply/OK and reverts transient lock/trap edits on Cancel", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openDoorPropertiesDialog();

    const persistedDoorName = "Door_Aurora_Persist_01";
    const persistedDestinationTag = "WP_AURORA_PERSIST_01";
    const persistedKeyTag = "DOR_KEY_PERSIST_01";
    const persistedOnTrapTriggered = "door_trap_persist_01";

    const nameInput = within(dialog).getByRole("textbox", { name: /^name$/i });
    fireEvent.change(nameInput, { target: { value: persistedDoorName } });

    fireEvent.click(within(dialog).getByRole("button", { name: /^lock$/i }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^locked$/i }));
    fireEvent.click(
      within(dialog).getByRole("checkbox", {
        name: /^key required to unlock or lock$/i
      })
    );
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^open lock dc$/i }), {
      target: { value: "33" }
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /^key tag$/i }), {
      target: { value: persistedKeyTag }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^trap$/i }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^is trapped$/i }));
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^disarm dc$/i }), {
      target: { value: "22" }
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /^ontraptriggered$/i }), {
      target: { value: persistedOnTrapTriggered }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^area transition$/i }));
    const destinationTagInput = within(dialog).getByRole("textbox", {
      name: /^destination tag$/i
    });
    fireEvent.change(destinationTagInput, { target: { value: persistedDestinationTag } });

    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /door properties/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /door properties/i })).not.toBeInTheDocument();
    });

    const reopenedAfterPersist = await openDoorPropertiesDialog();
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^basic$/i }));
    expect(
      within(reopenedAfterPersist).getByRole("textbox", { name: /^name$/i })
    ).toHaveValue(persistedDoorName);
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^area transition$/i }));
    expect(
      within(reopenedAfterPersist).getByRole("textbox", { name: /^destination tag$/i })
    ).toHaveValue(persistedDestinationTag);
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^lock$/i }));
    expect(within(reopenedAfterPersist).getByRole("checkbox", { name: /^locked$/i })).toBeChecked();
    expect(
      within(reopenedAfterPersist).getByRole("checkbox", {
        name: /^key required to unlock or lock$/i
      })
    ).toBeChecked();
    expect(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^open lock dc$/i })
    ).toHaveValue(33);
    expect(within(reopenedAfterPersist).getByRole("textbox", { name: /^key tag$/i })).toHaveValue(
      persistedKeyTag
    );
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^trap$/i }));
    expect(
      within(reopenedAfterPersist).getByRole("checkbox", { name: /^is trapped$/i })
    ).toBeChecked();
    expect(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^disarm dc$/i })
    ).toHaveValue(22);
    expect(
      within(reopenedAfterPersist).getByRole("textbox", { name: /^ontraptriggered$/i })
    ).toHaveValue(persistedOnTrapTriggered);

    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^basic$/i }));
    fireEvent.change(within(reopenedAfterPersist).getByRole("textbox", { name: /^name$/i }), {
      target: { value: "Door_Aurora_Transient_01" }
    });
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^area transition$/i }));
    fireEvent.change(
      within(reopenedAfterPersist).getByRole("textbox", { name: /^destination tag$/i }),
      {
        target: { value: "WP_AURORA_TRANSIENT_01" }
      }
    );
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^lock$/i }));
    fireEvent.change(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^open lock dc$/i }),
      {
        target: { value: "7" }
      }
    );
    fireEvent.change(within(reopenedAfterPersist).getByRole("textbox", { name: /^key tag$/i }), {
      target: { value: "DOR_KEY_TRANSIENT_01" }
    });
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^trap$/i }));
    fireEvent.change(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^disarm dc$/i }),
      {
        target: { value: "5" }
      }
    );
    fireEvent.change(
      within(reopenedAfterPersist).getByRole("textbox", { name: /^ontraptriggered$/i }),
      {
        target: { value: "door_trap_transient_01" }
      }
    );

    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /door properties/i })).not.toBeInTheDocument();
    });

    const reopenedAfterCancel = await openDoorPropertiesDialog();
    fireEvent.click(within(reopenedAfterCancel).getByRole("button", { name: /^basic$/i }));
    expect(within(reopenedAfterCancel).getByRole("textbox", { name: /^name$/i })).toHaveValue(
      persistedDoorName
    );
    fireEvent.click(within(reopenedAfterCancel).getByRole("button", { name: /^area transition$/i }));
    expect(
      within(reopenedAfterCancel).getByRole("textbox", { name: /^destination tag$/i })
    ).toHaveValue(persistedDestinationTag);
    fireEvent.click(within(reopenedAfterCancel).getByRole("button", { name: /^lock$/i }));
    expect(
      within(reopenedAfterCancel).getByRole("spinbutton", { name: /^open lock dc$/i })
    ).toHaveValue(33);
    expect(within(reopenedAfterCancel).getByRole("textbox", { name: /^key tag$/i })).toHaveValue(
      persistedKeyTag
    );
    fireEvent.click(within(reopenedAfterCancel).getByRole("button", { name: /^trap$/i }));
    expect(
      within(reopenedAfterCancel).getByRole("spinbutton", { name: /^disarm dc$/i })
    ).toHaveValue(22);
    expect(
      within(reopenedAfterCancel).getByRole("textbox", { name: /^ontraptriggered$/i })
    ).toHaveValue(persistedOnTrapTriggered);
  });
});

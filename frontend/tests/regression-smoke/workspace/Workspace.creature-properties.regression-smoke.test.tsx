import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { saveLocalSceneDraft } from "../../../src/modules/scene/adapters/localDraftStore";
import { createSeedAreaScene } from "../../../src/modules/scene/domain/sceneFactory";
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

async function openCreaturePropertiesDialog() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const creatureRow = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });
  fireEvent.contextMenu(creatureRow, { clientX: 260, clientY: 210 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /creature properties/i });
}

function seedBuilderDraft() {
  saveLocalSceneDraft("u_builder_001", createSeedAreaScene(), window.localStorage);
}

describe("Regression smoke: creature properties dialog", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("opens creature properties tabs and persists edits on Apply/OK while cancel reverts transient edits", async () => {
    seedBuilderDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByRole("button", { name: /^basic$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^statistics$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^appearance$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^advanced$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^scripts$/i })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^basic$/i }));
    expect(
      within(dialog).queryByRole("textbox", { name: /^description$/i })
    ).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^statistics$/i }));
    expect(within(dialog).getAllByRole("columnheader", { name: /^bonus$/i }).length).toBeGreaterThan(
      0
    );
    expect(
      within(dialog).queryByRole("spinbutton", { name: /fortitude base/i })
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/fortitude base/i)).toHaveTextContent("0");
    expect(
      within(dialog).getByRole("columnheader", { name: /^ability modifier$/i })
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /total armor class/i })).toHaveValue(20);
    expect(within(dialog).getByRole("spinbutton", { name: /total hit points/i })).toHaveValue(10);

    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByRole("button", { name: /^variables$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /calculated/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /adjustment/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /^challenge rating$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /sound set/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: /perception range/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^feats$/i }));
    expect(within(dialog).getByRole("combobox", { name: /filter/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /feats selection summary/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^spells$/i }));
    expect(within(dialog).getByRole("combobox", { name: /spell level/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: /meta-magic/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /spell selection summary/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /clear class spell list/i })
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /special abilities/i }));
    expect(within(dialog).getByRole("combobox", { name: /filter/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("textbox", { name: /special abilities selection summary/i })
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^basic$/i }));
    fireEvent.change(within(dialog).getByRole("textbox", { name: /first name/i }), {
      target: { value: "Unit Beast" }
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /last name/i }), {
      target: { value: "QA" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^statistics$/i }));
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /strength score/i }), {
      target: { value: "15" }
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /strength racial modifier/i }), {
      target: { value: "1" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^scripts$/i }));
    fireEvent.change(within(dialog).getByRole("textbox", { name: /onheartbeat/i }), {
      target: { value: "nw_crt_heartbeat" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    const immortalCheckbox = within(dialog).getByRole("checkbox", { name: /immortal/i });
    fireEvent.click(immortalCheckbox);

    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /creature properties/i })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });

    const reopened = await openCreaturePropertiesDialog();
    expect(within(reopened).getByRole("textbox", { name: /first name/i })).toHaveValue("Unit Beast");
    expect(within(reopened).getByRole("textbox", { name: /last name/i })).toHaveValue("QA");
    fireEvent.click(within(reopened).getByRole("button", { name: /^scripts$/i }));
    expect(within(reopened).getByRole("textbox", { name: /onheartbeat/i })).toHaveValue(
      "nw_crt_heartbeat"
    );
    fireEvent.click(within(reopened).getByRole("button", { name: /^advanced$/i }));
    expect(within(reopened).getByRole("checkbox", { name: /immortal/i })).toBeChecked();
    fireEvent.click(within(reopened).getByRole("button", { name: /^statistics$/i }));
    expect(within(reopened).getByRole("spinbutton", { name: /strength score/i })).toHaveValue(15);

    fireEvent.click(within(reopened).getByRole("button", { name: /^basic$/i }));
    fireEvent.change(within(reopened).getByRole("textbox", { name: /first name/i }), {
      target: { value: "Temp Creature Name" }
    });
    fireEvent.click(within(reopened).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });

    const reopenedAfterCancel = await openCreaturePropertiesDialog();
    expect(within(reopenedAfterCancel).getByRole("textbox", { name: /first name/i })).toHaveValue(
      "Unit Beast"
    );
  });
});

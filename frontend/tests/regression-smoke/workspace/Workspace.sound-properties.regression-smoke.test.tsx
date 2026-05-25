import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { loadLocalSceneDraft } from "../../../src/modules/scene/adapters/localDraftStore";
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

function getSoundByTag(tag: string) {
  const draft = loadLocalSceneDraft("u_builder_001", window.localStorage);
  return draft?.objects.find((object) => object.tag === tag);
}

describe("Regression smoke: sound properties dialog", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("supports open/edit/apply/ok flow and deterministic mode gating", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const soundRow = within(rightSidebar).getByRole("button", { name: /sound_forest_01/i });
    fireEvent.contextMenu(soundRow, { clientX: 280, clientY: 210 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));

    const dialog = await screen.findByRole("dialog", { name: /sound properties/i });
    expect(within(dialog).getByRole("button", { name: /^basic$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^positioning$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^advanced$/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    const elevationInput = within(dialog).getByRole("spinbutton", { name: /^elevation$/i });
    const maxVolumeInput = within(dialog).getByRole("spinbutton", {
      name: /^max volume distance$/i
    });
    const westEastInput = within(dialog).getByRole("spinbutton", { name: /^west-east$/i });
    const northSouthInput = within(dialog).getByRole("spinbutton", { name: /^north-south$/i });
    expect(westEastInput).toBeDisabled();
    expect(northSouthInput).toBeDisabled();
    expect(elevationInput).not.toBeDisabled();
    expect(maxVolumeInput).not.toBeDisabled();

    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays everywhere in area/i })
    );
    expect(elevationInput).toBeDisabled();
    expect(maxVolumeInput).toBeDisabled();
    expect(westEastInput).toBeDisabled();
    expect(northSouthInput).toBeDisabled();

    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from random position each play/i })
    );
    expect(elevationInput).not.toBeDisabled();
    expect(maxVolumeInput).not.toBeDisabled();
    expect(westEastInput).not.toBeDisabled();
    expect(northSouthInput).not.toBeDisabled();

    fireEvent.change(maxVolumeInput, { target: { value: "10.5" } });
    fireEvent.change(westEastInput, { target: { value: "3.5" } });
    fireEvent.change(northSouthInput, { target: { value: "4.5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /sound properties/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterApply = getSoundByTag("SOUND_FOREST_01");
    expect(afterApply?.soundPositioning?.mode).toBe("random");
    expect(afterApply?.soundPositioning?.maxVolumeDistance).toBeCloseTo(10.5, 6);
    expect(afterApply?.soundPositioning?.randomRangeWestEast).toBeCloseTo(3.5, 6);
    expect(afterApply?.soundPositioning?.randomRangeNorthSouth).toBeCloseTo(4.5, 6);

    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from specific position/i })
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(screen.queryByRole("dialog", { name: /sound properties/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterOk = getSoundByTag("SOUND_FOREST_01");
    expect(afterOk?.soundPositioning?.mode).toBe("specific");
    expect(afterOk?.soundPositioning?.randomRangeWestEast).toBe(0);
    expect(afterOk?.soundPositioning?.randomRangeNorthSouth).toBe(0);
  });

  it("restores snapshot on cancel", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const before = getSoundByTag("SOUND_FOREST_01");
    expect(before).toBeDefined();

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const soundRow = within(rightSidebar).getByRole("button", { name: /sound_forest_01/i });
    fireEvent.contextMenu(soundRow, { clientX: 280, clientY: 210 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));

    const dialog = await screen.findByRole("dialog", { name: /sound properties/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from random position each play/i })
    );
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^west-east$/i }), {
      target: { value: "9" }
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^north-south$/i }), {
      target: { value: "7" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog", { name: /sound properties/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const afterCancel = getSoundByTag("SOUND_FOREST_01");
      expect(afterCancel?.soundPositioning?.mode).toBe(before?.soundPositioning?.mode);
      expect(afterCancel?.soundPositioning?.randomRangeWestEast).toBe(
        before?.soundPositioning?.randomRangeWestEast
      );
      expect(afterCancel?.soundPositioning?.randomRangeNorthSouth).toBe(
        before?.soundPositioning?.randomRangeNorthSouth
      );
    });
  });
});


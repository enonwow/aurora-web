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

async function saveDraft() {
  fireEvent.keyDown(window, { key: "s", ctrlKey: true });
  await waitFor(() => {
    expect(loadLocalSceneDraft("u_builder_001", window.localStorage)).not.toBeNull();
  });
}

function findSoundFromDraft(tag: string) {
  const draft = loadLocalSceneDraft("u_builder_001", window.localStorage);
  return draft?.objects.find((object) => object.tag === tag);
}

async function openSoundPropertiesDialog(label: RegExp) {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const soundRow = within(rightSidebar).getByRole("button", { name: label });
  fireEvent.contextMenu(soundRow, { clientX: 280, clientY: 210 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /sound properties/i });
}

describe("Regression smoke: sound properties mode parity", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("preserves mode transitions and zeroes random ranges outside random mode", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openSoundPropertiesDialog(/sound_forest_01/i);
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));

    const randomMode = within(dialog).getByRole("radio", {
      name: /plays from random position each play/i
    });
    const specificMode = within(dialog).getByRole("radio", { name: /plays from specific position/i });
    const everywhereMode = within(dialog).getByRole("radio", {
      name: /plays everywhere in area/i
    });
    const maxVolumeInput = within(dialog).getByRole("spinbutton", {
      name: /^max volume distance$/i
    });
    const cutoffInput = within(dialog).getByRole("spinbutton", { name: /^cutoff distance$/i });
    const westEastInput = within(dialog).getByRole("spinbutton", { name: /^west-east$/i });
    const northSouthInput = within(dialog).getByRole("spinbutton", { name: /^north-south$/i });
    expect(maxVolumeInput).toBeDisabled();

    fireEvent.click(randomMode);
    fireEvent.change(cutoffInput, { target: { value: "13.25" } });
    fireEvent.change(westEastInput, { target: { value: "3.5" } });
    fireEvent.change(northSouthInput, { target: { value: "4.5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await saveDraft();

    const randomState = findSoundFromDraft("SOUND_FOREST_01");
    expect(randomState?.soundPositioning?.mode).toBe("random");
    expect(randomState?.soundPositioning?.maxVolumeDistance).toBeCloseTo(1.325, 6);
    expect(randomState?.soundPositioning?.cutoffDistance).toBeCloseTo(13.25, 6);
    expect(randomState?.soundPositioning?.randomRangeWestEast).toBeCloseTo(3.5, 6);
    expect(randomState?.soundPositioning?.randomRangeNorthSouth).toBeCloseTo(4.5, 6);

    fireEvent.click(specificMode);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await saveDraft();
    const specificState = findSoundFromDraft("SOUND_FOREST_01");
    expect(specificState?.soundPositioning?.mode).toBe("specific");
    expect(specificState?.soundPositioning?.maxVolumeDistance).toBeCloseTo(1.325, 6);
    expect(specificState?.soundPositioning?.cutoffDistance).toBeCloseTo(13.25, 6);
    expect(specificState?.soundPositioning?.randomRangeWestEast).toBe(0);
    expect(specificState?.soundPositioning?.randomRangeNorthSouth).toBe(0);

    fireEvent.click(everywhereMode);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(screen.queryByRole("dialog", { name: /sound properties/i })).not.toBeInTheDocument();
    await saveDraft();

    const everywhereState = findSoundFromDraft("SOUND_FOREST_01");
    expect(everywhereState?.soundPositioning?.mode).toBe("everywhere");
    expect(everywhereState?.soundPositioning?.maxVolumeDistance).toBeCloseTo(1.325, 6);
    expect(everywhereState?.soundPositioning?.cutoffDistance).toBeCloseTo(13.25, 6);
    expect(everywhereState?.soundPositioning?.randomRangeWestEast).toBe(0);
    expect(everywhereState?.soundPositioning?.randomRangeNorthSouth).toBe(0);
  });

  it("keeps mode and random ranges in sync when switching between Basic and Positioning tabs", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openSoundPropertiesDialog(/sound_forest_01/i);
    fireEvent.click(within(dialog).getByRole("button", { name: /^basic$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from random position each play/i })
    );

    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    const westEastInput = within(dialog).getByRole("spinbutton", { name: /^west-east$/i });
    const northSouthInput = within(dialog).getByRole("spinbutton", { name: /^north-south$/i });
    expect(westEastInput).not.toBeDisabled();
    expect(northSouthInput).not.toBeDisabled();

    fireEvent.change(westEastInput, { target: { value: "8" } });
    fireEvent.change(northSouthInput, { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^basic$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from specific position/i })
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));

    expect(within(dialog).getByRole("spinbutton", { name: /^west-east$/i })).toBeDisabled();
    expect(within(dialog).getByRole("spinbutton", { name: /^north-south$/i })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await saveDraft();

    const state = findSoundFromDraft("SOUND_FOREST_01");
    expect(state?.soundPositioning?.mode).toBe("specific");
    expect(state?.soundPositioning?.randomRangeWestEast).toBe(0);
    expect(state?.soundPositioning?.randomRangeNorthSouth).toBe(0);
  });
});

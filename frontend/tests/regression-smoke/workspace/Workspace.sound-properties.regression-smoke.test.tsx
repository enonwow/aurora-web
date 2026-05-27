import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
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

function getSoundByTag(tag: string) {
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

async function openAdjustLocationDialog(label: RegExp) {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const soundRow = within(rightSidebar).getByRole("button", { name: label });
  fireEvent.click(soundRow);
  await waitFor(() => {
    expect(soundRow).toHaveAttribute("aria-selected", "true");
  });
  fireEvent.contextMenu(soundRow, { clientX: 280, clientY: 210 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
  return screen.findByRole("dialog", { name: /adjust location/i });
}

function toNumber(input: HTMLElement): number {
  return Number.parseFloat((input as HTMLInputElement).value);
}

function getSoundDialogNumericInput(dialog: HTMLElement, name: RegExp): HTMLElement {
  const scoped = within(dialog);
  return (
    scoped.queryByRole("spinbutton", { name }) ??
    scoped.getByRole("textbox", { name })
  );
}

function expectNumericInputFormat(input: HTMLElement, fractionDigits: number) {
  const value = (input as HTMLInputElement).value;
  const matcher = new RegExp(`^-?\\d+[\\.,]\\d{${fractionDigits}}$`);
  expect(value).toMatch(matcher);
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

    const dialog = await openSoundPropertiesDialog(/sound_forest_01/i);
    expect(within(dialog).getByRole("button", { name: /^basic$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^positioning$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^advanced$/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    const elevationInput = getSoundDialogNumericInput(dialog, /^elevation$/i);
    const cutoffInput = getSoundDialogNumericInput(dialog, /^cutoff distance$/i);
    const maxVolumeInput = getSoundDialogNumericInput(dialog, /^max volume distance$/i);
    const westEastInput = getSoundDialogNumericInput(dialog, /^west-east$/i);
    const northSouthInput = getSoundDialogNumericInput(dialog, /^north-south$/i);
    expect(westEastInput).toBeDisabled();
    expect(northSouthInput).toBeDisabled();
    expect(elevationInput).not.toBeDisabled();
    expect(maxVolumeInput).toBeDisabled();

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
    expect(maxVolumeInput).toBeDisabled();
    expect(westEastInput).not.toBeDisabled();
    expect(northSouthInput).not.toBeDisabled();

    fireEvent.change(cutoffInput, { target: { value: "13.5" } });
    fireEvent.change(westEastInput, { target: { value: "3.5" } });
    fireEvent.change(northSouthInput, { target: { value: "4.5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /sound properties/i })).toBeInTheDocument();

    await saveDraft();
    const afterApply = getSoundByTag("SOUND_FOREST_01");
    expect(afterApply?.soundPositioning?.mode).toBe("random");
    expect(afterApply?.soundPositioning?.cutoffDistance).toBeCloseTo(13.5, 6);
    expect(afterApply?.soundPositioning?.maxVolumeDistance).toBeCloseTo(1.35, 6);
    expect(afterApply?.soundPositioning?.randomRangeWestEast).toBeCloseTo(3.5, 6);
    expect(afterApply?.soundPositioning?.randomRangeNorthSouth).toBeCloseTo(4.5, 6);

    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from specific position/i })
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(screen.queryByRole("dialog", { name: /sound properties/i })).not.toBeInTheDocument();

    await saveDraft();
    const afterOk = getSoundByTag("SOUND_FOREST_01");
    expect(afterOk?.soundPositioning?.mode).toBe("specific");
    expect(afterOk?.soundPositioning?.randomRangeWestEast).toBe(0);
    expect(afterOk?.soundPositioning?.randomRangeNorthSouth).toBe(0);
  });

  it("renders Aurora-like float formatting for positioning and advanced numeric fields", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openSoundPropertiesDialog(/sound_forest_01/i);
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));

    expectNumericInputFormat(
      getSoundDialogNumericInput(dialog, /^cutoff distance$/i),
      1
    );
    expectNumericInputFormat(
      getSoundDialogNumericInput(dialog, /^max volume distance$/i),
      1
    );
    expectNumericInputFormat(getSoundDialogNumericInput(dialog, /^elevation$/i), 1);
    expectNumericInputFormat(getSoundDialogNumericInput(dialog, /^west-east$/i), 1);
    expectNumericInputFormat(getSoundDialogNumericInput(dialog, /^north-south$/i), 1);

    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));

    expectNumericInputFormat(
      getSoundDialogNumericInput(dialog, /interval between playing sounds \(seconds\)/i),
      2
    );
    expectNumericInputFormat(
      getSoundDialogNumericInput(dialog, /interval variation \(seconds\)/i),
      2
    );
    expectNumericInputFormat(
      getSoundDialogNumericInput(dialog, /pitch variation \(octaves\)/i),
      2
    );
  });

  it("plays and stops preview using bundled mock test sound", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openSoundPropertiesDialog(/sound_forest_01/i);

    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();
    const originalAudio = globalThis.Audio;
    const mockAudioConstructor = vi.fn((src?: string) => ({
      src: src ?? "",
      currentTime: 0,
      volume: 1,
      loop: false,
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
      play: playMock,
      pause: pauseMock
    })) as unknown as typeof Audio;
    Object.defineProperty(globalThis, "Audio", {
      configurable: true,
      writable: true,
      value: mockAudioConstructor
    });

    try {
      fireEvent.click(within(dialog).getByRole("button", { name: /^play$/i }));
      await waitFor(() => {
        expect(mockAudioConstructor).toHaveBeenCalledWith("/sounds/mock_test_tone.wav");
      });
      expect(playMock).toHaveBeenCalledTimes(1);

      fireEvent.click(within(dialog).getByRole("button", { name: /^stop$/i }));
      expect(pauseMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis, "Audio", {
        configurable: true,
        writable: true,
        value: originalAudio
      });
    }
  });

  it("restores snapshot on cancel", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await saveDraft();
    const before = getSoundByTag("SOUND_FOREST_01");
    expect(before).toBeDefined();

    const dialog = await openSoundPropertiesDialog(/sound_forest_01/i);
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from random position each play/i })
    );
    fireEvent.change(getSoundDialogNumericInput(dialog, /^west-east$/i), {
      target: { value: "9" }
    });
    fireEvent.change(getSoundDialogNumericInput(dialog, /^north-south$/i), {
      target: { value: "7" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog", { name: /sound properties/i })).not.toBeInTheDocument();

    await saveDraft();
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

  it("supports undo/redo and copy/paste regression flow for sound mock", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await saveDraft();
    const baseline = getSoundByTag("SOUND_FOREST_01");
    expect(baseline).toBeDefined();

    const dialog = await openSoundPropertiesDialog(/sound_forest_01/i);
    fireEvent.click(within(dialog).getByRole("button", { name: /^positioning$/i }));
    fireEvent.click(
      within(dialog).getByRole("radio", { name: /plays from random position each play/i })
    );
    fireEvent.change(getSoundDialogNumericInput(dialog, /^cutoff distance$/i), {
      target: { value: "20" }
    });
    fireEvent.change(getSoundDialogNumericInput(dialog, /^west-east$/i), {
      target: { value: "5" }
    });
    fireEvent.change(getSoundDialogNumericInput(dialog, /^north-south$/i), {
      target: { value: "6" }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await saveDraft();
    const edited = getSoundByTag("SOUND_FOREST_01");
    expect(edited?.soundPositioning?.mode).toBe("random");
    expect(edited?.soundPositioning?.cutoffDistance).toBeCloseTo(20, 6);
    expect(edited?.soundPositioning?.maxVolumeDistance).toBeCloseTo(2, 6);
    expect(edited?.soundPositioning?.randomRangeWestEast).toBeCloseTo(5, 6);
    expect(edited?.soundPositioning?.randomRangeNorthSouth).toBeCloseTo(6, 6);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await saveDraft();
    const afterUndo = getSoundByTag("SOUND_FOREST_01");
    expect(afterUndo?.soundPositioning?.mode).toBe(baseline?.soundPositioning?.mode);
    expect(afterUndo?.soundPositioning?.maxVolumeDistance).toBeCloseTo(
      baseline?.soundPositioning?.maxVolumeDistance ?? 0,
      6
    );
    expect(afterUndo?.soundPositioning?.cutoffDistance).toBeCloseTo(
      baseline?.soundPositioning?.cutoffDistance ?? 0,
      6
    );

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    await saveDraft();
    const afterRedo = getSoundByTag("SOUND_FOREST_01");
    expect(afterRedo?.soundPositioning?.mode).toBe("random");
    expect(afterRedo?.soundPositioning?.randomRangeWestEast).toBeCloseTo(5, 6);
    expect(afterRedo?.soundPositioning?.randomRangeNorthSouth).toBeCloseTo(6, 6);

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /sound_forest_01/i });
    fireEvent.click(sourceRow);

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(
      await within(rightSidebar).findByRole("button", { name: /sound_forest_01_copy/i })
    ).toBeInTheDocument();

    await saveDraft();
    const draft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const copiedSound = draft?.objects.find(
      (object) => object.kind === "sounds" && /^SOUND_FOREST_01_COPY/.test(object.tag)
    );
    expect(copiedSound).toBeDefined();
    expect(copiedSound?.soundPositioning).toEqual(afterRedo?.soundPositioning);
  });

  it("persists adjust location and bearing updates for sound object state", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    await saveDraft();
    const before = getSoundByTag("SOUND_FOREST_01");
    expect(before).toBeDefined();

    const dialog = await openAdjustLocationDialog(/sound_forest_01/i);
    const xInput = within(dialog).getByRole("spinbutton", { name: /^x$/i });
    const yInput = within(dialog).getByRole("spinbutton", { name: /^y$/i });
    const zInput = within(dialog).getByRole("spinbutton", { name: /^z$/i });
    const bearingInput = within(dialog).getByRole("spinbutton", { name: /bearing/i });

    const targetX = toNumber(xInput) + 4.5;
    const targetY = toNumber(yInput) + 3.5;
    const targetZ = toNumber(zInput) + 7.5;
    const targetBearing = 90;

    fireEvent.change(xInput, { target: { value: String(targetX) } });
    fireEvent.change(yInput, { target: { value: String(targetY) } });
    fireEvent.change(zInput, { target: { value: String(targetZ) } });
    fireEvent.change(bearingInput, { target: { value: String(targetBearing) } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(screen.queryByRole("dialog", { name: /adjust location/i })).not.toBeInTheDocument();

    await saveDraft();
    const changed = getSoundByTag("SOUND_FOREST_01");
    expect(changed).toBeDefined();
    expect(Math.abs((changed?.x ?? 0) - (before?.x ?? 0))).toBeGreaterThan(1e-6);
    expect(Math.abs((changed?.y ?? 0) - (before?.y ?? 0))).toBeGreaterThan(1e-6);
    expect(Math.abs((changed?.z ?? 0) - (before?.z ?? 0))).toBeGreaterThan(1e-6);
    expect(changed?.bearing).toBeCloseTo(Math.PI / 2, 6);

    const reopened = await openAdjustLocationDialog(/sound_forest_01/i);
    expect(
      toNumber(within(reopened).getByRole("spinbutton", { name: /bearing/i }))
    ).toBeCloseTo(targetBearing, 6);
  }, 15000);

  it("persists Aurora-style advanced sound fields via preserve payload", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openSoundPropertiesDialog(/sound_caves_02/i);
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^active$/i }));
    fireEvent.click(within(dialog).getByRole("radio", { name: /play during the day/i }));
    fireEvent.click(within(dialog).getByRole("radio", { name: /^once$/i }));
    fireEvent.click(within(dialog).getByRole("radio", { name: /^random$/i }));

    fireEvent.change(
      getSoundDialogNumericInput(dialog, /interval between playing sounds \(seconds\)/i),
      { target: { value: "12.5" } }
    );
    fireEvent.change(
      getSoundDialogNumericInput(dialog, /interval variation \(seconds\)/i),
      { target: { value: "2.5" } }
    );
    fireEvent.change(
      within(dialog).getByRole("slider", { name: /volume variation/i }),
      { target: { value: "4.5" } }
    );
    fireEvent.change(
      getSoundDialogNumericInput(dialog, /pitch variation \(octaves\)/i),
      { target: { value: "0.2" } }
    );

    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await saveDraft();

    const updated = getSoundByTag("SOUND_CAVES_02");
    expect(updated?.soundPositioning?.preserve).toBeDefined();
    expect(updated?.soundPositioning?.preserve?.active).toBe(false);
    expect(updated?.soundPositioning?.preserve?.whenToPlay).toBe("dayNight");
    expect(updated?.soundPositioning?.preserve?.dayNight).toBe("day");
    expect(updated?.soundPositioning?.preserve?.playStyle).toBe("once");
    expect(updated?.soundPositioning?.preserve?.playOrder).toBe("random");
    expect(updated?.soundPositioning?.preserve?.intervalMs).toBe(12500);
    expect(updated?.soundPositioning?.preserve?.intervalVariationMs).toBe(2500);
    expect(updated?.soundPositioning?.preserve?.volumeVariation).toBeCloseTo(0.45, 6);
    expect(updated?.soundPositioning?.preserve?.pitchVariation).toBeCloseTo(0.2, 6);
  });
});

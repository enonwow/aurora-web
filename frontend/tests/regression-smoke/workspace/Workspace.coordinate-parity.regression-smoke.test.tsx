import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { MASTER_CELLS_PER_TILE } from "../../../src/modules/layout/canvasGrid";
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

function toNumber(input: HTMLInputElement): number {
  return Number.parseFloat(input.value);
}

async function openAdjustLocationFor(label: RegExp) {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: label });
  fireEvent.click(row);
  await waitFor(() => {
    expect(row).toHaveAttribute("aria-selected", "true");
  });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
  return screen.findByRole("dialog", { name: /adjust location/i });
}

async function saveDraft() {
  fireEvent.keyDown(window, { key: "s", ctrlKey: true });
  await waitFor(() => {
    expect(loadLocalSceneDraft("u_builder_001", window.localStorage)).not.toBeNull();
  });
  return loadLocalSceneDraft("u_builder_001", window.localStorage);
}

describe("Regression smoke: workspace coordinate parity", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("reopens Adjust Location with persisted XY/Z/bearing and Z Translation values", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openAdjustLocationFor(/plc_barrel_01/i);
    const xInput = within(dialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement;
    const yInput = within(dialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement;
    const zInput = within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement;
    const bearingInput = within(dialog).getByRole("spinbutton", { name: /bearing/i }) as HTMLInputElement;
    const zTranslationInput = within(dialog).getByRole("spinbutton", {
      name: /^z translation$/i
    }) as HTMLInputElement;

    const targetX = toNumber(xInput) + 2.0;
    const targetY = toNumber(yInput) + 1.5;
    const targetZ = toNumber(zInput) + 2.5;
    const targetBearing = 45;
    const targetZTranslation = toNumber(zTranslationInput) + 12.5;

    fireEvent.change(xInput, { target: { value: String(targetX) } });
    fireEvent.change(yInput, { target: { value: String(targetY) } });
    fireEvent.change(zInput, { target: { value: String(targetZ) } });
    fireEvent.change(bearingInput, { target: { value: String(targetBearing) } });
    fireEvent.change(zTranslationInput, { target: { value: String(targetZTranslation) } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    expect(screen.queryByRole("dialog", { name: /adjust location/i })).not.toBeInTheDocument();

    const reopenedDialog = await openAdjustLocationFor(/plc_barrel_01/i);
    expect(
      toNumber(within(reopenedDialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement)
    ).toBeCloseTo(targetX, 6);
    expect(
      toNumber(within(reopenedDialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement)
    ).toBeCloseTo(targetY, 6);
    expect(
      toNumber(within(reopenedDialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement)
    ).toBeCloseTo(targetZ, 6);
    expect(
      toNumber(
        within(reopenedDialog).getByRole("spinbutton", {
          name: /^z translation$/i
        }) as HTMLInputElement
      )
    ).toBeCloseTo(targetZTranslation, 6);
    expect(
      toNumber(
        within(reopenedDialog).getByRole("spinbutton", {
          name: /bearing/i
        }) as HTMLInputElement
      )
    ).toBeCloseTo(targetBearing, 6);

    const savedDraft = await saveDraft();
    const changed = savedDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(changed).toBeDefined();
    expect(changed?.bearing ?? 0).toBeCloseTo(Math.PI / 4, 6);
    expect(changed?.z ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.visualTransform.offsetZ ?? 0).toBeGreaterThanOrEqual(0);
  }, 15000);

  it("reopens Adjust Location with keyboard-transform persisted values and bounded XY", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const initialDialog = await openAdjustLocationFor(/plc_barrel_01/i);
    const beforeX = toNumber(
      within(initialDialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement
    );
    const beforeY = toNumber(
      within(initialDialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement
    );
    fireEvent.click(within(initialDialog).getByRole("button", { name: /^cancel$/i }));

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(row);
    await waitFor(() => {
      expect(row).toHaveAttribute("aria-selected", "true");
    });

    for (let index = 0; index < 80; index += 1) {
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowUp" });
    }

    const firstReopen = await openAdjustLocationFor(/plc_barrel_01/i);
    const reopenedX = toNumber(
      within(firstReopen).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement
    );
    const reopenedY = toNumber(
      within(firstReopen).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement
    );
    fireEvent.click(within(firstReopen).getByRole("button", { name: /^cancel$/i }));

    const secondReopen = await openAdjustLocationFor(/plc_barrel_01/i);
    expect(
      toNumber(within(secondReopen).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement)
    ).toBeCloseTo(reopenedX, 6);
    expect(
      toNumber(within(secondReopen).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement)
    ).toBeCloseTo(reopenedY, 6);

    const savedDraft = await saveDraft();
    const changed = savedDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(changed).toBeDefined();
    expect((changed?.x ?? 0) * MASTER_CELLS_PER_TILE).not.toBeCloseTo(beforeX, 6);
    expect((changed?.y ?? 0) * MASTER_CELLS_PER_TILE).not.toBeCloseTo(beforeY, 6);
    expect(changed?.x ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.y ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.x ?? 0).toBeLessThan(2);
    expect(changed?.y ?? 0).toBeLessThan(2);
  }, 20000);

  it("normalizes edge Adjust Location inputs to bounded XY/Z and 0..360 bearing", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openAdjustLocationFor(/plc_barrel_01/i);
    const xInput = within(dialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement;
    const yInput = within(dialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement;
    const zInput = within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement;
    const bearingInput = within(dialog).getByRole("spinbutton", { name: /bearing/i }) as HTMLInputElement;
    const zTranslationInput = within(dialog).getByRole("spinbutton", {
      name: /^z translation$/i
    }) as HTMLInputElement;
    const maxX = Number.parseFloat(xInput.max);
    const maxY = Number.parseFloat(yInput.max);

    fireEvent.change(xInput, { target: { value: "-500" } });
    fireEvent.change(yInput, { target: { value: "500" } });
    fireEvent.change(zInput, { target: { value: "-25" } });
    fireEvent.change(bearingInput, { target: { value: "-360" } });
    fireEvent.change(zTranslationInput, { target: { value: "-5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    const reopenedDialog = await openAdjustLocationFor(/plc_barrel_01/i);
    const reopenedX = toNumber(
      within(reopenedDialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement
    );
    const reopenedY = toNumber(
      within(reopenedDialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement
    );
    const reopenedZ = toNumber(
      within(reopenedDialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement
    );
    const reopenedBearing = toNumber(
      within(reopenedDialog).getByRole("spinbutton", { name: /bearing/i }) as HTMLInputElement
    );
    const reopenedZTranslation = toNumber(
      within(reopenedDialog).getByRole("spinbutton", { name: /^z translation$/i }) as HTMLInputElement
    );

    expect(reopenedX).toBeGreaterThanOrEqual(0);
    expect(reopenedY).toBeGreaterThanOrEqual(0);
    expect(reopenedZ).toBeGreaterThanOrEqual(0);
    expect(reopenedZTranslation).toBeGreaterThanOrEqual(0);
    expect(reopenedBearing).toBeGreaterThanOrEqual(0);
    expect(reopenedBearing).toBeLessThan(360);
    expect(reopenedBearing).toBeCloseTo(0, 6);
    if (Number.isFinite(maxX)) {
      expect(reopenedX).toBeLessThanOrEqual(maxX);
    }
    if (Number.isFinite(maxY)) {
      expect(reopenedY).toBeLessThanOrEqual(maxY);
    }

    const savedDraft = await saveDraft();
    const changed = savedDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(changed).toBeDefined();
    expect(changed?.x ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.y ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.x ?? 0).toBeLessThan(2);
    expect(changed?.y ?? 0).toBeLessThan(2);
    expect(changed?.z ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.visualTransform.offsetZ ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.bearing ?? 0).toBeGreaterThanOrEqual(0);
    expect(changed?.bearing ?? 0).toBeLessThan(Math.PI * 2);
    expect(changed?.bearing ?? 0).toBeCloseTo(0, 6);
  }, 20000);
});

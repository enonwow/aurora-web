import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  LAYOUT_SETTINGS_STORAGE_KEY
} from "../../../src/modules/layout/layoutSettings";
import { MASTER_CELLS_PER_TILE } from "../../../src/modules/layout/canvasGrid";
import {
  WORKSPACE_OPTIONS_STORAGE_KEY
} from "../../../src/modules/layout/workspaceOptionSettings";
import { OBJECT_ADD_DRAG_MIME } from "../../../src/modules/layout/components/objectAddDragPayload";
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

async function openQuickOptionsDialog() {
  const trigger = screen.getByRole("button", { name: /open quick options/i });
  fireEvent.click(trigger);
  try {
    return await screen.findByRole("dialog", { name: /quick options/i }, { timeout: 3000 });
  } catch {
    fireEvent.click(trigger);
    return screen.findByRole("dialog", { name: /quick options/i }, { timeout: 5000 });
  }
}

async function openToolbarGroup(groupName: RegExp) {
  const tab = screen.getByRole("button", { name: groupName });
  fireEvent.click(tab);
  if (tab.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(tab);
  }
  await waitFor(() => {
    expect(tab).toHaveAttribute("aria-expanded", "true");
  });
  return tab;
}

async function openCanvasCommands() {
  await openToolbarGroup(/^canvas$/i);
  expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();
}

describe("Regression smoke: workspace interactions", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("keeps visibility drawer open while applying actions", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openToolbarGroup(/^visibility$/i);
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show creatures/i }));
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show items/i }));
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it("applies show none and show all visibility matrix correctly", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openToolbarGroup(/^visibility$/i);

    const showNone = screen.getByRole("button", { name: /show none/i });
    fireEvent.click(showNone);
    expect(showNone.className).toContain("is-active");

    const visibilityButtons = [
      /show creatures/i,
      /show doors/i,
      /show items/i,
      /show placeables/i,
      /show sounds/i
    ];

    visibilityButtons.forEach((matcher) => {
      expect(screen.getByRole("button", { name: matcher }).className).not.toContain("is-active");
    });

    fireEvent.click(screen.getByRole("button", { name: /show all/i }));
    expect(showNone.className).not.toContain("is-active");
    visibilityButtons.forEach((matcher) => {
      expect(screen.getByRole("button", { name: matcher }).className).toContain("is-active");
    });
  });

  it("opens object context menu from scene list and closes it on Escape", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });

    expect(screen.getByRole("menu", { name: /object context menu/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("menu", { name: /object context menu/i })).not.toBeInTheDocument();
  });

  it("supports Adjust Location apply and snapshot restore on cancel", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const beforeDraft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const beforeObject = beforeDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(beforeObject).toBeDefined();

    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: /collapse adjust location dialog/i
      })
    );
    expect(
      within(dialog).queryByRole("button", {
        name: /^apply$/i
      })
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: /expand adjust location dialog/i
      })
    );
    const xInput = within(dialog).getByRole("spinbutton", { name: /^x$/i });
    const zInput = within(dialog).getByRole("spinbutton", { name: /^z$/i });
    fireEvent.change(xInput, {
      target: { value: String((beforeObject?.x ?? 0) * 10 + 4.5) }
    });
    fireEvent.change(zInput, {
      target: {
        value: String((beforeObject?.z ?? 0) * MASTER_CELLS_PER_TILE + 12.5)
      }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterApplyDraft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const afterApplyObject = afterApplyDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(afterApplyObject).toBeDefined();
    expect((afterApplyObject?.x ?? 0) - (beforeObject?.x ?? 0)).toBeGreaterThan(0.4);
    expect((afterApplyObject?.z ?? 0) - (beforeObject?.z ?? 0)).toBeGreaterThan(1);

    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog", { name: /adjust location/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterCancelDraft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const afterCancelObject = afterCancelDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(afterCancelObject).toBeDefined();
    expect(afterCancelObject?.x).toBeCloseTo(beforeObject?.x ?? 0, 6);
    expect(afterCancelObject?.z).toBeCloseTo(beforeObject?.z ?? 0, 6);
  });

  it("keeps Adjust Location fields in sync with canvas movement", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.contextMenu(row, { clientX: 252, clientY: 188 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const propertiesDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const staticCheckbox = within(propertiesDialog).getByRole("checkbox", {
      name: /static/i
    }) as HTMLInputElement;
    if (staticCheckbox.checked) {
      fireEvent.click(staticCheckbox);
    }
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.click(row);
    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const xInput = within(dialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement;
    const beforeX = Number.parseFloat(xInput.value);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      const nextX = Number.parseFloat(
        (within(dialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement).value
      );
      expect(Math.abs(nextX - beforeX)).toBeGreaterThan(5);
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
  });

  it("keeps Adjust Location axis direction consistent while preserving scale and Z values", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.contextMenu(row, { clientX: 252, clientY: 188 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const propertiesDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const staticCheckbox = within(propertiesDialog).getByRole("checkbox", {
      name: /static/i
    }) as HTMLInputElement;
    if (staticCheckbox.checked) {
      fireEvent.click(staticCheckbox);
    }
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.click(row);
    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const xInput = within(dialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement;
    const yInput = within(dialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement;
    const zInput = within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement;
    const scaleInput = within(dialog).getByRole("spinbutton", { name: /^scale$/i }) as HTMLInputElement;
    const zTranslationInput = within(dialog).getByRole("spinbutton", {
      name: /^z translation$/i
    }) as HTMLInputElement;

    const beforeX = Number.parseFloat(xInput.value);
    const beforeY = Number.parseFloat(yInput.value);
    const beforeZ = Number.parseFloat(zInput.value);
    const beforeScale = Number.parseFloat(scaleInput.value);
    const beforeZTranslation = Number.parseFloat(zTranslationInput.value);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowUp" });

    await waitFor(() => {
      const nextX = Number.parseFloat(
        (within(dialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement).value
      );
      const nextY = Number.parseFloat(
        (within(dialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement).value
      );
      expect(nextX).toBeLessThan(beforeX);
      expect(nextY).toBeLessThan(beforeY);
    });

    const afterScale = Number.parseFloat(
      (within(dialog).getByRole("spinbutton", { name: /^scale$/i }) as HTMLInputElement).value
    );
    const afterZ = Number.parseFloat(
      (within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement).value
    );
    const afterZTranslation = Number.parseFloat(
      (within(dialog).getByRole("spinbutton", { name: /^z translation$/i }) as HTMLInputElement)
        .value
    );
    expect(afterScale).toBeCloseTo(beforeScale, 6);
    expect(afterZ).toBeCloseTo(beforeZ, 6);
    expect(afterZTranslation).toBeCloseTo(beforeZTranslation, 6);

    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
  });

  it("keeps Adjust Location Z independent from Z Translation across apply and reopen", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const zInput = within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement;
    const zTranslationInput = within(dialog).getByRole("spinbutton", {
      name: /^z translation$/i
    }) as HTMLInputElement;
    const baselineZ = Number.parseFloat(zInput.value);
    const targetZ = Number.parseFloat(zInput.value) + 12.5;

    fireEvent.change(zTranslationInput, { target: { value: String(targetZ) } });

    await waitFor(() => {
      expect(
        Number.parseFloat(
          (
            within(dialog).getByRole("spinbutton", { name: /^z translation$/i }) as HTMLInputElement
          ).value
        )
      ).toBeCloseTo(targetZ, 6);
    });

    expect(
      Number.parseFloat(
        (within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement).value
      )
    ).toBeCloseTo(baselineZ, 6);

    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(screen.queryByRole("dialog", { name: /adjust location/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const savedDraft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const changed = savedDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(changed).toBeDefined();
    expect(changed?.visualTransform.offsetZ ?? 0).toBeCloseTo(
      targetZ / MASTER_CELLS_PER_TILE,
      6
    );

    fireEvent.contextMenu(row, { clientX: 272, clientY: 208 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
    const reopenedDialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const reopenedZ = Number.parseFloat(
      (within(reopenedDialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement).value
    );
    const reopenedZTranslation = Number.parseFloat(
      (
        within(reopenedDialog).getByRole("spinbutton", { name: /^z translation$/i }) as HTMLInputElement
      ).value
    );
    expect(reopenedZ).toBeCloseTo(baselineZ, 6);
    expect(reopenedZTranslation).toBeCloseTo(targetZ, 6);

    fireEvent.click(within(reopenedDialog).getByRole("button", { name: /^cancel$/i }));
  });

  it("keeps Z Translation unchanged when only Position Z is edited", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const zInput = within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement;
    const zTranslationInput = within(dialog).getByRole("spinbutton", {
      name: /^z translation$/i
    }) as HTMLInputElement;

    const baselineZ = Number.parseFloat(zInput.value);
    const baselineZTranslation = Number.parseFloat(zTranslationInput.value);
    const nextZ = baselineZ + 7.25;

    fireEvent.change(zInput, { target: { value: String(nextZ) } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(screen.queryByRole("dialog", { name: /adjust location/i })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const savedDraft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const changed = savedDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(changed).toBeDefined();
    expect(changed?.z ?? 0).toBeCloseTo(nextZ / MASTER_CELLS_PER_TILE, 6);
    expect(changed?.visualTransform.offsetZ ?? 0).toBeCloseTo(
      baselineZTranslation / MASTER_CELLS_PER_TILE,
      6
    );

    fireEvent.contextMenu(row, { clientX: 272, clientY: 208 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
    const reopenedDialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const reopenedZ = Number.parseFloat(
      (within(reopenedDialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement).value
    );
    const reopenedZTranslation = Number.parseFloat(
      (
        within(reopenedDialog).getByRole("spinbutton", { name: /^z translation$/i }) as HTMLInputElement
      ).value
    );

    expect(reopenedZ).toBeCloseTo(nextZ, 6);
    expect(reopenedZTranslation).toBeCloseTo(baselineZTranslation, 6);

    fireEvent.click(within(reopenedDialog).getByRole("button", { name: /^cancel$/i }));
  });

  it("applies bearing from Adjust Location to object placement", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const bearingInput = within(dialog).getByRole("spinbutton", { name: /bearing/i });
    fireEvent.change(bearingInput, { target: { value: "45" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const savedDraft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const changed = savedDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(changed).toBeDefined();
    expect(changed?.bearing ?? 0).toBeCloseTo(Math.PI / 4, 5);
  });

  it("keeps full-turn bearing value as 360 in Adjust Location input", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const bearingInput = within(dialog).getByRole("spinbutton", { name: /bearing/i }) as HTMLInputElement;
    fireEvent.change(bearingInput, { target: { value: "360" } });

    await waitFor(() => {
      expect(
        (within(dialog).getByRole("spinbutton", { name: /bearing/i }) as HTMLInputElement).value
      ).toBe("360");
    });
  });


  it("syncs selection to editable targets when opening Adjust Location from mixed selection", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const doorRow = within(rightSidebar).getByRole("button", { name: /door_west_01/i });

    fireEvent.click(placeableRow);
    fireEvent.click(doorRow, { ctrlKey: true });

    await waitFor(() => {
      expect(placeableRow).toHaveAttribute("aria-selected", "true");
      expect(doorRow).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.contextMenu(placeableRow, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    await screen.findByRole("dialog", { name: /adjust location/i });

    await waitFor(() => {
      expect(placeableRow).toHaveAttribute("aria-selected", "true");
      expect(doorRow).toHaveAttribute("aria-selected", "false");
    });
  });

  it("keeps Visual Transforms visible for mixed static/non-static placeables and saves values for all", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const staticRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const nonStaticRow = within(rightSidebar).getByRole("button", { name: /plc_table_02/i });

    fireEvent.contextMenu(staticRow, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const staticDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const staticCheckbox = within(staticDialog).getByRole("checkbox", { name: /static/i }) as HTMLInputElement;
    if (!staticCheckbox.checked) {
      fireEvent.click(staticCheckbox);
    }
    fireEvent.click(within(staticDialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.contextMenu(nonStaticRow, { clientX: 280, clientY: 220 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const nonStaticDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const nonStaticCheckbox = within(nonStaticDialog).getByRole("checkbox", { name: /static/i }) as HTMLInputElement;
    if (nonStaticCheckbox.checked) {
      fireEvent.click(nonStaticCheckbox);
    }
    fireEvent.click(within(nonStaticDialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const draftWithStaticSetup = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const staticObject = draftWithStaticSetup?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const nonStaticObject = draftWithStaticSetup?.objects.find((object) => object.tag === "PLC_TABLE_02");
    expect(staticObject).toBeDefined();
    expect(nonStaticObject).toBeDefined();
    expect(staticObject?.isStatic ?? true).toBe(true);
    expect(nonStaticObject?.isStatic ?? true).toBe(false);

    fireEvent.click(staticRow);
    fireEvent.click(nonStaticRow, { ctrlKey: true });
    await waitFor(() => {
      expect(staticRow).toHaveAttribute("aria-selected", "true");
      expect(nonStaticRow).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.contextMenu(staticRow, { clientX: 268, clientY: 204 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));

    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });
    expect(within(dialog).getByRole("spinbutton", { name: /^scale$/i })).toBeInTheDocument();
    expect(
      within(dialog).getByText(/mixed static \+ non-static selection/i)
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^scale$/i }), {
      target: { value: "1.33" }
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^z translation$/i }), {
      target: { value: String(2.2 * MASTER_CELLS_PER_TILE) }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterAdjustDraft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const afterStaticObject = afterAdjustDraft?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const afterNonStaticObject = afterAdjustDraft?.objects.find((object) => object.tag === "PLC_TABLE_02");
    expect(afterStaticObject).toBeDefined();
    expect(afterNonStaticObject).toBeDefined();
    expect(afterStaticObject?.visualTransform.scale ?? 0).toBeCloseTo(1.33, 6);
    expect(afterNonStaticObject?.visualTransform.scale ?? 0).toBeCloseTo(1.33, 6);
    expect(afterStaticObject?.visualTransform.offsetZ ?? 0).toBeCloseTo(2.2, 6);
    expect(afterNonStaticObject?.visualTransform.offsetZ ?? 0).toBeCloseTo(2.2, 6);
    expect(afterStaticObject?.isStatic ?? true).toBe(true);
    expect(afterNonStaticObject?.isStatic ?? true).toBe(false);
  });

  it("blocks VT gizmo on static placeable and unblocks after disabling Static", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const propertiesDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const staticCheckbox = within(propertiesDialog).getByRole("checkbox", {
      name: /static/i
    }) as HTMLInputElement;
    if (!staticCheckbox.checked) {
      fireEvent.click(staticCheckbox);
    }
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: /^ok$/i }));

    await openCanvasCommands();
    fireEvent.click(screen.getByRole("button", { name: /vt rotate \(3\)/i }));
    fireEvent.click(row);

    const blockedNote = await screen.findByLabelText(/visual transform blocked info/i);
    expect(blockedNote).toHaveTextContent(/disabled for static placeables/i);

    fireEvent.contextMenu(row, { clientX: 264, clientY: 206 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const reopenDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const reopenStaticCheckbox = within(reopenDialog).getByRole("checkbox", {
      name: /static/i
    }) as HTMLInputElement;
    if (reopenStaticCheckbox.checked) {
      fireEvent.click(reopenStaticCheckbox);
    }
    fireEvent.click(within(reopenDialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/visual transform blocked info/i)).not.toBeInTheDocument();
    });
  });

  it("keeps VT keyboard move from changing Z Translation in Adjust Location", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const propertiesDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const staticCheckbox = within(propertiesDialog).getByRole("checkbox", {
      name: /static/i
    }) as HTMLInputElement;
    if (staticCheckbox.checked) {
      fireEvent.click(staticCheckbox);
    }
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.contextMenu(row, { clientX: 266, clientY: 206 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
    const beforeDialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const zTranslationBefore = Number.parseFloat(
      (within(beforeDialog).getByRole("spinbutton", { name: /^z translation$/i }) as HTMLInputElement)
        .value
    );
    fireEvent.click(within(beforeDialog).getByRole("button", { name: /^cancel$/i }));

    await openCanvasCommands();
    fireEvent.click(screen.getByRole("button", { name: /vt offset \(4\)/i }));
    fireEvent.click(row);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowUp" });

    fireEvent.contextMenu(row, { clientX: 274, clientY: 214 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
    const afterDialog = await screen.findByRole("dialog", { name: /adjust location/i });
    const zTranslationAfter = Number.parseFloat(
      (within(afterDialog).getByRole("spinbutton", { name: /^z translation$/i }) as HTMLInputElement)
        .value
    );
    expect(zTranslationAfter).toBeCloseTo(zTranslationBefore, 6);
  });

  it("reopens Adjust Location with updated XY, Z and bearing after transform commits", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(row);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowUp" });

    fireEvent.contextMenu(row, { clientX: 268, clientY: 204 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
    const dialog = await screen.findByRole("dialog", { name: /adjust location/i });

    const movedX = Number.parseFloat(
      (within(dialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement).value
    );
    const movedY = Number.parseFloat(
      (within(dialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement).value
    );
    const movedZ = Number.parseFloat(
      (within(dialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement).value
    );
    const targetZ = 1.9 * MASTER_CELLS_PER_TILE;
    const targetBearing = 137.5;

    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /^z translation$/i }), {
      target: { value: String(targetZ) }
    });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /bearing/i }), {
      target: { value: String(targetBearing) }
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.contextMenu(row, { clientX: 274, clientY: 210 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
    const reopenedDialog = await screen.findByRole("dialog", { name: /adjust location/i });

    expect(
      Number.parseFloat(
        (within(reopenedDialog).getByRole("spinbutton", { name: /^x$/i }) as HTMLInputElement).value
      )
    ).toBeCloseTo(movedX, 6);
    expect(
      Number.parseFloat(
        (within(reopenedDialog).getByRole("spinbutton", { name: /^y$/i }) as HTMLInputElement).value
      )
    ).toBeCloseTo(movedY, 6);
    expect(
      Number.parseFloat(
        (within(reopenedDialog).getByRole("spinbutton", { name: /^z$/i }) as HTMLInputElement).value
      )
    ).toBeCloseTo(movedZ, 6);
    expect(
      Number.parseFloat(
        (within(reopenedDialog).getByRole("spinbutton", { name: /bearing/i }) as HTMLInputElement).value
      )
    ).toBeCloseTo(targetBearing, 1);

    fireEvent.click(within(reopenedDialog).getByRole("button", { name: /^cancel$/i }));
  });

  it("hides Adjust Location for doors in object context menu", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /door_west_01/i });
    fireEvent.contextMenu(row, { clientX: 280, clientY: 220 });

    expect(screen.getByRole("menu", { name: /object context menu/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^adjust location$/i })).not.toBeInTheDocument();
  });

  it("renders placeable lock/trap controls and persists apply/ok while cancel discards transient edits", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);

    const openPlaceablePropertiesDialog = async () => {
      const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
      fireEvent.contextMenu(placeableRow, { clientX: 260, clientY: 200 });
      fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
      return screen.findByRole("dialog", { name: /placeable properties/i });
    };

    const dialog = await openPlaceablePropertiesDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: /^lock$/i }));
    const lockedCheckbox = within(dialog).getByRole("checkbox", { name: /^locked$/i });
    const canRelockCheckbox = within(dialog).getByRole("checkbox", { name: /^can be relocked$/i });
    const keyRequiredCheckbox = within(dialog).getByRole("checkbox", {
      name: /^key required to unlock or lock$/i
    });
    const openLockDcInput = within(dialog).getByRole("spinbutton", { name: /^open lock dc$/i });
    const keyTagInput = within(dialog).getByRole("textbox", { name: /^key tag$/i });

    expect(lockedCheckbox).toBeInTheDocument();
    expect(canRelockCheckbox).toBeInTheDocument();
    expect(keyRequiredCheckbox).toBeInTheDocument();
    expect(openLockDcInput).toBeInTheDocument();
    expect(keyTagInput).toBeInTheDocument();

    fireEvent.click(lockedCheckbox);
    fireEvent.click(canRelockCheckbox);
    fireEvent.click(keyRequiredCheckbox);
    fireEvent.change(openLockDcInput, { target: { value: "31" } });
    fireEvent.change(keyTagInput, { target: { value: "PLC_KEY_PERSIST_01" } });

    expect(lockedCheckbox).toBeChecked();
    expect(canRelockCheckbox).toBeChecked();
    expect(keyRequiredCheckbox).toBeChecked();
    expect(openLockDcInput).toHaveValue(31);
    expect(keyTagInput).toHaveValue("PLC_KEY_PERSIST_01");

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
    fireEvent.change(disarmDcInput, { target: { value: "27" } });
    fireEvent.change(onTrapTriggeredInput, {
      target: { value: "plc_trap_persist_trigger_01" }
    });

    expect(isTrappedCheckbox).toBeChecked();
    expect(disarmDcInput).toHaveValue(27);
    expect(onTrapTriggeredInput).toHaveValue("plc_trap_persist_trigger_01");

    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /placeable properties/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i })).not.toBeInTheDocument();
    });

    const reopenedAfterPersist = await openPlaceablePropertiesDialog();
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^lock$/i }));
    expect(within(reopenedAfterPersist).getByRole("checkbox", { name: /^locked$/i })).toBeChecked();
    expect(
      within(reopenedAfterPersist).getByRole("checkbox", {
        name: /^key required to unlock or lock$/i
      })
    ).toBeChecked();
    expect(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^open lock dc$/i })
    ).toHaveValue(31);
    expect(within(reopenedAfterPersist).getByRole("textbox", { name: /^key tag$/i })).toHaveValue(
      "PLC_KEY_PERSIST_01"
    );

    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^trap$/i }));
    expect(
      within(reopenedAfterPersist).getByRole("checkbox", { name: /^is trapped$/i })
    ).toBeChecked();
    expect(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^disarm dc$/i })
    ).toHaveValue(27);
    expect(
      within(reopenedAfterPersist).getByRole("textbox", { name: /^ontraptriggered$/i })
    ).toHaveValue("plc_trap_persist_trigger_01");

    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^lock$/i }));
    fireEvent.change(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^open lock dc$/i }),
      { target: { value: "11" } }
    );
    fireEvent.change(within(reopenedAfterPersist).getByRole("textbox", { name: /^key tag$/i }), {
      target: { value: "PLC_KEY_TRANSIENT_01" }
    });
    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^trap$/i }));
    fireEvent.change(
      within(reopenedAfterPersist).getByRole("spinbutton", { name: /^disarm dc$/i }),
      { target: { value: "8" } }
    );
    fireEvent.change(
      within(reopenedAfterPersist).getByRole("textbox", { name: /^ontraptriggered$/i }),
      {
        target: { value: "plc_trap_transient_trigger_01" }
      }
    );

    fireEvent.click(within(reopenedAfterPersist).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i })).not.toBeInTheDocument();
    });

    const reopenedAfterCancel = await openPlaceablePropertiesDialog();
    fireEvent.click(within(reopenedAfterCancel).getByRole("button", { name: /^lock$/i }));
    expect(within(reopenedAfterCancel).getByRole("checkbox", { name: /^locked$/i })).toBeChecked();
    expect(
      within(reopenedAfterCancel).getByRole("spinbutton", { name: /^open lock dc$/i })
    ).toHaveValue(31);
    expect(within(reopenedAfterCancel).getByRole("textbox", { name: /^key tag$/i })).toHaveValue(
      "PLC_KEY_PERSIST_01"
    );

    fireEvent.click(within(reopenedAfterCancel).getByRole("button", { name: /^trap$/i }));
    expect(
      within(reopenedAfterCancel).getByRole("spinbutton", { name: /^disarm dc$/i })
    ).toHaveValue(27);
    expect(
      within(reopenedAfterCancel).getByRole("textbox", { name: /^ontraptriggered$/i })
    ).toHaveValue("plc_trap_persist_trigger_01");
  });

  it("keeps object catalog interactive for type switch and filtering", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const typeSelector = within(rightSidebar).getByRole("combobox", {
      name: /object type selector/i
    });
    const filterInput = within(rightSidebar).getByRole("searchbox", {
      name: /filter objects/i
    });

    fireEvent.change(typeSelector, { target: { value: "sounds" } });
    expect(within(rightSidebar).getByText(/sound_forest_01/i)).toBeInTheDocument();

    fireEvent.change(filterInput, { target: { value: "caves" } });
    expect(within(rightSidebar).getByText(/sound_caves_02/i)).toBeInTheDocument();
    expect(within(rightSidebar).queryByText(/sound_forest_01/i)).not.toBeInTheDocument();

    fireEvent.change(filterInput, { target: { value: "" } });
    expect(within(rightSidebar).getByText(/sound_forest_01/i)).toBeInTheDocument();
    expect(within(rightSidebar).getByText(/sound_caves_02/i)).toBeInTheDocument();

    fireEvent.change(typeSelector, { target: { value: "vfx" } });
    expect(within(rightSidebar).getByText(/no vfx objects in current area/i)).toBeInTheDocument();
  });

  it("persists workspace options across logout/login without page refresh", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    fireEvent.change(screen.getByLabelText(/grid step/i), {
      target: { value: "2.5" }
    });
    fireEvent.click(screen.getByLabelText(/show per-object gizmo hints/i));
    fireEvent.click(screen.getByLabelText(/display tile grid overlay/i));

    let raw = window.localStorage.getItem(WORKSPACE_OPTIONS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    let parsed = JSON.parse(raw ?? "{}");
    expect(parsed.snapGridStep).toBe(2.5);
    expect(parsed.showPerObjectGizmoHints).toBe(false);
    expect(parsed.showTileGridOverlay).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    await openQuickOptionsDialog();
    expect(await screen.findByLabelText(/grid step/i)).toHaveValue(2.5);
    expect(screen.getByLabelText(/show per-object gizmo hints/i)).not.toBeChecked();
    expect(screen.getByLabelText(/display tile grid overlay/i)).toBeChecked();
  }, 15000);

  it("supports collapsing sidebars and restoring them by clicking collapsed strips", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /collapse left panel/i }));
    fireEvent.click(screen.getByRole("button", { name: /collapse right panel/i }));

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    expect(leftSidebar.className).toContain("is-collapsed");
    expect(rightSidebar.className).toContain("is-collapsed");

    fireEvent.click(leftSidebar);
    fireEvent.click(rightSidebar);

    expect(within(leftSidebar).getByRole("heading", { name: /^add objects$/i })).toBeInTheDocument();
    expect(within(rightSidebar).getByRole("heading", { name: /^scene objects$/i })).toBeInTheDocument();

    const storedRaw = window.localStorage.getItem(LAYOUT_SETTINGS_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw ?? "{}");
    expect(stored.leftSidebarCollapsed).toBe(false);
    expect(stored.rightSidebarCollapsed).toBe(false);
  });

  it("closes quick options dialog with Escape", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(await openQuickOptionsDialog()).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /quick options/i })).not.toBeInTheDocument();
    });
  });

  it("closes debug panel with backdrop click", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));
    expect(await screen.findByRole("dialog", { name: /debug panel/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.querySelector(".debug-backdrop") as Element);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /debug panel/i })).not.toBeInTheDocument();
    });
  });

  it("switches active drawer group on hover when drawer is open", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const moduleTab = screen.getByRole("button", { name: /^module$/i });
    fireEvent.click(moduleTab);
    await waitFor(() => {
      expect(moduleTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/module commands/i, {}, { timeout: 5000 })).toBeInTheDocument();

    const visibilityTab = screen.getByRole("button", { name: /^visibility$/i });
    fireEvent.mouseEnter(visibilityTab);
    expect(
      await screen.findByLabelText(/visibility commands/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it("closes drawer when clicking outside topbar center", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const moduleTab = screen.getByRole("button", { name: /^module$/i });
    fireEvent.click(moduleTab);
    await waitFor(() => {
      expect(moduleTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/module commands/i, {}, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByLabelText(/module commands/i)).not.toBeInTheDocument();
    });
  });

  it("closes shortcuts dialog on backdrop click", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /shortcuts/i }));
    expect(await screen.findByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.querySelector(".shortcuts-backdrop") as Element);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    });
  });

  it("copies and deletes selected object from canvas commands", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
    fireEvent.click(canvasTab);
    await waitFor(() => {
      expect(canvasTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));
    const copiedRow = await within(rightSidebar).findByRole("button", {
      name: /plc_barrel_01_copy/i
    });
    expect(copiedRow).toBeInTheDocument();

    fireEvent.click(copiedRow);
    fireEvent.click(screen.getByRole("button", { name: /delete sel/i }));

    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01_copy/i })
      ).not.toBeInTheDocument();
    });
  });

  it("supports undo and redo for copied object from canvas commands", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
    fireEvent.click(canvasTab);
    await waitFor(() => {
      expect(canvasTab).toHaveAttribute("aria-expanded", "true");
    });
    expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));

    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();

    const quickActions = screen.getByLabelText(/quick actions/i);
    fireEvent.click(within(quickActions).getByRole("button", { name: /^undo$/i }));
    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", {
          name: /plc_barrel_01_copy/i
        })
      ).not.toBeInTheDocument();
    });

    fireEvent.click(within(quickActions).getByRole("button", { name: /^redo$/i }));
    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();
  });

  it("saves local draft with copied object and restores it after relogin", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    const canvasTab = screen.getByRole("button", { name: /^canvas$/i });
    fireEvent.click(canvasTab);
    await waitFor(() => {
      expect(canvasTab).toHaveAttribute("aria-expanded", "true");
    });
    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));
    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^module$/i }));
    expect(
      await screen.findByRole("button", { name: /save \(local draft\)/i }, { timeout: 5000 })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /save \(local draft\)/i }));

    const draft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    expect(draft).not.toBeNull();
    expect(draft?.source).toBe("local_draft");
    expect(draft?.objects.some((object) => object.tag.endsWith("_COPY"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    const rightSidebarAfterRelog = screen.getByLabelText(/right sidebar/i);
    expect(
      await within(rightSidebarAfterRelog).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();
  });

  it("supports ctrl multi-select from scene object list in all scope", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const rowA = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const rowB = within(rightSidebar).getByRole("button", { name: /plc_table_02/i });

    fireEvent.click(rowA);
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "false");
    });

    fireEvent.click(rowB, { ctrlKey: true });
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "true");
    });
  });

  it("keeps selection scoped to active object type after switching category", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const typeSelector = within(rightSidebar).getByRole("combobox", {
      name: /object type selector/i
    });
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const creatureRow = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });

    fireEvent.click(placeableRow);
    fireEvent.click(creatureRow, { ctrlKey: true });
    await waitFor(() => {
      expect(placeableRow).toHaveAttribute("aria-selected", "true");
      expect(creatureRow).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.change(typeSelector, { target: { value: "placeables" } });
    fireEvent.change(typeSelector, { target: { value: "all" } });

    const placeableRowAfter = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const creatureRowAfter = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });
    await waitFor(() => {
      expect(placeableRowAfter).toHaveAttribute("aria-selected", "true");
      expect(creatureRowAfter).toHaveAttribute("aria-selected", "false");
    });
  });

  it("toggles off selected object when ctrl-clicking it again from scene list", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const rowA = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const rowB = within(rightSidebar).getByRole("button", { name: /plc_table_02/i });

    fireEvent.click(rowA);
    fireEvent.click(rowB, { ctrlKey: true });
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.click(rowB, { ctrlKey: true });
    await waitFor(() => {
      expect(rowA).toHaveAttribute("aria-selected", "true");
      expect(rowB).toHaveAttribute("aria-selected", "false");
    });
  });

  it("exposes draggable add-panel rows and sets payload mime key on dragstart", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const leftSidebar = screen.getByLabelText(/left sidebar/i);
    const addObjectsSection = within(leftSidebar).getByRole("article", {
      name: /add objects section/i
    });

    const dragRows = Array.from(
      addObjectsSection.querySelectorAll('[draggable="true"]')
    ) as HTMLElement[];
    expect(dragRows.length).toBeGreaterThan(0);

    const setData = vi.fn();
    fireEvent.dragStart(dragRows[0], {
      dataTransfer: { setData, effectAllowed: "" }
    });

    expect(setData).toHaveBeenCalled();
    const firstCallMimeKey = String(setData.mock.calls[0]?.[0] ?? "");
    expect(firstCallMimeKey).toBe(OBJECT_ADD_DRAG_MIME);
  });

  it("opens keyboard shortcuts with '?' and closes with Escape", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(await screen.findByRole("button", { name: /shortcuts/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "?", code: "Slash", shiftKey: true });
    fireEvent.keyDown(window, { key: "?", code: "Slash", shiftKey: true });
    expect(
      await screen.findByRole("dialog", { name: /keyboard shortcuts/i }, { timeout: 5000 })
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("saves local draft using Ctrl+S keyboard shortcut", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    await screen.findByLabelText(/right sidebar/i);

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(loadLocalSceneDraft("u_builder_001", window.localStorage)).not.toBeNull();
    });
    expect(loadLocalSceneDraft("u_builder_001", window.localStorage)?.source).toBe("local_draft");
  });

  it("recovers local draft save when storage root payload is malformed", async () => {
    window.localStorage.setItem("aurora-web.local-area-drafts.v1", "123");
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    await screen.findByLabelText(/right sidebar/i);

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(loadLocalSceneDraft("u_builder_001", window.localStorage)).not.toBeNull();
    });
    expect(loadLocalSceneDraft("u_builder_001", window.localStorage)?.source).toBe("local_draft");
  });

  it("supports undo and redo through keyboard shortcuts after copy", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    await openCanvasCommands();
    fireEvent.click(screen.getByRole("button", { name: /copy sel/i }));

    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01_copy/i })
      ).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(
      await within(rightSidebar).findByRole("button", {
        name: /plc_barrel_01_copy/i
      })
    ).toBeInTheDocument();
  });

  it("cuts selected object with Ctrl+X and pastes it back with Ctrl+V", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    fireEvent.keyDown(window, { key: "x", ctrlKey: true });
    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01/i })
      ).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(
      await within(rightSidebar).findByRole("button", { name: /plc_barrel_01/i })
    ).toBeInTheDocument();
  });

  it("moves selected placeable with arrows and blocks movement for mixed selection with doors", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const placeableRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    const doorRow = within(rightSidebar).getByRole("button", { name: /door_west_01/i });

    fireEvent.click(placeableRow);
    fireEvent.contextMenu(placeableRow, { clientX: 256, clientY: 194 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
    const propertiesDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
    const staticCheckbox = within(propertiesDialog).getByRole("checkbox", {
      name: /static/i
    }) as HTMLInputElement;
    if (staticCheckbox.checked) {
      fireEvent.click(staticCheckbox);
    }
    fireEvent.click(within(propertiesDialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const beforeSingleMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const beforePlaceable = beforeSingleMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect(beforePlaceable).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterSingleMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const afterPlaceable = afterSingleMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    expect((afterPlaceable?.x ?? 0) - (beforePlaceable?.x ?? 0)).toBeGreaterThan(0);

    fireEvent.click(doorRow, { ctrlKey: true });
    await waitFor(() => {
      expect(placeableRow).toHaveAttribute("aria-selected", "true");
      expect(doorRow).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const beforeBlockedMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const beforeBlockedPlaceable = beforeBlockedMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const beforeBlockedDoor = beforeBlockedMove?.objects.find((object) => object.tag === "DOOR_WEST_01");
    expect(beforeBlockedPlaceable).toBeDefined();
    expect(beforeBlockedDoor).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    const afterBlockedMove = loadLocalSceneDraft("u_builder_001", window.localStorage);
    const afterBlockedPlaceable = afterBlockedMove?.objects.find((object) => object.tag === "PLC_BARREL_01");
    const afterBlockedDoor = afterBlockedMove?.objects.find((object) => object.tag === "DOOR_WEST_01");
    expect(afterBlockedPlaceable?.x).toBe(beforeBlockedPlaceable?.x);
    expect(afterBlockedPlaceable?.y).toBe(beforeBlockedPlaceable?.y);
    expect(afterBlockedDoor?.x).toBe(beforeBlockedDoor?.x);
    expect(afterBlockedDoor?.y).toBe(beforeBlockedDoor?.y);
  });

  it("duplicates and deletes an object from context menu actions", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    fireEvent.contextMenu(sourceRow, { clientX: 260, clientY: 200 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^duplicate$/i }));

    const copiedRow = await within(rightSidebar).findByRole("button", {
      name: /plc_barrel_01_copy/i
    });
    expect(copiedRow).toBeInTheDocument();

    fireEvent.contextMenu(copiedRow, { clientX: 280, clientY: 220 });
    fireEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));

    await waitFor(() => {
      expect(
        within(rightSidebar).queryByRole("button", { name: /plc_barrel_01_copy/i })
      ).not.toBeInTheDocument();
    });
  });

  it("blocks deleting selected placeable when placeables layer is locked", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const sourceRow = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
    fireEvent.click(sourceRow);

    await openCanvasCommands();
    fireEvent.click(screen.getByRole("button", { name: /lock plc/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete sel/i }));

    expect(
      within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i })
    ).toBeInTheDocument();
  });

  it("persists app style theme across logout/login and reapplies document theme", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    fireEvent.change(screen.getByLabelText(/app style/i), {
      target: { value: "forest-night" }
    });

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-layout-theme")).toBe("forest-night");
    });

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    await openQuickOptionsDialog();
    expect(screen.getByLabelText(/app style/i)).toHaveValue("forest-night");
    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("forest-night");
  });

  it("persists selection box mode across logout/login", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    fireEvent.change(screen.getByLabelText(/selection box mode/i), {
      target: { value: "add" }
    });
    expect(screen.getByLabelText(/selection box mode/i)).toHaveValue("add");

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(await screen.findByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();

    await signInAs("builder.user", "builder123");
    await openQuickOptionsDialog();
    expect(screen.getByLabelText(/selection box mode/i)).toHaveValue("add");
  }, 15000);
});


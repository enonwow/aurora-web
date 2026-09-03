import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { loadLocalSceneDraft } from "../../../src/modules/scene/adapters/localDraftStore";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";
import { seedBuilderWorkspace } from "./seedRegressionWorkspace";

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

async function openToolbarGroup(groupName: RegExp) {
  const tab = screen.getByRole("button", { name: groupName });
  fireEvent.click(tab);
  if (tab.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(tab);
  }
  await waitFor(() => {
    expect(tab).toHaveAttribute("aria-expanded", "true");
  });
}

async function openCanvasCommands() {
  await openToolbarGroup(/^canvas$/i);
  expect(await screen.findByLabelText(/canvas commands/i, {}, { timeout: 5000 })).toBeInTheDocument();
}

async function setPlaceableStaticState(row: HTMLElement, isStatic: boolean) {
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  const propertiesDialog = await screen.findByRole("dialog", { name: /placeable properties/i });
  const staticCheckbox = within(propertiesDialog).getByRole("checkbox", {
    name: /static/i
  }) as HTMLInputElement;
  if (staticCheckbox.checked !== isStatic) {
    fireEvent.click(staticCheckbox);
  }
  fireEvent.click(within(propertiesDialog).getByRole("button", { name: /^ok$/i }));
  await waitFor(() => {
    expect(screen.queryByRole("dialog", { name: /placeable properties/i })).not.toBeInTheDocument();
  });
}

async function saveDraftAndReadPlaceable() {
  fireEvent.keyDown(window, { key: "s", ctrlKey: true });
  await waitFor(() => {
    expect(loadLocalSceneDraft("u_builder_001", window.localStorage)).toBeTruthy();
  });
  const draft = loadLocalSceneDraft("u_builder_001", window.localStorage);
  const placeable = draft?.objects.find((object) => object.tag === "PLC_BARREL_01");
  expect(placeable).toBeDefined();
  return placeable!;
}

describe("Regression smoke: placeable world-move parity", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedBuilderWorkspace();
  });

  it("allows keyboard arrow movement for static placeable", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    await setPlaceableStaticState(row, true);
    fireEvent.click(row);

    const before = await saveDraftAndReadPlaceable();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    const after = await saveDraftAndReadPlaceable();

    const deltaMagnitude = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    expect(deltaMagnitude).toBeGreaterThan(1e-6);
  });

  it("allows movement in World Move mode for static placeable", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    await setPlaceableStaticState(row, true);
    await openCanvasCommands();
    fireEvent.click(screen.getByRole("button", { name: /world move \(1\)/i }));
    fireEvent.click(row);

    const before = await saveDraftAndReadPlaceable();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    const after = await saveDraftAndReadPlaceable();

    const deltaMagnitude = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    expect(deltaMagnitude).toBeGreaterThan(1e-6);
  });

  it("keeps movement enabled after selecting static placeable through context-menu flow", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    await setPlaceableStaticState(row, true);
    const before = await saveDraftAndReadPlaceable();

    fireEvent.contextMenu(row, { clientX: 264, clientY: 204 });
    expect(screen.getByRole("menu", { name: /object context menu/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: /object context menu/i })).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    const after = await saveDraftAndReadPlaceable();
    const deltaMagnitude = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    expect(deltaMagnitude).toBeGreaterThan(1e-6);
  });

  it("allows movement again after disabling static on placeable", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const rightSidebar = screen.getByLabelText(/right sidebar/i);
    const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });

    await setPlaceableStaticState(row, false);
    fireEvent.click(row);

    const before = await saveDraftAndReadPlaceable();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    const after = await saveDraftAndReadPlaceable();

    const deltaMagnitude = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    expect(deltaMagnitude).toBeGreaterThan(1e-6);
  });
});

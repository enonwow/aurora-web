import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft,
} from "../../../src/modules/scene/adapters/localDraftStore";
import { createSeedAreaScene } from "../../../src/modules/scene/domain/sceneFactory";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

const USER_ID = "u_builder_001";

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

async function signInAsBuilder() {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: "builder.user" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "builder123" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
}

function seedExactPlaceableStaticUseableDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) {
    throw new Error("Expected seed Placeable fixture.");
  }
  placeable.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "placeable",
    sourceObjectId: "placeable:0:plc_barrel_01:source",
    sourceIndex: 0,
    placeableStatic: true,
    placeableUseable: false,
  };
  placeable.isStatic = true;
  placeable.placeableProperties.useable = false;
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openPlaceableBasicTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /placeable properties/i });
}

describe("Regression smoke: retained Placeable Static/Useable", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableStaticUseableDraft();
  });

  it("keeps independent native Bytes through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableBasicTab();
    let staticFlag = within(dialog).getByRole("checkbox", { name: /Static/ });
    let useableFlag = within(dialog).getByRole("checkbox", { name: /Useable/ });
    expect(staticFlag).toBeEnabled();
    expect(useableFlag).toBeEnabled();
    expect(staticFlag).toBeChecked();
    expect(useableFlag).not.toBeChecked();

    fireEvent.click(staticFlag);
    fireEvent.click(useableFlag);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => {
      expect(staticFlag).not.toBeChecked();
      expect(useableFlag).toBeChecked();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    staticFlag = within(dialog).getByRole("checkbox", { name: /Static/ });
    useableFlag = within(dialog).getByRole("checkbox", { name: /Useable/ });
    expect(staticFlag).not.toBeChecked();
    expect(useableFlag).toBeChecked();
    fireEvent.click(staticFlag);
    fireEvent.click(useableFlag);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    staticFlag = within(dialog).getByRole("checkbox", { name: /Static/ });
    useableFlag = within(dialog).getByRole("checkbox", { name: /Useable/ });
    expect(staticFlag).not.toBeChecked();
    expect(useableFlag).toBeChecked();
    fireEvent.click(staticFlag);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    expect(within(dialog).getByRole("checkbox", { name: /Static/ })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /Useable/ })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.isStatic).toBe(true);
      expect(placeable?.placeableProperties?.useable).toBe(true);
      expect(placeable?.source?.placeableStatic).toBe(true);
      expect(placeable?.source?.placeableUseable).toBe(false);
    });
  });
});

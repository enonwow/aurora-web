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

function seedExactPlaceableHitPointDraft() {
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
    placeableHitPointState: { hitPoints: 15, currentHitPoints: 45 },
  };
  placeable.placeableProperties.hitPoints = 15;
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openPlaceableBasicTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /placeable properties/i });
}

describe("Regression smoke: retained Placeable HP/CurrentHP", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableHitPointDraft();
  });

  it("keeps editable HP and immutable CurrentHP provenance through the full dialog flow", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableBasicTab();
    let hitPoints = within(dialog).getByLabelText("Hit Points");
    expect(hitPoints).toBeEnabled();
    expect(hitPoints).toHaveValue(15);

    fireEvent.change(hitPoints, { target: { value: "30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(hitPoints).toHaveValue(30));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    hitPoints = within(dialog).getByLabelText("Hit Points");
    expect(hitPoints).toHaveValue(30);
    fireEvent.change(hitPoints, { target: { value: "15" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    hitPoints = within(dialog).getByLabelText("Hit Points");
    expect(hitPoints).toHaveValue(30);
    fireEvent.change(hitPoints, { target: { value: "20" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    expect(within(dialog).getByLabelText("Hit Points")).toHaveValue(20);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties?.hitPoints).toBe(20);
      expect(placeable?.source?.placeableHitPointState).toEqual({
        hitPoints: 15,
        currentHitPoints: 45,
      });
    });
  });
});

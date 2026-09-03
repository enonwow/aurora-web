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

function seedExactPlaceableTemplateResRefDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) {
    throw new Error("Expected seed Placeable fixture.");
  }
  placeable.resRef = "renderer_identity";
  placeable.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "placeable",
    sourceObjectId: "placeable:0:plc_barrel_01:source",
    sourceIndex: 0,
    placeableTemplateResRef: "plc_chest",
  };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    blueprintResRef: "plc_chest",
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openPlaceableAdvancedTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  const dialog = await screen.findByRole("dialog", { name: /placeable properties/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
  return dialog;
}

describe("Regression smoke: retained Placeable TemplateResRef", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableTemplateResRefDraft();
  });

  it("keeps native TemplateResRef independent from renderer identity through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableAdvancedTab();
    let templateResRef = within(dialog).getByLabelText("Blueprint ResRef");
    expect(templateResRef).toBeEnabled();
    expect(templateResRef).toHaveValue("plc_chest");

    fireEvent.change(templateResRef, { target: { value: "plc_chest_alt" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(templateResRef).toHaveValue("plc_chest_alt"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    templateResRef = within(dialog).getByLabelText("Blueprint ResRef");
    expect(templateResRef).toHaveValue("plc_chest_alt");
    fireEvent.change(templateResRef, { target: { value: "plc_cancel" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    templateResRef = within(dialog).getByLabelText("Blueprint ResRef");
    expect(templateResRef).toHaveValue("plc_chest_alt");
    fireEvent.change(templateResRef, { target: { value: "plc_chest_new" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    expect(within(dialog).getByLabelText("Blueprint ResRef")).toHaveValue("plc_chest_new");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.resRef).toBe("renderer_identity");
      expect(placeable?.placeableProperties?.advancedSettings?.blueprintResRef)
        .toBe("plc_chest_new");
      expect(placeable?.source?.placeableTemplateResRef).toBe("plc_chest");
    });
  });
});

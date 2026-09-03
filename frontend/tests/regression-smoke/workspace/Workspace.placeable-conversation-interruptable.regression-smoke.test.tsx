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

function seedExactPlaceableConversationInterruptableDraft() {
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
    placeableConversation: "",
    placeableInterruptable: 1,
  };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    conversation: "",
    noInterrupt: false,
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

describe("Regression smoke: retained Placeable Conversation/Interruptable", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableConversationInterruptableDraft();
  });

  it("keeps exact ResRef and inverse Byte semantics through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableAdvancedTab();
    let conversation = within(dialog).getByLabelText("Conversation");
    let noInterrupt = within(dialog).getByRole("checkbox", { name: "No Interrupt" });
    expect(conversation).toBeEnabled();
    expect(conversation).toHaveValue("");
    expect(conversation).toHaveAttribute("maxLength", "16");
    expect(noInterrupt).toBeEnabled();
    expect(noInterrupt).not.toBeChecked();

    fireEvent.change(conversation, { target: { value: "chest_dialog" } });
    fireEvent.click(noInterrupt);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => {
      expect(conversation).toHaveValue("chest_dialog");
      expect(noInterrupt).toBeChecked();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    conversation = within(dialog).getByLabelText("Conversation");
    noInterrupt = within(dialog).getByRole("checkbox", { name: "No Interrupt" });
    expect(conversation).toHaveValue("chest_dialog");
    expect(noInterrupt).toBeChecked();
    fireEvent.change(conversation, { target: { value: "cancel_dialog" } });
    fireEvent.click(noInterrupt);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    conversation = within(dialog).getByLabelText("Conversation");
    noInterrupt = within(dialog).getByRole("checkbox", { name: "No Interrupt" });
    expect(conversation).toHaveValue("chest_dialog");
    expect(noInterrupt).toBeChecked();
    fireEvent.change(conversation, { target: { value: "" } });
    fireEvent.click(noInterrupt);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    expect(within(dialog).getByLabelText("Conversation")).toHaveValue("");
    expect(within(dialog).getByRole("checkbox", { name: "No Interrupt" })).not.toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties?.advancedSettings).toMatchObject({
        conversation: "",
        noInterrupt: false,
      });
      expect(placeable?.source?.placeableConversation).toBe("");
      expect(placeable?.source?.placeableInterruptable).toBe(1);
    });
  });
});

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
const SOURCE_OBJECT_ID = "item:0:nw_it_mpotion001:source";
const SOURCE_LOCALIZED_STRINGS = {
  localizedName: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
  },
  description: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [],
  },
  identifiedDescription: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "S25vd24gY2hlc3Q=" }],
  },
};

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

function seedExactItemLocalizedStringsDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    itemLocalizedStrings: SOURCE_LOCALIZED_STRINGS,
  };
  item.itemProperties = {
    ...(item.itemProperties ?? {}),
    localizedName: "Chest",
    description: "",
    identifiedDescription: "Known chest",
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openItemDialog(tab: "basic" | "comments") {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /item_chest_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  const dialog = await screen.findByRole("dialog", { name: /item properties/i });
  if (tab === "comments") {
    fireEvent.click(within(dialog).getByRole("button", { name: /^comments$/i }));
  }
  return dialog;
}

describe("Regression smoke: retained ground-item localized strings", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemLocalizedStringsDraft();
  });

  it("preserves per-field CAS source through Apply, Cancel, reopen, OK, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openItemDialog("basic");
    let localizedName = within(dialog).getByLabelText("Localized Name");
    expect(localizedName).toBeEnabled();
    expect(localizedName).toHaveAttribute("maxLength", "256");
    fireEvent.change(localizedName, { target: { value: "Żółć" } });
    expect(localizedName).toHaveValue("Chest");
    const appliedName = "  West Chest  ";
    fireEvent.change(localizedName, { target: { value: appliedName } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(localizedName).toHaveValue(appliedName));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemDialog("comments");
    let description = within(dialog).getByLabelText("Description");
    let identifiedDescription = within(dialog).getByLabelText("Identified Description");
    expect(description).toBeEnabled();
    expect(identifiedDescription).toBeEnabled();
    expect(description).toHaveAttribute("maxLength", "4096");
    expect(identifiedDescription).toHaveAttribute("maxLength", "4096");
    const appliedDescription = "  Unknown west chest  ";
    const appliedIdentifiedDescription = "  Known west chest  ";
    fireEvent.change(description, { target: { value: appliedDescription } });
    fireEvent.change(identifiedDescription, {
      target: { value: appliedIdentifiedDescription },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(description).toHaveValue(appliedDescription));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemDialog("basic");
    localizedName = within(dialog).getByLabelText("Localized Name");
    expect(localizedName).toHaveValue(appliedName);
    fireEvent.click(within(dialog).getByRole("button", { name: /^comments$/i }));
    description = within(dialog).getByLabelText("Description");
    identifiedDescription = within(dialog).getByLabelText("Identified Description");
    expect(description).toHaveValue(appliedDescription);
    expect(identifiedDescription).toHaveValue(appliedIdentifiedDescription);
    fireEvent.change(description, { target: { value: "discarded" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemDialog("comments");
    expect(within(dialog).getByLabelText("Description")).toHaveValue(appliedDescription);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(item?.itemProperties).toMatchObject({
        localizedName: appliedName,
        description: appliedDescription,
        identifiedDescription: appliedIdentifiedDescription,
      });
      expect(item?.source?.itemLocalizedStrings).toEqual(SOURCE_LOCALIZED_STRINGS);
    });
  });
});

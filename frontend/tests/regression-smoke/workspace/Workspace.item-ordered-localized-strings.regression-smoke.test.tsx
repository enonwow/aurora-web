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
const SOURCE_OBJECT_ID = "item:0:item_chest_01:ordered-localized-strings";
const SOURCE_LOCALIZED_STRINGS = {
  localizedName: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [
      { languageId: 42, textBytesBase64: "UmV0YWluZWQ=" },
      { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
      { languageId: 10, textBytesBase64: "U2tyenluaWE=" },
    ],
  },
  description: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [
      { languageId: 0, textBytesBase64: "U3RvcmFnZQ==" },
      { languageId: 11, textBytesBase64: "T3Bpcw==" },
    ],
  },
  identifiedDescription: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [
      { languageId: 0, textBytesBase64: "S25vd24gc3RvcmFnZQ==" },
      { languageId: 10, textBytesBase64: "Um96cG96bmFueSBvcGlz" },
    ],
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

function seedExactItemLocalizedStringDraft() {
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
    localizedNameEntries: [
      { languageId: 42, text: "Retained" },
      { languageId: 0, text: "Chest" },
      { languageId: 10, text: "Skrzynia" },
    ],
    description: "Storage",
    descriptionEntries: [
      { languageId: 0, text: "Storage" },
      { languageId: 11, text: "Opis" },
    ],
    identifiedDescription: "Known storage",
    identifiedDescriptionEntries: [
      { languageId: 0, text: "Known storage" },
      { languageId: 10, text: "Rozpoznany opis" },
    ],
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openItemDialog() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /item_chest_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /item properties/i });
}

describe("Regression smoke: retained Item ordered localized strings", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemLocalizedStringDraft();
  });

  it("keeps all three complete ordered lists through Apply, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openItemDialog();
    fireEvent.change(within(dialog).getByLabelText("Localized Name"), {
      target: { value: "Chest 2" },
    });
    fireEvent.change(within(dialog).getByLabelText("Item Name entry 42"), {
      target: { value: "Retained edited" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move Item Name entry 0 up",
    }));
    fireEvent.change(within(dialog).getByLabelText("New Item Name entry text"), {
      target: { value: "Coffre" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Item Name entry" }));

    fireEvent.click(within(dialog).getByRole("button", { name: /^comments$/i }));
    fireEvent.change(within(dialog).getByLabelText("Item Description entry 11"), {
      target: { value: "Opis 2" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move Item Description entry 11 up",
    }));
    fireEvent.change(within(dialog).getByLabelText("Identified Description"), {
      target: { value: "Known storage 2" },
    });
    fireEvent.change(within(dialog).getByLabelText("Item Identified Description entry 10"), {
      target: { value: "Rozpoznany opis 2" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    await waitFor(() => {
      expect(within(dialog).getByLabelText("Item Description entry 11"))
        .toHaveValue("Opis 2");
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog", {
      name: /item properties/i,
    })).not.toBeInTheDocument());

    dialog = await openItemDialog();
    expect(within(dialog).getByLabelText("Localized Name")).toHaveValue("Chest 2");
    expect(within(dialog).getAllByRole("textbox")
      .filter((input) => input.getAttribute("aria-label")?.startsWith("Item Name entry "))
      .map((input) => input.getAttribute("aria-label")))
      .toEqual([
        "Item Name entry 0",
        "Item Name entry 42",
        "Item Name entry 10",
        "Item Name entry 2",
      ]);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(item?.itemProperties?.localizedNameEntries).toEqual([
        { languageId: 0, text: "Chest 2" },
        { languageId: 42, text: "Retained edited" },
        { languageId: 10, text: "Skrzynia" },
        { languageId: 2, text: "Coffre" },
      ]);
      expect(item?.itemProperties?.descriptionEntries).toEqual([
        { languageId: 11, text: "Opis 2" },
        { languageId: 0, text: "Storage" },
      ]);
      expect(item?.itemProperties?.identifiedDescriptionEntries).toEqual([
        { languageId: 0, text: "Known storage 2" },
        { languageId: 10, text: "Rozpoznany opis 2" },
      ]);
      expect(item?.source?.itemLocalizedStrings).toEqual(SOURCE_LOCALIZED_STRINGS);
    });
  });
});

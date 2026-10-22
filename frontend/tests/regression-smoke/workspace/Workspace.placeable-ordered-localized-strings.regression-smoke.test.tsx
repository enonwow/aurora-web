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

function seedExactPlaceableLocalizedStringDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) throw new Error("Expected seed Placeable fixture.");
  placeable.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "placeable",
    sourceObjectId: "placeable:0:plc_barrel_01:source",
    sourceIndex: 0,
    placeableLocalizedStrings: {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 42, textBytesBase64: "UmV0YWluZWQ=" },
          { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
          { languageId: 10, textBytesBase64: "U2tyenluaWE=" },
        ],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "U3RvcmFnZQ==" },
          { languageId: 11, textBytesBase64: "T3Bpcw==" },
        ],
      },
    },
  };
  placeable.name = "Chest";
  placeable.placeableProperties.localizedName = "Chest";
  placeable.placeableProperties.localizedNameEntries = [
    { languageId: 42, text: "Retained" },
    { languageId: 0, text: "Chest" },
    { languageId: 10, text: "Skrzynia" },
  ];
  placeable.placeableProperties.description = "Storage";
  placeable.placeableProperties.descriptionEntries = [
    { languageId: 0, text: "Storage" },
    { languageId: 11, text: "Opis" },
  ];
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openPlaceableDialog() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /placeable properties/i });
}

describe("Regression smoke: retained Placeable ordered localized strings", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableLocalizedStringDraft();
  });

  it("keeps complete ordered LocName and Description lists through Apply, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableDialog();
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "Chest 2" },
    });
    fireEvent.change(within(dialog).getByLabelText("Placeable Name entry 42"), {
      target: { value: "Retained edited" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move Placeable Name entry 0 up",
    }));
    fireEvent.change(within(dialog).getByLabelText("New Placeable Name entry text"), {
      target: { value: "Coffre" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Add Placeable Name entry",
    }));

    fireEvent.click(within(dialog).getByRole("button", { name: /^description$/i }));
    fireEvent.change(within(dialog).getByLabelText("Placeable Description entry 11"), {
      target: { value: "Opis 2" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move Placeable Description entry 11 up",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    await waitFor(() => {
      expect(within(dialog).getByLabelText("Placeable Description entry 11"))
        .toHaveValue("Opis 2");
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog", {
      name: /placeable properties/i,
    })).not.toBeInTheDocument());

    dialog = await openPlaceableDialog();
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Chest 2");
    expect(within(dialog).getAllByRole("textbox")
      .filter((input) => input.getAttribute("aria-label")?.startsWith("Placeable Name entry "))
      .map((input) => input.getAttribute("aria-label")))
      .toEqual([
        "Placeable Name entry 0",
        "Placeable Name entry 42",
        "Placeable Name entry 10",
        "Placeable Name entry 2",
      ]);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties?.localizedName).toBe("Chest 2");
      expect(placeable?.placeableProperties?.localizedNameEntries).toEqual([
        { languageId: 0, text: "Chest 2" },
        { languageId: 42, text: "Retained edited" },
        { languageId: 10, text: "Skrzynia" },
        { languageId: 2, text: "Coffre" },
      ]);
      expect(placeable?.placeableProperties?.descriptionEntries).toEqual([
        { languageId: 11, text: "Opis 2" },
        { languageId: 0, text: "Storage" },
      ]);
      expect(placeable?.source?.placeableLocalizedStrings?.locName).toEqual({
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 42, textBytesBase64: "UmV0YWluZWQ=" },
          { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
          { languageId: 10, textBytesBase64: "U2tyenluaWE=" },
        ],
      });
    });
  });
});

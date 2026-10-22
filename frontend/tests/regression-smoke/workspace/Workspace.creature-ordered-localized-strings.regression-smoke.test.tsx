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
const SOURCE_OBJECT_ID = "creature:0:crt_devourer_01:ordered-localized-strings";
const SOURCE_LOCALIZED_STRINGS = {
  firstName: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [
      { languageId: 42, textBytesBase64: "TGVnYWN5" },
      { languageId: 0, textBytesBase64: "R3VhcmQ=" },
      { languageId: 10, textBytesBase64: "U3RyYXpuaWs=" },
    ],
  },
  lastName: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "T2Fr" }],
  },
  description: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [
      { languageId: 0, textBytesBase64: "T2xkIGRlc2NyaXB0aW9u" },
      { languageId: 11, textBytesBase64: "U3Rhcnkgb3Bpcw==" },
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

function seedExactCreatureLocalizedStringDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) throw new Error("Expected seed Creature fixture.");
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    creatureLocalizedStrings: SOURCE_LOCALIZED_STRINGS,
  };
  creature.creatureProperties = {
    ...creature.creatureProperties,
    firstName: "Guard",
    firstNameEntries: [
      { languageId: 42, text: "Legacy" },
      { languageId: 0, text: "Guard" },
      { languageId: 10, text: "Straznik" },
    ],
    lastName: "Oak",
    lastNameEntries: [{ languageId: 0, text: "Oak" }],
    description: "Old description",
    descriptionEntries: [
      { languageId: 0, text: "Old description" },
      { languageId: 11, text: "Stary opis" },
    ],
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openCreatureDialog() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 210 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /creature properties/i });
}

describe("Regression smoke: retained Creature ordered localized strings", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactCreatureLocalizedStringDraft();
  });

  it("keeps all three complete ordered lists through Apply, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openCreatureDialog();
    fireEvent.change(within(dialog).getByLabelText("First Name"), {
      target: { value: "Captain" },
    });
    fireEvent.change(within(dialog).getByLabelText("Creature First Name entry 42"), {
      target: { value: "Legacy edited" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move Creature First Name entry 0 up",
    }));
    fireEvent.change(within(dialog).getByLabelText("New Creature First Name entry text"), {
      target: { value: "Capitaine" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Add Creature First Name entry",
    }));

    fireEvent.change(within(dialog).getByLabelText("Last Name"), {
      target: { value: "Stone" },
    });
    fireEvent.change(within(dialog).getByLabelText("Creature Description entry 11"), {
      target: { value: "Opis 2" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move Creature Description entry 11 up",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    await waitFor(() => {
      expect(within(dialog).getByLabelText("Creature Description entry 11"))
        .toHaveValue("Opis 2");
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog", {
      name: /creature properties/i,
    })).not.toBeInTheDocument());

    dialog = await openCreatureDialog();
    expect(within(dialog).getByLabelText("First Name")).toHaveValue("Captain");
    expect(within(dialog).getAllByRole("textbox")
      .filter((input) => input.getAttribute("aria-label")?.startsWith("Creature First Name entry "))
      .map((input) => input.getAttribute("aria-label")))
      .toEqual([
        "Creature First Name entry 0",
        "Creature First Name entry 42",
        "Creature First Name entry 10",
        "Creature First Name entry 2",
      ]);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const creature = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(creature?.creatureProperties?.firstNameEntries).toEqual([
        { languageId: 0, text: "Captain" },
        { languageId: 42, text: "Legacy edited" },
        { languageId: 10, text: "Straznik" },
        { languageId: 2, text: "Capitaine" },
      ]);
      expect(creature?.creatureProperties?.lastNameEntries).toEqual([
        { languageId: 0, text: "Stone" },
      ]);
      expect(creature?.creatureProperties?.descriptionEntries).toEqual([
        { languageId: 11, text: "Opis 2" },
        { languageId: 0, text: "Old description" },
      ]);
      expect(creature?.source?.creatureLocalizedStrings).toEqual(SOURCE_LOCALIZED_STRINGS);
    });
  });
});

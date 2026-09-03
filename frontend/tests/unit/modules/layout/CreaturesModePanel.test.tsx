import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CreatureAppearancePaletteFacade } from "../../../../src/modules/creatures/application/creatureAppearancePaletteFacade";
import { CreaturesModePanel } from "../../../../src/modules/layout/components/CreaturesModePanel";
import type { SceneObject } from "../../../../src/modules/layout/contracts";

function buildCreatureTemplate(): SceneObject {
  return {
    id: "cre_template_auctioneer",
    kind: "creatures",
    name: "Auctioneer",
    resRef: "auctioneer",
    tag: "AUCTIONEER",
    source: {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "cre_auctioneer",
      templateId: "cre_auctioneer"
    },
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    creatureProperties: {
      firstName: "Auctioneer",
      lastName: "",
      race: "Human",
      appearance: "Human",
      phenotype: "Normal",
      gender: "Male",
      description: "",
      challengeRating: 1,
      portraitResRef: "",
      conversation: "",
      noInterrupt: false,
      alignment: "Neutral",
      statistics: {
        abilityScores: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10
        },
        racialModifiers: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0
        },
        saves: {
          fortitudeBase: 0,
          fortitudeBonus: 0,
          reflexBase: 0,
          reflexBonus: 0,
          willBase: 0,
          willBonus: 0
        },
        naturalArmorClass: 0,
        baseArmorClass: 10,
        dexterityBonus: 0,
        sizeModifier: 0,
        baseHitPoints: 8,
        hitPointBonuses: 0,
        currentHitPoints: 8,
        maxHitPoints: 8,
        movementRate: "0"
      },
      appearanceSettings: {
        partBasedAppearance: true,
        head: "1",
        neck: "1",
        torso: "1",
        pelvis: "1",
        rightBicep: "1",
        leftBicep: "1",
        rightForearm: "1",
        leftForearm: "1",
        rightHand: "1",
        leftHand: "1",
        rightThigh: "1",
        leftThigh: "1",
        rightShin: "1",
        leftShin: "1",
        rightFoot: "1",
        leftFoot: "1",
        wings: "0",
        tail: "0",
        colors: {
          skin: "1",
          hair: "1",
          tattoo1: "0",
          tattoo2: "0"
        }
      }
    }
  };
}

describe("CreaturesModePanel", () => {
  it("shows the backend total count instead of only the loaded visible rows", () => {
    const template = buildCreatureTemplate();

    const { rerender } = render(
      <CreaturesModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={1693}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateCreature={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByTitle("Total creatures")).toHaveTextContent("1693");

    rerender(
      <CreaturesModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={1693}
        activeObjectId={template.id}
        searchQuery="auctioneer"
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateCreature={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByTitle("Filtered loaded creatures / total creatures")).toHaveTextContent(
      "1/1693"
    );
  });

  it("creates a creature from the wizard and preserves the selected base render source", () => {
    const onCreateCreature = vi.fn();
    const template = buildCreatureTemplate();

    render(
      <CreaturesModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={1}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateCreature={onCreateCreature}
        isLoading={false}
        loadErrorMessage={null}
        previewErrorMessage={null}
        createSequence={2}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /new creature/i }));
    const wizard = screen.getByRole("form", { name: /creature creation wizard/i });

    fireEvent.click(within(wizard).getByRole("tab", { name: /identity/i }));
    fireEvent.change(within(wizard).getByLabelText("Name"), {
      target: { value: "Custom Auctioneer" }
    });
    fireEvent.change(within(wizard).getByLabelText("ResRef"), {
      target: { value: "custom auctioneer" }
    });
    fireEvent.change(within(wizard).getByLabelText("Tag"), {
      target: { value: "custom auctioneer" }
    });

    fireEvent.click(within(wizard).getByRole("tab", { name: /appearance/i }));
    fireEvent.change(within(wizard).getByLabelText("Head"), {
      target: { value: "22" }
    });
    fireEvent.click(within(wizard).getByRole("button", { name: "Skin row 30" }));
    expect(within(wizard).getByLabelText("Skin")).toHaveValue("30");

    fireEvent.click(within(wizard).getByRole("tab", { name: /stats/i }));
    fireEvent.change(within(wizard).getByLabelText("HP"), {
      target: { value: "36" }
    });
    fireEvent.click(within(wizard).getByLabelText("Plot"));
    fireEvent.click(within(wizard).getByRole("button", { name: /create/i }));

    expect(onCreateCreature).toHaveBeenCalledTimes(1);
    const created = onCreateCreature.mock.calls[0]?.[0] as SceneObject;
    expect(created.name).toBe("Custom Auctioneer");
    expect(created.resRef).toBe("custom_auctionee");
    expect(created.tag).toBe("CUSTOM_AUCTIONEER");
    expect(created.source?.templateId).toBe("cre_auctioneer");
    expect(created.creatureProperties?.appearanceSettings?.head).toBe("22");
    expect(created.creatureProperties?.appearanceSettings?.colors?.skin).toBe("30");
    expect(created.creatureProperties?.statistics?.maxHitPoints).toBe(36);
    expect(created.creatureProperties?.advancedSettings?.plot).toBe(true);
  });

  it("loads and resolves PLT swatches through the injected appearance palette facade", async () => {
    const template = buildCreatureTemplate();
    const ensureLoaded = vi.fn(async () => true);
    const resolveRgba = vi.fn(() => [12, 34, 56, 255] as const);
    const creatureAppearancePaletteFacade: CreatureAppearancePaletteFacade = {
      rowMax: 175,
      queries: {
        ensureLoaded,
        resolveRgba,
      },
    };

    render(
      <CreaturesModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={1}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateCreature={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
        previewErrorMessage={null}
        creatureAppearancePaletteFacade={creatureAppearancePaletteFacade}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /new creature/i }));
    const wizard = screen.getByRole("form", {
      name: /creature creation wizard/i,
    });
    fireEvent.click(within(wizard).getByRole("tab", { name: /appearance/i }));

    await waitFor(() => expect(ensureLoaded).toHaveBeenCalled());
    expect(resolveRgba).toHaveBeenCalledWith(0, 30, 192);
    expect(
      within(wizard).getByRole("button", { name: "Skin row 30" }),
    ).toHaveStyle({ backgroundColor: "rgb(12, 34, 56)" });
  });

  it("diagnoses fallback colors when palette data fails to load", async () => {
    const template = buildCreatureTemplate();
    const creatureAppearancePaletteFacade: CreatureAppearancePaletteFacade = {
      rowMax: 175,
      queries: {
        ensureLoaded: vi.fn(async () => false),
        resolveRgba: vi.fn(() => null),
      },
    };

    render(
      <CreaturesModePanel
        objects={[template]}
        creationBaseObjects={[template]}
        total={1}
        activeObjectId={template.id}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateCreature={vi.fn()}
        isLoading={false}
        loadErrorMessage={null}
        previewErrorMessage={null}
        creatureAppearancePaletteFacade={creatureAppearancePaletteFacade}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /new creature/i }));
    const wizard = screen.getByRole("form", {
      name: /creature creation wizard/i,
    });
    fireEvent.click(within(wizard).getByRole("tab", { name: /appearance/i }));

    await waitFor(() => {
      expect(
        within(wizard).getAllByTitle(
          "Creature appearance palette data is unavailable; fallback colors are active.",
        ),
      ).toHaveLength(4);
    });
    expect(
      within(wizard)
        .getAllByTitle(
          "Creature appearance palette data is unavailable; fallback colors are active.",
        )
        .every((picker) => picker.dataset.paletteState === "fallback"),
    ).toBe(true);
  });

  it("allows deleting wizard-created custom creatures without exposing delete on backend templates", () => {
    const template = buildCreatureTemplate();
    const customCreature: SceneObject = {
      ...template,
      id: "cre_wizard_auctioneer_1694",
      resRef: "auctioneer_1694",
      tag: "AUCTIONEER_1694"
    };
    const onDeleteCreature = vi.fn();

    render(
      <CreaturesModePanel
        objects={[customCreature, template]}
        creationBaseObjects={[template]}
        total={1694}
        activeObjectId={customCreature.id}
        searchQuery="auctioneer"
        onSearchQueryChange={vi.fn()}
        onResetFilters={vi.fn()}
        onObjectClick={vi.fn()}
        onCreateCreature={vi.fn()}
        onDeleteCreature={onDeleteCreature}
        isLoading={false}
        loadErrorMessage={null}
        previewErrorMessage={null}
      />
    );

    expect(screen.getByTitle("Filtered loaded creatures / total creatures")).toHaveTextContent(
      "2/1694"
    );
    const deleteButtons = screen.getAllByRole("button", { name: /delete custom creature/i });
    expect(deleteButtons).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /delete custom creature auctioneer_1694/i }));

    expect(onDeleteCreature).toHaveBeenCalledTimes(1);
    expect(onDeleteCreature).toHaveBeenCalledWith(customCreature);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AreaPropertiesDialog } from "../../../../../../src/modules/layout/components/properties/AreaPropertiesDialog";
import { AuroraAreaEditingPanel } from "../../../../../../src/modules/layout/components/AuroraAreaEditingPanel";
import type { AreaScene } from "../../../../../../src/modules/scene/contracts";
import { effectiveAreaAudioCatalogBundle } from "../../../areas/areaAudioCatalogFixture";
import { effectiveAreaLoadingScreenCatalog } from "../../../areas/areaLoadingScreenCatalogFixture";
import { areaEventScriptCatalogFixture } from "../../../areas/areaEventScriptCatalogFixture";

const editableDraft = {
  comments: " original ",
  commentsState: "editable" as const,
  maxCommentsCodeUnits: 4096 as const,
  eventScripts: {
    onEnter: { value: "", state: "preserve_only" as const },
    onExit: { value: "", state: "preserve_only" as const },
    onHeartbeat: { value: "", state: "preserve_only" as const },
    onUserDefined: { value: "", state: "preserve_only" as const },
  },
  basicIdentity: {
    name: { value: "", state: "preserve_only" as const },
    tag: { value: "", state: "preserve_only" as const },
  },
  advancedFlags: {
    terrainType: {
      value: { interior: false, natural: false, subterranean: false },
      state: "preserve_only" as const,
    },
    playerVsPlayer: { value: 0 as const, state: "preserve_only" as const },
    noRest: { value: false, state: "preserve_only" as const },
    listenCheckModifier: { value: 0, state: "preserve_only" as const },
    spotCheckModifier: { value: 0, state: "preserve_only" as const },
    loadingScreenId: { value: 0, state: "preserve_only" as const },
  },
  moduleStartLocation: {
    value: {
      areaResRef: "",
      x: 0,
      y: 0,
      z: 0,
      directionX: 0,
      directionY: 0,
    },
    state: "preserve_only" as const,
  },
};

describe("AreaPropertiesDialog", () => {
  it("exposes the Aurora-shaped property tabs and commits exact Comments with Apply", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={editableDraft}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Basic",
      "Visual",
      "Audio",
      "Events",
      "Advanced",
      "Comments",
    ]);
    fireEvent.click(screen.getByRole("tab", { name: "Visual" }));
    expect(screen.getAllByText(/preserve-only/u).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));
    fireEvent.change(screen.getByLabelText("Area Comments"), {
      target: { value: " updated\nnote " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onCommit).toHaveBeenCalledWith({
      ...editableDraft,
      comments: " updated\nnote ",
    }, false);
  });

  it("edits only exact existing Area event-script ResRefs", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          eventScripts: {
            ...editableDraft.eventScripts,
            onEnter: { value: "old_enter", state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Events" }));
    expect(screen.getByLabelText("Area On Exit script")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Area On Enter script"), {
      target: { value: "new_enter" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventScripts: expect.objectContaining({
          onEnter: { value: "new_enter", state: "editable" },
        }),
      }),
      true,
    );
  });

  it("offers only NSS-backed module rows and labels NCS presence without claiming compilation", async () => {
    const onCommit = vi.fn();
    const facade = {
      load: vi.fn().mockResolvedValue({ ok: true, value: areaEventScriptCatalogFixture() }),
    };
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          eventScripts: {
            ...editableDraft.eventScripts,
            onEnter: { value: "external_enter", state: "editable" },
          },
        }}
        eventScriptCatalogFacade={facade}
        eventScriptCatalogAccessToken="token"
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Events" }));
    const selector = await screen.findByLabelText("Area On Enter catalog selection");
    expect(facade.load).toHaveBeenCalledWith("token", {
      search: "",
      limit: 200,
      offset: 0,
    });
    expect(selector).toHaveValue("external_enter");
    expect(screen.getByRole("option", { name: "alpha — NSS + NCS; freshness unverified" }))
      .toBeInTheDocument();
    expect(screen.getByRole("option", { name: "beta — NSS only; NCS absent" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /gamma/u })).not.toBeInTheDocument();
    expect(screen.getByRole("note", { name: "Area event-script catalog status" }))
      .toHaveTextContent(/committed module only/iu);
    expect(screen.queryByText(/successfully compiled|current bytecode/iu)).not.toBeInTheDocument();

    fireEvent.change(selector, { target: { value: "alpha" } });
    expect(screen.getByLabelText("Area On Enter script")).toHaveValue("alpha");
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventScripts: expect.objectContaining({
          onEnter: { value: "alpha", state: "editable" },
        }),
      }),
      true,
    );
  });

  it("keeps manual event ResRef editing available when the diagnostic catalog fails", async () => {
    const facade = {
      load: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: "PORT_FAILURE",
          message: "The Area event-script catalog could not be loaded.",
          retryable: true,
        },
      }),
    };
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          eventScripts: {
            ...editableDraft.eventScripts,
            onEnter: { value: "old_enter", state: "editable" },
          },
        }}
        eventScriptCatalogFacade={facade}
        eventScriptCatalogAccessToken="token"
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Events" }));
    expect(await screen.findByRole("alert", {
      name: "Area event-script catalog unavailable",
    })).toHaveTextContent("could not be loaded");
    expect(screen.getByLabelText("Area On Enter script")).toBeEnabled();
  });

  it("edits exact admitted Area Name and Tag without normalization", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          basicIdentity: {
            name: {
              value: " Old Name ",
              state: "editable",
              profile: "multi_entry_inline_ascii",
              entries: [
                { languageId: 3, text: "Nom" },
                { languageId: 0, text: " Old Name " },
              ],
            },
            tag: { value: "OLD_TAG", state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Area Name"), {
      target: { value: " New Name " },
    });
    fireEvent.change(screen.getByLabelText("Area Tag"), {
      target: { value: "NEW_TAG" },
    });
    fireEvent.change(screen.getByLabelText("Area Name entry 3"), {
      target: { value: "Nouveau nom" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        basicIdentity: {
          name: {
            value: " New Name ",
            state: "editable",
            profile: "multi_entry_inline_ascii",
            entries: [
              { languageId: 3, text: "Nouveau nom" },
              { languageId: 0, text: " New Name " },
            ],
          },
          tag: { value: "NEW_TAG", state: "editable" },
        },
      }),
      true,
    );
    expect(screen.getByRole("note", { name: "Area Name localization profile" }))
      .toHaveTextContent(/existing numeric language\/gender identifiers/i);
  });

  it("explicitly removes an alternate Area Name entry and derives a simple profile", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          basicIdentity: {
            name: {
              value: "Old Name",
              state: "editable",
              profile: "multi_entry_inline_ascii",
              entries: [
                { languageId: 3, text: "Nom" },
                { languageId: 0, text: "Old Name" },
              ],
            },
            tag: { value: "OLD_TAG", state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Area Name entry 3" }));
    expect(screen.queryByLabelText("Area Name entry 3")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        basicIdentity: {
          name: {
            value: "Old Name",
            state: "editable",
            profile: "simple_inline_ascii",
            entries: [{ languageId: 0, text: "Old Name" }],
          },
          tag: { value: "OLD_TAG", state: "editable" },
        },
      }),
      true,
    );
  });

  it("explicitly reorders an existing alternate Area Name entry across the default entry", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          basicIdentity: {
            name: {
              value: "Old Name",
              state: "editable",
              profile: "multi_entry_inline_ascii",
              entries: [
                { languageId: 3, text: "Nom" },
                { languageId: 0, text: "Old Name" },
              ],
            },
            tag: { value: "OLD_TAG", state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Move Area Name entry 3 up" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Move Area Name entry 3 down" }));
    expect(screen.getByRole("button", { name: "Move Area Name entry 3 down" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        basicIdentity: {
          name: {
            value: "Old Name",
            state: "editable",
            profile: "multi_entry_inline_ascii",
            entries: [
              { languageId: 0, text: "Old Name" },
              { languageId: 3, text: "Nom" },
            ],
          },
          tag: { value: "OLD_TAG", state: "editable" },
        },
      }),
      true,
    );
  });

  it("adds only a missing verified Area Name entry with nonempty printable-ASCII text", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          basicIdentity: {
            name: {
              value: "Old Name",
              state: "editable",
              profile: "simple_inline_ascii",
              entries: [{ languageId: 0, text: "Old Name" }],
            },
            tag: { value: "OLD_TAG", state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    const addButton = screen.getByRole("button", { name: "Add Area Name entry" });
    expect(addButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Area Name entry to add"), {
      target: { value: "11" },
    });
    expect(screen.getByRole("option", { name: "Polish (Female) — Entry 11" }))
      .toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New Area Name entry text"), {
      target: { value: "Krypta łódzka" },
    });
    expect(addButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("New Area Name entry text"), {
      target: { value: "Krypta" },
    });
    expect(addButton).toBeEnabled();
    fireEvent.click(addButton);

    expect(screen.getByLabelText("Area Name entry 11")).toHaveValue("Krypta");
    expect(screen.queryByRole("option", { name: "Polish (Female) — Entry 11" }))
      .not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        basicIdentity: {
          name: {
            value: "Old Name",
            state: "editable",
            profile: "multi_entry_inline_ascii",
            entries: [
              { languageId: 0, text: "Old Name" },
              { languageId: 11, text: "Krypta" },
            ],
          },
          tag: { value: "OLD_TAG", state: "editable" },
        },
      }),
      true,
    );
  });

  it("edits only admitted exact Area Advanced controls", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          advancedFlags: {
            terrainType: {
              value: { interior: false, natural: true, subterranean: false },
              state: "editable",
            },
            playerVsPlayer: { value: 0, state: "editable" },
            noRest: { value: false, state: "editable" },
            listenCheckModifier: { value: -8, state: "editable" },
            spotCheckModifier: { value: 11, state: "editable" },
            loadingScreenId: { value: 0, state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Area terrain interior"), {
      target: { value: "interior" },
    });
    fireEvent.change(screen.getByLabelText("Area terrain natural"), {
      target: { value: "artificial" },
    });
    fireEvent.change(screen.getByLabelText("Area terrain underground"), {
      target: { value: "underground" },
    });
    fireEvent.change(screen.getByLabelText("Area Player versus Player"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByLabelText("Area No Rest"));
    fireEvent.change(screen.getByLabelText("Area Listen check modifier"), {
      target: { value: "9" },
    });
    fireEvent.change(screen.getByLabelText("Area Spot check modifier"), {
      target: { value: "-12" },
    });
    fireEvent.change(screen.getByLabelText("Area loading screen ID"), {
      target: { value: "65535" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        advancedFlags: {
          terrainType: {
            value: { interior: true, natural: false, subterranean: true },
            state: "editable",
          },
          playerVsPlayer: { value: 3, state: "editable" },
          noRest: { value: true, state: "editable" },
          listenCheckModifier: { value: 9, state: "editable" },
          spotCheckModifier: { value: -12, state: "editable" },
          loadingScreenId: { value: 0xffff, state: "editable" },
        },
      }),
      true,
    );
    expect(screen.getByText(/Other unverified Advanced fields/u)).toBeInTheDocument();
  });

  it("creates, edits, reorders, and removes exact typed Area variables", () => {
    const onCommit = vi.fn();
    const sourceValue = [
      { name: "FIRST", type: "int" as const, value: 1 },
      { name: "SECOND", type: "string" as const, value: "two" },
    ];
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          variables: { value: sourceValue, sourceValue, state: "editable" },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Area variable" }));
    fireEvent.change(screen.getByLabelText("Area variable 3 name"), {
      target: { value: "NEW_FLOAT" },
    });
    fireEvent.change(screen.getByLabelText("Area variable 3 type"), {
      target: { value: "float" },
    });
    fireEvent.change(screen.getByLabelText("Area variable 3 value"), {
      target: { value: "1.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move Area variable 3 up" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Area variable 1" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          value: [
            { name: "NEW_FLOAT", type: "float", value: Math.fround(1.25) },
            { name: "SECOND", type: "string", value: "two" },
          ],
          sourceValue,
          state: "editable",
        },
      }),
      true,
    );
  });

  it("keeps an unadmitted Area VarTable visibly preserve-only", () => {
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          variables: { value: [], state: "preserve_only" },
        }}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    expect(screen.getByRole("button", { name: "Add Area variable" })).toBeDisabled();
    expect(screen.getByText(/exact editable Area VarTable profile/u)).toBeInTheDocument();
  });

  it("edits the complete exact Area audio tuple in native units", () => {
    const onCommit = vi.fn();
    const sourceValue = {
      ambientSoundDayId: 41,
      ambientSoundNightId: 42,
      ambientSoundDayVolume: 101,
      ambientSoundNightVolume: 102,
      environmentAudioId: 7,
      musicBattleId: 13,
      musicDayId: 11,
      musicNightId: 12,
      musicDelayMilliseconds: 3000,
    };
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          audioEnvironment: {
            value: sourceValue,
            sourceValue,
            state: "editable",
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Audio" }));
    fireEvent.change(screen.getByLabelText("Area Ambient Sound, Day Volume"), {
      target: { value: "55" },
    });
    fireEvent.change(screen.getByLabelText("Area Music, Playing Delay (s)"), {
      target: { value: "-4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        audioEnvironment: {
          value: { ...sourceValue, ambientSoundDayVolume: 55, musicDelayMilliseconds: -4000 },
          sourceValue,
          state: "editable",
        },
      }),
      true,
    );
  });

  it("uses exact effective 2DA rows for six ID selectors and retains an unresolved current row", () => {
    const onCommit = vi.fn();
    const sourceValue = {
      ambientSoundDayId: 41,
      ambientSoundNightId: 99,
      ambientSoundDayVolume: 101,
      ambientSoundNightVolume: 102,
      environmentAudioId: 7,
      musicBattleId: 13,
      musicDayId: 11,
      musicNightId: 12,
      musicDelayMilliseconds: 3000,
    };
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          audioEnvironment: {
            value: sourceValue,
            sourceValue,
            catalogs: effectiveAreaAudioCatalogBundle(),
            state: "editable",
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Audio" }));

    expect(screen.getByLabelText("Area Ambient Sound, Day").tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Unresolved row 99" })).toBeInTheDocument();
    const battle = screen.getByLabelText("Area Music, Battle");
    expect(battle).toHaveTextContent("Boss battle");
    expect(battle).not.toHaveTextContent("Rural day");
    const day = screen.getByLabelText("Area Music, Day");
    expect(day).toHaveTextContent("Rural day");
    expect(day).not.toHaveTextContent("Boss battle");

    fireEvent.change(screen.getByLabelText("Area Ambient Sound, Night"), {
      target: { value: "42" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        audioEnvironment: expect.objectContaining({
          value: { ...sourceValue, ambientSoundNightId: 42 },
        }),
      }),
      true,
    );
  });

  it("rejects an out-of-range Area check modifier before commit", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          advancedFlags: {
            ...editableDraft.advancedFlags,
            listenCheckModifier: { value: 0, state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Area Listen check modifier"), {
      target: { value: "100" },
    });
    expect(screen.getByText(/Listen check modifier must be an integer/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range Area loading-screen Word before commit", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          advancedFlags: {
            ...editableDraft.advancedFlags,
            loadingScreenId: { value: 0, state: "editable" },
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Area loading screen ID"), {
      target: { value: "65536" },
    });
    expect(screen.getByText(/Loading screen ID must be an integer/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("selects only Toolset-admitted loading screens and retains a current row with a missing image", () => {
    const onCommit = vi.fn();
    const catalog = effectiveAreaLoadingScreenCatalog();
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          advancedFlags: {
            ...editableDraft.advancedFlags,
            loadingScreenId: { value: 2, state: "editable" },
          },
          loadingScreenCatalog: catalog,
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    const selector = screen.getByLabelText("Area loading screen ID");
    expect(selector).toHaveValue("2");
    expect(selector).toHaveTextContent("Default");
    expect(selector).toHaveTextContent("City gates");
    expect(selector).toHaveTextContent("Missing image");
    expect(selector).not.toHaveTextContent("Row 3");
    expect(screen.getByText(/loadscreens\.2da.*modules\/current\/loadscreens\.2da/u))
      .toBeInTheDocument();
    expect(screen.getAllByRole("note").some((note) =>
      /selected row 2:\s*image asset is unavailable/iu.test(note.textContent ?? ""),
    )).toBe(true);

    fireEvent.change(selector, { target: { value: "1" } });
    expect(screen.getAllByRole("note").some((note) =>
      /ls_city\.tga.*modules\/current\/ls_city\.tga/iu.test(note.textContent ?? ""),
    )).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        advancedFlags: expect.objectContaining({
          loadingScreenId: { value: 1, state: "editable" },
        }),
        loadingScreenCatalog: catalog,
      }),
      true,
    );
  });

  it("edits the complete admitted module Start Location tuple", () => {
    const onCommit = vi.fn();
    const sourceValue = {
      areaResRef: "crypt01",
      x: 1,
      y: 2,
      z: 3,
      directionX: 0,
      directionY: 1,
    };
    render(
      <AreaPropertiesDialog
        draft={{
          ...editableDraft,
          comments: "",
          commentsState: "preserve_only",
          moduleStartLocation: {
            value: sourceValue,
            sourceValue,
            currentAreaResRef: "crypt01",
            state: "editable",
          },
        }}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Module start X"), {
      target: { value: "12.5" },
    });
    fireEvent.change(screen.getByLabelText("Module start Direction Y"), {
      target: { value: "-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleStartLocation: {
          value: { ...sourceValue, x: 12.5, directionY: -1 },
          sourceValue,
          currentAreaResRef: "crypt01",
          state: "editable",
        },
      }),
      true,
    );
    expect(screen.getByText(/Storage readback is supported/u)).toBeInTheDocument();
  });

  it("keeps absent native Comments visibly preserve-only and non-materializing", () => {
    render(
      <AreaPropertiesDialog
        draft={{ ...editableDraft, comments: "", commentsState: "preserve_only" }}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));

    expect(screen.getByLabelText("Area Comments")).toBeDisabled();
    expect(screen.getByText(/does not contain one exact Comments/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("rejects a pasted NUL target in the dialog before invoking the facade", () => {
    const onCommit = vi.fn();
    render(
      <AreaPropertiesDialog
        draft={editableDraft}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));
    fireEvent.change(screen.getByLabelText("Area Comments"), {
      target: { value: "bad\0note" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("U+0000");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("AuroraAreaEditingPanel Area Properties integration", () => {
  it("routes an exact Comments edit through the application facade and scene mutation", () => {
    const onSceneMutation = vi.fn();
    const source = areaScene(" original ");
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={source}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Area Properties" }));
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));
    fireEvent.change(screen.getByLabelText("Area Comments"), {
      target: { value: " updated exact note " },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSceneMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        sceneId: source.sceneId,
        areaComments: " updated exact note ",
        updatedAtUnixMs: expect.any(Number),
      }),
      null,
      [],
    );
    expect(onSceneMutation.mock.calls[0]?.[0].updatedAtUnixMs).toBeGreaterThan(
      source.updatedAtUnixMs,
    );
  });

  it("routes exact admitted Area Name and Tag edits through the facade", () => {
    const onSceneMutation = vi.fn();
    const source = areaScene(undefined, {
      name: "Old Name",
      nameProfile: "simple_inline_ascii",
      tag: "OLD_TAG",
    });
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={source}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Area Properties" }));
    fireEvent.change(screen.getByLabelText("Area Name"), {
      target: { value: "New Name" },
    });
    fireEvent.change(screen.getByLabelText("Area Tag"), {
      target: { value: "NEW_TAG" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSceneMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        sceneId: source.sceneId,
        areaName: "New Name",
        areaTag: "NEW_TAG",
        areaBasicIdentity: {
          name: "New Name",
          nameProfile: "simple_inline_ascii",
          tag: "NEW_TAG",
        },
        updatedAtUnixMs: expect.any(Number),
      }),
      null,
      [],
    );
  });

  it("routes admitted Area Advanced edits through the application facade", () => {
    const onSceneMutation = vi.fn();
    const source = areaScene(undefined, undefined, {
      terrainType: { interior: false, natural: true, subterranean: false },
      playerVsPlayer: 0,
      noRest: false,
      listenCheckModifier: -8,
      spotCheckModifier: 11,
      loadingScreenId: 0,
    });
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={source}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Area Properties" }));
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Area Player versus Player"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByLabelText("Area No Rest"));
    fireEvent.change(screen.getByLabelText("Area Listen check modifier"), {
      target: { value: "9" },
    });
    fireEvent.change(screen.getByLabelText("Area Spot check modifier"), {
      target: { value: "-12" },
    });
    fireEvent.change(screen.getByLabelText("Area loading screen ID"), {
      target: { value: "65535" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSceneMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        areaAdvancedFlags: {
          terrainType: { interior: false, natural: true, subterranean: false },
          playerVsPlayer: 2,
          noRest: true,
          listenCheckModifier: 9,
          spotCheckModifier: -12,
          loadingScreenId: 0xffff,
        },
        updatedAtUnixMs: expect.any(Number),
      }),
      null,
      [],
    );
  });

  it("routes exact Area variable CRUD through the facade into the scene draft", () => {
    const onSceneMutation = vi.fn();
    const source = {
      ...areaScene(),
      areaVariables: [{ name: "COUNTER", type: "int" as const, value: 1 }],
    };
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={source}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Area Properties" }));
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Area variable 1 value"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSceneMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        areaVariables: [{ name: "COUNTER", type: "int", value: 9 }],
        updatedAtUnixMs: expect.any(Number),
      }),
      null,
      [],
    );
  });

  it("routes the complete module Start Location tuple through the application facade", () => {
    const onSceneMutation = vi.fn();
    const source = {
      ...areaScene(),
      moduleStartLocation: {
        areaResRef: "crypt01",
        x: Math.fround(1),
        y: Math.fround(2),
        z: Math.fround(3),
        directionX: Math.fround(0),
        directionY: Math.fround(1),
      },
      moduleStartLocationTargets: ["crypt01", "otherarea"],
      auroraAreaEditing: {
        state: {
          schemaVersion: 1 as const,
          areaResRef: "crypt01",
          tilesetResRef: "tin01",
          tilesetFingerprint: "tileset-fingerprint",
          width: 1,
          height: 1,
          tiles: [],
          topology: {
            tokenWidth: 0,
            tokenHeight: 0,
            tokens: [],
            cornerWidth: 0,
            cornerHeight: 0,
            heights: [],
          },
          groupInstances: [],
        },
        definition: {
          tilesetResRef: "tin01",
          fingerprint: "tileset-fingerprint",
          transitionRules: [],
          tiles: [],
          groups: [],
        },
        terrainBrush: "",
      },
    } satisfies AreaScene;
    render(
      <AuroraAreaEditingPanel
        accessToken="token"
        scene={source}
        onSceneSelected={vi.fn()}
        onSceneMutation={onSceneMutation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Area Properties" }));
    fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Module start Area"), {
      target: { value: "otherarea" },
    });
    fireEvent.change(screen.getByLabelText("Module start X"), {
      target: { value: "12.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSceneMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleStartLocation: {
          ...source.moduleStartLocation,
          areaResRef: "otherarea",
          x: Math.fround(12.5),
        },
        updatedAtUnixMs: expect.any(Number),
      }),
      null,
      [],
    );
  });
});

function areaScene(
  areaComments?: string,
  areaBasicIdentity?: AreaScene["areaBasicIdentity"],
  areaAdvancedFlags?: AreaScene["areaAdvancedFlags"],
): AreaScene {
  return {
    sceneId: "area_comments_probe",
    areaName: areaBasicIdentity?.name ?? "Comments Probe",
    width: 1,
    height: 1,
    ...(areaComments !== undefined ? { areaComments } : {}),
    ...(areaBasicIdentity !== undefined ? { areaBasicIdentity } : {}),
    ...(areaBasicIdentity?.tag !== undefined ? { areaTag: areaBasicIdentity.tag } : {}),
    ...(areaAdvancedFlags !== undefined ? { areaAdvancedFlags } : {}),
    tiles: [],
    objects: [],
    updatedAtUnixMs: 100,
    source: "aurora_area",
  };
}

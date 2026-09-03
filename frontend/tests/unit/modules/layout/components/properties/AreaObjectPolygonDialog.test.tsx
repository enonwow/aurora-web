import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AreaObjectPolygonDialog } from "../../../../../../src/modules/layout/components/properties/AreaObjectPolygonDialog";
import type {
  SceneEncounterDifficultyCatalog,
  ScenePlaceableFactionCatalog,
} from "../../../../../../src/modules/scene/contracts";

describe("AreaObjectPolygonDialog", () => {
  it("renders ordered native-local points and routes edits through callbacks", () => {
    const onPointChange = vi.fn();
    const onAddPoint = vi.fn();
    const onApply = vi.fn();
    render(
      <AreaObjectPolygonDialog
        dialog={{
          objectId: "trigger-0",
          objectKind: "triggers",
          draft: {
            objectId: "trigger-0",
            objectKind: "triggers",
            tag: "TRIGGER",
            tagControlState: "ACTIVE_NOW",
            points: [
              { x: "0", y: "0", z: "0" },
              { x: "4", y: "0", z: "0" },
              { x: "0", y: "2", z: "0" },
            ],
          },
          validationMessage: null,
          windowX: 10,
          windowY: 12,
          collapsed: false,
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={vi.fn()}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onPointChange={onPointChange}
        onAddPoint={onAddPoint}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={onApply}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Trigger properties" })).toBeInTheDocument();
    expect(screen.getByLabelText("Trigger Tag")).toHaveValue("TRIGGER");
    expect(screen.getByText("ACTIVE_NOW")).toBeInTheDocument();
    expect(screen.getByText(/Aurora native-local units/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Remove point/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Remove point 1" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Point 2 X"), { target: { value: "5.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add point" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onPointChange).toHaveBeenCalledWith(1, "x", "5.5");
    expect(onAddPoint).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenNthCalledWith(1, false);
    expect(onApply).toHaveBeenNthCalledWith(2, true);
  });

  it("exposes validation diagnostics without hiding the editable point list", () => {
    render(
      <AreaObjectPolygonDialog
        dialog={{
          objectId: "encounter-0",
          objectKind: "encounters",
          draft: {
            objectId: "encounter-0",
            objectKind: "encounters",
            points: [
              { x: "0", y: "0", z: "0" },
              { x: "1", y: "1", z: "0" },
              { x: "2", y: "2", z: "0" },
            ],
          },
          validationMessage: "Polygon area must be non-zero.",
          windowX: 10,
          windowY: 12,
          collapsed: false,
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={vi.fn()}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Polygon area must be non-zero.");
    expect(screen.getByLabelText("Point 3 Y")).toHaveValue(2);
  });

  it("routes exact Trigger Tag edits and disables PRESERVE_ONLY storage", () => {
    const onTagChange = vi.fn();
    const { rerender } = render(
      <AreaObjectPolygonDialog
        dialog={triggerDialog("ACTIVE_NOW")}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={onTagChange}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    const active = screen.getByLabelText("Trigger Tag");
    expect(active).toHaveAttribute("maxlength", "32");
    expect(active).toBeEnabled();
    fireEvent.change(active, { target: { value: "  AREA_EXIT  " } });
    expect(onTagChange).toHaveBeenCalledWith("  AREA_EXIT  ");

    rerender(
      <AreaObjectPolygonDialog
        dialog={triggerDialog("PRESERVE_ONLY")}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={onTagChange}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Trigger Tag")).toBeDisabled();
    expect(screen.getByText("PRESERVE_ONLY")).toBeInTheDocument();
  });

  it("renders and routes all retained Trigger event-script ResRefs", () => {
    const onTriggerScriptResRefChange = vi.fn();
    render(
      <AreaObjectPolygonDialog
        dialog={{
          ...triggerDialog("ACTIVE_NOW"),
          draft: {
            ...triggerDialog("ACTIVE_NOW").draft,
            triggerScriptResRefs: {
              onDisarm: "trg_disarm",
              onTrapTriggered: "trg_trapped",
              onClick: "",
              onHeartbeat: "trg_heartbeat",
              onEnter: "trg_enter",
              onExit: "trg_exit",
              onUserDefined: "trg_user",
            },
            triggerScriptResRefsControlState: "ACTIVE_NOW",
          },
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={vi.fn()}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onTriggerScriptResRefChange={onTriggerScriptResRefChange}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Trigger On Click Script");
    expect(input).toBeEnabled();
    expect(input).toHaveAttribute("maxlength", "16");
    fireEvent.change(input, { target: { value: "trg_click" } });
    expect(onTriggerScriptResRefChange).toHaveBeenCalledWith("onClick", "trg_click");
    expect(screen.getByLabelText("Trigger On User Defined Script")).toHaveValue("trg_user");
  });

  it("renders and routes exact raw Trigger transition storage", () => {
    const onTriggerTransitionStorageChange = vi.fn();
    render(
      <AreaObjectPolygonDialog
        dialog={{
          ...triggerDialog("ACTIVE_NOW"),
          draft: {
            ...triggerDialog("ACTIVE_NOW").draft,
            triggerTransitionStorage: {
              linkedTo: "east_gate",
              linkedToFlags: 2,
              loadScreenId: 321,
            },
            triggerTransitionStorageControlState: "ACTIVE_NOW",
          },
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={vi.fn()}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onTriggerTransitionStorageChange={onTriggerTransitionStorageChange}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    const linkedTo = screen.getByLabelText("Trigger Raw LinkedTo");
    expect(linkedTo).toBeEnabled();
    expect(linkedTo).toHaveAttribute("maxlength", "256");
    fireEvent.change(linkedTo, { target: { value: "crypt_exit" } });
    expect(onTriggerTransitionStorageChange).toHaveBeenCalledWith({
      linkedTo: "crypt_exit",
      linkedToFlags: 2,
      loadScreenId: 321,
    });
    expect(screen.getByLabelText("Trigger Raw LinkedToFlags")).toHaveValue(2);
    expect(screen.getByLabelText("Trigger Raw LoadScreenID")).toHaveValue(321);
    expect(screen.getByText(/field meaning is intentionally not inferred/))
      .toBeInTheDocument();
  });

  it("routes exact Encounter Tag edits through the shared identity shell", () => {
    const onTagChange = vi.fn();
    render(
      <AreaObjectPolygonDialog
        dialog={{
          ...triggerDialog("ACTIVE_NOW"),
          objectId: "encounter-0",
          objectKind: "encounters",
          draft: {
            ...triggerDialog("ACTIVE_NOW").draft,
            objectId: "encounter-0",
            objectKind: "encounters",
            tag: "X2_GNOLL001",
          },
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={onTagChange}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Encounter Tag");
    expect(input).toHaveAttribute("maxlength", "32");
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: "  GNOLL_AMBUSH  " } });
    expect(onTagChange).toHaveBeenCalledWith("  GNOLL_AMBUSH  ");
    expect(screen.getByText("ACTIVE_NOW: exact retained Encounter Tag")).toBeInTheDocument();
  });

  it("routes exact Encounter TemplateResRef edits and keeps unsupported storage visible", () => {
    const onTemplateResRefChange = vi.fn();
    const activeDialog = {
      ...triggerDialog("ACTIVE_NOW"),
      objectId: "encounter-0",
      objectKind: "encounters" as const,
      draft: {
        ...triggerDialog("ACTIVE_NOW").draft,
        objectId: "encounter-0",
        objectKind: "encounters" as const,
        templateResRef: "x2_gnoll001",
        templateResRefControlState: "ACTIVE_NOW" as const,
      },
    };
    const common = {
      onToggleCollapsed: vi.fn(),
      onClose: vi.fn(),
      onTagChange: vi.fn(),
      onActiveChange: vi.fn(),
      onPlayerOnlyChange: vi.fn(),
      onResetChange: vi.fn(),
      onResetTimeChange: vi.fn(),
      onSpawnOptionChange: vi.fn(),
      onRespawnsFiniteChange: vi.fn(),
      onRespawnsInfiniteChange: vi.fn(),
      onPointChange: vi.fn(),
      onAddPoint: vi.fn(),
      onRemovePoint: vi.fn(),
      onResetToSource: vi.fn(),
      onApply: vi.fn(),
    };
    const { rerender } = render(
      <AreaObjectPolygonDialog
        dialog={activeDialog}
        {...common}
        onTemplateResRefChange={onTemplateResRefChange}
      />,
    );

    const input = screen.getByLabelText("Encounter Template ResRef");
    expect(input).toBeEnabled();
    expect(input).toHaveValue("x2_gnoll001");
    expect(input).toHaveAttribute("maxlength", "16");
    fireEvent.change(input, { target: { value: "custom_encounter" } });
    expect(onTemplateResRefChange).toHaveBeenCalledWith("custom_encounter");

    rerender(
      <AreaObjectPolygonDialog
        dialog={{
          ...activeDialog,
          draft: {
            ...activeDialog.draft,
            templateResRefControlState: "PRESERVE_ONLY",
          },
        }}
        {...common}
        onTemplateResRefChange={onTemplateResRefChange}
      />,
    );
    expect(screen.getByLabelText("Encounter Template ResRef")).toBeDisabled();
    expect(screen.getByText(/PRESERVE_ONLY: exact retained Encounter TemplateResRef/))
      .toBeInTheDocument();
  });

  it("routes retained Encounter flags, counts, and event scripts and disables PRESERVE_ONLY provenance", () => {
    const onActiveChange = vi.fn();
    const onPlayerOnlyChange = vi.fn();
    const onResetChange = vi.fn();
    const onResetTimeChange = vi.fn();
    const onSpawnOptionChange = vi.fn();
    const onRespawnsFiniteChange = vi.fn();
    const onRespawnsInfiniteChange = vi.fn();
    const onMaximumCreaturesChange = vi.fn();
    const onMinimumCreaturesChange = vi.fn();
    const onScriptResRefChange = vi.fn();
    const onFactionChange = vi.fn();
    const onDifficultyChange = vi.fn();
    const onLocalizedNameChange = vi.fn();
    const activeDialog = {
      ...triggerDialog("ACTIVE_NOW"),
      objectId: "encounter-0",
      objectKind: "encounters" as const,
      draft: {
        ...triggerDialog("ACTIVE_NOW").draft,
        objectId: "encounter-0",
        objectKind: "encounters" as const,
        active: true,
        activeControlState: "ACTIVE_NOW" as const,
        playerOnly: true,
        playerOnlyControlState: "ACTIVE_NOW" as const,
        reset: true,
        resetControlState: "ACTIVE_NOW" as const,
        resetTime: 60,
        resetTimeControlState: "ACTIVE_NOW" as const,
        spawnOption: 0 as const,
        spawnOptionControlState: "ACTIVE_NOW" as const,
        respawns: 4,
        respawnsInfinite: false,
        respawnsControlState: "ACTIVE_NOW" as const,
        respawnsInfiniteControlState: "ACTIVE_NOW" as const,
        creatureCounts: { maxCreatures: 4, recCreatures: 2 },
        creatureCountsControlState: "ACTIVE_NOW" as const,
        scriptResRefs: {
          onEntered: "enc_enter",
          onExit: "enc_exit",
          onExhausted: "",
          onHeartbeat: "enc_heartbeat",
          onUserDefined: "enc_user",
        },
        scriptResRefsControlState: "ACTIVE_NOW" as const,
        factionId: 1,
        factionControlState: "ACTIVE_NOW" as const,
        difficulty: { difficulty: 1, difficultyIndex: 2 },
        difficultyControlState: "ACTIVE_NOW" as const,
        localizedName: "Gnoll Ambush",
        localizedNameControlState: "ACTIVE_NOW" as const,
      },
    };
    const { rerender } = render(
      <AreaObjectPolygonDialog
        dialog={activeDialog}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={vi.fn()}
        onActiveChange={onActiveChange}
        onPlayerOnlyChange={onPlayerOnlyChange}
        onResetChange={onResetChange}
        onResetTimeChange={onResetTimeChange}
        onSpawnOptionChange={onSpawnOptionChange}
        onRespawnsFiniteChange={onRespawnsFiniteChange}
        onRespawnsInfiniteChange={onRespawnsInfiniteChange}
        onMaximumCreaturesChange={onMaximumCreaturesChange}
        onMinimumCreaturesChange={onMinimumCreaturesChange}
        onScriptResRefChange={onScriptResRefChange}
        encounterFactionCatalog={factionCatalog()}
        onFactionChange={onFactionChange}
        encounterDifficultyCatalog={difficultyCatalog()}
        onDifficultyChange={onDifficultyChange}
        onLocalizedNameChange={onLocalizedNameChange}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    const active = screen.getByLabelText("Encounter Active");
    expect(active).toBeChecked();
    expect(active).toBeEnabled();
    fireEvent.click(active);
    expect(onActiveChange).toHaveBeenCalledWith(false);
    const playerOnly = screen.getByLabelText("Encounter Player Triggered Only");
    expect(playerOnly).toBeChecked();
    expect(playerOnly).toBeEnabled();
    fireEvent.click(playerOnly);
    expect(onPlayerOnlyChange).toHaveBeenCalledWith(false);
    const spawnOption = screen.getByLabelText("Encounter Spawn Option");
    expect(spawnOption).toBeEnabled();
    expect(spawnOption).toHaveValue("0");
    expect(screen.getByRole("option", { name: "Continuous" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Single Shot" })).toBeInTheDocument();
    fireEvent.change(spawnOption, { target: { value: "1" } });
    expect(onSpawnOptionChange).toHaveBeenCalledWith(1);
    const reset = screen.getByLabelText("Encounter Reset");
    expect(reset).toBeChecked();
    expect(reset).toBeEnabled();
    fireEvent.click(reset);
    expect(onResetChange).toHaveBeenCalledWith(false);
    const resetTime = screen.getByLabelText("Encounter Reset Time");
    expect(resetTime).toBeEnabled();
    expect(resetTime).toHaveValue(60);
    fireEvent.change(resetTime, { target: { value: "90" } });
    expect(onResetTimeChange).toHaveBeenCalledWith(90);
    const respawns = screen.getByLabelText("Encounter Number of times to respawn");
    expect(respawns).toBeEnabled();
    expect(respawns).toHaveValue(4);
    fireEvent.change(respawns, { target: { value: "9" } });
    expect(onRespawnsFiniteChange).toHaveBeenCalledWith(9);
    const infinite = screen.getByLabelText("Encounter Infinite Respawn");
    expect(infinite).toBeEnabled();
    expect(infinite).not.toBeChecked();
    fireEvent.click(infinite);
    expect(onRespawnsInfiniteChange).toHaveBeenCalledWith(true);
    const maximumCreatures = screen.getByLabelText("Encounter Maximum Creatures");
    expect(maximumCreatures).toBeEnabled();
    expect(maximumCreatures).toHaveValue(4);
    fireEvent.change(maximumCreatures, { target: { value: "6" } });
    expect(onMaximumCreaturesChange).toHaveBeenCalledWith(6);
    const minimumCreatures = screen.getByLabelText("Encounter Minimum Creatures");
    expect(minimumCreatures).toBeEnabled();
    expect(minimumCreatures).toHaveValue(2);
    fireEvent.change(minimumCreatures, { target: { value: "5" } });
    expect(onMinimumCreaturesChange).toHaveBeenCalledWith(5);
    const onEntered = screen.getByLabelText("Encounter On Enter Script");
    expect(onEntered).toBeEnabled();
    expect(onEntered).toHaveValue("enc_enter");
    expect(onEntered).toHaveAttribute("maxlength", "16");
    fireEvent.change(onEntered, { target: { value: "new_enter" } });
    expect(onScriptResRefChange).toHaveBeenCalledWith("onEntered", "new_enter");
    const faction = screen.getByLabelText("Encounter Faction");
    expect(faction).toBeEnabled();
    expect(faction).toHaveValue("1");
    expect(screen.queryByRole("option", { name: "PC" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Defender" })).toBeInTheDocument();
    fireEvent.change(faction, { target: { value: "4" } });
    expect(onFactionChange).toHaveBeenCalledWith(4);
    const difficulty = screen.getByLabelText("Encounter Difficulty");
    expect(difficulty).toBeEnabled();
    expect(difficulty).toHaveValue("2");
    expect(screen.getByRole("option", { name: "Difficulty 4" })).toBeInTheDocument();
    fireEvent.change(difficulty, { target: { value: "4" } });
    expect(onDifficultyChange).toHaveBeenCalledWith(4);
    const localizedName = screen.getByLabelText("Encounter Name");
    expect(localizedName).toBeEnabled();
    expect(localizedName).toHaveValue("Gnoll Ambush");
    expect(localizedName).toHaveAttribute("maxlength", "256");
    fireEvent.change(localizedName, { target: { value: " Night Ambush " } });
    expect(onLocalizedNameChange).toHaveBeenCalledWith(" Night Ambush ");

    rerender(
      <AreaObjectPolygonDialog
        dialog={{
          ...activeDialog,
          draft: {
            ...activeDialog.draft,
            activeControlState: "PRESERVE_ONLY",
            playerOnlyControlState: "PRESERVE_ONLY",
            resetControlState: "PRESERVE_ONLY",
            resetTimeControlState: "PRESERVE_ONLY",
            spawnOptionControlState: "PRESERVE_ONLY",
            respawnsControlState: "PRESERVE_ONLY",
            respawnsInfiniteControlState: "PRESERVE_ONLY",
            creatureCountsControlState: "PRESERVE_ONLY",
            scriptResRefsControlState: "PRESERVE_ONLY",
            factionControlState: "PRESERVE_ONLY",
            difficultyControlState: "PRESERVE_ONLY",
            localizedNameControlState: "PRESERVE_ONLY",
          },
        }}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={vi.fn()}
        onActiveChange={onActiveChange}
        onPlayerOnlyChange={onPlayerOnlyChange}
        onResetChange={onResetChange}
        onResetTimeChange={onResetTimeChange}
        onSpawnOptionChange={onSpawnOptionChange}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onMaximumCreaturesChange={vi.fn()}
        onMinimumCreaturesChange={vi.fn()}
        onScriptResRefChange={onScriptResRefChange}
        encounterFactionCatalog={factionCatalog()}
        onFactionChange={onFactionChange}
        encounterDifficultyCatalog={difficultyCatalog()}
        onDifficultyChange={onDifficultyChange}
        onLocalizedNameChange={onLocalizedNameChange}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Encounter Active")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Player Triggered Only")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Reset")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Reset Time")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Spawn Option")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Number of times to respawn")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Infinite Respawn")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Maximum Creatures")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Minimum Creatures")).toBeDisabled();
    expect(screen.getByLabelText("Encounter On Enter Script")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Faction")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Difficulty")).toBeDisabled();
    expect(screen.getByLabelText("Encounter Name")).toBeDisabled();
    expect(screen.getByText(/PRESERVE_ONLY: exact retained Encounter Active/))
      .toBeInTheDocument();
    expect(screen.getByText(/PRESERVE_ONLY: exact retained Encounter PlayerOnly/))
      .toBeInTheDocument();
    expect(screen.getByText("PRESERVE_ONLY: exact Reset and SpawnOption provenance is unavailable"))
      .toBeInTheDocument();
    expect(screen.getByText("PRESERVE_ONLY: exact ResetTime and SpawnOption provenance is unavailable"))
      .toBeInTheDocument();
  });

  it("routes full ordered Encounter CreatureList CRUD through exact UTC options", () => {
    const onCreatureSingleSpawnChange = vi.fn();
    const onAddCreature = vi.fn();
    const onReplaceCreature = vi.fn();
    const onRemoveCreature = vi.fn();
    const onMoveCreature = vi.fn();
    const blueprint = {
      entryKind: "effective_blueprint" as const,
      sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1" as const,
      templateId: "cre_wolf_alpha",
      resRef: "nw_wolf001",
      appearance: 225,
      challengeRating: Math.fround(2.5),
      sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
      sourceSizeBytes: 2048,
      sourceSha256: "a".repeat(64),
      singleSpawn: false,
    };
    const optionValue = `${blueprint.templateId}|${blueprint.sourceSha256}|${blueprint.sourceObjectKey}`;
    render(
      <AreaObjectPolygonDialog
        dialog={{
          ...triggerDialog("ACTIVE_NOW"),
          objectId: "encounter-0",
          objectKind: "encounters",
          draft: {
            ...triggerDialog("ACTIVE_NOW").draft,
            objectId: "encounter-0",
            objectKind: "encounters",
            creatureListControlState: "ACTIVE_NOW",
            creatureList: [
              {
                entryKind: "retained",
                sourceIndex: 0,
                appearance: 388,
                challengeRating: 1,
                resRef: "nw_gnoll001",
                singleSpawn: false,
              },
              {
                entryKind: "retained",
                sourceIndex: 1,
                appearance: 389,
                challengeRating: 3,
                resRef: "nw_gnoll002",
                singleSpawn: true,
              },
            ],
          },
        }}
        creatureBlueprintOptions={[blueprint]}
        onCreatureSingleSpawnChange={onCreatureSingleSpawnChange}
        onAddCreature={onAddCreature}
        onReplaceCreature={onReplaceCreature}
        onRemoveCreature={onRemoveCreature}
        onMoveCreature={onMoveCreature}
        onToggleCollapsed={vi.fn()}
        onClose={vi.fn()}
        onTagChange={vi.fn()}
        onActiveChange={vi.fn()}
        onPlayerOnlyChange={vi.fn()}
        onResetChange={vi.fn()}
        onResetTimeChange={vi.fn()}
        onSpawnOptionChange={vi.fn()}
        onRespawnsFiniteChange={vi.fn()}
        onRespawnsInfiniteChange={vi.fn()}
        onPointChange={vi.fn()}
        onAddPoint={vi.fn()}
        onRemovePoint={vi.fn()}
        onResetToSource={vi.fn()}
        onApply={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Encounter creature 1 Single Spawn"));
    fireEvent.change(screen.getByLabelText("Add Encounter creature"), {
      target: { value: optionValue },
    });
    fireEvent.change(screen.getByLabelText("Replace Encounter creature 1"), {
      target: { value: optionValue },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move Encounter creature 2 up" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Encounter creature 1" }));

    expect(onCreatureSingleSpawnChange).toHaveBeenCalledWith(0, true);
    expect(onAddCreature).toHaveBeenCalledWith(blueprint);
    expect(onReplaceCreature).toHaveBeenCalledWith(0, blueprint);
    expect(onMoveCreature).toHaveBeenCalledWith(1, -1);
    expect(onRemoveCreature).toHaveBeenCalledWith(0);
    expect(screen.getByText(/complete ordered CreatureList/)).toBeInTheDocument();
  });
});

function triggerDialog(tagControlState: "ACTIVE_NOW" | "PRESERVE_ONLY") {
  return {
    objectId: "trigger-0",
    objectKind: "triggers" as const,
    draft: {
      objectId: "trigger-0",
      objectKind: "triggers" as const,
      tag: "TRIGGER",
      tagControlState,
      points: [
        { x: "0", y: "0", z: "0" },
        { x: "4", y: "0", z: "0" },
        { x: "0", y: "2", z: "0" },
      ],
    },
    validationMessage: null,
    windowX: 10,
    windowY: 12,
    collapsed: false,
  };
}

function factionCatalog(): ScenePlaceableFactionCatalog {
  return {
    descriptor: {
      resourceName: "repute.fac",
      sourceObjectKey: "modules/current/repute.fac",
      sha256: "f".repeat(64),
      sizeBytes: 1889,
      factionCount: 5,
    },
    rows: [
      { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 3, name: "Merchant", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 4, name: "Defender", parentFactionId: 0xffffffff, isGlobal: true },
    ],
  };
}

function difficultyCatalog(): SceneEncounterDifficultyCatalog {
  const values = [-2, -1, 1, 2, 3] as const;
  return {
    schemaVersion: "area-encounter-difficulty-catalog.v1",
    descriptor: {
      resourceName: "encdifficulty.2da",
      sourceObjectKey: "modules/current/encdifficulty.2da",
      sourceLayer: "module",
      sha256: "d".repeat(64),
      sizeBytes: 256,
      rowCount: values.length,
    },
    rows: values.map((value, rowIndex) => ({
      rowIndex,
      strRef: 1000 + rowIndex,
      value,
      displayName: `Difficulty ${rowIndex}`,
      displaySource: "strref" as const,
    })),
  };
}

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
const SOURCE_OBJECT_ID = "encounter:0:x2_gnoll001:source";
const SOURCE_TAG = "X2_GNOLL001";

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

function seedExactEncounterTagDraft() {
  const scene = createSeedAreaScene();
  scene.placeableFactionCatalog = {
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
  scene.encounterDifficultyCatalog = {
    schemaVersion: "area-encounter-difficulty-catalog.v1",
    descriptor: {
      resourceName: "encdifficulty.2da",
      sourceObjectKey: "modules/current/encdifficulty.2da",
      sourceLayer: "module",
      sha256: "d".repeat(64),
      sizeBytes: 256,
      rowCount: 5,
    },
    rows: [-2, -1, 1, 2, 3].map((value, rowIndex) => ({
      rowIndex,
      strRef: 1000 + rowIndex,
      value,
      displayName: `Difficulty ${rowIndex}`,
      displaySource: "strref" as const,
    })),
  };
  const geometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
  scene.objects.push({
    id: "encounter-0",
    kind: "encounters",
    resRef: "x2_gnoll001",
    encounterTemplateResRef: "x2_gnoll001",
    tag: SOURCE_TAG,
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
    },
    polygonGeometry: geometry,
    encounterActive: { activeByte: 1 },
    encounterPlayerOnly: { playerOnlyByte: 1 },
    encounterReset: { resetByte: 1 },
    encounterResetTime: { resetTime: 60 },
    encounterSpawnOption: { spawnOption: 0 },
    encounterRespawns: { respawns: 4 },
    encounterCreatureCounts: { maxCreatures: 4, recCreatures: 2 },
    encounterScriptResRefs: {
      onEntered: "enc_enter",
      onExit: "enc_exit",
      onExhausted: "",
      onHeartbeat: "enc_heartbeat",
      onUserDefined: "enc_user",
    },
    encounterFactionId: 1,
    encounterDifficulty: { difficulty: 1, difficultyIndex: 2 },
    encounterLocalizedName: "Gnoll Ambush",
    encounterProperties: {
      comments: " source encounter note ",
      variables: [
        { name: "counter", type: "int", value: 1 },
        { name: "note", type: "string", value: " source " },
      ],
      creatureList: [
        {
          appearance: 388,
          challengeRating: 1,
          resRef: "nw_gnoll001",
          singleSpawn: false,
        },
        {
          appearance: 389,
          challengeRating: 3,
          resRef: "nw_gnoll002",
          singleSpawn: true,
        },
      ],
      spawnPoints: [
        { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
        { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
      ],
    },
    source: {
      type: "aurora_git",
      areaId: scene.sceneId,
      sourceKind: "encounter",
      sourceObjectId: SOURCE_OBJECT_ID,
      sourceIndex: 0,
      encounterTag: { present: true, value: SOURCE_TAG },
      encounterTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "x2_gnoll001",
      },
      encounterActiveStorage: { activeByte: 1 },
      encounterPlayerOnlyStorage: { playerOnlyByte: 1 },
      encounterResetStorage: { resetByte: 1 },
      encounterResetTimeStorage: { resetTime: 60 },
      encounterSpawnOptionStorage: { spawnOption: 0 },
      encounterRespawnsStorage: { respawns: 4 },
      encounterCreatureCountsStorage: { maxCreatures: 4, recCreatures: 2 },
      encounterScriptResRefsStorage: {
        onEntered: "enc_enter",
        onExit: "enc_exit",
        onExhausted: "",
        onHeartbeat: "enc_heartbeat",
        onUserDefined: "enc_user",
      },
      encounterFaction: {
        expectedValue: 1,
        catalogSha256: "f".repeat(64),
        catalogFactionCount: 5,
      },
      encounterDifficulty: {
        expectedValue: { difficulty: 1, difficultyIndex: 2 },
        catalogSha256: "d".repeat(64),
        catalogRowCount: 5,
      },
      encounterLocalizedNameStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
      },
      encounterEditorComment: " source encounter note ",
      encounterVariables: {
        expectedEntries: [
          { sourceIndex: 0, name: "counter", type: "int", value: 1 },
          { sourceIndex: 1, name: "note", type: "string", value: " source " },
        ],
      },
      encounterCreatureList: {
        expectedEntries: [
          {
            sourceIndex: 0,
            appearance: 388,
            challengeRating: 1,
            resRef: "nw_gnoll001",
            singleSpawnByte: 0,
          },
          {
            sourceIndex: 1,
            appearance: 389,
            challengeRating: 3,
            resRef: "nw_gnoll002",
            singleSpawnByte: 1,
          },
        ],
      },
      encounterSpawnPoints: {
        expectedEntries: [
          {
            sourceIndex: 0,
            nativeX: 22.5,
            nativeY: 45.25,
            nativeZ: 0,
            orientation: 1.5,
          },
          {
            sourceIndex: 1,
            nativeX: -3.75,
            nativeY: 9.5,
            nativeZ: 0.125,
            orientation: -2.25,
          },
        ],
      },
      polygonGeometry: geometry,
    },
  });
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openEncounterProperties() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", {
    name: /x2_gnoll001|gnoll_ambush/i,
  });
  const item = row.closest("li");
  if (!item) throw new Error("Expected retained Encounter row.");
  fireEvent.click(
    within(item).getByRole("button", { name: /open object properties/i }),
  );
  return screen.findByRole("dialog", { name: /encounter properties/i });
}

describe("Regression smoke: retained Encounter identity, spawning, counts, and event scripts", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactEncounterTagDraft();
  });

  it("preserves exact Encounter fields and immutable provenance through Apply, Cancel, reopen, OK, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openEncounterProperties();
    let tag = within(dialog).getByLabelText("Encounter Tag");
    let active = within(dialog).getByLabelText("Encounter Active");
    let playerOnly = within(dialog).getByLabelText("Encounter Player Triggered Only");
    let reset = within(dialog).getByLabelText("Encounter Reset");
    let resetTime = within(dialog).getByLabelText("Encounter Reset Time");
    let spawnOption = within(dialog).getByLabelText("Encounter Spawn Option");
    let respawns = within(dialog).getByLabelText("Encounter Number of times to respawn");
    let respawnsInfinite = within(dialog).getByLabelText("Encounter Infinite Respawn");
    let maximumCreatures = within(dialog).getByLabelText("Encounter Maximum Creatures");
    let minimumCreatures = within(dialog).getByLabelText("Encounter Minimum Creatures");
    let onEntered = within(dialog).getByLabelText("Encounter On Enter Script");
    let faction = within(dialog).getByLabelText("Encounter Faction");
    let difficulty = within(dialog).getByLabelText("Encounter Difficulty");
    let templateResRef = within(dialog).getByLabelText("Encounter Template ResRef");
    let localizedName = within(dialog).getByLabelText("Encounter Name");
    let editorComment = within(dialog).getByLabelText("Encounter Comments");
    let firstVariableValue = within(dialog).getByLabelText("Encounter variable 1 value");
    let firstSingleSpawn = within(dialog).getByLabelText(
      "Encounter creature 1 Single Spawn",
    );
    let firstSpawnOrientation = within(dialog).getByLabelText(
      "Encounter spawn point 1 Orientation",
    );
    expect(tag).toBeEnabled();
    expect(active).toBeEnabled();
    expect(active).toBeChecked();
    expect(playerOnly).toBeEnabled();
    expect(playerOnly).toBeChecked();
    expect(reset).toBeEnabled();
    expect(reset).toBeChecked();
    expect(resetTime).toBeEnabled();
    expect(resetTime).toHaveValue(60);
    expect(spawnOption).toBeEnabled();
    expect(spawnOption).toHaveValue("0");
    expect(respawns).toBeEnabled();
    expect(respawns).toHaveValue(4);
    expect(respawnsInfinite).toBeEnabled();
    expect(respawnsInfinite).not.toBeChecked();
    expect(maximumCreatures).toBeEnabled();
    expect(maximumCreatures).toHaveValue(4);
    expect(minimumCreatures).toBeEnabled();
    expect(minimumCreatures).toHaveValue(2);
    expect(onEntered).toBeEnabled();
    expect(onEntered).toHaveValue("enc_enter");
    expect(faction).toBeEnabled();
    expect(faction).toHaveValue("1");
    expect(difficulty).toBeEnabled();
    expect(difficulty).toHaveValue("2");
    expect(templateResRef).toBeEnabled();
    expect(templateResRef).toHaveValue("x2_gnoll001");
    expect(templateResRef).toHaveAttribute("maxLength", "16");
    expect(localizedName).toBeEnabled();
    expect(localizedName).toHaveValue("Gnoll Ambush");
    expect(localizedName).toHaveAttribute("maxLength", "256");
    expect(editorComment).toBeEnabled();
    expect(editorComment).toHaveValue(" source encounter note ");
    expect(editorComment).toHaveAttribute("maxLength", "4096");
    expect(within(dialog).getByLabelText("Encounter variable 1 name"))
      .toHaveValue("counter");
    expect(firstVariableValue).toHaveValue(1);
    expect(within(dialog).getByLabelText("Encounter variable 2 name"))
      .toHaveValue("note");
    expect(within(dialog).getByLabelText("Encounter variable 2 value"))
      .toHaveValue(" source ");
    expect(firstSingleSpawn).toBeEnabled();
    expect(firstSingleSpawn).not.toBeChecked();
    expect(firstSpawnOrientation).toBeEnabled();
    expect(firstSpawnOrientation).toHaveValue(1.5);
    expect(within(dialog).getByLabelText("Encounter spawn point 2 Native X"))
      .toHaveValue(-3.75);
    expect(within(dialog).getByText(/nw_gnoll001/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: "PC" }))
      .not.toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Defender" }))
      .toBeInTheDocument();
    expect(tag).toHaveAttribute("maxLength", "32");
    expect(within(dialog).getAllByText("ACTIVE_NOW")).toHaveLength(23);
    const appliedValue = "  GNOLL_AMBUSH  ";
    const appliedTemplateResRef = "custom_encounter";
    const appliedName = " Night Ambush ";
    const appliedComment = "  updated encounter note  ";
    fireEvent.change(tag, { target: { value: appliedValue } });
    fireEvent.change(templateResRef, {
      target: { value: appliedTemplateResRef },
    });
    fireEvent.change(localizedName, { target: { value: appliedName } });
    fireEvent.change(editorComment, { target: { value: appliedComment } });
    fireEvent.change(firstVariableValue, { target: { value: "7" } });
    fireEvent.click(firstSingleSpawn);
    fireEvent.change(firstSpawnOrientation, { target: { value: "1.25" } });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Add Encounter spawn point",
    }));
    fireEvent.change(within(dialog).getByLabelText(
      "Encounter spawn point 3 Native X",
    ), { target: { value: "7.5" } });
    fireEvent.change(within(dialog).getByLabelText(
      "Encounter spawn point 3 Native Y",
    ), { target: { value: "-8.25" } });
    fireEvent.change(within(dialog).getByLabelText(
      "Encounter spawn point 3 Native Z",
    ), { target: { value: "0.5" } });
    fireEvent.change(within(dialog).getByLabelText(
      "Encounter spawn point 3 Orientation",
    ), { target: { value: "-2.5" } });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move Encounter spawn point 3 up",
    }));
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Remove Encounter spawn point 3",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Encounter variable" }));
    fireEvent.change(within(dialog).getByLabelText("Encounter variable 3 name"), {
      target: { value: "counter" },
    });
    fireEvent.change(within(dialog).getByLabelText("Encounter variable 3 type"), {
      target: { value: "float" },
    });
    fireEvent.change(within(dialog).getByLabelText("Encounter variable 3 value"), {
      target: { value: "2.5" },
    });
    fireEvent.click(active);
    fireEvent.click(playerOnly);
    fireEvent.change(resetTime, { target: { value: "90" } });
    fireEvent.change(respawns, { target: { value: "9" } });
    fireEvent.click(respawnsInfinite);
    fireEvent.change(maximumCreatures, { target: { value: "1" } });
    expect(minimumCreatures).toHaveValue(1);
    fireEvent.change(minimumCreatures, { target: { value: "6" } });
    expect(maximumCreatures).toHaveValue(6);
    fireEvent.change(maximumCreatures, { target: { value: "7" } });
    fireEvent.change(onEntered, { target: { value: "new_enter" } });
    fireEvent.change(faction, { target: { value: "4" } });
    fireEvent.change(difficulty, { target: { value: "4" } });
    expect(respawns).toBeDisabled();
    expect(respawns).toHaveValue(9);
    fireEvent.click(respawnsInfinite);
    expect(respawns).toBeEnabled();
    expect(respawns).toHaveValue(9);
    fireEvent.click(respawnsInfinite);
    fireEvent.change(spawnOption, { target: { value: "1" } });
    expect(reset).toBeDisabled();
    expect(resetTime).toBeDisabled();
    expect(respawns).toBeDisabled();
    expect(respawnsInfinite).toBeDisabled();
    expect(maximumCreatures).toBeEnabled();
    expect(minimumCreatures).toBeEnabled();
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(tag).toHaveValue(appliedValue));
    expect(active).not.toBeChecked();
    expect(playerOnly).not.toBeChecked();
    expect(reset).toBeChecked();
    expect(resetTime).toBeDisabled();
    expect(resetTime).toHaveValue(90);
    expect(localizedName).toHaveValue(appliedName);
    expect(templateResRef).toHaveValue(appliedTemplateResRef);
    expect(editorComment).toHaveValue(appliedComment);
    expect(within(dialog).getByLabelText("Encounter variable 1 value")).toHaveValue(7);
    expect(within(dialog).getByLabelText("Encounter variable 3 name"))
      .toHaveValue("counter");
    expect(within(dialog).getByLabelText("Encounter variable 3 type"))
      .toHaveValue("float");
    expect(within(dialog).getByLabelText("Encounter variable 3 value"))
      .toHaveValue(2.5);
    expect(within(dialog).getByLabelText("Encounter creature 1 Single Spawn"))
      .toBeChecked();
    expect(within(dialog).getByLabelText("Encounter spawn point 1 Orientation"))
      .toHaveValue(1.25);
    expect(within(dialog).getByLabelText("Encounter spawn point 2 Native X"))
      .toHaveValue(7.5);
    expect(within(dialog).queryByLabelText("Encounter spawn point 3 Native X"))
      .not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openEncounterProperties();
    tag = within(dialog).getByLabelText("Encounter Tag");
    active = within(dialog).getByLabelText("Encounter Active");
    playerOnly = within(dialog).getByLabelText("Encounter Player Triggered Only");
    reset = within(dialog).getByLabelText("Encounter Reset");
    resetTime = within(dialog).getByLabelText("Encounter Reset Time");
    spawnOption = within(dialog).getByLabelText("Encounter Spawn Option");
    respawns = within(dialog).getByLabelText("Encounter Number of times to respawn");
    respawnsInfinite = within(dialog).getByLabelText("Encounter Infinite Respawn");
    maximumCreatures = within(dialog).getByLabelText("Encounter Maximum Creatures");
    minimumCreatures = within(dialog).getByLabelText("Encounter Minimum Creatures");
    onEntered = within(dialog).getByLabelText("Encounter On Enter Script");
    faction = within(dialog).getByLabelText("Encounter Faction");
    difficulty = within(dialog).getByLabelText("Encounter Difficulty");
    templateResRef = within(dialog).getByLabelText("Encounter Template ResRef");
    localizedName = within(dialog).getByLabelText("Encounter Name");
    editorComment = within(dialog).getByLabelText("Encounter Comments");
    firstVariableValue = within(dialog).getByLabelText("Encounter variable 1 value");
    firstSingleSpawn = within(dialog).getByLabelText(
      "Encounter creature 1 Single Spawn",
    );
    firstSpawnOrientation = within(dialog).getByLabelText(
      "Encounter spawn point 1 Orientation",
    );
    expect(tag).toHaveValue(appliedValue);
    expect(active).not.toBeChecked();
    expect(playerOnly).not.toBeChecked();
    expect(spawnOption).toHaveValue("1");
    expect(reset).toBeChecked();
    expect(reset).toBeDisabled();
    expect(resetTime).toBeDisabled();
    expect(resetTime).toHaveValue(90);
    expect(respawnsInfinite).toBeChecked();
    expect(respawns).toHaveValue(0);
    expect(maximumCreatures).toHaveValue(7);
    expect(minimumCreatures).toHaveValue(6);
    expect(onEntered).toHaveValue("new_enter");
    expect(faction).toHaveValue("4");
    expect(difficulty).toHaveValue("4");
    expect(templateResRef).toHaveValue(appliedTemplateResRef);
    expect(localizedName).toHaveValue(appliedName);
    expect(editorComment).toHaveValue(appliedComment);
    expect(firstVariableValue).toHaveValue(7);
    expect(within(dialog).getByLabelText("Encounter variable 3 name"))
      .toHaveValue("counter");
    expect(firstSingleSpawn).toBeChecked();
    expect(firstSpawnOrientation).toHaveValue(1.25);
    expect(within(dialog).getByLabelText("Encounter spawn point 2 Native X"))
      .toHaveValue(7.5);
    fireEvent.change(tag, { target: { value: "DISCARDED" } });
    fireEvent.change(templateResRef, { target: { value: "discarded_enc" } });
    fireEvent.click(active);
    fireEvent.click(playerOnly);
    fireEvent.change(spawnOption, { target: { value: "0" } });
    expect(reset).toBeEnabled();
    fireEvent.change(resetTime, { target: { value: "120" } });
    fireEvent.click(reset);
    fireEvent.change(minimumCreatures, { target: { value: "2" } });
    fireEvent.change(onEntered, { target: { value: "discarded" } });
    fireEvent.change(faction, { target: { value: "2" } });
    fireEvent.change(difficulty, { target: { value: "1" } });
    fireEvent.change(localizedName, { target: { value: "Discarded" } });
    fireEvent.change(editorComment, { target: { value: "Discarded note" } });
    fireEvent.change(firstVariableValue, { target: { value: "99" } });
    fireEvent.click(firstSingleSpawn);
    fireEvent.change(firstSpawnOrientation, { target: { value: "99" } });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Remove Encounter variable 3",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openEncounterProperties();
    expect(within(dialog).getByLabelText("Encounter Tag")).toHaveValue(appliedValue);
    expect(within(dialog).getByLabelText("Encounter Active")).not.toBeChecked();
    expect(within(dialog).getByLabelText("Encounter Player Triggered Only"))
      .not.toBeChecked();
    expect(within(dialog).getByLabelText("Encounter Spawn Option")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Encounter Reset")).toBeChecked();
    expect(within(dialog).getByLabelText("Encounter Reset")).toBeDisabled();
    expect(within(dialog).getByLabelText("Encounter Reset Time")).toHaveValue(90);
    expect(within(dialog).getByLabelText("Encounter Maximum Creatures")).toHaveValue(7);
    expect(within(dialog).getByLabelText("Encounter Minimum Creatures")).toHaveValue(6);
    expect(within(dialog).getByLabelText("Encounter On Enter Script"))
      .toHaveValue("new_enter");
    expect(within(dialog).getByLabelText("Encounter Faction")).toHaveValue("4");
    expect(within(dialog).getByLabelText("Encounter Difficulty")).toHaveValue("4");
    expect(within(dialog).getByLabelText("Encounter Template ResRef"))
      .toHaveValue(appliedTemplateResRef);
    expect(within(dialog).getByLabelText("Encounter Name")).toHaveValue(appliedName);
    expect(within(dialog).getByLabelText("Encounter Comments"))
      .toHaveValue(appliedComment);
    expect(within(dialog).getByLabelText("Encounter variable 1 value")).toHaveValue(7);
    expect(within(dialog).getByLabelText("Encounter variable 3 name"))
      .toHaveValue("counter");
    expect(within(dialog).getByLabelText("Encounter creature 1 Single Spawn"))
      .toBeChecked();
    expect(within(dialog).getByLabelText("Encounter spawn point 1 Orientation"))
      .toHaveValue(1.25);
    expect(within(dialog).getByLabelText("Encounter spawn point 2 Native X"))
      .toHaveValue(7.5);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const encounter = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(encounter?.tag).toBe(appliedValue);
      expect(encounter?.resRef).toBe("x2_gnoll001");
      expect(encounter?.encounterTemplateResRef).toBe(appliedTemplateResRef);
      expect(encounter?.encounterActive).toEqual({ activeByte: 0 });
      expect(encounter?.encounterPlayerOnly).toEqual({ playerOnlyByte: 0 });
      expect(encounter?.encounterReset).toEqual({ resetByte: 1 });
      expect(encounter?.encounterResetTime).toEqual({ resetTime: 90 });
      expect(encounter?.encounterSpawnOption).toEqual({ spawnOption: 1 });
      expect(encounter?.encounterRespawns).toEqual({ respawns: -1 });
      expect(encounter?.encounterCreatureCounts)
        .toEqual({ maxCreatures: 7, recCreatures: 6 });
      expect(encounter?.encounterScriptResRefs).toEqual({
        onEntered: "new_enter",
        onExit: "enc_exit",
        onExhausted: "",
        onHeartbeat: "enc_heartbeat",
        onUserDefined: "enc_user",
      });
      expect(encounter?.encounterFactionId).toBe(4);
      expect(encounter?.encounterDifficulty).toEqual({
        difficulty: 3,
        difficultyIndex: 4,
      });
      expect(encounter?.encounterLocalizedName).toBe(appliedName);
      expect(encounter?.encounterProperties?.comments).toBe(appliedComment);
      expect(encounter?.encounterProperties?.variables).toEqual([
        { name: "counter", type: "int", value: 7 },
        { name: "note", type: "string", value: " source " },
        { name: "counter", type: "float", value: 2.5 },
      ]);
      expect(encounter?.encounterProperties?.creatureList).toEqual([
        {
          entryKind: "retained",
          sourceIndex: 0,
          appearance: 388,
          challengeRating: 1,
          resRef: "nw_gnoll001",
          singleSpawn: true,
        },
        {
          entryKind: "retained",
          sourceIndex: 1,
          appearance: 389,
          challengeRating: 3,
          resRef: "nw_gnoll002",
          singleSpawn: true,
        },
      ]);
      expect(encounter?.encounterProperties?.spawnPoints).toEqual([
        { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.25 },
        { nativeX: 7.5, nativeY: -8.25, nativeZ: 0.5, orientation: -2.5 },
      ]);
      expect(encounter?.source?.encounterTag).toEqual({
        present: true,
        value: SOURCE_TAG,
      });
      expect(encounter?.source?.encounterTemplateResRef).toEqual({
        present: true,
        nativeType: "resref",
        value: "x2_gnoll001",
      });
      expect(encounter?.source?.encounterActiveStorage).toEqual({ activeByte: 1 });
      expect(encounter?.source?.encounterPlayerOnlyStorage)
        .toEqual({ playerOnlyByte: 1 });
      expect(encounter?.source?.encounterResetStorage).toEqual({ resetByte: 1 });
      expect(encounter?.source?.encounterResetTimeStorage).toEqual({ resetTime: 60 });
      expect(encounter?.source?.encounterSpawnOptionStorage).toEqual({ spawnOption: 0 });
      expect(encounter?.source?.encounterRespawnsStorage).toEqual({ respawns: 4 });
      expect(encounter?.source?.encounterCreatureCountsStorage)
        .toEqual({ maxCreatures: 4, recCreatures: 2 });
      expect(encounter?.source?.encounterScriptResRefsStorage).toEqual({
        onEntered: "enc_enter",
        onExit: "enc_exit",
        onExhausted: "",
        onHeartbeat: "enc_heartbeat",
        onUserDefined: "enc_user",
      });
      expect(encounter?.source?.encounterFaction).toEqual({
        expectedValue: 1,
        catalogSha256: "f".repeat(64),
        catalogFactionCount: 5,
      });
      expect(encounter?.source?.encounterDifficulty).toEqual({
        expectedValue: { difficulty: 1, difficultyIndex: 2 },
        catalogSha256: "d".repeat(64),
        catalogRowCount: 5,
      });
      expect(encounter?.source?.encounterLocalizedNameStorage).toEqual({
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
      });
      expect(encounter?.source?.encounterEditorComment)
        .toBe(" source encounter note ");
      expect(encounter?.source?.encounterVariables).toEqual({
        expectedEntries: [
          { sourceIndex: 0, name: "counter", type: "int", value: 1 },
          { sourceIndex: 1, name: "note", type: "string", value: " source " },
        ],
      });
      expect(encounter?.source?.encounterCreatureList).toEqual({
        expectedEntries: [
          {
            sourceIndex: 0,
            appearance: 388,
            challengeRating: 1,
            resRef: "nw_gnoll001",
            singleSpawnByte: 0,
          },
          {
            sourceIndex: 1,
            appearance: 389,
            challengeRating: 3,
            resRef: "nw_gnoll002",
            singleSpawnByte: 1,
          },
        ],
      });
      expect(encounter?.source?.encounterSpawnPoints).toEqual({
        expectedEntries: [
          {
            sourceIndex: 0,
            nativeX: 22.5,
            nativeY: 45.25,
            nativeZ: 0,
            orientation: 1.5,
          },
          {
            sourceIndex: 1,
            nativeX: -3.75,
            nativeY: 9.5,
            nativeZ: 0.125,
            orientation: -2.25,
          },
        ],
      });
    });
  });
});

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({
      x: Math.fround(x),
      y: Math.fround(y),
      z: Math.fround(z),
    })),
  };
}

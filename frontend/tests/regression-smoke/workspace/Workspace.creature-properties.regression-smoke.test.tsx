import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft,
} from "../../../src/modules/scene/adapters/localDraftStore";
import { createSeedAreaScene } from "../../../src/modules/scene/domain/sceneFactory";
import { buildCreaturePropertiesDraft } from "../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

async function signInAs(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: username }
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: password }
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
}

async function openCreaturePropertiesDialog() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const creatureRow = within(rightSidebar).getByRole("button", { name: /crt_devourer_01/i });
  fireEvent.contextMenu(creatureRow, { clientX: 260, clientY: 210 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /creature properties/i });
}

const CREATURE_BODY_BAG_TABLE_SHA256 = "e".repeat(64);
const CREATURE_FACTION_CATALOG_SHA256 = "f".repeat(64);

function exactCreatureFactionDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  scene.placeableFactionCatalog = {
    descriptor: {
      resourceName: "repute.fac",
      sourceObjectKey: "modules/current/repute.fac",
      sha256: CREATURE_FACTION_CATALOG_SHA256,
      sizeBytes: 256,
      factionCount: 3,
    },
    rows: [
      { factionId: 0, name: "Commoner", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 1, name: "Hostile", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 2, name: "Defender", parentFactionId: 0xffff_ffff, isGlobal: true },
    ],
  };
  creature.creatureProperties.advancedSettings = {
    ...(creature.creatureProperties.advancedSettings ?? {}),
    factionId: 1,
    faction: "Hostile",
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureFaction: {
      expectedValue: 1,
      catalogSha256: CREATURE_FACTION_CATALOG_SHA256,
      catalogFactionCount: 3,
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureTemplateResRefDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.resRef = "renderer_identity";
  creature.creatureProperties.advancedSettings = {
    ...(creature.creatureProperties.advancedSettings ?? {}),
    blueprintResRef: "nw_guard",
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:nw_guard:source",
    sourceIndex: 0,
    creatureTemplateResRef: { expectedResRef: "nw_guard" },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureSpecialIdentityStringsDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.advancedSettings = {
    ...(creature.creatureProperties.advancedSettings ?? {}),
    subrace: "Moon Elf",
    deity: "Mystra",
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:nw_guard:source",
    sourceIndex: 0,
    creatureSpecialIdentityStrings: {
      subrace: { expectedValue: "Moon Elf" },
      deity: { expectedValue: "Mystra" },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureScriptResRefsDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.scriptSlots = {
    onHeartbeat: "NW_C2_DEFAULT1",
    onPerception: "",
    onSpellCastAt: "",
    onPhysicalAttacked: "",
    onDamaged: "",
    onDisturbed: "",
    onCombatRoundEnd: "",
    onConversation: "",
    onSpawn: "nw_c2_default9",
    onRested: "",
    onDeath: "",
    onUserDefined: "",
    onBlocked: "presentation_only",
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureScriptResRefs: {
      onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
      onSpawn: { expectedResRef: "nw_c2_default9" },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureDeathRemainsDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  scene.placeableBodyBagCatalog = {
    descriptor: {
      resourceName: "bodybag.2da",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/bodybag.2da",
      sourceLayer: "vanilla",
      sha256: CREATURE_BODY_BAG_TABLE_SHA256,
      sizeBytes: 502,
      rowCount: 3,
    },
    rows: [
      {
        rowIndex: 0,
        label: "default",
        nameStrRef: 6671,
        displayName: "0: Default",
        displaySource: "tlk",
      },
      {
        rowIndex: 1,
        label: "bag",
        nameStrRef: 6672,
        displayName: "1: Bag",
        displaySource: "tlk",
      },
      {
        rowIndex: 2,
        label: "pile",
        nameStrRef: 6673,
        displayName: "2: Pile",
        displaySource: "tlk",
      },
    ],
  };
  creature.creatureProperties.advancedSettings = {
    ...(creature.creatureProperties.advancedSettings ?? {}),
    leavesLootableCorpse: true,
    treasureModelRow: 2,
    corpseDecayTimeSeconds: 12,
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureAdvancedFlags: {
      disarmable: { present: false },
      plot: { present: false },
      immortal: { present: false },
      lootable: { present: true, value: 1 },
      noPermanentDeath: { present: false },
    },
    creatureBodyBag: {
      expectedValue: 2,
      tableSha256: CREATURE_BODY_BAG_TABLE_SHA256,
      tableRowCount: 3,
    },
    creatureDecayTime: { expectedMilliseconds: 12_000 },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function seedBuilderDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.scriptSlots = {
    onHeartbeat: "",
    onPerception: "",
    onSpellCastAt: "",
    onPhysicalAttacked: "",
    onDamaged: "",
    onDisturbed: "",
    onCombatRoundEnd: "",
    onConversation: "",
    onSpawn: "",
    onRested: "",
    onDeath: "",
    onUserDefined: "",
    onBlocked: "",
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureScriptResRefs: {
      onHeartbeat: { expectedResRef: "" },
    },
    creatureLocalizedStrings: {
      firstName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "Q1JUX0RFVk9VUkVSXzAx" }],
      },
      lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
    },
    creatureAdvancedFlags: {
      disarmable: {
        present: true,
        value: creature.creatureProperties.advancedSettings?.disarmable ? 1 : 0,
      },
      plot: {
        present: true,
        value: creature.creatureProperties.advancedSettings?.plot ? 1 : 0,
      },
      immortal: {
        present: true,
        value: creature.creatureProperties.advancedSettings?.immortal ? 1 : 0,
      },
      lootable: {
        present: true,
        value: creature.creatureProperties.advancedSettings?.leavesLootableCorpse ? 1 : 0,
      },
      noPermanentDeath: {
        present: true,
        value: creature.creatureProperties.advancedSettings?.noPermanentDeath ? 1 : 0,
      },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureNameDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.name = "Original First Original Last";
  creature.creatureProperties.firstName = "  Original First  ";
  creature.creatureProperties.lastName = "  Original Last  ";
  creature.creatureProperties.description = "  Original description  ";
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureLocalizedStrings: {
      firstName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "ICBPcmlnaW5hbCBGaXJzdCAg" }],
      },
      lastName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "ICBPcmlnaW5hbCBMYXN0ICA=" }],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "ICBPcmlnaW5hbCBkZXNjcmlwdGlvbiAg" }],
      },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureEquipmentDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const equipment = [
    { sourceIndex: 0, resRef: "nw_sword001", slotMask: 16, dropable: true, pickpocketable: false },
    { sourceIndex: 1, resRef: "nw_helm001", slotMask: 1, dropable: false, pickpocketable: false }
  ];
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureEquippedItems: equipment
  };
  creature.creatureProperties.equippedItems = [
    { ...equipment[1]! },
    { ...equipment[0]! }
  ];
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureTagDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.tag = "  NW_CHICKEN  ";
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureTag: { present: true, value: "  NW_CHICKEN  " }
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureConversationDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.conversation = "Guard_Dialog";
  creature.creatureProperties.noInterrupt = true;
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureConversation: { present: true, value: "Guard_Dialog" },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureEditorCommentDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.comments = "  Aurora source note  ";
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureEditorComment: "  Aurora source note  ",
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureChallengeRatingDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.challengeRating = 11.5;
  creature.creatureProperties.advancedSettings = {
    ...(creature.creatureProperties.advancedSettings ?? {}),
    challengeRatingAdjustment: 3,
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureChallengeRating: {
      present: true,
      nativeType: "float",
      value: 11.5,
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureAbilityScoresDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const draft = buildCreaturePropertiesDraft(creature);
  creature.creatureProperties.statistics = {
    abilityScores: {
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 11,
      charisma: 8,
    },
    racialModifiers: {
      strength: draft.strRacial,
      dexterity: draft.dexRacial,
      constitution: draft.conRacial,
      intelligence: draft.intRacial,
      wisdom: draft.wisRacial,
      charisma: draft.chaRacial,
    },
    saves: {
      fortitudeBase: draft.fortitudeBase,
      fortitudeBonus: draft.fortitudeBonus,
      reflexBase: draft.reflexBase,
      reflexBonus: draft.reflexBonus,
      willBase: draft.willBase,
      willBonus: draft.willBonus,
    },
    naturalArmorClass: draft.naturalArmorClass,
    baseArmorClass: draft.baseArmorClass,
    dexterityBonus: draft.dexterityBonus,
    sizeModifier: draft.sizeModifier,
    baseHitPoints: draft.baseHitPoints,
    hitPointBonuses: draft.hitPointBonuses,
    currentHitPoints: draft.currentHitPoints,
    maxHitPoints: draft.maxHitPoints,
    movementRate: draft.movementRate,
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureAbilityScores: {
      strength: { present: true, nativeType: "byte", value: 15 },
      dexterity: { present: true, nativeType: "byte", value: 12 },
      constitution: { present: true, nativeType: "byte", value: 14 },
      intelligence: { present: false },
      wisdom: { present: true, nativeType: "byte", value: 11 },
      charisma: { present: true, nativeType: "byte", value: 8 },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureHitPointsDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const draft = buildCreaturePropertiesDraft(creature);
  creature.creatureProperties.statistics = {
    abilityScores: {
      strength: draft.strength,
      dexterity: draft.dexterity,
      constitution: 4,
      intelligence: draft.intelligence,
      wisdom: draft.wisdom,
      charisma: draft.charisma,
    },
    racialModifiers: {
      strength: draft.strRacial,
      dexterity: draft.dexRacial,
      constitution: 0,
      intelligence: draft.intRacial,
      wisdom: draft.wisRacial,
      charisma: draft.chaRacial,
    },
    saves: {
      fortitudeBase: draft.fortitudeBase,
      fortitudeBonus: draft.fortitudeBonus,
      reflexBase: draft.reflexBase,
      reflexBonus: draft.reflexBonus,
      willBase: draft.willBase,
      willBonus: draft.willBonus,
    },
    naturalArmorClass: draft.naturalArmorClass,
    baseArmorClass: draft.baseArmorClass,
    dexterityBonus: draft.dexterityBonus,
    sizeModifier: draft.sizeModifier,
    baseHitPoints: 20,
    hitPointBonuses: -15,
    currentHitPoints: 45,
    maxHitPoints: 5,
    movementRate: draft.movementRate,
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureAbilityScores: {
      strength: { present: false },
      dexterity: { present: false },
      constitution: { present: true, nativeType: "byte", value: 4 },
      intelligence: { present: false },
      wisdom: { present: false },
      charisma: { present: false },
    },
    creatureHitPointState: {
      present: true,
      hitPoints: { nativeType: "short", value: 20 },
      currentHitPoints: { nativeType: "short", value: 77 },
      maxHitPoints: { nativeType: "short", value: 88 },
      constitution: { nativeType: "byte", value: 4 },
      race: { nativeType: "byte", value: 1 },
      classLevels: [3, 2],
      featRow40Present: false,
      racialTypes: {
        resourceName: "racialtypes.2da",
        sourceObjectKey: "runtime-source/module/racialtypes.2da",
        sourceLayer: "module",
        sha256: "a".repeat(64),
        sizeBytes: 400,
        rowCount: 3,
        rowIndex: 1,
        constitutionAdjust: 0,
      },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureNaturalArmorClassDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const draft = buildCreaturePropertiesDraft(creature);
  creature.creatureProperties.alignment = "True Neutral";
  creature.creatureProperties.statistics = {
    abilityScores: {
      strength: draft.strength,
      dexterity: draft.dexterity,
      constitution: draft.constitution,
      intelligence: draft.intelligence,
      wisdom: draft.wisdom,
      charisma: draft.charisma,
    },
    racialModifiers: {
      strength: draft.strRacial,
      dexterity: draft.dexRacial,
      constitution: draft.conRacial,
      intelligence: draft.intRacial,
      wisdom: draft.wisRacial,
      charisma: draft.chaRacial,
    },
    saves: {
      fortitudeBase: draft.fortitudeBase,
      fortitudeBonus: draft.fortitudeBonus,
      reflexBase: draft.reflexBase,
      reflexBonus: draft.reflexBonus,
      willBase: draft.willBase,
      willBonus: draft.willBonus,
    },
    naturalArmorClass: 0,
    baseArmorClass: draft.baseArmorClass,
    dexterityBonus: draft.dexterityBonus,
    sizeModifier: draft.sizeModifier,
    baseHitPoints: draft.baseHitPoints,
    hitPointBonuses: draft.hitPointBonuses,
    currentHitPoints: draft.currentHitPoints,
    maxHitPoints: draft.maxHitPoints,
    movementRate: draft.movementRate,
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureNaturalArmorClass: {
      present: true,
      nativeType: "byte",
      value: 0,
    },
    creatureSavingThrowBonuses: {
      fortitude: { present: true, nativeType: "short", value: draft.fortitudeBonus },
      reflex: { present: true, nativeType: "short", value: draft.reflexBonus },
      will: { present: false },
    },
    creatureAlignment: {
      goodEvil: { present: true, nativeType: "byte", value: 50 },
      lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureInterruptableDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.noInterrupt = false;
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureInterruptable: { present: true, value: 1 },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureAppearanceDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const table = {
    resourceName: "appearance.2da" as const,
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
    sourceLayer: "vanilla" as const,
    sha256: "a".repeat(64),
    sizeBytes: 200_000,
    rowCount: 1_000,
    rowIndex: 249,
  };
  creature.creatureProperties.appearanceType = 249;
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureAppearance: {
      present: true,
      nativeType: "word",
      value: 249,
      table,
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreatureGenderDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const table = {
    resourceName: "gender.2da" as const,
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
    sourceLayer: "vanilla" as const,
    sha256: "c".repeat(64),
    sizeBytes: 250,
    rowCount: 5,
    rowIndex: 4,
  };
  creature.creatureProperties.gender = "None";
  creature.creatureProperties.genderId = 4;
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureGender: {
      present: true,
      nativeType: "byte",
      value: 4,
      table,
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreaturePerceptionRangeDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  creature.creatureProperties.advancedSettings = {
    ...creature.creatureProperties.advancedSettings!,
    perceptionRange: "Default",
    perceptionRangeId: 11,
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creaturePerceptionRange: {
      present: true,
      nativeType: "byte",
      value: 11,
      table: {
        resourceName: "ranges.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/ranges.2da",
        sourceLayer: "vanilla",
        sha256: "e".repeat(64),
        sizeBytes: 1220,
        rowCount: 12,
        rowIndex: 11,
      },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function exactCreaturePortraitDraft() {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const descriptor = {
    resourceName: "portraits.2da" as const,
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
    sourceLayer: "vanilla" as const,
    sha256: "f".repeat(64),
    sizeBytes: 100_000,
    rowCount: 16_001,
  };
  creature.creatureProperties.genderId = 0;
  creature.creatureProperties.portraitId = 10;
  creature.creatureProperties.portraitResRef = "po_hm_guard";
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creaturePortrait: {
      present: true,
      nativeType: "word",
      value: 10,
      selectorContext: { genderValue: 0, raceValue: 4 },
      table: { ...descriptor, rowIndex: 10, baseResRef: "po_hm_guard" },
    },
  };
  scene.creaturePortraitCatalog = {
    descriptor,
    rows: [
      { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 },
      { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 },
      { rowIndex: 12, baseResRef: "po_hf_guard", sex: 1, race: 6, plot: 0 },
    ],
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function installCreatureAppearanceCatalogFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/catalog/creatures/appearances?")) {
      const requestUrl = new URL(url, "http://localhost");
      const requestedRowIndex = requestUrl.searchParams.get("rowIndex");
      const rows = [
        { rowIndex: 52, displayName: "Badger", displaySource: "label", label: "Badger" },
        {
          rowIndex: 249,
          displayName: "Dwarf, Male",
          displaySource: "strref",
          strRef: 1234,
          label: "DwarfMale",
        },
      ];
      const items = requestedRowIndex === null
        ? rows
        : rows.filter((row) => row.rowIndex === Number(requestedRowIndex));
      return new Response(JSON.stringify({
        data: {
          resourceName: "appearance.2da",
          sha256: "a".repeat(64),
          rowCount: 1_000,
          items,
          total: items.length,
          limit: Number(requestUrl.searchParams.get("limit") ?? 256),
          offset: Number(requestUrl.searchParams.get("offset") ?? 0),
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function exactCreatureClassSlotDraft(includeReorderSpells = false) {
  const scene = createSeedAreaScene();
  const creature = scene.objects.find((object) => object.kind === "creatures");
  if (!creature?.creatureProperties) {
    throw new Error("Expected seed Creature fixture.");
  }
  const draft = buildCreaturePropertiesDraft(creature);
  creature.creatureProperties.classEntries = [
    { classId: 4, className: "Fighter", level: 3 },
  ];
  creature.creatureProperties.spells = [
    ...(includeReorderSpells ? [{
      spellId: 11,
      classIndex: 0,
      prepared: true,
      name: "Shield",
      spellLevel: 0,
      castingLevel: 3,
      metaMagic: 0,
      flags: 1,
    }, {
      spellId: 12,
      classIndex: 0,
      prepared: true,
      name: "Burning Hands",
      spellLevel: 0,
      castingLevel: 3,
      metaMagic: 2,
      flags: 1,
    }] : []),
    {
      spellId: 42,
      classIndex: 0,
      prepared: true,
      name: "Magic Missile",
      spellLevel: 1,
      castingLevel: 3,
      metaMagic: 0,
      flags: 1,
    },
  ];
  creature.creatureProperties.advancedSettings = {
    ...(creature.creatureProperties.advancedSettings ?? {}),
    startingPackageId: 0,
  };
  creature.creatureProperties.statistics = {
    abilityScores: {
      strength: draft.strength,
      dexterity: draft.dexterity,
      constitution: 14,
      intelligence: draft.intelligence,
      wisdom: draft.wisdom,
      charisma: draft.charisma,
    },
    racialModifiers: {
      strength: draft.strRacial,
      dexterity: draft.dexRacial,
      constitution: 2,
      intelligence: draft.intRacial,
      wisdom: draft.wisRacial,
      charisma: draft.chaRacial,
    },
    saves: {
      fortitudeBase: draft.fortitudeBase,
      fortitudeBonus: draft.fortitudeBonus,
      reflexBase: draft.reflexBase,
      reflexBonus: draft.reflexBonus,
      willBase: draft.willBase,
      willBonus: draft.willBonus,
    },
    naturalArmorClass: draft.naturalArmorClass,
    baseArmorClass: draft.baseArmorClass,
    dexterityBonus: draft.dexterityBonus,
    sizeModifier: draft.sizeModifier,
    baseHitPoints: 10,
    hitPointBonuses: 9,
    currentHitPoints: 7,
    maxHitPoints: 19,
    movementRate: draft.movementRate,
  };
  creature.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "creature",
    sourceObjectId: "creature:0:crt_devourer_01:source",
    sourceIndex: 0,
    creatureClassIdentityState: {
      present: true,
      nativeType: "list",
      structTypeId: 2,
      classNativeType: "int",
      levelNativeType: "short",
      classListGraphSha256: "c".repeat(64),
       entries: [{
         classId: 4,
         level: 3,
         opaqueSiblingFieldCount: 1,
         canonicalSpellListFieldCount: 2,
         spellEntryCount: 3,
         spellLists: [
           {
             listKind: "memorized",
             spellLevel: 0,
             entries: [
               {
                 spellId: 11,
                 spellMetaMagic: 0,
                 spellFlags: 1,
                 opaqueSiblingFieldCount: 0,
               },
               {
                 spellId: 12,
                 spellMetaMagic: 2,
                 spellFlags: 1,
                 opaqueSiblingFieldCount: 1,
               },
             ],
           },
           {
             listKind: "memorized",
             spellLevel: 1,
             entries: [{
               spellId: 42,
               spellMetaMagic: 0,
               spellFlags: 1,
               opaqueSiblingFieldCount: 0,
             }],
           },
         ],
       }],
      classesTable: {
        resourceName: "classes.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 12_000,
        rowCount: 64,
      },
    },
    creatureClassLevelState: {
      present: true,
      nativeType: "list",
      structTypeId: 2,
      classNativeType: "int",
      levelNativeType: "short",
      entries: [{ classId: 4, level: 3, opaqueSiblingFieldCount: 1 }],
    },
    creatureStartingPackage: {
      present: true,
      nativeType: "byte",
      value: 0,
      classIds: [4],
      table: {
        resourceName: "packages.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla",
        sha256: "b".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        rowIndex: 0,
        classId: 4,
      },
    },
    creatureHitPointState: {
      present: true,
      hitPoints: { nativeType: "short", value: 10 },
      currentHitPoints: { nativeType: "short", value: 7 },
      maxHitPoints: { nativeType: "short", value: 19 },
      constitution: { nativeType: "byte", value: 14 },
      race: { nativeType: "byte", value: 1 },
      classLevels: [3],
      featRow40Present: false,
      racialTypes: {
        resourceName: "racialtypes.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/racialtypes.2da",
        sourceLayer: "vanilla",
        sha256: "d".repeat(64),
        sizeBytes: 8_000,
        rowCount: 64,
        rowIndex: 1,
        constitutionAdjust: 2,
      },
    },
  };
  saveLocalSceneDraft("u_builder_001", scene, window.localStorage);
}

function installCreatureClassSlotCatalogFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const requestUrl = new URL(url, "http://localhost");
    if (url.includes("/catalog/creatures/classes?")) {
      const rows = [
        { rowIndex: 4, displayName: "Fighter", displaySource: "strref", nameStrRef: 104 },
        { rowIndex: 5, displayName: "Wizard", displaySource: "strref", nameStrRef: 105 },
      ];
      return new Response(JSON.stringify({
        data: {
          resourceName: "classes.2da",
          sha256: "a".repeat(64),
          rowCount: 64,
          items: rows,
          total: rows.length,
          limit: Number(requestUrl.searchParams.get("limit") ?? 256),
          offset: Number(requestUrl.searchParams.get("offset") ?? 0),
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/catalog/creatures/starting-packages?")) {
      const classIds = (requestUrl.searchParams.get("classIds") ?? "")
        .split(",")
        .filter(Boolean)
        .map(Number);
      const rows = [
        { rowIndex: 0, classId: 4, displayName: "Fighter", displaySource: "strref", nameStrRef: 2_000 },
        { rowIndex: 2, classId: 5, displayName: "Wizard", displaySource: "strref", nameStrRef: 2_002 },
      ].filter((row) => classIds.includes(row.classId));
      return new Response(JSON.stringify({
        data: {
          resourceName: "packages.2da",
          sha256: "b".repeat(64),
          rowCount: 132,
          classIds,
          items: rows,
          total: rows.length,
          limit: Number(requestUrl.searchParams.get("limit") ?? 256),
          offset: Number(requestUrl.searchParams.get("offset") ?? 0),
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function installCreatureGenderCatalogFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/catalog/creatures/genders?")) {
      const requestUrl = new URL(url, "http://localhost");
      const requestedRowIndex = requestUrl.searchParams.get("rowIndex");
      const rows = [
        {
          rowIndex: 0,
          displayName: "Male",
          displaySource: "strref",
          nameStrRef: 156,
          genderToken: "M",
          constant: "GENDER_MALE",
        },
        {
          rowIndex: 4,
          displayName: "None",
          displaySource: "strref",
          nameStrRef: 202,
          genderToken: "N",
          constant: "GENDER_NONE",
        },
      ];
      const items = requestedRowIndex === null
        ? rows
        : rows.filter((row) => row.rowIndex === Number(requestedRowIndex));
      return new Response(JSON.stringify({
        data: {
          resourceName: "gender.2da",
          sha256: "c".repeat(64),
          rowCount: 5,
          items,
          total: items.length,
          limit: Number(requestUrl.searchParams.get("limit") ?? 256),
          offset: Number(requestUrl.searchParams.get("offset") ?? 0),
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function installCreaturePerceptionRangeCatalogFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/catalog/creatures/perception-ranges?")) {
      const requestUrl = new URL(url, "http://localhost");
      const requestedRowIndex = requestUrl.searchParams.get("rowIndex");
      const rows = [
        { rowIndex: 8, displayName: "Short", displaySource: "strref", nameStrRef: 6668 },
        { rowIndex: 9, displayName: "Medium", displaySource: "strref", nameStrRef: 6669 },
        { rowIndex: 10, displayName: "Long", displaySource: "strref", nameStrRef: 6670 },
        { rowIndex: 11, displayName: "Default", displaySource: "strref", nameStrRef: 6671 },
      ];
      const items = requestedRowIndex === null
        ? rows
        : rows.filter((row) => row.rowIndex === Number(requestedRowIndex));
      return new Response(JSON.stringify({
        data: {
          resourceName: "ranges.2da",
          sha256: "e".repeat(64),
          rowCount: 12,
          items,
          total: items.length,
          limit: Number(requestUrl.searchParams.get("limit") ?? 16),
          offset: Number(requestUrl.searchParams.get("offset") ?? 0),
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Regression smoke: creature properties dialog", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens creature properties tabs and persists edits on Apply/OK while cancel reverts transient edits", async () => {
    seedBuilderDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByRole("button", { name: /^basic$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^statistics$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^appearance$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^advanced$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^scripts$/i })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^inventory$/i }));
    expect(within(dialog).getByText("ItemList: PRESERVE_ONLY")).toBeInTheDocument();
    expect(within(dialog).getByText("Equip_ItemList: PRESERVE_ONLY")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: /add nw_cloth022 uti/i })
    ).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^basic$/i }));
    expect(within(dialog).getByText("Tag: PRESERVE_ONLY")).toBeInTheDocument();
    expect(within(dialog).getByText("FirstName: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("LastName: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("Description: PRESERVE_ONLY")).toBeInTheDocument();
    expect(within(dialog).getByText("Race: PRESERVE_ONLY")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /^tag$/i })).toBeDisabled();
    expect(within(dialog).getByRole("textbox", { name: /^description$/i })).toBeDisabled();
    expect(within(dialog).getByRole("combobox", { name: /^race$/i })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: /^statistics$/i }));
    expect(within(dialog).getAllByRole("columnheader", { name: /^bonus$/i }).length).toBeGreaterThan(
      0
    );
    expect(
      within(dialog).queryByRole("spinbutton", { name: /fortitude base/i })
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/fortitude base/i)).toHaveTextContent("0");
    expect(
      within(dialog).getByRole("columnheader", { name: /^ability modifier$/i })
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /total armor class/i })).toHaveValue(20);
    expect(within(dialog).getByRole("spinbutton", { name: /total hit points/i })).toHaveValue(10);

    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByRole("button", { name: /^variables \(\d+\)$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /calculated/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /adjustment/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /^challenge rating$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /sound set/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /^creature perception range$/i }))
      .toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: /^feats$/i }));
    expect(within(dialog).getByRole("combobox", { name: /filter/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /feats selection summary/i })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^spells$/i }));
    expect(within(dialog).getByRole("combobox", { name: /spell level/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: /meta-magic/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /spell selection summary/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /clear class spell list/i })
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /special abilities/i }));
    expect(within(dialog).getByRole("combobox", { name: /filter/i })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("textbox", { name: /special abilities selection summary/i })
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /^basic$/i }));
    fireEvent.change(within(dialog).getByRole("textbox", { name: /first name/i }), {
      target: { value: "Unit Beast" }
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /last name/i }), {
      target: { value: "QA" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^statistics$/i }));
    expect(within(dialog).getByText("Strength: PRESERVE_ONLY")).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: /strength score/i })).toBeDisabled();
    expect(within(dialog).getByRole("spinbutton", { name: /strength racial modifier/i }))
      .toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: /^scripts$/i }));
    fireEvent.change(within(dialog).getByRole("combobox", { name: /onheartbeat/i }), {
      target: { value: "nw_crt_heartbeat" }
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    const immortalCheckbox = within(dialog).getByRole("checkbox", { name: /immortal/i });
    fireEvent.click(immortalCheckbox);

    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(screen.getByRole("dialog", { name: /creature properties/i })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });

    const reopened = await openCreaturePropertiesDialog();
    expect(within(reopened).getByRole("textbox", { name: /first name/i })).toHaveValue("Unit Beast");
    expect(within(reopened).getByRole("textbox", { name: /last name/i })).toHaveValue("QA");
    fireEvent.click(within(reopened).getByRole("button", { name: /^scripts$/i }));
    expect(within(reopened).getByRole("combobox", { name: /onheartbeat/i })).toHaveValue(
      "nw_crt_heartbeat"
    );
    fireEvent.click(within(reopened).getByRole("button", { name: /^advanced$/i }));
    expect(within(reopened).getByRole("checkbox", { name: /immortal/i })).toBeChecked();
    fireEvent.click(within(reopened).getByRole("button", { name: /^statistics$/i }));
    expect(within(reopened).getByRole("spinbutton", { name: /strength score/i })).toHaveValue(10);

    fireEvent.click(within(reopened).getByRole("button", { name: /^basic$/i }));
    fireEvent.change(within(reopened).getByRole("textbox", { name: /first name/i }), {
      target: { value: "Temp Creature Name" }
    });
    fireEvent.click(within(reopened).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });

    const reopenedAfterCancel = await openCreaturePropertiesDialog();
    expect(within(reopenedAfterCancel).getByRole("textbox", { name: /first name/i })).toHaveValue(
      "Unit Beast"
    );
  });

  it("persists retained Creature Equip_ItemList flag edits and removal without exposing slot mutation", async () => {
    exactCreatureEquipmentDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^inventory$/i }));
    expect(within(dialog).getByText("Equip_ItemList: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Equipped item 1 slot mask")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText("Equipped item 1 pickpocketable"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove equipped item 2" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });
    const reopened = await openCreaturePropertiesDialog();
    fireEvent.click(within(reopened).getByRole("button", { name: /^inventory$/i }));
    expect(within(reopened).getByLabelText("Equipped item 1 pickpocketable")).toBeChecked();
    expect(within(reopened).getAllByRole("button", { name: /remove equipped item/i })).toHaveLength(1);
  });

  it("persists an exact retained Creature Tag without trimming and keeps source provenance immutable", async () => {
    exactCreatureTagDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByText("Tag: ACTIVE_NOW")).toBeInTheDocument();
    const tagInput = within(dialog).getByRole("textbox", { name: /^tag$/i });
    expect(tagInput).toHaveValue("  NW_CHICKEN  ");

    fireEvent.change(tagInput, { target: { value: "  RENAMED CREATURE  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });
    const reopened = await openCreaturePropertiesDialog();
    expect(within(reopened).getByText("Tag: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(reopened).getByRole("textbox", { name: /^tag$/i })).toHaveValue(
      "  RENAMED CREATURE  "
    );
  });

  it("roundtrips exact Creature GIC Comments through Apply, Cancel, reopen, and local Save", async () => {
    exactCreatureEditorCommentDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^comments$/i }));
    expect(within(dialog).getByText("Comments: ACTIVE_NOW")).toBeInTheDocument();
    const comments = within(dialog).getByRole("textbox", { name: /^comments$/i });
    expect(comments).toBeEnabled();
    expect(comments).toHaveAttribute("maxlength", "4096");
    expect(comments).toHaveValue("  Aurora source note  ");

    fireEvent.change(comments, { target: { value: "  changed\ne\u0301  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^comments$/i }));
    expect(within(dialog).getByRole("textbox", { name: /^comments$/i }))
      .toHaveValue("  changed\ne\u0301  ");
    fireEvent.change(within(dialog).getByRole("textbox", { name: /^comments$/i }), {
      target: { value: "discarded" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^comments$/i }));
    expect(within(dialog).getByRole("textbox", { name: /^comments$/i }))
      .toHaveValue("  changed\ne\u0301  ");
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const creature = saved?.objects.find((object) => object.kind === "creatures");
      expect(creature?.creatureProperties?.comments).toBe("  changed\ne\u0301  ");
      expect(creature?.source?.creatureEditorComment).toBe("  Aurora source note  ");
    });
  });

  it("persists exact Creature Conversation through Apply, Cancel, reopen, and local Save", async () => {
    exactCreatureConversationDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByText("Conversation: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("No Interrupt: PRESERVE_ONLY")).toBeInTheDocument();
    const conversation = within(dialog).getByRole("textbox", { name: /^conversation$/i });
    expect(conversation).toHaveAttribute("maxlength", "16");
    expect(conversation).toHaveValue("Guard_Dialog");
    expect(within(dialog).getByRole("checkbox", { name: "No Interrupt" }))
      .toBeDisabled();

    fireEvent.change(conversation, { target: { value: "guard_dialog" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByRole("textbox", { name: /^conversation$/i }))
      .toHaveValue("guard_dialog");
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: /^conversation$/i }),
      { target: { value: "cancel_dialog" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByRole("textbox", { name: /^conversation$/i }))
      .toHaveValue("guard_dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const creature = saved?.objects.find((object) => object.kind === "creatures");
      expect(creature?.creatureProperties?.conversation).toBe("guard_dialog");
      expect(creature?.creatureProperties?.noInterrupt).toBe(true);
      expect(creature?.source?.creatureConversation).toEqual({
        present: true,
        value: "Guard_Dialog",
      });
    });
  });

  it("persists exact Creature No Interrupt through Apply, Cancel, reopen, and local Save", async () => {
    exactCreatureInterruptableDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByText("No Interrupt: ACTIVE_NOW")).toBeInTheDocument();
    let noInterrupt = within(dialog).getByRole("checkbox", { name: "No Interrupt" });
    expect(noInterrupt).toBeEnabled();
    expect(noInterrupt).not.toBeChecked();

    fireEvent.click(noInterrupt);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    noInterrupt = within(dialog).getByRole("checkbox", { name: "No Interrupt" });
    expect(noInterrupt).toBeChecked();
    fireEvent.click(noInterrupt);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByRole("checkbox", { name: "No Interrupt" })).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const creature = saved?.objects.find((object) => object.kind === "creatures");
      expect(creature?.creatureProperties?.noInterrupt).toBe(true);
      expect(creature?.source?.creatureInterruptable).toEqual({
        present: true,
        value: 1,
      });
    });
  });

  it("persists a digest-bound admitted Appearance_Type while retaining source provenance", async () => {
    exactCreatureAppearanceDraft();
    const fetchMock = installCreatureAppearanceCatalogFetch();
    expect(
      loadLocalSceneDraft("u_builder_001", window.localStorage)?.objects
        .find((object) => object.kind === "creatures")?.source?.creatureAppearance,
    ).toMatchObject({ present: true, nativeType: "word", value: 249 });
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) =>
        String(input).includes(
          `/catalog/creatures/appearances?tableSha256=${"a".repeat(64)}&limit=256&offset=0`,
        ),
      )).toBe(true);
    });
    await waitFor(() => {
      const currentDialog = screen.getByRole("dialog", { name: /creature properties/i });
      expect(
        within(currentDialog).queryByRole("combobox", { name: "Creature Appearance Type" }) ??
          within(currentDialog).queryByRole("alert") ??
          within(currentDialog).queryByRole("status"),
      ).not.toBeNull();
    });
    dialog = screen.getByRole("dialog", { name: /creature properties/i });
    expect(within(dialog).queryByRole("status")).toBeNull();
    expect(within(dialog).queryByRole("alert")).toBeNull();
    const appearanceType = within(dialog).getByRole("combobox", {
      name: "Creature Appearance Type",
    });
    expect(appearanceType).toHaveValue("249");
    expect(within(dialog).getByText("ACTIVE_NOW")).toBeInTheDocument();
    fireEvent.change(appearanceType, { target: { value: "52" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    await waitFor(() => {
      const currentDialog = screen.getByRole("dialog", { name: /creature properties/i });
      expect(within(currentDialog).getByRole("combobox", {
        name: "Creature Appearance Type",
      })).toHaveValue("52");
    });
    dialog = screen.getByRole("dialog", { name: /creature properties/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const creature = saved?.objects.find((object) => object.kind === "creatures");
      expect(creature?.creatureProperties?.appearanceType).toBe(52);
      expect(creature?.source?.creatureAppearance).toMatchObject({
        present: true,
        nativeType: "word",
        value: 249,
        table: { sha256: "a".repeat(64), rowIndex: 249, rowCount: 1_000 },
      });
    });
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).includes(`/catalog/creatures/appearances?tableSha256=${"a".repeat(64)}`),
    )).toBe(true);
  });

  it("persists a digest-bound admitted Creature Gender row while retaining source provenance", async () => {
    exactCreatureGenderDraft();
    const fetchMock = installCreatureGenderCatalogFetch();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) =>
        String(input).includes(
          `/catalog/creatures/genders?tableSha256=${"c".repeat(64)}&limit=256&offset=0`,
        ),
      )).toBe(true);
    });
    dialog = screen.getByRole("dialog", { name: /creature properties/i });
    const gender = within(dialog).getByRole("combobox", { name: "Creature Gender" });
    expect(gender).toHaveValue("4");
    fireEvent.change(gender, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    await waitFor(() => {
      expect(within(screen.getByRole("dialog", { name: /creature properties/i }))
        .getByRole("combobox", { name: "Creature Gender" })).toHaveValue("0");
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const creature = saved?.objects.find((object) => object.kind === "creatures");
      expect(creature?.creatureProperties?.genderId).toBe(0);
      expect(creature?.creatureProperties?.gender).toBe("Male");
      expect(creature?.source?.creatureGender).toMatchObject({
        present: true,
        nativeType: "byte",
        value: 4,
        table: { sha256: "c".repeat(64), rowIndex: 4, rowCount: 5 },
      });
    });
  });

  it("roundtrips one Toolset-admitted Creature PerceptionRange while retaining its CAS", async () => {
    exactCreaturePerceptionRangeDraft();
    const fetchMock = installCreaturePerceptionRangeCatalogFetch();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) =>
        String(input).includes(
          `/catalog/creatures/perception-ranges?tableSha256=${"e".repeat(64)}`,
        ),
      )).toBe(true);
    });
    dialog = screen.getByRole("dialog", { name: /creature properties/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    const selector = within(dialog).getByRole("combobox", {
      name: "Creature Perception Range",
    });
    expect(selector).toHaveValue("11");
    fireEvent.change(selector, { target: { value: "9" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    await waitFor(() => {
      expect(within(screen.getByRole("dialog", { name: /creature properties/i }))
        .getByRole("combobox", { name: "Creature Perception Range" })).toHaveValue("9");
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const creature = saved?.objects.find((object) => object.kind === "creatures");
      expect(creature?.creatureProperties?.advancedSettings?.perceptionRangeId).toBe(9);
      expect(creature?.creatureProperties?.advancedSettings?.perceptionRange).toBe("Medium");
      expect(creature?.source?.creaturePerceptionRange).toMatchObject({
        present: true,
        nativeType: "byte",
        value: 11,
        table: { sha256: "e".repeat(64), rowIndex: 11, rowCount: 12 },
      });
    });
  });

  it("roundtrips one admitted Creature PortraitId while retaining its selector and table CAS", async () => {
    exactCreaturePortraitDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    let portrait = within(dialog).getByRole("combobox", { name: "Creature Portrait" });
    expect(portrait).toHaveValue("10");
    expect(within(portrait).queryByRole("option", { name: /12/u })).not.toBeInTheDocument();
    fireEvent.change(portrait, { target: { value: "11" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    portrait = within(dialog).getByRole("combobox", { name: "Creature Portrait" });
    expect(portrait).toHaveValue("11");
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const creature = saved?.objects.find((object) => object.kind === "creatures");
      expect(creature?.creatureProperties?.portraitId).toBe(11);
      expect(creature?.creatureProperties?.portraitResRef).toBe("po_em_guard");
      expect(creature?.source?.creaturePortrait).toMatchObject({
        present: true,
        nativeType: "word",
        value: 10,
        selectorContext: { genderValue: 0, raceValue: 4 },
        table: {
          sha256: "f".repeat(64),
          rowIndex: 10,
          rowCount: 16_001,
          baseResRef: "po_hm_guard",
        },
      });
    });
  });

  it("persists exact Creature names and Description without normalization", async () => {
    exactCreatureNameDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const dialog = await openCreaturePropertiesDialog();
    const firstName = within(dialog).getByRole("textbox", { name: /first name/i });
    const lastName = within(dialog).getByRole("textbox", { name: /last name/i });
    const description = within(dialog).getByRole("textbox", { name: /^description$/i });
    expect(within(dialog).getByText("FirstName: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("LastName: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("Description: ACTIVE_NOW")).toBeInTheDocument();

    fireEvent.change(firstName, { target: { value: "  Exact First  " } });
    fireEvent.change(lastName, { target: { value: "" } });
    fireEvent.change(description, { target: { value: "  Exact description  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i })).not.toBeInTheDocument();
    });
    const reopened = await openCreaturePropertiesDialog();
    expect(within(reopened).getByRole("textbox", { name: /first name/i })).toHaveValue(
      "  Exact First  ",
    );
    expect(within(reopened).getByRole("textbox", { name: /last name/i })).toHaveValue("");
    expect(within(reopened).getByRole("textbox", { name: /^description$/i })).toHaveValue(
      "  Exact description  ",
    );
  });

  it("roundtrips exact Creature Treasure Model and DecayTime without coupling storage to Lootable", async () => {
    exactCreatureDeathRemainsDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByText(/Treasure Model=ACTIVE_NOW/)).toBeInTheDocument();
    expect(within(dialog).getByText(/DecayTime=ACTIVE_NOW/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("checkbox", { name: "Body Bag" })).not.toBeInTheDocument();

    let treasureModel = within(dialog).getByRole("combobox", { name: "Treasure Model" });
    let decayTime = within(dialog).getByRole("spinbutton", { name: "Corpse Decay Time (s)" });
    expect(treasureModel).toHaveValue("2");
    expect(decayTime).toHaveValue(12);
    fireEvent.change(treasureModel, { target: { value: "1" } });
    fireEvent.change(decayTime, { target: { value: "15" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    const lootable = within(dialog).getByRole("checkbox", { name: "Leaves Lootable Corpse" });
    fireEvent.click(lootable);
    expect(treasureModel).toBeDisabled();
    expect(decayTime).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    treasureModel = within(dialog).getByRole("combobox", { name: "Treasure Model" });
    decayTime = within(dialog).getByRole("spinbutton", { name: "Corpse Decay Time (s)" });
    expect(within(dialog).getByRole("checkbox", { name: "Leaves Lootable Corpse" }))
      .not.toBeChecked();
    expect(treasureModel).toHaveValue("1");
    expect(decayTime).toHaveValue(15);
    expect(treasureModel).toBeDisabled();
    expect(decayTime).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Leaves Lootable Corpse" }));
    expect(treasureModel).toBeEnabled();
    expect(decayTime).toBeEnabled();
    fireEvent.change(treasureModel, { target: { value: "0" } });
    fireEvent.change(decayTime, { target: { value: "20" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByRole("checkbox", { name: "Leaves Lootable Corpse" }))
      .not.toBeChecked();
    expect(within(dialog).getByRole("combobox", { name: "Treasure Model" })).toHaveValue("1");
    expect(within(dialog).getByRole("spinbutton", { name: "Corpse Decay Time (s)" }))
      .toHaveValue(15);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.advancedSettings).toMatchObject({
        leavesLootableCorpse: false,
        treasureModelRow: 1,
        corpseDecayTimeSeconds: 15,
      });
      expect(savedCreature?.source?.creatureBodyBag).toEqual({
        expectedValue: 2,
        tableSha256: CREATURE_BODY_BAG_TABLE_SHA256,
        tableRowCount: 3,
      });
      expect(savedCreature?.source?.creatureDecayTime).toEqual({
        expectedMilliseconds: 12_000,
      });
      expect(saved?.placeableBodyBagCatalog?.descriptor.sha256)
        .toBe(CREATURE_BODY_BAG_TABLE_SHA256);
    });
  });

  it("roundtrips exact catalog-bound Creature FactionID while retaining source CAS", async () => {
    exactCreatureFactionDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByText("FactionID: ACTIVE_NOW")).toBeInTheDocument();
    const faction = within(dialog).getByRole("combobox", { name: "Faction" });
    expect(faction).toHaveValue("1");
    expect(within(faction).getByRole("option", { name: "2 — Defender" })).toBeInTheDocument();
    fireEvent.change(faction, { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByRole("combobox", { name: "Faction" })).toHaveValue("2");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.advancedSettings).toMatchObject({
        factionId: 2,
        faction: "Defender",
      });
      expect(savedCreature?.source?.creatureFaction).toEqual({
        expectedValue: 1,
        catalogSha256: CREATURE_FACTION_CATALOG_SHA256,
        catalogFactionCount: 3,
      });
      expect(saved?.placeableFactionCatalog?.descriptor.sha256)
        .toBe(CREATURE_FACTION_CATALOG_SHA256);
    });
  });

  it("roundtrips exact Creature TemplateResRef while preserving renderer identity and source CAS", async () => {
    exactCreatureTemplateResRefDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByText("TemplateResRef: ACTIVE_NOW")).toBeInTheDocument();
    const blueprintResRef = within(dialog).getByRole("textbox", { name: "Blueprint ResRef" });
    expect(blueprintResRef).toHaveValue("nw_guard");
    fireEvent.change(blueprintResRef, { target: { value: "nw_guard_alt" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByRole("textbox", { name: "Blueprint ResRef" }))
      .toHaveValue("nw_guard_alt");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.resRef).toBe("renderer_identity");
      expect(savedCreature?.creatureProperties?.advancedSettings?.blueprintResRef)
        .toBe("nw_guard_alt");
      expect(savedCreature?.source?.creatureTemplateResRef)
        .toEqual({ expectedResRef: "nw_guard" });
    });
  });

  it("roundtrips exact Creature Subrace/Deity through Apply, OK, reopen, and local Save", async () => {
    exactCreatureSpecialIdentityStringsDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByText("Subrace: ACTIVE_NOW; Deity: ACTIVE_NOW"))
      .toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Subrace" }), {
      target: { value: "Sun Elf" },
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Deity" }), {
      target: { value: "Selune" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByRole("textbox", { name: "Subrace" })).toHaveValue("Sun Elf");
    expect(within(dialog).getByRole("textbox", { name: "Deity" })).toHaveValue("Selune");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.advancedSettings).toMatchObject({
        subrace: "Sun Elf",
        deity: "Selune",
      });
      expect(savedCreature?.source?.creatureSpecialIdentityStrings).toEqual({
        subrace: { expectedValue: "Moon Elf" },
        deity: { expectedValue: "Mystra" },
      });
    });
  });

  it("roundtrips only exact Creature script ResRefs through Apply, OK, reopen, and local Save", async () => {
    exactCreatureScriptResRefsDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^scripts$/i }));
    expect(within(dialog).getByText("OnHeartbeat: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("OnSpawn: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("OnBlocked: PRESERVE_ONLY")).toBeInTheDocument();
    const heartbeat = within(dialog).getByRole("combobox", { name: "OnHeartbeat" });
    const spawn = within(dialog).getByRole("combobox", { name: "OnSpawn" });
    const blocked = within(dialog).getByRole("combobox", { name: "OnBlocked" });
    expect(blocked).toBeDisabled();
    fireEvent.change(heartbeat, { target: { value: "main" } });
    fireEvent.change(spawn, { target: { value: "spawn_alt" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: /^scripts$/i }));
    expect(within(dialog).getByRole("combobox", { name: "OnHeartbeat" }))
      .toHaveValue("main");
    expect(within(dialog).getByRole("combobox", { name: "OnSpawn" }))
      .toHaveValue("spawn_alt");
    expect(within(dialog).getByRole("combobox", { name: "OnBlocked" }))
      .toHaveValue("presentation_only");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.scriptSlots).toMatchObject({
        onHeartbeat: "main",
        onSpawn: "spawn_alt",
        onBlocked: "presentation_only",
      });
      expect(savedCreature?.source?.creatureScriptResRefs).toEqual({
        onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
        onSpawn: { expectedResRef: "nw_c2_default9" },
      });
    });
  });

  it("roundtrips exact Creature ChallengeRating while preserving CRAdjust", async () => {
    exactCreatureChallengeRatingDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    expect(within(dialog).getByText("Challenge Rating: ACTIVE_NOW")).toBeInTheDocument();
    const challengeRating = within(dialog).getByRole("spinbutton", {
      name: "Challenge Rating",
    });
    fireEvent.change(challengeRating, { target: { value: "0.1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    expect(Number((within(dialog).getByRole("spinbutton", {
      name: "Challenge Rating",
    }) as HTMLInputElement).value)).toBe(Math.fround(0.1));
    fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
    expect(within(dialog).getByText("Adjustment: PRESERVE_ONLY")).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", {
      name: "Challenge Rating Adjustment",
    })).toHaveValue(3);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.challengeRating).toBe(Math.fround(0.1));
      expect(savedCreature?.creatureProperties?.advancedSettings?.challengeRatingAdjustment)
        .toBe(3);
      expect(savedCreature?.source?.creatureChallengeRating).toEqual({
        present: true,
        nativeType: "float",
        value: 11.5,
      });
    });
  });

  it("roundtrips only exact present Creature base ability-score Bytes", async () => {
    exactCreatureAbilityScoresDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Statistics" }));
    expect(within(dialog).getByText("Strength: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("Intelligence: PRESERVE_ONLY")).toBeInTheDocument();
    const strength = within(dialog).getByRole("spinbutton", { name: "Strength score" });
    const intelligence = within(dialog).getByRole("spinbutton", { name: "Intelligence score" });
    const racialStrength = within(dialog).getByRole("spinbutton", {
      name: "Strength racial modifier",
    });
    expect(intelligence).toBeDisabled();
    expect(racialStrength).toBeDisabled();
    fireEvent.change(strength, { target: { value: "256" } });
    expect(strength).toHaveValue(15);
    fireEvent.change(strength, { target: { value: "17" } });
    expect(strength).toHaveValue(17);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Statistics" }));
    expect(within(dialog).getByRole("spinbutton", { name: "Strength score" }))
      .toHaveValue(17);
    expect(within(dialog).getByRole("spinbutton", { name: "Intelligence score" }))
      .toHaveValue(10);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.statistics?.abilityScores).toEqual({
        strength: 17,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 8,
      });
      expect(savedCreature?.source?.creatureAbilityScores).toEqual({
        strength: { present: true, nativeType: "byte", value: 15 },
        dexterity: { present: true, nativeType: "byte", value: 12 },
        constitution: { present: true, nativeType: "byte", value: 14 },
        intelligence: { present: false },
        wisdom: { present: true, nativeType: "byte", value: 11 },
        charisma: { present: true, nativeType: "byte", value: 8 },
      });
    });
  });

  it("roundtrips coupled Creature Base HP while preserving source CAS provenance", async () => {
    exactCreatureHitPointsDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Statistics" }));
    expect(within(dialog).getByText("Constitution: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("Base Hit Points: ACTIVE_NOW")).toBeInTheDocument();
    const baseHitPoints = within(dialog).getByRole("spinbutton", {
      name: "Base Hit Points",
    });
    expect(baseHitPoints).toHaveAttribute("min", "20");
    expect(within(dialog).getByRole("spinbutton", { name: "Hit Point Bonuses" }))
      .toHaveValue(-15);
    fireEvent.change(baseHitPoints, { target: { value: "19" } });
    expect(baseHitPoints).toHaveValue(20);
    fireEvent.change(baseHitPoints, { target: { value: "21" } });
    expect(baseHitPoints).toHaveValue(21);
    expect(within(dialog).getByRole("spinbutton", { name: "Hit Point Bonuses" }))
      .toHaveValue(-15);
    expect(within(dialog).getByRole("spinbutton", { name: "Current Hit Points" }))
      .toHaveValue(20);
    expect(within(dialog).getByRole("spinbutton", { name: "Max Hit Points" }))
      .toHaveValue(6);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Statistics" }));
    expect(within(dialog).getByRole("spinbutton", { name: "Base Hit Points" }))
      .toHaveValue(21);
    expect(within(dialog).getByRole("spinbutton", { name: "Current Hit Points" }))
      .toHaveValue(20);
    expect(within(dialog).getByRole("spinbutton", { name: "Max Hit Points" }))
      .toHaveValue(6);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.statistics).toMatchObject({
        baseHitPoints: 21,
        hitPointBonuses: -15,
        currentHitPoints: 20,
        maxHitPoints: 6,
      });
      expect(savedCreature?.source?.creatureHitPointState).toEqual({
        present: true,
        hitPoints: { nativeType: "short", value: 20 },
        currentHitPoints: { nativeType: "short", value: 77 },
        maxHitPoints: { nativeType: "short", value: 88 },
        constitution: { nativeType: "byte", value: 4 },
        race: { nativeType: "byte", value: 1 },
        classLevels: [3, 2],
        featRow40Present: false,
        racialTypes: expect.objectContaining({
          sha256: "a".repeat(64),
          rowIndex: 1,
          constitutionAdjust: 0,
        }),
      });
    });
  });

  it("roundtrips exact Creature NaturalAC, saving throws, and alignment while preserving source", async () => {
    exactCreatureNaturalArmorClassDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Statistics" }));
    expect(within(dialog).getByText("Natural AC: ACTIVE_NOW")).toBeInTheDocument();
    const naturalArmorClass = within(dialog).getByRole("spinbutton", {
      name: "Natural AC",
    });
    expect(within(dialog).getByText("Fortitude Bonus: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("Reflex Bonus: ACTIVE_NOW")).toBeInTheDocument();
    expect(within(dialog).getByText("Will Bonus: PRESERVE_ONLY")).toBeInTheDocument();
    const fortitudeBonus = within(dialog).getByRole("spinbutton", {
      name: "Fortitude bonus",
    });
    const reflexBonus = within(dialog).getByRole("spinbutton", {
      name: "Reflex bonus",
    });
    expect(within(dialog).getByRole("spinbutton", { name: "Will bonus" })).toBeDisabled();
    expect(within(dialog).getByRole("spinbutton", { name: "Base AC" })).toBeDisabled();
    expect(within(dialog).getByRole("spinbutton", { name: "Dexterity Bonus" }))
      .toBeDisabled();
    expect(within(dialog).getByRole("spinbutton", { name: "Size Modifier" }))
      .toBeDisabled();
    fireEvent.change(naturalArmorClass, { target: { value: "256" } });
    expect(naturalArmorClass).toHaveValue(0);
    fireEvent.change(naturalArmorClass, { target: { value: "2" } });
    expect(naturalArmorClass).toHaveValue(2);
    fireEvent.change(fortitudeBonus, { target: { value: "251" } });
    expect(fortitudeBonus).toHaveValue(0);
    fireEvent.change(fortitudeBonus, { target: { value: "5" } });
    fireEvent.change(reflexBonus, { target: { value: "4" } });
    expect(fortitudeBonus).toHaveValue(5);
    expect(reflexBonus).toHaveValue(4);
    fireEvent.click(within(dialog).getByRole("button", { name: "Classes" }));
    expect(within(dialog).getByText("Alignment: ACTIVE_NOW")).toBeInTheDocument();
    const alignment = within(dialog).getByRole("combobox", { name: "Creature Alignment" });
    expect(alignment).toHaveValue("True Neutral");
    fireEvent.change(alignment, { target: { value: "Lawful Good" } });
    expect(alignment).toHaveValue("Lawful Good");
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Classes" }));
    expect(within(dialog).getByRole("combobox", { name: "Creature Alignment" }))
      .toHaveValue("Lawful Good");
    fireEvent.click(within(dialog).getByRole("button", { name: "Statistics" }));
    expect(within(dialog).getByRole("spinbutton", { name: "Natural AC" }))
      .toHaveValue(2);
    expect(within(dialog).getByRole("spinbutton", { name: "Fortitude bonus" }))
      .toHaveValue(5);
    expect(within(dialog).getByRole("spinbutton", { name: "Reflex bonus" }))
      .toHaveValue(4);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.statistics?.naturalArmorClass).toBe(2);
      expect(savedCreature?.creatureProperties?.statistics?.saves.fortitudeBonus).toBe(5);
      expect(savedCreature?.creatureProperties?.statistics?.saves.reflexBonus).toBe(4);
      expect(savedCreature?.creatureProperties?.alignment).toBe("Lawful Good");
      expect(savedCreature?.source?.creatureNaturalArmorClass).toEqual({
        present: true,
        nativeType: "byte",
        value: 0,
      });
      expect(savedCreature?.source?.creatureSavingThrowBonuses).toEqual({
        fortitude: { present: true, nativeType: "short", value: 0 },
        reflex: { present: true, nativeType: "short", value: 0 },
        will: { present: false },
      });
      expect(savedCreature?.source?.creatureAlignment).toEqual({
        goodEvil: { present: true, nativeType: "byte", value: 50 },
        lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
      });
    });
  });

  it("appends only one retained Creature ClassList tail slot and preserves source provenance", async () => {
    exactCreatureClassSlotDraft();
    const fetchMock = installCreatureClassSlotCatalogFetch();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Classes" }));
    await waitFor(() => {
      expect(within(screen.getByRole("dialog", { name: /creature properties/i }))
        .getByRole("button", { name: "Add class slot" })).toBeEnabled();
    });
    dialog = screen.getByRole("dialog", { name: /creature properties/i });
    expect(within(dialog).getByRole("combobox", { name: "Class 1 ID" })).toHaveValue("4");
    expect(within(dialog).getByRole("button", { name: "Remove last class slot" }))
      .toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add class slot" }));

    await waitFor(() => {
      const currentDialog = screen.getByRole("dialog", { name: /creature properties/i });
      expect(within(currentDialog).getByRole("combobox", { name: "Class 2 ID" }))
        .toHaveValue("5");
      expect(within(currentDialog).getByRole("spinbutton", { name: "Class 1 level" }))
        .toBeDisabled();
      expect(within(currentDialog).getByRole("spinbutton", { name: "Class 2 level" }))
        .toBeEnabled();
      expect(within(currentDialog).getByRole("button", { name: /^apply$/i })).toBeEnabled();
    });
    dialog = screen.getByRole("dialog", { name: /creature properties/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Classes" }));
    await waitFor(() => {
      expect(within(screen.getByRole("dialog", { name: /creature properties/i }))
        .getByRole("combobox", { name: "Class 2 ID" })).toHaveValue("5");
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.classEntries).toEqual([
        { classId: 4, className: "Fighter", level: 3 },
        { classId: 5, className: "Wizard", level: 1 },
      ]);
      expect(savedCreature?.creatureProperties?.classSlotResizeDestructiveRemovalConfirmed)
        .toBe(false);
      expect(savedCreature?.creatureProperties?.statistics).toMatchObject({
        baseHitPoints: 10,
        hitPointBonuses: 12,
        currentHitPoints: 7,
        maxHitPoints: 22,
      });
      expect(savedCreature?.source?.creatureClassIdentityState).toMatchObject({
        classListGraphSha256: "c".repeat(64),
        entries: [{ classId: 4, level: 3 }],
      });
    });
    expect(fetchMock.mock.calls.some(([input]) =>
      String(input).includes("/catalog/creatures/starting-packages?") &&
      String(input).includes("classIds=4%2C5"))).toBe(true);
  });

  it("roundtrips one confirmed retained Creature class spell-list clear", async () => {
    exactCreatureClassSlotDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Spells" }));
    expect(within(dialog).getByText("Class spell-list clear: ACTIVE_NOW"))
      .toBeInTheDocument();
    expect(within(dialog).getByText("Magic Missile")).toBeInTheDocument();
    const confirmation = within(dialog).getByRole("checkbox", {
      name: "Confirm class spell list clear",
    });
    fireEvent.click(confirmation);
    const clear = within(dialog).getByRole("button", { name: "Clear Class Spell List" });
    expect(clear).toBeEnabled();
    fireEvent.click(clear);

    expect(within(dialog).getByText("Clear staged for class slot 1.")).toBeInTheDocument();
    expect(within(dialog).queryByText("Magic Missile")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Spells" }));
    expect(within(dialog).getByRole("checkbox", {
      name: "Confirm class spell list clear",
    })).toBeChecked();
    expect(within(dialog).getByText("Clear staged for class slot 1.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.classSpellClearSlotIndices).toEqual([0]);
      expect(savedCreature?.creatureProperties?.classSpellClearConfirmed).toBe(true);
      expect(savedCreature?.creatureProperties?.spells).toEqual([]);
      expect(savedCreature?.source?.creatureClassIdentityState).toMatchObject({
        classListGraphSha256: "c".repeat(64),
        entries: [{
          classId: 4,
          level: 3,
          canonicalSpellListFieldCount: 2,
          spellEntryCount: 3,
        }],
      });
    });
  });

  it("roundtrips one confirmed exact retained Creature spell-entry removal", async () => {
    exactCreatureClassSlotDraft();
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Spells" }));
    expect(within(dialog).getByText("Exact spell-entry removal: ACTIVE_NOW"))
      .toBeInTheDocument();
    expect(within(dialog).getByText("Magic Missile")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("checkbox", {
      name: "Confirm class spell entry removal",
    }));
    const removalButtons = within(dialog).getAllByRole("button", { name: "Remove Entry" });
    expect(removalButtons).toHaveLength(3);
    fireEvent.click(removalButtons[2]!);

    expect(within(dialog).getByText("1 exact spell entry staged for removal."))
      .toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    expect(within(dialog).queryByText("Magic Missile")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Spells" }));
    expect(within(dialog).getByRole("checkbox", {
      name: "Confirm class spell entry removal",
    })).toBeChecked();
    expect(within(dialog).getByText("1 exact spell entry staged for removal."))
      .toBeInTheDocument();
    expect(within(dialog).queryByText("Magic Missile")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.classSpellRemovalTargets).toEqual([{
        classSlotIndex: 0,
        listKind: "memorized",
        spellLevel: 1,
        entryIndex: 0,
      }]);
      expect(savedCreature?.creatureProperties?.classSpellRemovalConfirmed).toBe(true);
      expect(savedCreature?.creatureProperties?.spells).toEqual([]);
      expect(savedCreature?.source?.creatureClassIdentityState).toMatchObject({
        classListGraphSha256: "c".repeat(64),
        entries: [{
          classId: 4,
          level: 3,
          canonicalSpellListFieldCount: 2,
          spellEntryCount: 3,
        }],
      });
    });
  });

  it("roundtrips one confirmed exact retained Creature same-list spell-entry reorder", async () => {
    exactCreatureClassSlotDraft(true);
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    let dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Spells" }));
    expect(within(dialog).getByText("Exact spell-entry order: ACTIVE_NOW"))
      .toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("checkbox", {
      name: "Confirm class spell entry reorder",
    }));
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move spell 11 down in memorized L0",
    }));

    expect(within(dialog).getByText("1 native spell list staged for reorder."))
      .toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /creature properties/i }))
        .not.toBeInTheDocument();
    });
    dialog = await openCreaturePropertiesDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Spells" }));
    expect(within(dialog).getByRole("checkbox", {
      name: "Confirm class spell entry reorder",
    })).toBeChecked();
    expect(within(dialog).getByText("1 native spell list staged for reorder."))
      .toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      const saved = loadLocalSceneDraft("u_builder_001", window.localStorage);
      const savedCreature = saved?.objects.find((object) => object.kind === "creatures");
      expect(savedCreature?.creatureProperties?.classSpellReorders).toEqual([{
        classSlotIndex: 0,
        listKind: "memorized",
        spellLevel: 0,
        entryOrder: [1, 0],
      }]);
      expect(savedCreature?.creatureProperties?.classSpellReorderConfirmed).toBe(true);
      expect(savedCreature?.creatureProperties?.spells?.map((entry) => entry.spellId))
        .toEqual([12, 11, 42]);
      expect(savedCreature?.source?.creatureClassIdentityState).toMatchObject({
        classListGraphSha256: "c".repeat(64),
        entries: [{
          classId: 4,
          level: 3,
          canonicalSpellListFieldCount: 2,
          spellEntryCount: 3,
        }],
      });
    });
  });
});

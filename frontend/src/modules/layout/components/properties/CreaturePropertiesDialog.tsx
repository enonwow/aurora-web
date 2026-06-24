import type { PointerEventHandler, Ref } from "react";
import {
  SharedDialogActionsFooter,
  SharedLongTextPropertySection,
  SharedObjectPreviewPane,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav,
  SharedScriptSlotSection
} from "./SharedPropertyDialogSections";
import {
  resolveAbilityScoreModifier,
  CREATURE_ALIGNMENT_OPTIONS,
  CREATURE_APPEARANCE_CORE_FIELDS,
  CREATURE_APPEARANCE_EXTRA_PAIR,
  CREATURE_APPEARANCE_LIMB_PAIRS,
  CREATURE_DEFAULT_MOCK_FEATS,
  CREATURE_DEFAULT_MOCK_SPECIAL_ABILITIES,
  CREATURE_DEFAULT_MOCK_SPELLS,
  CREATURE_FACTION_OPTIONS,
  CREATURE_FEAT_FILTER_OPTIONS,
  CREATURE_GENDER_OPTIONS,
  CREATURE_METAMAGIC_FILTER_OPTIONS,
  CREATURE_MOVEMENT_RATE_OPTIONS,
  CREATURE_PERCEPTION_RANGE_OPTIONS,
  CREATURE_PROPERTIES_TAB_OPTIONS,
  CREATURE_RACE_OPTIONS,
  CREATURE_SCRIPT_SLOT_KEYS,
  CREATURE_SCRIPT_SLOT_LABELS,
  CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS,
  CREATURE_SPELL_LEVEL_FILTER_OPTIONS,
  CREATURE_TREASURE_MODEL_OPTIONS,
  type CreaturePropertiesDialogState,
  type CreaturePropertiesDraft,
  type CreaturePropertiesTab,
  type CreatureScriptSlotKey
} from "../../application/workspaceObjectPropertyDrafts";

interface CreaturePropertiesDialogProps {
  creaturePropertiesDialog: CreaturePropertiesDialogState;
  creaturePropertiesDialogRef?: Ref<HTMLElement>;
  toggleCreaturePropertiesDialogCollapsed: () => void;
  cancelCreaturePropertiesDialog: () => void;
  setCreaturePropertiesActiveTab: (nextTab: CreaturePropertiesTab) => void;
  updateCreaturePropertiesDraftField: (
    field: keyof CreaturePropertiesDraft,
    value: string | number | boolean
  ) => void;
  updateCreatureClassEntry: (index: number, field: "className" | "level", value: string | number) => void;
  updateCreatureSkillRank: (index: number, rank: number) => void;
  updateCreatureScriptSlot: (field: CreatureScriptSlotKey, value: string) => void;
  updateCreatureAppearancePart: (
    field: keyof CreaturePropertiesDraft["appearanceParts"],
    value: string
  ) => void;
  updateCreatureAdvancedField: (
    field: keyof CreaturePropertiesDraft["advancedSettings"],
    value: string | number | boolean
  ) => void;
  applyCreaturePropertiesDraft: (closeAfterApply: boolean) => void;
  creatureFeatsFilter: string;
  setCreatureFeatsFilter: (nextFilter: string) => void;
  creatureSpellsLevelFilter: string;
  setCreatureSpellsLevelFilter: (nextFilter: string) => void;
  creatureSpellsMetaMagicFilter: string;
  setCreatureSpellsMetaMagicFilter: (nextFilter: string) => void;
  creatureSpellsClassFilterIndex: number;
  setCreatureSpellsClassFilterIndex: (nextIndex: number) => void;
  creatureSpecialAbilitiesFilter: string;
  setCreatureSpecialAbilitiesFilter: (nextFilter: string) => void;
  startCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  moveCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  endCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  cancelCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
}

export function CreaturePropertiesDialog({
  creaturePropertiesDialog,
  creaturePropertiesDialogRef,
  toggleCreaturePropertiesDialogCollapsed,
  cancelCreaturePropertiesDialog,
  setCreaturePropertiesActiveTab,
  updateCreaturePropertiesDraftField,
  updateCreatureClassEntry,
  updateCreatureSkillRank,
  updateCreatureScriptSlot,
  updateCreatureAppearancePart,
  updateCreatureAdvancedField,
  applyCreaturePropertiesDraft,
  creatureFeatsFilter,
  setCreatureFeatsFilter,
  creatureSpellsLevelFilter,
  setCreatureSpellsLevelFilter,
  creatureSpellsMetaMagicFilter,
  setCreatureSpellsMetaMagicFilter,
  creatureSpellsClassFilterIndex,
  setCreatureSpellsClassFilterIndex,
  creatureSpecialAbilitiesFilter,
  setCreatureSpecialAbilitiesFilter,
  startCreaturePropertiesDialogDrag,
  moveCreaturePropertiesDialogDrag,
  endCreaturePropertiesDialogDrag,
  cancelCreaturePropertiesDialogDrag
}: CreaturePropertiesDialogProps) {
  const creatureAbilityTotals = {
    strength: creaturePropertiesDialog.draft.strength + creaturePropertiesDialog.draft.strRacial,
    dexterity: creaturePropertiesDialog.draft.dexterity + creaturePropertiesDialog.draft.dexRacial,
    constitution:
      creaturePropertiesDialog.draft.constitution + creaturePropertiesDialog.draft.conRacial,
    intelligence:
      creaturePropertiesDialog.draft.intelligence + creaturePropertiesDialog.draft.intRacial,
    wisdom: creaturePropertiesDialog.draft.wisdom + creaturePropertiesDialog.draft.wisRacial,
    charisma: creaturePropertiesDialog.draft.charisma + creaturePropertiesDialog.draft.chaRacial
  };
  const creatureAbilityBonuses = {
    strength: resolveAbilityScoreModifier(creatureAbilityTotals.strength),
    dexterity: resolveAbilityScoreModifier(creatureAbilityTotals.dexterity),
    constitution: resolveAbilityScoreModifier(creatureAbilityTotals.constitution),
    intelligence: resolveAbilityScoreModifier(creatureAbilityTotals.intelligence),
    wisdom: resolveAbilityScoreModifier(creatureAbilityTotals.wisdom),
    charisma: resolveAbilityScoreModifier(creatureAbilityTotals.charisma)
  };
  const creatureTotalArmorClass =
    creaturePropertiesDialog.draft.naturalArmorClass +
    creaturePropertiesDialog.draft.baseArmorClass +
    creaturePropertiesDialog.draft.dexterityBonus +
    creaturePropertiesDialog.draft.sizeModifier;
  const creatureTotalHitPoints =
    creaturePropertiesDialog.draft.baseHitPoints + creaturePropertiesDialog.draft.hitPointBonuses;
  const creatureCalculatedChallengeRating = Math.max(
    0,
    creaturePropertiesDialog.draft.challengeRating +
      creaturePropertiesDialog.draft.advancedSettings.challengeRatingAdjustment
  );
  const creatureFeatsSource =
    creaturePropertiesDialog.draft.feats.length > 0
      ? creaturePropertiesDialog.draft.feats
      : CREATURE_DEFAULT_MOCK_FEATS;
  const creatureFeatsRows =
    creatureFeatsFilter === "All Feats"
      ? creatureFeatsSource
      : creatureFeatsSource.filter((entry) => entry.type === creatureFeatsFilter);
  const creatureFeatsSummary = creatureFeatsSource
    .filter((entry) => entry.assigned)
    .reduce<Record<string, string[]>>((acc, entry) => {
      if (!acc[entry.type]) {
        acc[entry.type] = [];
      }
      acc[entry.type].push(entry.name);
      return acc;
    }, {});
  const creatureFeatsSummaryText =
    Object.entries(creatureFeatsSummary)
      .map(([type, names]) => `${type}\n${names.map((name) => `  ${name}`).join("\n")}`)
      .join("\n") || "No assigned feats";
  const creatureSpellSource =
    creaturePropertiesDialog.draft.spells.length > 0
      ? creaturePropertiesDialog.draft.spells
      : CREATURE_DEFAULT_MOCK_SPELLS;
  const creatureSpellsRows =
    creatureSpellsLevelFilter === "All Levels"
      ? creatureSpellSource
      : creatureSpellSource.filter(
          (entry) => String(entry.spellLevel) === creatureSpellsLevelFilter
        );
  const creatureClassFilterEntries = creaturePropertiesDialog.draft.classEntries
    .map((entry) => entry.className.trim())
    .filter((entry, index) => entry.length > 0 || index === 0)
    .slice(0, 8);
  const creatureSpellsSummaryText =
    creatureSpellsRows.map((entry) => `${entry.name} (L${entry.spellLevel})`).join("\n") ||
    "No spells in current filter";
  const creatureSpecialAbilitiesSource =
    creaturePropertiesDialog.draft.specialAbilities.length > 0
      ? creaturePropertiesDialog.draft.specialAbilities
      : CREATURE_DEFAULT_MOCK_SPECIAL_ABILITIES;
  const creatureSpecialAbilitiesRows =
    creatureSpecialAbilitiesFilter === "All Spells and Abilities"
      ? creatureSpecialAbilitiesSource
      : creatureSpecialAbilitiesSource.filter((entry) => entry.type === creatureSpecialAbilitiesFilter);
  const creatureSpecialAbilitiesSummaryText =
    creatureSpecialAbilitiesRows.map((entry) => `${entry.type}\n  ${entry.name}`).join("\n") ||
    "No abilities in current filter";

  return (
    <SharedPropertyDialogChrome
      articleRef={creaturePropertiesDialogRef}
      articleClassName="canvas-placeable-properties-dialog canvas-creature-properties-dialog"
      ariaLabel="Creature properties"
      windowX={creaturePropertiesDialog.windowX}
      windowY={creaturePropertiesDialog.windowY}
      headerClassName="canvas-placeable-properties-header"
      headerCopyClassName="canvas-placeable-properties-header-copy"
      headerActionsClassName="canvas-placeable-properties-header-actions"
      title="Creature Properties"
      subtitle={creaturePropertiesDialog.draft.tag || creaturePropertiesDialog.objectId}
      collapsed={creaturePropertiesDialog.collapsed}
      collapseLabel="Collapse creature properties dialog"
      expandLabel="Expand creature properties dialog"
      closeLabel="Close creature properties dialog"
      onToggleCollapsed={toggleCreaturePropertiesDialogCollapsed}
      onClose={cancelCreaturePropertiesDialog}
      onArticleMouseDown={(event) => event.stopPropagation()}
      onArticleContextMenu={(event) => event.preventDefault()}
      onHeaderPointerDown={startCreaturePropertiesDialogDrag}
      onHeaderPointerMove={moveCreaturePropertiesDialogDrag}
      onHeaderPointerUp={endCreaturePropertiesDialogDrag}
      onHeaderPointerCancel={cancelCreaturePropertiesDialogDrag}
    >
      <>
          <SharedPropertyTabsNav
            className="canvas-placeable-properties-tabs"
            ariaLabel="creature properties tabs"
            tabs={CREATURE_PROPERTIES_TAB_OPTIONS}
            activeTab={creaturePropertiesDialog.activeTab}
            onSelectTab={setCreaturePropertiesActiveTab}
          />

          <section className="canvas-placeable-properties-shell">
            <SharedObjectPreviewPane
              className="canvas-placeable-properties-preview-pane"
              previewClassName="canvas-placeable-properties-preview"
              previewText={creaturePropertiesDialog.draft.appearance}
              previewFallback="Creature Preview"
              actionClassName="canvas-placeable-properties-preview-action"
            />

            <div className="canvas-placeable-properties-pane">
              {creaturePropertiesDialog.activeTab === "basic" ? (
                <div className="canvas-placeable-properties-basic canvas-creature-properties-basic">
                  <fieldset className="canvas-placeable-properties-basic-identity canvas-placeable-properties-group">
                    <legend>Profile</legend>
                    <label className="canvas-placeable-properties-field-row">
                      <span>First Name</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.firstName}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("firstName", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse first name">
                          ...
                        </button>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Last Name</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.lastName}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("lastName", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse last name">
                          ...
                        </button>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Tag</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.tag}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("tag", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Race</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creaturePropertiesDialog.draft.race}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("race", event.target.value)
                          }
                        >
                          {CREATURE_RACE_OPTIONS.map((race) => (
                            <option key={race} value={race}>
                              {race}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Appearance</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.appearance}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("appearance", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Phenotype</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.phenotype}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("phenotype", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Gender</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creaturePropertiesDialog.draft.gender}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("gender", event.target.value)
                          }
                        >
                          {CREATURE_GENDER_OPTIONS.map((gender) => (
                            <option key={gender} value={gender}>
                              {gender}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Challenge Rating</span>
                      <div className="canvas-placeable-properties-field-control is-narrow">
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          value={creaturePropertiesDialog.draft.challengeRating}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField(
                              "challengeRating",
                              Math.max(0, Number.parseFloat(event.target.value) || 0)
                            )
                          }
                        />
                      </div>
                    </label>
                  </fieldset>

                  <div className="canvas-creature-properties-basic-panel-stack">
                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Portrait</legend>
                      <div className="canvas-placeable-properties-portrait-row">
                        <div className="canvas-placeable-properties-portrait-preview">
                          <span>{creaturePropertiesDialog.draft.portraitResRef || "Portrait"}</span>
                        </div>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            aria-label="Portrait"
                            value={creaturePropertiesDialog.draft.portraitResRef}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "portraitResRef",
                                event.target.value
                              )
                            }
                          />
                          <button type="button" disabled aria-label="Browse portrait">
                            ...
                          </button>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Conversation</legend>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Conversation</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.conversation}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "conversation",
                                event.target.value
                              )
                            }
                          />
                          <button type="button" disabled aria-label="Browse conversation">
                            ...
                          </button>
                          <button type="button" disabled aria-label="Edit conversation">
                            Edit
                          </button>
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.noInterrupt}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("noInterrupt", event.target.checked)
                          }
                        />
                        No Interrupt
                      </label>
                    </fieldset>
                  </div>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "statistics" ? (
                <div className="canvas-creature-properties-statistics">
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Ability Scores</legend>
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">Ability</th>
                          <th scope="col">Score</th>
                          <th scope="col">Racial Modifier</th>
                          <th scope="col">Total</th>
                          <th scope="col">Bonus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Strength", "strength", "strRacial"],
                          ["Dexterity", "dexterity", "dexRacial"],
                          ["Constitution", "constitution", "conRacial"],
                          ["Intelligence", "intelligence", "intRacial"],
                          ["Wisdom", "wisdom", "wisRacial"],
                          ["Charisma", "charisma", "chaRacial"]
                        ].map(([label, scoreField, racialField]) => {
                          const scoreValue = creaturePropertiesDialog.draft[
                            scoreField as keyof CreaturePropertiesDraft
                          ] as number;
                          const racialValue = creaturePropertiesDialog.draft[
                            racialField as keyof CreaturePropertiesDraft
                          ] as number;
                          const totalValue = scoreValue + racialValue;
                          const bonusValue = resolveAbilityScoreModifier(totalValue);
                          return (
                            <tr key={label}>
                              <th scope="row">{label}</th>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  aria-label={`${label} score`}
                                  value={scoreValue}
                                  onChange={(event) =>
                                    updateCreaturePropertiesDraftField(
                                      scoreField as keyof CreaturePropertiesDraft,
                                      Number.parseFloat(event.target.value) || 0
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  aria-label={`${label} racial modifier`}
                                  value={racialValue}
                                  onChange={(event) =>
                                    updateCreaturePropertiesDraftField(
                                      racialField as keyof CreaturePropertiesDraft,
                                      Number.parseFloat(event.target.value) || 0
                                    )
                                  }
                                />
                              </td>
                              <td>{totalValue}</td>
                              <td>{bonusValue}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </fieldset>

                  <div className="canvas-creature-properties-statistics-grid">
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Saves</legend>
                      <table className="canvas-creature-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">Save</th>
                            <th scope="col">Base</th>
                            <th scope="col">Ability Modifier</th>
                            <th scope="col">Bonus</th>
                            <th scope="col">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["Fortitude", "fortitudeBase", "fortitudeBonus", "constitution"],
                            ["Reflex", "reflexBase", "reflexBonus", "dexterity"],
                            ["Will", "willBase", "willBonus", "wisdom"]
                          ].map(([label, baseField, bonusField, abilityField]) => {
                            const baseValue = creaturePropertiesDialog.draft[
                              baseField as keyof CreaturePropertiesDraft
                            ] as number;
                            const bonusValue = creaturePropertiesDialog.draft[
                              bonusField as keyof CreaturePropertiesDraft
                            ] as number;
                            const abilityModifier =
                              creatureAbilityBonuses?.[
                                abilityField as keyof NonNullable<typeof creatureAbilityBonuses>
                              ] ?? 0;
                            return (
                              <tr key={label}>
                                <th scope="row">{label}</th>
                                <td>
                                  <span aria-label={`${label} base`} className="canvas-creature-properties-cell-value">
                                    {baseValue}
                                  </span>
                                </td>
                                <td>{abilityModifier}</td>
                                <td>
                                  <input
                                    type="number"
                                    step="1"
                                    aria-label={`${label} bonus`}
                                    value={bonusValue}
                                    onChange={(event) =>
                                      updateCreaturePropertiesDraftField(
                                        bonusField as keyof CreaturePropertiesDraft,
                                        Number.parseFloat(event.target.value) || 0
                                      )
                                    }
                                  />
                                </td>
                                <td>{baseValue + abilityModifier + bonusValue}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </fieldset>

                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Armor / Hit Points</legend>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Natural AC</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.naturalArmorClass}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "naturalArmorClass",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Base AC</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.baseArmorClass}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "baseArmorClass",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Dexterity Bonus</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.dexterityBonus}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "dexterityBonus",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Size Modifier</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.sizeModifier}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "sizeModifier",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Base Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.baseHitPoints}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "baseHitPoints",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Hit Point Bonuses</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.hitPointBonuses}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "hitPointBonuses",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Total Armor Class</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input type="number" step="1" value={creatureTotalArmorClass} readOnly />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Total Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input type="number" step="1" value={creatureTotalHitPoints} readOnly />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Movement Rate</span>
                        <div className="canvas-placeable-properties-field-control">
                          <select
                            value={creaturePropertiesDialog.draft.movementRate}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "movementRate",
                                event.target.value
                              )
                            }
                          >
                            {CREATURE_MOVEMENT_RATE_OPTIONS.map((movementRate) => (
                              <option key={movementRate} value={movementRate}>
                                {movementRate}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                    </fieldset>
                  </div>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "appearance" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      type="checkbox"
                      checked={creaturePropertiesDialog.draft.appearancePartBased}
                      onChange={(event) =>
                        updateCreaturePropertiesDraftField(
                          "appearancePartBased",
                          event.target.checked
                        )
                      }
                    />
                    Use part-based appearance
                  </label>
                  <div className="canvas-creature-properties-appearance-aurora">
                    <div className="canvas-creature-properties-appearance-core">
                      {CREATURE_APPEARANCE_CORE_FIELDS.map((entry) => (
                        <label
                          key={entry.key}
                          className="canvas-placeable-properties-field-row canvas-creature-properties-appearance-core-row"
                        >
                          <span>{entry.label}</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.appearanceParts[entry.key]}
                              disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                              onChange={(event) =>
                                updateCreatureAppearancePart(entry.key, event.target.value)
                              }
                            />
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="canvas-creature-properties-appearance-limbs">
                      {CREATURE_APPEARANCE_LIMB_PAIRS.map((pair) => (
                        <div key={pair.rightKey} className="canvas-creature-properties-appearance-pair">
                          <label className="canvas-placeable-properties-field-row">
                            <span>{pair.rightLabel}</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[pair.rightKey]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                onChange={(event) =>
                                  updateCreatureAppearancePart(pair.rightKey, event.target.value)
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>{pair.leftLabel}</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[pair.leftKey]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                onChange={(event) =>
                                  updateCreatureAppearancePart(pair.leftKey, event.target.value)
                                }
                              />
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="canvas-creature-properties-appearance-tail-row">
                      <label className="canvas-placeable-properties-field-row">
                        <span>{CREATURE_APPEARANCE_EXTRA_PAIR.rightLabel}</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={
                              creaturePropertiesDialog.draft.appearanceParts[
                                CREATURE_APPEARANCE_EXTRA_PAIR.rightKey
                              ]
                            }
                            disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                            onChange={(event) =>
                              updateCreatureAppearancePart(
                                CREATURE_APPEARANCE_EXTRA_PAIR.rightKey,
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>{CREATURE_APPEARANCE_EXTRA_PAIR.leftLabel}</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={
                              creaturePropertiesDialog.draft.appearanceParts[
                                CREATURE_APPEARANCE_EXTRA_PAIR.leftKey
                              ]
                            }
                            disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                            onChange={(event) =>
                              updateCreatureAppearancePart(
                                CREATURE_APPEARANCE_EXTRA_PAIR.leftKey,
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                  <p className="canvas-placeable-properties-note">
                    Aurora-first: part fields affect only models supporting body-part overrides.
                  </p>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "classes" ? (
                <div className="canvas-creature-properties-classes">
                  <fieldset className="canvas-placeable-properties-group">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Alignment</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creaturePropertiesDialog.draft.alignment}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("alignment", event.target.value)
                          }
                        >
                          {CREATURE_ALIGNMENT_OPTIONS.map((alignment) => (
                            <option key={alignment} value={alignment}>
                              {alignment}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </fieldset>
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Classes</legend>
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">Class</th>
                          <th scope="col">Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creaturePropertiesDialog.draft.classEntries.map((entry, index) => (
                          <tr key={`class_${index + 1}`}>
                            <td>
                              <input
                                type="text"
                                value={entry.className}
                                onChange={(event) =>
                                  updateCreatureClassEntry(index, "className", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                min={1}
                                value={entry.level}
                                onChange={(event) =>
                                  updateCreatureClassEntry(
                                    index,
                                    "level",
                                    Math.max(1, Number.parseFloat(event.target.value) || 1)
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Default Package for Autolevelup</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.defaultPackage}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("defaultPackage", event.target.value)
                          }
                        />
                      </div>
                    </label>
                  </fieldset>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "skills" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Skills</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Skill</th>
                        <th scope="col">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creaturePropertiesDialog.draft.skills.map((entry, index) => (
                        <tr key={entry.skill}>
                          <th scope="row">{entry.skill}</th>
                          <td>
                            <input
                              type="number"
                              step="1"
                              min={0}
                              value={entry.rank}
                              onChange={(event) =>
                                updateCreatureSkillRank(
                                  index,
                                  Math.max(0, Number.parseFloat(event.target.value) || 0)
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "scripts" ? (
                <SharedScriptSlotSection
                  className="canvas-placeable-properties-group"
                  legend="Scripts"
                  slots={CREATURE_SCRIPT_SLOT_KEYS}
                  labels={CREATURE_SCRIPT_SLOT_LABELS}
                  values={creaturePropertiesDialog.draft.scriptSlots}
                  onChange={updateCreatureScriptSlot}
                  inputIdPrefix="creature-script"
                  rowClassName="canvas-placeable-properties-field-row"
                  rowControlClassName="canvas-placeable-properties-field-control"
                  showInlineActionButtons
                  inlineBrowseDisabled
                  inlineEditDisabled
                />
              ) : null}

              {creaturePropertiesDialog.activeTab === "advanced" ? (
                <div className="canvas-creature-properties-advanced">
                  <fieldset className="canvas-placeable-properties-group">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Blueprint ResRef</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.advancedSettings.blueprintResRef}
                          onChange={(event) =>
                            updateCreatureAdvancedField("blueprintResRef", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <div className="canvas-placeable-properties-basic-flags">
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.disarmable}
                          onChange={(event) =>
                            updateCreatureAdvancedField("disarmable", event.target.checked)
                          }
                        />
                        Disarmable
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.plot}
                          onChange={(event) =>
                            updateCreatureAdvancedField("plot", event.target.checked)
                          }
                        />
                        Plot
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={
                            creaturePropertiesDialog.draft.advancedSettings.leavesLootableCorpse
                          }
                          onChange={(event) =>
                            updateCreatureAdvancedField(
                              "leavesLootableCorpse",
                              event.target.checked
                            )
                          }
                        />
                        Leaves Lootable Corpse
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.noPermanentDeath}
                          onChange={(event) =>
                            updateCreatureAdvancedField(
                              "noPermanentDeath",
                              event.target.checked
                            )
                          }
                        />
                        No Permanent Death
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.immortal}
                          onChange={(event) =>
                            updateCreatureAdvancedField("immortal", event.target.checked)
                          }
                        />
                        Immortal
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Treasure Model</span>
                        <div className="canvas-placeable-properties-field-control">
                          <select
                            value={creaturePropertiesDialog.draft.advancedSettings.treasureModel}
                            onChange={(event) =>
                              updateCreatureAdvancedField("treasureModel", event.target.value)
                            }
                          >
                            {CREATURE_TREASURE_MODEL_OPTIONS.map((treasureModel) => (
                              <option key={treasureModel} value={treasureModel}>
                                {treasureModel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Corpse Decay Time (s)</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            min={0}
                            value={
                              creaturePropertiesDialog.draft.advancedSettings.corpseDecayTimeSeconds
                            }
                            onChange={(event) =>
                              updateCreatureAdvancedField(
                                "corpseDecayTimeSeconds",
                                Math.max(0, Number.parseFloat(event.target.value) || 0)
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Faction</legend>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Faction</span>
                        <div className="canvas-placeable-properties-field-control">
                          <select
                            value={creaturePropertiesDialog.draft.advancedSettings.faction}
                            onChange={(event) =>
                              updateCreatureAdvancedField("faction", event.target.value)
                            }
                          >
                            {CREATURE_FACTION_OPTIONS.map((faction) => (
                              <option key={faction} value={faction}>
                                {faction}
                              </option>
                            ))}
                          </select>
                          <button type="button" disabled>
                            Edit Factions
                          </button>
                        </div>
                      </label>
                    </fieldset>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Special</legend>
                      <div className="canvas-placeable-properties-dual-fields">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Subrace</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.advancedSettings.subrace}
                              onChange={(event) =>
                                updateCreatureAdvancedField("subrace", event.target.value)
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Deity</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.advancedSettings.deity}
                              onChange={(event) =>
                                updateCreatureAdvancedField("deity", event.target.value)
                              }
                            />
                          </div>
                        </label>
                      </div>
                      <div className="canvas-placeable-properties-variables-row">
                        <button type="button" disabled>
                          Apply Template
                        </button>
                      </div>
                    </fieldset>

                    <div className="canvas-creature-properties-advanced-special-grid">
                      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                        <legend>Challenge Rating</legend>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Calculated</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              type="number"
                              step="0.01"
                              value={creatureCalculatedChallengeRating.toFixed(2)}
                              readOnly
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Adjustment</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              type="number"
                              step="1"
                              value={
                                creaturePropertiesDialog.draft.advancedSettings
                                  .challengeRatingAdjustment
                              }
                              onChange={(event) =>
                                updateCreatureAdvancedField(
                                  "challengeRatingAdjustment",
                                  Number.parseFloat(event.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Challenge Rating</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={creaturePropertiesDialog.draft.challengeRating}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField(
                                  "challengeRating",
                                  Math.max(0, Number.parseFloat(event.target.value) || 0)
                                )
                              }
                            />
                          </div>
                        </label>
                      </fieldset>

                      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                        <legend>Sound / Perception</legend>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Sound Set</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.advancedSettings.soundSet}
                              onChange={(event) =>
                                updateCreatureAdvancedField("soundSet", event.target.value)
                              }
                            />
                            <button type="button" disabled>
                              ...
                            </button>
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Perception Range</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creaturePropertiesDialog.draft.advancedSettings.perceptionRange}
                              onChange={(event) =>
                                updateCreatureAdvancedField("perceptionRange", event.target.value)
                              }
                            >
                              {CREATURE_PERCEPTION_RANGE_OPTIONS.map((perceptionRange) => (
                                <option key={perceptionRange} value={perceptionRange}>
                                  {perceptionRange}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                      </fieldset>
                    </div>

                    <div className="canvas-placeable-properties-variables-row">
                      <button type="button">Variables</button>
                    </div>
                  </fieldset>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "feats" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Feats</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Type</th>
                        <th scope="col">Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatureFeatsRows.map((entry, index) => (
                        <tr key={`feat_${index + 1}_${entry.name}`}>
                          <td>{entry.name}</td>
                          <td>{entry.type}</td>
                          <td>
                            <input type="checkbox" checked={entry.assigned} readOnly />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="canvas-creature-properties-aux-row">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Filter</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureFeatsFilter}
                          onChange={(event) => setCreatureFeatsFilter(event.target.value)}
                        >
                          {CREATURE_FEAT_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled aria-label="Feats help">
                          ?
                        </button>
                      </div>
                    </label>
                  </div>
                  <label className="canvas-placeable-properties-fulltext">
                    <span>Feats Selection Summary</span>
                    <textarea value={creatureFeatsSummaryText} readOnly rows={7} />
                  </label>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "spells" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Spells</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Prepared</th>
                        <th scope="col">Name</th>
                        <th scope="col">Spell Level</th>
                        <th scope="col">Casting Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatureSpellsRows.map((entry, index) => (
                        <tr key={`spell_${index + 1}_${entry.name}`}>
                          <td>
                            <input type="checkbox" checked={entry.prepared} readOnly />
                          </td>
                          <td>{entry.name}</td>
                          <td>{entry.spellLevel}</td>
                          <td>{entry.castingLevel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="canvas-placeable-properties-dual-fields">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Spell Level</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureSpellsLevelFilter}
                          onChange={(event) => setCreatureSpellsLevelFilter(event.target.value)}
                        >
                          {CREATURE_SPELL_LEVEL_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Meta-Magic</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureSpellsMetaMagicFilter}
                          onChange={(event) =>
                            setCreatureSpellsMetaMagicFilter(event.target.value)
                          }
                        >
                          {CREATURE_METAMAGIC_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled aria-label="Spells help">
                          ?
                        </button>
                      </div>
                    </label>
                  </div>
                  <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                    <legend>Class</legend>
                    <div className="canvas-creature-properties-class-radio-grid">
                      {(creatureClassFilterEntries.length > 0
                        ? creatureClassFilterEntries
                        : ["Class 1"]
                      ).map((className, index) => (
                        <label
                          key={`${className || "class"}_${index + 1}`}
                          className="canvas-placeable-properties-toggle"
                        >
                          <input
                            type="radio"
                            name="creature-spells-class"
                            checked={creatureSpellsClassFilterIndex === index}
                            onChange={() => setCreatureSpellsClassFilterIndex(index)}
                          />
                          {className || `Class ${index + 1}`}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="canvas-placeable-properties-fulltext">
                    <span>Spell Selection Summary</span>
                    <textarea value={creatureSpellsSummaryText} readOnly rows={7} />
                  </label>
                  <div className="canvas-placeable-properties-script-actions">
                    <button type="button" disabled>
                      Clear Class Spell List
                    </button>
                    <button type="button" disabled>
                      Save Class Spell List
                    </button>
                    <button type="button" disabled>
                      Load Class Spell List
                    </button>
                  </div>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "specialAbilities" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Special Abilities</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Type</th>
                        <th scope="col">Caster Level</th>
                        <th scope="col">Uses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatureSpecialAbilitiesRows.map((entry, index) => (
                        <tr key={`ability_${index + 1}_${entry.name}`}>
                          <td>{entry.name}</td>
                          <td>{entry.type}</td>
                          <td>{entry.casterLevel}</td>
                          <td>{entry.uses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="canvas-creature-properties-aux-row">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Filter</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureSpecialAbilitiesFilter}
                          onChange={(event) =>
                            setCreatureSpecialAbilitiesFilter(event.target.value)
                          }
                        >
                          {CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled aria-label="Special abilities help">
                          ?
                        </button>
                      </div>
                    </label>
                  </div>
                  <label className="canvas-placeable-properties-fulltext">
                    <span>Special Abilities Selection Summary</span>
                    <textarea value={creatureSpecialAbilitiesSummaryText} readOnly rows={7} />
                  </label>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "comments" ? (
                <SharedLongTextPropertySection
                  sectionClassName="canvas-placeable-properties-group"
                  legend="Comments"
                  label="Comments"
                  value={creaturePropertiesDialog.draft.comments}
                  onChange={(nextValue) =>
                    updateCreaturePropertiesDraftField("comments", nextValue)
                  }
                  rows={10}
                />
              ) : null}
            </div>
          </section>

          <SharedDialogActionsFooter
            className="canvas-placeable-properties-actions"
            onApply={() => applyCreaturePropertiesDraft(false)}
            onOk={() => applyCreaturePropertiesDraft(true)}
            onCancel={() => cancelCreaturePropertiesDialog()}
          />
      </>
    </SharedPropertyDialogChrome>
  );
}

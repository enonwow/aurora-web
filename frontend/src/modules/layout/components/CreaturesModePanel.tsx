import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CREATURE_CREATION_WIZARD_STEPS,
  CREATURE_WIZARD_BODY_PART_FIELDS,
  CREATURE_WIZARD_COLOR_FIELDS,
  CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS,
  createCreatureSceneObjectFromWizardDraft,
  createCreatureWizardDraft,
  type CreatureCreationWizardDraft,
  type CreatureCreationWizardStep,
  type CreatureWizardColorField
} from "../../creatures/application/creatureCreationWizard";
import {
  AURORA_PLT_PALETTE_ROW_MAX,
  ensureAuroraPltPaletteDataLoaded,
  resolveAuroraPltPaletteRgbSync
} from "../../placeables/adapters/aurora/auroraPltPalette";
import type { SceneObject } from "../contracts";
import { SceneObjectThumbnail } from "./SceneObjectThumbnail";

interface CreaturesModePanelProps {
  objects: SceneObject[];
  total: number;
  activeObjectId: string | null;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onObjectClick: (object: SceneObject) => void;
  onCreateCreature?: (object: SceneObject) => void | Promise<void>;
  onDeleteCreature?: (object: SceneObject) => void | Promise<void>;
  isLoading: boolean;
  loadErrorMessage: string | null;
  previewErrorMessage: string | null;
  thumbnailRenderEnabled?: boolean;
  creationBaseObjects?: SceneObject[];
  createSequence?: number;
}

function trimWorkspacePreviewLabel(label: string): string {
  return label.slice(0, 8).toUpperCase();
}

const CREATURE_WIZARD_ABILITY_FIELDS = [
  { id: "strength", label: "STR" },
  { id: "dexterity", label: "DEX" },
  { id: "constitution", label: "CON" },
  { id: "intelligence", label: "INT" },
  { id: "wisdom", label: "WIS" },
  { id: "charisma", label: "CHA" }
] as const;

const CREATURE_WIZARD_PLT_SWATCH_SAMPLE_INDEX = 192;

const CREATURE_WIZARD_COLOR_PICKER_BY_FIELD: Record<
  CreatureWizardColorField,
  {
    layerIndex: number;
    fallbackHue: number;
    rows: readonly number[];
  }
> = {
  skin: {
    layerIndex: 0,
    fallbackHue: 27,
    rows: [1, 7, 18, 30, 45, 62, 82, 104]
  },
  hair: {
    layerIndex: 1,
    fallbackHue: 38,
    rows: [1, 8, 18, 32, 48, 72, 96, 128]
  },
  tattoo1: {
    layerIndex: 8,
    fallbackHue: 199,
    rows: [0, 12, 28, 44, 68, 92, 120, 156]
  },
  tattoo2: {
    layerIndex: 9,
    fallbackHue: 286,
    rows: [0, 10, 24, 40, 64, 88, 116, 148]
  }
};

function readNumberInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePltRowInput(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(AURORA_PLT_PALETTE_ROW_MAX, Math.trunc(parsed)));
}

function buildCreatureWizardColorRows(
  field: CreatureWizardColorField,
  currentValue: string
): number[] {
  const picker = CREATURE_WIZARD_COLOR_PICKER_BY_FIELD[field];
  const rows = [normalizePltRowInput(currentValue), ...picker.rows];
  return Array.from(new Set(rows));
}

function resolveCreatureWizardSwatchColor(
  field: CreatureWizardColorField,
  row: number
): string {
  const picker = CREATURE_WIZARD_COLOR_PICKER_BY_FIELD[field];
  const rgb = resolveAuroraPltPaletteRgbSync(
    picker.layerIndex,
    row,
    CREATURE_WIZARD_PLT_SWATCH_SAMPLE_INDEX
  );
  if (rgb) {
    return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
  }
  const lightness = 34 + (row / AURORA_PLT_PALETTE_ROW_MAX) * 34;
  return `hsl(${picker.fallbackHue} 58% ${lightness}%)`;
}

function CreatureWizardColorPicker({
  field,
  value,
  onChange
}: {
  field: { id: CreatureWizardColorField; label: string };
  value: string;
  onChange: (value: string) => void;
}) {
  const [, setPaletteRefresh] = useState(0);
  const selectedRow = normalizePltRowInput(value);
  const swatchRows = useMemo(
    () => buildCreatureWizardColorRows(field.id, value),
    [field.id, value]
  );
  const selectedColor = resolveCreatureWizardSwatchColor(field.id, selectedRow);

  useEffect(() => {
    let isMounted = true;
    void ensureAuroraPltPaletteDataLoaded().then(() => {
      if (isMounted) {
        setPaletteRefresh((version) => version + 1);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="creatures-mode-wizard-color-picker">
      <label>
        <span>{field.label}</span>
        <div className="creatures-mode-wizard-color-value">
          <span
            aria-hidden="true"
            className="creatures-mode-wizard-color-current"
            style={{ backgroundColor: selectedColor }}
          />
          <input
            aria-label={field.label}
            inputMode="numeric"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </label>
      <div
        className="creatures-mode-wizard-color-swatches"
        aria-label={`${field.label} PLT palette rows`}
      >
        {swatchRows.map((row) => (
          <button
            aria-label={`${field.label} row ${row}`}
            className={`creatures-mode-wizard-color-swatch${
              row === selectedRow ? " is-selected" : ""
            }`}
            key={row}
            onClick={() => onChange(String(row))}
            style={{ backgroundColor: resolveCreatureWizardSwatchColor(field.id, row) }}
            title={`${field.label} row ${row}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

function formatCreatureOptionLabel(object: SceneObject): string {
  const name = object.name?.trim();
  const label = name && name.toLowerCase() !== object.tag.toLowerCase() ? `${object.tag} - ${name}` : object.tag;
  return `${label} (${object.resRef})`;
}

export function CreaturesModePanel({
  objects,
  total,
  activeObjectId,
  searchQuery,
  onSearchQueryChange,
  onResetFilters,
  onObjectClick,
  onCreateCreature,
  onDeleteCreature,
  isLoading,
  loadErrorMessage,
  previewErrorMessage,
  thumbnailRenderEnabled = true,
  creationBaseObjects,
  createSequence
}: CreaturesModePanelProps) {
  const wizardBaseObjects = creationBaseObjects ?? objects;
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<CreatureCreationWizardStep>("template");
  const [wizardDraft, setWizardDraft] = useState<CreatureCreationWizardDraft | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const shouldShowEmpty = !isLoading && !loadErrorMessage && objects.length === 0;
  const hasActiveFilters = searchQuery.trim().length > 0;
  const resultLabel = hasActiveFilters ? `${objects.length}/${total}` : String(total);
  const wizardSequence = createSequence ?? total + 1;
  const selectedWizardBase = useMemo(() => {
    if (wizardBaseObjects.length < 1) {
      return null;
    }
    const draftBase = wizardDraft
      ? wizardBaseObjects.find((object) => object.id === wizardDraft.baseObjectId)
      : null;
    if (draftBase) {
      return draftBase;
    }
    return (
      wizardBaseObjects.find((object) => object.id === activeObjectId) ??
      wizardBaseObjects[0] ??
      null
    );
  }, [activeObjectId, wizardBaseObjects, wizardDraft]);
  const activeWizardStepIndex = CREATURE_CREATION_WIZARD_STEPS.findIndex(
    (step) => step.id === wizardStep
  );
  const selectedDynamicAppearanceOption = wizardDraft
    ? CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS.find(
        (option) => String(option.appearanceType) === wizardDraft.appearance
      )
    : undefined;
  const canCreateCreature = Boolean(onCreateCreature && wizardDraft && selectedWizardBase);

  const openWizard = () => {
    const base =
      wizardBaseObjects.find((object) => object.id === activeObjectId) ??
      wizardBaseObjects[0];
    if (!base) {
      return;
    }
    setWizardDraft(createCreatureWizardDraft(base, wizardSequence));
    setWizardStep("template");
    setCreateErrorMessage(null);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    if (isCreating) {
      return;
    }
    setCreateErrorMessage(null);
    setIsWizardOpen(false);
  };

  const updateDraft = (updater: (draft: CreatureCreationWizardDraft) => CreatureCreationWizardDraft) => {
    setWizardDraft((current) => (current ? updater(current) : current));
  };

  const goToAdjacentStep = (direction: -1 | 1) => {
    const nextIndex = Math.max(
      0,
      Math.min(CREATURE_CREATION_WIZARD_STEPS.length - 1, activeWizardStepIndex + direction)
    );
    setWizardStep(CREATURE_CREATION_WIZARD_STEPS[nextIndex]?.id ?? wizardStep);
  };

  const handleWizardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wizardDraft || !selectedWizardBase || !onCreateCreature) {
      return;
    }
    setCreateErrorMessage(null);
    let request: void | Promise<void>;
    try {
      request = onCreateCreature(
        createCreatureSceneObjectFromWizardDraft(wizardDraft, selectedWizardBase, wizardSequence)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.trim() : "Creature blueprint creation failed.";
      setCreateErrorMessage(message || "Creature blueprint creation failed.");
      return;
    }
    if (!request || typeof request.then !== "function") {
      setIsWizardOpen(false);
      return;
    }

    setIsCreating(true);
    void request
      .then(() => {
        setIsWizardOpen(false);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message.trim() : "Creature blueprint creation failed.";
        setCreateErrorMessage(message || "Creature blueprint creation failed.");
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  return (
    <article
      className="sidebar-section workspace-mode-panel creatures-mode-panel scene-objects-section scene-object-add-panel"
      aria-label="creatures mode section"
    >
      <header className="scene-objects-header scene-object-add-panel-header">
        <h2>Creatures</h2>
        <span
          className="scene-objects-total"
          title={hasActiveFilters ? "Filtered loaded creatures / total creatures" : "Total creatures"}
        >
          {resultLabel}
        </span>
      </header>

      {onCreateCreature ? (
        <button
          type="button"
          className="creatures-mode-create-button"
          onClick={openWizard}
          disabled={wizardBaseObjects.length < 1}
        >
          New Creature
        </button>
      ) : null}

      {isWizardOpen && wizardDraft ? (
        <form
          className="creatures-mode-wizard"
          aria-label="creature creation wizard"
          onSubmit={handleWizardSubmit}
        >
          <div className="creatures-mode-wizard-tabs" role="tablist" aria-label="creature wizard steps">
            {CREATURE_CREATION_WIZARD_STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={wizardStep === step.id}
                className={`creatures-mode-wizard-tab ${wizardStep === step.id ? "is-active" : ""}`}
                onClick={() => setWizardStep(step.id)}
              >
                {step.label}
              </button>
            ))}
          </div>

          {createErrorMessage ? (
            <p className="scene-objects-empty" role="alert">
              {createErrorMessage}
            </p>
          ) : null}

          {wizardStep === "template" ? (
            <div className="creatures-mode-wizard-page">
              <label>
                <span>Base blueprint</span>
                <select
                  value={wizardDraft.baseObjectId}
                  onChange={(event) => {
                    const base = wizardBaseObjects.find(
                      (object) => object.id === event.target.value
                    );
                    if (!base) {
                      return;
                    }
                    setWizardDraft(createCreatureWizardDraft(base, wizardSequence));
                  }}
                >
                  {wizardBaseObjects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {formatCreatureOptionLabel(object)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="creatures-mode-wizard-template-summary" aria-label="selected creature template">
                <span>{selectedWizardBase?.tag ?? "CREATURE"}</span>
                <strong>{selectedWizardBase?.resRef ?? "creature"}</strong>
              </div>
            </div>
          ) : null}

          {wizardStep === "identity" ? (
            <div className="creatures-mode-wizard-page">
              <div className="creatures-mode-wizard-grid">
                <label>
                  <span>Name</span>
                  <input
                    value={wizardDraft.name}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>ResRef</span>
                  <input
                    value={wizardDraft.resRef}
                    maxLength={16}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, resRef: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Tag</span>
                  <input
                    value={wizardDraft.tag}
                    maxLength={32}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, tag: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>First</span>
                  <input
                    value={wizardDraft.firstName}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, firstName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Last</span>
                  <input
                    value={wizardDraft.lastName}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, lastName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Race</span>
                  <input
                    value={wizardDraft.race}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, race: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Gender</span>
                  <input
                    value={wizardDraft.gender}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, gender: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Phenotype</span>
                  <input
                    value={wizardDraft.phenotype}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, phenotype: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Alignment</span>
                  <input
                    value={wizardDraft.alignment}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, alignment: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="creatures-mode-wizard-wide-field">
                <span>Description</span>
                <textarea
                  value={wizardDraft.description}
                  onChange={(event) =>
                    updateDraft((draft) => ({ ...draft, description: event.target.value }))
                  }
                />
              </label>
            </div>
          ) : null}

          {wizardStep === "appearance" ? (
            <div className="creatures-mode-wizard-page">
              <label className="creatures-mode-wizard-wide-field">
                <span>Appearance</span>
                <select
                  aria-label="Appearance type"
                  value={wizardDraft.appearance}
                  onChange={(event) =>
                    updateDraft((draft) => ({ ...draft, appearance: event.target.value }))
                  }
                >
                  {selectedDynamicAppearanceOption ? null : (
                    <option value={wizardDraft.appearance}>
                      Custom row {wizardDraft.appearance}
                    </option>
                  )}
                  {CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS.map((option) => (
                    <option key={option.appearanceType} value={option.appearanceType}>
                      {option.label} - row {option.appearanceType} / race {option.raceModel}
                    </option>
                  ))}
                </select>
              </label>
              <div className="creatures-mode-wizard-parts" aria-label="body part controls">
                {CREATURE_WIZARD_BODY_PART_FIELDS.map((field) => (
                  <label key={field.id}>
                    <span>{field.label}</span>
                    <input
                      inputMode="numeric"
                      value={wizardDraft.bodyParts[field.id]}
                      onChange={(event) =>
                        updateDraft((draft) => ({
                          ...draft,
                          bodyParts: {
                            ...draft.bodyParts,
                            [field.id]: event.target.value
                          }
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="creatures-mode-wizard-colors" aria-label="plt color controls">
                {CREATURE_WIZARD_COLOR_FIELDS.map((field) => (
                  <CreatureWizardColorPicker
                    field={field}
                    key={field.id}
                    value={wizardDraft.colors[field.id]}
                    onChange={(value) =>
                      updateDraft((draft) => ({
                        ...draft,
                        colors: {
                          ...draft.colors,
                          [field.id]: value
                        }
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {wizardStep === "stats" ? (
            <div className="creatures-mode-wizard-page">
              <div className="creatures-mode-wizard-grid">
                <label>
                  <span>CR</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={wizardDraft.challengeRating}
                    onChange={(event) =>
                      updateDraft((draft) => ({
                        ...draft,
                        challengeRating: readNumberInput(event.target.value, draft.challengeRating)
                      }))
                    }
                  />
                </label>
                <label>
                  <span>HP</span>
                  <input
                    type="number"
                    min="1"
                    value={wizardDraft.hitPoints}
                    onChange={(event) =>
                      updateDraft((draft) => ({
                        ...draft,
                        hitPoints: Math.max(1, readNumberInput(event.target.value, draft.hitPoints))
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Move</span>
                  <input
                    value={wizardDraft.movementRate}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, movementRate: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="creatures-mode-wizard-abilities" aria-label="ability score controls">
                {CREATURE_WIZARD_ABILITY_FIELDS.map((field) => (
                  <label key={field.id}>
                    <span>{field.label}</span>
                    <input
                      type="number"
                      min="1"
                      max="255"
                      value={wizardDraft.abilityScores[field.id]}
                      onChange={(event) =>
                        updateDraft((draft) => ({
                          ...draft,
                          abilityScores: {
                            ...draft.abilityScores,
                            [field.id]: readNumberInput(
                              event.target.value,
                              draft.abilityScores[field.id]
                            )
                          }
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="creatures-mode-wizard-flags" aria-label="creature flags">
                <label>
                  <input
                    type="checkbox"
                    checked={wizardDraft.plot}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, plot: event.target.checked }))
                    }
                  />
                  <span>Plot</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={wizardDraft.immortal}
                    onChange={(event) =>
                      updateDraft((draft) => ({ ...draft, immortal: event.target.checked }))
                    }
                  />
                  <span>Immortal</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={wizardDraft.leavesLootableCorpse}
                    onChange={(event) =>
                      updateDraft((draft) => ({
                        ...draft,
                        leavesLootableCorpse: event.target.checked
                      }))
                    }
                  />
                  <span>Lootable</span>
                </label>
              </div>
            </div>
          ) : null}

          <footer className="creatures-mode-wizard-actions">
            <button type="button" onClick={closeWizard} disabled={isCreating}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => goToAdjacentStep(-1)}
              disabled={isCreating || activeWizardStepIndex <= 0}
            >
              Back
            </button>
            {activeWizardStepIndex < CREATURE_CREATION_WIZARD_STEPS.length - 1 ? (
              <button type="button" onClick={() => goToAdjacentStep(1)} disabled={isCreating}>
                Next
              </button>
            ) : (
              <button type="submit" disabled={!canCreateCreature || isCreating}>
                Create
              </button>
            )}
          </footer>
        </form>
      ) : null}

      <div className="scene-objects-search">
        <input
          type="search"
          aria-label="Filter creatures"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Filter by id / resref"
        />
        {searchQuery ? (
          <button
            type="button"
            className="scene-objects-search-clear"
            aria-label="Clear creatures filter"
            title="Clear filter"
            onClick={() => onSearchQueryChange("")}
          >
            X
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          className="scene-objects-filter-reset"
          aria-label="Reset creatures filters"
          onClick={onResetFilters}
        >
          Reset filters
        </button>
      ) : null}

      {isLoading ? (
        <p className="scene-objects-empty" role="status">
          Loading creatures from backend...
        </p>
      ) : null}
      {loadErrorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {loadErrorMessage}
        </p>
      ) : null}
      {previewErrorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {previewErrorMessage}
        </p>
      ) : null}

      {shouldShowEmpty ? (
        <p className="scene-objects-empty">No creatures available.</p>
      ) : (
        <ul className="scene-object-list scene-object-add-list" aria-label="creatures mode list">
          {objects.map((object) => {
            const isSelected = object.id === activeObjectId;
            const canDeleteCreature =
              Boolean(onDeleteCreature) && object.id.startsWith("cre_wizard_");
            const resourceLabel =
              object.id.trim().toLowerCase() === object.resRef.trim().toLowerCase()
                ? object.resRef
                : `${object.id} / ${object.resRef}`;
            return (
              <li
                className={canDeleteCreature ? "scene-object-add-list-item has-row-action" : undefined}
                key={object.id}
              >
                <button
                  type="button"
                  className={`scene-object-row scene-object-add-row ${isSelected ? "is-selected" : ""}`}
                  aria-selected={isSelected}
                  onClick={() => onObjectClick(object)}
                >
                  <SceneObjectThumbnail
                    object={object}
                    fallbackLabel={trimWorkspacePreviewLabel(object.tag)}
                    thumbnailRenderEnabled={thumbnailRenderEnabled}
                  />
                  <span className="scene-object-row-meta scene-object-add-row-meta">
                    <strong title={object.tag}>{object.tag}</strong>
                    <small title={resourceLabel}>{resourceLabel}</small>
                  </span>
                </button>
                {canDeleteCreature ? (
                  <button
                    type="button"
                    className="scene-object-row-action"
                    aria-label={`Delete custom creature ${object.tag}`}
                    title="Delete custom creature"
                    onClick={() => {
                      void Promise.resolve(onDeleteCreature?.(object)).catch(() => undefined);
                    }}
                  >
                    X
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

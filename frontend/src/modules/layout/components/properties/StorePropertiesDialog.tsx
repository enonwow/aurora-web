import type { PointerEventHandler, Ref } from "react";

import type {
  StorePropertiesDialogState,
} from "../../application/storePropertiesDraft";
import type { SceneItemBaseItemCatalog } from "../../../scene/contracts";
import { readItemBaseItemCatalog } from "../../../scene/domain/itemBaseAppearance";
import { STORE_EDITOR_COMMENT_MAX_CODE_UNITS } from
  "../../../scene/domain/storeEditorComment";
import {
  isAreaStoreCommerceValue,
  type AreaStoreCommerceValue,
} from "../../../scene/domain/storeCommerce";
import {
  AREA_STORE_SCRIPT_RESREF_MAX_CODE_UNITS,
  isAreaStoreScriptResRefsTargetValue,
  type AreaStoreScriptResRefsValue,
} from "../../../scene/domain/storeScriptResRefs";
import {
  readStoreVariableTargetEntries,
} from "../../../scene/domain/storeVariableTable";
import {
  MAX_AREA_STORE_RESTRICTION_ENTRIES,
  readStoreRestrictionsTarget,
  type AreaStoreRestrictionsTarget,
} from "../../../scene/domain/storeRestrictions";
import type {
  AreaStoreInventoryTargetBucket,
} from "../../../scene/domain/storeInventory";
import type { AuroraVariableTargetEntry } from
  "../../../shared/domain/auroraVariableTable";
import { AuroraVariableTableEditor } from "./AuroraVariableTableEditor";
import {
  SharedDialogActionsFooter,
  SharedLongTextPropertySection,
  SharedPropertyDialogChrome,
} from "./SharedPropertyDialogSections";

export type StorePropertiesDialogViewModel = Omit<
  StorePropertiesDialogState,
  "snapshotObject" | "anchorOffsetX" | "anchorOffsetY"
>;

interface StorePropertiesDialogProps {
  dialog: StorePropertiesDialogViewModel;
  articleRef?: Ref<HTMLElement>;
  onToggleCollapsed: () => void;
  onClose: () => void;
  onCommentsChange: (value: string) => void;
  onCommerceChange: (value: AreaStoreCommerceValue) => void;
  onScriptResRefsChange: (value: AreaStoreScriptResRefsValue) => void;
  onVariablesChange: (value: readonly AuroraVariableTargetEntry[]) => void;
  itemBaseItemCatalog?: SceneItemBaseItemCatalog | null;
  onRestrictionsChange: (value: AreaStoreRestrictionsTarget) => void;
  onInventoryChange: (value: readonly AreaStoreInventoryTargetBucket[]) => void;
  onApply: (closeAfterApply: boolean) => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
  onHeaderPointerMove?: PointerEventHandler<HTMLElement>;
  onHeaderPointerUp?: PointerEventHandler<HTMLElement>;
  onHeaderPointerCancel?: PointerEventHandler<HTMLElement>;
}

export function StorePropertiesDialog({
  dialog,
  articleRef,
  onToggleCollapsed,
  onClose,
  onCommentsChange,
  onCommerceChange,
  onScriptResRefsChange,
  onVariablesChange,
  itemBaseItemCatalog,
  onRestrictionsChange,
  onInventoryChange,
  onApply,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
}: StorePropertiesDialogProps) {
  const editable = dialog.draft.commentControlState === "ACTIVE_NOW";
  const commerceEditable = dialog.draft.commerceControlState === "ACTIVE_NOW" &&
    dialog.draft.commerce !== null;
  const scriptEditable = dialog.draft.scriptControlState === "ACTIVE_NOW" &&
    dialog.draft.scriptResRefs !== null;
  const variableEditable = dialog.draft.variableControlState === "ACTIVE_NOW" &&
    dialog.draft.variables !== null;
  const catalog = readItemBaseItemCatalog(itemBaseItemCatalog);
  const restrictions = catalog
    ? readStoreRestrictionsTarget(
      dialog.draft.restrictions,
      catalog.descriptor.rowCount,
    )
    : null;
  const restrictionEditable = dialog.draft.restrictionControlState === "ACTIVE_NOW" &&
    restrictions !== null && catalog !== null;
  const inventoryBuckets = dialog.draft.inventoryBuckets;
  const inventoryEditable = dialog.draft.inventoryControlState === "ACTIVE_NOW" &&
    inventoryBuckets !== null && catalog !== null;
  const commerce = dialog.draft.commerce;
  const scriptResRefs = dialog.draft.scriptResRefs;
  const variables = dialog.draft.variables ?? [];
  const updateNumber = (
    field: Exclude<keyof AreaStoreCommerceValue, "blackMarket">,
    rawValue: string,
  ) => {
    if (!commerceEditable || !commerce) return;
    if (rawValue.trim() === "") return;
    const next = { ...commerce, [field]: Number(rawValue) };
    if (isAreaStoreCommerceValue(next)) onCommerceChange(next);
  };
  const updateScriptResRef = (
    field: keyof AreaStoreScriptResRefsValue,
    value: string,
  ) => {
    if (!scriptEditable || !scriptResRefs) return;
    const next = { ...scriptResRefs, [field]: value };
    if (isAreaStoreScriptResRefsTargetValue(next)) onScriptResRefsChange(next);
  };
  const commitVariables = (next: readonly AuroraVariableTargetEntry[]) => {
    if (!variableEditable) return;
    const parsed = readStoreVariableTargetEntries(next);
    if (parsed !== null) onVariablesChange(parsed.map((entry) => ({ ...entry })));
  };
  const commitRestrictions = (next: AreaStoreRestrictionsTarget) => {
    if (!restrictionEditable || !catalog) return;
    const parsed = readStoreRestrictionsTarget(next, catalog.descriptor.rowCount);
    if (parsed !== null) {
      onRestrictionsChange({
        willNotBuy: [...parsed.willNotBuy],
        willOnlyBuy: [...parsed.willOnlyBuy],
      });
    }
  };
  const restrictionEntryCount = (restrictions?.willNotBuy.length ?? 0) +
    (restrictions?.willOnlyBuy.length ?? 0);
  const commitInventory = (next: readonly AreaStoreInventoryTargetBucket[]) => {
    if (!inventoryEditable) return;
    onInventoryChange(next.map((bucket) => ({
      bucketTypeId: bucket.bucketTypeId,
      entries: bucket.entries.map((entry) => ({ ...entry })),
    })));
  };
  const renderRestrictionList = (
    key: keyof AreaStoreRestrictionsTarget,
    label: "Will Not Buy" | "Will Only Buy",
  ) => {
    const entries = restrictions?.[key] ?? [];
    const replaceEntries = (nextEntries: readonly number[]) => commitRestrictions({
      willNotBuy: key === "willNotBuy" ? nextEntries : restrictions?.willNotBuy ?? [],
      willOnlyBuy: key === "willOnlyBuy" ? nextEntries : restrictions?.willOnlyBuy ?? [],
    });
    return (
      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
        <legend>{label}</legend>
        <table className="canvas-creature-properties-table">
          <thead>
            <tr>
              <th scope="col">Base Item</th>
              <th scope="col" aria-label={`${label} order and removal`} />
            </tr>
          </thead>
          <tbody>
            {entries.map((baseItemId, index) => (
              <tr key={`${label}-${index}`}>
                <td>
                  <select
                    aria-label={`${label} entry ${index + 1} Base Item`}
                    value={baseItemId}
                    disabled={!restrictionEditable}
                    onChange={(event) => replaceEntries(entries.map((entry, entryIndex) =>
                      entryIndex === index ? Number(event.currentTarget.value) : entry))}
                  >
                    {catalog?.rows.map((row) => (
                      <option key={row.rowIndex} value={row.rowIndex}>
                        {row.rowIndex}: {row.displayName}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    aria-label={`Move ${label} restriction ${index + 1} up`}
                    disabled={!restrictionEditable || index === 0}
                    onClick={() => {
                      if (index === 0) return;
                      const next = [...entries];
                      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                      replaceEntries(next);
                    }}
                  >↑</button>
                  <button
                    type="button"
                    aria-label={`Move ${label} restriction ${index + 1} down`}
                    disabled={!restrictionEditable || index === entries.length - 1}
                    onClick={() => {
                      if (index >= entries.length - 1) return;
                      const next = [...entries];
                      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                      replaceEntries(next);
                    }}
                  >↓</button>
                  <button
                    type="button"
                    aria-label={`Remove ${label} restriction ${index + 1}`}
                    disabled={!restrictionEditable}
                    onClick={() => replaceEntries(entries.filter((_, entryIndex) =>
                      entryIndex !== index))}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          aria-label={`Add ${label} restriction`}
          disabled={!restrictionEditable || !catalog?.rows[0] ||
            restrictionEntryCount >= MAX_AREA_STORE_RESTRICTION_ENTRIES}
          onClick={() => {
            const firstRow = catalog?.rows[0];
            if (firstRow) replaceEntries([...entries, firstRow.rowIndex]);
          }}
        >Add restriction</button>
      </fieldset>
    );
  };
  return (
    <SharedPropertyDialogChrome
      articleRef={articleRef}
      articleClassName="canvas-store-properties-dialog"
      ariaLabel="Store properties"
      windowX={dialog.windowX}
      windowY={dialog.windowY}
      headerClassName="canvas-store-properties-header"
      headerCopyClassName="canvas-store-properties-header-copy"
      headerActionsClassName="canvas-store-properties-header-actions"
      title="Store Properties"
      subtitle={`Verified Comment + commerce + script + VarTable + restrictions + retained inventory subset · ${dialog.objectId}`}
      collapsed={dialog.collapsed}
      collapseLabel="Collapse Store properties dialog"
      expandLabel="Expand Store properties dialog"
      closeLabel="Close Store properties dialog"
      onToggleCollapsed={onToggleCollapsed}
      onClose={onClose}
      onArticleMouseDown={(event) => event.stopPropagation()}
      onArticleContextMenu={(event) => event.preventDefault()}
      onHeaderPointerDown={onHeaderPointerDown}
      onHeaderPointerMove={onHeaderPointerMove}
      onHeaderPointerUp={onHeaderPointerUp}
      onHeaderPointerCancel={onHeaderPointerCancel}
    >
      <section className="canvas-store-properties-body">
        <p className="canvas-store-properties-evidence-note">
          This increment edits the exact paired-GIC Comment, complete native Store
          commerce vector, exact OnOpenStore/OnStoreClosed ResRefs, the ordered native
          VarTable, ordered WillNotBuy/WillOnlyBuy lists, and retained entries in all five
          native Store repositories. Inventory entries can be reordered, removed, or have
          Infinite toggled; adding entries and changing embedded item identity remain
          preserve-only.
        </p>
        <SharedLongTextPropertySection
          sectionClassName="canvas-store-properties-group"
          legend={<>Comments: <strong>{dialog.draft.commentControlState}</strong></>}
          label="Store Comments"
          value={dialog.draft.comments}
          rows={8}
          disabled={!editable}
          maxLength={STORE_EDITOR_COMMENT_MAX_CODE_UNITS}
          onChange={onCommentsChange}
        />
        <fieldset className="canvas-store-properties-group canvas-store-commerce-group">
          <legend>Commerce: <strong>{dialog.draft.commerceControlState}</strong></legend>
          <label>
            Mark Up
            <input
              aria-label="Mark Up"
              type="number"
              step={1}
              min={-2_147_483_648}
              max={2_147_483_647}
              value={commerce?.markUp ?? ""}
              disabled={!commerceEditable}
              onChange={(event) => updateNumber("markUp", event.currentTarget.value)}
            />
          </label>
          <label>
            Mark Down
            <input
              aria-label="Mark Down"
              type="number"
              step={1}
              min={-2_147_483_648}
              max={2_147_483_647}
              value={commerce?.markDown ?? ""}
              disabled={!commerceEditable}
              onChange={(event) => updateNumber("markDown", event.currentTarget.value)}
            />
          </label>
          <label className="canvas-store-properties-checkbox">
            <input
              aria-label="Black Market"
              type="checkbox"
              checked={commerce?.blackMarket ?? false}
              disabled={!commerceEditable}
              onChange={(event) => {
                if (commerceEditable && commerce) {
                  onCommerceChange({ ...commerce, blackMarket: event.currentTarget.checked });
                }
              }}
            />
            Black Market
          </label>
          <label>
            Black Market Mark Down
            <input
              aria-label="Black Market Mark Down"
              type="number"
              step={1}
              min={-2_147_483_648}
              max={2_147_483_647}
              value={commerce?.blackMarketMarkDown ?? ""}
              disabled={!commerceEditable}
              onChange={(event) => updateNumber("blackMarketMarkDown", event.currentTarget.value)}
            />
          </label>
          <label>
            Identify Price
            <input
              aria-label="Identify Price"
              type="number"
              step={1}
              min={-2_147_483_648}
              max={2_147_483_647}
              value={commerce?.identifyPrice ?? ""}
              disabled={!commerceEditable}
              onChange={(event) => updateNumber("identifyPrice", event.currentTarget.value)}
            />
          </label>
          <label>
            Maximum Buy Price
            <input
              aria-label="Maximum Buy Price"
              type="number"
              step={1}
              min={-2_147_483_648}
              max={2_147_483_647}
              value={commerce?.maxBuyPrice ?? ""}
              disabled={!commerceEditable}
              onChange={(event) => updateNumber("maxBuyPrice", event.currentTarget.value)}
            />
          </label>
          <label>
            Store Gold
            <input
              aria-label="Store Gold"
              type="number"
              step={1}
              min={-2_147_483_648}
              max={2_147_483_647}
              value={commerce?.storeGold ?? ""}
              disabled={!commerceEditable}
              onChange={(event) => updateNumber("storeGold", event.currentTarget.value)}
            />
          </label>
        </fieldset>
        <fieldset className="canvas-store-properties-group canvas-store-scripts-group">
          <legend>Scripts: <strong>{dialog.draft.scriptControlState}</strong></legend>
          <label>
            On Open Store
            <input
              aria-label="On Open Store Script"
              type="text"
              maxLength={AREA_STORE_SCRIPT_RESREF_MAX_CODE_UNITS}
              pattern="[a-z0-9_]{0,16}"
              value={scriptResRefs?.onOpenStore ?? ""}
              disabled={!scriptEditable}
              onChange={(event) => updateScriptResRef(
                "onOpenStore",
                event.currentTarget.value,
              )}
            />
          </label>
          <label>
            On Store Closed
            <input
              aria-label="On Store Closed Script"
              type="text"
              maxLength={AREA_STORE_SCRIPT_RESREF_MAX_CODE_UNITS}
              pattern="[a-z0-9_]{0,16}"
              value={scriptResRefs?.onStoreClosed ?? ""}
              disabled={!scriptEditable}
              onChange={(event) => updateScriptResRef(
                "onStoreClosed",
                event.currentTarget.value,
              )}
            />
          </label>
        </fieldset>
        <section className="canvas-store-properties-group canvas-store-variables-group">
          <p>Variables: <strong>{dialog.draft.variableControlState}</strong></p>
          <AuroraVariableTableEditor
            entries={variables}
            editable={variableEditable}
            ariaLabelPrefix="Store variable"
            actionAriaLabelPrefix="Store variable"
            addButtonAriaLabel="Add Store variable"
            onAdd={() => commitVariables([
              ...variables,
              { name: "", type: "int", value: 0 },
            ])}
            onUpdate={(index, entry) => commitVariables(
              variables.map((candidate, candidateIndex) =>
                candidateIndex === index ? entry : candidate),
            )}
            onMove={(index, direction) => {
              const targetIndex = direction === "up" ? index - 1 : index + 1;
              if (targetIndex < 0 || targetIndex >= variables.length) return;
              const next = variables.map((entry) => ({ ...entry }));
              [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
              commitVariables(next);
            }}
            onRemove={(index) => commitVariables(
              variables.filter((_, candidateIndex) => candidateIndex !== index),
            )}
          />
        </section>
        <section className="canvas-store-properties-group canvas-store-restrictions-group">
          <p>Restrictions: <strong>{dialog.draft.restrictionControlState}</strong></p>
          {renderRestrictionList("willNotBuy", "Will Not Buy")}
          {renderRestrictionList("willOnlyBuy", "Will Only Buy")}
        </section>
        <section className="canvas-store-properties-group canvas-store-inventory-group">
          <p>Retained inventory: <strong>{dialog.draft.inventoryControlState}</strong></p>
          {(inventoryBuckets ?? []).map((bucket, bucketIndex) => (
            <fieldset
              className="canvas-placeable-properties-group canvas-placeable-properties-nested"
              key={bucket.bucketTypeId}
            >
              <legend>Repository {bucketIndex + 1} · native type {bucket.bucketTypeId}</legend>
              <table className="canvas-creature-properties-table">
                <thead>
                  <tr>
                    <th scope="col">Retained item</th>
                    <th scope="col">Infinite</th>
                    <th scope="col" aria-label={`Repository ${bucketIndex + 1} order and removal`} />
                  </tr>
                </thead>
                <tbody>
                  {bucket.entries.map((entry, entryIndex) => (
                    <tr key={`${bucket.bucketTypeId}-${entry.sourceIndex}`}>
                      <td>
                        <span>{entry.resRef}</span>
                        <small>
                          BaseItem {entry.baseItemId}: {catalog?.rows[entry.baseItemId]?.displayName ??
                            "catalog row unavailable"}
                        </small>
                      </td>
                      <td>
                        <input
                          aria-label={`Repository ${bucketIndex + 1} item ${entryIndex + 1} Infinite`}
                          type="checkbox"
                          checked={entry.infinite}
                          disabled={!inventoryEditable}
                          onChange={(event) => commitInventory(inventoryBuckets!.map(
                            (candidateBucket, candidateBucketIndex) =>
                              candidateBucketIndex === bucketIndex
                                ? {
                                    ...candidateBucket,
                                    entries: candidateBucket.entries.map(
                                      (candidateEntry, candidateEntryIndex) =>
                                        candidateEntryIndex === entryIndex
                                          ? {
                                              ...candidateEntry,
                                              infinite: event.currentTarget.checked,
                                            }
                                          : candidateEntry,
                                    ),
                                  }
                                : candidateBucket,
                          ))}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-label={`Move repository ${bucketIndex + 1} item ${entryIndex + 1} up`}
                          disabled={!inventoryEditable || entryIndex === 0}
                          onClick={() => {
                            if (!inventoryBuckets || entryIndex === 0) return;
                            const next = inventoryBuckets.map((candidateBucket) => ({
                              ...candidateBucket,
                              entries: candidateBucket.entries.map((candidate) => ({ ...candidate })),
                            }));
                            const entries = next[bucketIndex]!.entries as
                              Array<(typeof bucket.entries)[number]>;
                            [entries[entryIndex - 1], entries[entryIndex]] =
                              [entries[entryIndex]!, entries[entryIndex - 1]!];
                            commitInventory(next);
                          }}
                        >↑</button>
                        <button
                          type="button"
                          aria-label={`Move repository ${bucketIndex + 1} item ${entryIndex + 1} down`}
                          disabled={!inventoryEditable || entryIndex === bucket.entries.length - 1}
                          onClick={() => {
                            if (!inventoryBuckets || entryIndex >= bucket.entries.length - 1) return;
                            const next = inventoryBuckets.map((candidateBucket) => ({
                              ...candidateBucket,
                              entries: candidateBucket.entries.map((candidate) => ({ ...candidate })),
                            }));
                            const entries = next[bucketIndex]!.entries as
                              Array<(typeof bucket.entries)[number]>;
                            [entries[entryIndex], entries[entryIndex + 1]] =
                              [entries[entryIndex + 1]!, entries[entryIndex]!];
                            commitInventory(next);
                          }}
                        >↓</button>
                        <button
                          type="button"
                          aria-label={`Remove repository ${bucketIndex + 1} item ${entryIndex + 1}`}
                          disabled={!inventoryEditable}
                          onClick={() => {
                            if (!inventoryBuckets) return;
                            commitInventory(inventoryBuckets.map(
                              (candidateBucket, candidateBucketIndex) =>
                                candidateBucketIndex === bucketIndex
                                  ? {
                                      ...candidateBucket,
                                      entries: candidateBucket.entries.filter(
                                        (_, candidateEntryIndex) =>
                                          candidateEntryIndex !== entryIndex,
                                      ),
                                    }
                                  : candidateBucket,
                            ));
                          }}
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bucket.entries.length === 0 ? <p>No retained entries.</p> : null}
            </fieldset>
          ))}
        </section>
        <SharedDialogActionsFooter
          className="canvas-store-properties-actions"
          onApply={() => onApply(false)}
          onOk={() => onApply(true)}
          onCancel={onClose}
          applyDisabled={!editable && !commerceEditable && !scriptEditable && !variableEditable &&
            !restrictionEditable && !inventoryEditable}
          okDisabled={!editable && !commerceEditable && !scriptEditable && !variableEditable &&
            !restrictionEditable && !inventoryEditable}
        />
      </section>
    </SharedPropertyDialogChrome>
  );
}

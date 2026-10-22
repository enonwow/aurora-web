import { useState } from "react";
import { AREA_NAME_LANGUAGE_CATALOG } from "../../../areas/domain/areaNameLanguageCatalog";
import type { SceneObjectEditableLocalizedStringEntry } from "../../../scene/contracts";

function moveLocalizedEntry(
  entries: readonly SceneObjectEditableLocalizedStringEntry[],
  index: number,
  offset: -1 | 1,
): readonly SceneObjectEditableLocalizedStringEntry[] {
  const targetIndex = index + offset;
  if (index < 0 || targetIndex < 0 || targetIndex >= entries.length) return entries;
  const nextEntries = entries.map((entry) => ({ ...entry }));
  [nextEntries[index], nextEntries[targetIndex]] = [
    nextEntries[targetIndex]!,
    nextEntries[index]!,
  ];
  return nextEntries;
}

export function LocalizedStringEntryEditor({
  objectLabel,
  fieldLabel,
  entries,
  defaultTextMaxLength,
  entryTextMaxLength,
  maxEntries,
  maxTotalTextLength,
  isInlineText,
  onChange,
}: Readonly<{
  objectLabel: "Placeable" | "Item" | "Creature";
  fieldLabel: "Name" | "First Name" | "Last Name" | "Description" | "Identified Description";
  entries: readonly SceneObjectEditableLocalizedStringEntry[] | undefined;
  defaultTextMaxLength: number;
  entryTextMaxLength: number;
  maxEntries: number;
  maxTotalTextLength: number;
  isInlineText: (value: string, maxBytes: number) => boolean;
  onChange: (entries: readonly SceneObjectEditableLocalizedStringEntry[]) => void;
}>) {
  const [newEntryIdentifier, setNewEntryIdentifier] = useState("");
  const [newEntryText, setNewEntryText] = useState("");
  if (!entries) return null;

  const hasDefaultEntry = entries.some((entry) => entry.languageId === 0);
  const missingCatalogEntries = AREA_NAME_LANGUAGE_CATALOG.filter((catalogEntry) =>
    !entries.some((entry) => entry.languageId === catalogEntry.storageEntryIdentifier) &&
    (hasDefaultEntry || catalogEntry.storageEntryIdentifier === 0));
  const selectedCatalogEntry = missingCatalogEntries.find(
    (entry) => String(entry.storageEntryIdentifier) === newEntryIdentifier,
  ) ?? missingCatalogEntries[0];
  const selectedEntryMaxLength = selectedCatalogEntry?.storageEntryIdentifier === 0
    ? defaultTextMaxLength
    : entryTextMaxLength;
  const newEntryTextValid = newEntryText.length > 0 &&
    entries.length < maxEntries &&
    isInlineText(newEntryText, selectedEntryMaxLength) &&
    entries.reduce((sum, entry) => sum + entry.text.length, 0) + newEntryText.length <=
      maxTotalTextLength;

  return (
    <>
      <p role="note" aria-label={`${objectLabel} ${fieldLabel} localization profile`}>
        Ordered inline printable-ASCII storage is editable. Existing numeric identifiers
        are retained exactly; new entries are limited to the verified Aurora language catalog.
        TLK-backed and non-ASCII storage remains preserve-only.
      </p>
      <fieldset aria-label={`${objectLabel} ${fieldLabel} localized entries`}>
        <legend>{`Localized ${fieldLabel} entries`}</legend>
        {entries.length === 0 ? <p>No inline entries.</p> : null}
        {entries.map((entry, index) => {
          const catalogEntry = AREA_NAME_LANGUAGE_CATALOG.find(
            (candidate) => candidate.storageEntryIdentifier === entry.languageId,
          );
          return (
            <div key={entry.languageId}>
              <label>
                {`${catalogEntry?.displayName ?? "Unresolved source identifier"} — Entry ${entry.languageId}`}
                <input
                  aria-label={`${objectLabel} ${fieldLabel} entry ${entry.languageId}`}
                  value={entry.text}
                  maxLength={entry.languageId === 0
                    ? defaultTextMaxLength
                    : entryTextMaxLength}
                  onChange={(event) => onChange(entries.map((candidate) =>
                    candidate.languageId === entry.languageId
                      ? { ...candidate, text: event.target.value }
                      : { ...candidate }))}
                />
              </label>
              <button
                type="button"
                aria-label={`Move ${objectLabel} ${fieldLabel} entry ${entry.languageId} up`}
                disabled={index === 0}
                onClick={() => onChange(moveLocalizedEntry(entries, index, -1))}
              >
                Move up
              </button>
              <button
                type="button"
                aria-label={`Move ${objectLabel} ${fieldLabel} entry ${entry.languageId} down`}
                disabled={index === entries.length - 1}
                onClick={() => onChange(moveLocalizedEntry(entries, index, 1))}
              >
                Move down
              </button>
              <button
                type="button"
                aria-label={`Remove ${objectLabel} ${fieldLabel} entry ${entry.languageId}`}
                disabled={entry.languageId === 0 && entries.length > 1}
                onClick={() => onChange(entries
                  .filter((candidate) => candidate.languageId !== entry.languageId)
                  .map((candidate) => ({ ...candidate })))}
              >
                Remove
              </button>
            </div>
          );
        })}
      </fieldset>
      <fieldset aria-label={`Add ${objectLabel} ${fieldLabel} localized entry`}>
        <legend>{`Add verified ${fieldLabel} entry`}</legend>
        <label>
          {`${objectLabel} ${fieldLabel} entry to add`}
          <select
            aria-label={`${objectLabel} ${fieldLabel} entry to add`}
            value={selectedCatalogEntry?.storageEntryIdentifier ?? ""}
            disabled={missingCatalogEntries.length === 0}
            onChange={(event) => setNewEntryIdentifier(event.target.value)}
          >
            {missingCatalogEntries.length === 0 ? (
              <option value="">No verified entries available</option>
            ) : missingCatalogEntries.map((entry) => (
              <option key={entry.storageEntryIdentifier} value={entry.storageEntryIdentifier}>
                {`${entry.displayName} — Entry ${entry.storageEntryIdentifier}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          {`New ${objectLabel} ${fieldLabel} entry text`}
          <input
            aria-label={`New ${objectLabel} ${fieldLabel} entry text`}
            value={newEntryText}
            maxLength={selectedEntryMaxLength}
            onChange={(event) => setNewEntryText(event.target.value)}
          />
        </label>
        {newEntryText.length > 0 && !newEntryTextValid ? (
          <p role="alert">New localized entry text must be nonempty printable ASCII.</p>
        ) : null}
        <button
          type="button"
          aria-label={`Add ${objectLabel} ${fieldLabel} entry`}
          disabled={!selectedCatalogEntry || !newEntryTextValid}
          onClick={() => {
            if (!selectedCatalogEntry || !newEntryTextValid) return;
            onChange([
              ...entries.map((entry) => ({ ...entry })),
              {
                languageId: selectedCatalogEntry.storageEntryIdentifier,
                text: newEntryText,
              },
            ]);
            setNewEntryText("");
            setNewEntryIdentifier("");
          }}
        >
          Add
        </button>
      </fieldset>
    </>
  );
}

# 2DA, HAK, TLK, Content Pipeline

## Source Status

- `docs-verified`: NWNWiki/Fandom pages for `.2da`, `.tlk`, and `Hak pak` structural behavior.
- `community-example`: NWSync setup guides and historical 2DA snapshots.
- `runtime-tested`: required before claiming a package works for a specific server/client.

## What This Domain Controls

Custom rows, client assets, StringRefs, package ordering, HAK dependencies, NWSync distribution, rollback, and compatibility with existing modules.

## Source-Backed Facts To Preserve

- `.2da` files are plain-text two-dimensional data tables used by the game and tools for rules/engine data.
- Core reference `.2da` files may exist in an install `source` directory, but the effective game resources are packaged elsewhere; a changed `.2da` must be delivered through override or HAK-style content to affect play.
- `.2da` row data starts after header/column lines; scripts can read column data with `Get2DAString`.
- The explicit first-column row number is for humans; the game counts rows while reading.
- `.2da` spacing is fragile: spaces split columns unless the value is quoted, so labels with spaces should use underscores or quotes.
- `.tlk` talk tables store player-facing text by numeric StringRef.
- `dialog.tlk` is the default table, and a custom module can use an additional custom `.tlk`.
- A custom `.tlk` belongs in the game's `tlk` directory, not beside `dialog.tlk`.
- HAK files package custom content for modules.
- Players need required HAK content client-side unless the server has a working automatic distribution path.
- Module HAK order matters when multiple HAKs contain the same resource; the higher HAK in the module list takes precedence.
- HAK resources can override module resources, so editing a module copy of a HAK-owned script/blueprint may be ignored at runtime.

## Design Questions

- What feature forces a data/package change instead of a pure blueprint or script change?
- Which exact `.2da`, `.tlk`, HAK, asset, blueprint, and script files are touched?
- Does the project own a row range, naming prefix, and StringRef range?
- Which existing rows/resources are being overridden, extended, or only referenced?
- Does the change require client content, server-only content, or both?
- Which HAK layer should own the resource and why?
- What happens if another HAK higher in the list provides the same filename/resref?
- Which blueprints/scripts/dialogues/NUI panels reference the row ids or StringRefs?
- How will players receive the new content: manual HAK/TLK install, NWSync, workshop/mod package, or project-specific launcher?
- What is the rollback path if the package breaks login, rendering, item creation, spell use, or script reads?

## Implementation Path

1. Classify the change: blueprint-only, script-only, `.2da`, `.tlk`, asset, HAK, NWSync, or mixed.
2. Identify current source-of-truth files from the target server repo or extracted/current game install.
3. Reserve row ids, StringRefs, filenames, resrefs, and naming prefixes.
4. Create a reference map from rows/StringRefs/resources to blueprints, scripts, dialogues, NUI, and assets.
5. Choose the packaging lane: module, HAK, custom TLK, override for local dev, NWSync, or manual install.
6. Decide HAK order and document every intentional override.
7. Build a rollback plan: remove row references, restore prior HAK/TLK, clear NWSync/client cache if needed, and verify old content still opens.
8. Verify in Toolset and NWN client/server runtime.

## Recommended Output Shape

For a 2DA/HAK/TLK task, produce:

1. Change classification and evidence label.
2. File inventory with owner, source, destination, and trust status.
3. Row/StringRef reservation table.
4. Reference map showing every consumer.
5. Packaging plan with HAK order and client-distribution lane.
6. Rollback plan.
7. Runtime QA checklist.
8. Open blockers that require target project files or current game install evidence.

## Runtime Verification

Test at least:

- Toolset opens the module with the chosen HAK/TLK list.
- Target blueprints/scripts/dialogues resolve the intended row ids and StringRefs.
- `Get2DAString` or equivalent script checks return expected values for edited rows.
- A clean client can join and see/use the affected content.
- HAK order produces the intended resource winner for duplicate filenames.
- The custom TLK displays the intended text and does not shift unrelated StringRefs.
- NWSync or manual install path delivers all required files.
- Rollback restores the old behavior.

## Guardrails

- Never treat a `.2da` edit as isolated. Track row ownership, references, HAK order, TLK strings, client distribution, and rollback.
- Do not recommend global row numbers without checking the target project's current custom content.
- Do not claim HAK/TLK packaging is release-ready until a clean client verifies it.
- Do not treat historical 2DA snapshots as current EE truth without checking the target install/version.
- Do not mix vanilla NWN guidance with NWNX or project-specific launcher behavior without labels.

## Sources

- NWNWiki/Fandom `.2da`: https://nwn.fandom.com/wiki/.2da
- NWNWiki/Fandom `.tlk`: https://nwn.fandom.com/wiki/.tlk
- NWNWiki/Fandom `Hak pak`: https://nwn.fandom.com/wiki/Hak_pak
- Beamdog NWN:EE docs/changelog: https://nwn.beamdog.net/docs/

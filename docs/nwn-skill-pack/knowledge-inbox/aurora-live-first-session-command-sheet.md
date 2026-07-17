# Aurora Live First Session Command Sheet

## Purpose

Run the first disposable Aurora Toolset live session for the NWN server-gamedev skill pack and return a machine-checkable evidence bundle.

This sheet is maintainer handoff material. It is not installed skill content, not docs/RAG source material, and not proof by itself.

## Before Opening Toolset

Use a disposable module copy. Do not use a private module as the only source. Do not run desktop automation that controls the global mouse or keyboard unless the user explicitly approves it.

Pick values:

- `OPERATOR`: operator handle.
- `DATE`: `YYYYMMDD`.
- `TOOLSET_VERSION`: exact Toolset version or build label.
- `NWN_VERSION`: exact NWN:EE version.
- `MODULE_COPY`: disposable module copy id or path.

Prepare the record, evidence manifest, screenshot folder, and log folder:

```powershell
python docs\nwn-skill-pack\tools\prepare_aurora_live_session.py docs\nwn-skill-pack --operator <OPERATOR> --scenario small-location-first-pass --date <DATE> --toolset-version <TOOLSET_VERSION> --nwn-version <NWN_VERSION> --module-path-or-copy-id <MODULE_COPY> --candidate-reference draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md --candidate-reference draft-skills/nwn-server-gamedev/references/items-equipment-loot.md --candidate-reference draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md --candidate-reference draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md --candidate-reference draft-skills/nwn-server-gamedev/references/feature-design-output-template.md
```

Expected outputs:

- `docs/nwn-skill-pack/knowledge-inbox/aurora-live-records/aurora-live-<DATE>-small-location-first-pass.json`
- `docs/nwn-skill-pack/knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-<DATE>-small-location-first-pass.json`
- `docs/nwn-skill-pack/.codex-tmp/aurora-live-evidence/aurora-live-<DATE>-small-location-first-pass/screenshots`
- `docs/nwn-skill-pack/.codex-tmp/aurora-live-evidence/aurora-live-<DATE>-small-location-first-pass/logs`

The prepared record starts as `not-run` and `local-reverse-lead`. Do not treat preparation as evidence.

## First-Pass Scope

This command sheet mirrors `First Live Record Seed` in `local-aurora-small-location-live-operator-checklist.md`.

Promotion-critical atoms for this first pass:

- `area.createWithWizard`
- `palette.switchBlueprintSource`
- `palette.selectObjectFamilyByIcon`
- `placeable.editBlueprintOrInstance` or `placeable.createOrEditContainer`
- `inventory.insertItem`
- `creature.editBlueprintOrInstance` or `creature.placeFromPalette`
- `door.linkAreaTransition` or `area.placeStartLocation`
- `toolset.buildAndClientRun`

Defer until useful evidence or exact blocker:

- encounter setup
- faction editor or selector
- store setup wizard
- generic resource picker
- sound resource picker
- trigger trap and script details

Runtime claims require `toolset.buildAndClientRun` client/server/log evidence. Do not generate a promotion proposal from preparation alone.

## Prepared-Only Route Smoke Test

Before opening the Toolset, verify the preparation route without creating real evidence:

```powershell
python docs\nwn-skill-pack\tools\check_prepare_aurora_live_session.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_status.py docs\nwn-skill-pack
```

The smoke test uses temporary files only. It does not replace the real live session, does not mark any atom observed, and does not make the package release-ready.

## Capture Order

Run `Minimum First Live Pass` first:

1. `area.createWithWizard`
2. `palette.switchBlueprintSource`
3. `palette.selectObjectFamilyByIcon`
4. `area.paintTerrainOrTile` or `area.inspectMainViewport`
5. `placeable.createOrEditContainer`
6. `inventory.insertItem`
7. `creature.placeFromPalette`, plus `creature.editScriptEvents` if the route is visible
8. `area.placeStartLocation` or `door.linkAreaTransition`
9. `toolset.buildAndClientRun`

If the minimum pass fails, record the exact blocker and repeat the smallest failed atom before expanding.

Run the rest of Track A only after the minimum pass succeeds or returns a useful exact blocker:

1. `area.editProperties`
2. `item.editBlueprint`
3. `script.createEditSearch`
4. `creature.editBlueprintOrInstance`
5. `conversation.editAndTest`
6. Additional `toolset.buildAndClientRun` checks for any runtime claim

Run Track B only when the UI route is actually visible in this Toolset session:

1. `trigger.inspectScriptsAndTrap`
2. `resource.openGenericPicker`
3. `sound.openResourcePicker`
4. `store.runSetupWizard`
5. `faction.editOrSelect`
6. `encounter.createOrEdit`

Do not add Track B names as JSON atoms. Record Track B evidence under the existing core atoms named in `aurora-live-operator-execution-packet.md` section `Symbol-Led Gap Capture Without Schema Expansion`.

## Evidence Rules

For each attempted atom, record:

- exact Toolset route and visible fields,
- screenshot or log path,
- save/reopen result when relevant,
- build result when relevant,
- client/server runtime result when claiming behavior,
- exact blocker if stopped.

Use `toolset-observed` for Toolset UI or saved module observations. Use `runtime-tested` only after client/server/log evidence. Toolset UI evidence is not runtime proof.

Keep `promotion_ready=false` unless the atom has a positive status, honest evidence label, specific observations, at least one artifact, and candidate reference routing.

## Validate Before Return

Validate the filled record:

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-<DATE>-small-location-first-pass.json
```

Check submitted records and manifest shape:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
```

## Return Bundle

Return:

- filled live record JSON,
- filled evidence manifest JSON,
- redacted screenshots,
- redacted logs,
- saved-module notes when needed,
- exact blockers for incomplete or unclear steps.

Do not return:

- raw decompilation text,
- private module files,
- private player data,
- account names,
- IP addresses,
- tokens,
- credentials,
- unredacted private server logs.

## Still Not Proven

- This command sheet has not yet been used with a real operator.
- A valid returned record proves evidence shape, not that the skill improved future Codex answers.
- Runtime behavior is not proven unless the returned artifacts include runtime-tested client/server/log evidence.
- Schema expansion remains blocked until reviewed live evidence proves that the current core atom model loses important workflow information.

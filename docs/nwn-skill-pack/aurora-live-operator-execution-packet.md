# Aurora Live Operator Execution Packet

## Purpose

Give a live operator the shortest safe path from local Aurora reverse leads to a filled, machine-checked Toolset evidence record.

This packet is maintainer handoff material. It is not installed skill content, not a docs/RAG source, and not proof by itself.

## Inputs

- `local-aurora-symbol-index.md`: maintainer-only `local-reverse-lead` symbols.
- `local-aurora-skill-reference-gap-analysis.md`: current gap map against draft skill references.
- `local-aurora-small-location-live-operator-checklist.md`: atom-by-atom Toolset checklist.
- `knowledge-inbox/templates/aurora-toolset-live-record-template.json`: machine-readable record template.
- `knowledge-inbox/templates/aurora-live-evidence-manifest-template.json`: artifact manifest template for screenshots, logs, saved module notes, and redaction status.
- `knowledge-inbox/aurora-live-first-session-command-sheet.md`: one-page command sheet for the first disposable operator pass.
- `knowledge-inbox/aurora-live-return-packet.md`: return bundle rules after a live session.
- `aurora-live-evidence-workflow.md`: promotion lifecycle after live evidence exists.

## Operator Setup

Use a disposable module copy. Do not run desktop automation that controls the global mouse or keyboard unless the user explicitly approves it. Prefer passive observation, screenshots, saved module copies, build logs, and explicit notes.

## Prepared-Only Route Smoke Test

Before opening the Toolset, smoke-test the preparation route on temporary data:

```powershell
python docs\nwn-skill-pack\tools\check_prepare_aurora_live_session.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_status.py docs\nwn-skill-pack
```

This uses temporary files only. It proves the scaffold command can write a record, manifest, screenshot folder, and log folder without overstating evidence. It does not create live Toolset evidence and does not replace the real operator session.

Use `knowledge-inbox/aurora-live-first-session-command-sheet.md` as the shortest operator entrypoint for the first disposable pass. The inline command below mirrors that sheet and the `First Live Record Seed` scenario.

Prepare a dated live record, evidence manifest, and local evidence folders in one command:

```powershell
python docs\nwn-skill-pack\tools\prepare_aurora_live_session.py docs\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --toolset-version <toolset-version> --nwn-version <nwn-version> --module-path-or-copy-id <module-copy> --candidate-reference draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md --candidate-reference draft-skills/nwn-server-gamedev/references/items-equipment-loot.md --candidate-reference draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md --candidate-reference draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md --candidate-reference draft-skills/nwn-server-gamedev/references/feature-design-output-template.md
```

This writes `aurora-live-YYYYMMDD-small-location-first-pass` as a `not-run` record under `docs\nwn-skill-pack\knowledge-inbox\aurora-live-records`, an evidence manifest under `docs\nwn-skill-pack\knowledge-inbox\aurora-live-evidence-manifests`, and evidence folders under `docs\nwn-skill-pack\.codex-tmp\aurora-live-evidence`. It does not mark any atom observed or promotion-ready.

Lower-level fallback: initialize a dated live record and local evidence folders:

```powershell
python docs\nwn-skill-pack\tools\init_aurora_live_record.py docs\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --toolset-version <toolset-version> --nwn-version <nwn-version> --module-path-or-copy-id <module-copy> --candidate-reference draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md --candidate-reference draft-skills/nwn-server-gamedev/references/items-equipment-loot.md --candidate-reference draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md --candidate-reference draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md --candidate-reference draft-skills/nwn-server-gamedev/references/feature-design-output-template.md --create-evidence-dirs
```

Initialize the matching evidence manifest:

```powershell
python docs\nwn-skill-pack\tools\init_aurora_live_evidence_manifest.py docs\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --record-id aurora-live-YYYYMMDD-small-location-first-pass
```

This writes a manifest under `docs\nwn-skill-pack\knowledge-inbox\aurora-live-evidence-manifests` with a placeholder artifact row. Replace that row with returned redacted evidence before review.

Manual fallback:

```powershell
New-Item -ItemType Directory -Force docs\nwn-skill-pack\knowledge-inbox\aurora-live-records
New-Item -ItemType Directory -Force docs\nwn-skill-pack\knowledge-inbox\aurora-live-evidence-manifests
New-Item -ItemType Directory -Force docs\nwn-skill-pack\.codex-tmp\aurora-live-evidence
Copy-Item docs\nwn-skill-pack\knowledge-inbox\templates\aurora-toolset-live-record-template.json docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json
Copy-Item docs\nwn-skill-pack\knowledge-inbox\templates\aurora-live-evidence-manifest-template.json docs\nwn-skill-pack\knowledge-inbox\aurora-live-evidence-manifests\aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass.json
```

Replace `YYYYMMDD` before validation.

## First Operator Brief

Use this copy-paste brief when handing the first live Toolset pass to a human operator:

```text
You are collecting Aurora Toolset evidence for the NWN server-gamedev skill pack.

Goal:
- Fill one dated live record and evidence manifest for a disposable small-location module.
- Prove only what you actually observe. Toolset UI evidence is not runtime proof.
- Return exact blockers instead of guessing.

Setup:
1. Use a disposable module copy.
2. Run prepare_aurora_live_session.py with `--scenario small-location-first-pass`, preferably from knowledge-inbox/aurora-live-first-session-command-sheet.md, or use the initialized templates named in aurora-live-operator-execution-packet.md.
3. Keep screenshots, logs, and saved-module notes under the generated evidence folders.

Run order:
1. Start with `Minimum First Live Pass` from `local-aurora-small-location-live-operator-checklist.md`: `area.createWithWizard`, palette source/family selection, area paint or viewport inspection, `placeable.createOrEditContainer` plus `inventory.insertItem`, creature placement/script-event evidence if visible, transition or `area.placeStartLocation`, and `toolset.buildAndClientRun`.
2. Expand into the rest of Track A only after the minimum pass succeeds or returns an exact blocker for the smallest failed atom.
3. Track B only when visible in your Toolset: trigger trap/scripts, generic resource picker, sound picker, store setup wizard, faction editor/selector, encounter wizard/edit.
4. Do not create new JSON atom names. Map Track B sub-atom notes to the existing core atoms described in Symbol-Led Gap Capture Without Schema Expansion.
5. Build and run the module before using runtime-tested evidence for transitions, trigger firing, sound behavior, inventory access, creature behavior, or conversation flow.

Return:
- filled live record JSON,
- filled evidence manifest JSON,
- redacted screenshots,
- redacted logs,
- saved-module notes when needed,
- exact blockers for any stopped or unclear step.

Never return raw decompilation text, private module files, private player data, account names, IP addresses, tokens, credentials, or unredacted private logs.
```

## One-Session Run Order

Use `local-aurora-small-location-live-operator-checklist.md` section `Minimum First Live Pass` as the first session spine. Use `Prioritized Pass From Local Crosswalks` only after the minimum pass succeeds or returns a clear blocker.

1. Run `tools/prepare_aurora_live_session.py` with `--scenario small-location-first-pass`, or initialize the live record, evidence manifest, and evidence folders before opening the Toolset.
2. Run `tools/init_aurora_live_evidence_manifest.py` or copy `knowledge-inbox/templates/aurora-live-evidence-manifest-template.json` when screenshots, logs, saved module notes, or external evidence will be returned.
3. Fill the session header in the checklist, including module copy id, Toolset version, NWN:EE version, HAK/TLK list, screenshot folder, and log folder.
4. Run the minimum first live pass: `area.createWithWizard`, palette source/family selection, area paint or viewport inspection, `placeable.createOrEditContainer` plus `inventory.insertItem`, creature placement/script-event evidence if visible, transition or `area.placeStartLocation`, and `toolset.buildAndClientRun`.
5. Stop after each atom long enough to fill status, evidence label, observations, artifact path, evidence-manifest row, blockers, and `promotion_ready=false` unless the proof is complete.
6. If the minimum pass fails, record the exact blocker and repeat the smallest failed atom before expanding into store, encounter, faction, resource picker, or sound rows.
7. Run the rest of Track A `screen-backed` atoms only after the minimum pass has a useful returned record: area properties, item blueprint editing, script editor/compile, creature details, conversation, and additional build/client checks.
8. Run Track B `symbol-only` atoms only after their live UI route is visible enough to describe without copying raw decompilation, using the core-atom mapping below when the checklist row is more specific than the JSON schema.
9. Build and run the disposable module before assigning `runtime-tested` to any atom that claims playability, transition behavior, trigger firing, sound behavior, inventory access, creature behavior, or conversation flow.
10. Validate the JSON record and evidence manifest, then refresh `knowledge-inbox/aurora-live-status.md` with `check_aurora_live_status.py` or the full repo-artifact preflight.

If the session stops early, keep the partially filled record. Use `blocked` status plus exact blockers instead of deleting the failed run; failed live attempts are useful future skill data when they are redacted and labelled honestly.

## Symbol-Led Gap Capture Without Schema Expansion

The live-record template and `tools/aurora_toolset_live_record.py` currently accept only the core atoms listed in `knowledge-inbox/templates/aurora-toolset-live-record-template.json`. Do not add ad-hoc atom names such as `store.runSetupWizard` or `encounter.createOrEdit` directly to a JSON record; validation will reject them.

Use `local-aurora-small-location-live-operator-checklist.md` for sub-atom capture, but anchor machine-readable JSON status to an existing core atom:

| Symbol-led checklist row | Core live-record atom | Artifact and notes rule |
| --- | --- | --- |
| `trigger.inspectScriptsAndTrap` | `trigger.editBlueprintOrInstance` | Record trigger type, trap fields, and `OnEnter`/`OnExit`/`OnTrapTriggered` evidence in `observations`, `blockers`, or `artifacts`. |
| `resource.openGenericPicker` | `customContent.verify2daHakTlkLoad`, or the owning atom when the picker belongs to one field | Record resource family, owning screen/field, and selected resref as an observation or artifact. If the picker belongs to script, sound, creature, item, or another editor, mention that owning atom too. |
| `sound.openResourcePicker` | `sound.editPlacedSound`, plus `customContent.verify2daHakTlkLoad` when HAK/TLK/resource load matters | Require Toolset preview, client audio, saved module state, or an exact blocker before promotion. |
| `store.runSetupWizard` | `inventory.insertItem`, plus `module.configureEventsAndEntry` when store events/scripts are tested | Record wizard pages, store inventory/transaction behavior, and event/script fields in artifacts or notes. Do not create a `store.*` JSON atom yet. |
| `faction.editOrSelect` | `creature.editBlueprintOrInstance`, or `module.configureEventsAndEntry` when the global faction table is edited | Record route, assignment, reputation/hostility effect, and runtime proof when claiming runtime behavior. |
| `encounter.createOrEdit` | `creature.editBlueprintOrInstance`, `trigger.editBlueprintOrInstance`, and `toolset.buildAndClientRun` depending on what was tested | Record creature list, spawn points, faction/script settings, build result, and runtime spawn proof under the relevant core anchors. Do not create an `encounter.*` JSON atom yet. |

If a sub-atom cannot be represented safely by one or more core atoms, keep it in the checklist and evidence manifest with `local-reverse-lead` or `blocked`, and leave the JSON record on the closest core atom with an exact blocker. Expand the template, validator, schema checks, and release documentation only after at least one reviewed live record proves the sub-atom recurs and loses important evidence under the current core-atom model.

## Minimum Capture

Fill every record-level field:

- `id`
- `created_at`
- `operator`
- `environment.toolset_version`
- `environment.nwn_version`
- `environment.module_path_or_copy_id`
- `environment.screenshots_folder`
- `environment.log_folder`

For every atom, fill:

- `status`
- `evidence_label`
- `observations`
- `artifacts`
- `blockers`
- `promotion_ready`

Do not mark `promotion_ready=true` unless the atom has a positive status, at least one observation, and at least one artifact.

For every returned artifact bundle, fill a manifest row with:

- `artifact_id`
- `atom`
- `kind`
- `path`
- `description`
- `evidence_label`
- `redaction_status`
- `sha256` when available
- `notes`

## Return Handoff

Before sending files back to a maintainer, read `knowledge-inbox/aurora-live-return-packet.md`.

Return the filled live record, filled evidence manifest, redacted screenshots, redacted logs, saved module notes when needed, and exact blockers. Do not return private module files, private player data, raw decompilation, account names, IP addresses, tokens, credentials, or unredacted private server logs.

Maintainers check the return packet route with:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_return_packet.py docs\nwn-skill-pack
```

## Evidence Label Rules

- Use `local-reverse-lead` only for untested symbol or decompilation leads.
- Use `toolset-observed` for Toolset UI or saved module observations.
- Use `static-checked` for file/module/config inspection without runtime behavior.
- Use `compiled` only when a build or script compile path succeeded.
- Use `runtime-tested` only when client/server/log evidence proves behavior.
- Use `rejected` when the atom should not be promoted.

Toolset UI evidence is not runtime proof.

## Validation Commands

Validate one filled record:

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json
```

Smoke-test one-command live session preparation:

```powershell
python docs\nwn-skill-pack\tools\check_prepare_aurora_live_session.py docs\nwn-skill-pack
```

Aggregate filled records:

```powershell
python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\aurora-live-records --out docs\nwn-skill-pack\knowledge-inbox\aurora-live-aggregate.md
```

Check all submitted records without failing just because none exist yet:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_records.py docs\nwn-skill-pack
```

Smoke-test evidence manifest initialization:

```powershell
python docs\nwn-skill-pack\tools\check_init_aurora_live_evidence_manifest.py docs\nwn-skill-pack
```

Check submitted evidence manifests:

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_evidence_manifest.py docs\nwn-skill-pack
```

Generate a promotion proposal only after validation passes:

```powershell
python docs\nwn-skill-pack\tools\generate_aurora_toolset_promotion_proposal.py docs\nwn-skill-pack docs\nwn-skill-pack\knowledge-inbox\aurora-live-records\aurora-live-YYYYMMDD-small-location-first-pass.json --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\aurora-live-YYYYMMDD-small-location-first-pass.md --maintainer <name>
```

## Acceptance Boundary

A filled record may support a proposal when:

- validation passes,
- at least one atom has `promotion_ready=true`,
- evidence labels are not overstated,
- artifacts are redacted and local paths do not expose private player or account data,
- candidate references are named in `promotion.candidate_references`.

The proposal still requires maintainer review, reference patches in both authoring and plugin-packaged skill copies, an accepted promotion record, and regenerated release artifacts.

## Stop Conditions

Stop and record blockers instead of promoting when:

- the Toolset path differs from the checklist enough to risk wrong guidance,
- the module cannot save or reopen,
- a resource, HAK, TLK, model, or 2DA dependency is missing,
- runtime behavior depends on client/server proof that was not captured,
- evidence includes private module, player, account, token, IP, or credential data.

## Output Of This Packet

Expected outputs:

- one filled JSON record under `knowledge-inbox/aurora-live-records/`,
- optional evidence manifest under `knowledge-inbox/aurora-live-evidence-manifests/`,
- optional aggregate at `knowledge-inbox/aurora-live-aggregate.md`,
- optional proposal under `knowledge-inbox/reference-promotion-proposals/`,
- exact blockers if no atom is promotion-ready.

Still not proven:

- NWN runtime behavior unless `runtime-tested` evidence exists,
- fresh Codex answer improvement,
- plugin install behavior,
- release-candidate readiness,
- whether symbol-led sub-atoms deserve first-class JSON schema expansion.

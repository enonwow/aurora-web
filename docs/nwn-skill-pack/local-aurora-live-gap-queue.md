# Local Aurora Live Gap Queue

## Purpose

Turn the stopped `019ed62e-3e0f-7253-91ff-f529be54abfe` screenshot thread and
`C:\Projects\New Folder` local reverse leads into a small live-operator queue.

Evidence label before completion: `local-reverse-lead`.

This is maintainer-only routing material. It is not installed skill content, not
official NWN documentation, not live Toolset proof, and not runtime proof.

Use this queue after the `small-location-first-pass` record either returns
enough evidence or gives an exact blocker. Do not use it to skip the first pass.

## Source Boundary

- `local-thread-019ed62e-aurora-ui-gallery-intake.md` says batch82 remains the
  newest useful passive UI intake from that thread and no new verified-live
  Toolset evidence was exposed by the 2026-06-19T09:03:17Z freshness probe.
- `local-aurora-symbol-index.md` is generated from local reverse/export material
  under `C:\Projects\New Folder` and is `local-reverse-lead` only.
- `local-aurora-small-location-live-operator-checklist.md` owns the first pass.
  This queue owns targeted second-pass gaps.

## Promotion Rules

- Capture the Toolset UI route before promoting any symbol-only row.
- Capture save/reopen behavior before claiming a field or object persists.
- Capture build/client/server/log evidence before claiming runtime behavior.
- Keep raw decompilation, private module data, and unredacted screenshots out of
  future installed skill references.
- Promote only through a reviewed Aurora live record and reference-promotion
  proposal.

## Queue

| Priority | Queue id | Family | Lead type | Live question | Required evidence | Promotion target |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `gap-trigger-geometry-script` | trigger / script | symbol-led | How does the installed Toolset create trigger geometry, expose type/trap fields, and bind `OnEnter`, `OnExit`, or `OnTrapTriggered`? | UI route, geometry screenshot, script-slot screenshot, build result, client/log firing proof or exact blocker. | `locations-areas-tilesets.md`, `nwscript-events-systems.md` |
| 2 | `gap-store-setup-inventory` | store / merchant / inventory | symbol-led plus passive store leads | Is store setup a wizard, a properties dialog, or both, and how does merchant inventory connect to client transactions? | Store setup route, inventory/properties screenshot, open-store script owner, client buy/sell or exact blocker. | `items-equipment-loot.md`, `economy-crafting-progression.md` |
| 3 | `gap-resource-picker-generic` | resources / custom content | symbol-led | Is `TdlgResOpen` a shared picker for scripts, conversations, HAK/TLK assets, or object fields? | Launching owner field, filter/resource-family state, selected resref persistence, build result or exact blocker. | `two-da-hak-tlk-pipeline.md`, `feature-design-output-template.md` |
| 4 | `gap-sound-resource-picker` | sound / resources | symbol-led plus passive sound leads | Is `TdlgResOpenSound` separate from generic resource selection, and what proves preview or placed-sound playback? | Sound picker route, selected resource, placed sound fields, save/reopen, preview/client audio or exact blocker. | `locations-areas-tilesets.md`, `testing-runtime-qa.md` |
| 5 | `gap-faction-editor-selector` | faction / creature / encounter | symbol-led | Which workflows open faction editor versus faction selector, and how does selection affect hostility or reputation? | Editor/selector route, faction fields, creature or encounter assignment, client hostility/reputation proof or exact blocker. | `creatures-encounters-ai.md`, `economy-crafting-progression.md` |
| 6 | `gap-encounter-wizard-spawn` | encounter / spawn | symbol-led | How are encounter creature lists, spawn points, reset behavior, and event scripts authored in Toolset? | Encounter wizard/edit route, creature list, spawn-point placement, build warnings, client spawn/reset proof or exact blocker. | `creatures-encounters-ai.md`, `nwscript-events-systems.md` |

## Not Yet Promotion-Ready

- All queue rows are `not-run`.
- All queue rows remain `local-reverse-lead` until a filled live record exists.
- Passive screenshots can prioritize a row, but cannot prove UI route, field
  semantics, persistence, build success, or runtime behavior.

## Next Maintainer Step

After the first live record returns, choose the highest queue row whose
prerequisites were not blocked. Prepare a fresh Aurora live record rather than
editing compact skill references directly.

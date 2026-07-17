# Aurora Toolset: C07B equipment checklist template

Date: 2026-06-21

Scope: documentation sidecar template only. This file does not supersede
`aurora-toolset-creature-slices-source-of-truth-2026-06-21.md` and does not
claim live Toolset progress.

Use this when the live operator attempts `C07B`: standard equipment weapon slot
replacement roundtrip. The source-of-truth currently requires starting with
`righthand`, capturing the original item, replacing it with a safe probe weapon,
reading it back, restoring the original item, and proving final readback.

## Evidence context

Existing C07 evidence is useful route context, not accepted C07B proof:

- `creature-c07-inventory-readonly-20260620-232633-114`: inventory opened and
  closed cleanly; no mutation.
- `creature-c07-inventory-add-route-open-20260620-232833-113` and
  `creature-c07-inventory-add-route-open-limited-20260620-233143-263`: route
  probes; no accepted equipment replacement.
- `creature-c07-add-standard-item-route-probe-limited-20260620-233211-546`:
  blocked with no observable add.

Do not promote any C07B run from route-open evidence alone.

## Run header

- Evidence folder:
- Operator:
- Date/time:
- Source-of-truth file:
  `docs/aurora-toolset-creature-slices-source-of-truth-2026-06-21.md`
- Target module:
- Area and tree path:
- Target creature name/tag/resref:
- Target slot: `righthand`
- Original slot item name/resref:
- Probe weapon name/resref:
- Optional offline verifier path for `Equip_ItemList`:
- Planned outcome: `accepted` or `blocked-clean`

## Preflight checklist

- [ ] Start full-window screenshot captured.
- [ ] Start popup/dialog/modal counts recorded.
- [ ] Start `Responding=true` recorded.
- [ ] Start `moduleSave=false` recorded.
- [ ] Target creature identity captured before mutation.
- [ ] Route to `Creature Properties` recorded, including command owner and
  command id if applicable.
- [ ] `Inventory ...` route captured from the `Basic` tab.
- [ ] Inventory warning captured if it appears.
- [ ] `Never warn again` was not touched.
- [ ] `Standard Equipment` is active before any mutation.
- [ ] Target slot is exactly `righthand`; do not merge C07C/C07D/C07E.

## Required artifact checklist

| Role | Suggested artifact | Required notes |
| --- | --- | --- |
| before | `00-start-full-window.png` | Toolset visible and clean. |
| target identity | `01-creature-properties-basic.png` plus child dump | Name/tag/resref or equivalent guard. |
| inventory entry | `02-inventory-warning.png` if present | Warning handled without `Never warn again`. |
| before slot | `03-standard-equipment-before.png` plus child dump | Original `righthand` item visible or dumped. |
| mutation staged | `04-righthand-probe-before-commit.png` plus child dump | Probe weapon assigned only to `righthand`. |
| commit | `05-after-inventory-commit.png` | Capture `OK`/commit path used by Toolset. |
| readback | `06-righthand-probe-readback.png` plus child dump | Reopen proves probe weapon persisted. |
| rollback staged | `07-righthand-original-before-restore-commit.png` plus child dump | Original item restored to `righthand`. |
| final readback | `08-righthand-original-final-readback.png` plus child dump | Reopen proves original item restored. |
| cleanup | `90-final-clean-full-window.png` | No dialogs/popups/modals remain. |

## Acceptance checklist

- [ ] `before.captured=true`.
- [ ] Original `righthand` item is named and tied to the target creature.
- [ ] Probe weapon is safe, disposable, and only replaces `righthand`.
- [ ] Contents inventory is not claimed as C07B progress.
- [ ] Natural equipment is not touched.
- [ ] Accessory, armor, and ammo slots are not touched.
- [ ] `Dropable` and `Pickpocketable` are unchanged unless a later C07F run is
  explicitly in scope.
- [ ] Toolset commit path is captured.
- [ ] Reopen/readback proves the probe weapon in `righthand`.
- [ ] Rollback restores the exact original item or explicitly records an
  original-empty state and final empty state.
- [ ] Final reopen/readback matches the original state.
- [ ] Final popup/dialog/modal counts are zero.
- [ ] Final `Responding=true`.
- [ ] Final `moduleSave=false`.
- [ ] No module save occurred.
- [ ] No global mouse, global keyboard, `SendKeys`, or `SendInput` was used.
- [ ] Optional `nwn-mcp`/GFF `Equip_ItemList` readback is treated as support,
  not as a replacement for Toolset screenshot/readback/rollback evidence.

## Summary fields to fill

Recommended `summary.json` additions under `sliceSpecific`:

```json
{
  "targetSlot": "righthand",
  "originalItem": "",
  "probeItem": "",
  "replacementRoute": "",
  "standardEquipmentActive": true,
  "contentsTouched": false,
  "naturalEquipmentTouched": false,
  "dropableUnchanged": true,
  "pickpocketableUnchanged": true,
  "readbackMatchedProbe": false,
  "rollbackMatchedOriginal": false,
  "offlineEquipItemListVerifier": ""
}
```

For a clean blocker, keep `accepted=false`, record the blocker symptom and
artifacts, complete cleanup, and do not keep retrying inside the same evidence
packet.

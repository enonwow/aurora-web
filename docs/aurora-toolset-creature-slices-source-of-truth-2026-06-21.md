# Aurora Toolset: Creature slices source of truth

Date: 2026-06-21

This document is the current contract for creature work. It corrects the
inventory/equipment ambiguity that appeared during C07 and the later audit of
Creature Properties tabs, `nwn-mcp` creature tooling, and reverse-engineered
UTC/GIT field coverage.

Rule of thumb: a slice is a semantic Toolset workflow with readback and
rollback. A tab, a button, or a single field is not automatically a slice.

## Why equipment replacement was missing

The older source material only promoted creature inventory/equipment to
`opened-live`. It explicitly covered opening `Inventory Contents`, observing
`Standard Equipment`, `Natural Equipment`, `Contents`, `Standard Items`,
`Custom Items`, and `Options`, then closing by `Cancel`.

That did not prove any mutation. The previous C07 run attempted an add-to-
contents route and ended `blocked-no-observable-add`. It did not replace a
weapon, armor, or any occupied equipment slot.

Therefore C07 must be split:

- `C07A`: contents item add/readback/remove/rollback.
- `C07B`: standard equipment slot replacement roundtrip, for example weapon.
- `C07C`: armor slot replacement roundtrip.
- `C07D`: accessory/ammo equipment slot replacement roundtrip.
- `C07E`: natural equipment replacement roundtrip, only after standard
  equipment is safe.
- `C07F`: inventory item options, especially `Dropable` and `Pickpocketable`.
- `C07G`: creature inventory `New` item wizard, if needed after normal add
  routes are understood.

## Audit changes from the first list

The first creature ledger was too coarse in these places:

- `C02` mixed identity fields with race/gender/appearance/CR profile fields.
- `C03` proved portrait only; it did not prove appearance type, phenotype,
  body parts, colors, wings, or tail.
- `C04` grouped several unrelated numeric systems under one statistics slice.
- `C05` counted one advanced flag but left other advanced groups implicit.
- `C07` mixed inventory contents, standard equipment, natural equipment,
  accessories, ammo, item options, and item creation.
- `C10` mixed script picker binding, script editor, compile/create, and
  script-set save/load.
- `C11` proved existing conversation assignment but not conversation editor,
  dialog creation, or `No Interrupt`.
- `C12` should separate alignment/class-level/default package/level-up wizard.
- `C13` should keep skills, feats, spells, and special abilities separate.
- `C14` should keep creature faction assignment separate from global faction
  matrix edits.
- `C16` should split runtime smoke by behavior: visual spawn, conversation,
  combat/equipment, and script-event smoke.

## Acceptance rule for any creature mutation slice

A creature mutation slice is accepted only when it has:

- before screenshot and machine summary;
- the target creature identity captured before mutation;
- controlled mutation;
- `OK`/commit where the Toolset requires it;
- reopen/readback proving the mutation;
- rollback to the original value or original item;
- final reopen/readback proving the original state is restored;
- cleanup with `popupCount=0`, `modalCount=0`, `Responding=true`;
- `moduleSave=false`;
- no global mouse or global keyboard takeover.

## Current slice ledger

| Slice | Scope | Status | Evidence / note |
| --- | --- | --- | --- |
| C00 | Clean Toolset baseline, area open, second-screen proof | accepted/supporting | `creature-c00-*` evidence folders |
| C01 | Creature Properties tabs read-only map | accepted/read-only | `creature-c01-properties-tabs-cancel-v4-*` |
| C02A | Basic identity text: first name, last name, tag | accepted | `creature-c02-basic-identity-roundtrip-v3-recovery-*` |
| C02B | Basic profile selectors: race, gender, appearance field, phenotype | accepted | Race `Human -> Half-Elf -> Human` in `creature-c02b-race-half-elf-roundtrip-20260621-193149-000`, Gender `Male -> Female -> Male` in `creature-c02b-gender-female-roundtrip-20260621-193338-863`, plus existing accepted C03B appearance and C03C phenotype roundtrips. |
| C02C | Basic challenge rating field | missing/blocker | `creature-c02c-basic-challenge-rating-roundtrip-20260621-193521-930`: field accepted visible `1/2` before OK, but reopen/readback returned calculated `1/4`; final restored `1/4`, popup/modal `0/0`, no save. |
| C02D | Description/LocString route | missing/deferred | GFF/runtime field exists; Toolset route not yet live-mapped. |
| C03A | Portrait selector roundtrip and rollback | accepted | `creature-c03-portrait-roundtrip-20260620-230412-357` |
| C03B | Appearance type visual roundtrip | accepted | `creature-c03b-appearance-dynamic-half-elf-roundtrip-fixed-20260621-155511-979`: `(Dynamic) Human -> (Dynamic) Half-Elf -> (Dynamic) Human`, commit/readback/rollback/final readback. |
| C03C | Phenotype roundtrip | accepted | `creature-c03c-phenotype-large-roundtrip-20260621-160021-729`: `Normal -> Large -> Normal`, commit/readback/rollback/final readback. |
| C03D | Body-part roundtrip: head/torso/limb one-field probe | accepted | `creature-c03d-head-pmh0-head002-roundtrip-20260621-161046-291`: Head `pMH0_HEAD001 -> pMH0_HEAD002 -> pMH0_HEAD001`. |
| C03E | Color roundtrip: skin/hair/tattoo | accepted | `creature-c03e-skin-color-first-row-adjacent-roundtrip-fixed-20260621-161949-791`: Skin color picker visual hash `before == final`, `target == readback`. |
| C03F | Wings/tail roundtrip | missing/deferred | Reverse notes mark runtime consumption as uncertain; keep preserve-first. |
| C04A | Ability score roundtrip | accepted | `creature-c04a-strength-roundtrip-20260621-163138-461`: Strength `16 -> 17 -> 16`, commit/readback/rollback/final readback. |
| C04B | Hit points roundtrip | accepted | `creature-c04-base-hp-roundtrip-20260620-231200-766` plus `summary.accepted.json`: Base HP `5 -> 6 -> 5`, readback/rollback/final cleanup. |
| C04C | Saves roundtrip | accepted | `creature-c04c-fortitude-bonus-roundtrip-20260621-163241-464`: Fortitude Bonus `0 -> 1 -> 0`, commit/readback/rollback/final readback. |
| C04D | Armor class roundtrip | accepted | `creature-c04d-natural-armor-roundtrip-20260621-163341-842`: Natural Armor `0 -> 1 -> 0`, commit/readback/rollback/final readback. |
| C04E | Movement rate roundtrip | accepted | `creature-c04e-movement-rate-roundtrip-20260621-163444-634`: Movement Rate `Default -> DM Fast -> Default`, commit/readback/rollback/final readback. |
| C05A | Advanced flag: Immortal | accepted | `creature-c05-advanced-immortal-roundtrip-*` |
| C05B | Advanced interface flags | accepted | `creature-c05-advanced-batch-roundtrip-20260621-191448-634`: `Disarmable False -> True -> False`, commit/readback/rollback/final readback. |
| C05C | Treasure model and corpse decay | accepted | `creature-c05-advanced-batch-roundtrip-20260621-191448-634`: Treasure `Default -> Body -> Default`, Corpse Decay `5 -> 6 -> 5`, commit/readback/rollback/final readback. |
| C05D | Subrace/deity text fields | accepted | `creature-c05-advanced-batch-roundtrip-20260621-191448-634`: Subrace `'' -> cod_c05d_subrace -> ''`, Deity `'' -> cod_c05d_deity -> ''`, commit/readback/rollback/final readback. |
| C05E | Sound set and perception range | accepted | `creature-c05e-sound-perception-roundtrip-20260621-192529-192`: Sound Set `Bugbear -> Aarin Gend -> Bugbear` through `TdlgSoundSetSelect`, Perception Range `Default -> Short -> Default`, commit/readback/rollback/final readback. |
| C05F | Apply Template route | missing/deferred | Potentially broad mutation; read-only map first, mutation only with rollback plan. |
| C06 | Variables add/readback/delete rollback | accepted | `creature-c06-variables-roundtrip-*` |
| C07A | Inventory `Contents` add item/readback/remove rollback | missing/blocker | Add-to-Contents via Standard Items double-click is known, but no accepted remove/final-absent route exists. `creature-c07a-torch-contents-context-menu-probe-20260621-164228-869`: right-click on existing `Torch` opened no context menu/remove candidate and instead left Item Properties; cleaned manually. |
| C07B | Standard equipment weapon slot replacement roundtrip | missing/blocker | `creature-c07b-kwatermistrz-longsword-feat-yes-commit-undo-20260621-205405-332`: no-global route proved real weapon mutation. Baseline `Short Sword`; `Longsword` equip triggered the feat/proficiency popup and targeted `Tak` added the first listed feat; Inventory/Creature `OK` committed; reopen/readback showed `Longsword`. Still not accepted because toolbar Undo did not restore baseline: final readback remained `Longsword`. |
| C07C | Standard equipment armor/chest slot replacement roundtrip | missing/blocker | Boy/chest mutation itself is proven: `Last Words` equipped, committed, reopened, and read back. The slice is still blocked only because rollback/remove is not accepted; Delete/trash/drag/Undo all failed final restore criteria. |
| C07D | Accessory/ammo equipment slot replacement roundtrip | missing/blocker | Slot map corrected for the current Inventory layout and `Amulet of Fire Resistance` path resolved as `Miscellaneous > Jewelry > Amulets > Amulet of Fire Resistance`. `creature-c07d-kwatermistrz-amulet-neck-tree-drag-precommit-20260621-210550-056` tried no-global tree-to-`neck` drag with both capture and cross-control message routes; Toolset did not treat those messages as a real drop, so `neck` stayed empty. |
| C07E | Natural equipment replacement roundtrip | missing/deferred | Toolset has Natural Equipment; slot semantics need live proof before mutation. |
| C07F | Item options roundtrip | accepted | `creature-c07f-kwatermistrz-torch-dropable-roundtrip-20260621-154030-368`: existing `Torch`, `Dropable=false -> true -> false`, commit/readback/restore/final readback. |
| C07G | Creature inventory `New` item wizard | missing/deferred | Item creation inside creature inventory; separate from adding an existing item. |
| C08A | Place creature from palette and remove/rollback | accepted | `creature-c08a-commoner-placement-undo-roundtrip-clean-20260621-165620-455`: palette route `Creatures -> Standard -> NPCs -> Humans -> Commoner, Male`, object count `1220 -> 1221 -> 1220`, targeted Undo rollback, final popup/modal `0/0`. |
| C08B | Placed creature Adjust Location/transform roundtrip | accepted | `creature-c08b-commoner-adjust-location-x-roundtrip-rollback-20260621-170738-051` plus setup/cleanup evidence: temporary `Commoner, Male`, X `31,65 -> 31,75 -> 31,65`, final object count `1220`. |
| C08C | Add placed creature to palette | missing/deferred | Context menu has `Add To Palette`; do only after placement/removal is clean. |
| C09A | Creature Wizard read-only page map | partial | Wizard probes only; no accepted lifecycle. |
| C09B | Creature Wizard creates temporary blueprint | missing/blocker | Current required wizard slice. Route/page map is known through `WM_COMMAND 135`, but `Finish` was not pressed. Create a disposable creature blueprint, locate it in Custom palette, then either delete/verify absent or explicitly park it as an approved artifact; do not count C09C until this exists. |
| C09C | Custom palette blueprint edit/delete lifecycle | missing/dependency-blocked | `creature-c09c-dependency-blocked-clean-20260621-195454-838`: clean passive audit only; C09C depends on an accepted C09B temporary blueprint create/locate/cleanup or explicit parked artifact. Current C09 evidence reaches wizard route/pages with `WM_COMMAND 135`, but no safe Finish/create/delete lifecycle is promoted. |
| C10A | Creature script slots read-only map | accepted/read-only | `creature-c10a-scripts-readonly-map-20260621-172448-772`: 13 script slots mapped, identity guard `Kwatermistrz Steel`, final clean. |
| C10B | Bind existing script via picker and rollback | accepted | `creature-c10b-onuserdefined-picker-bind-roundtrip-20260621-172957-730`: `OnUserDefined x2_def_userdef -> x2_def_spawn -> x2_def_userdef`, picker/readback/rollback/final readback. |
| C10C | Open existing script editor read-only | accepted/read-only | `creature-c10c-existing-script-editor-readonly-20260621-172634-722`: opened existing `x2_def_spawn` in `TdlgScriptEditor`, closed cleanly without save/compile. |
| C10D | Create/edit/compile/bind script lifecycle | accepted | `creature-c10d-create-compile-bind-roundtrip-20260621-175507-036`: created `cod_cre_c10d`, compiled with `0 Errors`, bound/read back, rolled back to `x2_def_userdef`; post-reload final readback `creature-c10d-post-reload-final-slot-readback-20260621-180218-377`. |
| C10E | Save Script Set / Load Script Set | missing/deferred | Separate because it can create or load external state. |
| C11A | Existing conversation assignment roundtrip | accepted | `creature-c11-conversation-existing-roundtrip-v2-*` |
| C11B | Conversation resource picker read-only map | accepted/read-only | `creature-c11b-conversation-picker-readonly-map-20260621-181439-246`: Basic Conversation `...` opened `TdlgResOpen`, captured picker controls, cancelled cleanly. |
| C11C | Conversation editor open/read-only | accepted/read-only | `creature-c11c-existing-conversation-editor-readonly-20260621-181557-278`: temporary field text `char_rebuild`, opened `Conversation Editor - char_rebuild`, closed `Done`, properties `Cancel`. |
| C11D | Create/bind/simple dialog lifecycle | accepted | `creature-c11d-create-bind-dialog-lifecycle-20260621-182252-880`: created/opened `cod_cre_c11d`, visual bind/readback proved `cod_cre_c11d`, rollback restored blank Conversation; no-save reload/discard cleanup `creature-c11d-post-accepted-reload-final-clean-count-20260621-182638-752`. |
| C11E | `No Interrupt` toggle roundtrip | accepted | `creature-c11e-no-interrupt-toggle-roundtrip-20260621-181812-616`: checkbox `0 -> 1 -> 0`, commit/readback/rollback/final readback. |
| C12A | Alignment roundtrip | accepted | `creature-c12a-alignment-roundtrip-20260621-183723-443`: Alignment `True Neutral -> Lawful Neutral -> True Neutral`, commit/readback/rollback/final readback, popup/modal `0/0`. |
| C12B | Class entry level roundtrip | accepted | `creature-c12b-class-level-roundtrip-20260621-184733-095`: Fighter level `1 -> 2 -> 1`, class/alignment/package unchanged, commit/readback/rollback/final readback, popup/modal `0/0`; post-run clean count `creature-c12b-post-level-roundtrip-clean-count-20260621-184945-360`. |
| C12C | Default package for autolevelup | accepted | `creature-c12c-default-package-roundtrip-20260621-184146-890`: `Default Fighter -> Fighter, Finesse -> Default Fighter`, commit/readback/rollback/final readback, popup/modal `0/0`. |
| C12D | Levelup Wizard mutation | missing/deferred | Broad workflow; read-only map before mutation. |
| C13A | Skills rank roundtrip | accepted | `creature-c13a-skills-rank-roundtrip-v2-20260621-011320-751` plus `summary.accepted.json`: `Tropienie` Rank `0 -> 1 -> 0`. |
| C13B | Feats assigned toggle/readback/rollback | missing/deferred | Later character-build phase per user direction. Current evidence `creature-c13b-feats-map-clean-cancel-20260621-185322-657` maps the Feats tab cleanly, but no stable row identity exists for one-row toggle/readback/rollback. |
| C13C | Spells prepared toggle/readback/rollback | missing/deferred | Later character-build phase per user direction. Current evidence `creature-c13c-spells-map-clean-v2-20260621-194302-666` reaches the Spells tab cleanly, but the target is Fighter and the spell table is empty without changing class composition. |
| C13D | Spells class-list save/load | missing/deferred | Buttons create/load state; keep separate from prepared spell toggle. |
| C13E | Special abilities row/uses/caster level roundtrip | missing/deferred | Later character-build phase per user direction. Current evidence `creature-c13e-special-abilities-map-clean-v2-20260621-194525-931` reaches Special Abilities cleanly, but no safe exact row readback/mutation was promoted. |
| C14A | Faction editor read-only map | accepted/read-only | `creature-c14-faction-editor-readonly-*` |
| C14B | Creature faction assignment roundtrip | accepted | `creature-c14b-faction-assignment-roundtrip-20260621-185813-668`: Faction `Defender -> Commoner -> Defender`, commit/readback/rollback/final readback, popup/modal `0/0`. |
| C14C | Faction matrix relationship edit/rollback | missing/deferred | Global state; not required before C14B. |
| C14D | Faction create/rename/delete lifecycle | missing/deferred | Global state; only after matrix rollback is proven. |
| C15A | Encounter creature-list add/readback/remove | missing/dependency-blocked | Requires accepted C08A or C09 safe creature candidate first. |
| C15B | Encounter spawn parameters with creature candidate | missing/deferred | Spawn count/frequency/max creatures, after C15A. |
| C16A | Runtime/game visual spawn smoke | missing/deferred | Later location-design/runtime phase per user direction; not part of current creature authoring backlog. |
| C16B | Runtime conversation smoke | missing/deferred | Later location-design/runtime phase per user direction; C11D is accepted, but runtime proof belongs with location/harness work. |
| C16C | Runtime combat/equipment smoke | missing/deferred | Later location-design/runtime phase per user direction; also depends on accepted C07B/C07C equipment routes. |
| C16D | Runtime script-event smoke | missing/deferred | Later location-design/runtime phase per user direction; C10D is accepted, but runtime proof belongs with location/harness work. |
| C17 | Offline GFF/MCP readback support | supporting-only | `nwn-mcp` can inspect `ClassList`, `SkillList`, `FeatList`, `Equip_ItemList`, `ItemList`, scripts, and position. It supports live work but does not replace Toolset evidence. |
| C18 | Merchant/store NPC integration | missing/deferred | Store is separate object opened through dialog/script; belongs after C10/C11 and store slices. |

## Priority order from here

1. `C07B`: prove weapon replacement with a valid creature/weapon proficiency or property precondition.
2. `C07C`: keep the proven armor/chest mutation, but find an accepted rollback/remove/final-clean route.
3. `C09B`: create a disposable creature through Creature Wizard, locate it, then delete/verify absent or explicitly park it.
4. `C07D`: prove accessory/ammo replacement only with an already-occupied slot or after C07 cleanup is solved.
5. `C10E` remains deferred because Save/Load Script Set can create external state.
6. `C13B`, `C13C`, `C13E`, and `C16A-D` are deferred to later character-build/runtime/location phases.

Blocked queue:

- `C07A` only if a genuinely new remove/final-absent route appears. Do not
  reuse failed Delete/trash/drag routes, C07C toolbar Undo, or the
  `Contents` right-click route from
  `creature-c07a-torch-contents-context-menu-probe-20260621-164228-869`.
- `C02C` only if a new non-derived CR route appears. The Basic `Challenge
  Rating` edit accepted visible text before `OK`, but persisted readback
  recalculated to `1/4`.

## C03B accepted appearance addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c03b-appearance-dynamic-half-elf-roundtrip-fixed-20260621-155511-979`

Facts:

- Target was `enon_test_build -> Creatures -> Kwatermistrz`, identity
  `Kwatermistrz Steel`, tag `Kwatermistrz`.
- Basic `Profile` combo order is `Race`, `Appearance`, `Phenotype`, `Gender`.
  The appearance combo had `5119` entries; baseline was index `8`
  `(Dynamic) Human`.
- Controlled mutation used appearance index `5` `(Dynamic) Half-Elf`.
- Commit/readback showed `(Dynamic) Half-Elf`; rollback/final readback showed
  `(Dynamic) Human`.
- Final state: popup/modal `0/0`, `Responding=true`, `moduleSave=false`, no
  global mouse/keyboard, no canvas input. The Toolset title can remain dirty
  (`*`) because the in-memory module was edited and restored without saving.

Decision:

- Promote `C03B` as accepted for Basic appearance-type roundtrip.
- Do not use this acceptance to promote `C03C` phenotype or `C03D/C03E`
  body/color controls; those remain separate missing slices.

## C03C accepted phenotype addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c03c-phenotype-large-roundtrip-20260621-160021-729`

Facts:

- Target was `enon_test_build -> Creatures -> Kwatermistrz`, identity
  `Kwatermistrz Steel`, tag `Kwatermistrz`.
- Basic `Profile` combo order is `Race`, `Appearance`, `Phenotype`, `Gender`;
  C03C used the third combo.
- Phenotype combo had `26` entries; baseline was index `0` `Normal`.
- Controlled mutation used phenotype index `1` `Large`.
- Commit/readback showed `Large`; rollback/final readback showed `Normal`.
- Final state: popup/modal `0/0`, `Responding=true`, `moduleSave=false`, no
  global mouse/keyboard, no canvas input. The Toolset title can remain dirty
  (`*`) because the in-memory module was edited and restored without saving.

Decision:

- Promote `C03C` as accepted for Basic phenotype roundtrip.
- Do not use this acceptance to promote `C03D/C03E` body/color controls; those
  remain separate missing slices.

## C03D accepted body-part addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c03d-head-pmh0-head002-roundtrip-20260621-161046-291`

Facts:

- Target was `enon_test_build -> Creatures -> Kwatermistrz`, identity
  `Kwatermistrz Steel`, tag `Kwatermistrz`.
- The Appearance tab is enabled for the current `(Dynamic) Human` target.
- C03D used the first visible Appearance-tab combo, `Head`.
- Head combo baseline was index `1` `pMH0_HEAD001`; controlled target was
  index `2` `pMH0_HEAD002`.
- Commit/readback showed `pMH0_HEAD002`; rollback/final readback showed
  `pMH0_HEAD001`.
- Final state: popup/modal `0/0`, `Responding=true`, `moduleSave=false`, no
  global mouse/keyboard, no canvas input.

Decision:

- Promote `C03D` as accepted for one body-part field (`Head`).
- Do not use this acceptance to promote C03E colors, wings/tail, or every
  body-part combo; those remain separate if needed.

## C03E accepted color addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c03e-skin-color-first-row-adjacent-roundtrip-fixed-20260621-161949-791`

Facts:

- Target was `enon_test_build -> Creatures -> Kwatermistrz`, identity
  `Kwatermistrz Steel`, tag `Kwatermistrz`.
- The Appearance tab `Color ...` button opens `TColorPicker` titled
  `Select Character Colors`.
- C03E used the color field combo value `Skin`.
- Color swatches are drawn in the picker surface rather than exposed as child
  controls. The accepted route uses targeted local clicks on the picker client
  area and screenshot hashes for readback/rollback.
- Baseline swatch point was client `(50,17)`; target swatch point was client
  `(82,17)`. The first blocked attempt used `y=43`, which hits the second row
  because dialog screenshots include the title bar while window messages use
  client coordinates.
- Target proof: after-target screenshot hash matched target-readback screenshot
  hash.
- Rollback proof: before screenshot hash matched final-readback screenshot
  hash.
- Final state: popup/modal `0/0`, `Responding=true`, `moduleSave=false`, no
  global mouse/keyboard, no canvas input.

Decision:

- Promote `C03E` as accepted for one color field (`Skin`) using visual hash
  readback and rollback.
- Do not use this acceptance to promote every color category; hair/tattoo can
  remain separate follow-ups if needed.

## C07 blocker addendum, 2026-06-21

- Item equip placement is governed by a bitwise mask rule:
  `itemMask & slotMask != 0`. Live/GFF mapping confirmed `chest=0x000002`
  and `righthand=0x000010`.
- The live equipment route is not plain drag/drop onto visible `TPanel`
  slots. For the tested item family it is `Standard Items` to `Contents`,
  then double-click in `Contents` to trigger Aurora's equip logic.
- C07B remains blocked on the current Kwatermistrz weapon target. Replacement
  attempts for Club/Longsword/Rapier/Torch did not produce an accepted
  `righthand` roundtrip; several weapons surface proficiency warnings instead
  of a clean replacement path.
- C07C Boy/chest evidence:
  `.codex-tmp/aurora-live-evidence/creature-c07c-boy-chest-lastwords-commit-undo-roundtrip-20260621-152627-779`
  proved identity guard `Boy/ZEP_MALEKID002`, baseline chest empty, committed
  `Last Words`, and reopen/readback `Last Words`.
- C07C is not accepted because final rollback failed: targeted toolbar Undo
  returned cleanly but final readback still showed `Last Words`. Earlier
  precommit rollback routes also failed to remove the probe from `Contents`
  through Delete, trash click, or targeted drag-to-trash.
- Cleanup after the failed C07C mutation used a no-save discard reload:
  first `&Nie` for "Would you like to save your changes to the module?",
  second `&Nie` for "This area has been modified. Keep changes?", followed by
  read-only verification
  `.codex-tmp/aurora-live-evidence/creature-c07c-boy-chest-readonly-after-discard-reload-20260621-153527-779`
  showing Boy identity matched, chest empty, title without `*`, popup/modal
  `0/0`, and `Responding=true`.
- C07F accepted on existing Kwatermistrz inventory item `Torch`:
  `.codex-tmp/aurora-live-evidence/creature-c07f-kwatermistrz-torch-dropable-roundtrip-20260621-154030-368`.
  The run selected `Torch`, read `Dropable=false`, toggled to `true`,
  committed Inventory and Creature properties, reopened/read back `true`,
  restored `false`, committed again, and final readback returned `false`.
  `Pickpocketable` stayed unchanged, popup/modal ended `0/0`, and
  `Responding=true`.

## C07A context-menu remove blocker addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c07a-torch-contents-context-menu-probe-20260621-164228-869`
- Cleanup audit:
  `.codex-tmp/aurora-live-evidence/creature-c07a-context-probe-post-cleanup-audit-20260621-164532-765`

Facts:

- Target was the existing Kwatermistrz `Contents` item `Torch`; no new item was
  added for this probe.
- The probe selected `Torch` in the `Contents` `TDrawGrid`.
- Targeted right-click on the selected row did not open a popup/context menu:
  `popupOpened=false`, `hasRemoveCandidate=false`.
- The right-click/double-click behavior opened `TdlgItemEdit` / `Item
  Properties`, not a remove route.
- Manual targeted cleanup clicked `Cancel` on `Item Properties`, `Inventory
  Contents`, and `Creature Properties`; Toolset remained `Responding=true`.

Decision:

- Do not repeat the `Contents` right-click route as C07A remove promotion.
- C07A remains `missing/blocker`: Standard Items double-click can add to
  `Contents`, but remove/final-absent readback still lacks an accepted route.
- Move active work to C08 unless a genuinely new C07A remove route is found.

## C08A placement rollback acceptance addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c08a-commoner-placement-undo-roundtrip-clean-20260621-165620-455`

Facts:

- The runner now makes the palette state explicit: first family icon to
  `Creatures`, then `NPCs` root, `Humans` root, and `Commoner, Male`.
- The accepted live run placed one temporary creature instance: area tree count
  `1220 -> 1221`.
- Cleanup used targeted toolbar Undo and verified area tree count returned
  `1221 -> 1220`, with final count `1220`.
- Toolset auto-opened `TdlgCreatureEdit`; the runner closed it via targeted
  `Cancel` after rollback.
- Final safety: popup/modal `0/0`, `Responding=true`, `moduleSave=false`,
  no global mouse, no global keyboard.

Acceptance:

- Promote `C08A` as accepted for placement plus clean Undo rollback.
- Do not treat this as a promoted delete/remove route; earlier delete/remove
  probes remain non-accepted.
- `C08B` is now unblocked enough to attempt a placed-creature Adjust Location
  roundtrip with the same rollback and final-cleanup standard.

## C08B placed creature Adjust Location acceptance addendum, 2026-06-21

Evidence:

- Setup:
  `.codex-tmp/aurora-live-evidence/creature-c08b-commoner-placement-for-adjust-setup-20260621-170519-497`
- Discovery guard:
  `.codex-tmp/aurora-live-evidence/creature-c08b-commoner-adjust-location-discovery-cancel-20260621-170624-947`
- Roundtrip:
  `.codex-tmp/aurora-live-evidence/creature-c08b-commoner-adjust-location-x-roundtrip-rollback-20260621-170738-051`
- Final cleanup:
  `.codex-tmp/aurora-live-evidence/creature-c08b-commoner-adjust-cleanup-undo-to-baseline-20260621-171122-384`

Facts:

- The setup reused the accepted C08A palette route and kept one temporary
  `Commoner, Male` placed for the follow-up slice: object count `1220 -> 1221`.
- The discovery guard selected the visible `Commoner, Male` row at
  `TargetX=105`, `TargetY=845`, opened `TdlgLocation`, and cancelled without
  mutation.
- The roundtrip used `Adjust Location` on that target and changed X only:
  `31,65 -> 31,75 -> 31,65`, with move readback and final rollback readback
  both accepted.
- The target object count stayed `1221` during the transform roundtrip.
- Final cleanup used targeted Undo until the area tree returned to baseline
  `1221 -> 1221 -> 1220`.
- Final safety: popup/modal `0/0`, `Responding=true`, `moduleSave=false`,
  no global mouse, no global keyboard.

Acceptance:

- Promote `C08B` as accepted for placed-creature Adjust Location X roundtrip.
- This proves coordinate-dialog mutation/readback/rollback for a placed
  creature. It does not yet promote multi-axis transform, `Apply`, save/reload,
  runtime spawn, or runtime movement parity.

## C10 scripts acceptance addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c10a-scripts-readonly-map-20260621-172448-772`
- `.codex-tmp/aurora-live-evidence/creature-c10c-existing-script-editor-readonly-20260621-172634-722`
- `.codex-tmp/aurora-live-evidence/creature-c10b-script-picker-discovery-20260621-172744-068`
- `.codex-tmp/aurora-live-evidence/creature-c10b-onuserdefined-picker-bind-roundtrip-20260621-172957-730`
- `.codex-tmp/aurora-live-evidence/creature-c10d-create-compile-bind-roundtrip-20260621-175507-036`
- `.codex-tmp/aurora-live-evidence/creature-c10d-post-accepted-reload-final-clean-count-20260621-175905-274`
- `.codex-tmp/aurora-live-evidence/creature-c10d-post-reload-final-slot-readback-20260621-180218-377`

Facts:

- Target identity guard matched `Kwatermistrz Steel`, tag `Kwatermistrz`.
- C10A mapped 13 script slots. Key values included
  `OnSpawn=x2_def_spawn`, `OnConversation=lib_build_npc`, and
  `OnUserDefined=x2_def_userdef`.
- C10B used the `...` resource picker on `OnUserDefined` and roundtripped
  `x2_def_userdef -> x2_def_spawn -> x2_def_userdef` through
  `OK`/reopen/readback/rollback/final readback.
- C10C opened existing script `x2_def_spawn` in `TdlgScriptEditor` and closed
  with targeted `Exit`, without save or compile.
- C10D set `OnUserDefined` to new resref `cod_cre_c10d`, accepted the create
  prompt, edited the script body, compiled it, and captured screenshot proof of
  `0 Errors: 'cod_cre_c10d' compiled successfully`.
- C10D then closed the editor, committed the bind, reopened/read back
  `cod_cre_c10d`, used the picker to restore `x2_def_userdef`, and final
  readback confirmed `x2_def_userdef`.
- Post-acceptance cleanup used no-save reload/discard to clear the temporary
  in-memory script resource. Final passive count showed popup/modal `0/0`,
  `Responding=true`, title without `*`, and `moduleSave=false`.
- After a fresh reload, selecting the creature only in the left tree can expose
  a context menu with `Focus on Object`, not `Properties`. The reliable route is
  `Focus on Object`, then reselect
  `Areas > enon_test_build > Creatures > Kwatermistrz`, then direct
  properties command.

Acceptance:

- Promote `C10A`, `C10B`, `C10C`, and `C10D` as accepted.
- Keep `C10E` deferred. Save Script Set / Load Script Set is external-state
  workflow and must stay separate from event-slot binding and script creation.
- C16D runtime script-event smoke is now unblocked on authoring proof, but still
  needs an approved runtime harness before execution.

## C11 conversation acceptance addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c11b-conversation-picker-readonly-map-20260621-181439-246`
- `.codex-tmp/aurora-live-evidence/creature-c11c-existing-conversation-editor-readonly-20260621-181557-278`
- `.codex-tmp/aurora-live-evidence/creature-c11d-create-bind-dialog-lifecycle-20260621-182252-880`
- `.codex-tmp/aurora-live-evidence/creature-c11d-post-accepted-reload-discard-temp-dialog-20260621-182539-942`
- `.codex-tmp/aurora-live-evidence/creature-c11d-post-accepted-reload-final-clean-count-20260621-182638-752`
- `.codex-tmp/aurora-live-evidence/creature-c11e-no-interrupt-toggle-roundtrip-20260621-181812-616`

Facts:

- C11B opened the Basic tab Conversation `...` picker as `TdlgResOpen` /
  `Select Resource`, captured the picker `TListView`, resource-name edit,
  resource-type combos, `Open`, and `Cancel`, then cancelled cleanly.
- C11C used existing safe conversation `char_rebuild` in the uncommitted
  Basic conversation field, opened `TdlgConversationEditor` titled
  `Conversation Editor - char_rebuild`, then closed with `Done` and cancelled
  Creature Properties. No conversation field commit was made.
- C11E roundtripped `No Interrupt` with live checkbox state:
  `0 -> 1 -> 0`, using `OK`/reopen/readback, restore, second `OK`, final
  reopen/readback, and final `Cancel`.
- C11D set new conversation resref `cod_cre_c11d`, opened
  `Conversation Editor - cod_cre_c11d`, closed with `Done`, committed the
  creature field, and reopened Creature Properties. The Basic Conversation
  combo does not expose its text through `GetWindowText`, so acceptance uses
  visual readback: `05-readback-new-dialog-bound.png` shows `cod_cre_c11d`.
  Rollback restored the original blank Conversation field, and a no-save
  reload/discard clicked two `&Nie` confirmations to remove the temporary DLG
  resource from memory.
- All four runs ended with popup/modal `0/0`, `Responding=true`,
  `moduleSave=false`, no global mouse/keyboard, and no canvas input. C11E can
  leave the Toolset title dirty (`*`) because the in-memory module was mutated
  and restored without saving; C11D cleanup returned the title to clean
  no-asterisk state after reload.

Acceptance:

- Promote `C11B`, `C11C`, `C11D`, and `C11E` as accepted.
- The C11 group is complete for authoring proof. `C16B` runtime conversation
  smoke is now unblocked on authoring evidence, but still requires an approved
  runtime harness before execution.

## C12 classes acceptance addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c12a-classes-map-before-alignment-v2-20260621-183554-662`
- `.codex-tmp/aurora-live-evidence/creature-c12a-alignment-roundtrip-20260621-183723-443`
- `.codex-tmp/aurora-live-evidence/creature-c12b-class-level-roundtrip-20260621-184733-095`
- `.codex-tmp/aurora-live-evidence/creature-c12b-post-level-roundtrip-clean-count-20260621-184945-360`
- `.codex-tmp/aurora-live-evidence/creature-c12c-default-package-roundtrip-20260621-184146-890`

Facts:

- After a no-save reload, direct properties commands on the selected tree row
  did not open Creature Properties. The accepted route used the same fallback
  proven in C10: right-click Kwatermistrz, choose `Focus on Object`, reselect
  `Areas > enon_test_build > Creatures > Kwatermistrz`, then open Properties.
- The Classes tab map identified the alignment `TComboBox` separately from
  class rows and `Default Package for Autolevelup`. Baseline was
  `True Neutral`; the combo list contained the nine alignment values.
- C12A roundtripped Alignment from `True Neutral` to `Lawful Neutral`, clicked
  `OK`, reopened/read back `Lawful Neutral`, restored `True Neutral`, clicked
  `OK`, and reopened/final-read back `True Neutral`.
- C12C roundtripped `Default Package for Autolevelup` from `Default Fighter`
  to `Fighter, Finesse`, clicked `OK`, reopened/read back `Fighter, Finesse`,
  restored `Default Fighter`, clicked `OK`, and reopened/final-read back
  `Default Fighter`.
- C12B edited the first class-row level field directly, not through the
  Levelup Wizard: Fighter level `1 -> 2 -> 1`, with `OK`/reopen/readback,
  rollback, second `OK`, final reopen/readback, and final `Cancel`. Class
  value stayed `Fighter`, Alignment stayed `True Neutral`, and Default Package
  stayed `Default Fighter` across readback/final states.
- Final cleanup ended with popup/modal `0/0`, `Responding=true`,
  `moduleSave=false`, no global mouse/keyboard, and no canvas input.
  C12B left the Toolset title dirty (`*`) after a restored in-memory mutation;
  this is acceptable here because the module was not saved and final readback
  restored the edited field.

Acceptance:

- Promote `C12A`, `C12B`, and `C12C` as accepted.
- Keep `C12D` deferred. The old broad C12 read-only/wizard proof does not
  count as Levelup Wizard mutation proof.

## C04 statistics follow-up acceptance addendum, 2026-06-21

Evidence:

- `.codex-tmp/aurora-live-evidence/creature-c04a-strength-roundtrip-20260621-163138-461`
- `.codex-tmp/aurora-live-evidence/creature-c04c-fortitude-bonus-roundtrip-20260621-163241-464`
- `.codex-tmp/aurora-live-evidence/creature-c04d-natural-armor-roundtrip-20260621-163341-842`
- `.codex-tmp/aurora-live-evidence/creature-c04e-movement-rate-roundtrip-20260621-163444-634`

Facts:

- Target identity guard matched `Kwatermistrz Steel`, tag `Kwatermistrz`,
  before every mutation.
- `C04A` used `Statistics.Ability Scores.Strength` and roundtripped
  `16 -> 17 -> 16`.
- `C04C` used `Statistics.Saves.Fortitude Bonus` and roundtripped
  `0 -> 1 -> 0`.
- `C04D` used `Statistics.Armor Class.Natural Armor` and roundtripped
  `0 -> 1 -> 0`.
- `C04E` used `Statistics.Speed.Movement Rate` and roundtripped
  `Default -> DM Fast -> Default`.
- Every run used properties `OK`, reopen/readback, restore, second `OK`,
  final reopen/readback, and final `Cancel`.
- Every run ended with popup `0`, no visible Creature Properties dialog, no
  visible Creature Properties preview, `Responding=true`, `moduleSave=false`,
  no global mouse/keyboard, and no canvas input.

Acceptance:

- Promote `C04A`, `C04C`, `C04D`, and `C04E` as accepted.
- Keep `C04B` accepted from the earlier Base HP evidence; C04 has no remaining
  statistics follow-up slices in this source-of-truth.
- Do not use these acceptances to promote non-statistics slices such as
  Classes, Skills, Feats, inventory, or script workflows.

## Source-of-truth reconciliation addendum, 2026-06-21

This is a ledger correction, not a new live Toolset run.

- `C04B` is promoted to accepted because `creatures-live-results.md` records
  accepted Base HP evidence:
  `.codex-tmp/aurora-live-evidence/creature-c04-base-hp-roundtrip-20260620-231200-766`
  plus `summary.accepted.json`. The accepted values are Base HP
  `5 -> 6 -> 5`, with readback/rollback/final cleanup.
- `C13A` is promoted to accepted because `creatures-live-results.md` records
  accepted Skills evidence:
  `.codex-tmp/aurora-live-evidence/creature-c13a-skills-rank-roundtrip-v2-20260621-011320-751`
  plus `summary.accepted.json`. The accepted values are `Tropienie` Rank
  `0 -> 1 -> 0`, with readback/rollback/final cleanup.
- The C04 statistics group is now complete through C04A-C04E; the remaining
  C13 slices are `C13B-C13E`.

## Operating note

Do not count read-only maps as completed mutation slices. In particular,
`opened-live` for `Inventory Contents` proves the editor route, not the ability
to add inventory contents or replace equipment.

Offline inspection through `nwn-mcp` is allowed as a sidecar verifier, especially
for `Equip_ItemList`, `ItemList`, `ClassList`, `SkillList`, `FeatList`, scripts,
position, orientation, faction, and conversation. It cannot promote a slice by
itself; promotion still requires live Toolset screenshot/readback/rollback
evidence.

# Existing Area Placeable durability/save `Byte` fields audit v1

Date: 2026-08-18  
Status: durability/save Bytes and HP/CurrentHP offline-verified; runtime recertification pending

## Scope and authority

This audit covers four independent fields on one retained type-`9` Area GIT
Placeable: `Hardness`, `Fort`, `Ref`, and `Will`. It does not admit `HP`,
`CurrentHP`, appearance, faction, portrait, animation state, description,
conversation, or any runtime combat-behaviour claim.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding Toolset binary SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
No xoreos or other GPL source was inspected or used.

## Recovered native lineage

The placed-Placeable reader `FUN_0063d0d8` delegates instance state to
`FUN_0063bf74`, which delegates the common situated-object fields to
`FUN_0063ae68`. That common reader loads:

- `Hardness` through the native `Byte` reader into the byte at situated-object
  offset `0xa0`;
- the three adjacent save fields through the same native `Byte` reader into
  offsets `0xa1`, `0xa2`, and `0xa3`.

The symmetric writer lineage is `FUN_0063d3d8` -> `FUN_0063c0a8` ->
`FUN_0063b8a0`. It writes the same four offsets with the native `Byte` writer.
The installed retail `plc_watertrough.UTP` profile, immutable source SHA-256
`a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`,
independently fixes the labels and types as:

```text
Hardness : Byte = 5
Fort     : Byte = 16
Ref      : Byte = 0
Will     : Byte = 0
```

The already accepted Toolset-created Placeable construction readback and the
production construction writer preserve those exact fields in the type-`9`
GIT instance. This is sufficient to close the storage mapping. It does not
prove a new web-authored candidate in Toolset or NWN; fresh certification is
still required by the parent Area program.

## Frozen mutation contract

Area detail metadata exposes the four values as `hardness`,
`fortitudeSave`, `reflexSave`, and `willSave`. The frontend retains the exact
presence-sensitive values as immutable Placeable provenance and carries the
editable target values in `placeableProperties`.

Each value is a safe integer in `0..255`. A mutation contains only changed
pairs, in the fixed native order `Hardness`, `Fort`, `Ref`, `Will`, with the
exact source and target values. The source GIT SHA-256, source Placeable
ordinal, and source object identity remain the outer optimistic lock.

The writer requires exactly one matching native `Byte` field, verifies the
current value, replaces only that value, preserves the rest of the complete
GIT struct, and preserves GIC byte-for-byte. Missing, duplicate, wrongly typed,
unsupported, reordered, stale, unchanged, out-of-range, cross-family, or
deletion-colliding mutations fail closed. Independent readback compares the
complete candidate Placeable struct against the exact admitted reconstruction.

`HP` and `CurrentHP` are deliberately excluded. Aurora stores both as native
`Short` fields while the current web dialog exposes one `Hit Points` control;
their editing relationship requires a separate source audit before code may
bind that control to either or both fields.

### Source-closed `HP` / `CurrentHP` result

The storage, Toolset editing relationship, and admitted input range are now
source-closed. They remain a separate mutation slice from the four Byte fields
covered by this audit's original implementation checkpoint.

`FUN_0063ae68` reads `HP` and `CurrentHP` as two native `Short` fields at
situated-object offsets `0x9c` and `0x9e`. `FUN_0063b8a0` writes the same two
fields symmetrically. The basic Placeable frame loader `FUN_006f4690` displays
only offset `0x9c` in the `Hit Points` edit control, and `FUN_006f4b40` writes
that control back only to offset `0x9c`.

The parent situated editor performs the coupled `CurrentHP` update. On load,
`FUN_006ef930` computes a stored single-precision multiplier using signed
integer division:

```text
multiplier = trunc(CurrentHP / HP)
```

On save, `FUN_006ef6d0` first writes the new `HP`. Only when the stored
multiplier is greater than zero it writes:

```text
CurrentHP = max(1, round(newHP * multiplier))
```

When the multiplier is zero or negative, the parent path leaves `CurrentHP`
unchanged. The exact instructions are visible at virtual addresses
`0x006efd17..0x006efd32` (load-time signed `idiv` and float store) and
`0x006ef8d6..0x006ef913` (positive comparison, multiplication, rounding, and
minimum-one clamp) in the hashed Toolset binary above.

The compiled `TFRASITUATEDBASIC` form resource independently identifies the
controls `eHP` and `udHP` and labels them `Hit Points`. The apparent serialized
`udHP.Min = 0` is not the effective editing range. The situated-basic frame
initializer `FUN_006f3e5c` explicitly calls `FUN_0091d260(control, 1)` and
`FUN_0091d2a0(control, 10000)` for the HP control. Those two helpers update the
control's stored minimum/maximum and send Win32 `UDM_SETRANGE32` (`0x46f`) with
the same values. Therefore the authoritative Toolset editing range is exactly
`1..10000`; zero is not an admitted editable source or target.

The positive-multiplier CurrentHP path is also exact. The quotient stored by
`FUN_006ef930` is signed integer truncation toward zero, then represented as a
single-precision value. On save, `FUN_006ef6d0` multiplies the new HP by that
integer-valued multiplier, rounds the already-integral result, narrows it to a
signed 16-bit `Short`, and replaces any narrowed value below `1` with `1`.
When the quotient is zero or negative, `CurrentHP` is not written and its
exact signed-Short value is preserved.

For a source pair `(oldHp, oldCurrentHp)` and target `newHp`, the admitted
product computation is therefore:

```text
require oldHp and newHp in 1..10000
require oldCurrentHp in -32768..32767
multiplier = trunc(oldCurrentHp / oldHp)
if multiplier <= 0:
  newCurrentHp = oldCurrentHp
else:
  narrowed = signedInt16(newHp * multiplier)
  newCurrentHp = max(1, narrowed)
```

Only one exact present native `HP : Short` plus one exact present native
`CurrentHP : Short` authorizes editing. Missing, duplicate, wrong-case,
wrong-type, or out-of-Toolset-range HP provenance remains preserve-only. The
web UI exposes only `Hit Points`; `CurrentHP` is an immutable source value and
derived native target, never an independent control.

## Completion boundary

Source closure requires backend and frontend focused tests, full-struct GIT
readback, exact GIC preservation, builds, and a recorded program checkpoint.
Mutation testing is optional and requires an explicit user request.
Toolset/NWN runtime semantics and the full Area CRUD/tile program remain open.

## HP / CurrentHP implementation checkpoint — 2026-08-18

The separate source-closed HP lane is now implemented end to end. The parser
emits provenance only from one complete canonical type-`9` `HP : Short` plus
`CurrentHP : Short` pair. Projection independently derives CurrentHP from the
immutable source pair and the new HP. Planning reparses and compares the exact
native ordinal, and the pair writer replaces only those two Shorts, performs
whole-struct and receipt readback, and preserves every GIC byte.

The frontend retains the immutable pair, enables the single Hit Points control
only for exact existing `aurora_git` Placeable provenance, enforces `1..10000`,
and materializes only a proven existing target. CurrentHP is never exposed as
an independent target. Apply, clone, cancel, undo, and redo preserve the source
pair.

Final focused verification passed 1,367/1,367 backend tests and 128/128
frontend tests. Both production builds passed; the frontend retained only the
pre-existing chunk-size warning. Dedicated mutation gates reached 100%:
206/206 active backend mutants and 121/121 active frontend mutants were killed,
with zero timeouts, survivors, uncovered mutants, or errors. Exact report
sizes, hashes, and contract gates are recorded in
`evidence/area-existing-placeable-hit-points-2026-08-18/`.

The mutation profiles omit only two backend defensive rechecks whose inputs
are already fixed by the same strict parser/projector invariant: the planner
can receive either the complete HP/CurrentHP pair or neither, and the projector
cannot receive a null mutation after its identical source, target, change, and
derivation admission. Frontend Workspace component wiring is not treated as a
second copy of the domain semantics; its reducer and materializer are mutated
at the application boundary. The redundant scene-normalizer HP value equality
was removed because exact presence plus direct admitted-value projection
already determines equality.

The public Toolset automation registry still exposes no HP property atom, so
no unregistered native UI automation was substituted. Fresh Toolset
Save/Build/reopen, packed readback, and NWN runtime certification remain open
and are not implied by this offline checkpoint.

## Current durability/save Byte Area CRUD closure — 2026-08-26

The saved-workspace boundary now validates the exact retained Placeable
family, `aurora_git` layer, non-negative source ordinal, and the
presence-sensitive `placeableDurabilitySaveBytes` map. The map must contain one
to four unique supported members from `hardness`, `fortitudeSave`,
`reflexSave`, and `willSave`; every proven source and matching target must be
an integer in `0..255`. Presentation-only targets remain loadable when no
native map is present and cannot become writable provenance.

The current Area Update integration changes one retained Placeable from
`Hardness=5, Fort=16, Ref=0, Will=0` to `8, 20, 12, 10`, verifies all four exact
native Bytes, and proves paired GIC and IFO byte identity. The dedicated
frontend regression covers Apply plus OK, a separate Cancel, another OK,
reopen, and local Save while the immutable source map remains unchanged.

The accepted resource-bounded gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `42/42`
assertions, six frontend unit/regression files with `477/477` assertions, and
passing backend and frontend production builds. The frontend build retains
only the existing large-chunk advisory. Capability catalog revision
`2026-08-26.64` records this audit under the consolidated remaining-property
and live-proof blockers.

This closure is offline evidence only and does not add any runtime combat
claim. Fresh browser readback, an exact packed candidate, Toolset
Save/Build/reopen, and NWN certification remain open. No Docker engine,
container, managed service, watcher, browser, capture, Chrome, Toolset, NWN,
or mutation-test process was started for this closure.

## Current HP/CurrentHP Area CRUD closure — 2026-08-26

The saved-workspace boundary now admits only one exact retained
`placeableHitPointState` with exactly `hitPoints` and `currentHitPoints`.
Source HP must be an integer in the Toolset range `1..10000`, CurrentHP must be
one signed native Short, and the independently editable HP target must remain
in `1..10000`. A presentation-only HP value remains loadable when the native
pair is absent and cannot become writable provenance.

The current Area Update integration changes one retained Placeable from
`HP=15, CurrentHP=45` to `HP=30, CurrentHP=90`, proving the recovered positive
multiplier derivation, exact native Short writes, complete candidate readback,
and paired GIC/IFO byte identity. The dedicated frontend regression covers
Apply plus OK, a separate Cancel, another OK, reopen, and local Save while the
immutable source pair remains unchanged and CurrentHP is never exposed as an
independent editable target.

The accepted resource-bounded gate is seven backend unit suites with
`1801/1801` assertions, the Area Update integration suite with `43/43`
assertions, six frontend unit/regression files with `507/507` assertions, and
passing backend and frontend production builds. The frontend build retains
only the existing large-chunk advisory. Capability catalog revision
`2026-08-26.64` already binds this shared durability/HP audit under the
consolidated remaining-property and live-proof blockers.

This closure is offline evidence only. Fresh browser readback, an exact packed
candidate, Toolset Save/Build/reopen, and NWN runtime certification remain
open. No Docker engine, container, managed service, watcher, browser, capture,
Chrome, Toolset, NWN, or mutation-test process was started for this closure.

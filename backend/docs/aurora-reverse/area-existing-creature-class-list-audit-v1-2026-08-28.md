# Existing Area Creature `ClassList` audit v1

Date: 2026-08-28  
Status: native storage, validation, calculated-state, spell-reset, package coupling, and tail-only slot-count semantics source-closed; same-roster level and class-identity mutation implemented offline; tail-only slot-count contract frozen; remaining implementation and live proof pending

## Decision

Aurora Web may expose retained type-`4` Area GIT Creature `ClassList` editing
only through the source-closed bounded profiles recorded by this audit. A
class entry is not an isolated display tuple. Native storage couples each
active class to fourteen level-indexed spell lists, and the Toolset rebuilds
all eight runtime class slots from its class, level, and spell controls before
saving. Class changes also refresh calculated Creature state and the
class-filtered `StartingPackage` selector.

The existing web table previously changed only detached scene
`classEntries`. Area Update did not project or persist those values. That was a
false write affordance. Retained class ID, class name, level, and legacy
default-package controls are now visibly `PRESERVE_ONLY` and disabled. Local
new-Creature drafting remains active because its existing creation compiler
owns a separate, explicit default-class contract.

This audit does not reject retained `ClassList` authoring permanently. It
defines the coupled contract that must be implemented before the control can
become `ACTIVE_NOW`.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| frozen Toolset RCDATA report | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |
| retail `TDLGCREATUREEDIT` RCDATA payload | `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e` |

No xoreos source or other GPL implementation is used as runtime authority.

## Native GFF closure

Common Creature reader `FUN_00532174` clears eight in-memory class slots and
opens exact canonical `ClassList` at decompiled lines `194832-194845`. For
each list struct it reads `ClassLevel : Short` through `FUN_00aeee20` and
`Class : Int` through `FUN_00aeeed8` at lines `194850-194864`. A zero level
does not produce an active class slot.

Each admitted runtime slot owns fourteen spell-level containers. For class IDs
`1` and `9`, the reader looks for `KnownList0` through `KnownList13`; it also
looks for `MemorizedList0` through `MemorizedList13`. Spell entries contain
`Spell : Word`, `SpellMetaMagic : Byte`, and `SpellFlags : Byte` at lines
`194865-194980`. The numeric class IDs are native Int values; localized class
names are not persistence identity.

Reciprocal common writer `FUN_0053521c` creates canonical `ClassList`, writes
only slots whose class is not `-1` and whose level is greater than zero, and
uses list-struct type `2`. It writes `Class : Int` and `ClassLevel : Short` at
lines `195288-195296`. It then emits up to fourteen spell lists, choosing
`KnownListN` for class IDs `1` and `9` and `MemorizedListN` for other class
IDs; spell entries use struct type `3` and the exact Word/Byte/Byte members at
lines `195297-195370`.

These reciprocal routines prove the field types, case-sensitive labels,
struct types, active-slot rule, maximum of eight runtime slots, and nested
spell ownership. They do not prove that changing only `Class` or
`ClassLevel` while preserving all other Creature members matches Toolset
authoring behavior.

## Toolset dialog closure

Frozen retail `TDLGCREATUREEDIT` exposes eight class selectors (`cbClass1`
through `cbClass8`), eight paired level controls, eight spell-class radio
buttons, the `cbStartingPackage` package selector, and the spell-table actions.
The class level controls are initialized with native UI bounds `1..60` at
decompiled lines `67689-67731`. Later class slots start disabled and are
enabled progressively by the class-change handlers.

Dialog loader `FUN_0044b110` iterates all eight native class slots and calls
`FUN_00456700` at lines `70081-70084`. That helper maps class identity through
ComboBox item data, restores the level, and feeds every one of the fourteen
slot spell containers into the dialog model at lines `75163-75282`.

Before commit, `FUN_0044d028` iterates all eight destinations, calls
`FUN_00512d14` to reset each complete runtime class slot, obtains the selected
class ID from ComboBox item data minus its one-based sentinel, writes the
selected level, and calls `FUN_0046a76c` to rebuild the nested spell state at
lines `70234-70400`. Save wrappers call this transfer at lines
`71348-71376`.

The eight class-change handlers reject duplicate selected class IDs, manage
progressive slot availability, refresh the selected class presentation, call
`FUN_004574fc` and `FUN_004632d8` to rebuild calculated Creature state, and
call `FUN_00445b08` to re-filter `StartingPackage`. `FUN_00463300`, used by
those recalculation paths, snapshots all eight selected class IDs and levels
into a dialog-owned calculation object at lines `82890-83027`.

Therefore a Toolset-parity class mutation is coupled at least to per-class
spell state, calculated Creature state, persisted hit points when levels
change, and package admission when class identities change. Treating
`ClassList` as eight independent HTML rows would be semantically incomplete.

## Native recalculation and validation closure

`FUN_00463300` writes only into the dialog-owned object at dialog offset
`+0xbe4`: eight selected class IDs at object offsets `+0x00..+0x1c`, eight
levels at `+0x20..+0x27`, and the selected Race at `+0x28`. It does not write
the retained Creature. `FUN_0053bf04` consumes that calculation object, reads
the selected class saving-throw tables and Race ability adjustments, and
writes derived values back into the same object at
`decompiled_all.c:198130-198687`. `FUN_00462e64`, `FUN_00463024`,
`FUN_00463114`, and
`FUN_004574fc` then render those values into dialog controls. No path in this
calculation graph calls the common Creature writer or mutates the retained
Creature object.

The apparently presentation-only graph does not eliminate all persisted
coupling. Save validation `FUN_00457e70` checks every active slot against the
per-class maximum `60`, sums the active levels, and rejects totals of `181` or
more at lines `76127-76566`. The same function recalculates the Base HP lower
bound and visible Total HP using Constitution, Race adjustment, and feat row
`40`. `FUN_0044d360` later persists the resulting `HitPoints`,
`CurrentHitPoints`, and `MaxHitPoints` Short triplet. Consequently a retained
level change must atomically carry the already source-closed hit-point
dependencies and target triplet; preserving the old triplet would not match a
Toolset Save.

A class-identity change has a different native effect. Its handler calls
`FUN_0045f778`, which destroys and clears the complete per-slot spell model,
then `FUN_00463fe8`, which rebuilds the target class's available spell model
from the effective class/spell tables. The rebuilt entries start with cleared
selection state. The handler then calls `FUN_00445b08`, which repopulates the
package selector with rows whose `ClassID` matches one of the selected class
IDs, retains the old physical package row only when it remains admitted, and
otherwise selects the first admitted row. A web class-ID mutation must
therefore own an explicit target spell graph (or an explicit confirmed clear)
and an exact target `StartingPackage`; it may not silently preserve an old
class's spell lists or package binding.

This closes the previously unknown recalculation graph. The derived base
saves, racial ability adjustments, and related labels are runtime/dialog
calculations rather than additional GFF mutation targets. The persisted
dependencies are the complete `ClassList` graph itself, the HP triplet for a
level transition, and `StartingPackage` for a class-identity transition.

## Current Aurora Web boundary

The Area parser's `classListEntries` metadata is presentation-oriented. It
normalizes class and level values, flattens the fourteen named lists into
arrays, and does not retain exact field presence, duplicate/case ambiguity,
struct type, native type, per-list emptiness, or opaque siblings. It is useful
for read-only display but cannot authorize a write.

The exact parser used by retained `StartingPackage` admission proves a single
canonical list with one to eight type-`2` structs and exact `Class : Int` plus
`ClassLevel : Short`, but intentionally returns only ordered class IDs. It
also cannot authorize `ClassList` mutation.

New-Creature creation already writes a separate explicit canonical default
entry (`Class : Int`, `ClassLevel : Short`) through the Area object-pair
writer. This audit does not change that creation contract.

## Required additive mutation contract

Retained mutation may become active only after all of the following exist:

1. Exact source provenance for the single canonical `ClassList`, including
   ordered type-`2` entries; exact `Class : Int` and `ClassLevel : Short`;
   every `KnownList0..13` and `MemorizedList0..13` with exact list presence,
   order, struct type, native spell-member types, and opaque siblings.
2. Immutable `classes.2da` identity and numeric row admission for every
   target class. Display labels may never become persistence identity.
3. One coupled compare-and-swap target that includes the complete expected
   class/spell graph and target class IDs and levels. A level transition must
   include the exact source-closed HP dependencies and target Short triplet. A
   class-ID transition must include the expected and target
   `StartingPackage` and either the complete explicit target spell graph or a
   separate destructive-clear confirmation. Unsupported or ambiguous
   dependencies must reject the mutation rather than be defaulted.
4. Compiler-side reparse and fresh catalog admission, raw GIT-only mutation
   preserving every unrelated field and paired GIC/ARE/IFO bytes, and exact
   candidate readback of the complete coupled graph.
5. Focused tests for missing/duplicate/wrong-case/wrong-native-type fields,
   stale source, reordered entries, duplicate class IDs, all fourteen spell
   levels, caster-class variants, package invalidation, readback mismatch,
   and no-op byte identity.
6. Fresh guarded browser Apply/Save/reopen proof followed by exact-candidate
   Toolset Save/Build/reopen and NWN behavior proof.

The per-slot `1..60` limit and total active-level limit `1..180` are
established. No automatic level-up package application or spell-legality rule
is inferred here. Those remain separate Aurora-first closure requirements for
package application and arbitrary spell-list authoring respectively.

## Offline implementation status

The exact same-roster class-level slice is now implemented offline. Parsing
retains one canonical type-`2` `ClassList`, ordered `Class : Int` and
`ClassLevel : Short` pairs, and per-entry opaque-sibling counts. Projection,
planning, and writing require the same entry count, class IDs, order, source
levels, and opaque counts; allow only levels `1..60` with a total no greater
than `180`; mutate only the existing `ClassLevel : Short` members; and preserve
every nested spell list and opaque sibling byte-for-byte.

Every level change is atomically coupled to the exact retained HP state and a
derived target `HitPoints`/`CurrentHitPoints`/`MaxHitPoints` Short triplet.
Either half without the other, or a mismatched target level vector, is
rejected. The frontend transports detached exact provenance, keeps class IDs,
names, slot count/order, spell controls, and legacy package text
`PRESERVE_ONLY`, enables only proven level inputs, recalculates HP with the
target levels, and fails closed during final materialization.

Backend application source typecheck and frontend application source
typecheck pass under the 1 GiB heap ceiling. Resource-safe frontend gates pass
`239/239` focused contract/domain/dialog assertions and `511/511` mapper,
workspace, and clone assertions. New backend domain, parser, projector,
planner, writer, and readback regressions are authored, and the two largest
modified specs pass syntax transpilation. The ordinary backend Jest runner
remains unexecuted because two earlier exact bounded attempts exhausted its
1 GiB heap before running assertions.

Capability revision `2026-08-28.91` therefore replaces the broad
`creature_class_list_coupled_mutation_incomplete` blocker with explicit
backend-test, browser-readback, Toolset, NWN, and remaining class-ID/spell/slot
blockers. Class-ID, slot-count, and arbitrary spell-list mutations still
require their explicit target graph/catalog contracts; this bounded level
slice does not imply them.

## Same-roster class-identity destructive-clear closure

A further read-only pass closes the bounded class-ID replacement path without
guessing arbitrary spell legality. `FUN_0045978c` loads exact `classes.2da`,
iterates physical rows, reads exact `NAME`, and stores `physicalRowIndex + 1`
as ComboBox item data; the class-change and save paths subtract that UI
sentinel. A read-only PE virtual-address probe of the admitted
`nwtoolset.exe` at `0x00bb21ad` recovered the adjacent ASCII sequence
`NAME\0\0Label\0TdlgCreatureEdit::LoadClasses...`, confirming the column
identity. A target class ID is therefore the physical row ordinal of one
immutable effective `classes.2da`, admitted only when the row carries a
non-negative numeric `NAME` StringRef. A localized name or `LABEL` is display
metadata and never persistence identity.

For a changed slot, `FUN_0045f778` destroys every entry in that slot's dialog
spell model and clears the container. `FUN_00463fe8` rebuilds the target
class's available spell model with all selection counters initialized to
zero. Save transfer `FUN_0046a76c` first clears all fourteen destination spell
containers and inserts entries only for non-zero selected counters. Finally,
common writer `FUN_0053521c` emits `KnownListN` or `MemorizedListN` only when
the corresponding container count is positive. Consequently the exact native
persisted result of a class-ID change with no subsequent spell selection is:

1. replace the changed slot's canonical `Class : Int`;
2. keep its canonical `ClassLevel : Short`;
3. remove every canonical `KnownList0..13` and `MemorizedList0..13` field from
   that changed slot;
4. preserve unchanged slots and unrelated/unknown outer Creature fields;
5. revalidate an exact target `StartingPackage : Byte` against the target
   class IDs and the same immutable effective `packages.2da`.

Aurora Web may expose this bounded path only with an explicit
`destructiveSpellClearConfirmed: true`. The compare-and-swap source carries an
exact SHA-256 fingerprint of the complete canonical `ClassList` graph,
including ordered structs, field labels/types/order, list presence/order,
spell struct types and Word/Byte/Byte members, and opaque nested siblings. The
writer must recompute that fingerprint from the current GIT before mutation.
Target and source rosters have the same non-zero count and order of slots;
levels remain unchanged in this slice; target class IDs are unique and each is
an admitted physical row of the same current `classes.2da`. Any changed slot
is cleared as above, while an unchanged slot remains byte-identical. Slot
add/remove/reorder, simultaneous ID-plus-level change, and arbitrary spell
selection remain separate blocked slices.

The coupled mutation also carries exact source and target
`StartingPackage`, immutable `classes.2da` and `packages.2da` digests and row
counts, and the ordered source/target class IDs. Compiler admission reparses
the current GIT and resolves both tables again. The target package must be a
physical Byte-domain row whose exact `ClassID` matches a target class. A
class-ID change without this package context, without explicit destructive
confirmation, with a stale graph/table, or with a non-admitted target fails
closed. Browser, Toolset Save/Build/reopen, and NWN behavior proof remain
`missing`; this static closure is not a live completion claim.

## Same-roster class-identity offline implementation status

The bounded destructive-clear profile is now implemented across the offline
Area Update path. The backend exposes and resolves immutable effective
`classes.2da` rows, admits both the source and target class vectors together
with their source/target `packages.2da` rows, and requires the exact canonical
ClassList graph fingerprint before planning a write. Projection refuses slot
count/order changes, duplicate or unadmitted class IDs, unchanged rosters,
level changes, missing destructive-clear confirmation, and a target
`StartingPackage` not admitted for the target class vector. The writer replaces
only changed `Class : Int` members, removes all canonical known/memorized spell
lists from those changed structs, preserves every unchanged struct and opaque
sibling, writes the exact package Byte atomically, and verifies the candidate
before the existing transactional ARE/GIT/GIC/IFO publication fence.

The frontend now carries detached exact class-identity provenance through the
HTTP, scene, workspace-draft, clone, and export boundaries. The Creature
dialog resolves exact class rows, prevents duplicate targets, keeps levels
disabled during a class-ID change, reloads packages against the target class
vector, and disables Apply/OK until both catalogs are exact and the destructive
spell clear is explicitly confirmed. Final materialization independently
revalidates the same roster, unchanged levels, class and package admission,
and confirmation before it emits the coupled mutation.

Backend and frontend application source typechecks pass with a 1 GiB Node heap
ceiling. The focused frontend class-catalog/domain/provenance/HTTP gate passes
`28/28`, and the workspace validation/provenance/domain gate passes `413/413`,
both with one worker. The new backend regressions were separated from the
existing 444 KB writer and 294 KB projector monoliths into bounded dedicated
specs. The repository `test:unit:bounded` runner then passed `30/30` class
table, domain, catalog-admission, projector, writer, compiler-mapping, and
resource-policy assertions without increasing the 1 GiB limit; the capability
catalog independently passes `13/13`. Capability revision `2026-08-28.94`
therefore removes the backend class-identity and same-roster ClassLevel unit
blockers and retains explicit blockers for guarded browser/Toolset/NWN proof,
slot-count mutation, arbitrary spell-graph authoring, and simultaneous
class-ID-plus-level mutation.

## Resource/process statement

This audit and implementation used only bounded reads, patches, source
typechecks, one-worker frontend tests, and syntax-only test transpilation. The
installed Toolset and NWN were not started. No Docker command, container,
service, watcher, browser, capture, Chrome, mutation test, or sub-agent was
used.

## Combined class-identity and level offline implementation status — 2026-08-31

The previously separate same-roster class-identity and class-level contracts
are now composable in one atomic retained-Creature mutation. This applies the
already source-closed effects of the two native dialog paths together. A
changed class ID still requires exact `classes.2da`/`packages.2da` admission,
an explicit destructive spell-clear confirmation, changed-slot spell-list
removal, and an admitted target `StartingPackage`. A changed level still
requires the exact source level vector, the `1..60` per-slot and `1..180`
total bounds, complete racial and HP provenance, and the coupled target
`HitPoints`/`CurrentHitPoints`/`MaxHitPoints` triplet.

The mutation now owns both `expectedLevels` and the complete target `levels`
vector. Projection emits no competing `classLevels` mutation when class
identity changes; the combined mutation supplies the target levels to HP
derivation. The raw-GIT planner compares the canonical `ClassList` graph
fingerprint, source class/level vectors, and `StartingPackage` directly. It no
longer requires catalog descriptors to be embedded in raw GIT: immutable table
identity remains in the draft mutation and is re-resolved independently at
the compiler admission gate. Optional parser-bound descriptors, when present,
are still compared.

The paired writer replaces exact `Class : Int` and `ClassLevel : Short`
members together, removes canonical known/memorized spell lists only from
slots whose class ID changed, preserves unchanged slot spell graphs and every
opaque sibling, updates `StartingPackage : Byte`, and writes the coupled HP
triplet in the same candidate. Workspace admission and the visible Creature
window require complete class, package, class-level, and HP provenance; class
and level controls are active together only under that exact contract.

Focused resource-safe verification passes `38/38` assertions across seven
backend domain/projector/planner/writer/catalog/compiler files, `64/64` Area
Update atomic-publication assertions, and `614/614` frontend class
materialization/workspace/dialog assertions. Capability revision
`2026-08-31.119` removes only
`creature_class_identity_level_combined_mutation_incomplete`. Slot-count
mutation, arbitrary spell-graph authoring, guarded browser Save/reopen,
Toolset Save/Build/reopen, and NWN behavior proof remain explicit blockers.

No Docker command, service, watcher, browser, Chrome, capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used
for this checkpoint.

## Tail-only class-slot count closure — 2026-08-31

The eight class-selector handlers close the native slot-count shape without a
live Toolset mutation. Slot one handler `FUN_0045ccc0` refuses the empty
sentinel when every later selector is empty, so a saved Creature keeps at
least one active class. Slot two through slot eight handlers
`FUN_0045d04a`, `FUN_0045d4d4`, `FUN_0045daf4`, `FUN_0045e0c0`,
`FUN_0045e638`, `FUN_0045eb54`, and `FUN_0045f010` admit an empty selection
only when every later selector is already empty. On that transition they
disable the next selector and the removed slot controls and destroy the
removed slot spell model through `FUN_0045f778`. Selecting the first empty
slot enables only the next selector, rebuilds the new slot spell model through
`FUN_00463fe8`, and retains the duplicate-class rejection shared by all eight
handlers. This proves a contiguous non-empty prefix with a cardinality of
`1..8`: native UI additions append at the tail and removals truncate the tail;
middle insertion, middle deletion, and reordering are not admitted.

Commit transfer `FUN_0044d028` still resets all eight runtime destinations
with `FUN_00512d14`. An empty selector becomes class `-1`, level `0`, and an
empty fourteen-container spell model. Reciprocal writer `FUN_0053521c` emits
only destinations whose class is not `-1` and level is positive. Therefore an
appended tail slot is serialized as one new canonical type-`2` entry with
`Class : Int` and `ClassLevel : Short` and no persisted spell-list field until
the user selects a spell. A truncated tail disappears from `ClassList`
entirely. This evidence is at `decompiled_all.c:70234-70400`,
`79058-80534`, `80665-80719`, `174819-174845`, and `195081-195370` in the
immutable primary export identified above.

The frozen first implementation profile is deliberately narrower than every
sequence the dialog could express:

1. Source and target are complete ordered unique class vectors with
   cardinality `1..8`, per-slot levels `1..60`, and a total of at most `180`.
2. Cardinality must change. The complete retained prefix keeps the same class
   IDs, levels, ordered structs, spell graph, and opaque siblings. Arbitrary
   retained-prefix class or level edits remain the already implemented
   same-roster lane and are not combined with this first resize mutation.
3. Expansion appends only admitted unique physical `classes.2da` rows with
   explicit levels. Every appended entry is canonical type `2`, contains only
   `Class : Int` followed by `ClassLevel : Short`, and starts with no
   `KnownList0..13` or `MemorizedList0..13` field.
4. Contraction removes only an exact tail and requires
   `destructiveRemovedSlotsConfirmed: true`, even when the removed slots have
   no selected spells, because their complete spell and opaque field graphs
   are destroyed. Expansion requires the flag to be `false`.
5. The mutation carries the exact source graph fingerprint, source and target
   vectors, `resizeMode=append_tail|truncate_tail`, immutable classes and
   packages table identities, exact source and admitted target
   `StartingPackage`, and the existing complete HP/racial coupling derived
   from the target levels. Missing or stale parts fail closed.
6. Planning reparses and fingerprints the current GIT; compilation independently
   re-resolves both effective catalogs; writing preserves the retained prefix
   and every unrelated field, changes only `ClassList`, `StartingPackage`, and
   the coupled HP triplet, and requires complete candidate readback before the
   existing ARE/GIT/GIC/IFO transaction may publish.

This closure does not admit arbitrary spell selection, slot reorder, middle
insertion/deletion, a zero-slot Creature, automatic package application, or a
simultaneous retained-prefix mutation. Guarded browser Save/reopen, Toolset
Save/Build/reopen, and NWN behavior proof remain separate completion gates.
No xoreos or other GPL source was used.

## Tail-only class-slot resize offline implementation status — 2026-08-31

The frozen `append_tail|truncate_tail` profile is now implemented across the
offline Area Update path. A strict domain reader owns the complete source and
target class/level vectors, exact ClassList graph SHA-256, resize mode,
destructive-removal flag, source/target StartingPackage, and immutable
`classes.2da`/`packages.2da` identities. Projection admits a cardinality
change only when the retained prefix is exact and complete HP/racial
provenance can derive the target HP triplet. Raw-GIT replanning recomputes the
current graph and source values; compiler admission independently resolves
both effective catalogs; the paired writer either appends canonical type-`2`
`Class`/`ClassLevel` structs or removes the exact tail, updates
StartingPackage and HP in the same candidate, and preserves ARE, GIC, IFO,
unrelated GIT fields, retained spell graphs, and opaque siblings.

The frontend now represents the actual active slot count rather than eight
presentation placeholders. Existing Creatures expose only `Add class slot`
and `Remove last class slot`; a resize locks the retained prefix, permits class
ID and level changes only in newly appended slots, reloads package choices for
the exact target vector, derives HP immediately, and requires explicit
confirmation when the target is shorter. Workspace admission and final
materialization independently reject zero slots, more than eight slots,
duplicates, catalog drift, a non-prefix target, retained-prefix edits,
incoherent confirmation, missing package admission, or missing HP coupling.

Resource-safe verification passes `46/46` focused backend assertions,
`64/64` Area Update atomic-publication assertions, `635/635` focused frontend
assertions, the complete `21/21` Creature Properties regression, `13/13`
capability-catalog assertions, and both production builds.
Capability revision `2026-08-31.120` removes only
`creature_class_slot_count_mutation_incomplete`. The application was not
started because the existing browser-save blocker still fingerprints
`getaddrinfo ENOTFOUND mysql`; no Docker command, service, watcher, browser,
Chrome, capture, Toolset/NWN process, mutation test, sub-agent, xoreos source,
or other GPL source was used. Guarded browser Save/reopen, Toolset
Save/Build/reopen, NWN behavior, slot reorder/middle mutation, and arbitrary
spell-graph authoring remain open.

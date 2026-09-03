# Existing Area Creature `SkillList` audit v1

Date: 2026-08-28  
Status: native storage and Toolset ordinal behavior source-closed; retained mutation not yet authorized; fail-closed UI implemented

## Decision

Aurora Web must not currently expose skill-rank editing for a retained type-`4`
Area GIT Creature. Native `SkillList` identity is positional: list entry `N`
stores the rank for physical row `N` of the effective `skills.2da`. The common
writer emits one entry for every row in the currently loaded skill table, and
the Toolset builds its grid and save buffers from that same runtime row count.

The current web draft uses a fixed display-label array and Area Update does not
project its retained skill changes. It therefore cannot establish exact
ordinal/table provenance. Retained skill inputs are now visibly
`PRESERVE_ONLY` and disabled. Local new-Creature drafting remains active under
its existing creation contract, with values clamped to the native Byte domain.

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

Common Creature reader `FUN_00532174` clears the runtime skill vector, opens
exact `SkillList`, and iterates the current global skill-table row count at
decompiled lines `194727-194741`. For ordinal `N`, it reads list struct `N`;
an unavailable struct becomes rank zero. The exact rank member is read through
the Byte reader `FUN_00aeed68`, with native default zero.

Reciprocal common writer `FUN_0053521c` creates exact `SkillList`, iterates the
same global runtime row count, creates one list struct of type `0` for every
ordinal, and writes the corresponding rank as Byte at lines
`195253-195264`. If the in-memory vector is shorter than the current table, it
writes zero for the remaining ordinals. The global count is assigned from the
loaded skill-table row count at line `232111`.

The GFF has no independent skill ID inside an entry. List position is the only
native identity. A label, translated name, filtered grid row, or fixed web
array index cannot authorize persistence without an immutable effective
`skills.2da` binding.

## Toolset dialog closure

Frozen `TDLGCREATUREEDIT` contains the `sgSkills` grid and `sgSkillsExit`
handler. Dialog initialization allocates rank, visible-row, and ordinal-mapping
buffers from the current native skill-table count. It walks the effective
table in physical order, resolves the numeric `Name` column, hides rows without
a usable name, and stores a pointer back to the full physical-ordinal rank
slot for each visible grid row at lines `67795-67867`.

Dialog loader `FUN_0044b110` reads every current ordinal from the Creature and
places the Byte rank into the full ordinal buffer; only admitted visible rows
are copied into the grid at lines `69780-69795`. Dialog save
`FUN_0044d360` reads visible grid edits back into that full ordinal buffer,
then clears and repopulates the Creature skill vector with every current
ordinal at lines `71068-71099`.

Thus filtering affects presentation only. Save identity remains the complete
physical row sequence, including hidden rows. Rewriting a retained list against
a different table count can expand it with zeros, exactly as the Toolset does;
Aurora Web must make that semantic change explicit rather than infer it from a
hard-coded label list.

## Current Aurora Web boundary

The parser's `skillListEntries` metadata assigns `skillId` from list position,
normalizes missing values, and pads presentation to a project default count.
It does not preserve exact list presence, exact length, struct types, native
rank types, duplicate/case ambiguity, opaque siblings, or effective-table
identity. The frontend draft then maps those values onto fixed labels. These
structures are read-only presentation data for a retained Creature.

New-Creature creation already owns a separate explicit `SkillList` compiler.
This audit only closes the retained mutation affordance and does not revoke
that local draft path.

## Required additive mutation contract

Retained `SkillList` editing may become active only after all of the following
exist:

1. Exact source provenance for one canonical `SkillList`, including exact
   list length, ordered type-`0` structs, exact `Rank : Byte`, and any opaque
   siblings or malformed-state reason.
2. Strongest whole module/ordered-HAK/vanilla `skills.2da` resolution with
   immutable source object key, layer, SHA-256, size, row count, and admitted
   physical rows. Rows must never be merged or renumbered.
3. Numeric frontend targets keyed by physical row ordinal; labels remain
   presentation only. Retained editability requires source-list/table
   compatibility and explicit handling of Toolset-style list expansion.
4. Complete expected-rank-vector plus table descriptor compare-and-swap,
   compiler-side fresh table admission, GIT-only write preserving unrelated
   members and paired GIC/ARE/IFO bytes, and exact candidate readback.
5. Tests for missing/duplicate/wrong-case/wrong-type lists and ranks, sparse or
   hidden table rows, table growth/shrinkage, stale digest/count/vector,
   out-of-Byte targets, no-op byte identity, and readback mismatch.
6. Fresh guarded browser Apply/Save/reopen proof followed by exact-candidate
   Toolset Save/Build/reopen and NWN `GetSkillRank` behavior proof.

No rank-point legality, class-skill cost, level-up package effect, or maximum
legal NPC rank is inferred here. The persisted field is Byte, but any authoring
legality rule beyond `0..255` requires its own Aurora-first closure.

## Offline implementation status

The false retained write affordance is closed test-first. The Creature dialog
shows `SkillList: PRESERVE_ONLY` and disables every retained rank input. Local
new-Creature ranks remain enabled, integer-clamped to `0..255`, and have
accessible ordinal-label names. The focused component suite passes all 59
tests under the repository's one-worker, 1 GiB Node limit.

Full retained `SkillList` mutation remains an explicit implementation item,
not a completed feature and not an implied pass.

## Resource/process statement

This audit used bounded reads of the frozen decompilation and Toolset resource
report plus one focused frontend test process. The installed Toolset and NWN
were not started. No Docker command, container, service, watcher, browser,
capture, Chrome, mutation test, or sub-agent was used.

## Additive offline implementation closure

The earlier preserve-only statement records the state at audit time. The
additive retained mutation path is now implemented against that evidence:

- Area parsing preserves exact absence or one case-sensitive `SkillList`, its
  physical length, type-`0` entries, one case-sensitive `Rank : Byte` per
  entry, ordered ranks, and opaque sibling counts.
- the snapshot repository resolves one strongest-whole
  module/ordered-HAK/vanilla `skills.2da` with immutable object key, layer,
  SHA-256, byte size, and physical row count;
- the authenticated catalog endpoint returns bounded pages of Toolset-visible
  rows without renumbering hidden physical ordinals;
- frontend state retains a complete numeric `skillId` vector, admits editing
  only against the exact table digest/count, exposes visible rows only, and
  preserves omitted physical rows;
- Area Update projects a complete expected/target Byte-vector CAS, explicitly
  distinguishes same-length, zero-tail expansion, and confirmed truncation,
  re-admits the current table before compilation, preserves unrelated GIT
  fields and paired GIC bytes, and performs exact parsed candidate readback.

The backend and frontend application typechecks pass under a 1 GiB Node heap.
Focused frontend commands pass `13/13` domain/facade/provenance assertions and
`64/64` dialog/provenance assertions with one worker. After the new projection,
planner, writer/readback, and compiler cases were separated from monolithic
specs, the bounded backend lane passed as part of a combined `117/117` gate for
SkillList, ClassLevel, SoundSetFile, and StartingPackage. Capability revision
`2026-08-28.94` therefore removes the backend SkillList unit blocker while
retaining guarded browser Apply/Save/reopen, Toolset Save/Build/reopen, and NWN
runtime proof blockers. No Docker command, service, watcher, browser, capture, live
Toolset/NWN process, mutation test, sub-agent, xoreos source, or other GPL
source was used for this implementation pass.

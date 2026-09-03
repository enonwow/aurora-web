# Existing Area Creature editor-comment audit v1

Date: 2026-08-28  
Implementation checkpoint: 2026-08-29  
Status: `OFFLINE_IMPLEMENTATION_VERIFIED`; fresh browser and exact-candidate
Toolset Save/Build/reopen proof remain pending

## Scope and authority

This audit covers only the editor `Comments` text attached to one retained
type-`4` Area Creature. The value belongs to the ordinal-paired GIC
`Creature List` entry, not to the gameplay GIT Creature struct. It does not
admit changing a localized name or description, scripts, conversation,
variables, statistics, inventory, equipment, or any runtime-visible behavior.

Primary decompilation authority is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
The corresponding `functions.tsv` SHA-256 is
`394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`.
No xoreos or other GPL source was inspected or used.

## Recovered native pair lineage

The placed-Creature reader `FUN_0053ab24` begins at decompiled line `197397`.
After reading the type-`4` GIT transform, its non-null paired-document branch
at lines `197475-197477` reads exactly `Comment` through `FUN_00aef090` into
the editor-only object member at offset `0x98`. The common Creature reader is
then called against the GIT struct at line `197530`; it does not own the GIC
comment.

The symmetric placed-Creature writer `FUN_0053ae80` begins at line `197558`.
Its paired-document branch at lines `197587-197588` writes the member at
offset `0x98` as exactly `Comment` through `FUN_00af0084`; the common Creature
writer is called against GIT at line `197590`.

`FUN_00aef090` requires native field type `10`, and `FUN_00af0084` creates or
writes native field type `10`. This closes `Comment : CExoString` ownership.
The accepted Creature construction audit independently binds a placed Creature
as same-index type-`4` GIT/GIC records and requires the GIC record to contain
only `Comment=""`. Together these primary-source paths close the family,
ordinal pairing, field name, native type, and GIT/GIC preservation boundary.

## Frozen cross-boundary contract

Area detail pairs GIT and GIC `Creature List` entries by exact zero-based
family ordinal and exposes a present exact string as
`creatureMetadata.editorComment`. Empty string is valid provenance and remains
distinct from an absent, duplicate, wrong-case, or wrong-type field. The
frontend retains a detached immutable source value and maps it to the existing
Creature `comments` property.

The admitted value is a string of `0..4096` ECMAScript code units without NUL
(`U+0000`). It is not trimmed, normalized, case-folded, or silently truncated.
The 4096-unit boundary is the existing Area Update/UI payload budget, not an
inferred native `CExoString` capacity.

The existing Creature property mutation gains one optional complete CAS pair:

```json
{
  "kind": "creature",
  "sourceObjectId": "cre:0:nw_chicken:...",
  "editorComment": {
    "expectedValue": "",
    "value": "Chicken beside the west fence."
  }
}
```

Only a changed complete pair is emitted. The backend resolves the immutable
Creature ordinal, requires exactly one ordinal-paired GIC Creature struct,
verifies exactly one canonical `Comment : CExoString` and the expected value,
changes only that field, and preserves every GIT byte plus all other GIC data.
Exact whole-document and paired-struct candidate readback is mandatory.

Missing, partial, non-string, over-budget, NUL-containing, duplicate,
wrong-type, stale, unchanged, unpaired, cross-family, deletion-colliding, or
readback-drifting mutations fail closed. A missing comment is not materialized
for a retained Creature in v1.

## Completion boundary

Offline completion requires parser/repository provenance, detached frontend
source state, visible `ACTIVE_NOW`/`PRESERVE_ONLY` UI behavior, Apply guards,
projector/planner/writer negative and combined round-trip tests, compiler
receipt coverage, and bounded production typechecks. Mutation testing remains
optional and requires explicit user opt-in.

Fresh exact-candidate Toolset Save/Build/reopen proof remains `missing`. The
editor comment has no NWN runtime behavior claim, and this audit does not
advance tile rendering, PathConnect/WOK, or the 99-tileset matrix.

## Offline implementation checkpoint

The guarded lane is implemented across the parser, snapshot projection,
frontend HTTP boundary, scene mapping, detached source provenance, workspace
validation and history cloning, Creature dialog, final Apply materialization,
immutable-ordinal planner, paired GIT/GIC writer, transaction receipt, and
candidate readback. Retained Creature editing is active only when the exact
GIC source comment exists. Otherwise the control is visibly
`PRESERVE_ONLY`. Candidate writes require the immutable source GIC digest and
leave source GIT bytes unchanged.

Sequential resource-bounded verification under the repository's 1 GiB Node
ceiling passed:

- backend parser/writer assertions: `1131/1131`;
- backend projector/planner assertions: `902/902`;
- backend atomic publication assertion: `1/1`;
- backend capability-catalog assertions: `13/13`;
- frontend mapper/workspace/provenance/dialog assertions: `590/590`;
- frontend HTTP-boundary assertions: `150/150`;
- frontend source/history clone assertion: `1/1`;
- targeted frontend Apply/Cancel/reopen/local-Save regression: `1/1`; and
- backend and frontend production source typechecks: passed.

The complete Creature-properties regression file now passes `20/20`. The
previous Perception Range failure was a stale role expectation for a correctly
disabled preserve-only textbox. The previous Base HP failure exposed a real
frontend coupling defect: placeholder draft class levels were supplied even
when exact retained class-level provenance was absent. HP edit and Apply
materialization now consume draft class levels only when the original class
roster is source-bound and its class identities remain unchanged; otherwise
the exact retained HP state supplies the source levels. The frontend
production source typecheck passes after this correction.

Capability catalog revision `2026-08-29.97` records this audit and the bounded
test surfaces while retaining the aggregate
`creature_variable_table_and_editor_comment_live_proof_pending` blocker.
Creature authoring therefore remains `partial`/`blocked`. No Docker command,
container, service, watcher, browser, Chrome, capture, live Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

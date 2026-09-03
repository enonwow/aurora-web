# Existing Area Creature `ChallengeRating` audit v1

Date: 2026-08-27  
Status: source-closed bounded contract and offline implementation complete; fresh release certification pending

## Decision

Aurora Web may expose the exact existing `ChallengeRating : Float` member of
one retained type-`4` Area GIT Creature as a presence-sensitive
compare-and-swap mutation. A present admitted Float is editable. Missing,
duplicated, aliased, wrong-case, wrong-type, non-finite, negative,
out-of-budget, or stale storage remains `PRESERVE_ONLY`; this first writer
profile does not create or remove the native field.

The admitted product range is finite `0..1000` inclusive. A requested decimal
target is normalized once to IEEE-754 binary32 before candidate construction,
and persisted readback must equal that normalized value. Negative zero is
rejected. The range is an existing Aurora Web payload budget, not a claim that
Aurora itself clamps the common Creature field to this interval.

`CRAdjust` is deliberately excluded. Although it is adjacent in the common
Creature read/write path, its signed Toolset input semantics are not closed by
this audit and must not be inferred from the `ChallengeRating` Float.

## Immutable primary authority

The read-only sources are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- `backend/docs/aurora-reverse/creature-runtime-pipeline-evidence-r87.md`,
  SHA-256
  `40747c6a36be0152b2bd7aeb9ba5f7c1133fe9952df6405f6812def9072558e2`;
- the AUR-S03 final clean rollback GIT summary, SHA-256
  `9cd18cebbc0341f21d79f6e007a5ab3e4233568f36f76d9dd3b5cca7626803f2`.

Only immutable decompilation and accepted repository evidence were inspected.
No Toolset/NWN process, browser, service, watcher, capture, Docker command, or
mutation test was started, and no xoreos or other GPL source was inspected.

## Native storage closure

The common Creature reader `FUN_00532174` reads `ChallengeRating` at
decompiled line `194721` through `FUN_00aeef34` and stores the returned Float
at common Creature offset `0x100`. `FUN_00aeef34`, beginning at line `968019`,
admits only GFF native type id `8` and reports missing or wrong-type state
separately.

The reciprocal common writer `FUN_0053521c` writes the same offset and exact
case-sensitive label through `FUN_00aeff38` at lines `195236-195237`.
`FUN_00aeff38`, beginning at line `968851`, creates native type id `8` when a
field is absent and writes the supplied four-byte value. Aurora Web's first
bounded retained-instance profile must nevertheless replace only one existing
admitted field; native creation behavior does not authorize field creation.

The placed-Creature read wrapper `FUN_0053ab24` calls the common reader at line
`197530`. The placed-Creature writer `FUN_0053ae80` calls the common writer at
line `197590`. The field therefore belongs to the type-`4` GIT Creature. Its
paired GIC record does not own the value and must remain byte-identical for a
ChallengeRating-only mutation.

The palette path independently reads the same Float at decompiled line
`328416`; missing palette-template storage falls back to `1.0` before palette
serialization. That palette fallback is not retained-instance provenance and
must never authorize creation of a missing GIT member.

Accepted GIT summaries retain exact values including `0.5`, `1`, and `11`
across unrelated native Save/rollback steps. They corroborate stable Float
storage but do not constitute fresh proof for a future web candidate.

## Frozen additive cross-boundary contract

Area detail may add:

```ts
type CreatureChallengeRatingStorage =
  | { present: false }
  | { present: true; nativeType: "float"; value: number };
```

The frontend keeps a detached immutable copy of the exact presence-sensitive
storage under `source.creatureChallengeRating`. The writable target is
`creatureProperties.challengeRating`; projection derives `expectedValue` only
from that retained present Float. Loose metadata remains presentation-only and
does not authorize a mutation.

The input is visibly `ACTIVE_NOW` only for exact `aurora_git`,
`sourceKind=creature`, a non-negative immutable family ordinal, and one present
admitted Float provenance record. All other states are visibly
`PRESERVE_ONLY` and non-destructive.

A changed value projects under the existing Creature property mutation:

```json
{
  "kind": "creature",
  "sourceObjectId": "creature:0:nw_dwarfmerc001:source",
  "sourceIndex": 0,
  "challengeRating": {
    "expectedValue": 0.5,
    "value": 1.5
  }
}
```

Source and target must differ after binary32 normalization. The member may
coexist with independently admitted Creature property members on the same
ordinal, but never with deletion of that ordinal.

## Writer, transaction, and diagnosability requirements

Projection, parsing, exact-ordinal planning, paired writing, and complete
candidate readback fail closed independently. Planning reparses one exact
case-sensitive `ChallengeRating : Float`, normalizes expected and target values
to binary32, and compares the complete expected value. Writing replaces only
that existing field, preserves its position and every sibling GIT value,
reconstructs an identical paired GIC, and uses the existing revision-fenced,
idempotent, journaled ARE/GIT/GIC/IFO atomic publication.

No endpoint, binary payload, pagination, streaming, authorization, permission,
idempotency, fencing, recovery, or transaction budget changes. Routine
diagnostics may expose only contract revision, Creature family, bounded
ordinal, the approved `ChallengeRating` field token, stage, duration, and a
stable result code. Values, object IDs, hashes, raw bytes, source/storage keys,
credentials, and host paths are prohibited metric labels.

## Completion boundary

Offline closure requires strict domain parsing, exact Area-detail extraction,
HTTP validation, immutable frontend mapping/workspace/history state, visible
UI gating, reducer and final-Apply enforcement, Apply/OK/reopen/local-Save
regression, projection, exact-ordinal planning, Float-only paired writing,
complete candidate readback, combined mutation coverage, atomic-publication
integration, capability evidence, and both production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback, and NWN inspection remain independent release gates.
`CRAdjust`, missing-field creation/removal, Creature statistics generally,
Area CRUD completion, renderer/connectivity proof, and the 99-tileset program
remain outside this audit.

## Offline implementation closure — 2026-08-27

The bounded contract is implemented end to end without expanding the native
profile. Backend domain validation, exact parser extraction, snapshot cloning
and process identity, draft projection, ordinal planning, Float-only paired
writing, candidate compilation/readback, and atomic publication are covered by
focused unit and integration tests. Frontend HTTP validation, detached scene
mapping, workspace validation, history cloning, provenance reducer and
binary32 materialization, visible Basic/Advanced gating, explicit
`CRAdjust=PRESERVE_ONLY`, and Apply/OK/reopen/local-Save regression are also
covered. Backend and frontend production builds pass.

No service, watcher, Docker command, browser, Chrome, Toolset/NWN process,
capture, mutation test, xoreos source, or other GPL source was used for this
offline closure. The three fresh release gates listed above remain blockers;
therefore this closure does not claim live Toolset, NWN, or renderer proof.

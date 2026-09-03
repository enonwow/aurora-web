# Existing Area Creature ability-score mutation audit v1

Date: 2026-08-27  
Scope: replacement of exact retained `Str`, `Dex`, `Con`, `Int`, `Wis`, and
`Cha` fields on a type-`4` Area Creature placement.  
Status: `OFFLINE_SOURCE_CLOSED`; browser and native release proof remains open.

## Decision

Aurora Web may replace any changed subset of the six exact existing native
ability-score fields. Each member is independently presence-sensitive and is
admitted only as one canonical case-sensitive GFF `BYTE` with an integer value
in `0..255`. Missing, duplicated, aliased, wrong-case, wrong-type, malformed,
or stale storage is preserve-only. This lane never creates or removes a native
field.

The writable fields are the stored base scores only. Frontend racial modifiers,
derived totals/modifiers, classes, feats, skills, hit points, `CRAdjust`, Race,
and every other statistic remain outside this contract. In particular, a loose
metadata value or derived racial modifier cannot authorize a native write.

## Immutable source record

| Source | SHA-256 |
| --- | --- |
| `C:\Projects\New Folder\export\decompiled_all.c` | `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572` |
| `C:\Projects\New Folder\export\functions.tsv` | `394096FE106E5767EE6ECEB31C8B085091359060351B1D10195E96F666BC69FE` |
| `backend/docs/aurora-reverse/creature-runtime-pipeline-evidence-r87.md` | `40747C6A36BE0152B2BD7AEB9BA5F7C1133FE9952DF6405F6812DEF9072558E2` |
| `backend/docs/aurora-reverse/evidence/npc-stage3-live-2026-07-15/stats-classes/manifest.json` | `2650B8CA5CE819B1EC6A81C9BD45AB92CC1613AF0C9430FE58CEA12A3A36C834` |
| `backend/docs/aurora-reverse/evidence/npc-stage3-live-2026-07-15/s03-07-strength-plus-two-after-save/raw.git.summary.json` | `7DC8400E3EFFCB8B586E1D79F8890E20BF61DC48B688F9999BC7E01E23596B9C` |
| `backend/docs/aurora-reverse/evidence/npc-stage3-live-2026-07-15/s03-07-strength-rollback/raw.git.summary.json` | `C03F57F971A0408B93C43EBC2E8DD6DE684FE0BA27B8252F49A3E41AAA060817` |
| `backend/test/support/area-creature-construction-fixture.ts` | `6D3061F65E9FC89825B884E838E241505F731B9EA3C542BB3919ACC94E81A214` |

No xoreos or other GPL source was consulted.

## Aurora decompilation findings

The common Creature reader `FUN_00532174` reads six consecutive values at
`decompiled_all.c:194551-194562` through `FUN_00aeed68` into Creature offsets
`0xe4..0xe9`. The paired common Creature writer `FUN_0053521c` writes the same
six consecutive values at `decompiled_all.c:195220-195225` through
`FUN_00aefd1c`, preserving the same order.

The six four-byte label cells are contiguous immediately before `WalkRate`.
Their canonical labels and order are independently present in the retained
native construction source profile:

1. `Str`
2. `Dex`
3. `Con`
4. `Int`
5. `Wis`
6. `Cha`

`FUN_00aeed68` at `decompiled_all.c:967892-967912` accepts only a field whose
GFF type id is `0`; `FUN_00aefd1c` at `decompiled_all.c:968691-968718` creates
or updates type id `0`. The repository's native GFF vocabulary maps type id
`0` to `BYTE`, and the construction fixture carries all six exact labels as
`byte`. Therefore the serialized value domain is the complete integer byte
domain `0..255`; this is a storage bound, not a claim that every value has been
separately exercised in Toolset UI.

The placed-Creature type-`4` reader and writer wrap the common Creature path;
the paired GIC resource does not own these base-score values. Candidate writing
must therefore change only the requested GIT fields and preserve GIC and IFO
byte-for-byte.

## Existing native proof

The accepted Stage-3 Toolset packet proves a native saved Strength transition
`15 -> 17 -> 15`, including visible Toolset state, packed GIT readback, and
rollback. Its manifest reports every exact transition check as true. This
proves that the stored `Str` byte is Toolset-editable and that the retained GIT
field follows the visible base-score control. It does not by itself certify all
six controls or the full byte range, so fresh exact-candidate proof remains a
release gate.

Multiple retained raw GIT summaries independently contain all six base scores
with ordinary nonzero values. The construction fixture also supplies the exact
six label/type pairs, including low values such as `Str=3` and `Int=3`; these
are used only as source-shape evidence, not as a universal default.

## Contract admitted for implementation

Area detail may expose exact `creatureAbilityScores` with all six required
members. A member is either `{present:false}` or
`{present:true,nativeType:"byte",value}`. The frontend keeps a detached copy in
source metadata and uses only a present admitted member as mutation provenance.

A changed member is `{expectedValue,value}`. Both values are distinct integers
in `0..255`. The mutation object contains at least one and at most six canonical
members and is written in the native order above. Planning reparses the exact
retained type-`4` ordinal and performs per-member full-value CAS. Candidate and
persisted readback compare the complete requested target while preserving every
unrequested field.

The existing target fields are
`creatureProperties.statistics.abilityScores.{strength,dexterity,constitution,intelligence,wisdom,charisma}`.
Racial-modifier inputs are visibly `PRESERVE_ONLY` in this lane. Apply, OK,
reopen, history clone, and local Save must retain exact source provenance and
only the admitted changed base scores.

## Diagnosability and budgets

The extension adds no endpoint, binary body, pagination, chunking, or streaming.
The complete six-member mutation is below one KiB and stays within the existing
Area Update object/property/request budgets, authorization, permission,
idempotency, revision fence, journal, recovery, and atomic ARE/GIT/GIC/IFO
publication contract.

Routine diagnostics may expose only the contract revision, `creature` family,
bounded ordinal, one of the six approved field tokens, changed-member count,
stage, duration, and stable result code. Score values, object IDs, hashes, raw
fields or bytes, source/storage keys, credentials, and host paths are excluded.

## Acceptance boundary

Offline completion requires strict parser/domain rejection coverage,
presence-sensitive scene/workspace/history handling, subset projection,
per-member CAS planning, field-only paired writer/readback, atomic publication
with byte-identical GIC/IFO, UI gating for all six fields, a full Workspace
Apply/OK/reopen/local-Save regression, and production builds.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen
with packed GFF readback for the requested subset, and NWN inspection remain
independent release gates. This audit does not certify derived totals, racial
modifiers, classes, feats, skills, hit points, or other statistics.

## Offline implementation checkpoint — 2026-08-28

The source-closed contract is now wired through the backend parser, detached
snapshot/cache projection, update draft projector, exact-ordinal replanner,
field-only paired GFF writer, candidate compiler, atomic publication, and
persisted readback. Each requested member retains its own source value and CAS;
the writer changes only the selected existing `BYTE` fields in GIT and leaves
the paired GIC plus module IFO byte-identical.

The frontend now validates the complete six-member source group at the HTTP,
scene, persisted workspace-draft, and history boundaries. Retained
`aurora_git` Creatures authorize edits independently per exact present member;
absent or malformed members remain visible and disabled. New or seed Creature
drafts keep bounded base-score authoring without inventing retained native
provenance. Apply, OK, reopen, and local Save materialize only admitted changed
members. Racial modifiers and derived totals remain disabled and outside the
mutation payload.

Fresh bounded verification passed:

- 8 backend unit suites, 2,099 tests;
- the complete Area Update atomic-publication integration suite, 56 tests;
- 8 focused frontend unit/regression files, 637 tests;
- the immutable capability-catalog suite, 13 tests;
- backend and frontend production builds.

Capability catalog revision `2026-08-28.77` retains the truthful 81-row totals
of 52 implemented, 25 partial, zero preserve-only, and four not-started rows;
release remains 38 available, 37 blocked, and six hidden. Creature authoring
remains partial and blocked because the remaining property matrix and live
release proof are still open.

No Docker command, managed service, watcher, browser, capture, Toolset, NWN, or
mutation-test process was started for this checkpoint. Fresh guarded browser
Save/reopen, exact-candidate Toolset Save/Build/reopen with packed readback, and
NWN behavior proof remain mandatory release gates.

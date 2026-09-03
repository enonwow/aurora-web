# Existing Area Encounter event-script ResRefs audit v1

Date: 2026-09-01  
Status: source-closed; offline implementation accepted; live release proof pending

## Decision

Aurora Web may edit the five already-present type-`7` Area GIT Encounter
event-script fields only as one complete exact tuple:

| Application key | Exact native label | GFF type |
| --- | --- | --- |
| `onEntered` | `OnEntered` | 11 / `ResRef` |
| `onExit` | `OnExit` | 11 / `ResRef` |
| `onExhausted` | `OnExhausted` | 11 / `ResRef` |
| `onHeartbeat` | `OnHeartbeat` | 11 / `ResRef` |
| `onUserDefined` | `OnUserDefined` | 11 / `ResRef` |

Source provenance admits empty or 1-16 ASCII letters, digits, and underscores
so an existing mixed-case native value can be preserved exactly. New target
values admit only `[a-z0-9_]{0,16}`. Empty means unbound. Aurora Web never
trims, truncates, replaces, or silently lowercases input. Missing, partial,
duplicated, aliased, wrong-case-label, wrong-type, over-budget, malformed, or
stale storage is `PRESERVE_ONLY` and cannot authorize field creation.

The five members are one atomic provenance and CAS unit. This prevents a
partial client from silently overwriting an event slot it did not retain. The
slice proves storage authoring, not script catalog existence, NSS/NCS
compilation, event dispatch, exhaustion semantics, or runtime behavior.

## Immutable primary authority

| Source | SHA-256 |
| --- | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| installed retail `nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| `nwtoolset_rcdata_report.json` | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native storage closure

Common Encounter reader `FUN_0055d470` calls the exact ResRef reader for
`OnEntered`, `OnExit`, `OnExhausted`, `OnHeartbeat`, and `OnUserDefined` at
decompiled lines `215213-215227`, then copies each result into its distinct
17-byte Encounter member. Reciprocal writer `FUN_0055dbf8` emits the same five
members through the ResRef writer at lines `215408-215412`. The established
ResRef helper contract uses native field type `0xb`, a one-byte length, and a
maximum 16-byte payload; its writer lowercases ASCII `A-Z`. Aurora Web chooses
explicit lowercase target admission rather than hidden normalization.

Placed-Encounter writer `FUN_0055e71c` delegates this common payload into the
type-`7` GIT struct. The paired GIC entry remains a separate ordinal-aligned
type-`7` struct and contains no event-script copies.

## Toolset property-shell closure

Installed `TDLGENCOUNTEREDIT` is the frozen 9,574-byte `TPF0` RCDATA resource
at RVA `0x00af8314`. Its Events surface binds On Enter and On Exit directly
and the shared event controls for the remaining slots, plus Browse, Edit,
Load Script Set, and Save Script Set handlers. The recovered handler table
includes `stOnEnter`, `stOnExit`, `cbOnEnter`, `cbEventChange`,
`cbEventEnter`, `bBrowseOnEnter`, `bBrowseEventClick`, `bEditOnEnter`,
`bEditEventClick`, `cbOnExit`, `bBrowseOnExit`, `bEditOnExit`,
`bLoadScriptSetClick`, and `bSaveScriptSetClick`.

Properties save `FUN_00498278` copies the five visible script selections into
the five native members at decompiled lines `110943-110997`. Properties load
`FUN_00498b48` restores those members to the corresponding controls at lines
`111106-111175`. Together with the common reader/writer, this closes exact
label, type, member identity, UI editability, and roundtrip direction.

## Frozen additive contract

Area detail may expose optional exact Encounter storage:

```json
{
  "encounterScriptResRefs": {
    "onEntered": "enc_enter",
    "onExit": "enc_exit",
    "onExhausted": "",
    "onHeartbeat": "enc_heartbeat",
    "onUserDefined": "enc_user"
  }
}
```

The frontend detaches this value under immutable
`source.encounterScriptResRefsStorage` and keeps a separate editable target.
The Properties shell exposes all five inputs with `ACTIVE_NOW` only when the
complete exact source tuple and immutable Encounter ordinal are admitted;
otherwise all five remain visibly `PRESERVE_ONLY`. Apply/history/local Save
and reopen clone source and target independently.

A changed retained Encounter may add
`scripts={expectedValue,value}` beside independently admitted `tag`, `active`,
`playerOnly`, `reset`, `resetTime`, `spawnOption`, `respawns`, and
`creatureCounts`. Both tuple members are complete; `expectedValue` may retain
mixed case, while `value` is canonical lowercase and must differ.

Planning reparses one exact family ordinal and compares the complete tuple
with parser provenance. Writing requires exactly one case-sensitive field of
native type `ResRef` for every member, performs complete CAS, and replaces
only those five existing values in place. Field order, all unrelated GIT
members, the entire paired GIC, ARE, IFO, and resource ordering remain intact.
Candidate and persisted readback must reproduce the target tuple before
publication.

## Diagnostics and completion boundary

The low-cardinality event is `area_encounter_script_resrefs_cas.v1` with
bounded operation, outcome, stable result code, changed-field count, and
duration. Script values, object IDs, ordinals, hashes, paths, storage keys,
raw fields or bytes, credentials, and host paths are prohibited from metric
labels and routine logs.

Offline acceptance on 2026-09-01 includes exact domain/parser tests, detached
API/scene/workspace provenance, five-input UI, fail-closed projection,
ordinal-bound planner and GFF writer, coexistence with all earlier Encounter
properties, atomic Area Update publication, local Save/reopen regression,
capability-catalog revision `2026-09-01.130`, and both production builds.
Focused validation passed: backend domain/parser `13/13`, projector `622/622`,
planner `418/418`, writer `968/968`, Area Update integration `73/73`, frontend
focused unit coverage `1057/1057`, and the dedicated Save/reopen regression
`1/1`. The bounded capability-catalog gate passed `13/13`, the complete
frontend regression-smoke gate passed `43/43` files and `134/134` tests, and
both production builds passed after the final catalog and documentation
alignment. The initial combined five-suite ts-jest process reached the
enforced 1 GiB heap; the repository bounded isolated-module profile passed the
same assertions in four sequential runs without raising the heap ceiling.

Fresh guarded browser Save/reopen, exact-candidate Toolset Save/Build/reopen,
packed GIT readback, and NWN event-dispatch proof remain separate release
gates. This audit does not certify full Encounter, Area, tile, or PathConnect
completion.

## Resource/process statement

This audit used immutable decompilation exports and read-only installed
PE/RCDATA evidence. The Toolset was not started. No Docker command,
container, service, watcher, browser, Chrome, capture, Toolset/NWN process,
mutation test, sub-agent, xoreos source, or other GPL source was used.
Playwright remains reserved for the later live browser gate; the unchanged
backend `getaddrinfo ENOTFOUND mysql` blocker was not retried.

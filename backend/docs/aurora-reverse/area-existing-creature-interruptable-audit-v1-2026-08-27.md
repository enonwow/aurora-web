# Existing Area Creature `Interruptable` audit v1

Date: 2026-08-27  
Status: source-closed and implemented offline; live release proof pending

## Decision

Aurora Web may expose `No Interrupt` for one retained type-`4` Area GIT
Creature only when the exact case-sensitive native field
`Interruptable : Byte` is present exactly once and has value `0` or `1`.
Absence remains distinct from the native reader default and is
`PRESERVE_ONLY`; this contract never creates the field.

The exact projection is:

```text
noInterrupt = Interruptable == 0
Interruptable = noInterrupt ? 0 : 1
```

One changed source-bound pair is `{ expectedValue, value }`, where both
members are exact native bytes in `{0,1}` and differ. The pair may coexist
with independently valid retained Creature Tag, FirstName/LastName,
Conversation, Appearance_Type, ItemList, and Equip_ItemList mutations on the
same immutable Creature ordinal. This slice makes no claim about DLG graph
authoring or NWN runtime interruption behavior.

## Immutable primary authority

The admitted reverse inputs are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
  size `12,201,984` bytes;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

The executable, decompilation, RCDATA report, and retained repository evidence
were inspected read-only. No xoreos or other GPL source was consulted or used.
No Toolset, NWN, Docker, service, browser, capture, Chrome, watcher, or
mutation-test process was started.

## Native storage closure

The common Creature reader `FUN_00532174` begins at
`decompiled_all.c:193907`. At lines `194488-194489` it reads the exact label
`Interruptable` through the native Byte reader with default `1` and stores the
result at Creature-record offset `+0xC0`.

The symmetric Creature writer `FUN_0053521c` begins at line `195081`. At line
`195169` it writes the byte at `+0xC0` through the native Byte writer under the
same exact `Interruptable` label. The established placed-Creature lineage
`FUN_0053ab24 -> FUN_00532174` and
`FUN_0053ae80 -> FUN_0053521c` carries that common record through the type-`4`
Area GIT path.

The native default does not authorize field synthesis. The web parser retains
exact absence so an absent, duplicate, aliased, wrong-case, wrongly typed, or
non-binary Byte remains preserve-only.

## Exact Toolset checkbox polarity

Read-only PE mapping resolves the retail Delphi class `TdlgCreatureEdit` to
VMT `0x00BBBEE4`. Its published field table at `0x00BBC054` contains
`xbNoInterrupt : TCheckBox` at object offset `+0x708`. Its published method
table at `0x00BBDB84` binds `bOKClick` to `0x00456AD0`.

The native form-to-record paths independently prove both directions:

- load function `FUN_0044b110`, at `decompiled_all.c:69708-69709`, sends
  `record[+0xC0] == 0` to the checkbox setter for the published `+0x708`
  control;
- save function `FUN_0044d360`, at lines `70861-70862`, reads the same
  checkbox and stores `checked == false` at record offset `+0xC0`;
- `bOKClick` at line `75300` reaches the existing-record commit wrapper
  `FUN_00456e98`, which calls `FUN_0044effc`; that wrapper invokes
  `FUN_0044d360` at lines `71343-71348`.

Therefore an unchecked `No Interrupt` checkbox writes Byte `1`, while a
checked checkbox writes Byte `0`. This is not inferred from the English
caption or from the already-audited Placeable family.

## Retained observational evidence

The exact pair
`evidence/npc-stage3-live-2026-07-15/s03-appearance-rollback-ui.png`
(SHA-256
`679d6efc5349f59f747e94df186894a6539e8fa55ec22a599afdae98d60c3558`)
and
`s03-appearance-rollback.raw.git.summary.json`
(SHA-256
`8a21e0c14ae64ea1bdb14ad7a1cfead2b382972161e084ca286b078b70fb134e`)
shows the same `Dwarf Mercenary`, tag `NW_DWARFMERC001`, Appearance `249`:
the Toolset checkbox is visibly unchecked and parsed storage reports
`interruptable: true`. This agrees with the static relation but remains
observational under the current proof-capture contract; it is not used to
substitute for fresh release proof.

## Frozen additive contract

Area detail may add exact presence-sensitive storage:

```ts
type CreatureInterruptableStorage =
  | { present: false }
  | { present: true; value: 0 | 1 };
```

The frontend retains a detached immutable
`source.creatureInterruptable`. `No Interrupt` is `ACTIVE_NOW` only for exact
`aurora_git` Creature identity, a non-negative immutable family ordinal, and
`{ present:true, value:0|1 }`. It is initialized and reduced through the
documented inverse relation. Every other state keeps the control visibly
`PRESERVE_ONLY` and cannot become a mutation.

A changed target adds `interruptable: { expectedValue, value }` to the
existing Creature property mutation. The backend independently reparses the
exact ordinal, requires one exact `Interruptable : Byte`, compares the source
value, replaces only that byte, and verifies the complete candidate plus the
byte-identical paired GIC before the existing revision-fenced atomic
ARE/GIT/GIC/IFO publication.

Unknown keys, wrong family or ordinal, missing/duplicate/aliased/wrong-case or
wrong-type fields, bytes outside `{0,1}`, stale or unchanged pairs, deletion
collision, preservation drift, and candidate readback drift fail closed with
the existing stable Area-update mutation error. Existing authorization,
permission, body/object/property budgets, idempotency, source fencing,
journal, recovery, and transaction rules remain unchanged. No new endpoint,
chunking, streaming, or renderer branch is introduced.

Routine diagnostics may expose only the contract revision, object family,
bounded ordinal, field token, changed-member count, stage, duration, and
stable result code. Values, object IDs, resource names, hashes, raw fields or
bytes, storage keys, and host paths remain excluded.

## Test-first exit criteria

Offline implementation closure requires:

1. strict storage and mutation-domain tests, including absence and both Byte
   values;
2. parser tests for exact presence, absence, wrong case/type, duplicate, and
   invalid Byte;
3. projector, planner, writer, whole-candidate preservation, combined-mutation,
   round-trip, and atomic-publication integration tests;
4. frontend schema, mapper, detached-source, draft, reducer/materializer,
   Apply, OK, reopen, Cancel, and local-Save regressions;
5. capability-catalog binding and passing bounded backend/frontend builds.

All five offline criteria are satisfied. The bounded accepted checks cover
`1937/1937` backend unit assertions across the strict domain, parser,
projector, planner, writer, cache, repository, whole-candidate compiler, and
capability catalog; `1/1` selected atomic-publication integration test; and
`505/505` frontend domain, adapter, mapper, detached-clone, draft-boundary,
dialog, reducer/materializer, and App regression assertions. Backend Nest and
frontend TypeScript/Vite production builds pass. The App regression proves
Apply, OK, reopen, Cancel, and local Ctrl+S while the immutable source Byte
remains unchanged.

One initial invocation used the repository's general `test:unit` Jest profile
and reached its 1 GiB heap during full-project `ts-jest` analysis before any
test executed. It was not retried and the heap was not raised. All accepted
backend test evidence uses `test:unit:bounded` or the bounded integration
profile with one worker; frontend uses `test:unit:focused` with one worker.
No Docker command, service, watcher, browser, Chrome, Toolset, NWN, capture, or
mutation-test process was started.

Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen and packed
readback, plus NWN runtime interruption behavior remain separate release
gates. Until those artifacts are fresh and validator-accepted, live proof is
`missing` and this Area capability is not fully certified.

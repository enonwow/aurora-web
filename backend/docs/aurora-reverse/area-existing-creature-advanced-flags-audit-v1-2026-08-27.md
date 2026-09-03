# Existing Area Creature advanced flags audit v1

Date: 2026-08-27  
Status: source-closed and implemented offline; live release proof missing

## Decision

Aurora Web may expose five retained type-`4` Area GIT Creature flags when each
exact case-sensitive native field is present exactly once as a binary `Byte`:

| Web property | Native label | Reader default | Toolset control |
| --- | --- | ---: | --- |
| `advancedSettings.disarmable` | `Disarmable` | `1` | `cbDisarmable` |
| `advancedSettings.plot` | `Plot` | `0` | `xbPlot` |
| `advancedSettings.immortal` | `IsImmortal` | `0` | `xbImmortal` |
| `advancedSettings.leavesLootableCorpse` | `Lootable` | `0` | `xbLootable` |
| `advancedSettings.noPermanentDeath` | `NoPermDeath` | `0` | `xbNoPermanentDeath` |

All five controls use direct polarity: checked is native Byte `1`; unchecked
is native Byte `0`. Absence remains distinct from the native reader default
and stays `PRESERVE_ONLY`. The web contract never creates one of these fields.

`BodyBag` and `DecayTime` are deliberately outside this slice. The native
Creature editor treats `BodyBag` as a `cbTreasurePile` list selection and
enables it with the decay controls from the `Lootable` handler. It is not a
boolean checkbox and requires its own catalog-bound contract.

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

The executable, decompilation, RCDATA report, and repository paths were
inspected read-only. No xoreos or other GPL source was consulted or used. No
Toolset, NWN, Docker, service, browser, capture, Chrome, watcher, or mutation
process was started.

## Native storage closure

The common Creature reader `FUN_00532174` begins at
`decompiled_all.c:193907`. It reads and stores:

- `Disarmable : Byte`, default `1`, at lines `194268-194269`, record `+0xA0`;
- `Plot : Byte`, default `0`, at lines `194482-194483`, record `+0xBE`;
- `IsImmortal : Byte`, default `0`, at lines `194484-194485`, record `+0xBF`;
- `Lootable : Byte`, default `0`, at lines `194486-194487`, record `+0xC3`;
- `NoPermDeath : Byte`, default `0`, at lines `194490-194491`, record `+0xC1`.

The decompiler names the short `Plot` label as `DAT_00bfe06b`; read-only PE
mapping resolves virtual address `0x00BFE06B` to file offset `0x007FD06B`,
whose exact bytes begin `50 6C 6F 74 00` (`Plot\0`).

The symmetric writer `FUN_0053521c` begins at line `195081`. It emits the same
record bytes through the native Byte writer under the exact labels at lines
`195161`, `195167-195168`, and `195170-195171`. The writer-side short `Plot`
label at virtual address `0x00BFE513` likewise resolves to bytes
`50 6C 6F 74 00`. The established placed-Creature lineage
`FUN_0053ab24 -> FUN_00532174` and
`FUN_0053ae80 -> FUN_0053521c` carries this common record through the type-`4`
Area GIT path.

Reader defaults do not authorize synthesis. Missing, duplicated, aliased,
wrong-case, wrongly typed, or non-binary fields remain preserve-only.

## Exact Toolset control polarity

Read-only PE mapping resolves `TdlgCreatureEdit` to VMT `0x00BBBEE4`. Its
published field table at `0x00BBC054` has 378 entries and binds:

- `cbDisarmable : TCheckBox` at object offset `+0x9A8`;
- `xbPlot : TCheckBox` at `+0x9AC`;
- `xbNoPermanentDeath : TCheckBox` at `+0x9B0`;
- `xbImmortal : TCheckBox` at `+0x9B4`;
- `xbLootable : TCheckBox` at `+0x99C`.

The load function `FUN_0044b110` sends `record != 0` directly to the five
checkbox setters at `decompiled_all.c:69756-69763` and `69769-69770`. The save
function `FUN_0044d360` reads those exact controls and stores their direct
checked bytes at lines `70863-70870` and `70875-70876`. Its existing-record
commit lineage is the same `bOKClick -> FUN_00456e98 -> FUN_0044effc ->
FUN_0044d360` path already frozen for Creature `Interruptable`.

The method table at `0x00BBDB84` also binds `xbLootableClick` to
`0x0047559C`; it controls the enabled state of the Treasure Model and decay
controls. It does not invert the stored `Lootable` checkbox value.

## Frozen additive contract

Area detail may add independently presence-sensitive storage:

```ts
type CreatureBinaryFlagStorage =
  | { present: false }
  | { present: true; value: 0 | 1 };

interface CreatureAdvancedFlagsStorage {
  disarmable: CreatureBinaryFlagStorage;
  plot: CreatureBinaryFlagStorage;
  immortal: CreatureBinaryFlagStorage;
  lootable: CreatureBinaryFlagStorage;
  noPermanentDeath: CreatureBinaryFlagStorage;
}
```

The frontend retains detached immutable `source.creatureAdvancedFlags`. Each
matching web checkbox is independently `ACTIVE_NOW` only for an exact
`aurora_git` Creature, a non-negative immutable family ordinal, and one valid
present source byte for that field. A changed target adds an `advancedFlags`
member to the existing Creature property mutation. Each included flag is an
exact changed `{ expectedValue, value }` pair of native bytes in `{0,1}`.

The backend reparses the exact ordinal and exact label/type for every included
member, compares all expected bytes before changing any field, writes the
complete ordered group, and verifies the whole candidate. It preserves all
unrelated GIT fields and the paired GIC/IFO bytes through the existing
revision-fenced atomic ARE/GIT/GIC/IFO transaction. The group may coexist with
the already-admitted retained Creature Tag, localized names, Conversation,
Interruptable, Appearance_Type, ItemList, and Equip_ItemList mutations, but
never with deletion of the same ordinal.

Unknown or empty groups, unknown member names, malformed pairs, absent or
stale source fields, unchanged values, family/ordinal mismatch, deletion
collision, preservation drift, and readback drift fail closed. Existing
authorization, permission, object/property budgets, idempotency, source
fencing, journal, recovery, endpoint, streaming, and chunking contracts are
unchanged.

Routine diagnostics may expose only contract revision, object family, bounded
ordinal, approved field tokens, changed-member count, stage, duration, and
stable result code. Values, object IDs, resource names, hashes, raw fields or
bytes, storage keys, and host paths remain excluded.

## Offline implementation closure

The admitted contract is now implemented across the complete offline path:

- the backend domain reader, Area GIT parser, immutable snapshot/cache copy,
  draft projector, exact-ordinal planner, candidate compiler, paired GIT/GIC
  writer, full-candidate readback verifier, and revision-fenced atomic
  publication;
- the frontend HTTP boundary, scene mapper, detached source cloning,
  saved-workspace validation, per-member provenance/control state, Creature
  dialog, reducer, final Apply/OK materializer, reopen, Cancel, and local Save;
- a five-member atomic-publication integration case that changes
  `Disarmable=1 -> 0`, `Plot=0 -> 1`, `IsImmortal=0 -> 1`,
  `Lootable=1 -> 0`, and `NoPermDeath=0 -> 1`, verifies exact native Byte
  readback, and proves the paired GIC and IFO byte-identical.

The final bounded checks on the shared tree were:

- backend focused unit gate: 7 suites, `1841/1841` tests;
- backend capability-catalog gate: `13/13` tests;
- backend Area Update integration gate: `48/48` tests;
- frontend focused unit gate: 8 files, `507/507` tests;
- frontend Creature Workspace regression: `7/7` tests;
- backend Nest production build: passed;
- frontend TypeScript/Vite production build: passed with only the existing
  large-chunk advisory.

Capability catalog revision `2026-08-27.69` records this audit, the exact test
surfaces, and the still-open browser/Toolset/NWN gates. Mutation testing was
not requested and was not run. No Docker engine or container command, managed
service, watcher, browser, capture, Chrome, Toolset, or NWN process was
started for implementation or verification of this slice.

## Test-first exit criteria

Offline closure is satisfied by strict domain, exact parser, projection,
ordinal planner, writer, full-candidate preservation/readback,
combined-mutation, round-trip, atomic-publication, frontend
boundary/mapper/detached-source, per-control provenance,
Apply/OK/reopen/Cancel/local-Save regression, catalog binding, and bounded
build checks.

Fresh browser Save/reopen, exact-candidate Toolset Save/Build/reopen and packed
readback, plus NWN runtime behavior remain separate release gates. Until those
artifacts are fresh and validator-accepted, live proof is `missing`.

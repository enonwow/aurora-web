# Existing Area Creature `Subrace` / `Deity` audit v1

Date: 2026-08-27  
Status: source-closed and offline implementation complete; fresh product certification pending

## Decision

Aurora Web may independently replace the exact existing `Subrace :
CExoString` and `Deity : CExoString` fields of one retained type-`4` Area GIT
Creature. Each mutation identifies the retained instance by its immutable
Creature-family ordinal and compares the complete native source value before
writing. It does not rewrite localized-string legacy storage, a UTC, palette
or renderer identity, or any other Creature property.

The bounded v1 product profile admits the empty string or at most 256 printable
ASCII code units (`U+0020..U+007E`). This is an Aurora Web payload and encoding
budget, not a claimed Aurora native maximum. Missing, duplicated, wrong-case,
wrong-type, control-character, non-ASCII, or over-budget storage remains
visible but `PRESERVE_ONLY`. The two members are independently
presence-sensitive.

## Immutable primary authority

The admitted read-only sources are:

- `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`;
- `C:/Projects/New Folder/export/functions.tsv`, SHA-256
  `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe`;
- retail
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- `C:/Projects/nwn-last-city/Aurora/reverse/runs/NWTOOLSET_RCDATA_REFRESH_2026-05-20.json`,
  SHA-256
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`.

No xoreos or other GPL source was consulted or used. No Docker, service,
watcher, browser, Chrome, Toolset mutation, NWN run, capture, or mutation-test
process was started for this audit.

## Native storage closure

The common Creature reader `FUN_00532174` begins at
`decompiled_all.c:193907`. It identifies `Subrace` at line `194270` and
`Deity` at line `194369`. Aurora has an explicit compatibility branch for
native type ID `0x0c` (`CExoLocString`), but its ordinary branch reads each
member through `FUN_00aef090` into common Creature offsets `+0xa4` and `+0xb0`
at lines `194316-194357` and `194415-194456`. The v1 web editor deliberately
does not admit the localized compatibility branch.

`FUN_00aef090` starts at line `968116` and requires native field type ID `10`
at lines `968173-968176`, establishing exact `CExoString` storage. The common
Creature writer `FUN_0053521c` writes offsets `+0xa4` and `+0xb0` through
`FUN_00af0084` under the exact labels `Subrace` and `Deity` at lines
`195162-195163`. `FUN_00af0084` starts at line `968936`, creates or addresses
type ID `10` at lines `968952-968956`, and writes the complete length-prefixed
byte sequence at lines `968961-968976`.

The placed-Creature reader `FUN_0053ab24` calls the common reader at line
`197530`; the placed-Creature writer `FUN_0053ae80` calls the common writer at
line `197590`. This closes the exact type-`4` Area GIT lineage and keeps both
members independent from the paired GIC record.

## Toolset presentation closure

The immutable RCDATA form `TDLGCREATUREEDIT` contains the `Special` group,
visible labels `Subrace` and `Deity`, and edit controls `eSubRace` and
`eDeity` at refresh-manifest lines `3607-3617`. Dialog load
`FUN_0044b110` reads common Creature offsets `+0xa4` and `+0xb0` into the two
controls at decompiled lines `69410-69433`. Dialog save/apply
`FUN_0044d360` reads control members `+0x988` and `+0x98c` and writes them back
to common Creature offsets `+0xa4` and `+0xb0` at lines `70580-70748`. The
canonical common writer then emits the two exact native fields.

This closes control-to-storage identity and independent editability. It does
not authorize non-ASCII text, legacy localized storage conversion, or an
unbounded web payload.

## Frozen additive cross-boundary contract

Area detail may add one exact independently presence-sensitive group to a
type-`4` placement:

```ts
type CreatureSpecialIdentityStringStorage =
  | { present: false }
  | { present: true; nativeType: "cexostring"; value: string };

interface CreatureSpecialIdentityStringsStorage {
  subrace: CreatureSpecialIdentityStringStorage;
  deity: CreatureSpecialIdentityStringStorage;
}
```

Only an admitted present member receives detached frontend source provenance:

```ts
source.creatureSpecialIdentityStrings = {
  subrace?: { expectedValue: string };
  deity?: { expectedValue: string };
};
```

The targets remain
`creatureProperties.advancedSettings.subrace` and `.deity`. A changed admitted
member projects its own exact `{ expectedValue, value }` pair under
`specialIdentityStrings`. Unchanged or unproven members are omitted. At least
one changed member is required; unknown keys, malformed pairs, wrong
family/ordinal, stale source, deletion collision, or aliasing another identity
fails closed.

## Projection, diagnostics, and proof boundary

HTTP parsing validates exact shapes. Scene mapping binds only admitted native
members and never treats loose presentation metadata as mutation provenance.
Saved-workspace validation repeats the source/target/family/ordinal pairing.
Each dialog input is independently `ACTIVE_NOW` only for its exact source; the
other member may remain visible and `PRESERVE_ONLY`.

Planning reparses the exact retained type-`4` ordinal, requires one canonical
case-sensitive field of native type `CExoString`, and compares the complete
expected value. Writing replaces only requested fields, preserves sibling GIT
members and paired GIC bytes, verifies the whole candidate, and uses the
existing revision-fenced atomic Area Update transaction. Diagnostics expose
only contract revision, Creature family, bounded ordinal, approved field token,
stage, duration, and stable result code. Values, object IDs, hashes, raw bytes,
source keys, and host paths are excluded from metric labels.

The offline implementation includes test-first domain, parser, projector,
planner, writer, compiler, fingerprint/snapshot, atomic-publication, HTTP,
mapping, workspace, clone/history, dialog, and guarded
Apply/OK/Cancel/reopen/local-Save flows. Fresh guarded browser Save/reopen,
exact-candidate Toolset
Save/Build/reopen plus packed GFF readback, and NWN verification remain release
gates. Offline closure will not complete the overall Creature, Area CRUD,
renderer, connectivity, or tileset program.

## Offline implementation closure

The backend now exposes only one exact presence-sensitive storage group from a
type-`4` GIT Creature. The process-cache identity includes the complete group
under revision `area-process/v34-creature-subrace-deity`, snapshot publication
deeply detaches both storage members, and draft projection emits only changed
members with immutable expected values. Planning reparses the exact family
ordinal and rejects missing, stale, malformed, wrong-case, wrong-type, or
duplicated storage. The writer replaces requested `Subrace` and `Deity`
members in canonical order, preserves every sibling field, verifies the whole
candidate, and keeps the paired GIC byte-identical.

The frontend HTTP boundary validates the exact nested group and clones both
members. Scene mapping creates per-field provenance only for admitted present
members and overrides only their independent Advanced targets; loose metadata
never authorizes mutation. Saved-workspace validation repeats the exact
family/ordinal/provenance/target checks, history cloning detaches nested
provenance, and the `Special` group reports `ACTIVE_NOW` or `PRESERVE_ONLY`
independently for `Subrace` and `Deity`. Both live draft reduction and final
Apply use the provenance facade, so a disabled or unproven member cannot be
silently promoted into the Area Update payload.

Accepted bounded offline evidence on 2026-08-27 is:

- nine backend unit suites, `2,036/2,036` assertions;
- the complete Area Update integration profile, `52/52` assertions;
- nine focused frontend unit/regression files, `586/586` assertions;
- passing backend Nest and frontend TypeScript/Vite production builds; the
  frontend emits only the pre-existing large-chunk advisory;
- capability catalog revision `2026-08-27.73`, with `13/13` catalog checks and
  explicit browser, Toolset, and NWN blockers.

The atomic integration changes `Subrace : CExoString` from `Moon Elf` to
`Sun Elf` and `Deity : CExoString` from empty to `Mystra`, verifies persisted
readback, publishes the pre-existing Area Update ARE candidate, and preserves
GIC plus module IFO byte-for-byte. No Docker engine/container command,
managed service, watcher, browser, Chrome, Toolset mutation, NWN run, capture,
GPL source, or mutation-test process was used for this closure.

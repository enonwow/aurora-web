# Existing Area Creature `FactionID` audit v1

Date: 2026-08-27  
Status: source-closed and offline-implemented; fresh product certification pending

## Decision

Aurora Web may author the faction of one retained type-`4` Area GIT Creature
only through one exact present canonical `FactionID : Word` field and one exact
module-owned `repute.fac` catalog. The stored value is the zero-based physical
`FactionList` ordinal. Faction display text is derived from that catalog and is
never mutation identity.

The common Aurora Creature reader accepts a legacy `FactionID : DWord` input,
but the common writer always serializes `FactionID : Word`. This v1 editor
therefore admits only an existing canonical Word. A missing, duplicated,
wrong-case, DWord, or otherwise malformed field remains visible through the
existing presentation metadata but is `PRESERVE_ONLY`; Aurora Web does not
normalize it merely because the native reader could load it.

This slice does not authorize editing `repute.fac`, faction names, parents,
global flags, directed reputations, encounter factions, Placeable `Faction`,
Creature alignment, scripts, AI behavior, or arbitrary Creature templates.

## Immutable primary authority

The admitted read-only reverse inputs are:

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
  `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa`;
- the accepted `AUR-S03-02` native Toolset/GIT/runtime evidence listed below.

No xoreos or other GPL source was consulted or used. No new Toolset, NWN,
Docker, service, watcher, browser, Chrome, capture, or mutation-test process
was started for this audit.

## Native storage closure

The common Creature reader `FUN_00532174` begins at
`decompiled_all.c:193907`. At lines `194246-194254` it first asks for the exact
field type of `FactionID`. Type ID `4` is read through the native DWord reader
`FUN_00aeee7c`; every other input is attempted through the native Word reader
`FUN_00aeedc4`, with in-memory default faction `1`.

`FUN_00aeedc4` at lines `967918-967942` succeeds only for GFF field type ID `2`
and returns the unsigned 16-bit payload. The symmetric common Creature writer
`FUN_0053521c`, beginning at line `195081`, writes the in-memory unsigned
16-bit faction through `FUN_00aefd88` with label `FactionID` at line `195160`.
`FUN_00aefd88` at lines `968723-968747` creates or addresses field type ID `2`
and stores the unchanged value. The canonical Toolset output is therefore
`FactionID : Word`, even though the reader retains a legacy DWord branch.

The established placed-Creature lineage
`FUN_0053ab24 -> FUN_00532174` and
`FUN_0053ae80 -> FUN_0053521c` carries that common record through the type-`4`
Area GIT list. Reader defaults and legacy compatibility do not authorize the
web editor to synthesize or normalize absent/noncanonical storage.

## Toolset presentation and catalog identity

The RCDATA resource `TDLGCREATUREEDIT` binds the `Advanced` tab controls
`gbFaction`, `cbFaction`, `cbFactionChange`, `sbFactionEditor`, and
`sbFactionEditorClick` to the visible labels `Faction` and `Edit Factions`.
The dialog load path `FUN_0044b110` copies the common Creature faction Word
from offset `+0x9c` into the dialog state at line `69668`; the save path
`FUN_0044d360` copies the selected dialog value back to the same common member
at line `70575` before the canonical writer serializes it.

The module faction loader and serializer are already source-closed in
`area-existing-placeable-faction-audit-v1-2026-08-19.md`. They load the exact
module resource `repute.fac`, walk `FactionList` in physical order, and use the
physical ordinal as faction ID. They also require the complete `RepList` even
though this slice never mutates it. Aurora Web reuses the same strict module
catalog and the existing additive wire member `placeableFactionCatalog`; the
legacy member name is retained for v1 compatibility, while its semantics are
module-wide and shared by Placeable and Creature selectors.

## Accepted native differential and runtime evidence

The existing accepted `AUR-S03-02` proof is independent of Aurora Web:

- `aurora-toolset-npc-stage3-standard.md` records the native Advanced/Faction
  workflow and the requirement for modified-state, Save, GIT readback, runtime,
  and rollback;
- the Defender after-Save GIT summary has SHA-256
  `2fe45dd36e5a93b01f21ff5c6e720a75e9d1002d23318bb1f56bc62b6c533a3b`;
- its exact retained Dwarf at `x=60.9686`, `y=54.5207` has
  `factionId=4`, matching physical `repute.fac` row `4 Defender`;
- the accepted faction runtime frame has SHA-256
  `b265352daae9dd98aa6fdd6ef15e445e42073de2a05dc2b220e3cfb1993748d7`;
- the final clean rollback GIT summary has SHA-256
  `9cd18cebbc0341f21d79f6e007a5ab3e4233568f36f76d9dd3b5cca7626803f2`
  and restores the retained Dwarf to `factionId=1`, physical row `1 Hostile`;
- the accepted stage aggregate has SHA-256
  `0138794b69faedbe9d14d3edade54422d1b56d68fd31f545d28402a2df289cac`
  and marks `AUR-S03-02=true`.

This closes physical-row identity, native Save/readback, behavior visibility,
and rollback for the reference module. It does not replace a fresh exact-
candidate proof of the Aurora Web-produced module.

## Frozen additive cross-boundary contract

Area detail may add this exact storage to one type-`4` placement:

```ts
type CreatureFactionStorage =
  | { present: false }
  | { present: true; nativeType: "word"; value: number };
```

For an exact retained `aurora_git` Creature with a non-negative family ordinal,
an admitted present Word and the exact module catalog produce detached source
provenance:

```ts
source.creatureFaction = {
  expectedValue: number;
  catalogSha256: string;
  catalogFactionCount: number;
};
```

The editable numeric target is
`creatureProperties.advancedSettings.factionId`. The existing string
`advancedSettings.faction` is derived presentation only. A changed target
projects one pair inside the existing Creature property mutation:

```ts
faction: {
  expectedValue: number;
  value: number;
  catalogSha256: string;
  catalogFactionCount: number;
};
```

All objects are strict: unknown keys, invalid unsigned Words, counts outside
`1..1024`, uppercase/non-hex digests, unchanged pairs, source or target IDs
outside the catalog, wrong family/ordinal, stale catalog identity, deletion
collision, and duplicate property mutation fail closed.

## Projection, write, and diagnostics contract

The HTTP boundary validates the exact storage/catalog shape. Scene mapping
binds provenance only when storage, catalog digest/count, and physical row all
agree. Saved-workspace validation repeats the complete relationship and
rejects a numeric target without exact provenance. The dialog enables the
numeric catalog selector only for that admitted state; otherwise the visible
Faction control is preserve-only and cannot mutate the draft.

Projection emits the changed pair only. Planning reparses the exact retained
type-`4` ordinal and requires one canonical `FactionID : Word` equal to the
immutable expected value. Compilation freshly re-resolves the complete
`repute.fac`, rechecks digest, count, and both physical IDs, and then the paired
writer replaces only `FactionID : Word`. Whole-candidate readback must verify
the target while all sibling GIT fields, paired GIC, ARE, IFO, and `repute.fac`
remain unchanged except for the already combined independently admitted
mutations in the same transaction.

Existing authorization, permission, optimistic concurrency, idempotency,
module fencing, journal, recovery, atomic publication, and API v1 budgets are
unchanged. Routine telemetry may expose only contract revision, object family,
bounded ordinal, the approved `FactionID` token, stage, duration, and stable
result code. It must not expose faction values or names, catalog hashes,
object IDs, storage keys, raw bytes, or host paths as metric labels.

## Test-first exit criteria and proof boundary

### Offline implementation checkpoint — 2026-08-27

The bounded implementation is complete through the repository's offline
boundary. Backend parsing, detached provenance, projection, deletion planning,
catalog-bound compilation, canonical Word CAS write, candidate readback,
snapshot cloning/fingerprinting, and atomic publication integration are in
place. Frontend HTTP validation, scene mapping, saved-workspace validation,
history cloning, draft control state, exact catalog selector, guarded
materialization, Apply/OK/Cancel/reopen, and local Save are also in place.

The focused backend evidence is green: 1,998 assertions across the Creature
faction domain, Area parser, projector, deletion planner, paired writer,
candidate compiler, processing fingerprint, repository snapshot, and atomic
publication integration. The focused frontend evidence is green: 550 unit
assertions across nine contract/domain/workspace/dialog suites plus all nine
Creature-properties regression scenarios. Both bounded production builds pass.
The frontend normalization regression specifically proves that canonical
`factionId` survives unrelated Creature advanced-field normalization.
Immutable Area capability catalog revision `2026-08-27.71` binds this audit,
the exact backend/frontend tests, and the three still-open browser, native
Toolset, and NWN faction proof gates to `objects_creature_authoring`.

No Docker, service, watcher, browser, Chrome, Toolset mutation, NWN run, proof
capture, or mutation test was started for this checkpoint. Consequently no
fresh product-live or native exact-candidate artifact is claimed here.

Offline implementation requires tests for strict storage/provenance/mutation
validation, present/absent/duplicate/wrong-case/wrong-type parser behavior,
projection and stale-source rejection, fresh catalog drift, exact Word write,
complete candidate readback, combined Creature property mutation, GIC/ARE/IFO
and `repute.fac` byte identity, HTTP mapping, detached provenance, saved-draft
validation, derived display identity, Apply/OK/Cancel/reopen/local Save, clone
and history, focused integration, and both bounded production builds.

Fresh browser Save/reopen and visible readback, exact-candidate Toolset
Save/Build/reopen plus packed GFF readback, and NWN faction behavior remain
release gates. Until validator-accepted current artifacts exist, product live
proof is `missing` and this bounded slice cannot close the overall Area CRUD,
authoring, tile, connectivity, or 99-tileset goal.

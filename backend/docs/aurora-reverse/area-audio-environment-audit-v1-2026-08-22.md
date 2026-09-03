# Existing Area audio-environment audit v1 - 2026-08-22

## Scope

This audit freezes the native storage and Toolset-editing contract for the
nine audio values stored in the GIT root `AreaProperties` struct. It authorizes
an exact, complete compare-and-swap mutation of already present canonical
fields. It does not claim that Aurora Web already resolves every 2DA label,
plays the resulting audio with retail parity, or has passed Toolset/NWN runtime
proof.

## Primary evidence lineage

| Artifact | SHA-256 |
| --- | --- |
| `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe` | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| `C:/Projects/New Folder/export/decompiled_all.c` | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| `C:/Projects/New Folder/export/strings.tsv` | `864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f` |
| `C:/Projects/nwn-last-city/Aurora/reverse/refs/Tooling/nwtoolset_rcdata_report.json` | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |
| `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key` | `09cdafb6dbfb9cdb544993154c514c65ef9fd5be4e0c1b8fd971ed05aff90935` |
| retail `ambientsound.2da` bytes | `af2f1ea8c449e8e1956c32372d3274b1e9a854e13910ceabc82acf0ecc5b661a` |
| retail `ambientmusic.2da` bytes | `20470aed721cee2a9b4c134512f87fa4d345d8b38c8c023de07f13fefb35e650` |
| retail `soundeax.2da` bytes | `cb894734a2c49b75bec355e681151174f96098c2f89446b81a403ad71f08700e` |

The independent packed-module structural readback and representative resource
hashes are recorded in
`backend/docs/aurora-reverse/area-companion-profile-offline-differential-2026-08-07.md`.
That readback found one type-`100` `AreaProperties` struct and all nine fields
below as GFF `INT` in each of the three inspected GIT resources.

No xoreos implementation or runtime observation is used as authority here.
Older mixed-source research artifacts were excluded after applying
`C:/Projects/ai-documentations/aurora-web/rules/xoreos-gpl-secondary-reference-policy.md`.

## Native GFF read and write contract

`FUN_0056716c` in `decompiled_all.c:220655-220684` first resolves the root
`AreaProperties` struct and then reads these exact fields in this order:

1. `AmbientSndDay` into object offset `+0x14`;
2. `AmbientSndNight` into `+0x18`;
3. `AmbientSndDayVol` into byte storage at `+0x1c`;
4. `AmbientSndNitVol` into byte storage at `+0x1d`;
5. `EnvAudio` into `+0x20`;
6. `MusicBattle` into `+0x24`;
7. `MusicDay` into `+0x28`;
8. `MusicNight` into `+0x2c`;
9. `MusicDelay` into `+0x30`.

The reader supplies `127` when either volume field is absent and `0` for each
other absent field. These are native read defaults, not permission for Aurora
Web to materialize a missing or malformed field during existing-Area editing.

The common reader helper `FUN_00aeeed8` at
`decompiled_all.c:967994-968016` requires GFF field type id `5`. The matching
writer helper `FUN_00aefecc` at `decompiled_all.c:968819-968846` creates type id
`5`. GFF type id `5` is the signed 32-bit `INT` lane used by the project's
independent GFF parser/writer.

`FUN_0056a6c8` at `decompiled_all.c:222704-222729` creates a type-`100`
`AreaProperties` struct and writes the same nine exact labels with the same
layout. It zero-extends the two in-memory bytes before writing them as `INT`.

## Toolset UI contract

The native `TDLGAREAPROPERTIES` RCDATA form exposes the `Audio` tab with:

- `Ambient Sound, Day` and `Ambient Sound, Night` combo boxes;
- `Music, Battle`, `Music, Day`, and `Music, Night` combo boxes;
- `Environmental Audio Effects` combo box;
- `Ambient Sound, Day Volume` and `Ambient Sound, Night Volume` track bars;
- `Music, Playing Delay (s)` edit/up-down pair.

Both volume track bars encode `Max = 127` in the native form stream. The
day-track record begins at form-relative offset `5933`, with its `Max` property
at `6009`; the night-track record begins at `6167`, with `Max` at `6245`.

The music-delay edit encodes `MaxLength = 3`. Its associated up-down record
encodes signed `Min = -99`, `Max = 99`, and `Position = 0` at form-relative
offsets `5735` and `5741` for the range properties. The UI label explicitly
declares seconds.

The decompiled dialog path independently proves the storage conversion:

- `FUN_00551cf0` at `decompiled_all.c:208830-208849` sends the retained
  `MusicDelay` value to the control after integer division by `1000`;
- `FUN_005526e8` at `decompiled_all.c:209289-209333` reads the control value and
  stores `value * 1000`;
- `decompiled_all.c:209789-209797` and `209941-209949` copy the complete nine-
  member tuple between the dialog and the native Area audio object, preserving
  byte storage for the two volume members.

Therefore Toolset-stable authored delay values are exact multiples of `1000`
within `-99000..99000`. A non-multiple would be truncated on display and
normalized on the next Toolset save.

## Native effective catalog contract

`FUN_0054e9ec` at `decompiled_all.c:207152-208153` opens the 2DA named
`AmbientSound`, iterates physical rows, reads `Description`, falls back through
`DisplayName` and `Resource`, and adds the retained physical row index to both
day and night combo boxes. The installed retail resource is
`ambientsound.2da` with 256 physical rows and exact columns `Description`,
`Resource`, `PresetInstance0..7`, and `DisplayName`.

The same function at `decompiled_all.c:207760-208197` opens `AmbientMusic`,
reads `Description`, `DisplayName`, and `Resource`, and uses the data-derived
`mus_bat_` resource prefix to populate the battle selector while retaining row
indexes for the day/night selectors. Retail `ambientmusic.2da` has 138
physical rows and exact columns `Description`, `Resource`, `Stinger1..3`, and
`DisplayName`.

`FUN_005511a8` at `decompiled_all.c:208200-208260` opens `soundeax`, reads
`Description`, falls back to `Label`, and stores each physical row index in the
environmental-audio combo. Retail `soundeax.2da` has 113 physical rows with
exact `Label` and `Description` columns. `environment.2da` is not this control's
source and must never be substituted.

The application effective-resource rule is one complete resource selected by
module, ordered HAK, then vanilla precedence. Rows from weaker tables are not
merged. Every exposed label is coupled to the selected resource name, source
layer/key, exact SHA-256, byte size, row count, and physical row index. A
malformed strongest source fails closed rather than silently changing identity
to a weaker table. TLK display resolution may enrich a row but cannot change
its numeric storage identity or resource mapping.

## Additive v1 product contract

The API/domain value is a complete immutable tuple:

```text
ambientSoundDayId: int32 >= 0
ambientSoundNightId: int32 >= 0
ambientSoundDayVolume: integer 0..127
ambientSoundNightVolume: integer 0..127
environmentAudioId: int32 >= 0
musicBattleId: int32 >= 0
musicDayId: int32 >= 0
musicNightId: int32 >= 0
musicDelayMilliseconds: integer -99000..99000, divisible by 1000
```

The non-negative ID boundary is a conservative product admission rule for
Toolset combo-backed values; it is not a claim that every non-negative signed
32-bit value resolves to a valid row. When the optional immutable effective
2DA catalog bundle is unavailable, these controls expose and preserve raw IDs
and must not fabricate labels or resource ResRefs.

Existing-Area editing follows these rules:

1. Area detail exposes `audioEnvironment` only when the root contains exactly
   one exact-case `AreaProperties : Struct(100)` and exactly one correctly
   typed, exact-case instance of every field above.
2. Missing, duplicate, wrong-case, wrong-type, partial, or out-of-product-range
   provenance is visible as preserve-only; it never authorizes insertion or
   default synthesis.
3. A mutation is one complete `{ expectedValue, value }` pair bound to the
   immutable source GIT SHA-256. Unchanged and partial pairs fail closed.
4. The compiler reparses the retained GIT, checks the expected tuple, composes
   the audio mutation with any admitted object mutation, preserves every other
   supported root/nested GFF value and struct type, and performs independent
   candidate readback.
5. GIC and IFO remain unchanged unless another admitted mutation in the same
   transaction changes them. ARE remains governed only by its existing Area
   update fields.
6. Candidate and persisted receipts carry bounded hashes and the declared
   tuple, never raw GFF bytes, host paths, or sound assets.

## Diagnosability and identity-neutral resolution

The exact tuple and source/candidate GIT hashes are sufficient to diagnose an
authoring result. Unresolved audio IDs remain raw numeric provenance with an
explicit unresolved state. Runtime/materialization code must not choose a
sound by Area ResRef, biome, filename fragments, modulo indexing, or a
synthetic ResRef. A lookup may return a sound only for an exact evidence-bound
mapping; otherwise it returns no resolved sound and retains the raw ID.

## Required tests

1. Domain boundary/equality tests for all nine values.
2. Strict canonical GIT read tests covering case, uniqueness, type, struct
   type, range, and complete-tuple requirements.
3. Round-trip writer tests proving stale/no-op rejection, exact candidate
   readback, and unrelated-field preservation.
4. Draft projection and compiler tests proving immutable GIT hash binding and
   composition with object mutations.
5. Independent validation and atomic publication/readback tests.
6. Frontend HTTP, mapper, workspace clone, facade, dialog, and regression tests
   proving editable versus preserve-only behavior and millisecond/second UI
   conversion.
7. Regression tests proving that unresolved IDs do not create guessed or
   identity-selected sound references.

## Remaining release gates

- browser Save/reopen proof for all nine controls;
- exact-candidate Toolset Save/Build/reopen proof;
- NWN day/night ambient, volume, battle/day/night music, delay, and
  environmental-audio behavior proof;
- confirmation that no unrelated object, tile, ARE, GIC, or IFO data drifted.

Until those gates pass, `properties_audio_environment` is an implemented
storage-authoring slice with release status `partial`, not complete runtime
parity.

## Implementation checkpoint — 2026-08-22

Capability catalog revision `2026-08-22.21` carries the implemented offline
storage-authoring path. The backend now reads the exact tuple from canonical
GIT provenance, carries it through Area detail/processing and immutable draft
state, projects one complete source-bound CAS mutation, composes it after any
admitted object-pair mutation, independently parses the candidate, and
publishes it through the atomic Area update transaction. The retained module
snapshot repository no longer invents ambient sounds from Area names, biome
fragments, numeric tokens, modulo selection, or synthetic ResRefs.

The frontend now validates the tuple at HTTP and persisted-workspace
boundaries, maps it to the Area scene, exposes a preserve-first facade, and
renders all nine controls on the Audio tab. IDs remain raw non-negative
numbers until effective 2DA catalogs exist. Volumes admit `0..127`; music delay
is shown as seconds `-99..99` and stored as an exact millisecond multiple of
`1000`. Missing or malformed provenance and the zero sentinel remain visibly
preserve-only.

Accepted bounded offline validation:

- 64 focused backend unit/catalog assertions across the domain, GIT writer,
  snapshot repository, no-guessing internals, processing-cache identity, and
  capability catalog;
- 1/1 dedicated Area-audio atomic-publication integration test, including
  independent nine-field GIT readback and byte-identical ARE/GIC/IFO;
- 160 focused frontend domain, HTTP, mapper, workspace, facade, and dialog
  unit/component tests;
- passing backend and frontend production builds.

The large Area service, projector, compiler, validation, coordinator, and
legacy aggregate integration files exceeded the mandatory 1 GiB Jest heap
during suite loading. Their new source assertions were therefore not counted
as passing. Production source type-checks in the backend build, while the
dedicated bounded integration config executes the end-to-end publication path
without raising the heap limit. No service, browser capture, Toolset, or NWN
process was started while the coordinated VFX lane owned the runtime pair.

## Effective 2DA catalog implementation checkpoint — 2026-08-22

Capability catalog revision `2026-08-22.22` closes the offline effective-audio
catalog blocker. The backend now selects one complete `ambientsound.2da`,
`ambientmusic.2da`, and `soundeax.2da` resource through module, ordered HAK,
then vanilla precedence. Tables are never row-merged. A malformed strongest
source omits the entire bundle instead of falling through to a different
effective identity. Every table descriptor carries its exact resource name,
source key/layer, SHA-256, source byte size, and row count; rows retain their
physical indexes. TLK labels enrich display only and never change numeric
storage identity.

The shared contract is `area-audio-environment-catalogs.v1`, all-or-nothing,
and fail-closed. Each source is limited to 16 MiB and 4096 rows, while the
complete serialized bundle is limited to 2 MiB. The Area snapshot repository
keeps the catalogs out of list summaries and clones them only into Area detail
and processed results. Process-cache identity includes both descriptor hashes
and resolved display labels.

The frontend validates exact resource-specific descriptors and rows at the
HTTP and persisted-workspace boundaries, clones the immutable bundle into the
scene and properties facade, and renders six ID selectors. Ambient sound and
environmental audio use their native table rows. The music battle selector
admits only rows whose source `Resource` carries the native `mus_bat_` prefix;
day/night selectors admit the complementary rows. A retained ID absent from
the effective table remains visible as `Unresolved row N` and is never mapped
to a guessed label or ResRef. Volumes and delay retain their existing numeric
controls and the mutation body remains the exact nine-value GIT tuple.

Accepted bounded offline validation for this checkpoint is:

- 42 focused backend assertions across parser/budget validation, resolver
  provenance, Area detail transport, application transport, cache identity,
  and capability catalog;
- 1/1 dedicated atomic Area-audio publication/readback integration test;
- 166 focused frontend domain, HTTP, mapper, workspace, facade, and component
  assertions;
- passing backend and frontend production builds.

No managed service, browser capture, Toolset, or NWN process was started while
the coordinated VFX lane owned the runtime pair. Browser Save/reopen,
exact-candidate Toolset Save/Build/reopen, and NWN audio behavior remain
mandatory release proof and are not inferred from this offline checkpoint.

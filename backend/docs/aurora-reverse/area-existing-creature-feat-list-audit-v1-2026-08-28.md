# Existing Area Creature `FeatList` audit v1

Date: 2026-08-28  
Status: `OFFLINE_SOURCE_CLOSED_FOR_GUARDED_MUTATION`; implementation, metamagic-removal coupling, and live proof pending

## Decision

Aurora Web may implement retained type-`4` Area Creature `FeatList` authoring
only as an exact, provenance-bound set mutation. The persisted identities are
physical `feat.2da` row numbers stored as GFF Words. Names, translated labels,
filter positions, and the current fixed frontend examples are presentation
only and cannot authorize a write.

The first admitted mutation lane must require one canonical `FeatList`, one
immutable effective `feat.2da`, unique source and target row IDs, complete
compare-and-swap, and exact candidate readback. It must reject a source that
contains an unknown or Toolset-hidden row, duplicate row, non-type-`1` entry,
wrong-case/wrong-type `Feat`, or opaque sibling field. Those shapes are
preserve-only because the native Creature dialog silently normalizes or drops
them when it rebuilds the list.

Two coupling rules are mandatory:

1. A target that changes presence of exact feat row `40` must atomically carry
   the existing source-closed hit-point dependency state and the independently
   derived target `HitPoints`/`CurrentHitPoints`/`MaxHitPoints` triplet.
2. Removing a feat used by effective `metamagic.2da/FeatRequired` must be
   rejected until the retained class spell-list contract can atomically clear
   the corresponding metamagic spell variants. Adding such a feat does not
   synthesize spell variants and remains eligible under the base list lane.

This audit does not authorize guessed feat legality, automatic prerequisite
resolution, level-up/package effects, or `ChallengeRating` recalculation.

## Immutable primary authority

| Source | Size | SHA-256 |
| --- | ---: | --- |
| `C:/Projects/New Folder/export/decompiled_all.c` | 30,366,020 bytes | `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572` |
| `C:/Projects/New Folder/export/functions.tsv` | 1,928,975 bytes | `394096fe106e5767ee6eceb31c8b085091359060351b1d10195e96f666bc69fe` |
| `C:/Projects/New Folder/export/strings.tsv` | 2,691,636 bytes | `864ae0139451d5333307cb2bbccce725bbd2d2c6056ac2d5f80f9b5ea50f190f` |
| installed retail `nwtoolset.exe` | 12,201,984 bytes | `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24` |
| retail `TDLGCREATUREEDIT` RCDATA payload | 52,662 bytes | `75e2dcfd5b0886dbb13bfb7cb32290ccce842cada84cfb806510abde52e7820e` |
| frozen Toolset RCDATA report | 495,547 bytes | `3d9c5d29709bcf4aa037554781d229a2094f3d85370c44a6a5df9a222f8d87fa` |

No xoreos or other GPL source was inspected or used.

## Native GFF storage closure

The common Creature reader `FUN_00532174` clears the runtime feat vector at
Creature offset `+0x1ec`, opens exact case-sensitive `FeatList`, iterates the
list structs, reads exact `Feat` through Word reader `FUN_00aeedc4`, allocates
one unsigned 16-bit value, and appends it in source order at
`decompiled_all.c:194743-194769`.

The reciprocal common writer `FUN_0053521c` always creates exact `FeatList`,
including for an empty vector. For each vector element it creates a list
struct of type `1` and writes exact `Feat : Word` through `FUN_00aefd88` at
lines `195265-195271`. This closes field case, native type, writer struct type,
empty-list behavior, and ordered numeric row storage.

The reader does not give localized labels or feat-rule semantics to the stored
Word. Physical row identity must therefore remain numeric end to end.

## Retail form and method-table closure

The frozen `TDLGCREATUREEDIT` form contains `tsFeats1`, `sgFeatsTable`,
`sgFeatsTableDrawCell`, `sgFeatsTableSelectCell`, `cbFeatsFilter`,
`cbFeatsFilterChange`, `gbFeatSummary`, `meFeatsSummary`, and `bFeatsHelp`.

A bounded read-only PE probe located the Pascal short string
`TdlgCreatureEdit` at VA `0x00BBE809`, its VMT class-name pointer at
`0x00BBBEAC`, and the self-consistent VMT at `0x00BBBEE4`. `VMT-64` points to
the 132-entry published method table at `0x00BBDB84`. It independently
reproduces the already-audited `CRAdjust` handler addresses and maps the feat
handlers as follows:

| Method-table index | Handler | Code address |
| ---: | --- | --- |
| 102 | `cbFeatsFilterChange` | `0x0046EBE8` |
| 103 | `sgFeatsTableDrawCell` | `0x0046EBF0` |
| 104 | `sgFeatsTableSelectCell` | `0x0046F310` |
| 106 | `bFeatsHelpClick` | `0x0046FD10` |

The exported Ghidra function list did not split `0x0046F310` as a standalone
function. Direct bounded x86 disassembly of the pinned retail executable from
`0x0046F310..0x0046F393` closes the handler body without relying on a live
Toolset process.

## Effective feat catalog and ordering

`FUN_0046d330`, at decompiled lines `87926-88140`, loads exact `feat.2da`.
For every physical row with a usable nonzero numeric `FEAT` StringRef it:

- resolves the localized display name through the native TLK path;
- reads numeric `ToolsCategories`;
- retains the physical row number as the stored Word identity;
- retains the Description StringRef; and
- initializes one selected flag in the dialog's master model at `+0xb94`.

The master model is sorted by the comparator at `0x00443804`. Bounded retail
disassembly shows that the comparator reads the resolved names and delegates
to `FUN_0077a09c`; that helper calls
`CompareStringA(LOCALE_USER_DEFAULT, 0, left, -1, right, -1) - 2` at
decompiled lines `511576-511583`. Native list order is consequently localized
display-name order, not physical row order, and can vary with the Windows user
locale. Numeric row IDs remain the only stable semantic identity.

`FUN_0046dcbc`, at lines `88226-88242`, marks the first catalog entry whose
physical-row Word equals a loaded Creature feat. A missing catalog row is not
retained in the selection model; repeated source IDs collapse to one flag.
`FUN_0046f394`, at lines `88784-88810`, clears the target vector and appends
every selected catalog row in the already sorted master-model order. A normal
Toolset dialog save therefore drops unknown/hidden rows, collapses duplicates,
drops opaque entry fields, and may reorder otherwise valid feats.

Aurora Web must not perform that destructive normalization implicitly. The
guarded mutation lane admits canonical sources only and treats serialization
order as an explicit numeric vector. Any future Toolset-normalization command
must be separately named, confirmed, and proven.

## Selection-handler behavior

Direct disassembly of `sgFeatsTableSelectCell` proves that a valid row-select
event with selection mode `2` toggles the entry's selected byte, calls
`FUN_0046dd04` to rebuild the feat summary, and updates the visible summary
control. It does not call the Creature hit-point helper or the full challenge-
rating calculator.

When a deselected row has `ToolsCategories == 4`, the handler also calls
`FUN_0046f450` with the physical feat row. That function opens exact
`metamagic.2da`, reads `FeatRequired` for metamagic rows `1`, `3`, `2`, `4`,
`5`, and `6`, and maps a matching removed feat to one of six metamagic kinds.
It then calls `FUN_0045cbe0`, which clears the corresponding per-spell flag
across all eight Creature class-slot models at form offsets
`+0xb68..+0xb84`.

Final dialog commit `FUN_0044effc` first calls the general form save and then
`FUN_0044d028`. The latter clears and reconstructs each class spell collection
through `FUN_0046a76c`; that routine emits spell entries for ordinary and
metamagic variants `8`, `1`, `2`, `4`, `16`, and `32` according to those model
flags. Removing a required metamagic feat can therefore delete coupled spell
variants. A `FeatList`-only writer must reject that transition rather than
silently diverge from the Toolset.

## Hit-point and challenge-rating coupling

Existing audit
`area-existing-creature-hit-points-audit-v1-2026-08-28.md` proves that common
Creature load calculates maximum HP from base Constitution, effective
`racialtypes.2da/ConAdjust`, the first eight class levels, base HP, and exact
feat row `40`. Presence of row `40` adds one HP per class level.

The feat click handler itself does not refresh the HP controls. In
`FUN_0044d360`, the HP triplet is materialized before `FUN_0046f394` copies the
new feat selection into the Creature. A one-pass Toolset save may therefore
write a triplet based on the previously loaded feat state; reopening the
Creature runs the common reader and derives maximum HP from the new state.

Aurora Web's retained HP contract already promises a coherent, independently
recomputed, compare-and-swap triplet. The web mutation must preserve that
invariant: when membership of row `40` changes, it must carry the exact HP,
Constitution, Race, class-level, and effective `racialtypes.2da` source state,
derive the new triplet with target `featRow40Present`, and write both changes
atomically. This is reopen-consistent normalization, not a claim that the
immediate Toolset dialog refreshes HP on the click.

No direct or transitive path from ordinary feat selection calls
`FUN_00457a4c`, the Toolset's full challenge-rating recalculation entry used by
class, adjustment, and template workflows. Stored `ChallengeRating` remains
unchanged for the admitted base feat mutation. Broader feat effects inside the
full CR calculator remain outside this contract.

## Current Aurora Web boundary

The current generic Creature metadata parser exposes normalized
`featListEntries` using case-insensitive aliases and optional `featId` labels.
It does not preserve exact list presence, exact field case/type, type-`1`
struct identity, duplicates, opaque siblings, original vector order, or an
effective-table digest. It is presentation metadata, not write provenance.

The frontend draft also contains a fixed `CREATURE_DEFAULT_FEATS` example list
and editable `{ featId?, name, type, assigned }` rows. Those labels and
categories are not bound to the module/ordered-HAK/vanilla resource chain.
Area Update currently does not project a retained feat mutation. The existing
controls must remain preserve-only for retained Creatures until the additive
contract below is present; new-Creature drafting remains a separate creation
contract.

## Required additive FE-BE contract

Area detail may add one exact retained `creatureFeatListState`:

```ts
type AreaCreatureFeatListState =
  | { present: false }
  | {
      present: true;
      nativeType: "list";
      structTypeId: 1;
      featNativeType: "word";
      featIds: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
      table?: {
        resourceName: "feat.2da";
        sourceObjectKey: string;
        sourceLayer: "module" | "hak" | "vanilla";
        sha256: string;
        sizeBytes: number;
        rowCount: number;
      };
    };
```

The authenticated catalog surface must resolve one strongest whole
module/ordered-HAK/vanilla `feat.2da`; a stronger malformed resource blocks
weaker fallback. It exposes bounded pages keyed by physical row ID and includes
only rows with an admitted numeric `FEAT` StringRef, exact numeric
`ToolsCategories`, resolved display text, and an immutable table descriptor.
Rows are never merged or renumbered. The source is bounded to 64 MiB and at
most 65,536 physical rows; target IDs remain in Word range `0..65535`.

The mutation carries exact `expectedFeatIds`, unique ordered `featIds`, table
SHA-256 and row count. Both vectors must be canonical and every ID must resolve
to an admitted current row. Source and target must differ. Removing a current
effective metamagic `FeatRequired` row is rejected with a stable coupling
reason until class spell-list authoring is implemented. A row-`40` membership
transition additionally carries a complete HP mutation whose expected feat
flag equals the source vector and whose target feat flag equals the target
vector.

Planning reparses the exact retained Creature ordinal and performs full vector,
shape, opaque-sibling, HP-dependency, and table-descriptor CAS. Compilation
re-resolves the effective feat table, verifies its digest/count and every row,
rechecks the metamagic-removal guard, writes the coupled HP triplet when
required, reconstructs exact type-`1`/`Feat : Word` entries, preserves all
unrelated GIT members and paired GIC/ARE/IFO bytes, and requires an exact parsed
candidate readback before atomic publication.

## Diagnostics and acceptance boundary

The additive low-cardinality event is `area_creature_feat_list_cas.v1`.
Allowed dimensions are contract revision, `creature` family, bounded stage,
source layer, changed-membership bucket, row-40-coupling boolean, and stable
reason codes such as `source_noncanonical`, `table_missing`, `table_stale`,
`row_missing`, `duplicate_id`, `metamagic_coupling_required`,
`hit_point_coupling_missing`, and `readback_mismatch`. IDs, names, localized
text, object ordinals, hashes, paths, storage keys, raw fields/bytes, and host
paths are excluded from metric labels.

Offline acceptance requires tests-first coverage for strict parsing, absent
versus empty list, wrong case/type/struct, duplicate/unknown/hidden IDs, opaque
siblings, effective-table precedence and staleness, detached frontend
provenance, numeric filtering, vector CAS, row-40 HP coupling, metamagic-removal
rejection, canonical writer/readback, no-op byte identity, paired GIC/ARE/IFO
identity, and atomic publication.

Fresh guarded browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed GIT readback, and NWN feat/HP behavior proof
remain independent release gates. This audit does not certify the full Area or
tile-rendering program.

## Resource/process statement

This audit used bounded reads of immutable decompilation exports, the frozen
RCDATA report, and read-only PE bytes plus bounded static x86 disassembly. The
installed Toolset executable was not started or controlled. No Docker command,
container, service, watcher, browser, capture, Chrome, Toolset/NWN mutation,
mutation test, sub-agent, xoreos source, or other GPL source was used.

## Offline implementation closure — 2026-08-28

The additive contract above is now implemented across the exact Area detail,
catalog, detached workspace, draft projection, compiler admission, ordinal
planner, paired GFF writer, candidate readback, and transactional publication
path. Retained editing activates only for one canonical unique sibling-free
Word vector whose table digest/count matches the complete authenticated
`feat.2da` catalog. Hidden, unresolved, stale, duplicate, unbound, or opaque
source state remains `PRESERVE_ONLY`. Assigned Toolset category-`4` rows cannot
be removed until the destructive spell-variant graph is implemented.

The frontend materializes only catalog-backed physical identities and never
uses fixed labels as write authority. A row-`40` membership transition updates
the retained HP draft through the same signed Aurora calculation and projects
the exact target feat flag into the coupled HP CAS. The backend independently
rechecks this relationship before writing.

Resource-safe verification passes backend and frontend source typechecks,
`46/46` focused backend FeatList/catalog/projector/planner/writer/compiler
assertions, `37/37` focused frontend domain/facade/HTTP/provenance/HP
assertions, and `13/13` capability-catalog assertions. Backend tests use the
repository `test:unit:bounded` one-worker isolated-module runner under the
unchanged 1 GiB heap ceiling. Two earlier invocations of the ordinary typed
unit runner exhausted that ceiling before assertions; this was a runner-choice
error, not a Docker or application-service failure, and no process remained.

Capability revision `2026-08-28.95` records the direct tests and retains
separate guarded browser, Toolset Save/Build/reopen, and NWN runtime blockers.
This offline closure does not promote Creature authoring or the overall Area
program to complete.

# Existing Area Creature `SpecAbilityList` mutation audit v1

Date: 2026-09-02  
Scope: retained `SpecAbilityList` on one exact type-`4` Area GIT Creature.  
Status: `OFFLINE_SOURCE_CLOSED_FOR_GUARDED_MUTATION`; implementation and live
proof remain pending.

## Decision

Aurora Web may implement retained Creature special-ability authoring as a
catalog-bound complete multiset compare-and-swap. Persisted identity is the
physical `spells.2da` row stored in exact `Spell : Word`; one persisted list
entry represents one use. The editor-facing target groups equal spell rows as
`uses`, preserves the admitted caster level, and expands the group back to
repeated type-`4` structs during serialization.

The v1 lane is intentionally narrower than every shape the native reader can
consume. A source is editable only when:

- exact `SpecAbilityList : List` is present once;
- every entry has struct type `4`, exact `Spell : Word`, exact
  `SpellFlags : Byte` equal to canonical value `1`, and exact
  `SpellCasterLevel : Byte`;
- every entry has no opaque sibling fields;
- every physical spell row resolves in one immutable effective `spells.2da`,
  has numeric `UserType` equal to `1` or `2`, and has an empty/`****`
  `Master` cell;
- duplicates of a row carry one identical canonical caster level and their
  count is at most `255`;
- type-`1` rows with at least one use have caster level `1..15`; type-`2` rows
  have caster level `0`.

Malformed, unbound, unknown, hidden, noncanonical, over-count, or otherwise
ambiguous storage remains preserve-only. This prevents the web writer from
silently applying the Toolset dialog's destructive grouping, flag
canonicalization, maximum-caster selection, or hidden-row dropping behavior.

The target is a complete catalog selection with unique physical spell rows,
`uses` in `0..255`, and type-constrained caster levels. Zero uses means the row
is omitted from GFF. The serializer emits selected groups in physical
`spells.2da` row order for deterministic cross-host output. Aurora's dialog
sorts its presentation/master model by localized name before reconstruction;
that locale-dependent order is not used as semantic identity by this contract.

This audit does not authorize general spell-list editing, class spell slots,
metamagic variants, spell legality, automatic class/package changes,
`ChallengeRating` recalculation, or arbitrary `SpellFlags` authoring.

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

The common Creature reader `FUN_00532174` opens exact `SpecAbilityList`,
iterates its structs, and reads:

- `Spell` with the Word reader;
- `SpellFlags` with the Byte reader, default `0`, then forces bit `0` on in
  runtime state; and
- `SpellCasterLevel` with the Byte reader, default `1`, then clamps values
  above `15` to `15`.

This path is at `decompiled_all.c:194797-194830`. The reciprocal common writer
`FUN_0053521c` always creates exact `SpecAbilityList`; each element is a
type-`4` struct containing exact `Spell : Word`, `SpellFlags : Byte`, and
`SpellCasterLevel : Byte` in that order at lines `195279-195287`. The placed
Creature wrappers delegate their GIT payload to this common lineage. Paired
GIC does not own the list.

The common reader is deliberately permissive. The v1 mutation source is not:
physical flags other than `1`, caster values above `15`, missing fields,
wrong-case/wrong-type labels, wrong struct IDs, and opaque siblings are
preserved but cannot grant write authority.

## Native special-ability catalog

`FUN_0046b3cc` loads exact `spells.2da` and finds exact columns `UserType` and
`Master` at lines `86804-86899`. It scans physical rows and admits a dialog
record only when numeric `UserType` is `1` or `2` and the numeric-read helper
returns `0` for `Master` at lines `86900-86910`.

`FUN_00af3a94` at lines `971501-971599` proves that return value `0` means an
invalid/out-of-range lookup or an empty/`****` cell; a materialized numeric
cell returns `1`. Because the column itself was resolved before scanning, the
dialog condition is the empty/`****` `Master` case, not numeric zero.

For each admitted row the dialog retains the physical row Word, resolves
`NAME` through the native localized-string path, retains `SpellDesc`, records
the `UserType`, initializes uses/caster level to zero, and appends the entry to
the master model. It then sorts that model with comparator `0x004437D8`.
Read-only x86 disassembly of the pinned executable proves that the comparator
loads the string object at row offset `+8` and delegates to
`FUN_0077a09c`, the same locale-dependent `CompareStringA` lineage used by the
feat dialog. The sort is presentation behavior; physical spell row remains
the only stable stored identity.

## Dialog grouping, edit coupling, and reconstruction

The frozen `TDLGCREATUREEDIT` form contains the special-ability grid, filter,
summary, and exact handlers. Its published Delphi method table maps:

| Handler | Code address |
| --- | --- |
| `cbSpecialAbilitiesFilterChange` | `0x0046C9B8` |
| `sgSpecialAbilitiesTableDrawCell` | `0x0046C9C0` |
| `sgSpecialAbilitiesTableGetEditMask` | `0x0046CC64` |
| `sgSpecialAbilitiesTableSelectCell` | `0x0046CCC0` |
| `sgSpecialAbilitiesTableSetEditText` | `0x0046CD74` |
| `sgSpecialAbilitiesTableExit` | `0x0046CDE8` |

`FUN_0046bf50` merges every retained GFF element into the catalog model by
exact spell-row Word. It increments the one-byte use count and retains the
maximum caster level among duplicates at lines `87124-87143`. A spell absent
from the admitted catalog is not carried into the model.

The grid enables editing only for uses and caster-level columns; caster level
is disabled for type `2`. `FUN_0046cde8` parses exact decimal integers. Caster
level is capped at `15`. Editing enforces these couplings:

- setting uses to zero also sets caster level to zero;
- setting a nonzero caster level while uses is zero raises uses to one;
- setting nonzero uses for a type-`1` row whose caster level is zero raises
  caster level to one; and
- type-`2` caster level is zero in the edited profile.

The native edit mask contains only decimal digits. The physical use counter is
one byte and native reconstruction repeats an entry that many times. Aurora
Web therefore rejects target counts above `255` instead of emulating byte
overflow.

`FUN_0046d220` / expanded body `FUN_0046d226` clears the old vector, walks the
sorted master model, repeats every row by its use count, clears the metamagic
byte, canonicalizes flags to `(flags & 1) | 1`, and appends the cloned
six-byte entry at lines `87824-87917`. Consequently a normal Toolset save can
drop hidden rows and siblings, merge duplicates, select the maximum caster
level, canonicalize flags, and reorder entries by localized label. The web
lane must require an already canonical source instead of doing those changes
implicitly.

## Pre-implementation Aurora Web boundary

The Area parser currently exports normalized presentation metadata
`specAbilityListEntries`. It uses aliases, forces flags bit `0`, clamps caster
level, loses exact list/field shape, and maps each physical duplicate as one
UI row. The Creature dialog shows a read-only table with a hard-coded summary.
New-Creature creation can already serialize a supplied special-ability list,
but that separate path is not retained-object write provenance.

No current Area Update mutation owns `SpecAbilityList`, no effective
`spells.2da` descriptor is attached to the retained object, and no catalog
endpoint binds UI choices to the module/ordered-HAK/vanilla source chain.
Retained controls must remain preserve-only until the additive contract below
is implemented.

## Required additive FE-BE contract

Area detail may add exact `creatureSpecialAbilityList` storage containing list
presence, native list identity, the complete physical entries and opaque
sibling counts, plus an optional immutable effective `spells.2da` descriptor.
The source descriptor includes resource name, source object key/layer,
SHA-256, byte size, and physical row count.

The authenticated catalog surface resolves one strongest whole
module/ordered-HAK/vanilla `spells.2da`; a stronger malformed resource blocks
weaker fallback. The table is bounded to 64 MiB and at most 65,536 physical
rows. A selectable row must have a usable localized `NAME`, exact numeric
`UserType` `1|2`, and empty/`****` `Master`. Results are bounded, paged, digest
bound, and keyed only by physical row.

The retained mutation carries the complete grouped expected and target
profiles plus `tableSha256` and `rowCount`. Profiles have unique row IDs,
canonical use/caster constraints, and must differ. Planning reparses the exact
Creature ordinal and performs full physical-shape, grouped-profile, and
descriptor compare-and-swap. Compilation re-resolves the same effective
table, validates every source and target row, reconstructs exact type-`4`
entries with flags `1`, preserves all unrelated GIT fields and paired
GIC/ARE/IFO bytes, and requires exact candidate and persisted readback before
atomic publication.

No endpoint body, streaming, or binary response is added. The catalog page is
at most 256 rows. Existing Area Update authorization, permission,
idempotency, optimistic concurrency, revision fencing, journal,
rollback/recovery, request limits, and transactional ARE/GIT/GIC/IFO
publication remain unchanged.

## Diagnostics and acceptance boundary

The low-cardinality event is `area_creature_special_ability_list_cas.v1`.
Allowed dimensions are contract revision, Creature family, bounded stage,
source-layer enum, changed-row-count bucket, outcome, and stable reason codes
such as `source_noncanonical`, `table_missing`, `table_stale`, `row_missing`,
`profile_invalid`, `profile_unchanged`, and `readback_mismatch`. Spell IDs,
uses, caster levels, names, localized text, object IDs/ordinals, hashes, paths,
storage keys, raw table/GFF data, credentials, and host paths are excluded from
routine logs and metric labels.

Offline acceptance requires tests-first coverage for strict storage parsing,
absent versus empty list, wrong case/type/struct, flags, caster constraints,
duplicate grouping, over-count rejection, hidden/unknown rows, opaque
siblings, effective-table precedence and staleness, detached frontend
provenance, catalog paging/filtering, complete-profile CAS, deterministic
physical-row serialization, exact candidate readback, no-op identity, paired
GIC/ARE/IFO identity, and transactional publication.

Fresh guarded browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed GIT readback, and NWN scripting/use behavior
remain independent release gates. This audit does not certify the full Area or
tile-rendering program.

## Resource/process statement

This audit used bounded reads of immutable decompilation exports, the frozen
RCDATA report, and read-only bytes/disassembly of the pinned executable. The
installed Toolset was not started or controlled. No Docker command, container,
service, watcher, browser, capture, Chrome, Toolset/NWN mutation, mutation
test, sub-agent, xoreos source, or other GPL source was used.

## Offline implementation checkpoint

Capability revision `2026-09-02.169` implements the additive contract above
for canonical retained `SpecAbilityList` sources. The backend now retains exact
list presence, type-`4` physical order, duplicate entries, flags, caster level,
and opaque-sibling counts; resolves one strongest whole effective
`spells.2da`; binds immutable provenance; exposes a digest-bound catalog; and
performs complete-profile projection, raw-GIT ordinal CAS planning, fresh
catalog admission, canonical repeated-entry writing, candidate readback, and
revision-fenced ARE/GIT/GIC/IFO publication.

The frontend now has a strict HTTP port/facade, detached source provenance,
complete paged catalog loading, fail-closed source admission, Toolset-compatible
use/caster coupling, saved-draft and history cloning, and an editable Special
Abilities tab. The target is materialized in physical catalog order and uses
only numeric `spells.2da` rows as persistence identity. Noncanonical source
flags/order/duplicates, opaque siblings, hidden or unlocalized rows, stale
tables, and unavailable catalogs remain preserve-only.

The affected backend group passes `172/172`, the focused controller delegation
passes `1/1`, the affected frontend group passes `223/223`, the capability
catalog passes `14/14`, and both production builds pass. The complete
controller file still has one unrelated stale health-payload expectation for
the prior VFX runtime revision; the special-ability endpoint assertion itself
passes.

Fresh guarded browser Apply/Save/reopen, exact-candidate Toolset
Save/Build/reopen with packed GIT readback, and NWN use behavior remain open
release gates. This checkpoint did not start Docker, a service, browser,
capture, Toolset, or NWN and does not certify the full Area/tile program.

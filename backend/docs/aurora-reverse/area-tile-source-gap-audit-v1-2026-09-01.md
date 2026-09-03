# Area tile source-gap audit v1 (2026-09-01)

## Verdict

The original 34-row `source_missing` audit set is not produced by an omitted
installed HAK, an omitted retail KEY/BIF layer, or a filename-based classifier.
They are exact references present in nine selected SET resources whose named
MDL resources are absent from both the owning source container and the complete
installed source corpus.

This closes the source-discovery question for that immutable 34-row set only.
The later authoritative
targeted pass-8 decompilation review found no MDL-availability gate in the
observed SET record or standalone candidate-selection paths and therefore
certified zero exclusions. It does **not** prove that any of the 34 rows is an
intentional palette placeholder, that Aurora suppresses the row, or that the
row may be excluded from renderer certification. Every row remains
fail-closed pending exact source repair or narrower accepted `toolset_native`
row-visibility evidence under the placeholder evidence profile contract.

The machine-readable record is
`backend/docs/aurora-reverse/evidence/area-tile-source-gap-audit-2026-09-01/manifest.json`.
That original source-gap manifest remains immutable because the pass-8
execution profile hash-binds it. The additive semantic result is recorded in
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass8-semantic-audit-v1-2026-09-01.md`.

## Exact source ownership

| SET | Missing MDLs | Exact owner | SET SHA-256 | Owner result |
| --- | ---: | --- | --- | --- |
| `atj02` | 3 | `lc_legacy_tiles.hak` | `3429b19f5154f663a0dc49928645ea2da88ec3e03d69232e8baee28aea8a06ee` | SET references all 3; owner contains none |
| `pld01` | 2 | `lc_legacy_tiles.hak` | `7698e883b631b85cc55d57187d5d59d029dabbfa7b662b97454fd162a59bb4b3` | SET references both; owner contains neither |
| `sdg01` | 1 | `sen-underdark.hak` | `cca7087319b1dd0f17fde838fa48b29ac32ed1b8b9d8901d13beea277619ac4a` | SET references it; owner does not contain it |
| `tcm02` | 1 | `nwn_base.key` / `tileset_tcm02.bif` | `df5e5dcc3bfddabcc8798eb2523ff57fb5504ae1350d4e840ee3c9904bf181c4` | SET references it; neither retail KEY contains it |
| `tcr10` | 13 | `lc_slms_city.hak` | `6cbcbdc584788a2fb3082b26926c59623aa11b054ea99aef52ae9db0301c2ba3` | SET references all 13; owner contains none |
| `tmd19a` | 3 | `tmd19a_deepcave.hak` | `96aff4b93a3a56540339e8dc90c95d61a64b2a27cb8394e009240267bbaee293` | SET references all 3; owner contains none |
| `trs02` | 1 | `nwn_base.key` / `tileset_trs02.bif` | `efeac55a7373466726d6a0c540f626df59d9d080961c71d60fdf0f2bfb3298a8` | SET references it; neither retail KEY contains it |
| `twl01` | 5 | `q_!tilesets.hak` | `09b5451c2028cd9579608a35cde9f7ea4a08eee5f98b30561d0440f4483dca82` | SET references all 5; owner contains none |
| `twl02` | 5 | `q_!tilesets.hak` | `df25cacddc7449620e129eb334cec72a7a7113baac9d879ee8380a19eeb3b961` | SET references all 5; owner contains none |

The owner mapping is binary-derived. The ERF/HAK reader now indexes arbitrary
resource types and reads requested payloads with V1.0/V1.1 key-size and table
bounds checks. The KEY reader now indexes arbitrary resource types and validates
the declared BIF path and BIF index. In particular:

- `twl01.set` and `twl02.set` occur in `q_!tilesets.hak` SHA-256
  `cf98fda19a62cdf4315e1a3ccc4e0ce67655b236c4bb572da75842b93da5b418`;
- neither SET occurs in `q_tilesets.hak` SHA-256
  `9ba5addfc0999d5c6788869f4da4b30505b7b6679570ced634c3e5abd9e745bd`;
- `tcm02.set` resolves through BIF index 9 to `data/tileset_tcm02.bif`;
- `trs02.set` resolves through BIF index 48 to `data/tileset_trs02.bif`.

## Independent distribution checks

The embedded `readme.txt` in the selected `q_!tilesets.hak` identifies the
container as Project Q v2.2. The official
[Project Q Archive](https://neverwintervault.org/project/nwn1/hakpak/combined/project-q-archive)
states that v2.2 requires patches 2.2.1, 2.2.2 and 2.2.3. Exact downloaded
copies of all three patches were inspected. They contain no `q_!tilesets.hak`
replacement and none of the ten missing Wild Lands/Winter Wild Lands MDLs.

The official
[Wild Woods and Wild Lands distribution](https://neverwintervault.org/project/nwn1/hakpak/tileset/wild-woods-v07-wild-lands-tilesets)
was also checked independently. Its `wildlands055.7z` and
`winterwildlands055.7z` archives reproduce the ten named references in their
SET files while the extracted HAK indexes contain none of the ten MDLs. The
source gap therefore predates or exists independently of the Project Q merge.

The Deep Caverns owner is also consistent with its public project being a
work-in-progress, but that description is contextual evidence only and is not
used to classify the three missing rows.

## Fail-closed consequence

No alias, sibling-model substitution, filename pattern, inferred padding rule,
or fabricated geometry is allowed. The 34 rows stay `source_missing`, remain
outside successful renderer coverage, and keep
`placeholder_evidence_profile_population_pending` active.

The next admissible closure is one of:

1. native Toolset evidence, bound to the exact Toolset binary and SET hashes,
   proving the row is not exposed/paintable and meets the settled capture
   contract; or
2. a validated Aurora decompilation lineage packet proving the corresponding
   row-selection/suppression semantic.

Until one of those exists and receives an independent hash-bound review, the
full 99-tileset certification gate remains blocked.

## Pass-8 decompilation follow-up

The validated targeted lineage separates the 34 rows into 13 SET group
members and 21 standalone tiles. The native group parser assigns a group
pointer to the 13 members; the loose retile selector admits only null-group
records, so those members are omitted from loose selection because they belong
to groups, not because their MDLs are missing. The 21 standalone rows,
including `trs02:763`, are topology candidates under the observed four-rotation
matching path, which contains no resource-existence predicate.

The blank `groupId` column in the historical unresolved-model CSV was a
producer defect, not row evidence. Capability revision `.158` now derives
membership from `GROUPS`/`GROUPn`; a read-only parse of all 99 selected SETs
reproduces the exact 13 grouped and 21 standalone rows.

All declared tile records are parsed and appended before that distinction, and
the later tile-instance path consumes the model-derived name and invokes model
resolution. The selected code therefore provides no positive intentional-
placeholder semantic. Pass 8 certified zero exclusions and does not authorize
population of a decompilation evidence envelope.

## Pass-9 conservative-scope follow-up

The 34-row manifest remains immutable historical evidence and is still valid
for those rows. It is no longer the complete current missing-source
denominator. The July producer had separately classified 8,660 rows as
`intentional_placeholder` without accepted native evidence. Pass 9 proved only
that the exact case-insensitive token `NULL` returns no model before lookup; it
did not prove palette hiding and did not generalize to `(null)`, `padding`, or
`tpad_*`. The parser therefore preserves those nonempty declarations and the
catalog has no concrete-name exception.

An explicit zero-exclusion regeneration over all 99 selected SETs now reports
45,034 `source_resolved`, 8,666 `source_missing`, zero
`intentional_placeholder`, and zero invalid declarations. Twenty-eight rows
previously hidden in the historical placeholder bucket resolve to the exact
installed `tpad_498.mdl`; the other historical exclusions join the conservative
missing-source set.

The structural audit reports 8,096 historical-placeholder rows with at least
one undeclared corner terrain, 564 with all corner terrains declared, and 41
non-placeholder rows that also have undeclared topology. This correlation does
not classify runtime visibility and certifies zero exclusions. The current
release blocker is therefore all 8,666 conservative missing-source rows, each
requiring an exact model source or accepted row-bound native evidence for a
typed nonrenderable disposition.

The pass-9 citations and bound artifacts are recorded in
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass9-semantic-audit-v1-2026-09-01.md`
and its semantic-audit manifest. The conservative topology record is
`backend/docs/aurora-reverse/evidence/area-tile-placeholder-topology-source-audit-2026-09-01/manifest.json`.

# Area tile placeholder decompilation pass-9 semantic audit v1

Successor state: capability revision `.160` created and verified the required
source-bound v13 runtime profile and replacement matrix. The semantic findings
and zero-exclusion verdict below are unchanged; current matrix status is
`0/3380` as recorded in
`docs/brainstorm/2026-09-01-area-tile-source-eligibility-producer-checkpoint.md`.

Date: 2026-09-01  
Status: authoritative static semantics recovered; identity-neutral parser and catalog repair implemented; positive placeholder exclusions remain uncertified

## Question

Pass 8 established that Aurora parses and appends every declared SET tile and
that loose topology selection does not test whether the declared MDL exists.
Pass 9 answers the narrower follow-up questions needed to remove the remaining
name-based behavior from Aurora Web:

1. how does Aurora map SET terrain and crosser names that are absent from their
   declared type tables;
2. which exact model token, if any, is treated as a native no-model sentinel;
3. does a failed/null model resolution produce a model instance; and
4. do the historical 8,660 `intentional_placeholder` rows form one native
   semantic class.

No xoreos or other GPL source was consulted.

## Authority and lineage

The exact `nwtoolset.exe` SHA-256 is
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`.
The immutable pass-9 profile SHA-256 is
`2d7502932b58112662ef82a874ab445a36801c0020ed46289c83fc2941dbabec`.
The lineage-v2 validator accepted the packet, all five selected functions
decompiled, and the validator reported no diagnostics. Exact hashes, line
bindings, the binary literal slice, the source audit, and the regenerated
inventory/catalog are recorded in
`evidence/area-tile-placeholder-decompilation-pass9-semantic-audit-2026-09-01/manifest.json`.

## Recovered native semantics

### Declared terrain and crosser lookup

`FUN_005e2084` initializes the terrain result to `0xffff`, iterates only the
declared terrain-type vector at object offset `+0x80`, and replaces the
sentinel only after an equality match. `FUN_005e1d6c` performs the analogous
operation over the declared crosser vector at `+0x84`.

Together with pass 8 `FUN_005e33e8`, this proves that a tile corner or edge
token absent from the corresponding declared table becomes native index
`0xffff` before topology comparison. It does **not** prove that every tile
containing `0xffff` is globally unreachable: a requested/imported topology may
also contain that sentinel, and direct Tile_ID use is a separate path.

### Exact model sentinel

The hash-bound executable bytes at virtual address `0x00cc8469` are
`4e 55 4c 4c 00`, or `NULL\0`. `FUN_00b8737c` is an equality comparison that
case-folds bytes and returns zero after equal strings reach their terminator.
`FUN_00a5de94` returns null before cache or resource lookup when its input is
null or compares equal to that literal. `FUN_00a546cc` returns no model
instance when the resolver returns null.

This proves native no-model resolver semantics for the exact case-insensitive
`NULL` token. It does not make `(null)`, `padding`, or `tpad_*` aliases of that
sentinel, and it does not prove that a SET tile using `NULL` is hidden from the
palette or impossible to select.

## Full source-corpus result

The deterministic structural audit covers 99 selected SET files and all
53,700 tile rows. The historical 8,660-row name-classified bucket partitions
as follows:

| structural class | rows |
| --- | ---: |
| all four corner terrains are declared | 564 |
| at least one corner terrain is undeclared | 8,096 |
| SET group members | 0 |
| standalone rows | 8,660 |

The correlation is not a native exclusion rule. The complete corpus also has
41 rows outside the historical placeholder bucket whose corner topology
contains an undeclared terrain: 14 historically `source_missing` and 27
historically `source_resolved`. Therefore an `undeclared terrain =>
placeholder` implementation would be both over-broad and identity-derived.

The old name bucket itself contains four materially different declarations:
one exact `NULL`, 563 `(null)`, 30 `padding`, and 8,066 `tpad_*`. Twenty-eight
of the `tpad_*` rows resolve to the installed `tpad_498.mdl`; they cannot be
discarded merely because of their name.

## Implemented correction

The production SET parser now preserves every nonempty opaque token. It no
longer turns `null` or `(null)` into absence in model, terrain, crosser, path,
or image-map fields. Invalid orientation text remains absent as a numeric
orientation and produces the existing diagnostic.

The catalog compiler now requires exact normalized equality between the SET
model declaration and the bound model-source inventory. The prior
`["(null)", "null"]` exception and its model-status-dependent branch were
removed. No concrete model identity selects parser or catalog behavior.

The inventory producer now requires an explicit exclusion mode:

- `evidence-profile` loads the existing independently reviewed, hash-bound
  positive exclusion profile;
- `none` admits zero exclusions and conservatively classifies each declared
  model only by installed source resolution.

This is fail-closed: a missing mode, a partial profile argument pair, an
unknown mode, or an unexpected profile in `none` mode aborts.

## Regenerated conservative inventory and catalog

The offline `none`-mode audit indexed the current snapshot, 298 installed HAK
archives, and `nwn_base.key` plus `nwn_retail.key`. It produced:

| result | rows |
| --- | ---: |
| selected tile rows | 53,700 |
| model source resolved | 45,034 |
| model source missing | 8,666 |
| evidence-certified intentional placeholders | 0 |
| invalid missing Model field | 0 |

The corrected catalog compiler then generated one valid v2 catalog with 99
tilesets, 53,700 tiles, 6,695 groups, and the same source-status totals. The
catalog SHA-256 is
`7bfc43a11f13fa1463f7dd0c1a7b4c3354fa57186eadd048ce225b3b0f489bd7`.

This catalog is an offline source candidate. It is not a runtime-build profile
and must not resume the stale capture checkpoint until a fresh exact runtime
build binding is created after source changes settle.

## Verdict

Pass 9 closes the parser/catalog knowledge gap and removes the forbidden
identity-specialized behavior. It certifies zero placeholder exclusions.

The current conservative blocker is now explicit: 8,666 declared model rows
do not resolve to an installed source. Of those, the 8,096-row undeclared
topology subset is a strong review target, not an exclusion. The 564 rows with
declared topology, including the exact `NULL` row and the `(null)` terrain
class, require row-bound native visibility/palette evidence or exact model
repair. A positive evidence profile still requires an independent reviewer
identity distinct from the semantic reviewer.

## Verification

- pass-9 lineage-v2 execution and validation: passed, 5/5 selected functions;
- `test-area-tileset-source-corpus.mjs`: passed;
- `test-area-tile-placeholder-topology-source-audit.mjs`: passed;
- `test-area-tile-placeholder-exclusion-config.mjs`: passed;
- `test-area-tile-placeholder-evidence-profile.mjs`: passed;
- `test-aurora-tile-add-connect-catalog-plan.mjs`: passed;
- bounded `aurora-set-tileset-parser.spec.ts`: 24/24 passed;
- `test:tiles:runtime-sweep-source`: 12/12 scripts passed;
- backend build: passed.

No Docker process, development server, browser, capture, Toolset UI session,
NWN session, mutation test, or subagent was started for this audit.

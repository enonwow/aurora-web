# Area tile placeholder decompilation pass-8 semantic audit v1

Date: 2026-09-01  
Status: authoritative targeted lineage reviewed; no exclusion certified

## Verdict

Pass 8 closes the current decompilation question negatively: the selected
Aurora Toolset paths do not prove that any of the 34 `source_missing` rows is
an intentional non-rendering placeholder. Zero rows may be added to the
placeholder evidence profile from this pass, and no renderer or inventory
behavior may change because of it.

The 34 rows divide into two native structural classes:

- 13 rows are referenced members of SET groups: three in `atj02`, five in
  `twl01`, and five in `twl02`;
- 21 rows are standalone tiles, including the structurally padding-named
  `trs02:763` row and 20 ordinary terrain/crosser rows.

Aurora uses group membership, not model-source availability, to separate those
classes. The observed selector excludes group members from the loose retile
candidate vector because they have a group pointer. It evaluates every
standalone tile by topology under four rotations and appends matching
candidates without an MDL-existence check. This distinction cannot be mapped
to a renderer exclusion: group members remain real group cells, while the 21
standalone records remain eligible for the observed candidate path.

The machine-readable negative audit is
`backend/docs/aurora-reverse/evidence/area-tile-placeholder-decompilation-pass8-semantic-audit-2026-09-01/manifest.json`.

## Lineage identity

The successful one-core, 1536-MiB pass is bound by profile SHA-256
`0ace0875c367b1e680f82c0ce4c8c7b758827fb8104964fb90cebed4104df0df`.
It used `nwtoolset.exe` SHA-256
`4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`,
Ghidra 12.1.3 distribution SHA-256
`93a5d11a9ad510622acaaf908c556a7b9b764d338e78a7567f3689bf5081fd54`,
and project archive SHA-256
`b21f5bc50eed79bf93c5198f3aeacc96acb7e94672c210d7eef19ad77ae1758d`.

The validator reports `lineageComplete=true`,
`authoritativeDecompilationClaim=true`, 22,560 discovered functions, 13
selected successful decompilations, 22,547 explicitly non-targeted failures,
82,351 call-graph edges, and no diagnostic. Its producer portable digest is
`ae677b2b02d3a5f20bd1b30f4bd099dfc35e55263ce903a83f2882590453973c`.
This is authoritative targeted lineage, not a complete-program decompilation.

## Recovered semantic chain

1. `FUN_005db04c` binds `DAT_00c39e0c` to the literal SET key `Model`
   (lines 107-108).
2. `FUN_005dfa50` reads that key for each tile and passes the value into the
   tile record (lines 81-86).
3. `FUN_005e3df4` allocates, initializes, parses, and appends each declared
   tile record with no MDL-existence predicate at that point (lines 328-336).
4. `FUN_005df18c` initializes tile offset `0xc4` to null (lines 68-75), and
   `FUN_005e17fc` writes the group pointer there when a group references the
   tile (lines 83-87). The field is group membership, not source availability.
5. `FUN_005e33e8` iterates only records with a null group pointer, derives
   topology, checks four rotations, and appends matches (lines 52-60 and
   120-160). The selected path contains no MDL availability or resource-source
   gate.
6. `FUN_005e38e4` randomly selects from the matched tile/orientation vectors
   (lines 9-21), and `FUN_005a67cc` consumes that result in Area generation
   before copying the model-derived name (lines 156-185).
7. `FUN_00712100` transfers the model-derived name into a tile instance
   (lines 21-35). `FUN_00712380` calls the model resolver and can return zero
   when resolution fails (lines 11-39). The observed caller in
   `FUN_0058f890` does not expose an explicit success-conditioned palette
   suppression branch before the following model use (lines 261-295).

The exact exported-C hashes and bounded citations are recorded in the JSON
manifest. The conclusion is deliberately narrower than a crash or UI claim:
the selected native paths provide no evidence that missing MDL rows are
intentional renderer exclusions.

## Row classification consequence

The current selected SET parser, SHA-256
`0a2e25640811d1010e9b90370121982f539e44e0fa266a915d30df247f3e366f`,
recomputed group membership from the same exact SET inputs. This corrects the
blank `groupId` cells in the historical unresolved-model CSV; those cells were
not native evidence that every row was standalone.

For the 13 group members, exclusion from `FUN_005e33e8` means only “not a loose
single-tile retile candidate.” It does not mean “do not render this group
cell.” For the other 21 rows, including `trs02:763`, the observed selector has
no source-availability guard. Model names, terrain name `padding`, image-map
names, and family naming patterns remain inadmissible behavior keys.

## Product decision

All 34 rows remain `source_missing` and `blocked`. The existing generic
disposition pipeline is unchanged:

- no alias or sibling-model substitution;
- no fabricated mesh or texture bridge;
- no conversion to `intentional_placeholder`;
- no positive decompilation evidence envelope or semantic-review request;
- no regeneration of the 99-tileset certification plan from this result.

The next admissible closure is either an exact source repair that supplies the
declared MDL under a hash-bound source lineage, or row-bound native Toolset
visibility/placement evidence proving a narrower behavior for an exact SET and
Toolset binary. A positive exclusion still requires the independent semantic
and profile review boundaries defined by the placeholder evidence contract.

No Docker command, service, browser, capture, Toolset/NWN session, mutation
test, sub-agent, xoreos source, or other GPL source was used for this audit.

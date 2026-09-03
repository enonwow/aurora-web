# Area tile source-eligibility producer checkpoint

Date: 2026-09-01  
Capability revision: `2026-09-02.161`

## Result

The Area tile source-inventory and runtime-contract sweep producers are now
asset-identity-neutral and fail closed. Neither script decides process,
blocked, or excluded behavior from a model ResRef, filename, tileset identity,
or naming pattern.

The runtime sweep consumes one exact
`aurora-tileset-definition-catalog/v2` plus its caller-supplied SHA-256. It
rehashes every definition shard and requires the live Area-editing SET
fingerprint, tileset membership, tile membership, and model declaration to
match the catalog before a request can be made. Its generic mapping is:

- `source_resolved` -> `process`;
- `source_missing` -> `blocked` with `TILE_MODEL_SOURCE_MISSING`;
- `invalid_missing_model_field` -> `blocked` with
  `TILE_MODEL_DECLARATION_INVALID`;
- `intentional_placeholder` -> `excluded`.

The previous three exact group-companion exceptions are removed. A legacy
runtime-sweep checkpoint without a source-catalog binding cannot be resumed;
the default successor output is
`runtime-contract-sweep-v19-source-catalog-bound`.

The upstream inventory producer now requires one explicit exclusion mode.
`evidence-profile` requires an immutable
`aurora-area-tile-placeholder-evidence-profile/v1`; every exclusion must be
bound to exact profile bytes, an exact SET SHA-256, `(tilesetResRef, Tile_ID)`,
the exact declared model value, one or more hash-verified repository evidence
artifacts, and an independently verified review. Every profile row must be
consumed exactly once by the selected SET corpus. `none` is the conservative
mode and admits no profile arguments and zero exclusions. Missing, partial,
unknown, or conflicting mode configuration fails before inventory output.

The evidence artifact is now a typed, row-bound envelope rather than an
arbitrary hash-addressed JSON file. Native authority requires an exact Toolset
binary identity, a settled proof contract with zero unexpected failed/bridge
tiles, and hash-bound nested artifacts. Decompilation authority requires a
lineage-v2 producer/independent-validator pair with matching portable digest;
each cited function address must be present as a successful record in the
packet-bound function ledger. Evidence and profile row references are checked
symmetrically.

Profile population is a two-phase deterministic CLI transaction. `draft`
admits only explicit row ids from already validated evidence and binds them to
the shared selected-SET corpus; `finalize` requires a separate review artifact
whose canonical subject digest covers every profile field except its own
pointer. The final output is self-validated before atomic publication and an
existing destination is never overwritten.

## Aurora-first audit

The legacy decompilation export did not close the placeholder semantic. The
later hash-bound pass-8 targeted lineage closed the row-selection hypothesis
negatively: it certified zero exclusions. Pass 9 then proved only the narrower
native resolver fact that the exact case-insensitive token `NULL` returns no
model before lookup. It did not prove palette hiding or unselectability, and it
did not establish that `(null)`, `padding`, or `tpad_*` share that semantic.
The recovered native chain parses and appends every declared SET tile, marks
group membership independently of model availability, and matches standalone
candidates by topology without an MDL-existence gate.

SET corpus structure strongly correlates with the historical classification,
but it is not native behavior proof. The historical July inventory's 8,660
`intentional_placeholder` rows therefore remain explicitly unproven legacy
input. They are not migrated into a new evidence profile. A conservative
regeneration now reports 45,034 `source_resolved`, 8,666 `source_missing`, zero
`intentional_placeholder`, and zero invalid model declarations across all
53,700 rows. The earlier separate 34-row bucket was only the remainder after
the unproven historical exclusions; it is not the current denominator.

## Verification

Offline verification completed without a runtime service:

- `npm.cmd run test:tiles:runtime-sweep-source`: twelve scripts passed;
- bounded capability-catalog verification passed `13/13`;
- the runtime catalog validator accepted the real exact catalog binding with
  99 tilesets and 53,700 rows;
- the agent-control dry run produced a v19 source-catalog-bound sweep plan;
- both changed audit scripts pass Node syntax checks;
- the backend production build passed;
- a production-source scan found no former naming classifier or exact group
  companion exception in either producer;
- the conservative full inventory reports `45,034 / 8,666 / 0` for
  resolved/missing/excluded rows, and the corrected catalog retains all 53,700
  declarations with the same disposition totals.

## Missing-source follow-up

The historical inventory's 34 `source_missing` declarations span nine
tilesets. A bounded exact ResRef scan of all 298 HAK archives currently present
in the user's NWN HAK directory found zero additional sources, so the prior
119-HAK inventory root was not the cause of these rows.

The missing set contains 13 multi-cell group members (three `atj02`, five
`twl01`, and five `twl02`), one structurally padding-like `trs02` row, and 20
ordinary terrain/crosser rows. Edit-distance neighbors exist for several
declarations, including symmetric `twl*` variants and the `mrv01` family, but
spelling similarity is not source or Aurora-semantic evidence. No alias or
sibling substitution was introduced.

The shared ERF/HAK model index is now bounds-checked and unit-tested, and the
inventory producer reuses it instead of retaining a duplicate parser.
The KEY index is likewise bounds-checked: it validates the KEY file/resource
tables, confines declared BIF paths to the exact game resource root, requires
the backing BIF file to exist, and rejects an out-of-range BIF resource id.
The real installed `nwn_base.key` resolves 32,832 unique MDL entries across 32
existing BIF files under that contract. This confirms that KEY/BIF omission is
not the cause of the historical 34-row missing set.

No Docker command, container, managed service, watcher, browser, Chrome,
capture, Toolset/NWN process, mutation test, sub-agent, xoreos source, or other
GPL source was used.

The mandatory `aurora-toolset-operate`, `aurora-toolset-author`, and
`aurora-toolset-prove` routing contracts were inspected before considering a
native palette run. They require a versioned proof profile and a touched
function manifest. The registry contains neither an AUR-S05-03 manifest nor a
profile authorizing mass placeholder/palette certification across 99
tilesets. The native lane is therefore correctly `proofCompleteness=missing`
and `modelVisibility=not_tested`; Toolset was not started with an ad-hoc
parameter combination.

## Remaining blocker

Identity-neutral producer code and conservative regeneration are complete,
but positive row disposition is not. The optional positive-exclusion lane
still has capability blocker `placeholder_evidence_profile_population_pending`.
Native Toolset or exact Toolset-decompilation evidence plus independent review
must populate a profile before any row can be excluded.

Passes 8 and 9 leave the independent blocker
`conservative_8666_source_missing_rows_unresolved`: all 8,666 conservative
missing-source rows require an exact model source, or accepted row-bound native
evidence for a typed non-renderable disposition. The topology audit identifies
8,096 historical-placeholder rows with at least one undeclared corner terrain
and 564 with fully declared corner terrain, but this is correlation only. It
certifies zero exclusions.

The other release blockers are unchanged: a fresh runtime-build identity and
live hash-profile recertification after the source changes, complete
99-tileset Add/Render and adjacency coverage, resolution or accepted typed
disposition of 8,666 declarations, and independent positive-cross and
negative-noncross PathConnect/WOK proof.

## Exact source-gap audit follow-up

Revision `.152` closes the remaining source-discovery ambiguity without
classifying any row as a placeholder. The ERF/HAK index now supports arbitrary
resource types and bounds-checked targeted payload reads for both V1.0 and
V1.1 archives. The KEY index now supports arbitrary resource types while
retaining its confined BIF-path and BIF-index checks.

All nine selected SETs were rebound to their exact owning HAK or retail BIF.
Every SET payload contains the reported missing model reference, while the
owner and the complete installed corpus contain no matching MDL. For the ten
Wild Lands rows, official standalone v0.5.5 archives independently reproduce
the same SET-to-missing-MDL contradiction, and the three official Project Q
2.2 patches do not supply those models.

The exact hashes, owners, model lists, downloaded archive hashes and
fail-closed verdict are recorded in
`backend/docs/aurora-reverse/area-tile-source-gap-audit-v1-2026-09-01.md`
and its JSON evidence manifest. This proves `sourceScannerOmission=false`; it
does not prove Aurora palette suppression. The native/decompilation evidence
and independent-review blocker therefore remains active.

## Resource-bounded decompilation follow-up

Revision `.153` prepares, but does not claim, the missing native semantic
proof. The previously accepted AUR-S05-03 Feature/Group transaction is now
registered in the central function-manifest registry and both its stage
validator and registry validator accept it. That historical proof covers
Feature/Group placement and rollback only; it does not certify suppression of
raw SET tile rows.

The exact current `nwtoolset.exe` and the existing Ghidra project archive are
hash-bound in
`backend/docs/aurora-reverse/proof-profiles/area-tile-placeholder-decompilation-pass1-2026-09-01.json`.
The project database metadata identifies the same PE SHA-256 and Ghidra 12.1,
but legacy exports remain `discovery_only` until a new independent lineage-v2
validator result is produced. The official Ghidra 12.1.3 archive was downloaded
to `.codex-tmp`, matched the official release SHA-256, and exposes the expected
headless launcher.

The Ghidra exporter now supports an attested targeted-address mode. It still
records all discovered functions and the complete in-program call graph, marks
non-target functions `decompiler_not_targeted`, and allows authoritative
lineage without a false complete-coverage claim. The independent validator
checks the exact selection-to-record relation. The pass-1 profile selects 15
SET/ARE discovery functions, caps Ghidra at one CPU and 1536 MiB, and requires
at least 8 GiB free physical plus 6 GiB free virtual memory before launch.

The first executable preflight validated every file/hash/profile field but
reported `blocked_resource_headroom` (about 3.96 GB free physical and 4.13 GB
free virtual at capture time). No Ghidra analysis, Toolset/NWN mutation,
Docker/service/browser process, or runtime behavior change was started. The
next safe step is to rerun the preflight when the workstation naturally has
enough headroom, then produce and independently validate the targeted lineage
packet.

## Profile-bound single-run follow-up

Revision `.154` removes the remaining manual execution ambiguity from that
next step. The pass-1 profile now hash-binds the one-shot runner, its planning
library, the profile validator library, the Ghidra project-archive restore
script, the lineage-v2 producer and validator, and their shared lineage
library. Its current SHA-256 is
`42b04c134dc9cb8c0da4f370728761ad48736b33d3f1f71e4f57b2f81e89485e`.

The runner validates every profile input and live memory threshold before it
creates the packet root. On admission it stages byte-verified immutable
copies, restores the `.gar` into a fresh project using the Ghidra 12.1.3
`RestoreTask` contract, writes a read-only/no-analysis analyzer configuration
and exact portable invocation record, and launches only one one-core,
1536-MiB headless process. It then runs the staged lineage producer and the
independent validator and requires all 15 selected functions to decompile.
Timeouts, interruption, or nonzero exit terminate the owned process tree and
write a stable fail-closed execution result; no retry is automatic.

The restore behavior was reimplemented from the official NSA Ghidra 12.1.3
Apache-2.0 source, including marker verification, safe-name checks, project
state exclusions, `.gpr` replacement, and fresh `.rep` creation. A focused
fixture test proves payload restoration and exclusion of archived marker and
project-property files.

The runner preflight for the current profile hash correctly stopped before
packet creation at `blocked_resource_headroom`; it observed `2,891,554,816`
free physical bytes and `3,054,100,480` free virtual bytes. Readback confirmed
that the packet root remained absent and no Ghidra Java process existed. This
checkpoint still proves execution safety only, not raw SET-row suppression
semantics.

## Semantic-admission follow-up

Revision `.155` closes the post-decompilation handoff ambiguity before native
output exists. `aurora_decompilation` evidence must now use
`aurora-area-tile-placeholder-evidence/v2`; the earlier v1 envelope is accepted
only for native Toolset proof and is rejected for decompilation.

Every decompilation finding binds a successful lineage function address, its
exact exported-C SHA-256, and a one-based nonempty citation of at most 64
lines. The loader rehashes the export and cross-checks the function record. A
separate hash-bound semantic review covers the complete certified-row vector,
lineage identities, citations, and findings. Its reviewer must differ from the
profile-level reviewer who later accepts the generated SET-row mapping.

Focused tests accept the exact reviewed v2 fixture and reject a legacy
decompilation v1 envelope, semantic-finding drift, and an address absent from
the successful lineage records. This is an evidence-safety implementation;
it certifies zero real rows while the Ghidra run remains resource-blocked.

## Deterministic semantic-evidence producer follow-up

Revision `.156` removes manual v2 envelope assembly. The new offline producer
implements `draft` and `finalize`. Draft consumes caller-hash-bound lineage,
validator, and typed proposal inputs, confines the packet to the evidence root,
validates the sorted row/function proposal against the actual successful
exports, and emits the canonical semantic-review subject hash. Finalize
requires the exact independent semantic review, writes a temporary envelope,
reloads it through the production validator, and atomically publishes only to
a previously absent path inside the evidence root.

The focused end-to-end fixture proves draft, semantic review, finalize, and
production readback, and rejects a review with a drifted subject hash. At
revision `.156`, the producer certified no real row because no admissible
native lineage output had yet been reviewed.

## Pass-8 semantic follow-up

Revision `.157` records the successful profile-bound pass 8 and its negative
semantic verdict. The exact profile SHA-256 is
`0ace0875c367b1e680f82c0ce4c8c7b758827fb8104964fb90cebed4104df0df`.
The independent lineage validator reports complete lineage, an authoritative
targeted decompilation claim, 13 selected successes, 82,351 call-graph edges,
and no diagnostic.

The SET parser recomputation classifies 13 of the 34 rows as group members and
21 as standalone tiles. Native offset `0xc4` is initialized to null and then
assigned the group pointer; it is not a model-source flag. The loose selector
tests only null-group records and topology under four rotations, then a
separate function randomly selects from the matching vector. No MDL-
availability predicate appears in that observed selection chain. The later
tile-instance path consumes the model-derived name and invokes model
resolution; it does not establish an intentional non-rendering placeholder
contract.

The exact hashes, bounded line citations, row sets, limitations, and zero-row
verdict are recorded in
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass8-semantic-audit-v1-2026-09-01.md`
and its JSON manifest. No positive evidence envelope or independent review was
fabricated, no inventory/profile was regenerated, and runtime behavior remains
unchanged.

## Source-corpus group-membership follow-up

Revision `.158` fixes a producer defect exposed by the pass-8 row partition.
The shared source-corpus library previously read a nonexistent per-tile
`Group` field, so its historical CSV output left all 34 missing-source
`groupId` cells blank even though 13 rows are referenced by real
`GROUPS`/`GROUPn` sections.

The parser now resolves the declared group count and physical group sections,
validates positive dimensions and every member reference, preserves Aurora
`-1` holes, retains repeated palette membership as ordered `groupIds`, and
projects the first membership as the compatibility `groupId`. Unknown members,
conflicting consumed fields, malformed dimensions, and duplicate consumed
sections still fail closed.

The producer consumes only `GENERAL`, `TILEn`, `GROUPS`, and `GROUPn` for this
contract. Repeated unconsumed sections cannot affect its result, and byte-equal
repeated consumed fields are admitted as deterministic redundant source. This
is required by the real selected corpus, which contains a repeated unconsumed
door section and one byte-equal repeated `Orientation=0`; conflicting repeats
remain rejected by tests.

The focused source-corpus test covers rectangular groups, `-1` holes, reused
members, a missing group-number hole, unknown members, ignored-section
duplicates, identical consumed duplicates, and conflicting duplicates. A
read-only run over all 99 selected tilesets succeeds and classifies the exact
34-row set as 13 group members plus 21 standalone tiles. No inventory was
regenerated because the independently reviewed placeholder profile is still
absent.

The exact producer/test hashes, ordered 99-SET identity digest, 53,700-tile
count, 6,695 groups, 260 preserved holes, 13,734 memberships, and 34-row
partition are recorded in
`backend/docs/aurora-reverse/evidence/area-tileset-source-corpus-group-membership-2026-09-01/manifest.json`.

## Pass-9 resolver and conservative-regeneration follow-up

Revision `.159` closes the concrete-name parser defect and establishes the
current fail-closed denominator. The targeted pass-9 Ghidra profile SHA-256 is
`2d7502932b58112662ef82a874ab445a36801c0020ed46289c83fc2941dbabec`.
Its independently validated lineage contains five selected successful
functions, 22,560 discovered functions, 82,351 call-graph edges, and no
diagnostic. The cited native paths prove that terrain and crosser lookup return
`0xffff` when no declared type matches, that model-name equality is
case-insensitive, and that exact `NULL` returns no model before lookup. This is
not proof that an exact `NULL` tile is absent from the palette, and it does not
generalize to `(null)`, `padding`, or `tpad_*`.

The production SET parser previously discarded normalized `null` and `(null)`
values. It now preserves every nonempty model and image-map token, including
the exact declarations, while orientation remains independently validated.
The catalog compiler now requires exact normalized SET declaration equality
and contains no concrete model-name exception. Focused parser tests pass
`24/24`, and the catalog-plan regression preserves an explicitly declared
`(null)` model.

The source-corpus parser now also validates terrain and crosser declarations
and each tile's four corner-terrain and four edge-crosser references. The
deterministic topology audit reports 8,096 historical-placeholder rows with at
least one undeclared corner terrain, 564 with all corner terrains declared,
and 41 non-placeholder rows that also contain undeclared topology. It therefore
records `structural_correlation_only` and zero certified exclusions; opaque
model-name changes do not alter that classification.

The explicit `none` exclusion mode regenerated a conservative inventory with
53,700 rows: 45,034 `source_resolved`, 8,666 `source_missing`, zero
`intentional_placeholder`, and zero invalid declarations. Its summary SHA-256
is `28d50c170a32697617672737ae3323259cbee373e235b88cf2e371e3cbc3aad2`.
The corrected catalog v2 SHA-256 is
`7bfc43a11f13fa1463f7dd0c1a7b4c3354fa57186eadd048ce225b3b0f489bd7`
and its definition-identity digest is
`31e59bc74af145dd539681322aee26abaf25329d1799cdbe10894ae66fb1f6d2`.
It retains all 99 tilesets, 53,700 tiles, and 6,695 groups with the same
45,034/8,666/0 dispositions.

The complete citations, artifact hashes, PE literal slice, limitations, and
zero-exclusion verdict are bound by
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass9-semantic-audit-v1-2026-09-01.md`
and
`backend/docs/aurora-reverse/evidence/area-tile-placeholder-decompilation-pass9-semantic-audit-2026-09-01/manifest.json`.
The topology evidence is recorded separately in
`backend/docs/aurora-reverse/evidence/area-tile-placeholder-topology-source-audit-2026-09-01/manifest.json`.

The source changed after the prior runtime-build binding, so the old v12/v19
capture state is stale and must not be resumed. A fresh build identity is
required before any new live proof. This checkpoint started no Docker command,
service, watcher, browser/Chrome capture, Toolset/NWN process, mutation test,
sub-agent, xoreos source, or other GPL source.

## Source-bound v13 matrix follow-up

Revision `.160` updates the capability denominator from the corrected catalog
and creates the fresh offline binding required by the preceding checkpoint.
The catalog planner reports 45,031 Add/Render rows, 44,692 connection rows,
8,669 named blocked rows, and 3,380 chunks. The three-row difference between
45,034 source-resolved definitions and 45,031 Add/Render rows is produced by
the generic plan contract, not by a model-name exception.

The new runtime-source digest is
`06a06931f2a916c604418cba5115b85c615fca4083c3cfdebc1cbe525e8e7934`
over 1,795 files and 30,566,360 bytes. Runtime-build profile v13 has SHA-256
`41b9eeb84f02fd9b52002ea3c5df8c24866d7163871ea61312b7e65e05993cdc`;
its source manifest SHA-256 is
`309449130864119ccf6743c4149bf300db5b378c5f3dbad22e0810260c58ea82`.
The first count-equivalent plan still cited `.codex-tmp` inventory paths and
was rejected as active durable provenance before any capture. Deterministic
regeneration under `output/proof` preserves the exact tiles-array SHA-256
`1624e8f94952bf83d34363a7fc76680f3b8aef861b434c27f8997ff07941b004`.
The durable summary SHA-256 is
`6aaaeee7ea448829853588350cc906eedb9465343ef7658ab8043f9d1f53e54d`
and the durable catalog SHA-256 is
`ac85696b9e025669818e9ee57e823054969d85d128d97cec75dbe334eb704ec9`.

The active replacement matrix plan id is
`7e760c1a088cde19f4b22ec4479bc55e8ce513dd0daf1a4720cd15d7e6d626b4`.
It replaces the no-capture transient plan id
`6c5396e97ef899ef30138139220c8c23a329ec7967764940fd87afe52af52bb2`,
which itself replaced v12 id
`7a3f8a0e8366411e5a6334c260089cf3c184840ade30e6568bbd136fb908c781`.

Offline status reports `validation=ready` and
`runtimeSourceIdentity=verified`; the active-plan binding test passes with
checkpoint `0/3380`. No capture was started. The capability catalog removes
the obsolete 34-row blocker and now carries exact incomplete-coverage blockers
for 45,031 render rows, 44,692 connection rows, and the separate 8,666
conservative missing-source rows. Both production builds pass for the bound
source state.

The active artifacts are
`backend/docs/aurora-reverse/proof-profiles/tile-add-connect-runtime-build-v13-source-bound-2026-09-01.json`,
its adjacent source manifest,
`backend/docs/aurora-reverse/proof-profiles/tile-add-connect-active-plan.json`,
`output/proof/area-tile-source-inventory-v1-conservative-2026-09-01`,
`output/proof/area-tileset-definition-catalog-v2-conservative-2026-09-01`,
and
`output/proof/tile-add-connect-matrix-v13-durable-catalog-2026-09-01`.
Any later write under the runtime identity roots invalidates this binding and
requires a new immutable replacement. No Docker command, service, watcher,
browser/Chrome capture, Toolset/NWN process, mutation test, sub-agent, xoreos
source, or other GPL source was used.

## Deterministic remediation queue and source-bound v14 follow-up

Revision `.161` adds a deterministic remediation queue for every conservative
missing-source row. Its immutable artifact is
`output/proof/area-tile-source-remediation-queue-v1-2026-09-02.json`, with
SHA-256
`f03a339353c04ae63b0016acaf88cdbcea9861c9e6d661df1a907eda7a65b9bc`
and queue-identity SHA-256
`25cf24f4de9ec99610c7fc883738bbfb65086dadd4a954d15b84aac42d5f9b33`.

The queue covers 99 tilesets and 53,700 rows. It retains all 8,666 missing-
source rows as blocked, groups them into 467 unique opaque missing-model
identities across 39 affected tilesets, and records 13 grouped plus 8,653
standalone rows. For this exact current missing-source subject, 584 rows have
all corner terrains declared and 8,082 contain an undeclared corner terrain;
all 8,666 use only declared edge crossers. This is separate from the earlier
historical-placeholder topology audit's 8,096/564 subject. Neither result is
permission to exclude a row.

The closure contract admits only an exact model source or accepted row-bound
native nonrenderable evidence. It rejects alias/sibling substitution and does
not classify behavior from opaque model names. The new test verifies ordering,
inventory membership, model mismatch rejection, name invariance, CLI hashes,
and immutable output. The bounded source chain now passes all 13 scripts, and
the capability catalog passes `13/13`.

The source changes required a replacement build binding. Profile v14 binds
1,798 files and 30,590,387 bytes to digest
`eeb44fe8876a3a6a34d0307f0ad77511c743d2d41c724f90d5da798e045f330d`.
Its profile SHA-256 is
`25d52f6cf3a95252fda5ae0a1bbfdbe830e9071c7fe28f039722baf7b56cdb98`
and source-manifest SHA-256 is
`812167b009537fb55fd691e4126559fd3c3b44898b93bec56f8f13020a9fed54`.
The active plan id is
`ac93afd6bec7aae959becaf38c3d88f93157bdb171c414229d2908378d17487a`
in
`output/proof/tile-add-connect-matrix-v14-source-remediation-bound-2026-09-02`.
It explicitly replaces v13 id
`7e760c1a088cde19f4b22ec4479bc55e8ce513dd0daf1a4720cd15d7e6d626b4`.
Status is `ready`, source identity is `verified`, and no capture has advanced
the `0/3380` checkpoint.

One canonical read-only runtime preflight returned
`DOCKER_ENGINE_UNAVAILABLE`, retained historical fatal dependency
`DOCKER_INFERENCE_ENDPOINT_FATAL`, and kept dependency fingerprint
`9ab12020bca69585ebb959f7960ff464acbe37d63249bf65529e750ebee5f538`.
Ports 3000/5173 and proof locks were clear. The preflight was not retried;
Docker Desktop was not started, restarted, or stopped. No service, watcher,
browser/Chrome capture, Toolset/NWN process, mutation test, sub-agent, xoreos
source, or other GPL source was used.

## Source-bound v16 follow-up after Waypoint `TemplateResRef`

Capability revision `2026-09-02.162` changes runtime sources for the retained
Waypoint TemplateResRef CAS without changing tile catalog or remediation-
queue semantics. The intermediate v15 binding became historical after closing
the Description-only Waypoint aggregator defect. Active profile v16 binds
1,801 files and 30,610,969 bytes to digest
`9cc94415bd619d2c40d18f556da540389291987aa566dc623aa7c4f69afa7d39`.
Its profile SHA-256 is
`48aee8acdf610f6b9915c694a2cab9ad220f08e7d658219ab4121cb619cb15c3`
and source-manifest SHA-256 is
`07e06258e08d3ea8bda6d92b2d531cc42a06ca63be2f6d93074dd07bde14b3d3`.

The active replacement plan id is
`bbfc10446dcdf4bb9719bc6889d1c4241e9f8032a7636939b0a0d11acc99d68d`
under
`output/proof/tile-add-connect-matrix-v16-waypoint-aggregate-green-2026-09-02`.
It explicitly replaces intermediate v15 id
`29b68224adda16458d9db7e52d466ced6ae822b757fb484451cfec73dcb9d9e3`.
Status is `ready`, current source identity is `verified`, and the checkpoint
remains `0/3380`; no capture was performed. The 99-tileset, 53,700-row,
45,031 Add/Render, 44,692 connection, 9,100 group, 8,666 missing-source, and
467 unique missing-model counts are unchanged.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Source-bound v17 follow-up after Placeable matrix classification

Capability revision `2026-09-02.163` changes only runtime capability metadata
and does not change tile catalog, remediation-queue, renderer, or PathConnect
semantics. The source write makes v16 historical. Active profile v17 binds
1,801 files and 30,614,016 bytes to digest
`a304d5b6764346127fc21d3aabed9426a4ab7a1fa5d7eb60c5bc5b221025f357`.
Its profile SHA-256 is
`1634333a01be3d8a162bf07b9b6c2c87409652e3e30068827c280dfcca399c35`
and source-manifest SHA-256 is
`0898aae6079d565c258f69f6099498c89e878bd6f87c9d70d38bbbcf836d8e24`.

The active replacement plan id is
`179e27a1b9411ff989503c83c3a239b243f0e6ae7add9fbfe4d5d9b9e8365add`
under
`output/proof/tile-add-connect-matrix-v17-placeable-matrix-classified-2026-09-02`.
It explicitly replaces v16 id
`bbfc10446dcdf4bb9719bc6889d1c4241e9f8032a7636939b0a0d11acc99d68d`.
Status is `ready`, current runtime-source identity is `verified`, and the
checkpoint remains `0/3380`; no capture was performed. The same 99 tilesets,
53,700 total rows, 45,031 Add/Render rows, 44,692 connection rows, 9,100 group
rows, 8,666 missing-source rows, and 467 unique missing-model identities remain
in force.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Source-bound v18 follow-up after Item matrix classification

Capability revision `2026-09-02.164` changes only runtime capability metadata
and does not change tile catalog, remediation-queue, renderer, or PathConnect
semantics. The source write makes v17 historical. Active profile v18 binds
1,801 files and 30,614,116 bytes to digest
`2d857a0d8c83974653c98eb07198c26d6cd54c4723d718eca41993e1479aeebb`.
Its profile SHA-256 is
`f4e70bd9b0fbe00c8e6c21b36ffdb3f2fc8ee33fdbe20c35eeefa17dcdbe6ee4`
and source-manifest SHA-256 is
`d14b6873cb05e3bfd6a165c266aeea83591db68bf7a1db2e5cb6b5caace82e4b`.

The active replacement plan id is
`84d1ac84dd19144e1aa9e7b16b3a39a5a2ade55b050c79c1ae968f259efee630`
under
`output/proof/tile-add-connect-matrix-v18-item-matrix-classified-2026-09-02`.
It explicitly replaces v17 id
`179e27a1b9411ff989503c83c3a239b243f0e6ae7add9fbfe4d5d9b9e8365add`.
Status is `ready`, current runtime-source identity is `verified`, and the
checkpoint remains `0/3380`; no capture was performed. The same 99 tilesets,
53,700 total rows, 45,031 Add/Render rows, 44,692 connection rows, and 9,100
group rows remain in force.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Source-bound v19 follow-up after Creature Description closure

Capability revision `2026-09-02.165` and the additive Creature Description
contracts change runtime sources without changing tile catalog,
remediation-queue, renderer, or PathConnect semantics. The source writes make
v18 historical. Active profile v19 binds 1,801 files and 30,619,249 bytes to
runtime digest
`c3624c07b75038b26cd8f66123287127231a744f1cfa113c50fafa1fd2fce72c`.
Its profile SHA-256 is
`4ea2a3cf73eebe40b68984f1141f241c67b6cb8ba016fcecc834ee44bcedd9ee`
and source-manifest SHA-256 is
`124738bf135c2d4ca511b8b1cb38ff7d751b59196cbf3556bc26ffa862a114a5`.

The active replacement plan id is
`b7e2c52aa4f2ee5241ff402462e1fae3ca13b28787f75d006305a394573176e9`
under
`output/proof/tile-add-connect-matrix-v19-creature-description-bound-2026-09-02`.
It explicitly replaces v18 id
`84d1ac84dd19144e1aa9e7b16b3a39a5a2ade55b050c79c1ae968f259efee630`.
Status is `ready`, runtime-source identity is `verified`, and the checkpoint
remains `0/3380`; no capture was performed. The plan retains 99 tilesets,
53,700 rows, 45,031 Add/Render rows, 44,692 connection rows, 9,100 group rows,
8,669 named-blocked rows, and 9,008 total blocked rows.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Source-bound v20 follow-up after Creature appearance-color closure

Capability revision `2026-09-02.166` and the additive, presence-sensitive
Creature appearance-color contracts change runtime sources without changing
the tile catalog, remediation queue, renderer, or PathConnect semantics. The
source writes make v19 historical. Active profile v20 binds 1,804 files and
30,648,580 bytes to runtime digest
`5f15f9b1626902aff949627626b5a06d775b5625eb86941395317670187dba86`.
Its profile SHA-256 is
`a0edb688da0e66d29962dd2c465da029814192812ca6e9f5049892782d6594da`,
source-manifest SHA-256 is
`641402252b1096e8c741dd9a206267628653df2e0c21188e0e4435ffc92bb7bb`,
and binding SHA-256 is
`223033008144c07f983c8adc88377bd9c35bfdf4ac27416e396c9e294d884ce1`.

The active replacement plan id is
`51bf3ba6cbdf4f41f316f7f1a171e56ae00c810710378835d8c655e627466698`
under
`output/proof/tile-add-connect-matrix-v20-creature-colors-bound-2026-09-02`.
It explicitly replaces v19 id
`b7e2c52aa4f2ee5241ff402462e1fae3ca13b28787f75d006305a394573176e9`.
Status is `ready`, runtime-source identity is `verified`, and the checkpoint
remains `0/3380`; no capture was performed. The plan retains 99 tilesets,
53,700 rows, 45,031 Add/Render rows, 44,692 connection rows, 9,100 group rows,
8,669 named-blocked rows, and 9,008 total blocked rows. The active-plan
control test passes.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Source-bound v21 follow-up after Creature body-part/head closure

Capability revision `2026-09-02.167` and the additive Creature compatibility
storage contracts change runtime sources without changing the tile catalog,
remediation queue, renderer, or PathConnect semantics. The source writes make
v20 historical. Active profile v21, built at
`2026-09-02T09:09:58.371Z`, binds 1,807 files and 30,699,427 bytes to runtime
digest `1dc941848220dd7f2422cd4a498cd4eb6c2a001c01e329cc7bb55ca9a5af1751`.
Its profile SHA-256 is
`20d5128c2856c6c800d84fe4e22cfefd982f24c7caea4bc52c49a316313a222e`,
source-manifest SHA-256 is
`e32f2f63e31849ea84f8782a00de29f88c785769d31b9b9c9988ff23d29669b5`,
and binding SHA-256 is
`5f9defe4bc4ad950d7e8e85f1e941fc262553d8da4d445369437a6e75e49a63a`.

The active replacement plan id is
`872937ea0a16792475b1e06617e9c4ca2774b01223a755fa932e61844e20f4d5`
under
`output/proof/tile-add-connect-matrix-v21-creature-body-parts-bound-2026-09-02`.
It explicitly replaces v20 id
`51bf3ba6cbdf4f41f316f7f1a171e56ae00c810710378835d8c655e627466698`.
Status is `ready`, runtime-source identity is `verified`, and the checkpoint
remains `0/3380`; no capture was performed. The plan retains 99 tilesets,
53,700 rows, 45,031 Add/Render rows, 44,692 connection rows, 9,100 group rows,
8,669 named-blocked rows, and 9,008 total blocked rows.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

## Source-bound v23 follow-up after Creature Wings/Tail closure

Capability revision `2026-09-02.168` and the additive Creature appendage
contracts change runtime sources without changing the tile catalog,
remediation queue, renderer, or PathConnect semantics. The first v22 profile
was generated before the final capability-revision write and is therefore
historical. Active immutable v23, built at `2026-09-02T10:43:14.612Z`, binds
1,813 files and 30,798,093 bytes to runtime digest
`6138b516b501ea4df8933de5004a06678c60e69880d9f47d87fb1cdbd1f46c27`.
Its profile SHA-256 is
`6f210a9f6ce5090e1836c9ed1a47132a7c67368981a735ebb6b158e916cc7b73`,
source-manifest SHA-256 is
`0035a93f32f6567ae0b7788302a62400e7b5359671cd4fa880e57067648676b2`,
and binding SHA-256 is
`8e342dc9e974de973edceb4e75014001ee272e7ee5c91197ee0a1d70dfe15e00`.

The active replacement plan id is
`0e16f6931f3c113d7474a159437d288e0da87ef0a245d27fa162543ca0cff608`
under
`output/proof/tile-add-connect-matrix-v23-creature-appendages-bound-2026-09-02`.
It explicitly replaces intermediate v22 id
`b3fa5a382051c06604eaab06606ac408d15aca9938d81f81edb86b24967d5c25`.
Status is `ready`, current runtime-source identity is `verified`, and the
checkpoint remains `0/3380`; no capture was performed. The plan retains 99
tilesets, 53,700 total rows, 45,031 Add/Render rows, 44,692 connection rows,
9,100 group rows, 8,669 named-blocked rows, and 9,008 total blocked rows.

No Docker command, service, watcher, browser/Chrome capture, Toolset/NWN
process, mutation test, sub-agent, xoreos source, or other GPL source was used.

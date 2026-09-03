# Area tile placeholder evidence-profile contract v1

Date: 2026-09-01  
Status: implementation contract; passes 8 and 9 certified zero exclusions

## Aurora-first verdict

The earlier legacy decompilation export contained no `tpad_*`, palette-padding,
or equivalent placeholder semantic. The later hash-bound pass-8 targeted
lineage recovered the relevant SET record, group-membership, loose retile
selection, random candidate, and tile-model resolution paths. It shows that
all declared tile records are parsed and appended, group membership rather
than MDL availability removes 13 historically missing rows from loose
selection, and the other 21 historically missing rows remain eligible for
topology matching without an MDL-existence gate. Pass 9 proves the narrower
model-resolver rule that exact case-insensitive `NULL` returns no model before
lookup. It does not prove palette suppression or extend that rule to `(null)`,
`padding`, or `tpad_*`. Both passes therefore certify zero exclusions.

The detailed negative findings are recorded in
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass8-semantic-audit-v1-2026-09-01.md`
and
`backend/docs/aurora-reverse/area-tile-placeholder-decompilation-pass9-semantic-audit-v1-2026-09-01.md`.
Structural correlation and asset naming remain insufficient to declare a tile
non-rendering.

The inventory producer must use an explicit exclusion mode. Positive
exclusions require an immutable evidence profile naming every excluded row;
the conservative `none` mode supplies no profile and excludes zero rows. It
must not infer exclusion from `Model`, terrain, crosser, group, image-map,
tileset, or filename spelling.

## Profile schema

`aurora-area-tile-placeholder-evidence-profile/v1` contains:

- a stable profile id and canonical generation timestamp;
- one verified independent review identity and timestamp;
- one or more `toolset_native` or `aurora_decompilation` evidence artifacts,
  each repository-local and bound to exact bytes by SHA-256;
- one row per certified exclusion, keyed by `(tilesetResRef, Tile_ID)` and
  bound to the exact SET SHA-256, exact declared model value, stable
  `intentional_placeholder` status, and at least one evidence id.

The profile itself is supplied with a caller-owned expected SHA-256. Duplicate
rows/evidence ids, unknown evidence references, artifact/path/hash drift,
unsupported authority, review gaps, or noncanonical identities fail closed.

Each referenced artifact must use the typed envelope admitted for its
authority: `aurora-area-tile-placeholder-evidence/v1` for `toolset_native`, and
`aurora-area-tile-placeholder-evidence/v2` for `aurora_decompilation`. The
envelope repeats the exact evidence id and authority kind, carries a `verified`
verdict, and names every certified profile row. Evidence-to-row bindings must
be symmetric; an envelope cannot certify a row that does not cite it, and a row
cannot cite an envelope that does not certify it. An arbitrary JSON file with a
positive verdict is not evidence. A decompilation v1 envelope is deliberately
rejected because it lacks the semantic-review and exact-line citation contract.

For `toolset_native`, the envelope must bind an exact Toolset binary SHA-256,
a nonempty proof-contract version, a settled verified state with zero
unexpected failed or bridge tiles, and at least one nested proof artifact.
Every nested artifact is restricted to the evidence root and rehashed before
admission.

For `aurora_decompilation`, the envelope must bind an exact binary SHA-256 and
packet root, a hash-verified raw `aurora-decompilation-lineage/v2` producer
packet, and its hash-verified independent
`aurora-decompilation-lineage-validation/v2` result. The validator must name
the exact producer packet, report complete authoritative lineage with no
diagnostics, and reproduce the producer portable digest. Every cited function
address must also occur as a successful decompilation record in the
packet-bound function-record file. Each binding repeats the exact function
output SHA-256 and cites a one-based, nonempty range of at most 64 lines. The
loader rehashes the actual packet export, verifies the function-record output
identity, and rejects out-of-range or empty citations. A legacy v1 export, an
unvalidated packet, a decompilation evidence-v1 envelope, or a free-standing
function-address assertion cannot populate the profile.

Every decompilation envelope also binds an independent
`aurora-area-tile-placeholder-decompilation-semantic-review/v1` artifact. Its
canonical subject digest covers the evidence id, the complete ordered
certified-row vector, exact lineage identities, and every normalized function
binding except the review pointer. The semantic review requires a canonical
timestamp, a nonempty reviewer and notes, `verified` status, and
`independentReview=true`. Its reviewer must differ from the later profile-level
reviewer. Changing a finding, citation, row, function output, lineage packet,
or validator result invalidates the semantic review even if the outer evidence
and profile hashes are recomputed.

The independent review is a separate hash-bound
`aurora-area-tile-placeholder-evidence-profile-review/v1` artifact. It binds
the profile id and a canonical SHA-256 of every profile field except the review
pointer itself. It requires a canonical timestamp, nonempty reviewer and
notes, `verified` status, and `independentReview=true`. Changing a row, SET
hash, model declaration, evidence reference, or artifact binding after review
invalidates profile loading even when the outer profile SHA is recomputed.
For decompilation evidence this is a second review boundary: one reviewer
accepts the cited native semantic finding, and another accepts its exact
mapping into the generated exclusion profile.

## Deterministic population workflow

`create-area-tile-placeholder-decompilation-evidence.mjs` owns the
decompilation-specific envelope transaction:

1. `draft` consumes caller-hash-bound lineage packet, validator result, and a
   typed proposal. It confines the packet to the evidence root, requires sorted
   unique row and function vectors, validates every citation through the
   production authority-subject validator, and emits the canonical semantic
   review subject hash.
2. `finalize` consumes the exact draft and separately hash-bound semantic
   review. It rejects subject or row drift, writes a temporary v2 envelope,
   validates it through the production evidence loader, and only then renames
   it to a previously absent output inside the evidence root.

The proposal selects proof scope only. It does not cause runtime behavior and
does not bypass the later selected-SET corpus binding or profile-level review.

`create-area-tile-placeholder-evidence-profile.mjs` exposes two offline-only
phases:

1. `draft` consumes a caller-hash-bound
   `aurora-area-tile-placeholder-evidence-index/v1`, validates every typed
   evidence envelope, and uses only its explicit `certifiedRowIds` to select
   rows. It resolves those ids against the current selected SET corpus and
   derives exact SET SHA/model bindings. It never infers eligibility from a
   ResRef, filename, terrain, crosser, group, or image-map value.
2. `finalize` consumes the exact draft and a separately hash-bound independent
   review artifact. It verifies the subject digest, writes through a temporary
   file, reloads the complete profile with the production validator, and only
   then atomically publishes the final profile. Existing output paths are
   rejected.

The selected SET corpus parser is shared by this generator and the inventory
producer. It consumes only `GENERAL`, `TILEn`, `GROUPS`, and `GROUPn`; repeated
unconsumed sections cannot alter this contract. It fails closed on duplicate
consumed sections, conflicting duplicate consumed fields, duplicate tile ids,
malformed roots/groups, or source-priority drift between the two phases.
Byte-equal repeated consumed fields are deterministic redundant source and do
not create a value ambiguity.

## Inventory mapping

In explicit `evidence-profile` mode, for an exact selected SET row:

1. a matching evidence row produces `intentional_placeholder`;
2. otherwise a resolved model source produces `source_resolved`;
3. otherwise a nonempty declaration produces `source_missing`;
4. an empty declaration produces `invalid_missing_model_field`.

Every profile row must be consumed exactly once by the selected SET corpus.
This prevents stale evidence from silently surviving a catalog or resource
priority change. Model names remain opaque data and never choose behavior.

In explicit `none` mode, no profile arguments are accepted and step 1 cannot
occur: a resolved model source is `source_resolved`, every nonempty unresolved
declaration is `source_missing`, and an empty declaration is
`invalid_missing_model_field`. Missing, partial, unknown, or conflicting mode
configuration fails closed before output.

## Current blocker and acceptance

No accepted positive profile is populated yet. The existing July inventory
and catalogs remain historical inputs with an explicitly unproven placeholder
producer. Passes 8 and 9 are negative audits and must not be converted into a
positive v2 evidence envelope: they certified no row and have no independent
positive semantic review. Positive-exclusion regeneration remains blocked
until new exact native Toolset/decompilation evidence and independent review
cover any claimed exclusions.

Conservative regeneration is complete in `none` mode. Across the exact 99-SET
corpus it reports 45,034 `source_resolved`, 8,666 `source_missing`, zero
`intentional_placeholder`, and zero invalid declarations. The 8,666 rows
require exact source repair or accepted row-bound native evidence for a typed
non-renderable disposition; they cannot be hidden by populating the historical
placeholder profile. The topology partition of 8,096 rows with at least one
undeclared corner terrain and 564 with fully declared terrain is structural
correlation only and certifies zero exclusions.

This contract uses no xoreos or other GPL source.

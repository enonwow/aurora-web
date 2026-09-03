# Area authoring implementation checkpoint 01

Date: 2026-08-07
Status: implementation in progress; not a release or native-parity claim

## Outcome of this checkpoint

This checkpoint implements the first fail-closed foundation for Area lifecycle
CRUD and tile certification. It deliberately does not mark Area Create, full
CRUD, tile connectivity, Toolset acceptance, or NWN runtime acceptance as
complete.

Implemented:

1. Dense `Tile_List` validation at the ARE writer boundary. Sparse,
   out-of-bounds, non-integral, or duplicate cells are rejected before GFF
   serialization.
2. Native packed-resource GFF types for Area dimensions and tile scalar fields:
   `Width`, `Height`, `Tile_ID`, `Tile_Orientation`, and `Tile_Height` serialize
   as `INT`.
3. Preserve-first light/animation bytes. Omitted values on existing tiles are
   copied from the source tile struct; genuinely new profile tiles use light
   defaults 0 and the narrow AUR-S05-05 animation-loop default 1.
4. Canonical blank-Area companion resources:
   - GIT uses the ground-item root label `List`, all nine object-family lists,
     AreaProperties struct type 100, and the exact narrow AUR-S05-05 audio
     defaults;
   - GIC contains all nine empty object-family comment lanes.
5. An independent ARE/GIT/GIC structural validator. It reparses emitted bytes
   independently of the writer and reports deterministic coded diagnostics.
6. `persistNewArea` now validates the complete candidate before reading,
   patching, or writing `module.ifo` and before writing any ARE/GIT/GIC object.
   An invalid candidate returns `AREA_CREATE_CANDIDATE_INVALID` (422). The
   current incomplete six-root-field new ARE is therefore blocked without any
   storage mutation.
7. The persistence endpoint has an explicit method-level `scene.edit`
   permission in addition to the existing role gate.
8. A versioned Area/tile certification ledger model with independent evidence
   dimensions for inventory, asset closure, render, visual seam, SET adjacency,
   PathReference, PathConnect, WOK seam, persistence, Toolset, and NWN runtime.
   PathReference is never promoted to PathConnect.
9. A frontend lifecycle port/facade boundary for local draft list/open/save/
   delete and privileged create/update/delete materialization, including
   revisions, idempotency keys, typed failures, and proof metadata.
10. A pure frontend tile-release policy. Production render, connected, and
    traversable claims require their own complete evidence sets; excluded rows
    remain non-selectable and failed/missing evidence remains visible.
11. A non-destructive tile-matrix reconciliation command. The real dry run
    classified `mst04-group-chunk-0002` as
    `interrupted_capture_retryable`, retained checkpoint 87/87 with
    `countDelta: 0`, confirmed both recorded processes dead, and preserved the
    three partial artifacts. No recovery record was persisted and no capture
    was resumed in this checkpoint.

## Native/offline evidence added

Read-only inspection of
`C:/Users/enonw/Documents/Neverwinter Nights/modules/s05e0717.mod` at SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`
confirmed across Areas `area`, `area001`, and `demo`:

- `Width`, `Height`, `Tile_ID`, `Tile_Orientation`, and `Tile_Height` are GFF
  `INT` fields;
- `Version` is GFF `DWORD`;
- the inspected first tile has `Tile_AnimLoop1` byte value 1;
- GIT/GIC use the canonical nine object-family lanes and GIT AreaProperties is
  struct type 100.

This resolves the serialized-type ambiguity only. It is not live Toolset or
NWN proof.

## Verification results

Passing gates:

- focused backend Area suites: 6 suites, 51 tests passed;
- focused frontend Area suites: 3 files, 41 tests passed, including typed
  propagation of backend validation diagnostics;
- frontend lifecycle facade mutation run: 40/40 mutants killed;
- frontend tile certification mutation run: 114/114 mutants killed;
- tile-agent recovery tests: PASS;
- backend production build: PASS;
- frontend production build: PASS.

Known-red broad baselines, preserved without waiver:

- backend full unit: 138 suites passed, 9 failed; 1,405 tests passed, 7 failed
  (1,412 total). Failures include pre-existing runtime/bootstrap fixture and
  expanded Area object-count mismatches outside this slice;
- frontend full unit: 187 files passed, 8 failed; 1,829 tests passed, 111
  failed (1,940 total). Failures are concentrated in existing VFX/render,
  scene coordinate, mapper, and facade baseline changes;
- frontend regression smoke: 9 files failed; 19 tests passed and 58 failed,
  including the existing zero-object/absent fixture state.

## Current fail-closed boundary

Application-generated new ARE bytes still lack the complete verified 43-field
native creation profile. Consequently, production module materialization is
intentionally blocked by the independent validator. This is the correct state
until exact profile values and their immutable evidence lineage are recovered.
Passing the local topology verifier or being able to parse the application's
own output is not sufficient.

The current compensating multi-object write path also does not yet meet the
target transaction design: it lacks a module-scoped lock, `If-Match` revision
gate, durable idempotency record, write-ahead journal/quarantine, and an atomic
batch or resource-first staged commit. These remain release blockers even
after the ARE profile is recovered.

## Next implementation order

1. Recover and bind one exact immutable AUR-S05-05 creation profile: all ARE
   root labels/types/values, per-tile defaults, GIT/GIC values, IFO entry shape,
   binary hashes, reproducible reverse manifest, and source artifact hashes.
2. Implement a versioned profile registry and deterministic ARE compiler that
   accepts only the certified tileset/dimension combination. The current
   validator must accept its emitted triplet with zero errors.
3. Introduce the additive `area-create-command.v1` HTTP contract with explicit
   `creationProfileId`, profile fingerprint, module ID/revision, distinct name/
   ResRef/tag, `Idempotency-Key`, and `If-Match`.
4. Replace compensation-only persistence with module-scoped locking, revision
   checks, durable idempotency, staging/journal recovery, resource-first commit,
   independent semantic readback, and module quarantine on incomplete recovery.
5. Implement and wire concrete frontend lifecycle adapters/composition and
   migrate `AuroraAreaEditingPanel` away from direct HTTP-adapter imports. Keep
   local Save separate from privileged module materialization.
6. Implement revision-safe local draft CRUD, followed by production Update and
   reference-aware Delete on the same transaction boundary.
7. Reconcile and resume the exact matrix chunk with a new attempt ID, complete
   add/render/group coverage, and keep visual seam, SET adjacency, PathConnect,
   WOK seam, Toolset, and NWN evidence as independent rows.
8. Only after an exact app candidate passes structural validation, run the
   central Toolset open/Save/Build/packed-readback and NWN proof workflow and
   attach the fresh immutable artifacts to its certification row.

## Non-claims

This checkpoint does not claim:

- a persistable application-generated Area;
- complete Area CRUD;
- a native New Area wizard clone;
- arbitrary tileset or dimension support;
- correct PathConnect, WOK joining, or traversability;
- complete 99-tileset rendering coverage;
- Toolset Save/Build acceptance;
- NWN runtime load acceptance.

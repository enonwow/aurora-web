# Area Update validation contract v1

Date: 2026-08-12  
Status: active additive contract; validation only  
Scope: one existing production Area copied into an owner-scoped draft

## Outcome and boundary

`area-update-validation.v1` binds one immutable draft revision to one current
module snapshot and compiles the complete ARE/GIT/GIC replacement candidate
plus the preserved IFO candidate without publishing it. It is the pre-mutation
half of privileged Area Update materialization and uses the same read-only
compiler as the later fenced transaction.

This contract does not write ARE, GIT, GIC, IFO, a module head, or a draft. A
successful receipt is evidence, not permission to bypass the later module
lock, `If-Match`, idempotency, staged validation, atomic publication, readback,
or compensation gates.

## Aurora-first evidence

The admitted v1 slice changes only existing ARE topology fields already covered
by the preserve-first writer and native Toolset evidence:

- `evidence/stage5-live-2026-07-16/s05-01-single-tile/` proves isolated tile
  mutation, Save, reopen, and exact rollback;
- `evidence/stage5-live-2026-07-16/s05-04-tile-properties/` proves exact
  editable tile-field mutation and byte-stable rollback of unrelated state;
- `aurora-gff-area-editing-writer.spec.ts` proves dense-grid validation,
  source-coordinate preservation, unknown root/tile-field preservation, and
  parse/serialize/parse readback.

The admitted retained-object deletions/transforms and exact base-UTW waypoint
and base-UTS sound construction are governed by their dedicated Aurora audits and by
`area-update-materialization-contract-v1-2026-08-12.md`. In particular, a new
waypoint requires profile `nwn-base-key-utw-v1`, ResRef `nw_waypoint001`, and
SHA-256
`13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a`.
A new sound requires profile `nwn-base-key-uts-animalcriesday-v1`, ResRef
`animalcriesday`, and SHA-256
`a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4`.

A new placeable requires profile `nwn-base-key-utp-plc-watertrough-v1`,
ResRef `plc_watertrough`, native instance tag `WaterTrough`, and SHA-256
`a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531`.
Validation resolves the exact type-2044 UTP bytes and compiles the paired
type-`9` GIT/GIC candidate without publication.
Validation resolves and verifies every referenced blueprint from configured
`nwn_base.key` before it can succeed. The shared addition budget is 1024 and
mixed-family provenance is aggregated per exact profile/template/hash tuple.

No xoreos source or semantic claim is used. Scripts, unadmitted Area/object
properties, arbitrary blueprint bytes, HAK/module/custom blueprint sources,
and IFO membership changes remain outside this validation profile.

## Endpoint

`POST /api/v1/modules/{moduleId}/areas/{areaResRef}/update-validations`

Required authorization:

- authenticated actor;
- role `admin`;
- permission `area.materialize.update`;
- the path module must identify the current configured workspace snapshot.

The strict JSON body is:

```json
{
  "schemaVersion": "area-update-validation.v1",
  "moduleId": "workspace-module-id",
  "areaResRef": "crypt01",
  "expectedModuleRevision": "sha256-or-opaque-revision",
  "draft": {
    "id": "draft_01",
    "revision": 7,
    "normalizedSha256": "64-lowercase-hex"
  },
  "clientCommandId": "client-command-01"
}
```

Unknown fields are rejected at every object boundary. Path and body module IDs
and Area ResRefs must match. ResRefs and SHA-256 values normalize to lowercase;
opaque IDs and revisions are preserved exactly. The command hash is lowercase
SHA-256 of canonical UTF-8 JSON with recursively sorted object keys.

## Draft projection

The server loads exactly `draft.id` at `draft.revision` for the authenticated
owner and requires its stored `normalizedSha256` to match the command. The
draft must:

1. have `source.type=production_area` and identify the path Area;
2. contain `production-area-draft-payload.v1` with unchanged source provenance;
3. contain an `editableScene.auroraAreaEditing.state` payload;
4. bind `areaResRef`, `tilesetResRef`, SET fingerprint, source ARE fingerprint,
   width, height, and a complete dense row-major tile grid;
5. keep source row/column provenance paired and in range;
6. contain only admitted byte, orientation, height, and coordinate values.

The server converts this state to the existing Area editing writer contract,
captures the current manifest, reads and hash-verifies ARE/GIT/GIC/IFO,
re-resolves the current SET source, and verifies all retained fingerprints.
It then applies admitted paired GIT/GIC object mutations, including resolving
and validating any admitted immutable blueprint source, preserves unsupported
GFF fields, compiles all candidates, and independently parses/readbacks the
emitted structures before returning success. The validation path performs no
repository write, publication, draft mutation, or idempotency reservation.

## Success receipt

Success is `200` and includes:

- `schemaVersion=area-update-validation-receipt.v1`;
- validation ID, command hash, module ID and current module revision;
- Area ResRef and current source ARE SHA-256;
- exact draft ID, revision, and normalized SHA-256;
- SET fingerprint and validator version;
- the backward-compatible `candidateAre` filename, resource type, size, and
  SHA-256;
- exactly three binary-free `candidateResources` summaries for ARE/GIT/GIC;
- a binary-free preserved `candidateModuleIfo` summary;
- either unchanged-companion evidence or the bounded object mutation summary,
  including additions and immutable blueprint provenance;
- `createdAt` and a five-minute `expiresAt`.

The response carries the current module revision as a strong `ETag` and uses
`Cache-Control: no-store`.

## Errors

Stable v1 codes are:

- `AREA_UPDATE_INVALID` (`422`) for schema, path/body, or draft projection
  failures;
- `AREA_UPDATE_PERMISSION_DENIED` (`401` or `403`);
- `AREA_UPDATE_DRAFT_NOT_FOUND` (`404`);
- `AREA_UPDATE_DRAFT_REVISION_CONFLICT` (`412`);
- `AREA_UPDATE_MODULE_REVISION_CONFLICT` (`412`);
- `AREA_UPDATE_SOURCE_MISSING` (`404`);
- `AREA_UPDATE_SOURCE_STALE` (`409`);
- `AREA_UPDATE_TILESET_STALE` (`409`);
- `AREA_UPDATE_COMPANION_MISSING` (`409`);
- `AREA_UPDATE_COMPANION_MISMATCH` (`409`);
- `AREA_UPDATE_OBJECT_MUTATION_INVALID` (`422`);
- `AREA_UPDATE_CANDIDATE_INVALID` (`422`);
- `AREA_UPDATE_STORAGE_UNAVAILABLE` (`503`).

Every error uses the common v1 envelope and bounded `path/reason` details.
Raw paths, source bytes, tokens, and unbounded candidate content are never
returned.

## Budgets, versioning, and observability

The request budget is 4 KiB because it carries identities only. The receipt is
bounded to 8 KiB. Binary bytes remain server-side. Pagination, streaming, and
chunking do not apply to this single-candidate validation response; a future
batch API requires a new additive schema. Breaking changes require API v2.

Validation emits bounded Area pipeline stages for snapshot, draft, SET and
blueprint-source resolution, strict parsing, paired object mutation,
determinism checking, and candidate validation. High-cardinality IDs and
hashes belong only in local structured events/traces, never metric labels.
Publication metrics are forbidden because this endpoint performs no
publication.

## Exit gate

This contract slice is complete only when strict command, draft projection,
authorization, stale revision/fingerprint, companion/blueprint resolution,
paired GIT/GIC mutation, writer preservation, independent readback,
binary-free receipt, controller, and authenticated HTTP tests pass. It does
not satisfy Update materialization acceptance until the atomic commit and
native Save/Build/reopen proof are separately verified.

## Addendum: production tile admission (2026-08-21)

After exact draft compilation and independent candidate readback, validation
evaluates every distinct Tile_ID in the complete projected Area against the
configured immutable certification report. Success includes the exact
`area-tile-production-admission.v1` binding. Missing/excluded rows or missing/
failed inventory, asset-closure, or render proof return the stable 422 codes;
an unavailable or invalid report returns the stable 503 codes. No validation
receipt is produced on failure. The complete rule, provenance fields, bounded
diagnostics, and independent proof boundaries are frozen in
`area-tile-server-materialization-admission-contract-v1-2026-08-21.md`.

# Area Delete materialization contract v1

Date: 2026-08-12  
Status: Frozen implementation contract; native product certification pending

## Scope and evidence boundary

This contract defines fail-closed deletion of one existing Area from one
explicitly editable module snapshot. It removes exactly one ARE/GIT/GIC
triplet and exactly one `Mod_Area_list` membership entry. Content-addressed
objects are not physically erased; the successor manifest makes them
unreachable and a separate proved garbage collector may reclaim them later.

The admitted IFO facts are backed by local Aurora evidence: the native module
reads and writes `Mod_Entry_Area`, and the established module validation
contract requires the entry Area to remain a member with resolvable ARE/GIT
resources. Existing GIT evidence admits `LinkedTo` and the preserved transition
field surface. V1 therefore scans those facts conservatively and blocks an
unproved delete. It does not invent transition repair semantics and does not
use xoreos as runtime authority.

## HTTP boundary

Both routes require role `admin` and permission `area.materialize.delete`.

1. `POST /api/v1/modules/{moduleId}/areas/{areaResRef}/delete-previews`
   performs a read-only impact scan against one strong `If-Match` revision.
2. `DELETE /api/v1/modules/{moduleId}/areas/{areaResRef}` performs the
   privileged materialization. It requires `Idempotency-Key`, repeats the
   complete preview under the module fencing lease, and never trusts a client
   preview as mutation authority.

Viewer, builder, DM, missing, and unmapped roles are denied. Path and body
module/Area identities must match after lowercase ResRef normalization.

## Preview command and result

The strict `area-delete-preview-command.v1` request contains `schemaVersion`,
`moduleId`, `areaResRef`, `expectedModuleRevision`, and `clientCommandId` for
bounded correlation only.

The server reads the exact captured manifest and requires one case-insensitive
descriptor each for `<area>.are`, `<area>.git`, `<area>.gic`, and `module.ifo`.
It verifies descriptor/content hashes, parses the IFO, and requires exactly one
matching `Mod_Area_list` entry. The impact scan checks:

- `Mod_Entry_Area`;
- exact target matches in known `LinkedTo`, `TransitionDestin`, and
  `TransitionDestination` fields across retained GIT resources;
- exact target tokens in retained script source resources;
- compiled or otherwise uninspectable script resources that prevent a complete
  static proof;
- duplicate/missing target membership, malformed scanned GFF, resource
  collisions, and scan truncation.

The scan is capped at 256 findings and 50,000 manifest objects. Reaching a cap
adds blocking `AREA_DELETE_REFERENCE_SCAN_TRUNCATED`; it never turns an
incomplete scan into approval. Findings contain stable code, severity,
resource key, bounded field path, and bounded reason. Raw bytes and host paths
are excluded.

Success returns `area-delete-preview.v1` with target descriptors and hashes,
membership count, entry-Area status, deterministic finding order, blocker and
warning counts, scan policy/version, module revision, `previewSha256`, and a
five-minute expiry. The hash covers canonical preview facts but not expiry.
A preview with blockers is evidence but cannot be materialized.

## Delete command

The strict `area-delete-command.v1` request contains `schemaVersion`,
`moduleId`, `areaResRef`, `expectedModuleRevision`, `preview: { sha256 }`,
`confirmation: { areaResRef, policy: "block_on_references" }`, and
`clientCommandId`.

The confirmation ResRef must equal the target exactly. V1 has no force,
cascade, entry-Area replacement, script waiver, or reference-repair mode.
Those actions require separately reviewed additive contracts and native proof.
Unknown fields are rejected. ResRefs and SHA-256 values normalize to lowercase;
opaque correlation IDs are preserved. The command hash is SHA-256 of canonical
UTF-8 JSON with recursively sorted keys.

## Transaction and preservation boundary

The server performs these phases in order:

1. validate command, idempotency key, confirmation, and `If-Match`;
2. resolve an operation-scoped idempotency result or authorize;
3. acquire the shared per-module lifecycle fencing lease;
4. repeat idempotency, revision, and quarantine checks under the lease;
5. re-read resources, IFO, and the complete impact preview;
6. reject stale preview, blockers, collisions, entry Area, or membership count
   other than one;
7. rebuild IFO preserve-first with exactly the target membership removed;
8. create a durable `area_delete` journal with byte-free manifests;
9. stage a successor manifest omitting only target ARE/GIT/GIC and replacing
   only `module.ifo`; content objects remain immutable;
10. publish by one compare-and-set of the module head;
11. prove triplet/membership absence, candidate IFO bytes/hash, survivor
    descriptor equality, and new revision by independent readback;
12. atomically retain the verified receipt and idempotency result.

Any failure after journaling restores and independently verifies the baseline
head. Unproved restoration quarantines the module. An interrupted Delete
journal blocks Create, Update, and Delete until exact recovery completes or
quarantines it.

## Success receipt and stable errors

Success is `200 area-delete-receipt.v1`, not `204`, because the client needs
immutable audit evidence. It contains transaction/command/preview hashes,
module and Area identity, previous/new revisions, removed descriptors,
baseline/candidate IFO hashes, scan summary/version,
`readbackStatus=verified`, bounded warnings, and deletion time. The response
carries a strong successor ETag, `Cache-Control: no-store`, and
`Idempotency-Status: created|replayed`.

Stable errors are `AREA_DELETE_INVALID` (`422`),
`AREA_DELETE_PERMISSION_DENIED` (`401|403`),
`AREA_DELETE_IDEMPOTENCY_CONFLICT` (`409`),
`AREA_DELETE_MODULE_REVISION_CONFLICT` (`412`),
`AREA_DELETE_PREVIEW_STALE` (`412`), `AREA_DELETE_SOURCE_MISSING` (`404`),
`AREA_DELETE_RESOURCE_COLLISION` (`409`),
`AREA_DELETE_MEMBERSHIP_INVALID` (`409`),
`AREA_DELETE_ENTRY_AREA_BLOCKED` (`409`),
`AREA_DELETE_REFERENCES_BLOCKED` (`409`),
`AREA_DELETE_SCAN_INCOMPLETE` (`409`),
`AREA_DELETE_READBACK_FAILED` (`500`),
`AREA_DELETE_TRANSACTION_FAILED` (`500`),
`AREA_DELETE_ROLLBACK_FAILED` (`500`), and
`AREA_DELETE_STORAGE_UNAVAILABLE` (`503`).

## Budgets, diagnostics, and exit gate

Requests are capped at 4 KiB. Preview and receipt responses are capped at
64 KiB and 24 KiB. Binary data stays server-side. Pagination or streaming
cannot bypass the truncation blocker. Breaking changes require API v2.

Structured events cover preview, authorization, lease, locked rescan, blocker
classification, IFO rewrite, journal, staging, publication, readback,
compensation, quarantine, completion, and replay. Module, Area, transaction,
revision, preview, and finding-code context is retained in bounded traces; raw
paths, bytes, script text, and high-cardinality values are never metric labels.

The slice exits only after strict contract, authorization, preview determinism,
reference blockers, IFO preservation, manifest removal, idempotency, shared
locking, durable recovery, compensation/quarantine, HTTP, integration, E2E,
determinism, mutation, and regression tests pass. Product-level Delete remains
uncertified until the exact committed candidate passes fresh Toolset
Save/Build/reopen and NWN runtime proof.

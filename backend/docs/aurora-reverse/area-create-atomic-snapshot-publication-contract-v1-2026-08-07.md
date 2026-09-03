# Area Create atomic snapshot publication contract v1

Status: implementation contract; no Aurora runtime semantic is asserted here.

## Purpose

Area Create must expose either the exact baseline module snapshot or one complete
successor containing ARE, GIT, GIC, and the matching IFO update. Sequential
writes to live object keys cannot provide that invariant. Publication therefore
uses immutable content-addressed objects and one database compare-and-set of the
module snapshot head.

## Data model

### Immutable content objects

Every resource body is stored under a SHA-256-derived internal key:

`__aurora/cas/sha256/<first-two-hex>/<lowercase-sha256>`

Writing an existing key is allowed only when byte length and SHA-256 match.
Content objects are never overwritten or deleted by an Area transaction.
Unreachable objects are reclaimed only by a separate mark-and-sweep process
that proves no retained manifest references them.

### Module snapshot manifest

Schema `aurora-module-snapshot-manifest.v1` contains:

- exact `moduleId`;
- nullable parent revision;
- a complete, sorted list of logical module objects;
- for each object: canonical logical key, resource type, byte size, lowercase
  SHA-256, and deterministic content key;
- its lowercase revision SHA-256.

The revision is the SHA-256 of canonical JSON containing only schema version,
module identity, parent revision, and sorted object descriptors. It excludes
timestamps, transaction IDs, actors, leases, and storage ETags, so identical
baseline plus identical changes produces the same successor revision.

Logical keys are relative POSIX paths. They are 1..512 UTF-8 bytes, contain no
leading slash, backslash, control character, Windows-invalid `:*?"<>|`
character, empty segment, `.` or `..` segment, or reserved `__aurora` segment.
Comparison and collision checks are
case-insensitive while the admitted display spelling is retained.

The initial manifest budget is 50,000 objects and 32 MiB canonical JSON. A
successor must replace exactly one `module.ifo` plus the declared Area resource
set and preserve every unrelated descriptor byte-for-byte at manifest level.

### Staging descriptor

The deterministic stage key is:

`__aurora/transactions/area-create/<transaction-id>.v1.json`

It binds transaction/module identity, base and successor head identities,
candidate logical keys and hashes, manifest key/hash, lease ID, fencing token,
and creation time. The descriptor contains no resource bytes. Rewriting it is
idempotent only for byte-identical canonical content.

### `module_snapshot_heads`

One database row per module stores current revision, manifest key/hash,
quarantine state, and timestamps. Head publication locks both this row and the
Area Create module-lock row in one database transaction and succeeds only when:

1. lease ID, owner transaction, fencing token, and unexpired lease match;
2. current head revision equals the stage base revision;
3. stage and successor manifest identities match;
4. the module is not quarantined.

The single row update is the visibility boundary. Readers resolve all module
objects through one captured head and never list mutable live keys.

## Operation mapping

The existing transaction coordinator maps onto snapshot publication as follows:

1. `stage`: write/verify immutable candidate content, successor manifest, and
   staging descriptor. Nothing becomes visible.
2. `commitResources`: independently verify the three staged Area content
   objects and their manifest descriptors. Nothing becomes visible.
3. `commitModuleIfo`: verify staged IFO and atomically CAS the head from base to
   successor. ARE/GIT/GIC/IFO become visible together.
4. `readBack`: capture the successor head, read the manifest and all four
   content objects by hash, reparse them through the independent validator,
   and report the successor revision.
5. `compensate`: before publication, prove the head is still baseline. After
   publication, CAS successor back to the retained baseline head under the
   exact recovery lease, then independently read it back.
6. `quarantine`: atomically mark the head quarantined under the exact lease;
   reads remain attributable, while every mutation is denied.

## Crash and stale-writer behavior

- Crash before head CAS: baseline remains visible; recovery verifies baseline.
- Crash during head CAS: the database exposes either base or successor, never a
  partial head.
- Crash after head CAS: recovery sees successor and either finishes verified
  finalization or rolls the head back to baseline.
- A stale writer can write only immutable orphan candidates. Its head CAS fails
  on fencing and cannot overwrite live content or a newer head.
- A missing/corrupt stage, manifest, content object, or head relation blocks
  publication and requires compensation or quarantine.

## Bootstrap and reader migration

Existing mutable snapshots require an audited one-time bootstrap that inventories
every live object, writes immutable content, builds a full manifest, verifies
byte equality, and creates the initial head with compare-and-set. All Area,
Tile, Catalog, Sound, and resource readers must then resolve a captured head.
No production mutation endpoint may be enabled while any applicable reader
bypasses the committed head.

## Required tests

1. canonical manifest determinism and case-insensitive collision rejection;
2. traversal, reserved-key, control-character, UTF-8 budget, size, count, hash,
   and content-key validation;
3. immutable put idempotency/conflict;
4. stage idempotency/conflict and byte-free persistence;
5. head CAS success, stale revision, stale fence, expired lease, quarantine,
   and already-published replay;
6. visibility remains baseline through every pre-CAS failure;
7. one-step visibility of all four resources after CAS;
8. independent byte/hash/manifest/semantic readback;
9. process-death recovery before, during, and after publication;
10. exact compensation, failed compensation quarantine, reader head capture,
    and bootstrap parity.

## Addendum: production tile admission and durable provenance (2026-08-21)

The existing native creation-profile materialization gate remains independent.
After candidate compilation and independent ARE/GIT/GIC/IFO validation, but
before `journal.begin`, Create additionally evaluates every distinct Tile_ID
in the complete command grid against the configured immutable certification
report. A blocked or unavailable decision publishes and journals nothing and
releases the lease. Success retains the exact
`area-tile-production-admission.v1` binding in validation, the byte-free
candidate manifest, and the verified materialization receipt. Memory and MySQL
control stores reject readback when any binding field differs. The complete
rule, stable errors, provenance fields, and independent native/connectivity
proof boundaries are frozen in
`area-tile-server-materialization-admission-contract-v1-2026-08-21.md`.

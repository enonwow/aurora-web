# Tile Add/Render Matrix Runtime-Build Identity Contract v1

## Purpose

This contract makes every Add/Render matrix verdict reproducible against one
exact frontend build and one exact backend build. It is mandatory for matrix
contract revision `path-node-aware-v8` and later compatible revisions.

It complements, and does not weaken, the settled-render, exact-chunk,
independent-visual-review, asset-closure, PathConnect, WOK, Toolset, and NWN
proof requirements.

## Versioned profile

Each new matrix plan requires one immutable JSON file with schema:

`aurora-tile-add-connect-runtime-build-profile/v1`

The profile contains exactly:

```json
{
  "schema": "aurora-tile-add-connect-runtime-build-profile/v1",
  "profileId": "area-tiles-99-source-bound-v8-<build-token>",
  "createdAt": "2026-08-21T00:00:00.000Z",
  "frontend": {
    "commit": "<non-empty immutable build token>",
    "imageDigest": "sha256:<64 lowercase hex>",
    "builtAt": "<UTC ISO-8601>",
    "baseUrl": "http://127.0.0.1:5173"
  },
  "backend": {
    "commit": "<non-empty immutable build token>",
    "imageDigest": "sha256:<64 lowercase hex>",
    "builtAt": "<UTC ISO-8601>",
    "baseUrl": "http://127.0.0.1:3000",
    "contractVersion": "1.0.0",
    "vfxRuntimeRevision": "<non-empty runtime revision>"
  }
}
```

The file itself is identified by lowercase SHA-256. The plan stores:

- canonical absolute profile path;
- profile-file SHA-256;
- schema and profile ID;
- the complete normalized frontend/backend semantic identity.

The plan, checkpoint, status, capture, review, and publication compare the
same normalized binding. A profile file that disappears or changes makes the
plan `replan_required`.

For the repository-managed development runtime, the canonical generator also
writes an immutable source manifest with schema
`aurora-tile-add-connect-runtime-source-identity/v1`. It hashes the ordered
runtime source roots and build-toolchain files as canonical
`path/bytes/fileSha256` records. The resulting digest is encoded as
`worktree-sha256-<digest>` for both commits and `sha256:<digest>` for both image
digests. Those image-digest fields are source-bound runtime tokens; they are
not a claim that a container registry image exists.

## Field rules

- Unknown or empty fields are forbidden. `null` is never a proof value.
- `imageDigest` must be `sha256:` plus 64 lowercase hexadecimal characters.
- `createdAt` and both `builtAt` fields must parse as ISO-8601 timestamps.
- `baseUrl` must be an exact loopback HTTP origin without credentials, query,
  fragment, or path; the frontend and backend ports must differ.
- `commit` is an opaque immutable build token. It must be non-empty and may be
  a Git commit or a worktree-content identity. It cannot be synthesized from
  the capture timestamp or process ID.
- `profileId`, `contractVersion`, and `vfxRuntimeRevision` must be non-empty,
  bounded tokens.
- The profile contains no password, bearer token, cookie, or other secret.

## Runtime readback

### Frontend

In development builds the Areas workspace exposes one JSON dataset containing
the values compiled into:

- `VITE_RUNTIME_BUILD_COMMIT`;
- `VITE_RUNTIME_BUILD_IMAGE_DIGEST`;
- `VITE_RUNTIME_BUILD_BUILT_AT`.

The capture reads that dataset from the rendered workspace after the requested
Area state has settled. A CLI value, environment of the controller process, or
profile value echoed by the controller is not a frontend readback.

### Backend

The capture reads `/health.runtimeBuild` through the frontend proxy and from
the exact direct backend origin declared by the profile. Both observations
must agree on:

- `commit`;
- `imageDigest`;
- `builtAt`;
- `contractVersion`;
- `vfxRuntimeRevision`.

The direct observation must also include a valid non-null
`processStartedAt` no earlier than the profile's backend `builtAt`.
Proxy/direct disagreement is drift and blocks capture.

### Runtime source identity

The capture independently recomputes the canonical local source identity
before browser work and after the exact screenshot. Both bounded summaries
contain schema, algorithm, digest, file/byte counts, and the exact VFX runtime
revision. Both must reconstruct the profile's frontend/backend commit and
image-digest values, match its VFX revision, and equal each other. This closes
the development-server/HMR drift case in which a service could keep reporting
an old environment token after a source file changed.

## Exact admission rules

### Planning

The controller requires both `--runtime-build-profile` and
`--runtime-build-profile-sha256`. It validates and normalizes the profile
before writing any plan artifact. The profile binding is part of the manifest
hash, so a different build produces a different plan ID.

### Offline status admission

The repository-owned `tiles:matrix-status`, `tiles:matrix-next`, and
`tiles:matrix-capture` commands select the authoritative v8 plan and request a
fresh local runtime-source identity check. Status reports the expected profile
and binding hashes plus a bounded observed identity summary. A source mismatch
returns `runtime_build_reprofile_required`; an unreadable source set returns
`runtime_source_identity_check_failed`. Neither condition permits `next` to
emit a capture command or `capture` to contact the runtime or launch Chrome.

The persisted plan validation remains a separate axis. An immutable v8 plan
can still be structurally `ready` while the mutable current worktree requires a
new profile and checkpoint-zero successor plan. This separation preserves the
historical plan and makes the resume condition explicit.

### Capture

Before browser mutation, the capture harness verifies the hash-bound profile,
fresh local source identity, frontend origin, backend direct origin, proxy
health, and static backend identity. After the requested Area state settles,
it verifies the frontend readback, probes backend proxy/direct health again,
and recomputes the source identity. The saved frame contains the expected
binding, preflight and post-capture runtime observations, and both bounded
source-identity observations. The two backend process-start values must remain
identical.

The matrix verifier independently repeats the comparison. It rejects:

- missing profile binding;
- missing frontend or backend readback;
- malformed digest/timestamp;
- null identity field;
- profile-file hash drift;
- frontend/profile mismatch;
- backend/profile mismatch;
- proxy/direct backend disagreement;
- missing or stale backend process-start identity;
- backend restart during capture;
- source/profile mismatch or source drift during capture.

### Pending capture and independent review

The pending-capture record includes the exact runtime-build binding. The
independent visual review repeats its profile SHA-256 and normalized semantic
identity. Acceptance compares both to the manifest and pending capture before
advancing the checkpoint.

The accepted-review ledger preserves the binding beside the five required
artifact hashes.

### Publication

Certification publication accepts Add/Render evidence only when:

- canonical matrix status is `ready` under revision v8;
- the manifest file hashes to the requested plan ID;
- checkpoint/status runtime-build bindings agree;
- the profile file still hashes and validates;
- every accepted review has the same binding;
- every bound frame independently contains matching frontend and backend
  readbacks and one unchanged preflight/post-capture source identity.

Publication reports the profile ID and SHA-256 in its evidence binding. Rows
from v7 or from a mixed-build checkpoint remain `missing`, never `verified`.

## Failure codes

Canonical implementations use stable diagnostics in these families:

- `MATRIX_RUNTIME_BUILD_PROFILE_*` for profile/schema/path/hash/field errors;
- `MATRIX_FRONTEND_RUNTIME_BUILD_*` for missing or mismatched frontend
  readback;
- `MATRIX_BACKEND_RUNTIME_BUILD_*` for missing, malformed, or mismatched
  backend readback;
- `MATRIX_RUNTIME_BUILD_BINDING_*` for manifest/checkpoint/pending/review
  drift;
- `MATRIX_RUNTIME_SOURCE_*` for source digest/revision drift;
- `runtime_build_*` lowercase publication errors at the CLI evidence boundary.

The first exact mismatch is included in the blocker artifact. Secrets and full
environment dumps are forbidden.

## Payload, transport, and complexity budgets

- Profile file: maximum 64 KiB.
- Frontend dataset: maximum 4 KiB.
- Runtime-build binding in any plan/review/status artifact: maximum 8 KiB.
- No chunking or streaming is needed for these atomic JSON records.
- Large matrix manifests may continue to use the existing streaming writer;
  the one small binding is written once in the envelope.
- Plan/status validation is constant-time in matrix row/chunk count, excluding
  one bounded profile-file read and artifact hashes already required by
  acceptance. Capture additionally performs two linear passes over the
  explicitly bounded runtime-source set; only summaries enter the frame.

## Compatibility and migration

This is a breaking proof-contract change, implemented by matrix revision
`path-node-aware-v8`. v7 plans remain readable as historical artifacts but
cannot be resumed or published as v8 evidence.

There is no accepted-review migration from v7 because the missing runtime
identity cannot be inferred. A v8 plan starts with:

- `nextChunkIndex = 0`;
- `capturedChunkIds = []`;
- `acceptedVisualReviews = []`;
- `rejectedVisualReviews = []`.

The data/catalog corpus may be reused only through its existing independent
hash bindings.

## Acceptance tests

At minimum, tests must prove:

1. planning rejects a missing, malformed, oversized, invalid-path, or hash-drifted
   profile;
2. a valid profile participates in the deterministic manifest hash;
3. frame verification rejects each missing/null/drifted frontend and backend
   field;
4. proxy/direct backend disagreement is rejected;
5. pending capture, visual review, checkpoint, and publication reject binding
   drift;
6. v7 is not silently resumed under v8;
7. a fully matching frame is admitted without changing tile-planning
   semantics;
8. source/profile mismatch, a backend process older than the profile, and
   source drift during capture are rejected;
9. the 99-tileset offline planner stays within its current memory and runtime
   budgets.

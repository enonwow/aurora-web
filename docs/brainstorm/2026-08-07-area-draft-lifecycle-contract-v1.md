# Area draft lifecycle HTTP contract v1

Date: 2026-08-07  
Status: implementation contract  
Parent program: `2026-08-06-area-authoring-crud-tile-parity-program.md`

## Scope and Aurora-first verdict

This contract covers owner-scoped local draft list/open/save/delete only. It is
project-defined persistence and does not establish, alter, or infer an Aurora
ARE/GIT/GIC/IFO semantic. Native module update and delete remain separate,
privileged, fail-closed materialization contracts.

## Version and budgets

- HTTP envelope: additive backend contract v1.
- Draft schema: `area-draft.v1`.
- Maximum normalized JSON draft document: 8 MiB.
- Maximum JSON nesting depth: 64.
- Maximum aggregate object/array entries: 250,000.
- List page size: 1..100, default 25.
- Idempotency key: 8..128 ASCII characters from `[A-Za-z0-9._:-]`.
- Draft ID: 1..128 characters from `[A-Za-z0-9_-]`.
- Title: 1..255 Unicode characters after trimming.

Binary resources are forbidden in the JSON document. ARE/GIT/GIC/model/texture
bytes continue to travel through their dedicated resource ports.

## Resource

An `area-draft.v1` document contains:

```json
{
  "schemaVersion": "area-draft.v1",
  "title": "Crypt working copy",
  "source": { "type": "production_area", "areaId": "crypt01" },
  "payload": {}
}
```

`source.type` is `new` or `production_area`. The latter requires a safe,
non-blank `areaId`. `payload` is lossless JSON data behind the lifecycle port;
native serializers must independently validate it before materialization.

Every stored snapshot returns `draftId`, `title`, `revision`, `updatedAt`,
`normalizedSha256`, `source`, and `draft`. Revisions start at 1 and increase by
exactly one after a successful non-replayed save. Deletes return the exact
deleted revision.

## Endpoints

All endpoints require Bearer authentication, roles `builder|dm|admin`, and the
listed action permission. Repository queries are additionally scoped by the
authenticated actor ID; another actor's draft is indistinguishable from a
missing draft.

| Method and path | Permission | Contract |
| --- | --- | --- |
| `GET /area-drafts?pageSize=&cursor=` | `area.draft.read` | Stable newest-first owner list; opaque cursor |
| `GET /area-drafts/:draftId?revision=` | `area.draft.read` | Exact current snapshot; requested stale/missing revision fails |
| `PUT /area-drafts/:draftId` | `area.draft.update` | Requires `Idempotency-Key` and `If-Match`; `If-Match: "0"` creates, otherwise CAS-updates |
| `DELETE /area-drafts/:draftId` | `area.draft.delete` | Requires `Idempotency-Key` and exact revision `If-Match` |

Successful single-resource responses emit `ETag: "<revision>"` and
`Cache-Control: no-store`. Mutation data includes `idempotency` as `created` or
`replayed`; a replay returns the byte-equivalent retained result and does not
advance a revision.

## Failure contract

Errors use the standard envelope and these stable codes:

- `AREA_DRAFT_INVALID` (400/422): malformed ID, precondition, body, or budget;
- `AREA_DRAFT_UNAUTHORIZED` (401) and `AREA_DRAFT_FORBIDDEN` (403);
- `AREA_DRAFT_NOT_FOUND` (404), including cross-owner access;
- `AREA_DRAFT_IDEMPOTENCY_CONFLICT` (409): key bound to another normalized command;
- `AREA_DRAFT_REVISION_CONFLICT` (412): create collision or stale revision;
- `AREA_DRAFT_STORAGE_UNAVAILABLE` (503).

No failure contains raw payloads, database statements, credentials, or adapter
exception text. Diagnostics include operation, actor, draft ID, expected/current
revision, command hash, request ID, and error code.

## Completion criteria

1. Domain validation rejects unknown top-level fields, binary values, unsafe
   IDs, excessive depth/entries/bytes, and non-finite numbers.
2. Memory and MySQL adapters implement identical owner scope, CAS, retained
   idempotency, stable pagination, and tombstone-safe replay behavior.
3. Controllers enforce narrow action permissions and never depend on UI gates.
4. Unit, repository, controller, HTTP-adapter, regression, and mutation tests
   cover create, update, stale write, replay, key conflict, cross-owner access,
   delete replay, pagination, and all budgets.
5. Frontend components access the HTTP adapter only through
   `AreaLifecyclePort`/`AreaLifecycleFacade`.
6. Native module update/delete and object commands are not claimed by this
   contract and cannot be reached through these endpoints.

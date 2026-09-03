# Placeable lighting terrain lineage contract v1

Date: 2026-08-19

Status: implemented statically; tests and runtime proof are pending the active
resource-safety pause.

## Purpose

This additive v1 contract prevents a placeable-lighting comparison from using
a terrain receiver with the right resref but the wrong module/HAK lineage. It
does not define a new Aurora lighting semantic. It exposes byte provenance
already available while the tile process inspects the source MDL, derived GLB,
and texture index.

## Backend response additions

The existing tile process endpoint and envelope remain unchanged. The
following fields are additive:

- `tile.renderAssetContract.mdlSourceContentSha256?: string` — lowercase
  SHA-256 of the exact source MDL bytes read for material inspection;
- `tile.renderAssetContract.modelAsset.contentSha256?: string` — lowercase
  SHA-256 of the exact derived model bytes inspected before renderer handoff;
- `tile.renderAssetContract.materialTextureAssets[].contentSha256: string` —
  lowercase SHA-256 from the exact texture-index entry selected for delivery.

The backend must not derive any digest from an ETag. It computes MDL and GLB
digests from bytes and copies texture digests from the byte-derived texture
index. A missing source or derived payload leaves the optional digest absent
and existing readiness blockers remain authoritative.

## Frontend boundary and local readiness

The HTTP adapter accepts the two optional legacy-compatible fields only when
they match lowercase `[a-f0-9]{64}`. Texture digests are also accepted as
optional at the HTTP boundary so an older cached v1 payload remains readable;
an immutable proof fixture treats absence as a blocker.

Area tile readiness carries:

- `mdlSourceContentSha256`;
- `modelAssetContentSha256`;
- texture `source`, `objectKey`, and `contentSha256` for each material binding.

The `als-oracle-campfire-v1` evaluator requires exactly one unique receiver
model and exact vanilla object-key suffixes plus full SHA-256 values for
`tin01_d11_01.mdl`, its v18 GLB, and `tin01_shpflr1.dds`. The fixture uses
`bypassCache=true`. General Area rendering retains its current cache policy.

## Budget, batching, and versioning

This is a backward-compatible `/api/v1` response extension. No endpoint,
request, cache key, binary payload, or major contract version changes.

- two model digests add at most 128 ASCII characters plus JSON field overhead;
- each material texture adds 64 ASCII characters plus field overhead;
- tile texture lookup remains capped by the existing per-reference limit of 8;
- the expected incremental overhead is below 1 KiB for the oracle tile;
- hashes are metadata only; there is no binary embedding or streaming;
- existing tile batch chunking and the single-concurrency cold processing
  policy remain unchanged.

A future breaking rename or a mandatory digest for all general tile clients
requires a new contract version. The immutable proof fixture may tighten its
own admission policy without changing the general API.

## Diagnosability and failure policy

The preview DOM and central CDP frame record source MDL, model asset, and
texture object keys and digests. Missing, ambiguous, non-vanilla, wrong-path,
or wrong-hash oracle lineage produces explicit `ALS_ORACLE_TERRAIN_*` blockers.
The capture adapter then emits
`area-placeable-terrain-source-lineage-not-retail` and saves no accepted
screenshot.

This gate only establishes identical receiver inputs. It does not establish
visual parity; a fresh matched NWN and Aurora Web comparison is still required.

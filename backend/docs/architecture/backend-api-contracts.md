# Backend API Contracts

This document captures the currently implemented backend contracts for:
- texture index lookup under runtime settings,
- placeable asset delivery flow.

Global API prefix: `/api/v1`.

## Response Envelope

All JSON endpoints use:

```json
{
  "contractVersion": "1.0.0",
  "requestId": "req_123",
  "data": {}
}
```

Error envelope:

```json
{
  "contractVersion": "1.0.0",
  "requestId": "req_123",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Texture index query validation failed.",
    "details": [{ "path": "limit", "reason": "Number must be less than or equal to 1000" }],
    "retryable": false
  }
}
```

## Runtime Settings: Texture Index (Admin)

Base route: `/api/v1/settings/runtime`

Role/permission expectations:
- `GET /module-cache/textures/summary`: role `admin`.
- `GET /module-cache/textures`: role `admin`.

### GET `/settings/runtime/module-cache/textures/summary`

Returns metadata for `__aurora/meta/texture-index.v1.json` stored in module cache prefix.

Example response:

```json
{
  "contractVersion": "1.0.0",
  "requestId": "req_123",
  "data": {
    "indexObjectKey": "modules/current/__aurora/meta/texture-index.v1.json",
    "available": true,
    "version": "texture-index/v1",
    "generatedAt": "2026-05-25T10:12:00.000Z",
    "settingsRevision": 14,
    "modulePrefix": "modules/current/",
    "totalTextures": 1823,
    "totalBytes": 268845220
  }
}
```

If index is missing:

```json
{
  "contractVersion": "1.0.0",
  "requestId": "req_123",
  "data": {
    "indexObjectKey": "modules/current/__aurora/meta/texture-index.v1.json",
    "available": false
  }
}
```

### GET `/settings/runtime/module-cache/textures`

Query params:
- `resref` optional, exact match, case-insensitive.
- `limit` optional, `1..1000`, default `100`.
- `offset` optional, `>= 0`, default `0`.

Example request:

```text
GET /api/v1/settings/runtime/module-cache/textures?resref=tno01_w01&limit=2&offset=0
```

Example response:

```json
{
  "contractVersion": "1.0.0",
  "requestId": "req_123",
  "data": {
    "indexObjectKey": "modules/current/__aurora/meta/texture-index.v1.json",
    "available": true,
    "version": "texture-index/v1",
    "generatedAt": "2026-05-25T10:12:00.000Z",
    "settingsRevision": 14,
    "modulePrefix": "modules/current/",
    "totalTextures": 1823,
    "totalBytes": 268845220,
    "query": {
      "resref": "tno01_w01",
      "limit": 2,
      "offset": 0
    },
    "totalEntries": 1,
    "entries": [
      {
        "textureId": "5d2649a4dd4a11484718cfaa",
        "resref": "tno01_w01",
        "extension": "dds",
        "objectKey": "modules/current/__aurora/sources/hak/tlc_hak/tno01_w01.dds",
        "sizeBytes": 699052,
        "sha256": "7c6bc4f1f245f8f0e58f8a9d0f6f2d66c8d3c4637cb1da839f8ed8f660537c9f",
        "source": "hak",
        "sourcePath": "haks/tlc_hak.hak"
      }
    ]
  }
}
```

## Placeable Asset Delivery Contract

Base route: `/api/v1/catalog/placeables`

### GET `/catalog/placeables/cache/:cacheKey/assets/contracts`

Role/permission expectations:
- role one of `builder | dm | admin`,
- permission `processing.placeable.read`.

Query params:
- `assetIds` optional, comma-separated or repeated (`assetIds=a&assetIds=b`).

Example response:

```json
{
  "contractVersion": "1.0.0",
  "requestId": "req_123",
  "data": {
    "cacheKey": "2f4fbc8d5a93f79c19812d6ea78f2d5b",
    "moduleHash": "e4f4c5e49f327dbf",
    "assets": [
      {
        "assetId": "3534fd98a17f16f9",
        "objectKey": "modules/current/placeables/plc_x02.mdl",
        "contentType": "model/x-nwn-mdl",
        "sizeBytes": 10244,
        "deliveryPath": "/api/v1/catalog/placeables/cache/2f4fbc8d5a93f79c19812d6ea78f2d5b/assets/3534fd98a17f16f9",
        "deliveryUrl": "/api/v1/catalog/placeables/cache/2f4fbc8d5a93f79c19812d6ea78f2d5b/assets/3534fd98a17f16f9",
        "s3Url": "s3://aurora-module-assets/modules/current/placeables/plc_x02.mdl"
      }
    ]
  }
}
```

### GET `/catalog/placeables/cache/:cacheKey/assets/:assetId`

Role/permission expectations:
- role from class-level `ALL_ROLES`,
- permission `scene.read`.

Response is binary bytes (not JSON envelope). Key headers:
- `Content-Type`
- `Content-Length`
- `Cache-Control: private, max-age=120`
- `ETag` (when available)
- `X-Aurora-Asset-Id`
- `X-Aurora-Cache-Key`
- `X-Aurora-Module-Hash`
- `Content-Disposition: inline; filename="..."`

This route is the direct download target referenced by `deliveryPath` / `deliveryUrl`.

## Error Codes for These Flows

- `401`:
  - `UNAUTHORIZED` (missing/invalid bearer token),
  - `INVALID_SESSION` (expired/unknown session).
- `403`:
  - `FORBIDDEN_ROLE`,
  - `FORBIDDEN_PERMISSION`.
- `404`:
  - `PLACEABLE_CACHE_NOT_FOUND`,
  - `PLACEABLE_ASSET_NOT_FOUND`,
  - `PLACEABLE_ASSET_BLOB_NOT_FOUND`.
- `422`:
  - `VALIDATION_FAILED` (invalid query/path/body).

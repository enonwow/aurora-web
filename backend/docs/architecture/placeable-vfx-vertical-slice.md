# Placeable + VFX Vertical Slice

Data: 2026-05-24
Status: implemented (current backend data source: static catalog repository)

## Goal

Dostarczyc jeden kompletny pionowy slice backendu dla `placeable` (w tym `vfx` oraz aliasy `vvx`/`vvxy`), ktory frontend moze od razu konsumowac:

1. listowanie i podglad templatek,
2. processowanie do kontraktu renderowego (backend type -> frontend type),
3. cache processed payloadu po kluczu deterministycznym,
4. benchmark processowania z fingerprintem datasetu.

## API

Wszystkie endpointy sa pod prefiksem `api/v1`.

1. `GET /catalog/placeables`
2. `GET /catalog/placeables/:templateId/preview`
3. `POST /catalog/placeables/process`
4. `GET /catalog/placeables/cache/:cacheKey`
5. `POST /catalog/placeables/benchmark`

## Role i uprawnienia

1. Listowanie/podglad:
   - role: `viewer|builder|dm|admin`
   - permission: `scene.read`
2. Process/cache/benchmark:
   - role: `builder|dm|admin`
   - permissions:
     - `processing.placeable.run` (process + benchmark)
     - `processing.placeable.read` (cache read)

## Process Contract

`POST /catalog/placeables/process`

Request:

```json
{
  "templateId": "plc_torch_smoke_vfx_001",
  "resref": "optional-alternative-lookup",
  "subtypeHint": "vvxy",
  "bypassCache": false,
  "includeBenchmarkMetadata": true
}
```

Rules:

1. Wymagane jest co najmniej jedno z: `templateId` lub `resref`.
2. `subtypeHint` akceptuje aliasy `vvx` oraz `vvxy` i normalizuje je do `vfx`.
3. Jesli template ma własny subtype, to subtype template ma priorytet nad hintem.

Response (shape):

```json
{
  "cache": {
    "key": "sha256-hex",
    "hit": false,
    "storedAt": "2026-05-24T15:00:00.000Z",
    "hits": 0
  },
  "placeable": {
    "templateId": "plc_torch_smoke_vfx_001",
    "resref": "plc_torch_smoke_vfx",
    "placeableSubtype": "vfx",
    "render": {
      "backendType": "vfx",
      "frontendType": "vfx",
      "rendererPreset": "vfx-emitter",
      "isDoor": false,
      "isVfx": true
    },
    "classification": {
      "source": "template",
      "inputSubtype": "vvxy",
      "normalizedSubtype": "vfx",
      "mismatchWithTemplate": false
    }
  }
}
```

## Cache

1. Cache key jest deterministyczny (`sha256`) z:
   - `templateId`,
   - `resref`,
   - finalnego subtype,
   - wersji kontraktu cache (`placeable-process/v1`).
2. `GET /catalog/placeables/cache/:cacheKey` zwraca ostatni processed payload.
3. Wersja obecna ma adapter in-memory (L1) gotowy do podmiany na storage zewnetrzny.

## Benchmark

`POST /catalog/placeables/benchmark`

Request:

```json
{
  "templateIds": ["plc_torch_smoke_vfx_001"],
  "iterations": 200,
  "warmupIterations": 20,
  "bypassCache": true
}
```

Response:

1. `datasetFingerprint` (deterministyczny hash),
2. `config` runu,
3. `timing` (`startedAt`, `finishedAt`),
4. `metrics`:
   - `overall` (`min/max/avg/p50/p95/p99`),
   - `perCandidate`.

## Implemented Files

1. `src/modules/catalog/application/catalog.application.service.ts`
2. `src/modules/catalog/adapters/inbound/http/placeables.controller.ts`
3. `src/modules/catalog/adapters/inbound/http/placeables.schemas.ts`
4. `src/modules/catalog/adapters/outbound/memory/memory-placeable-processing-cache.repository.ts`
5. `src/modules/catalog/application/ports/placeable-processing-cache.port.ts`
6. `src/modules/catalog/domain/template.types.ts`
7. `src/modules/catalog/application/ports/template-catalog-repository.port.ts`
8. `src/modules/catalog/adapters/outbound/memory/static-template-catalog.repository.ts`
9. `src/modules/catalog/catalog.module.ts`
10. `src/modules/auth/domain/auth.policy.ts`

## Test Coverage Added

1. Unit:
   - `test/unit/catalog.application.service.spec.ts`
   - `test/unit/placeables.schemas.spec.ts`
   - `test/unit/auth.policy.spec.ts`
2. E2E:
   - `test/catalog.e2e-spec.ts` (process + cache + benchmark + authz)

## Current Limits (Known HOLD)

1. To nie jest jeszcze strict parser `UTP/GFF`.
2. Zrodlo danych placeable jest obecnie statyczne (repo memory adapter).
3. Strict `ARE/GIT` parser lane i pelny benchmark harness release-gate pozostaja HOLD wg dokumentow reverse.

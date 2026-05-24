# Admin Runtime Settings Contract Spec (R63)

Data: 2026-05-24
Status: Draft (backend contract baseline)
Zakres: kontrakt ustawien admin runtime dla Aurora backend (module path/decompiled path/hak dirs/blob bucket/source lists), walidacje, priorytety i bootstrap fail-fast.

## 1. Scope

Spec definiuje kanoniczny kontrakt dla:
1. `GET /api/v1/settings/runtime`
2. `PUT /api/v1/settings/runtime`
3. `GET /api/v1/settings/runtime/haks/resolved`
4. startup bootstrap (`OnApplicationBootstrap`) dla wyboru zrodla modulu i ewentualnego sync do blob storage.

Spec jest normatywna dla backendu i musi pozostac zgodna z reverse-first polityka source resolution.

## 2. Evidence Base (Aurora Reverse + backend)

### 2.1 Reverse evidence
1. `C:\Projects\nwn-last-city\Areas Generator 3d\Web Model Viewer\Common\resman.py:117-133`
- first-match-wins chain: module_decompiled -> module_packed -> hak -> vanilla.
2. `C:\Projects\nwn-last-city\Areas Generator 3d\Web Model Viewer\exporter\areas\legacy_2d\generate-codex.py:233-247`
- `module.ifo` preferuje decompiled i fallbackuje do packed.
3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\module-source-priority-spec-r63.md`
- jawna polityka priorytetu zrodla modulu i startup fail-fast.
4. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\source-lists-2da-tlk-spec-r63.md`
- krytyczne source lists 2DA/TLK i fallback policy.

### 2.2 Backend evidence
1. `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts`
- payload schema + cross-field walidacje.
2. `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts`
- startup gate, priorytet decompiled, packed sync dla trybu packed-only.
3. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
- resolved HAK policy (`disabled|inline|profile|none`) + deduplikacja list.
4. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.schemas.ts`
- API error model: `422 VALIDATION_FAILED`.
5. `backend/src/modules/runtime-settings/adapters/outbound/blob/s3-module-blob-storage.service.ts`
- wymaganie niepustego `modulePrefix` przy sync do S3.
6. `backend/src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service.ts`
- extract ERF/MOD oraz klasy bledow signature/version/range/read.

## 3. Canonical Admin Runtime Payload Contract

## 3.1 Persistence and location
1. Domyslny plik: `backend/config/runtime-settings.json`.
2. Override pliku: env `RUNTIME_SETTINGS_FILE`.
3. Record metadane:
- `revision: int > 0`
- `updatedAt: ISO datetime`
- `updatedBy: non-empty string`

## 3.2 Payload shape (PUT body)

```json
{
  "paths": {
    "vanillaDataPath": "string(non-empty, trim)",
    "hakDirectoryPath": "string(non-empty, trim)",
    "moduleDecompiledPath": "string(trim, empty allowed)",
    "modulePackedPath": "string(trim, empty allowed)",
    "tlkBasePath": "string(non-empty, trim)",
    "tlkCustomPath": "string(trim, empty allowed)"
  },
  "blobStorage": {
    "endpoint": "string(trim)",
    "region": "string(trim)",
    "bucket": "string(trim)",
    "modulePrefix": "string(trim)",
    "accessKeyId": "string(trim)",
    "secretAccessKey": "string(trim)",
    "forcePathStyle": "boolean"
  },
  "telemetryDebugMode": "off|basic|full",
  "hakProfiles": {
    "<profileId(non-empty)>": ["<hakEntry(non-empty)>", "..."]
  },
  "sources": {
    "placeable": "<RuntimeSourceSettings>",
    "tile": "<RuntimeSourceSettings>",
    "area": "<RuntimeSourceSettings>",
    "sound": "<RuntimeSourceSettings>"
  },
  "benchmarkCandidates": {
    "placeableHeavyNoVfx": "<BenchmarkCandidate>",
    "placeableHeavyVfx": "<BenchmarkCandidate>",
    "placeableVfxPlcAlternative": "<BenchmarkCandidate>",
    "doorHeavyInstance": "<BenchmarkCandidate>",
    "doorHeavySingleMesh": "<BenchmarkCandidate>"
  }
}
```

`RuntimeSourceSettings`:
1. `includeModuleTemp0: boolean`
2. `includeModulePacked: boolean`
3. `includeHaks: boolean`
4. `includeVanilla: boolean`
5. `hakProfileId: string(trim, empty allowed)`
6. `hakPriorityList: string[]` (entries non-empty after trim)

## 3.3 API auth contract
1. `GET /settings/runtime`: rola `admin`.
2. `GET /settings/runtime/haks/resolved`: rola `admin`.
3. `PUT /settings/runtime`: rola `admin` + permission `admin.config.write`.

## 4. Source Lists Contract (Admin Runtime)

## 4.1 Runtime source toggles per asset
Kazdy asset (`placeable|tile|area|sound`) posiada source list policy w `sources.<asset>`:
1. wlaczenia warstw: module temp0 / module packed / hak / vanilla,
2. wybor listy hakow: inline (`hakPriorityList`) albo profil (`hakProfileId`),
3. jawny wynik przez endpoint `haks/resolved`.

## 4.2 Resolved HAK list contract
Resolved payload dla kazdego assetu:
1. `mode: disabled|inline|profile|none`
2. `includeHaks: boolean`
3. `hakProfileId: string|null`
4. `hakPriorityList: string[]` (deduplicated, ordered, trimmed)
5. `hakPaths: string[]` (absolute path: `entry` absolute albo `resolve(hakDirectoryPath, entry)`)

Priorytet rozwiazywania:
1. `includeHaks=false` -> `mode=disabled`, puste listy.
2. `hakPriorityList.length>0` -> `mode=inline` (najwyzszy priorytet).
3. `hakProfileId!=empty` -> `mode=profile` (lista z `hakProfiles[hakProfileId]`).
4. inaczej -> `mode=none`.

## 4.3 Reverse source precedence for resource reads
Globalny porzadek lookupu runtime (zgodny z reverse):
1. `module_decompiled`
2. `module_packed`
3. `hak` (wg resolved hakPriorityList)
4. `vanilla`

## 4.4 Critical 2DA/TLK source lists (policy binding)
Minimalne listy krytyczne, ktore musza byc mapowane do powyzszej kolejnosci:
1. Placeable: `placeables.2da`, `placeableobjsnds.2da`, `TLK(custom+base)`.
2. Creature: `appearance.2da`, `gender.2da`, `racialtypes.2da`, `phenotype.2da`, `portraits.2da`, `TLK(custom+base)`.
3. Area: `ambientsound.2da`, `tiles.2da`, `metatiles.2da`, `TLK(custom+base)` (+ profile-aware alias `AmbientSndNitVol`/`AmbientSndNightVol`).

## 5. Validation Contract

## 5.1 Field-level invariants (schema)
1. `paths.vanillaDataPath` non-empty.
2. `paths.hakDirectoryPath` non-empty.
3. `paths.tlkBasePath` non-empty.
4. `paths.moduleDecompiledPath` i `paths.modulePackedPath` dopuszczaja pusty string, ale sa trimowane.
5. `sources.<asset>.hakPriorityList[*]` entry non-empty po trim.
6. `hakProfiles`:
- klucz profilu non-empty,
- kazda pozycja listy non-empty.

## 5.2 Cross-field invariants (PUT)
1. Co najmniej jedna sciezka modulu musi byc ustawiona:
- `paths.moduleDecompiledPath != ""` OR `paths.modulePackedPath != ""`.
2. Jesli `paths.modulePackedPath != ""`, to `blobStorage.bucket` jest wymagane.
3. Jesli `sources.<asset>.hakProfileId != ""`, profil MUSI istniec w `hakProfiles`.

## 5.3 Validation error response
Naruszenia walidacji `PUT` zwracaja:
1. `HTTP 422`
2. `code=VALIDATION_FAILED`
3. `details[]`:
- `path` (dot-path),
- `reason` (human-readable message).

## 6. Priority Contract (Module + HAK + Blob)

## 6.1 Module source priority matrix
Po normalizacji `D = trim(moduleDecompiledPath)`, `P = trim(modulePackedPath)`:

1. `D!=empty && P!=empty`
- active source: `DECOMPILED_PRIMARY`
- packed sync: `SKIP`

2. `D!=empty && P==empty`
- active source: `DECOMPILED_ONLY`
- packed sync: `SKIP`

3. `D==empty && P!=empty`
- active source: `PACKED_SYNC_REQUIRED`
- packed sync: `REQUIRED`

4. `D==empty && P==empty`
- startup: `FAIL_FAST`

## 6.2 Blob sync preconditions (packed-only mode)
Gdy `D==empty && P!=empty`, bootstrap MUSI wymagac:
1. `blobStorage.endpoint`
2. `blobStorage.region`
3. `blobStorage.bucket`
4. `blobStorage.modulePrefix`
5. `blobStorage.accessKeyId`
6. `blobStorage.secretAccessKey`

Dodatkowo sync do S3 wymaga, aby `modulePrefix` po normalizacji nie byl pusty.

## 6.3 Packed module path resolution
1. Jesli `modulePackedPath` jest absolute -> uzyj bez zmian.
2. Jesli relative -> resolve wzgledem `process.cwd()`.

## 7. Bootstrap Fail-Fast Mode

## 7.1 Startup sequence
1. Wczytaj runtime settings z repository.
2. Zwaliduj module source gate (co najmniej `D` lub `P`).
3. Jesli `D!=empty`:
- zakoncz bootstrap bez packed sync.
4. Jesli `D==empty && P!=empty`:
- zwaliduj pelny blob config,
- wykonaj ERF/MOD extract,
- replace snapshot w blob bucket (`clear prefix` + upload nowego snapshotu).
5. Kazdy blad krytyczny przerywa bootstrap aplikacji (fail-fast, bez silent fallback).

## 7.2 Fail-fast classes (contractual)
1. `RUNTIME_SETTINGS_INVALID_MODULE_SOURCE`
- condition: `D==empty && P==empty`
- message compatibility: `either paths.moduleDecompiledPath or paths.modulePackedPath must be configured`.

2. `RUNTIME_SETTINGS_INVALID_PACKED_SYNC_CONFIG`
- condition: packed-only i brak wymaganych pol blob config.

3. `RUNTIME_SETTINGS_INVALID_PACKED_MODULE_PATH`
- condition: nieczytelny/nieprawidlowy path do packed module.

4. `RUNTIME_SETTINGS_PACKED_MODULE_EXTRACT_FAILED`
- condition: blad extractora (size/signature/version/range/read).

5. `RUNTIME_SETTINGS_PACKED_MODULE_SYNC_FAILED`
- condition: blad replace snapshot do bucketu.

Uwaga: obecna implementacja backendu rzuca powyzsze klasy jako `Error` z tekstowym message; kody sa kontraktowe i powinny byc mapowane 1:1 w observability/error envelope.

## 8. Operational Guarantees and Non-Goals

## 8.1 Guarantees
1. Deterministyczny wybor zrodla modulu (`decompiled` ma absolutny priorytet).
2. Brak cichych fallbackow przy starcie.
3. Jawna i audytowalna polityka HAK (`inline/profile/disabled/none`).
4. Spojna walidacja API (`422 VALIDATION_FAILED`) przed zapisem runtime settings.

## 8.2 Non-goals
1. Spec nie definiuje pelnego write-target kontraktu per-resref (`source-bound writes`) dla edytorow.
2. Spec nie domyka parity gates `ARE+GIT+GIC` poza zakresem ustawien admin runtime.

## 9. Minimal Acceptance Matrix
1. `PUT` odrzuca payload bez obu sciezek modulu (`422 VALIDATION_FAILED`).
2. `PUT` odrzuca `modulePackedPath` bez `blobStorage.bucket`.
3. `PUT` odrzuca nieistniejace `hakProfileId`.
4. Startup fail-fast, gdy `D` i `P` puste.
5. Startup skipuje packed sync, gdy `D` ustawione (niezaleznie od `P`).
6. Startup wykonuje extract+sync tylko dla packed-only.
7. `GET /settings/runtime/haks/resolved` zwraca deterministyczne, deduplikowane listy i poprawne `mode`.

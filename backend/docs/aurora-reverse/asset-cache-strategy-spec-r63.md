# Asset Cache Strategy Spec (R63, Agent T1)

Data: 2026-05-24
Status: Draft for backend cache contract
Zakres: strategia cache'owania przetworzonych assetow i metadanych dla Aurora reverse, z deterministycznymi kluczami, invalidation, wersjonowaniem i relacja do blob bucket.

## 1. Cel

Ustalic jednolity, audytowalny i restart-safe model cache dla:
1. przetworzonych artefaktow runtime (`texture/material/model derivatives`),
2. metadanych rozstrzygania zrodla i provenance,
3. mapowania cache <-> blob storage (SeaweedFS S3).

Model musi byc zgodny z:
1. deterministycznym source selection (`module_decompiled` > `module_packed` > `hak` > `vanilla`),
2. identity/hash contract (`assetId`, `sourceSliceHash`, `moduleSourceFingerprint`),
3. CAS i revision-gated publish (`commit_key`, `refs/.../latest`).

## 2. Evidence baseline (Aurora reverse + backend specs)

1. Deterministyczny priorytet zrodel i fail-fast startup:
- `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\module-source-priority-spec-r63.md`
- `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\admin-runtime-settings-contract-spec-r63.md`

2. Provenance-first i identity/hash lane:
- `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\asset-id-strategy-spec-r63.md`

3. CAS/blob ingest, immutable commits i mutable latest ref:
- `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\blob-ingest-pipeline-spec-r63.md`

4. HAK precedence i collision telemetry:
- `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\hak-resolution-spec-r63.md`

5. Spójna taksonomia bledow processing:
- `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-error-taxonomy-spec-r63.md`

## 3. Definicje

1. `Raw Asset`: nieprzetworzony zasob po resolverze (`resref+type` winner).
2. `Derived Asset`: wynik transformacji do formatu runtime (np. normalizacja tekstury, atlasy, mip chain, metadata json).
3. `Metadata Cache Entry`: rekord indeksujacy winner source, provenance, hashe, policy i linkage do derived blobow.
4. `Blob Bucket`: trwala warstwa CAS (`cas/blobs/...`) i commit refs (`commits/...`, `refs/.../latest.json`).
5. `Module Lineage`: para (`moduleSourceFingerprint`, `sourcePolicy`) + resolver context (hak profile/list + include flags).

## 4. Warstwy cache

### 4.1 L1: Metadata/Index Cache (hot lookup)

Przechowuje lekki rekord:
1. canonical key,
2. provenance winnera,
3. source hash i pipeline version,
4. pointery do L2/Blob.

Cele:
1. szybki cache-hit bez ponownego skanowania source chain,
2. wykrycie stale danych przez porownanie lineage/version,
3. audytowalny trace "dlaczego ten winner".

### 4.2 L2: Derived Artifact Cache (binary/object)

Przechowuje ciezsze rezultaty przetwarzania:
1. przetworzone binaria,
2. sidecar metadata (`dimensions`, `format`, `channels`, `diagnostics`),
3. opcjonalnie warianty quality/profile.

L2 moze byc lokalny (ephemeral) i/lub w blob bucket (durable CAS).

### 4.3 Source of truth

1. `Blob bucket` jest trwala warstwa prawdy dla artefaktow i commitow.
2. `L1/L2 local` sa akceleratorami i moga byc odtwarzane z bucketu.

## 5. Canonical cache keys

## 5.1 Namespace

`cache/v1/<domain>/<key>`

`domain`:
1. `asset-meta`
2. `asset-derived`
3. `asset-negative` (negative cache)

## 5.2 Module lineage fingerprint

`module_lineage_key = sha256(canonical({
  moduleSourceFingerprint,
  sourcePolicy,
  profile,
  runtimeSourceToggles,
  hakResolutionMode,
  hakPriorityResolved,
  tlkBaseFingerprint,
  tlkCustomFingerprint
}))`

Uwagi:
1. `hakPriorityResolved` musi byc juz po deduplikacji i finalnym porzadku.
2. Dzieki temu kazda zmiana source graph automatycznie zmienia klucze.

## 5.3 Raw asset identity key

`raw_asset_key = sha256(canonical({
  module_lineage_key,
  assetType,
  resrefLower,
  variationTag,
  winnerSourcePath,
  winnerSourceKind,
  sourceSliceHash
}))`

`sourceSliceHash` jest hash surowego wycinka zrodla (forensic lane).

## 5.4 Derived asset key

`derived_asset_key = sha256(canonical({
  raw_asset_key,
  processorFamily,
  processorVersion,
  transformPreset,
  outputSchemaVersion,
  policyRevision
}))`

To rozdziela:
1. tozsamosc danych wejsciowych,
2. wersje silnika przetwarzania,
3. polityke/profil outputu.

## 5.5 Metadata cache key

`metadata_key = sha256(canonical({
  raw_asset_key,
  metadataSchemaVersion,
  resolverDiagnosticsSchemaVersion
}))`

## 5.6 Negative cache key

`negative_key = sha256(canonical({
  module_lineage_key,
  assetType,
  resrefLower,
  reasonClass,
  policyRevision
}))`

Negative cache jest krotkozyjacy i sluzy do tlumienia powtarzalnych missow.

## 6. Cache entry contract

## 6.1 Metadata entry (`asset-meta`)

```ts
interface AssetMetadataCacheEntry {
  key: string;
  moduleLineageKey: string;
  rawAssetKey: string;
  assetType: string;
  resref: string;
  winner: {
    layer: "module_decompiled" | "module_packed" | "hak" | "vanilla";
    sourcePathOrArchive: string;
    sourcePriority: number;
  };
  hashes: {
    sourceSliceHash: string;
    rawAssetHash: string;
  };
  provenance: {
    moduleSourceFingerprint: string;
    sourcePolicy: string;
    hakResolutionMode: "disabled" | "inline" | "profile" | "none";
  };
  diagnostics: {
    collisionsDetected: boolean;
    warnings: string[];
  };
  derivedPointers: Array<{
    derivedAssetKey: string;
    blobKey: string;
    bucketKey: string;
  }>;
  createdAt: string;
  lastAccessAt: string;
  expiresAt?: string;
}
```

## 6.2 Derived entry (`asset-derived`)

```ts
interface DerivedAssetCacheEntry {
  key: string;
  derivedAssetKey: string;
  rawAssetKey: string;
  processorFamily: string;
  processorVersion: string;
  transformPreset: string;
  outputSchemaVersion: string;
  blob: {
    blobKey: string;
    s3Key: string;
    etag?: string;
    checksumSha256: string;
  };
  stats: {
    sizeBytes: number;
    contentType: string;
    width?: number;
    height?: number;
  };
  createdAt: string;
  lastAccessAt: string;
  expiresAt?: string;
}
```

## 7. Read/write strategy

## 7.1 Read-through

1. Lookup `asset-meta` po `metadata_key`.
2. Jesli `hit` i lineage/version zgodne -> uzyj pointera do `asset-derived`.
3. Jesli `asset-derived` miss lokalnie -> pobierz po `blobKey/s3Key` z bucketu i dogrzej L2.
4. Jesli brak metadanych -> resolver + process + zapis cache.

## 7.2 Write-through to blob CAS

Po wygenerowaniu `Derived Asset`:
1. wylicz `blob_key = sha256(bytes)`,
2. upload tylko jesli CAS miss,
3. zapisz `asset-derived` i `asset-meta` atomowo (ten sam `module_lineage_key`),
4. emituj event commit linkage (opcjonalne grupowanie pod `commit_key`).

## 7.3 Single-flight lock

Aby uniknac stampede:
1. lock na `derived_asset_key`,
2. pozostale requesty czekaja lub dostaja stale-while-revalidate,
3. po sukcesie wszyscy czytaja ten sam wynik.

## 8. Invalidation strategy

## 8.1 Trigger classes

1. `MODULE_LINEAGE_CHANGED`
- zmiana `moduleSourceFingerprint`,
- zmiana `sourcePolicy` (`DECOMPILED_PRIMARY` vs `PACKED_SYNC_REQUIRED`),
- zmiana resolved HAK list/profile,
- zmiana include flags source list,
- zmiana TLK fingerprint.

2. `PROCESSOR_VERSION_CHANGED`
- zmiana `processorVersion`/`processorFamily`,
- zmiana `outputSchemaVersion`,
- zmiana `policyRevision` transformacji.

3. `ASSET_SOURCE_MUTATED`
- zmiana `sourceSliceHash` dla konkretnego winnera,
- zmiana winner layer/path po kolizji lub przesunieciu priorytetu.

4. `MANUAL_PURGE`
- operacyjny purge po incydencie lub migracji.

## 8.2 Invalidation levels

1. `Hard invalidate`
- natychmiastowe uniewaznienie namespace (`module_lineage_key` lub `processorVersion`),
- stare wpisy pozostaja jako orphan do GC.

2. `Soft invalidate`
- oznaczenie wpisu jako stale (`staleAt`),
- mozliwy `serve-stale-while-revalidate` dla read-heavy scenariuszy.

3. `Targeted invalidate`
- tylko konkretne `raw_asset_key` lub `derived_asset_key`.

## 8.3 Rule matrix

1. Zmiana modulu (new `moduleSourceFingerprint`) -> `Hard invalidate` calego lineage.
2. Zmiana HAK profile/list/order -> `Hard invalidate` lineage dla aktywnego asset domain.
3. Zmiana samego kodu procesora -> `Hard invalidate` po `processorVersion` (bez purge bucket CAS).
4. Zmiana pojedynczego pliku zrodlowego -> `Targeted invalidate` po `sourceSliceHash` delta.
5. Miss transient/dependency -> brak global invalidate, tylko retry policy.

## 9. Versioning policy

## 9.1 Version fields (wymagane)

1. `cacheNamespaceVersion` (np. `v1`).
2. `metadataSchemaVersion`.
3. `outputSchemaVersion`.
4. `processorVersion` (semver lub git sha).
5. `policyRevision`.

## 9.2 Version bump rules

1. Breaking zmiana ksztaltu metadata -> bump `metadataSchemaVersion`.
2. Breaking zmiana output binary contract -> bump `outputSchemaVersion`.
3. Zmiana algorytmu transformacji bez zmiany schematu -> bump `processorVersion`.
4. Zmiana zasad wyboru zrodel/presets -> bump `policyRevision`.

## 9.3 Module change semantics

Po zmianie modulu nie nadpisujemy starych kluczy.
Nowa wersja modulu tworzy nowy `module_lineage_key`, czyli:
1. zero ryzyka cross-module contamination,
2. mozliwy rollback przez powrot do poprzedniego lineage,
3. naturalna wspol-egzystencja wielu wersji cache.

## 10. Relacja do blob bucket

## 10.1 Layout

Rekomendowany uklad (spojny z CAS):
1. `cas/blobs/sha256/<aa>/<bb>/<full_sha256>.bin`
2. `cas/meta/asset-cache/<module_lineage_key>/<metadata_key>.json`
3. `cas/derived/asset-cache/<module_lineage_key>/<derived_asset_key>.json`
4. `commits/<dataset>/<commit_key>.json`
5. `refs/<dataset>/latest.json`

## 10.2 Ownership i retention

1. Bucket trzyma immutable blobs i cache snapshots.
2. `latest` ref wskazuje aktywny commit zestawu.
3. GC usuwa tylko obiekty nieosiagalne z aktywnych commitow po TTL grace period.

## 10.3 Sync model

1. Local L1/L2 moze byc wyczyszczony bez utraty danych.
2. Rebuild lokalnego cache odbywa sie przez odczyt `latest` + lazy hydrate z CAS.

## 11. TTL i garbage collection

## 11.1 TTL policy

1. `asset-meta`: dluzszy TTL (np. 7-30 dni), bo male i przydatne diagnostycznie.
2. `asset-derived` local: krotszy TTL (np. 1-7 dni), bo kosztuje miejsce.
3. `asset-negative`: bardzo krotki TTL (np. 5-30 min).

## 11.2 GC rules

1. Mark phase: oznacz wpisy bez referencji z aktywnych commitow jako candidates.
2. Sweep phase: usun candidates starsze niz `gracePeriod`.
3. Nigdy nie usuwaj blobu, ktory ma aktywny pointer w `commits/*`.

## 12. Error model (cache-specific)

Kody zgodne ze stylem `PIPELINE_*`:
1. `PIPELINE_CACHE_METADATA_CORRUPT`
2. `PIPELINE_CACHE_DERIVED_CORRUPT`
3. `PIPELINE_CACHE_LINEAGE_MISMATCH`
4. `PIPELINE_CACHE_VERSION_UNSUPPORTED`
5. `PIPELINE_CACHE_BLOB_NOT_FOUND`
6. `PIPELINE_CACHE_SINGLE_FLIGHT_TIMEOUT`

Retryable:
1. `PIPELINE_CACHE_BLOB_NOT_FOUND` -> `true` tylko gdy potwierdzony race sync.
2. `PIPELINE_CACHE_SINGLE_FLIGHT_TIMEOUT` -> `true`.
3. Corruption/mismatch/version -> `false` + invalidate i recompute.

## 13. Observability

## 13.1 Metryki

1. `asset_cache_lookup_total{domain,hit}`
2. `asset_cache_invalidation_total{trigger,level}`
3. `asset_cache_rebuild_total{scope}`
4. `asset_cache_blob_fetch_total{result}`
5. `asset_cache_single_flight_wait_ms`
6. `asset_cache_stale_served_total`

## 13.2 Eventy

1. `asset_cache_hit`
2. `asset_cache_miss`
3. `asset_cache_invalidate`
4. `asset_cache_rebuild`
5. `asset_cache_blob_linked`
6. `asset_cache_blob_orphan_detected`

Kazdy event MUSI zawierac min:
1. `moduleSourceFingerprint`
2. `moduleLineageKey`
3. `rawAssetKey` lub `derivedAssetKey`
4. `processorVersion`
5. `policyRevision`

## 14. Security i correctness guardrails

1. Klucze cache MUSZA byc budowane z canonical JSON + SHA-256.
2. Brak fallback do "partial key" bez lineage/version.
3. Brak write-path dla no-op (jesli ten sam `derived_asset_key` i blob juz linked).
4. Przy konflikcie revision publish (`latest`) cache publish jest retry/rebase, nie overwrite.

## 15. Acceptance criteria (R63)

1. Ten sam input (`module lineage + source bytes + processor version`) daje ten sam `derived_asset_key`.
2. Zmiana modulu/HAK/policy zmienia `module_lineage_key` i nie miesza starych wpisow z nowymi.
3. Zmiana kodu procesora bez zmiany modulu powoduje miss po `derived_asset_key` i bezpieczny recompute.
4. Local cache wipe nie traci mozliwosci odtworzenia danych z blob bucket.
5. GC nie usuwa blobow osiagalnych z aktywnego `commit_key`.
6. Telemetryka pozwala odtworzyc provenance winnera i powod invalidation dla kazdego wpisu.

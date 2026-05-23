# Runtime Settings (Backend)

## Cel
Backend przechowuje centralne ustawienia runtime dla pipeline eksportu/benchmarku:
- sciezki NWN (vanilla/hak/module/tlk),
- konfiguracje blob storage (SeaweedFS S3 API) dla snapshotu zdekompilowanego modulu,
- profile hakow (`hakProfiles`) do logicznego podzialu list per modele/tiles/sound,
- polityki zrodel dla assetow (`placeable`, `tile`, `area`, `sound`),
- kandydatow benchmarkowych (heavy placeable / VFX / doors).

To jest backendowy odpowiednik ustawien z PoC:
- `Web Model Viewer/config/paths.json`
- `Web Model Viewer/exporter/config.json`

## Lokalizacja pliku
- domyslnie: `backend/config/runtime-settings.json`
- override przez env: `RUNTIME_SETTINGS_FILE`

## API
- `GET /api/v1/settings/runtime`
  - tylko rola `admin`
  - zwraca caly payload ustawien wraz z metadanymi (`revision`, `updatedAt`, `updatedBy`)

- `PUT /api/v1/settings/runtime`
  - tylko rola `admin`
  - dodatkowo permission: `admin.config.write`
  - nadpisuje caly payload runtime i podbija `revision`

- `GET /api/v1/settings/runtime/haks/resolved`
  - tylko rola `admin`
  - zwraca wynikowa konfiguracje hakow per typ zasobu:
    - tryb (`disabled` / `inline` / `profile` / `none`)
    - wynikowa liste `hakPriorityList`
    - wynikowe sciezki `hakPaths`

## Uwaga operacyjna
- API nie wystartuje, jezeli oba pola sa puste:
  - `paths.moduleDecompiledPath`
  - `paths.modulePackedPath`
- Priorytet zrodel modulu:
  - jezeli ustawione sa oba pola (`moduleDecompiledPath` i `modulePackedPath`), backend korzysta z `moduleDecompiledPath` jako zrodla nadrzednego,
  - w takim przypadku sync z `.mod` do bloba jest pomijany.
- Jezeli `paths.modulePackedPath` jest ustawione:
  - `blobStorage.bucket` jest wymagane juz na walidacji payloadu API,
  - backend przy starcie czyta kontener `.mod` (ERF),
  - buduje snapshot plikow zasobow,
  - czysci prefix `blobStorage.modulePrefix` w bucketcie,
  - wrzuca aktualny snapshot do bloba (SeaweedFS/S3).
- Walidacja requestu `PUT` wymusza co najmniej jedna sciezke modulu (`moduleDecompiledPath` lub `modulePackedPath`).
- Walidacja requestu `PUT` sprawdza, czy `sources.<asset>.hakProfileId` wskazuje istniejacy profil w `hakProfiles`.
- Rozwiazywanie list hakow odbywa sie z priorytetem:
  - `includeHaks=false` -> tryb `disabled`,
  - `hakPriorityList` (inline) -> najwyzszy priorytet,
  - `hakProfileId` -> lista z `hakProfiles`,
  - brak listy i profilu -> tryb `none`.
- Lokalne sciezki `exports` / `cache` nie sa juz utrzymywane w runtime settings; dane robocze i cache trzymamy w blob storage.
- W docker-compose domyslny endpoint bloba to `http://seaweedfs:8333` (nazwa uslugi compose).

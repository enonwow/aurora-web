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

- `GET /api/v1/settings/runtime/module-cache?limit=200`
  - tylko rola `admin`
  - zwraca stan cache modulu w blobie:
    - bucket/prefix,
    - liczbe i rozmiar obiektow,
    - liste kluczy pod prefixem.

- `POST /api/v1/settings/runtime/module-cache/rebuild`
  - tylko rola `admin`
  - dodatkowo permission: `admin.config.write`
  - synchronizuje cache modulu w blob storage:
    - z `moduleDecompiledPath` (priorytet),
    - albo z `modulePackedPath` (gdy decompiled jest puste).
  - domyslnie dziala inkrementalnie (`forceFull=false`) na podstawie hashy plikow.
  - opcjonalnie `?forceFull=true` wymusza pelny rebuild.

## Uwaga operacyjna
- API nie wystartuje, jezeli oba pola sa puste:
  - `paths.moduleDecompiledPath`
  - `paths.modulePackedPath`
- Priorytet zrodel modulu:
  - jezeli ustawione sa oba pola (`moduleDecompiledPath` i `modulePackedPath`), backend korzysta z `moduleDecompiledPath` jako zrodla nadrzednego,
  - przy starcie backend wykonuje inkrementalny sync cache (chyba ze bootstrap sync jest wylaczony dla testow/flag).
- Jezeli `paths.modulePackedPath` jest ustawione:
  - `blobStorage.bucket` jest wymagane juz na walidacji payloadu API,
  - backend odczytuje kontener `.mod` (ERF) i porownuje snapshot po hashach.
- Strategia cache snapshotu:
  - backend liczy `moduleHash` (hash globalny snapshotu) i hash per plik zasobu.
  - jezeli `moduleHash` sie nie zmienil -> status `noop` (brak upload/delete).
  - jezeli `moduleHash` sie zmienil -> uploadowane sa tylko pliki `changed/added`, usuwane tylko `deleted`.
  - pliki `unchanged` zostaja nietkniete w blobie.
  - manifest hashy jest zapisywany w bucketcie (metadane snapshotu), zeby kolejne uruchomienia nie robily full recache.
- Walidacja requestu `PUT` wymusza co najmniej jedna sciezke modulu (`moduleDecompiledPath` lub `modulePackedPath`).
- Walidacja requestu `PUT` sprawdza, czy `sources.<asset>.hakProfileId` wskazuje istniejacy profil w `hakProfiles`.
- Rozwiazywanie list hakow odbywa sie z priorytetem:
  - `includeHaks=false` -> tryb `disabled`,
  - `hakPriorityList` (inline) -> najwyzszy priorytet,
  - `hakProfileId` -> lista z `hakProfiles`,
  - brak listy i profilu -> tryb `none`.
- Lokalne sciezki `exports` / `cache` nie sa juz utrzymywane w runtime settings; dane robocze i cache trzymamy w blob storage.
- W docker-compose domyslny endpoint bloba to `http://seaweedfs:8333` (nazwa uslugi compose).

## Skrypt CLI
- `npm run cache:module:sync`
  - uruchamia ten sam flow co endpoint `module-cache/rebuild` w trybie inkrementalnym.
- `npm run cache:module:sync -- --force-full`
  - wymusza pelny rebuild snapshotu.

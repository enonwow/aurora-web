# Runtime Settings (Backend)

## Cel
Backend przechowuje centralne ustawienia runtime dla pipeline eksportu/benchmarku:
- sciezki NWN (vanilla/hak/module/tlk),
- konfiguracje blob storage (SeaweedFS S3 API) dla snapshotu zdekompilowanego modulu,
- profile hakow (`hakProfiles`) do logicznego podzialu list per modele/tiles/sound/VFX,
- polityki zrodel dla assetow (`placeable`, `tile`, `area`, `sound`, `vfx`),
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
  - przyjmuje caly payload jako konfiguracje kandydacka;
  - wymaga `confirmGlobalLogout=true` i przechodzi przez ten sam preflight/generacje co onboarding;
  - podbija `revision` dopiero w kandydacie i publikuje go tylko po `NO_CHANGES` albo poprawnym rebuildzie.

Szczegoly pierwszej konfiguracji sciezek, statusow mountow Docker oraz endpointow
onboardingowych opisuje [runtime-path-onboarding.md](./runtime-path-onboarding.md).
Kontrakt wdrozonego globalnego odswiezenia danych po zmianie zrodel opisuje
[runtime-cache-cold-rebuild.md](./runtime-cache-cold-rebuild.md).

- `POST /api/v1/settings/runtime/cache-rebuilds`
  - tylko `admin` z `admin.config.write`;
  - wymaga `confirmGlobalLogout=true` oraz zalecanego `Idempotency-Key`;
  - zwraca `NO_CHANGES` bez wylogowania albo `202` i buduje nowa generacje.
- `GET /api/v1/system/maintenance`
  - publiczny, bezpieczny status dla ekranu oczekiwania.
- `GET /api/v1/settings/runtime/cache-rebuilds/:operationId`
  - szczegolowy status, uczestnicy i audit dla administratora.
- endpointy `retry` i `rollback` sa dostepne administratorowi w stanie `failed`.

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
  - kompatybilny alias bezpiecznego orchestratora generacyjnego;
  - wymaga jawnego potwierdzenia globalnego wylogowania;
  - nie nadpisuje juz aktywnego prefiksu cache w trakcie pracy uzytkownikow.

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
- VFX ma dedykowana polityke `sources.vfx`; parsery VFX nie powinny pozyczac po cichu `sources.placeable`.
- Rozwiazywanie list hakow odbywa sie z priorytetem:
  - `includeHaks=false` -> tryb `disabled`,
  - `hakPriorityList` (inline) -> najwyzszy priorytet,
  - `hakProfileId` -> lista z `hakProfiles`,
  - brak listy i profilu -> tryb `none`.
- Zalecany profil VFX to `lc_vfx`, np. `lc_2da.hak`, `lc_vfx.hak`, `cep3_vfx.hak`.
- VFX source trace zapisuje wybrana warstwe zrodla (`module`, `hak`, `vanilla`, `external_fixture`),
  lower-precedence candidates, hash tabeli/zasobu, revision runtime settings, hash listy HAK oraz
  provenance dla `lc_vfx.hak` i `cep3_vfx.hak`, gdy sa uzyte.
- Lokalne sciezki `exports` / `cache` nie sa juz utrzymywane w runtime settings; dane robocze i cache trzymamy w blob storage.
- W docker-compose domyslny endpoint bloba to `http://seaweedfs:8333` (nazwa uslugi compose).

## Skrypt CLI
- `npm run cache:module:sync`
  - uruchamia ten sam flow co endpoint `module-cache/rebuild` w trybie inkrementalnym.
- `npm run cache:module:sync -- --force-full`
  - wymusza pelny rebuild snapshotu.

## Derived asset converter (MDL -> GLB)
- `AURORA_DERIVED_ASSET_CONVERTER_COMMAND`
  - komenda uruchamiana przez backendowy generator derived assets.
  - dla lokalnego wrappera po buildzie: `node`.
- `AURORA_DERIVED_ASSET_CONVERTER_ARGS`
  - JSON array argumentow przekazywanych do komendy.
  - backend podstawia placeholdery:
    - `{source}`: tymczasowa sciezka do surowego `.mdl/.mdb`,
    - `{output}`: docelowa tymczasowa sciezka derived `.glb/.gltf`,
    - `{resref}`: znormalizowany resref,
    - `{extension}`: oryginalne rozszerzenie,
    - `{workDir}`: katalog roboczy konwersji.
  - przyklad lokalny po `npm run build`:
    - `["C:/Projects/aurora-web/backend/dist/scripts/aurora-mdl-to-glb.js","--input","{source}","--output","{output}","--resref","{resref}","--extension","{extension}"]`
  - przyklad dev bez builda, z `command=node`:
    - `["C:/Projects/aurora-web/backend/node_modules/ts-node/dist/bin.js","--transpile-only","C:/Projects/aurora-web/backend/scripts/aurora-mdl-to-glb.ts","--input","{source}","--output","{output}","--resref","{resref}","--extension","{extension}"]`
  - w docker-compose backend uzywa wariantu dev z absolutnymi sciezkami `/app/...`.
- `AURORA_DERIVED_ASSET_OUTPUT_EXTENSION`
  - rekomendowane: `glb`, bo wrapper emituje self-contained plik binarny bez sidecarow.
- `AURORA_DERIVED_ASSET_MAX_MODELS`
  - guard liczby modeli konwertowanych w jednym syncu.
- `npm run assets:convert:mdl -- --input <model.mdl> --output <model.glb>`
  - uruchamia lokalny ASCII MDL -> GLB converter bez pelnego sync cache.

Obecny wrapper `scripts/aurora-mdl-to-glb.ts` obsluguje tylko ASCII MDL z wezlem `trimesh`
(`verts`, `tverts`, `faces`). Binary MDL/MDB jest jawnie odrzucany i wymaga docelowego
narzedzia/konwertera w kolejnej fazie.

W dev compose bootstrap sync jest wylaczony (`RUNTIME_SETTINGS_BOOTSTRAP_SYNC=false`),
zeby backend najpierw startowal HTTP, a ciezki rebuild cache byl odpalany jawnie.

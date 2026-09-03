# Pełny audyt aplikacji Aurora Web — 2026-07-15

## Werdykt

Aurora Web ma rozbudowaną, realnie działającą bazę: backend Nest/Fastify, frontend
React/Three.js, autoryzację, katalogi zasobów, wczytywanie obszarów i obiektów,
narzędzia edytora oraz dużą warstwę reverse engineeringu i dowodów Aurora.

Aktualny worktree **nie jest gotowy do wydania ani do deklaracji pełnej zgodności
z Aurora Toolset**. Stan kwalifikuje się jako aktywna integracja z blokadami P0:

1. frontend nie kompiluje się;
2. wszystkie pliki szerokiego regression-smoke frontendu są czerwone;
3. rzeczywisty obszar otwiera się, ale teren nie jest poprawnie renderowany;
4. backend ma podatności produkcyjne, a konfiguracja deweloperska nie może być
   bezpiecznie wystawiona poza zaufaną maszynę;
5. bieżący zestaw zmian jest zbyt duży, żeby bez podziału zapewnić wiarygodny
   review, rollback i pochodzenie dowodów.

Ocena bieżącego stanu:

| Obszar | Ocena | Uzasadnienie |
| --- | --- | --- |
| Kompilacja | czerwona | backend przechodzi, frontend ma błędy TypeScript |
| Testy jednostkowe | czerwona | backend 8 suite'ów red; frontend 10 plików red |
| Regresja UI | czerwona | 9/9 plików red, 57/77 testów red |
| E2E backendu | czerwona/niepełna | pełny run nie kończy się poprawnie; celowany suite ma 2/2 red |
| Runtime lokalny | częściowo działa | kontenery i login działają, lista/obszar są bardzo wolne |
| Render Areas | blokada parytetu | obiekty 4/4, teren bez właściwej geometrii/materiałów |
| Bezpieczeństwo | blokada wdrożenia | 5 prod vulnerabilities backendu i słabe dev defaults |
| Utrzymanie | wysokie ryzyko | 418 tys. linii, siedem plików powyżej 10 tys. linii |
| Dowody Aurora | wartościowe, fragmentaryczne | native proof nie oznacza Web parity proof |

## Granica i stan audytu

- Repozytorium edytowalne: `C:\Projects\aurora-web`.
- Referencja dekompilowana pozostaje oddzielnie w `C:\Projects\New Folder`.
- Branch: `dev`.
- HEAD: `02b4a79` (`docs: add Aurora audits and Last City assets`).
- Audyt był diagnostyczny. Nie naprawiano kodu ani nie czyszczono istniejących
  zmian użytkownika.
- Jedynym plikiem dodanym przez audyt jest ten raport.
- Stan worktree na końcu zbierania danych: 84 tracked modified, 0 deleted,
  141 untracked, razem 225 ścieżek.
- Tracked diff: 84 pliki, 18 968 dodań i 1 736 usunięć.

## Uruchomione bramki

| Bramka | Wynik | Szczegóły |
| --- | --- | --- |
| `backend npm run build` | PASS | Nest build, około 13,4 s |
| `frontend npm run build` | FAIL | TypeScript zatrzymuje Vite build |
| `backend npm run test:unit -- --runInBand` | FAIL | 8/133 suite'ów; 10–12/1254 testów red w dwóch runach |
| `frontend npm run test:unit` | FAIL | 10/174 plików; 55/1672 testów red; 1 unhandled rejection |
| `frontend npm run test:regression` | FAIL | 9/9 plików; 57 red, 20 pass |
| `backend npm run test:e2e -- --runInBand` | FAIL | run przerwany po pierwszym czerwonym suite |
| celowany backend E2E | FAIL | 2/2 testów `runtime-settings-texture-index` zwraca 422 zamiast 200 |
| `backend npm audit --omit=dev` | FAIL | 5: 2 high, 3 moderate |
| `frontend npm audit --omit=dev` | PASS | 0 produkcyjnych podatności |
| pełny `backend npm audit` | FAIL | 9: 3 high, 5 moderate, 1 low |
| pełny `frontend npm audit` | FAIL | 7: 2 critical, 2 high, 2 moderate, 1 low |
| Docker Compose runtime | PASS częściowy | 6 usług działa; backend/MySQL/Redis/SeaweedFS healthy |
| backend health | PASS | `GET /api/v1/health` -> 200 `status=ok` |
| live browser login | PASS | backend auth login i `/auth/me` -> 200 |
| live `_winds_study` | FAIL parity | obiekty gotowe, ale teren wizualnie niepoprawny |

Ważne: backend unit był uruchomiony dwukrotnie. Liczba czerwonych suite'ów była
stała (8), ale liczba czerwonych testów zmieniła się z 10 do 12. To jest sygnał
niestabilności testów albo współdzielenia stanu, nie tylko zwykłego driftu
oczekiwań.

## P0 — blokady wydania

### P0-01. Frontend nie ma kompilowalnego stanu

`tsc -b` zatrzymuje build przed wygenerowaniem bieżącego bundle'a. Główne
klastry:

- `frontend/src/modules/areas/dev/AreaLightShadowPreviewRunner.tsx:378,691,701`
  — niezgodne `TerrainDebugState` i `RuntimeState`;
- `frontend/src/modules/creatures/application/creatureCreationWizard.ts:540,719,775`
  — brak poprawnego zawężenia wartości opcjonalnych;
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:84`
  — import nieeksportowanego `AuroraVfxPayload`;
- ten sam plik `:7927,13765,17164,17656,17750` — nullable, implicit `any` i
  brak `auroraModelGraph` w kontrakcie placeable.

Skutek: nie istnieje wiarygodny produkcyjny frontend z bieżącego drzewa.

Kryterium zamknięcia: czysty `npm run build` z pustego `dist`, bez lokalnego
pomijania TypeScript i bez zmiany strictness.

### P0-02. Szeroki kontrakt zachowania edytora jest czerwony

Regression smoke ma 9/9 czerwonych plików i 57/77 czerwonych testów. Zakres nie
jest lokalny. Obejmuje:

- auth/logout i role viewer;
- Adjust Location, XY/Z/bearing i transformacje klawiaturą;
- właściwości creature, door, placeable i sound;
- wspólną powłokę Properties;
- context menu, selection i multi-select;
- copy/cut/paste/delete, undo/redo i zapis local draft;
- static placeable i World Move;
- katalog obiektów i przełączanie kategorii.

Część awarii może być driftem fixture/kontraktów, ale szerokość i obecne awarie
coordinate parity oznaczają, że nie wolno uznać rdzenia edytora za stabilny.

Kryterium zamknięcia: najpierw klasyfikacja każdego czerwonego testu jako
`real bug`, `intentional contract change` albo `test isolation`, potem 0 red w
pełnym regression-smoke.

### P0-03. Live Areas nie ma poprawnego renderu terenu

Sprawdzono w działającej aplikacji po backendowym loginie obszar `_winds_study`
(2x2, 4 placeable). Wynik końcowy:

- źródło `aurora_area`, tile source `aurora_tile_list / tcm01`;
- obiekty PLC: payload 4/4, model 4/4, primitive fallback 0/4;
- tile process runtime: 1/1 source, MDL, GLB i loader;
- widoczny teren: czarny prostokąt zamiast poprawnych kafli i materiałów;
- diagnostyka nadal zgłasza m.in.
  `blocked_tile_model_geometry_loader_missing`,
  `per_tile_material_texture_contract_missing` i
  `frontend_area_runtime_missing_tile_process_contract`;
- jednocześnie ta sama diagnostyka pokazuje `tile process runtime: ready`.

To jest zarówno brak parytetu, jak i sprzeczność source-of-truth statusu.

Kryterium zamknięcia: prawidłowy screenshot porównawczy Aurora vs Web dla
`_winds_study`, brak czarnego fallbacku, spójny status runtime oraz zapisany
readback kontraktów źródło -> GLB -> materiał -> renderer.

### P0-04. Konfiguracja nie jest bezpieczna do wystawienia

Potwierdzone ryzyka:

- backend produkcyjny: 5 podatności, w tym high w
  `@nestjs/platform-fastify` i `drizzle-orm`;
- `backend/src/main.ts` nasłuchuje na `0.0.0.0`; nie ma Helmet ani rate limitera;
- domyślne konta i hasła są w kodzie, np.
  `backend/src/modules/auth/application/auth.application.service.ts:167,181`;
- część runnerów frontendowych automatycznie używa `builder.user/builder123`;
- sesyjny bearer token jest utrwalany w `localStorage`
  (`frontend/src/App.tsx:286,371`), więc XSS oznacza kradzież sesji;
- `docker-compose.yml` publikuje MySQL, Redis, Redis Insight i SeaweedFS na
  hosta, z prostymi hasłami deweloperskimi i Redis bez hasła;
- Swagger jest domyślnie włączony;
- obrazy SeaweedFS/Redis Insight są tagowane `latest`;
- Dockerfile backendu i frontendu używa `npm install` i uruchamia dev server,
  a nie deterministyczny production image.

Frontend ma 0 produkcyjnych podatności według `--omit=dev`, ale pełne drzewo ma
7 podatności, w tym critical Vitest i high Vite/ws. Backend pełny ma 9.

Konfiguracja może pozostać lokalnym dev stackiem, ale musi być jednoznacznie
odseparowana od deploymentu. Nie wolno jej promować jako obrazu produkcyjnego.

Kryterium zamknięcia: oddzielny production compose/image, brak default users i
sekretów, niepublikowane porty infrastruktury, rate limit loginu, security
headers, rotacja modelu sesji oraz 0 high/critical produkcyjnych advisories.

## P1 — wysokie ryzyka jakości i wydajności

### P1-01. Backend unit/E2E nie jest zielony

Stałe czerwone backend suite'y:

- `runtime-settings.application.service.spec.ts`;
- `catalog.application.service.spec.ts`;
- `module-wiring.spec.ts`;
- `cli-derived-asset-generator.service.spec.ts`;
- `runtime-settings-bootstrap.service.spec.ts`;
- `processing-graph.application.service.spec.ts`;
- `memory-area-processing-cache.repository.spec.ts`;
- `layered-area-processing-cache.repository.spec.ts`.

Klastry przyczyn:

- stare fixture `AreaObjectCounts` bez encounters/stores/triggers/waypoints;
- zmieniony konstruktor `RuntimeSettingsBootstrapService`;
- wersjonowana ścieżka derived GLB niezgodna ze starym oczekiwaniem;
- rozjazd VFX: birthrate timeline, animation length/state i eventy ASCII;
- wiring modułów i runtime settings;
- E2E update runtime settings zwraca 422 zamiast 200.

To miesza trzy klasy: realne regresje parsera/runtime, celowe zmiany kontraktów i
niezaktualizowane testy. Należy je rozdzielić przed jakąkolwiek masową zmianą
oczekiwań.

### P1-02. Frontend unit ujawnia realne błędy i drift kontraktów

Stabilny wynik: 10/174 plików red, 55/1672 testów red. Największe klastry:

- `WorkspaceCanvasViewport.renderFilter.test.ts` — tekstury, TPC/DDS/TGA,
  model loader i fallback batching;
- `WorkspaceLayout.viewportWiring.test.tsx` — progressive loading, VFX payload,
  obszarowe placeable;
- `workspaceObjectMeshLayer.creatureRenderPayload.test.ts` — equipment,
  emitters, PLT, tint i tekstury;
- `workspaceTerrainMesh.tileLights.test.ts` — shadow receiver i orientacja;
- `sceneMutationsFacade.coordinateParity.test.ts` — realny rozjazd Z/clamp;
- App auth/workspace panels, area scene mapper i creature asset resolver.

Dodatkowo Vitest zgłasza unhandled rejection po teardown:
`window is not defined` w `WorkspaceLayout.tsx:4615`. To może tworzyć false
positive/false negative i potwierdza brak anulowania asynchronicznych workerów.

### P1-03. Testy frontendu nie są odizolowane od żywego backendu

Podczas runów unit/regression backend dev otrzymał około 210 żądań
`GET /api/v1/areas?limit=100...` z syntetycznymi tokenami testowymi i zwrócił
210 odpowiedzi 401. Źródłem jest test auth generujący tokeny
`test-token-*` przy jednoczesnym użyciu domyślnych realnych portów HTTP przez
część renderowanego drzewa.

Skutki:

- testy zależą od stanu lokalnego środowiska;
- zanieczyszczają logi i pomiary runtime;
- mogą obciążać backend równolegle z właściwym audytem;
- wynik jest mniej deterministyczny.

Kryterium zamknięcia: globalny fail-closed fetch guard w Vitest, kompletne
in-memory/fake ports i test, który failuje przy jakimkolwiek niezamockowanym
połączeniu sieciowym.

### P1-04. Pierwsze użycie jest za wolne i robi zbyt dużo pracy

Obserwacje live:

- pierwsze `GET /areas` trwało około 19,6 s;
- lista 169 areas uruchomiła 169 osobnych thumbnail requestów;
- otwarcie małego 2x2 area uruchomiło pełne stronicowanie katalogu placeable
  po 1000 rekordów aż powyżej offset 14000;
- batch render-payload dla czterech placeable trwał około 15,36 s;
- tile process batch trwał około 24 s;
- w trakcie render był blokowany komunikatem `Orbit paused while assets load`;
- po zakończeniu maleńka scena raportowała około 19 FPS, 70 draw calls i 1491
  trójkątów. Jest to pojedyncza obserwacja, nie benchmark, ale wymaga profilu.

Rekomendacja: endpoints po dokładnym `resref/templateId`, cache-first lookup,
lazy thumbnail tylko dla widocznego okna, wirtualizacja listy, anulowanie
starych requestów i niezależne ładowanie terenu/obiektów bez globalnej blokady
orbity.

### P1-05. Kod ma skrajne koncentracje odpowiedzialności

Statystyka `backend/src`, `frontend/src`, `backend/test`, `frontend/tests`:

- 742 pliki TypeScript/TSX;
- 418 337 linii;
- 83 pliki powyżej 1000 linii;
- 24 pliki powyżej 3000 linii;
- 7 plików powyżej 10 000 linii.

Największe pliki produkcyjne:

| Plik | Linie |
| --- | ---: |
| `workspaceObjectMeshLayer.ts` | 21 387 |
| `catalog.application.service.ts` | 17 593 |
| `workspacePlaceableModelPresentation.ts` | 15 966 |
| `WorkspaceCanvasViewport.tsx` | 11 245 |
| `placeableThreeAssetLoader.ts` | 7 583 |
| `WorkspaceLayout.tsx` | 7 282 |
| `module-snapshot-template-catalog.repository.ts` | 7 256 |

To zwiększa koszt review, liczbę niejawnych zależności, czas transform/testów i
ryzyko efektów ubocznych. Podział powinien iść po pipeline stages i portach, nie
po arbitralnej liczbie linii.

### P1-06. Dane użytkowe mają problem z kodowaniem

Lista realnych Areas pokazuje mojibake, np. `Kryj�wka`, `Kana�y`, `�ania`.
Problem występuje w runtime UI, więc nie jest tylko wadą starych dokumentów.
Trzeba wskazać dokładną granicę dekodowania TLK/GFF/JSON/HTTP i dodać fixture z
polskimi znakami oraz roundtrip.

### P1-07. Worktree i dowody są zbyt duże

Zmiany łączą Areas, katalog, VFX, Toolset automation, frontend renderujący,
testy, dokumentację i fixtures. Dodatkowo zmierzone drzewa zajmują:

| Drzewo | Pliki | MiB |
| --- | ---: | ---: |
| `.codex-tmp` | 19 308 | 3 332,23 |
| `frontend/public/aurora-evidence` | 42 383 | 10 040,83 |
| `backend/docs/aurora-reverse/evidence` | 1 245 | 270,22 |
| `backend/docs/aurora-reverse/artifacts` | 31 696 | 4 703,37 |
| `docs` | 1 291 | 105,46 |

Razem to około 18,0 GiB w pięciu drzewach. Ignorowanie przez Git ogranicza
status noise, ale nie rozwiązuje czasu skanów, backupu, duplikacji i pochodzenia
dowodów.

## P2 — proces i ergonomia

### P2-01. Brakuje jednej bramki repozytorium

- brak root `package.json`/workspace command;
- brak `.github` i repo-local GitHub Actions;
- package scripts nie mają lint/prettier gate;
- backend i frontend mają lockfile, ale Dockerfile używa `npm install`, nie
  `npm ci`;
- mutation/coverage istnieją jako skrypty, lecz przy czerwonym unit/regression
  nie dostarczają obecnie wiarygodnej bramki.

Potrzebne jest jedno polecenie, np. `verify`, uruchamiające kolejno format/lint,
typecheck, build, unit, regression, E2E contract i audit policy.

### P2-02. Stan proof/parity jest rozproszony

Repo zawiera wartościowe native Toolset standards i artefakty. Jednak native
proof, code implemented, Web runtime proof i visual parity są nadal mieszane w
części dokumentacji. Poprzedni audyt stanu z 2026-07-14 słusznie wymaga osobnych
pól:

- `nativeOracle`;
- `webImplementation`;
- `webRuntimeProof`;
- `visualParity`.

Dzisiejszy live check potwierdza wagę tego rozdzielenia: pipeline może mieć
`ready 1/1`, a screenshot nadal może być błędny.

### P2-03. UX startowy nie komunikuje kosztu i blokad dostatecznie jasno

- ekran login początkowo pokazuje backend `unavailable`, zanim użytkownik
  ręcznie wybierze `Check backend`;
- pierwsza lista areas długo pokazuje tylko `Loading areas...`;
- UI ładuje pełny katalog i tysiące template'ów przy małym obszarze;
- część przycisków Areas ma niespójny, natywny biały styl;
- diagnostyka runtime jest bogata, lecz zawiera sprzeczne statusy i nie wskazuje
  jednego użytkowego następnego kroku.

## Audyt funkcjonalny według rodzin

| Rodzina | Co działa obecnie | Granica / brak |
| --- | --- | --- |
| Auth | realny backend login, `/auth/me`, expiry i role | red tests, localStorage token, dev credentials, brak rate limit |
| Areas catalog | 169 obszarów, filtry, wybór i open | pierwszy load ~19,6 s, 169 miniaturek, mojibake |
| Area source | ARE/SET i tile candidate są wykrywane | geometria/material nie daje poprawnego obrazu |
| Area objects | `_winds_study`: 4/4 PLC payload i model | kosztowny global catalog scan; brak parity screenshot |
| Placeables | katalog, modele, properties surface | unit/regression red, pipeline w monolicie |
| Creatures | katalog i rozbudowany render payload | creature unit cluster red; build ma wizard errors |
| Items | katalog, palette/property infrastructure | catalog/runtime background jest kosztowny; brak świeżej pełnej proof matrix |
| Sounds | moduły i preview surface | szeroki sound regression red |
| Doors/logical objects | kontrakty i część UI/standardów | properties i cross-kind regression red; część rodzin 0 templates |
| VFX | parser, runtime, render contract, fixtures | backend VFX timeline/event tests red; parity pozostaje otwarte |
| Persistence/cache | writers, cache i rebuild APIs | runtime-settings E2E zwraca 422; cold reopen nieudowodniony w tym audycie |
| Toolset knowledge | dużo realnych native standards/proof | nie dowodzi automatycznie Web parity |

## Kolejność naprawcza

### Faza A — odzyskać deterministyczną bazę

1. Zamrozić nowe funkcje do czasu odzyskania kompilacji i bramek.
2. Naprawić wszystkie błędy TypeScript frontendu bez osłabienia typów.
3. Odizolować frontend tests od sieci i usunąć unhandled async work.
4. Sklasyfikować czerwone unit/regression; nie aktualizować snapshotów hurtowo.
5. Doprowadzić backend focused E2E do 200 i uruchomić pełny E2E bez crasha.
6. Wprowadzić root `verify` oraz CI.

### Faza B — zamknąć jeden pełny pion Areas

1. `_winds_study`: source -> area process -> tile GLB -> per-tile material -> Web.
2. Usunąć sprzeczności diagnostyki.
3. Zapisać screenshot Aurora/NWN i Web w kontrolowanej kamerze.
4. Wykonać save/reopen/readback.
5. Dopiero potem rozszerzać macierz Areas.

### Faza C — bezpieczeństwo i operacje

1. Zaktualizować zależności high/critical z osobnymi testami regresji.
2. Rozdzielić dev i production images/config.
3. Usunąć default credentials z produkcyjnego kodu i automatycznych runnerów.
4. Dodać Helmet/CSP, login rate limit i politykę tokenów.
5. Nie wystawiać portów infrastruktury w konfiguracji produkcyjnej.

### Faza D — wydajność i utrzymanie

1. Zastąpić pełne skany katalogów endpointami po ID/resref.
2. Wirtualizować listy i lazy-load thumbnail.
3. Rozbić największe pliki według stage/port/adapter.
4. Wprowadzić budżety: initial areas, open small area, batch payload, FPS/frame.
5. Zindeksować i retencjonować dowody; zachować jeden canonical latest pointer.

## Minimalny release gate

Wydanie można rozważać dopiero, gdy jednocześnie:

- backend build PASS;
- frontend build PASS;
- backend unit: 0 red;
- frontend unit: 0 red i 0 unhandled errors;
- frontend regression: 0 red;
- pełny backend E2E kończy się normalnie i ma 0 red;
- production dependency audit: 0 high/critical;
- test run wykonuje 0 połączeń do żywego dev backendu;
- `_winds_study` ma poprawny teren i 4/4 obiekty bez fallbacku;
- zapis/reopen/readback jest potwierdzony artefaktem;
- aktualny screenshot Web ma jawne porównanie z oracle Aurora/NWN;
- worktree jest podzielony na reviewowalne capability commits.

## Polecenia dowodowe

Audyt wykonał m.in.:

```text
git status --short
git diff --shortstat
npm run build
npm run test:unit -- --runInBand
npm run test:unit
npm run test:regression
npm run test:e2e -- --runInBand
npx jest --config ./test/jest-e2e.json --runInBand test/runtime-settings-texture-index.e2e-spec.ts
npm audit --omit=dev
npm audit
docker compose ps --format json
GET http://127.0.0.1:3000/api/v1/health
live browser: login -> filter `_winds_study` -> open -> runtime diagnostics
```

## Konkluzja

Największym aktywem projektu jest ilość realnie zaimplementowanej wiedzy Aurora,
source-preserving pipelines i istniejące instrumenty diagnostyczne. Największą
wadą nie jest brak funkcji, tylko brak jednego wiarygodnego, zielonego stanu
integracyjnego. Najpierw należy odzyskać kompilację, test isolation i jeden
widocznie poprawny pion Areas. Dopiero taki stan pozwoli uczciwie mierzyć dalszy
postęp parytetu.

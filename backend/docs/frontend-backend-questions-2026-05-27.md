# Frontend -> Backend Questions (2026-05-27)

## Context
Na bazie przegladu dokumentacji backendu (`docs/architecture`, `docs/config`, `docs/benchmark`, `docs/aurora-reverse`) i aktualnego ukladu modulow (`auth`, `runtime-settings`, `areas`, `catalog`, `tiles`, `sounds`, `processing-jobs`, `processing-graph`) potrzebujemy potwierdzic ponizsze punkty przed stabilna integracja FE<->BE.

## Questions
1. Ktore endpointy sa dzisiaj traktowane jako `production-ready` (nie mock/placeholder), a ktore jako `interim` lub `HOLD`?
2. Czy aktualnym SSOT dla envelope odpowiedzi (`contractVersion/requestId/data|error`) jest `docs/architecture/backend-api-contracts.md` dla wszystkich endpointow JSON?
3. Czy dla endpointow binarnych (np. `catalog/placeables/cache/:cacheKey/assets/:assetId`) obowiazuje staly zestaw headerow i czy frontend moze traktowac je jako kontrakt stabilny?
4. Jaki jest docelowy kontrakt autoryzacji per rola dla frontendowych akcji builderskich/DM (`scene.read`, `scene.edit`, `asset.place`, `processing.placeable.run`, `processing.placeable.read`)? Czy mamy jedna aktualna macierz uprawnien do wdrozenia na FE?
5. Czy frontend ma bezposrednio odpytywac endpointy admin (`/settings/runtime/*`) w runtime, czy to ma byc tylko tooling/admin panel i bez wywolan z edytora gracza?
6. Jakie sa twarde warunki uniewaznienia cache (`cacheKey`, `moduleHash`, `settingsRevision`): co FE ma traktowac jako sygnal "odswiez kontrakty/assety"?
7. Czy kontrakt `placeable process -> cache -> delivery` jest juz finalny dla pierwszej integracji, czy planujecie breaking changes w payloadzie `render/classification/cache`?
8. Dla `catalog` (placeables/creatures/items/sounds/tiles): ktore zrodla sa aktualnie aktywne (static repository vs module snapshot) i jaka jest roadmapa przelaczenia?
9. Czy endpointy `sounds` i `tiles` maja juz stabilne paginowanie/filtrowanie (parametry query), czy to nadal zakres roboczy?
10. Dla `areas`: czy trzymamy obecny read model, czy przechodzimy na `composition.{placeables,creatures,doors,sounds}` zgodnie z kierunkiem z `area-dto-contract-agent-r3.md`?
11. Czy `processing-jobs` i `processing-graph` sa juz traktowane jako stabilny control-plane pod frontendowy monitoring postepu, czy nadal spodziewane sa zmiany shape payloadow?
12. Czy mamy juz finalna polityke bledow domenowych (`error.code`) dla mapowania FE (toasty/statusy/retry), czy potrzebny jest jeszcze osobny error-catalog?
13. W benchmarkach `cache-e2e` czesto `assetDelivery` moze miec `count=0` przy `skipped` - czy FE ma to traktowac jako stan poprawny (informacyjny), a nie blad funkcjonalny?
14. Czy planujecie utrzymac obecny model `CONDITIONAL GO` (strict `ARE/GIT` nadal HOLD), czy jest juz data odblokowania strict `processing/area`?
15. Czy w najblizszym kroku integracyjnym chcecie najpierw podpiac FE do: `auth + catalog(placeables) + cache delivery`, a dopiero potem `areas/sounds/tiles/processing-*`?

## Requested output from backend team
- Odpowiedz TAK/NIE + krotkie doprecyzowanie przy kazdym punkcie.
- Wskazanie 1 dokumentu SSOT per temat (auth, cache, processing, area DTO).
- Liste endpointow "safe to integrate now".

# Reverse Backend Readiness R79 (Agent R6)

Data: 2026-05-24  
Wejscie: `reverse-findings-area-object-contracts-r78.md`, `reverse-findings-resource-pipeline-r78.md`, `reverse-findings-binary-format-clues-r79.md`  
Cel: przelozenie findings reverse na gotowosc implementacyjna backendu (co wdrazamy teraz vs co czeka na dalsze dowody z dekompilacji).

## 1. Gotowe do wdrozenia od razu (bez dalszej dekompilacji)

| Endpoint/Serwis | Zakres wdrozenia teraz | Dowod reverse | Decyzja |
|---|---|---|---|
| `GET /api/v1/settings/runtime` + `PUT /api/v1/settings/runtime` | Runtime source policy, konfiguracja sciezek i source-gate (bez domyslow parsera GIT/ARE) | Silne dowody dla bootstrap i source chain: `FUN_0057f8b8` (0.93), `FUN_00abcfec` (0.89), `FUN_005b5bc4` (0.96), `FUN_005bb574` (0.97) | **Wdrazaemy teraz** |
| `GET /api/v1/settings/runtime/haks/resolved` | Deterministyczne wyliczanie list HAK i provenance | Potwierdzone sygnaly HAK/TLK i `Mod_HakList`: `FUN_005b5bc4`, `FUN_005bb574`, `FUN_005ce044` | **Wdrazaemy teraz** |
| `POST /api/v1/processing/{type}` + `GET /api/v1/processing/jobs/{jobId}` + `POST /api/v1/processing/jobs/{jobId}:cancel` + `POST /api/v1/processing/jobs/{jobId}:retry` + `GET /api/v1/processing/{type}` | Control-plane jobs (enqueue/status/cancel/retry/idempotency), bez zaleznosci od pelnej semantyki parsera ARE/GIT | Gotowosc oparta o potwierdzony staged pipeline i resource contracts (R78/R79) oraz brak blokady reverse dla samego lifecycle API | **Wdrazaemy teraz** |
| `ModuleIfoMetadataService` (internal) | Read/write `Module.IFO` dla `Mod_CustomTlk`, `Mod_HakList`, `Mod_Entry_*`, `Mod_Expan_List` | Najsilniejszy kontrakt serializacji: read `FUN_005b5bc4` <-> write `FUN_005bb574` | **Wdrazaemy teraz** |
| `TlkResolverService` (internal) | Rozwiazanie sciezek TLK + open/blad `dialog.tlk` + fallbacki instalacyjne | `FUN_00abcfec` (TLKINSTALL/data\\tlk), `FUN_005888f0` (dialog.tlk open gate) | **Wdrazaemy teraz** |
| `TwoDaLookupService` (internal) | Deterministyczny lookup 2DA z telemetry/provenance | Rodzina funkcji `2DAName`: `FUN_004818b0`, `FUN_0052ede0`, `FUN_00532174`, `FUN_00612a44` | **Wdrazaemy teraz** |

## 2. Wymaga dalszych dowodow (celowana dekompilacja)

| Endpoint/Serwis | Czego brakuje | Dlaczego to blokuje | Status |
|---|---|---|---|
| `POST /api/v1/processing/area` (payload/result strict dla lane `tiles/placeables/doors/creatures/triggers`) | Brak twardej mapy `FUN_*` parsera `GIT` (`Door List`, `Placeable List`, `Creature List`, `AreaProperties`) oraz pelnego parsera `ARE` | Bez tego nie gwarantujemy zgodnosci semantycznej parse+validation dla area composition | **Wstrzymac strict implementation** |
| `AreaGitParserService` (internal) | Brak adresowego call-chain `resource -> GIT parser -> object lanes` | Ryzyko blednego mapowania list i cardinality | **Wymaga dowodow P0** |
| `AreParserService` (internal) | Poza `FUN_0072691c` (`DefaultAreaProperties`) brak pewnego mapowania pelnego loadera `ARE` | Niepewna walidacja `Tile_List`, `Width*Height`, pelny contract area | **Wymaga dowodow P0** |
| `TransitionAliasParserService` (internal) | Brak mapy funkcji dla `LoadScreenID/LoadScreenId` i `LinkedToFlags` | Nie mozna potwierdzic policy aliasow i parsingu numeric (`last-wins`, branch handling) | **Wymaga dowodow P0** |
| `Creature/Placeable enrichment strict` (status extension dla `POST /api/v1/processing/creature|placeable`) | UT* chain jest tylko srednio potwierdzony, czesc sygnalow to noise; brak 100% dowodu branch mappingu `UTC->creature` i `UTP->placeable` | Ryzyko falszywej klasyfikacji i blednego overlay semantycznego | **Wstrzymac strict mapping** |
| `HakFormatGateService` (internal) | `HAK_V1.0` clues (`FUN_004af534`, `FUN_00541cd4`) maja status "mozliwy gate", bez pelnego dowodu | Nie mozna jeszcze hard-failowac na niepotwierdzonych regulach formatu | **Wymaga dowodow P1** |

## 3. Decyzja R6 (implementation readiness)

1. **Start natychmiast**: runtime settings + source resolver + HAK/TLK/2DA services + processing jobs control-plane endpointy.  
2. **Feature-flag / hold**: strict parse/enrichment dla `area`, strict lane mapping `ARE/GIT`, strict alias handling `LoadScreenID/LinkedToFlags`, hard `HAK_V1.0` gate.  
3. **Brama do odblokowania hold**: dowody z kolejnej rundy celowanej dekompilacji P0 (zgodnie z `reverse-next-targeted-decomp-plan-r78.md`).

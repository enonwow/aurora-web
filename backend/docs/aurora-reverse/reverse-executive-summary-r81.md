# Reverse Executive Summary R81 (Agent R11)

Data: 2026-05-24
Zakres: synteza decyzji reverse `r78-r81` pod szybki progress backendu.

## Co wiemy na 90% (wysoka pewnosc)

1. Runtime/source control-plane jest gotowy do wdrozenia teraz:
   - `GET/PUT /api/v1/settings/runtime`
   - `GET /api/v1/settings/runtime/haks/resolved`
2. Kontrakt `Module.IFO` read/write jest stabilny i round-trip jest dobrze potwierdzony (`FUN_005B5BC4` <-> `FUN_005BB574`).
3. Szkielet pipeline zasobow jest spojny: bootstrap sciezek -> resolver install/fallback -> TLK gate -> lookup 2DA.
4. Processing jobs control-plane mozna uruchomic bez czekania na pelna semantyke parserow `ARE/GIT`:
   - enqueue/status/cancel/retry/list.
5. Mamy twarde punkty adresowe dla `AreaProperties` i list `Creature/Door/Placeable` oraz read/write transition fields (`LinkedToFlags`, `LoadScreenID`).

## Co wiemy na 70% (srednia pewnosc)

1. Kanoniczny call-chain `resource -> parser -> object lane` dla calego `ARE/GIT` nie jest jeszcze domkniety adresowo.
2. Strict `POST /api/v1/processing/area` (pelna walidacja lane/cardinality) nadal niesie ryzyko niezgodnosci i powinien zostac na HOLD.
3. Polityka aliasow/duplikatow `LoadScreenID/LoadScreenId` i `LinkedToFlags` (np. last-wins) nie ma jeszcze twardego dowodu.
4. `HAK_V1.0` wyglada na potencjalny gate, ale nie ma jeszcze pewnosci do hard-fail policy.
5. Mapowanie branchy UT* do strict `UTC->creature` i `UTP->placeable` jest prawdopodobne, ale czesciowo posrednie.

## Ryzyka blednej interpretacji

1. Overfit `FUN_*` do nazwanych metod klas NWN mimo braku pelnych symboli.
2. Przyjecie jednej sciezki parsowania jako "kanonicznej", mimo wykrycia kilku rownoleglych wariantow call-path.
3. Pomieszanie zachowan toolset/editor z runtime server (ten sam eksport binarny, rozne intencje branchy).
4. Zbyt wczesne usztywnienie walidacji transition keys bez potwierdzenia polityki duplikatow i aliasow.
5. Utrata zgodnosci typow numerycznych przy serializacji (`byte/ushort`) dla pol transition.

## 5 ruchow dajacych najszybszy progress backendu

1. Wdrozyc natychmiast runtime/source API + serwisy `TlkResolverService`, `TwoDaLookupService`, `ModuleIfoMetadataService`.
2. Wdrozyc processing jobs control-plane (idempotency, cancel/retry, list/status) z pelna telemetry i audytem decyzji.
3. Zbudowac zestaw testow round-trip `Module.IFO` + fixture'y konfliktow HAK/TLK (quick confidence gate dla CI).
4. Uruchomic "compat mode" dla `processing/area`: parser skeleton + provenance logs + feature-flag strict rules (domyslnie OFF).
5. Wykonac celowany sprint dekompilacji P0 (ARE/GIT lane + transition duplicate policy), a wynik od razu przekuc w testy kontraktowe odblokowujace HOLD.